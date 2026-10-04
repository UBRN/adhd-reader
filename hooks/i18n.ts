// Interface strings and language detection. English is the default and the
// reference table; every other table must have exactly the same keys.

const en = {
  on: 'On',
  off: 'Off',
  less: 'Less',
  more: 'More',
  level1: 'Light',
  level2: 'Light+',
  level3: 'Medium',
  level4: 'Strong',
  level5: 'Strongest',
  previewWord: 'Reading',
  toastOn: 'ADHD Reader on: {level} ({n}/5)',
  toastOff: 'ADHD Reader off',
  usage: 'Usage: /{cmd} [on | off | toggle | status | 1-5]',
  description: 'Turn ADHD Reader on or off, or set its intensity',
  argumentHint: '[on | off | 1-5]',
  intro: 'ADHD Reader bolds the first letters of each word in replies. Change it from the band above the prompt or with /{cmd}.',
  languageLabel: 'Language',
  languageHelp: 'Language of the ADHD Reader labels and messages. Auto uses English.',
  showBandLabel: 'Show band',
  showBandHelp: 'Show the ADHD Reader controls above the prompt.',
} as const

export type Messages = { readonly [K in keyof typeof en]: string }

const tr: Messages = {
  on: 'Açık',
  off: 'Kapalı',
  less: 'Azalt',
  more: 'Artır',
  level1: 'Hafif',
  level2: 'Hafif+',
  level3: 'Orta',
  level4: 'Güçlü',
  level5: 'En güçlü',
  previewWord: 'Okuma',
  toastOn: 'ADHD Reader açık: {level} ({n}/5)',
  toastOff: 'ADHD Reader kapalı',
  usage: 'Kullanım: /{cmd} [aç | kapat | değiştir | durum | 1-5]',
  description: "ADHD Reader'ı aç/kapat ya da yoğunluğu ayarla",
  argumentHint: '[aç | kapat | 1-5]',
  intro: 'ADHD Reader yanıtlardaki her kelimenin ilk harflerini kalın yazar. Giriş alanının üstündeki banttan ya da /{cmd} ile değiştirebilirsin.',
  languageLabel: 'Dil',
  languageHelp: 'ADHD Reader etiketlerinin ve mesajlarının dili. Auto, ayarlarını izler.',
  showBandLabel: 'Bandı göster',
  showBandHelp: 'ADHD Reader denetimlerini giriş alanının üstünde göster.',
}

const es: Messages = {
  on: 'Activado',
  off: 'Desactivado',
  less: 'Menos',
  more: 'Más',
  level1: 'Suave',
  level2: 'Suave+',
  level3: 'Medio',
  level4: 'Fuerte',
  level5: 'Máximo',
  previewWord: 'Lectura',
  toastOn: 'ADHD Reader activado: {level} ({n}/5)',
  toastOff: 'ADHD Reader desactivado',
  usage: 'Uso: /{cmd} [activar | desactivar | alternar | estado | 1-5]',
  description: 'Activa o desactiva ADHD Reader, o ajusta su intensidad',
  argumentHint: '[activar | desactivar | 1-5]',
  intro: 'ADHD Reader pone en negrita las primeras letras de cada palabra en las respuestas. Ajústalo desde la barra sobre el campo de texto o con /{cmd}.',
  languageLabel: 'Idioma',
  languageHelp: 'Idioma de las etiquetas y mensajes de ADHD Reader. Auto sigue tu configuración.',
  showBandLabel: 'Mostrar barra',
  showBandHelp: 'Muestra los controles de ADHD Reader sobre el campo de texto.',
}

const ptBR: Messages = {
  on: 'Ligado',
  off: 'Desligado',
  less: 'Menos',
  more: 'Mais',
  level1: 'Leve',
  level2: 'Leve+',
  level3: 'Médio',
  level4: 'Forte',
  level5: 'Máximo',
  previewWord: 'Leitura',
  toastOn: 'ADHD Reader ligado: {level} ({n}/5)',
  toastOff: 'ADHD Reader desligado',
  usage: 'Uso: /{cmd} [ligar | desligar | alternar | status | 1-5]',
  description: 'Liga ou desliga o ADHD Reader, ou ajusta a intensidade',
  argumentHint: '[ligar | desligar | 1-5]',
  intro: 'O ADHD Reader deixa em negrito as primeiras letras de cada palavra nas respostas. Ajuste pela barra acima do campo de texto ou com /{cmd}.',
  languageLabel: 'Idioma',
  languageHelp: 'Idioma dos rótulos e mensagens do ADHD Reader. Auto segue suas configurações.',
  showBandLabel: 'Mostrar barra',
  showBandHelp: 'Mostra os controles do ADHD Reader acima do campo de texto.',
}

const de: Messages = {
  on: 'An',
  off: 'Aus',
  less: 'Weniger',
  more: 'Mehr',
  level1: 'Leicht',
  level2: 'Leicht+',
  level3: 'Mittel',
  level4: 'Stark',
  level5: 'Sehr stark',
  previewWord: 'Lesen',
  toastOn: 'ADHD Reader an: {level} ({n}/5)',
  toastOff: 'ADHD Reader aus',
  usage: 'Verwendung: /{cmd} [an | aus | umschalten | status | 1-5]',
  description: 'ADHD Reader ein- oder ausschalten oder die Stärke einstellen',
  argumentHint: '[an | aus | 1-5]',
  intro: 'ADHD Reader setzt die ersten Buchstaben jedes Wortes in Antworten fett. Ändern über die Leiste über dem Eingabefeld oder mit /{cmd}.',
  languageLabel: 'Sprache',
  languageHelp: 'Sprache der Beschriftungen und Meldungen von ADHD Reader. Auto folgt deinen Einstellungen.',
  showBandLabel: 'Leiste anzeigen',
  showBandHelp: 'Zeigt die Steuerung von ADHD Reader über dem Eingabefeld.',
}

const fr: Messages = {
  on: 'Activé',
  off: 'Désactivé',
  less: 'Moins',
  more: 'Plus',
  level1: 'Léger',
  level2: 'Léger+',
  level3: 'Moyen',
  level4: 'Fort',
  level5: 'Maximal',
  previewWord: 'Lecture',
  toastOn: 'ADHD Reader activé\u00a0: {level} ({n}/5)',
  toastOff: 'ADHD Reader désactivé',
  usage: 'Utilisation\u00a0: /{cmd} [activer | désactiver | basculer | statut | 1-5]',
  description: "Activer ou désactiver ADHD Reader, ou régler son intensité",
  argumentHint: '[activer | désactiver | 1-5]',
  intro: "ADHD Reader met en gras les premières lettres de chaque mot dans les réponses. Réglez-le depuis la barre au-dessus du champ de saisie ou avec /{cmd}.",
  languageLabel: 'Langue',
  languageHelp: "Langue des libellés et des messages d'ADHD Reader. Auto suit vos paramètres.",
  showBandLabel: 'Afficher la barre',
  showBandHelp: "Affiche les commandes d'ADHD Reader au-dessus du champ de saisie.",
}

const ru: Messages = {
  on: 'Вкл',
  off: 'Выкл',
  less: 'Меньше',
  more: 'Больше',
  level1: 'Слабо',
  level2: 'Слабо+',
  level3: 'Средне',
  level4: 'Сильно',
  level5: 'Максимум',
  previewWord: 'Чтение',
  toastOn: 'ADHD Reader включён: {level} ({n}/5)',
  toastOff: 'ADHD Reader выключен',
  usage: 'Использование: /{cmd} [вкл | выкл | переключить | статус | 1-5]',
  description: 'Включить или выключить ADHD Reader либо настроить интенсивность',
  argumentHint: '[вкл | выкл | 1-5]',
  intro: 'ADHD Reader выделяет жирным первые буквы каждого слова в ответах. Настройте его на панели над полем ввода или командой /{cmd}.',
  languageLabel: 'Язык',
  languageHelp: 'Язык надписей и сообщений ADHD Reader. Auto следует вашим настройкам.',
  showBandLabel: 'Показывать панель',
  showBandHelp: 'Показывает элементы управления ADHD Reader над полем ввода.',
}

// Bolding has no effect on Japanese or Chinese text, so the preview word
// stays Latin in these two tables.
const ja: Messages = {
  on: 'オン',
  off: 'オフ',
  less: '弱く',
  more: '強く',
  level1: '弱',
  level2: '弱+',
  level3: '中',
  level4: '強',
  level5: '最強',
  previewWord: 'Reading',
  toastOn: 'ADHD Reader オン: {level} ({n}/5)',
  toastOff: 'ADHD Reader オフ',
  usage: '使い方: /{cmd} [オン | オフ | 切替 | 状態 | 1-5]',
  description: 'ADHD Reader をオン/オフするか、強さを設定します',
  argumentHint: '[オン | オフ | 1-5]',
  intro: 'ADHD Reader は返信に含まれる各単語の最初の数文字を太字にします (日本語と中国語の文章には適用されません)。入力欄の上のバーか /{cmd} で変更できます。',
  languageLabel: '言語',
  languageHelp: 'ADHD Reader のラベルとメッセージの言語。Auto は設定に従います。',
  showBandLabel: 'バーを表示',
  showBandHelp: '入力欄の上に ADHD Reader の操作バーを表示します。',
}

const zhHans: Messages = {
  on: '开',
  off: '关',
  less: '减弱',
  more: '增强',
  level1: '轻',
  level2: '轻+',
  level3: '中',
  level4: '强',
  level5: '最强',
  previewWord: 'Reading',
  toastOn: 'ADHD Reader 已开启：{level}（{n}/5）',
  toastOff: 'ADHD Reader 已关闭',
  usage: '用法：/{cmd} [开 | 关 | 切换 | 状态 | 1-5]',
  description: '开启或关闭 ADHD Reader，或调整强度',
  argumentHint: '[开 | 关 | 1-5]',
  intro: 'ADHD Reader 会将回复中每个单词的前几个字母加粗（对中文和日文文本无效）。可在输入框上方的控制栏或用 /{cmd} 调整。',
  languageLabel: '语言',
  languageHelp: 'ADHD Reader 标签和消息的语言。Auto 跟随你的设置。',
  showBandLabel: '显示控制栏',
  showBandHelp: '在输入框上方显示 ADHD Reader 控制栏。',
}

export const MESSAGES = { en, tr, es, 'pt-BR': ptBR, de, fr, ru, ja, 'zh-Hans': zhHans } as const satisfies Record<
  string,
  Messages
>
export type Lang = keyof typeof MESSAGES

export const messages = (lang: Lang): Messages => ({ ...en, ...MESSAGES[lang] })

export const fmt = (text: string, vars: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (all, name: string) => (name in vars ? String(vars[name]) : all))

// Lowercase, accents and other combining marks removed, dotless i folded.
export const normalize = (text: string) =>
  text.normalize('NFD').replace(/\p{M}+/gu, '').replace(/ı/g, 'i').toLowerCase().trim()

// A locale tag such as `pt-BR`, `zh_CN` or `tr`.
export function fromLocale(tag: string): Lang | undefined {
  const match = /^([a-z]{2,3})(?:[_-]([a-z]{2,4}))?/i.exec(tag.trim())
  if (!match) return undefined
  const base = match[1].toLowerCase()
  const region = (match[2] ?? '').toLowerCase()
  if (base === 'pt') return 'pt-BR'
  if (base === 'zh') return ['tw', 'hk', 'mo', 'hant'].includes(region) ? undefined : 'zh-Hans'
  return base in MESSAGES ? (base as Lang) : undefined
}

// Free text, matched on whole words after `normalize`: language names in
// English and in the language itself ("turkish", "Turkce", "Espanol").
const NAMES: readonly (readonly [RegExp, Lang])[] = [
  [/\b(english|englisch|ingles|anglais)\b/, 'en'],
  [/\b(turk|turkish|turkce|turkiye)\b/, 'tr'],
  [/\b(spanish|espanol|castellano)\b/, 'es'],
  [/\b(portuguese|portugues|brasil|brazil|brazilian)\b/, 'pt-BR'],
  [/\b(german|deutsch)\b/, 'de'],
  [/\b(french|francais)\b/, 'fr'],
  [/\brussian\b|русск/, 'ru'],
  [/\b(japanese|nihongo)\b|日本/, 'ja'],
  [/\b(chinese|mandarin)\b|中文|汉语|普通话/, 'zh-Hans'],
]

// A language from free text (a name or a code), or undefined for Auto, empty
// and anything unknown.
export function fromName(text: unknown): Lang | undefined {
  if (typeof text !== 'string') return undefined
  const name = normalize(text)
  if (!name || /traditional|繁/.test(name)) return undefined
  const found = NAMES.find(([pattern]) => pattern.test(name))
  return found ? found[1] : fromLocale(name.length <= 10 ? name : '')
}

