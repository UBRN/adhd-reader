import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { AdhdReaderLevel, AdhdReaderSettings } from '../types'
import { bionic } from './bionic.ts'
import { fmt, fromName, messages, normalize } from './i18n.ts'
import type { Lang, Messages } from './i18n.ts'

const COMMAND = 'adhd-reader'
const ALIAS = 'okuma' // Turkish name, listed only when the interface is Turkish
const DEFAULTS: AdhdReaderSettings = { enabled: true, level: 3 }
const settings = atom({ plugin: 'adhd-reader', key: 'settings' } as const, DEFAULTS)

// Band widths, in cells: the full band, then without the level name and preview.
const FULL_COLUMNS = 64
const COMPACT_COLUMNS = 36

const isLevel = (value: unknown): value is AdhdReaderLevel =>
  typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5

// Whatever the store holds, a valid value comes out; each bad field falls back.
function sanitize(value: unknown): AdhdReaderSettings {
  const saved = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  return {
    enabled: typeof saved.enabled === 'boolean' ? saved.enabled : DEFAULTS.enabled,
    level: isLevel(saved.level) ? saved.level : DEFAULTS.level,
  }
}

const step = (level: AdhdReaderLevel, by: 1 | -1) => Math.min(5, Math.max(1, level + by)) as AdhdReaderLevel

type Action =
  | { kind: 'on' | 'off' | 'toggle' | 'status' | 'help' }
  | { kind: 'level'; level: AdhdReaderLevel }

// One table for every language, matched after `normalize`.
const WORDS = new Map<string, Action['kind']>()
const words = (kind: Action['kind'], list: string) => list.split(' ').forEach(w => WORDS.set(normalize(w), kind))
words('on', 'on ac aç an ein activar activer ligar вкл включить オン 有効 开 开启 打开')
words('off', 'off kapat aus desactivar désactiver desligar выкл выключить オフ 無効 关 关闭')
words('toggle', 'toggle değiştir umschalten alternar basculer переключить 切替 切换')
words('status', 'status durum estado statut статус 状態 状态')
words('help', 'help yardım ayuda ajuda hilfe aide помощь ヘルプ 帮助')

function parse(args: string): Action | undefined {
  const arg = normalize(args)
  if (arg === '') return { kind: 'toggle' }
  if (/^[1-5]$/.test(arg)) return { kind: 'level', level: Number(arg) as AdhdReaderLevel }
  const kind = WORDS.get(arg)
  return kind && { kind }
}

const levelName = (m: Messages, level: AdhdReaderLevel) => m[`level${level}`]

// The preview word split where the current level puts the bold run.
function preview(word: string, level: AdhdReaderLevel): [string, string] {
  const match = /^\*\*([^*]+)\*\*(.*)$/s.exec(bionic(word, level))
  return match ? [match[1], match[2]] : ['', word]
}

// Copies the saved choice into the session state, which /clear, /resume and /branch reset.
async function load($: EngineInterface) {
  const saved = await $.store.get('settings')
  if (saved !== undefined) await update($, settings, () => sanitize(saved))
}

// Builds on what the store holds now, so another open session's change is kept.
async function change($: EngineInterface, fn: (value: AdhdReaderSettings) => AdhdReaderSettings) {
  const saved = await $.store.get('settings')
  const value = sanitize(fn(saved === undefined ? await read($, settings) : sanitize(saved)))
  await $.store.set('settings', value)
  await update($, settings, () => value)
  return value
}

function report($: EngineInterface, t: Messages, { enabled, level }: AdhdReaderSettings) {
  $.ui.toast(enabled ? fmt(t.toastOn, { level: levelName(t, level), n: level }) : t.toastOff)
}

export const register: Register = (on, options) => {
  const showBand = options.showBand !== false
  // Auto, empty or unknown falls back to English.
  const lang: Lang = fromName(options.language) ?? 'en'
  const m = () => messages(lang)

  on('session.start', async ($, e, next) => {
    await load($)
    for (const name of [COMMAND, ALIAS]) {
      await $.command.register({ name, description: m().description, argumentHint: m().argumentHint, immediate: true })
    }
    const drawn = e.surface === 'terminal' || e.surface === 'desktop'
    if (e.isInteractive && drawn && (await $.store.get('introSeen')) !== true) {
      $.ui.toast(fmt(m().intro, { cmd: lang === 'tr' ? ALIAS : COMMAND }), { timeoutMs: 8000 })
      await $.store.set('introSeen', true)
    }
    return next(e)
  })

  on('classic.SessionStart', { source: ['clear', 'resume', 'fork'] }, async ($, e, next) => {
    await load($)
    return next(e)
  }).catch(() => undefined)

  on('command.describe', { command: [COMMAND, ALIAS] }, ($, e, next) =>
    next({
      ...e,
      description: m().description,
      argumentHint: m().argumentHint,
      isHidden: e.isHidden || (e.command === ALIAS && lang !== 'tr'),
    }),
  )

  on('config.describe', { key: ['adhd-reader.language', 'adhd-reader.showBand'] }, ($, e, next) =>
    next(
      e.key === 'adhd-reader.language'
        ? { ...e, label: m().languageLabel, description: m().languageHelp }
        : { ...e, label: m().showBandLabel, description: m().showBandHelp },
    ),
  )

  // Answers on its own with feedback as a toast, so the conversation stays untouched.
  on('command.run', { command: [COMMAND, ALIAS] }, async ($, e) => {
    const action = parse(e.args)
    if (!action || action.kind === 'help') {
      $.ui.toast(fmt(m().usage, { cmd: e.command }))
      return {}
    }
    const value =
      action.kind === 'status'
        ? await read($, settings)
        : await change($, v =>
            action.kind === 'level'
              ? { enabled: true, level: action.level }
              : { ...v, enabled: action.kind === 'toggle' ? !v.enabled : action.kind === 'on' },
          )
    report($, m(), value)
    return {}
  }).catch(() => ({}))

  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    const { enabled, level } = await read($, settings)
    if (!enabled) return next(e)
    return next({ ...e, props: { ...e.props, text: bionic(e.props.text, level) } })
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    if (!showBand || e.props.hasSurvey) return below
    const { enabled, level } = await read($, settings)
    const t = m()
    const columns = e.props.bodyColumns
    const full = columns >= FULL_COLUMNS
    const steps = columns >= COMPACT_COLUMNS
    const [head, tail] = preview(t.previewWord, level)
    const { Box, Button, Text } = $.ui.resolve(e)
    return (
      <Box flexDirection="column">
        <Box key="adhd-reader" columnGap={1}>
          <Button
            key="toggle"
            hotkey="t"
            label={`ADHD Reader: ${enabled ? t.on : t.off}`}
            dimColor
            onPress={() => change($, v => ({ ...v, enabled: !v.enabled }))}
          />
          {steps && level > 1 ? (
            <Button key="less" hotkey="l" label={t.less} dimColor onPress={() => change($, v => ({ ...v, level: step(v.level, -1) }))} />
          ) : null}
          <Box key="level">
            <Text dimColor>{full ? `${levelName(t, level)} ${level}/5` : `${level}/5`}</Text>
          </Box>
          {steps && level < 5 ? (
            <Button key="more" hotkey="m" label={t.more} dimColor onPress={() => change($, v => ({ ...v, level: step(v.level, 1) }))} />
          ) : null}
          {full ? (
            <Box key="preview">
              <Text dimColor={!enabled}>
                <Text bold>{head}</Text>
                {tail}
              </Text>
            </Box>
          ) : null}
        </Box>
        {below}
      </Box>
    )
  })
}
