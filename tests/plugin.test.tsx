import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

import { MESSAGES, fromLocale, fromName } from '../hooks/i18n.ts'

const PLUGIN = 'adhd-reader'
const SURFACES = ['terminal', 'desktop'] as const
const REPLY =
  'Reading **bold** `inline code` [link](https://example.com/path) https://example.com/raw\n\n```js\nconst words = 1\n```'
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
  settings?: Record<string, unknown>
  env?: Record<string, string>
}

// The engine beneath the plugin: store, toasts, settings and environment in
// memory, plus another band drawn under ours.
function world(on: On, { store = {}, settings = {}, env = {} }: Setup = {}) {
  const toasts: string[] = []
  on('store.get', ($, e) => ({ value: store[e.key] }))
  on('store.set', ($, e) => {
    store[e.key] = e.value
    return { value: undefined }
  })
  mock.env(on, env)
  on('settings.read', () => ({ value: settings }))
  on('ui.toast', ($, e) => {
    toasts.push(e.text)
    return { value: undefined }
  })
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('command.register', ($, e) => ({ value: { command: e.name } }))
  on('command.describe', ($, e) => ({ description: e.description, argumentHint: e.argumentHint, isHidden: e.isHidden }))
  on('config.describe', ($, e) => ({ label: e.label, description: e.description, isHidden: e.isHidden }))
  on('ui.render', { component: 'AssistantMessage' }, ($, e) => ({ type: 'Text', props: {}, children: [e.props.text] }))
  on('ui.render', { component: 'AbovePrompt' }, () => ({ type: 'Text', props: {}, children: ['other band'] }))
  return { store, toasts, last: () => toasts[toasts.length - 1] }
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
    expect((await ui.find({ key: 'toggle' }))?.text).toBe('ADHD Reader: On')
    expect((await ui.find({ key: 'level' }))?.text).toBe('Medium 3/5')
    await ui.unmount()
  }
  await run($, 'off')
  expect(w.last()).toBe('ADHD Reader off')
  expect((await describe($, PLUGIN)).description).toBe(MESSAGES.en.description)
  expect((await describe($, 'okuma')).isHidden).toBe(true)
})

test('Turkish chosen in /config', { options: { language: 'Türkçe' } }, async ($, on) => {
  const w = world(on, { env: { LANG: 'de_DE.UTF-8' } })
  await start($)
  expect(w.toasts[0]).toContain('/okuma')
  for (const surface of SURFACES) {
    const ui = await band($, surface)
    expect((await ui.find({ key: 'toggle' }))?.text).toBe('ADHD Reader: Açık')
    expect((await ui.find({ key: 'less' }))?.text).toBe('Azalt')
    expect((await ui.find({ key: 'level' }))?.text).toBe('Orta 3/5')
    await ui.unmount()
  }
  await run($, 'kapat', 'okuma')
  expect(w.last()).toBe('ADHD Reader kapalı')
  await run($, '4', 'okuma')
  expect(w.last()).toBeDefined()
  await run($, 'aç', 'okuma')
  expect(w.last()).toBe('ADHD Reader açık: Güçlü (4/5)')
  await run($, 'xyz', 'okuma')
  expect(w.last()).toBe('Kullanım: /okuma [aç | kapat | değiştir | durum | 1-5]')
  expect((await describe($, 'okuma')).isHidden).toBe(false)
  expect((await describe($, 'okuma')).argumentHint).toBe('[aç | kapat | 1-5]')
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

test('Auto follows the language setting, then the locale variables', async ($, on) => {
  world(on, { settings: { language: 'turkish' }, env: { LANG: 'de_DE.UTF-8' } })
  await start($)
  const ui = await band($, 'desktop')
  expect((await ui.find({ key: 'toggle' }))?.text).toBe('ADHD Reader: Açık')
  await ui.unmount()
})

test('a band drawn before Auto settles is redrawn in the detected language', async ($, on) => {
  world(on, { env: { LANG: 'tr_TR.UTF-8' } })
  const ui = await band($, 'terminal')
  expect((await ui.find({ key: 'toggle' }))?.text).toBe('ADHD Reader: On')
  await start($)
  expect((await ui.find({ key: 'toggle' }))?.text).toBe('ADHD Reader: Açık')
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

test('Auto falls back to the first locale variable, C and POSIX skipped', async ($, on) => {
  world(on, { env: { LC_ALL: 'C', LANG: 'de_DE.UTF-8' } })
  await start($)
  const ui = await band($, 'terminal')
  expect((await ui.find({ key: 'toggle' }))?.text).toBe('ADHD Reader: An')
  await ui.unmount()
})

test('language detection helpers', () => {
  expect(fromLocale('pt_PT.UTF-8')).toBe('pt-BR')
  expect(fromLocale('zh_CN')).toBe('zh-Hans')
  expect(fromLocale('zh_TW')).toBeUndefined()
  expect(fromLocale('fi_FI')).toBeUndefined()
  expect(fromName('Español')).toBe('es')
  expect(fromName('Русский')).toBe('ru')
  expect(fromName('日本語')).toBe('ja')
  expect(fromName('Traditional Chinese')).toBeUndefined()
  expect(fromName('Klingon')).toBeUndefined()
})

test('all nine tables: same keys, no empty strings, placeholders kept, no long dash', () => {
  const langs = Object.keys(MESSAGES)
  expect(langs).toEqual(['en', 'tr', 'es', 'pt-BR', 'de', 'fr', 'ru', 'ja', 'zh-Hans'])
  const keys = Object.keys(MESSAGES.en).sort()
  for (const lang of langs) {
    const table = MESSAGES[lang as keyof typeof MESSAGES] as Record<string, string>
    expect(Object.keys(table).sort()).toEqual(keys)
    for (const key of keys) {
      const text = table[key]
      expect(typeof text).toBe('string')
      expect(text.trim().length).toBeGreaterThan(0)
      expect(text.includes('\u2014')).toBe(false)
      const holes = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort()
      expect(holes(text)).toEqual(holes((MESSAGES.en as Record<string, string>)[key]))
    }
  }
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
    expect(out).toContain('(https://example.com/path)')
    expect(out).toContain(' https://example.com/raw')
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
    ['off', false, 3],
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
  expect(w.last()).toBe('Usage: /adhd-reader [on | off | toggle | status | 1-5]')
})

test('invalid arguments show usage and change nothing', async ($, on) => {
  const w = world(on)
  await start($)
  await run($, '2')
  const before = { ...(w.store.settings as object) }
  for (const args of ['0', '6', '1.5', 'ac 3', '12', 'xyz', 'constructor', '-1']) {
    const count = w.toasts.length
    const result = await run($, args)
    expect(result.text).toBeUndefined()
    expect(w.store.settings).toEqual(before)
    expect(w.toasts.length).toBe(count + 1)
    expect(w.last()).toContain('Usage: /adhd-reader')
  }
})

// Band

test('band keeps the band beneath it, toggles and steps the level', async ($, on) => {
  const w = world(on)
  await start($)
  for (const surface of SURFACES) {
    const ui = await band($, surface)
    expect(await ui.find({ text: 'other band' })).toBeDefined()
    expect((await ui.find({ key: 'toggle' }))?.props.hotkey).toBe('t')
    expect((await ui.find({ key: 'less' }))?.props.hotkey).toBe('l')
    expect((await ui.find({ key: 'more' }))?.props.hotkey).toBe('m')
    await ui.press({ key: 'toggle' })
    expect((await ui.find({ key: 'toggle' }))?.text).toBe('ADHD Reader: Off')
    expect(w.store.settings).toEqual({ enabled: false, level: 3 })
    await ui.press({ key: 'toggle' })
    await ui.press({ key: 'more' })
    expect((await ui.find({ key: 'level' }))?.text).toBe('Strong 4/5')
    await ui.press({ key: 'less' })
    expect((await ui.find({ key: 'level' }))?.text).toBe('Medium 3/5')
    expect(await ui.find({ text: 'other band' })).toBeDefined()
    await ui.unmount()
  }
})

test('band hides Less at 1 and More at 5; preview follows the level', async ($, on) => {
  world(on)
  await start($)
  for (const surface of SURFACES) {
    await run($, '1')
    let ui = await band($, surface)
    expect(await ui.find({ key: 'less' })).toBeUndefined()
    expect(await ui.find({ key: 'more' })).toBeDefined()
    const light = (await ui.find({ key: 'preview' }))?.text
    expect(light).toBe('Reading')
    await ui.unmount()
    await run($, '5')
    ui = await band($, surface)
    expect(await ui.find({ key: 'more' })).toBeUndefined()
    expect(await ui.find({ key: 'less' })).toBeDefined()
    expect((await ui.find({ key: 'level' }))?.text).toBe('Strongest 5/5')
    expect(await ui.find({ key: 'preview' })).toBeDefined()
    await ui.unmount()
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

test('band shortens on narrow widths', async ($, on) => {
  world(on)
  await start($)
  for (const surface of SURFACES) {
    let ui = await band($, surface, { bodyColumns: 48 })
    expect((await ui.find({ key: 'level' }))?.text).toBe('3/5')
    expect(await ui.find({ key: 'less' })).toBeDefined()
    expect(await ui.find({ key: 'preview' })).toBeUndefined()
    await ui.unmount()
    ui = await band($, surface, { bodyColumns: 20, maxRows: 1 })
    expect(await ui.find({ key: 'toggle' })).toBeDefined()
    expect(await ui.find({ key: 'less' })).toBeUndefined()
    expect(await ui.find({ key: 'more' })).toBeUndefined()
    await ui.unmount()
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
    expect((await ui.find({ key: 'level' }))?.text).toBe('Light+ 2/5')
    await ui.unmount()
  }
})

test('corrupt stored settings fall back field by field', async ($, on) => {
  const store: Record<string, unknown> = {}
  const w = world(on, { store })
  const cases: [unknown, string][] = [
    [{ enabled: true, level: 99 }, 'ADHD Reader on: Medium (3/5)'],
    [{ enabled: 'no', level: 2 }, 'ADHD Reader on: Light+ (2/5)'],
    [{ enabled: false, level: 2.5 }, 'ADHD Reader off'],
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
  expect(w.toasts).toHaveLength(1)
  expect(store.introSeen).toBe(true)
  await start($)
  expect(w.toasts).toHaveLength(1)
})
