import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { AdhdReaderLevel, AdhdReaderSettings } from '../types'
import { bionic } from './bionic.ts'
import { cells, fmt, fromName, messages, normalize } from './i18n.ts'
import type { Lang, Messages } from './i18n.ts'

const COMMAND = 'adhd-reader'
const ALIAS = 'okuma' // Turkish name, listed only when the interface is Turkish
const DEFAULTS: AdhdReaderSettings = { enabled: true, level: 3 }
const settings = atom({ plugin: 'adhd-reader', key: 'settings' } as const, DEFAULTS)

// Cells between the band's toggle, level stepper and preview.
const GAP = 2

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

// The band's texts: the toggle's label, then the level and the preview when they are drawn.
type Row = [toggle: string, level?: string, preview?: string]

// `- level +` takes the level's cells plus four: two one-cell buttons, two gaps.
const width = ([toggle, level, preview]: Row) =>
  cells(toggle) + (level === undefined ? 0 : GAP + cells(level) + 4) + (preview === undefined ? 0 : GAP + cells(preview))

// The fullest row that fits; when even the last does not, the terminal wraps or cuts it.
function layout(t: Messages, { enabled, level }: AdhdReaderSettings, columns: number): Row {
  const long = `${enabled ? '[x]' : '[ ]'} ADHD Reader`
  const short = `${enabled ? '[x]' : '[ ]'} ADHD`
  // Padded to the language's widest level name, so `+` and the preview never move.
  const widest = Math.max(...([1, 2, 3, 4, 5] as const).map(n => cells(levelName(t, n))))
  const name = levelName(t, level)
  const named = `${name} ${level}/5${' '.repeat(widest - cells(name))}`
  const rows: Row[] = enabled
    ? [[long, named, t.preview], [long, named], [long, `${level}/5`], [short, `${level}/5`], [long], [short]]
    : [[long], [short]]
  return rows.find(row => width(row) <= columns) ?? rows[rows.length - 1]
}

// Copies the saved choice into the session state, which /clear, /resume and /branch reset.
async function load($: EngineInterface) {
  const saved = await $.store.get('settings')
  if (saved !== undefined) await update($, settings, () => sanitize(saved))
}

// Changes run one at a time, so two presses in one tick both count.
let queue: Promise<unknown> = Promise.resolve()

// Builds on what the store holds now, so another open session's change is kept.
function change($: EngineInterface, fn: (value: AdhdReaderSettings) => AdhdReaderSettings) {
  const done = queue.then(async () => {
    const saved = await $.store.get('settings')
    const value = sanitize(fn(saved === undefined ? await read($, settings) : sanitize(saved)))
    await $.store.set('settings', value)
    await update($, settings, () => value)
    return value
  })
  queue = done.catch(() => undefined)
  return done
}

function report($: EngineInterface, t: Messages, { enabled, level }: AdhdReaderSettings, cmd: string) {
  $.ui.toast(enabled ? fmt(t.toastOn, { level: levelName(t, level), n: level }) : fmt(t.toastOff, { cmd }))
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
      const t = m()
      for (const text of [fmt(t.intro, { cmd: lang === 'tr' ? ALIAS : COMMAND }), t.band, t.screen])
        $.ui.toast(text, { timeoutMs: 12000 })
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

  // Answers on its own with feedback as toasts, so the conversation stays untouched.
  // A toast is one line in a small box that shows three wrapped lines, so longer
  // feedback goes out as several toasts, which stack.
  on('command.run', { command: [COMMAND, ALIAS] }, async ($, e) => {
    const action = parse(e.args)
    if (!action || action.kind === 'help') {
      const t = m()
      const what = action ? [t.band, t.controls, t.screen] : [fmt(t.invalid, { arg: e.args.trim() })]
      for (const text of [...what, fmt(t.usage, { cmd: e.command })]) $.ui.toast(text)
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
    report($, m(), value, e.command)
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
    const value = await read($, settings)
    const [toggle, status, sample] = layout(m(), value, e.props.bodyColumns)
    const { Box, Button, Text } = $.ui.resolve(e)
    // Any level change turns the reader on, as `/adhd-reader <n>` does.
    const by = (n: 1 | -1) => () => change($, v => ({ enabled: true, level: step(v.level, n) }))
    // A one-cell blank holds a missing step's place, so nothing after it moves.
    const blank = <Text> </Text>
    return (
      <Box flexDirection="column">
        <Box key="adhd-reader" columnGap={GAP}>
          <Button key="toggle" plain label={toggle} dimColor onPress={() => change($, v => ({ ...v, enabled: !v.enabled }))} />
          {status === undefined ? null : (
            <Box columnGap={1}>
              {value.level > 1 ? <Button key="less" plain label="-" dimColor onPress={by(-1)} /> : blank}
              <Box key="level">
                <Text dimColor>{status}</Text>
              </Box>
              {value.level < 5 ? <Button key="more" plain label="+" dimColor onPress={by(1)} /> : blank}
            </Box>
          )}
          {sample === undefined ? null : (
            <Box key="preview">
              <Text dimColor>{bionic(sample, value.level).split('**').map((part, i) => (i % 2 ? <Text key={i} bold>{part}</Text> : part))}</Text>
            </Box>
          )}
        </Box>
        {below}
      </Box>
    )
  })

  // Without the band, the footer's mode labels carry the level while the reader is on.
  if (!showBand)
    on('ui.render', { component: 'SessionMode' }, async ($, e, next) => {
      const { enabled, level } = await read($, settings)
      return next(enabled ? { ...e, props: { ...e.props, modes: [...e.props.modes, `adhd ${level}/5`] } } : e)
    }).catch(() => undefined)
}
