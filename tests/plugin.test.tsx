import { expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'

import { bionic } from '../hooks/bionic.ts'
import { layout, width } from '../hooks/register.tsx'
import { MESSAGES, cells, fromName } from '../hooks/i18n.ts'
import type { Lang } from '../hooks/i18n.ts'

const PLUGIN = 'adhd-reader'
const SURFACES = ['terminal', 'desktop'] as const
const LANGS = Object.keys(MESSAGES) as Lang[]
const REPLY =
  'Reading **bold** `inline code` [link](https://docs.localhost/path) https://docs.localhost/raw\n\n```js\nconst words = 1\n```'
const BAND = {
  hasSurvey: false,
  isWorking: false,
  maxRows: 10,
  bodyColumns: 100,
  scroll: { offset: 0, bodyRows: 9 },
  view: {},
}

type Setup = {
  store?: Record<string, unknown>
  // Claude Code's own /config rows, served to any plugin that asks for them.
  settings?: Record<string, unknown>
}

// The engine beneath the plugin: store and toasts in memory, plus another band drawn under ours.
function world(on: On, { store = {}, settings = {} }: Setup = {}) {
  const toasts: string[] = []
  const asked = { settings: 0 }
  on('store.get', ($, e) => ({ value: store[e.key] }))
  on('store.set', ($, e) => {
    store[e.key] = e.value
    return { value: undefined }
  })
  on('ui.toast', ($, e) => {
    toasts.push(e.text)
    return { value: undefined }
  })
  on('config.list', () => {
    asked.settings++
    const provider = { plugin: 'engine', tier: 'core' as const }
    const rows = Object.entries(settings).map(([name, value]) => ({ key: name, label: name, kind: 'text', value, provider, isLocked: false }))
    return { value: rows as never }
  })
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('classic.SessionStart', () => ({}))
  on('command.register', ($, e) => ({ value: { command: e.name } }))
  on('command.describe', ($, e) => ({ description: e.description, argumentHint: e.argumentHint, isHidden: e.isHidden }))
  on('config.describe', ($, e) => ({ label: e.label, description: e.description, isHidden: e.isHidden }))
  on('ui.render', { component: 'AssistantMessage' }, ($, e) => ({ type: 'Text', props: {}, children: [e.props.text] }))
  on('ui.render', { component: 'AbovePrompt' }, () => ({ type: 'Text', props: {}, children: ['other band'] }))
  on('ui.render', { component: 'SessionMode' }, ($, e) => ({ type: 'Text', props: {}, children: [e.props.modes.join(' & ')] }))
  return { store, toasts, asked, last: () => toasts[toasts.length - 1] }
}

const start = ($: any, isInteractive = true) => $.session.start({ cwd: '/', surface: 'terminal', isInteractive })
const run = ($: any, args: string, command = PLUGIN) => $.command.run({ command, args })

async function drawReply($: any, surface: (typeof SURFACES)[number], text = REPLY) {
  const ui = await $.ui.mount({
    plugin: PLUGIN,
    surface,
    component: 'AssistantMessage',
    props: { text, isFirstOfReply: true, onScreen: { first: 0, last: 3, of: 4 } },
  })
  const found = await ui.find({ type: 'Text' })
  await ui.unmount()
  expect(found).toBeDefined()
  return found!.text
}

const band = ($: any, surface: (typeof SURFACES)[number], props: Partial<typeof BAND> = {}) =>
  $.ui.mount({ plugin: PLUGIN, surface, component: 'AbovePrompt', props: { ...BAND, ...props } })

type Drawn = { type: string; props: Record<string, any>; children?: (Drawn | string)[] }

// The tree as the terminal lays it out: the band's plain Buttons as their label,
// gaps as spaces; bold runs wrapped in `mark`.
function paint(node: Drawn | string, mark = ''): string {
  if (typeof node === 'string') return node
  const props = node.props ?? {}
  if (node.type === 'Button') return props.label
  const inner = (node.children ?? []).map(child => paint(child, mark))
  if (node.type === 'Box') return inner.join(props.flexDirection === 'column' ? '\n' : ' '.repeat(props.columnGap ?? 0))
  return props.bold ? `${mark}${inner.join('')}${mark}` : inner.join('')
}

// Our row of the band, the first line; the band beneath is the next.
async function row(ui: any, mark = '') {
  return paint(await ui.drawn(), mark).split('\n')[0]
}

const describe = ($: any, command: string) =>
  $.command.describe({
    command,
    description: '',
    isHidden: false,
    immediate: true,
    provider: { plugin: PLUGIN, tier: 'user' },
  })

// Localization

test('English by default: band, toasts and command description', async ($, on) => {
  const w = world(on)
  await start($)
  expect(w.toasts[0]).toContain('ADHD Reader bolds')
  for (const surface of SURFACES) {
    const ui = await band($, surface)
    expect((await ui.find({ key: 'toggle' }))?.text).toBe('[x] ADHD Reader')
    expect((await ui.find({ key: 'level' }))?.text).toBe('Medium 3/5   ')
    await ui.unmount()
  }
  await run($, 'off')
  expect(w.last()).toBe('ADHD Reader off. /adhd-reader turns it back on.')
  expect((await describe($, PLUGIN)).description).toBe(MESSAGES.en.description)
  expect((await describe($, PLUGIN)).argumentHint).toBe('[on | off | 1-5 | help]')
  expect((await describe($, 'okuma')).isHidden).toBe(true)
})

test('Turkish chosen in /config, whatever Claude Code itself is set to', { options: { language: 'Türkçe' } }, async ($, on) => {
  const w = world(on, { settings: { language: 'german' } })
  await start($)
  expect(w.toasts[0]).toContain('/okuma yardım')
  for (const surface of SURFACES) {
    const ui = await band($, surface)
    expect((await ui.find({ key: 'toggle' }))?.text).toBe('[x] ADHD Reader')
    expect((await ui.find({ key: 'level' }))?.text).toBe('Orta 3/5    ')
    await ui.unmount()
  }
  await run($, 'kapat', 'okuma')
  expect(w.last()).toBe('ADHD Reader kapalı. /okuma yeniden açar.')
  await run($, '4', 'okuma')
  expect(w.last()).toBe('ADHD Reader açık: Güçlü (4/5)')
  await run($, 'xyz', 'okuma')
  expect(w.toasts.slice(-2)).toEqual([
    '"xyz" geçerli bir seçenek değil. Seviyeler 1 (hafif) ile 5 (en güçlü) arası.',
    'Kullanım: /okuma [aç | kapat | değiştir | durum | yardım | 1-5]',
  ])
  expect((await describe($, 'okuma')).isHidden).toBe(false)
  expect((await describe($, 'okuma')).argumentHint).toBe('[aç | kapat | 1-5 | yardım]')
  expect(w.asked.settings).toBe(0)
})

test('/config rows are labeled in the chosen language', { options: { language: 'Deutsch' } }, async ($, on) => {
  world(on)
  await start($)
  const row = (key: string) =>
    $.config.describe({ key, label: key, isHidden: false, provider: { plugin: PLUGIN, tier: 'user' } })
  expect((await row('adhd-reader.language')).label).toBe('Sprache')
  expect((await row('adhd-reader.showBand')).label).toBe('Leiste anzeigen')
  expect((await row('adhd-reader.showBand')).description).toBe(MESSAGES.de.showBandHelp)
})

for (const language of ['Auto', '', 'Klingon'])
  test(`language option ${JSON.stringify(language)} is English`, { options: { language } }, async ($, on) => {
    const w = world(on, { settings: { language: 'japanese' } })
    await start($)
    const ui = await band($, 'terminal')
    expect((await ui.find({ key: 'level' }))?.text).toBe('Medium 3/5   ')
    await ui.unmount()
    expect(w.asked.settings).toBe(0)
  })

test('free text typed in /config is understood', { options: { language: 'portuguese' } }, async ($, on) => {
  world(on)
  await start($)
  const ui = await band($, 'terminal')
  expect((await ui.find({ key: 'level' }))?.text).toBe('Médio 3/5 ')
  await ui.unmount()
})

test('a level argument while off turns the reader on at that level', async ($, on) => {
  const w = world(on)
  await start($)
  await run($, 'off')
  await run($, '5')
  expect(w.store.settings).toEqual({ enabled: true, level: 5 })
  expect(w.last()).toBe('ADHD Reader on: Strongest (5/5)')
})

test('language detection helpers', () => {
  expect(fromName('pt_PT')).toBe('pt-BR')
  expect(fromName('zh_CN')).toBe('zh-Hans')
  expect(fromName('zh_TW')).toBeUndefined()
  expect(fromName('fi_FI')).toBeUndefined()
  expect(fromName('Traditional Chinese')).toBeUndefined()
  expect(fromName('Klingon')).toBeUndefined()
})

test('names and codes in English and natively, any case or accent', () => {
  const table: Record<string, string[]> = {
    en: ['English', 'english', 'ENGLISH', 'en', 'en-US', 'EN'],
    tr: ['Turkish', 'turkish', 'Türkçe', 'TURKCE', 'turkce', 'Turkce', 'tr', 'tr-TR', 'TR'],
    es: ['Spanish', 'Español', 'espanol', 'ESPAÑOL', 'es', 'es-MX'],
    'pt-BR': ['Portuguese', 'Português', 'Portugues', 'Português (Brasil)', 'Brazilian', 'pt', 'pt-BR', 'PT_br'],
    de: ['German', 'Deutsch', 'DEUTSCH', 'de', 'de-DE'],
    fr: ['French', 'Français', 'francais', 'FRANÇAIS', 'fr', 'fr-CA'],
    ru: ['Russian', 'Русский', 'русский', 'РУССКИЙ', 'ru', 'ru-RU'],
    ja: ['Japanese', '日本語', 'ja', 'ja-JP'],
    'zh-Hans': ['Chinese', '简体中文', '中文', 'zh', 'zh-Hans', 'zh-CN', 'ZH-cn', 'zh_CN', 'zh_CN.UTF-8', 'zh-Hans-CN'],
  }
  // Locale-shaped values, as a system locale is written.
  table['pt-BR'].push('pt_BR.UTF-8', 'pt-br')
  table.de.push('de_DE.UTF-8', 'de_DE@euro')
  table.tr.push('tr_TR.UTF-8')
  table.ja.push('ja_JP.UTF-8', 'ｊａ')
  for (const [lang, names] of Object.entries(table)) for (const name of names) expect([name, fromName(name)]).toEqual([name, lang])
  for (const name of ['Auto', 'auto', 'AUTO', '', '   ', 'Turkmen', 'Turkmenistan', 'Klingon', 'zh-TW', 'zh-Hant', '繁體中文', 'zh_TW.UTF-8', 'zh-Hant-TW', 'fi_FI.UTF-8', 'C.UTF-8', 'POSIX', 'Deutsche'])
    expect([name, fromName(name)]).toEqual([name, undefined])
  expect(fromName(undefined)).toBeUndefined()
  expect(fromName(7)).toBeUndefined()
})

test('all nine tables: same keys, no empty strings, placeholders kept, no long dash', () => {
  expect(LANGS).toEqual(['en', 'tr', 'es', 'pt-BR', 'de', 'fr', 'ru', 'ja', 'zh-Hans'])
  const keys = Object.keys(MESSAGES.en).sort()
  for (const lang of LANGS) {
    const table = MESSAGES[lang] as Record<string, string>
    expect(Object.keys(table).sort()).toEqual(keys)
    for (const key of keys) {
      const text = table[key]
      expect(text.trim().length).toBeGreaterThan(0)
      expect(text.includes('\u2014')).toBe(false)
      const holes = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort()
      expect(holes(text)).toEqual(holes((MESSAGES.en as Record<string, string>)[key]))
    }
  }
})

test('every language teaches the band path and lists help', () => {
  const helpWord: Record<Lang, string> = {
    en: 'help',
    tr: 'yardım',
    es: 'ayuda',
    'pt-BR': 'ajuda',
    de: 'hilfe',
    fr: 'aide',
    ru: 'помощь',
    ja: 'ヘルプ',
    'zh-Hans': '帮助',
  }
  for (const lang of LANGS) {
    const t = MESSAGES[lang]
    expect([lang, t.band.includes('ctrl+x') && t.band.includes('Tab')]).toEqual([lang, true])
    expect([lang, t.intro.includes(`/{cmd} ${helpWord[lang]}`)]).toEqual([lang, true])
    expect([lang, t.usage.includes(helpWord[lang]) && t.argumentHint.includes(helpWord[lang])]).toEqual([lang, true])
    expect([lang, t.invalid.includes('1') && t.invalid.includes('5')]).toEqual([lang, true])
  }
})

test('cell widths: East Asian wide characters take two', () => {
  expect(cells('Medium 3/5')).toBe(10)
  expect(cells('最強 5/5')).toBe(8)
  expect(cells('轻+ 2/5')).toBe(7)
  expect(cells('Désactivé')).toBe(9)
  expect(cells('Désactivé'.normalize('NFD'))).toBe(9)
})

// Replies

test('on by default: prose bolded, code and URLs untouched, on both surfaces', async ($, on) => {
  world(on)
  await start($)
  for (const surface of SURFACES) {
    const out = await drawReply($, surface)
    expect(out).not.toBe(REPLY)
    expect(out).toMatch(/^\*\*Re\w*\*\*\w*ing /)
    expect(out).toContain('`inline code`')
    expect(out).toContain('(https://docs.localhost/path)')
    expect(out).toContain(' https://docs.localhost/raw')
    expect(out).toContain('```js\nconst words = 1\n```')
  }
})

test('off leaves replies unchanged; level changes the output', async ($, on) => {
  world(on)
  await start($)
  await run($, '1')
  const light = await drawReply($, 'terminal', 'Reading')
  await run($, '5')
  const strong = await drawReply($, 'desktop', 'Reading')
  expect(light).toContain('**')
  expect(strong).toContain('**')
  expect(light).not.toBe(strong)
  await run($, 'off')
  for (const surface of SURFACES) expect(await drawReply($, surface)).toBe(REPLY)
})

// Command arguments

test('arguments in any language and case; nothing reaches the transcript', async ($, on) => {
  const w = world(on)
  await start($)
  const cases: [string, boolean, number][] = [
    ['off', false, 3],
    ['ON', true, 3],
    ['KAPAT', false, 3],
    ['AÇ', true, 3],
    ['aus', false, 3],
    ['An', true, 3],
    ['DESACTIVAR', false, 3],
    ['ACTIVER', true, 3],
    ['désactiver', false, 3],
    ['Ligar', true, 3],
    ['выкл', false, 3],
    ['ВКЛ', true, 3],
    ['オフ', false, 3],
    ['开', true, 3],
    ['\u3000ＯＦＦ\u3000', false, 3],
    ['ｵﾝ', true, 3],
    ['off', false, 3],
    ['５', true, 5],
    ['  4  ', true, 4],
    ['', false, 4],
    ['toggle', true, 4],
  ]
  for (const [args, enabled, level] of cases) {
    const result = await run($, args)
    expect(result.text).toBeUndefined()
    expect(result.context).toBeUndefined()
    expect(w.store.settings).toEqual({ enabled, level })
  }
  await run($, 'status')
  expect(w.last()).toBe('ADHD Reader on: Strong (4/5)')
  await run($, 'help')
  const { band, controls } = MESSAGES.en
  expect(w.toasts.slice(-3)).toEqual([band, controls, 'Usage: /adhd-reader [on | off | toggle | status | help | 1-5]'])
})

test('invalid arguments say what was wrong and change nothing', async ($, on) => {
  const w = world(on)
  await start($)
  await run($, '2')
  const before = { ...(w.store.settings as object) }
  for (const args of ['0', '6', '1.5', 'ac 3', '12', 'xyz', 'constructor', '-1', 'Ⅲ', '٣']) {
    const count = w.toasts.length
    const result = await run($, args)
    expect(result.text).toBeUndefined()
    expect(w.store.settings).toEqual(before)
    expect(w.toasts.slice(count)).toEqual([
      `"${args}" is not an option. Levels are 1 (light) to 5 (strongest).`,
      'Usage: /adhd-reader [on | off | toggle | status | help | 1-5]',
    ])
  }
  // The argument is echoed on one line, cut short.
  for (const [args, echoed] of [
    ['on\n\toff', 'on off'],
    ['x'.repeat(200), `${'x'.repeat(20)}…`],
    ['強'.repeat(200), `${'強'.repeat(10)}…`],
  ]) {
    await run($, args)
    expect(w.toasts.at(-2)).toBe(`"${echoed}" is not an option. Levels are 1 (light) to 5 (strongest).`)
  }
})

test('two commands in the same tick both count', async ($, on) => {
  const w = world(on)
  await start($)
  await Promise.all([run($, 'toggle'), run($, 'toggle')])
  expect(w.store.settings).toEqual({ enabled: true, level: 3 })
  await Promise.all([run($, 'off'), run($, 'toggle'), run($, 'toggle')])
  expect(w.store.settings).toEqual({ enabled: false, level: 3 })
})

// Band

test('band keeps the band beneath it, toggles and steps the level', async ($, on) => {
  const w = world(on)
  await start($)
  for (const surface of SURFACES) {
    const ui = await band($, surface)
    expect(await ui.find({ text: 'other band' })).toBeDefined()
    expect((await ui.find({ key: 'less' }))?.text).toBe('-')
    expect((await ui.find({ key: 'more' }))?.text).toBe('+')
    await ui.press({ key: 'toggle' })
    expect((await ui.find({ key: 'toggle' }))?.text).toBe('[ ] ADHD Reader')
    expect(w.store.settings).toEqual({ enabled: false, level: 3 })
    await ui.press({ key: 'toggle' })
    await ui.press({ key: 'more' })
    expect((await ui.find({ key: 'level' }))?.text).toBe('Strong 4/5   ')
    await ui.press({ key: 'less' })
    expect((await ui.find({ key: 'level' }))?.text).toBe('Medium 3/5   ')
    expect(await ui.find({ text: 'other band' })).toBeDefined()
    await ui.unmount()
  }
})

test('band controls are plain, with no letter that would only work after ctrl+x Tab', async ($, on) => {
  world(on)
  await start($)
  for (const surface of SURFACES) {
    const ui = await band($, surface)
    for (const button of await ui.findAll({ type: 'Button' })) {
      expect(button.props.plain).toBe(true)
      expect(button.props.hotkey).toBeUndefined()
    }
    expect(await row(ui)).toBe('[x] ADHD Reader  - Medium 3/5    +  Easier reading')
    await ui.unmount()
  }
})

test('two band presses in the same tick both count', async ($, on) => {
  const w = world(on)
  await start($)
  for (const surface of SURFACES) {
    const ui = await band($, surface)
    await Promise.all([ui.press({ key: 'toggle' }), ui.press({ key: 'toggle' })])
    expect(w.store.settings).toEqual({ enabled: true, level: 3 })
    await Promise.all([ui.press({ key: 'more' }), ui.press({ key: 'more' })])
    expect(w.store.settings).toEqual({ enabled: true, level: 5 })
    await Promise.all([ui.press({ key: 'less' }), ui.press({ key: 'less' })])
    expect(w.store.settings).toEqual({ enabled: true, level: 3 })
    await ui.unmount()
  }
})

test('a level change from the band turns the reader on', async ($, on) => {
  const store: Record<string, unknown> = {}
  world(on, { store })
  await start($)
  for (const surface of SURFACES) {
    const ui = await band($, surface)
    // Another session switched it off after this band was drawn.
    store.settings = { enabled: false, level: 2 }
    await ui.press({ key: 'more' })
    expect(store.settings).toEqual({ enabled: true, level: 3 })
    store.settings = { enabled: false, level: 4 }
    await ui.press({ key: 'less' })
    expect(store.settings).toEqual({ enabled: true, level: 3 })
    await ui.unmount()
  }
})

test('off collapses the band to the toggle alone', async ($, on) => {
  world(on)
  await start($)
  await run($, 'off')
  for (const surface of SURFACES) {
    const ui = await band($, surface)
    expect(await row(ui)).toBe('[ ] ADHD Reader')
    for (const key of ['less', 'level', 'more', 'preview']) expect(await ui.find({ key })).toBeUndefined()
    await ui.unmount()
  }
})

test('at 1 and 5 the missing step keeps its cell, so nothing shifts', async ($, on) => {
  world(on)
  await start($)
  for (const surface of SURFACES) {
    await run($, '1')
    let ui = await band($, surface)
    expect(await ui.find({ key: 'less' })).toBeUndefined()
    expect(await ui.find({ key: 'more' })).toBeDefined()
    expect(await row(ui)).toBe('[x] ADHD Reader    Light 1/5     +  Easier reading')
    await ui.unmount()
    await run($, '5')
    ui = await band($, surface)
    expect(await ui.find({ key: 'more' })).toBeUndefined()
    expect(await ui.find({ key: 'less' })).toBeDefined()
    expect(await row(ui)).toBe('[x] ADHD Reader  - Strongest 5/5    Easier reading')
    await ui.unmount()
  }
})

test('preview: dim, its bold heads only weighted, different at every level', async ($, on) => {
  world(on)
  await start($)
  const seen = new Set<string>()
  for (const level of [1, 2, 3, 4, 5]) {
    await run($, String(level))
    const ui = await band($, 'terminal')
    const preview = ((await ui.drawn()) as any).children[0].children.at(-1)
    expect(preview.props.key).toBe('preview')
    expect(preview.children[0].props.dimColor).toBe(true)
    seen.add(paint(preview, '*'))
    await ui.unmount()
  }
  expect([...seen]).toEqual([
    '*Ea*sier *rea*ding',
    '*Eas*ier *rea*ding',
    '*Eas*ier *read*ing',
    '*Easi*er *readi*ng',
    '*Easie*r *readi*ng',
  ])
})

test('every language has a preview that looks different at all five levels', () => {
  for (const lang of LANGS) {
    const { preview } = MESSAGES[lang]
    expect([lang, preview.split(' ').length]).toEqual([lang, 2])
    expect([lang, new Set([1, 2, 3, 4, 5].map(level => bionic(preview, level))).size]).toEqual([lang, 5])
  }
})

test('band yields to a survey', async ($, on) => {
  world(on)
  await start($)
  for (const surface of SURFACES) {
    const ui = await band($, surface, { hasSurvey: true })
    expect(await ui.find({ key: 'toggle' })).toBeUndefined()
    expect(await ui.find({ text: 'other band' })).toBeDefined()
    await ui.unmount()
  }
})

test('showBand off draws only the band beneath', { options: { showBand: false } }, async ($, on) => {
  world(on)
  await start($)
  for (const surface of SURFACES) {
    const ui = await band($, surface)
    expect(await ui.find({ key: 'toggle' })).toBeUndefined()
    expect(await ui.find({ text: 'other band' })).toBeDefined()
    await ui.unmount()
  }
})

const footer = ($: any, surface: (typeof SURFACES)[number]) =>
  $.ui.mount({ plugin: PLUGIN, surface, component: 'SessionMode', props: { modes: ['focus'] } })

test('showBand off: the footer shows the level while the reader is on', { options: { showBand: false } }, async ($, on) => {
  world(on)
  await start($)
  for (const surface of SURFACES) {
    await run($, '4')
    let ui = await footer($, surface)
    expect((await ui.find({ type: 'Text' }))?.text).toBe('focus & adhd 4/5')
    await ui.unmount()
    await run($, 'off')
    ui = await footer($, surface)
    expect((await ui.find({ type: 'Text' }))?.text).toBe('focus')
    await ui.unmount()
  }
})

test('with the band shown, the footer is left alone', async ($, on) => {
  world(on)
  await start($)
  const ui = await footer($, 'terminal')
  expect((await ui.find({ type: 'Text' }))?.text).toBe('focus')
  await ui.unmount()
})

test('narrow widths drop the preview, the level name, the long name, then the level', async ($, on) => {
  world(on)
  await start($)
  const rows: Record<number, string> = {}
  for (const bodyColumns of [75, 40, 35, 25, 20, 17, 16, 15, 8]) {
    const ui = await band($, 'terminal', { bodyColumns })
    rows[bodyColumns] = await row(ui)
    await ui.unmount()
  }
  expect(rows).toEqual({
    75: '[x] ADHD Reader  - Medium 3/5    +  Easier reading',
    40: '[x] ADHD Reader  - Medium 3/5    +',
    35: '[x] ADHD Reader  - Medium 3/5    +',
    25: '[x] ADHD Reader  - 3/5 +',
    20: '[x] ADHD  - 3/5 +',
    17: '[x] ADHD  - 3/5 +',
    16: '[x] ADHD Reader',
    15: '[x] ADHD Reader',
    8: '[x] ADHD',
  })
})

for (const lang of LANGS)
  test(`${lang}: the band fits every width from 8 to 120 cells, on and off`, { options: { language: lang } }, async ($, on) => {
    world(on)
    await start($)
    for (const state of ['off', '1', '2', '3', '4', '5']) {
      await run($, state)
      const value = state === 'off' ? { enabled: false, level: 3 as const } : { enabled: true, level: Number(state) as 1 }
      // Every width through the layout, and the band drawn wherever the layout changes.
      let previous = 0
      for (let bodyColumns = 8; bodyColumns <= 120; bodyColumns++) {
        const cellsUsed = width(layout(MESSAGES[lang], value, bodyColumns))
        expect([state, bodyColumns, cellsUsed <= bodyColumns]).toEqual([state, bodyColumns, true])
        expect(cellsUsed).toBeGreaterThanOrEqual(previous)
        if (cellsUsed === previous) continue
        previous = cellsUsed
        const ui = await band($, 'terminal', { bodyColumns })
        expect([state, bodyColumns, cells(await row(ui))]).toEqual([state, bodyColumns, cellsUsed])
        await ui.unmount()
      }
      const ui = await band($, 'terminal', { bodyColumns: 120 })
      expect(await ui.find({ key: state === 'off' ? 'toggle' : 'preview' })).toBeDefined()
      await ui.unmount()
    }
  })

for (const lang of LANGS)
  test(`${lang}: + and the preview stay in the same cell at every level`, { options: { language: lang } }, async ($, on) => {
    world(on)
    await start($)
    const { preview } = MESSAGES[lang]
    const at = new Set<string>()
    for (const level of [1, 2, 3, 4, 5]) {
      await run($, String(level))
      const ui = await band($, 'terminal', { bodyColumns: 120 })
      const drawn = await row(ui)
      await ui.unmount()
      const before = (part: string) => cells(drawn.slice(0, drawn.lastIndexOf(part)))
      at.add(`${level < 5 ? before(' +  ') : before('    ')} ${before(preview)}`)
    }
    expect([lang, at.size]).toEqual([lang, 1])
  })

// Toasts

// A toast box wraps its text at 40 cells and shows three lines. Greedy word
// wrap, a word wider than a line cut by cells: no kinder than the terminal.
function wrap(text: string, width = 40) {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(' ')) {
    if (line !== '' && cells(`${line} ${word}`) > width) {
      lines.push(line)
      line = word
    } else line = line === '' ? word : `${line} ${word}`
    while (cells(line) > width) {
      let cut = 0
      for (const char of line) {
        if (cells(line.slice(0, cut + char.length)) > width) break
        cut += char.length
      }
      lines.push(line.slice(0, cut))
      line = line.slice(cut)
    }
  }
  return [...lines, line]
}

test('wrap breaks at spaces and cuts wide text by cells', () => {
  expect(wrap('aaa bbb ccc', 7)).toEqual(['aaa bbb', 'ccc'])
  expect(wrap('強強強強', 5)).toEqual(['強強', '強強'])
})

for (const lang of LANGS)
  test(`${lang}: every toast is one line that fits its box`, { options: { language: lang } }, async ($, on) => {
    const w = world(on)
    await start($)
    const counts = [w.toasts.length]
    const long = ['x'.repeat(200), '強'.repeat(200), 'ab '.repeat(70), 'on\noff', 'a\r\n\u001b[31mb\u0007']
    for (const args of ['help', 'abcdefghijkl', ...long, 'off', '1', '2', '3', '4', '5', 'status']) {
      const before = w.toasts.length
      await run($, args)
      counts.push(w.toasts.length - before)
    }
    // The terminal shows three toasts at once; a fourth hides the oldest behind "+1 more".
    expect(counts).toEqual([3, 3, 2, ...long.map(() => 2), 1, 1, 1, 1, 1, 1, 1])
    for (const text of w.toasts) {
      expect([text, /\p{Cc}/u.test(text), cells(text) <= 110, wrap(text).length <= 3]).toEqual([text, false, true, true])
    }
  })

// Persistence

test('settings survive a restart', async ($, on) => {
  const store: Record<string, unknown> = {}
  const w = world(on, { store })
  await start($)
  await run($, '5')
  await run($, 'off')
  expect(store.settings).toEqual({ enabled: false, level: 5 })
  store.settings = { enabled: true, level: 2 }
  await start($)
  await run($, 'status')
  expect(w.last()).toBe('ADHD Reader on: Light+ (2/5)')
  for (const surface of SURFACES) {
    const ui = await band($, surface)
    expect((await ui.find({ key: 'level' }))?.text).toBe('Light+ 2/5   ')
    await ui.unmount()
  }
})

test('the saved choice comes back after /clear, /resume and /branch', async ($, on) => {
  const store: Record<string, unknown> = { settings: { enabled: false, level: 1 }, introSeen: true }
  world(on, { store })
  await $.classic.SessionStart({ source: 'clear' })
  const ui = await band($, 'terminal')
  expect((await ui.find({ key: 'toggle' }))?.props.label).toBe('[ ] ADHD Reader')
  await ui.press({ key: 'toggle' })
  expect((await ui.find({ key: 'level' }))?.text).toBe('Light 1/5    ')
  expect(store.settings).toEqual({ enabled: true, level: 1 })
  await ui.unmount()
})

test('a change builds on what another session saved', async ($, on) => {
  const store: Record<string, unknown> = {}
  world(on, { store })
  await start($)
  await run($, '2')
  store.settings = { enabled: true, level: 4 }
  await run($, 'off')
  expect(store.settings).toEqual({ enabled: false, level: 4 })
})

test('corrupt stored settings fall back field by field', async ($, on) => {
  const store: Record<string, unknown> = {}
  const w = world(on, { store })
  const off = 'ADHD Reader off. /adhd-reader turns it back on.'
  const cases: [unknown, string][] = [
    [{ enabled: true, level: 99 }, 'ADHD Reader on: Medium (3/5)'],
    [{ enabled: 'no', level: 2 }, 'ADHD Reader on: Light+ (2/5)'],
    [{ enabled: false, level: 2.5 }, off],
    [{ enabled: true, level: '4' }, 'ADHD Reader on: Medium (3/5)'],
    ['junk', 'ADHD Reader on: Medium (3/5)'],
    [null, 'ADHD Reader on: Medium (3/5)'],
    [[1, 2], 'ADHD Reader on: Medium (3/5)'],
  ]
  for (const [saved, expected] of cases) {
    store.settings = saved
    await start($)
    await run($, 'status')
    expect(w.last()).toBe(expected)
  }
  await run($, 'more')
  expect(w.last()).toContain('Usage')
})

test('intro shows once, and only in an interactive session', async ($, on) => {
  const store: Record<string, unknown> = {}
  const w = world(on, { store })
  await start($, false)
  expect(w.toasts).toHaveLength(0)
  await start($)
  const { intro, band, screen } = MESSAGES.en
  expect(w.toasts).toEqual([intro.replace('{cmd}', 'adhd-reader'), band, screen])
  expect(store.introSeen).toBe(true)
  await start($)
  expect(w.toasts).toHaveLength(3)
})

test('intro waits for an app that draws it', async ($, on) => {
  const store: Record<string, unknown> = {}
  const w = world(on, { store })
  await $.session.start({ cwd: '/', surface: 'vscode', isInteractive: true })
  expect(w.toasts).toHaveLength(0)
  expect(store.introSeen).toBeUndefined()
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  expect(w.toasts).toHaveLength(3)
})
