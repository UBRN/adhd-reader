// Interface strings and language detection. English is the default and the
// reference table; every other table must have exactly the same keys.

const en = {
  level1: 'Light',
  level2: 'Light+',
  level3: 'Medium',
  level4: 'Strong',
  level5: 'Strongest',
  preview: 'Easier reading',
  toastOn: 'ADHD Reader on: {level} ({n}/5)',
  toastOff: 'ADHD Reader off. /{cmd} turns it back on.',
  usage: 'Usage: /{cmd} [on | off | toggle | status | help | 1-5]',
  invalid: '"{arg}" is not an option. Levels are 1 (light) to 5 (strongest).',
  help: "Band above the prompt: click it, or press ctrl+x then Tab; Tab moves, Enter presses, Esc goes back. [x] switches ADHD Reader on or off, - and + set the level, and a new level also switches it on. On screen only: the saved conversation and what the model reads stay plain.",
  description: 'Turn ADHD Reader on or off, or set its intensity',
  argumentHint: '[on | off | 1-5 | help]',
  intro: "ADHD Reader bolds the start of each word in Claude's replies, on screen only: the saved conversation and what the model reads stay plain. To use the band above the prompt, click it, or press ctrl+x then Tab; Tab moves, Enter presses, Esc goes back. /{cmd} help shows this again.",
  languageLabel: 'Language',
  languageHelp: 'Language of the ADHD Reader labels and messages. Auto uses English.',
  showBandLabel: 'Show band',
  showBandHelp: 'Show the ADHD Reader controls above the prompt.',
} as const

export type Messages = { readonly [K in keyof typeof en]: string }

const tr: Messages = {
  level1: 'Hafif',
  level2: 'Hafif+',
  level3: 'Orta',
  level4: 'Güçlü',
  level5: 'En güçlü',
  preview: 'Okuma kolaylığı',
  toastOn: 'ADHD Reader açık: {level} ({n}/5)',
  toastOff: 'ADHD Reader kapalı. /{cmd} yeniden açar.',
  usage: 'Kullanım: /{cmd} [aç | kapat | değiştir | durum | yardım | 1-5]',
  invalid: '"{arg}" geçerli bir seçenek değil. Seviyeler 1 (hafif) ile 5 (en güçlü) arası.',
  help: "Giriş alanının üstündeki bant: ona tıkla ya da ctrl+x, ardından Tab'e bas; Tab ile ilerle, Enter ile seç, Esc ile dön. [x] ADHD Reader'ı açar ya da kapatır, - ve + seviyeyi ayarlar; seviye değişince ADHD Reader da açılır. Yalnız ekrandaki görünüm değişir; kaydedilen konuşma ve modelin okuduğu metin aynı kalır.",
  description: "ADHD Reader'ı aç/kapat ya da yoğunluğu ayarla",
  argumentHint: '[aç | kapat | 1-5 | yardım]',
  intro: "ADHD Reader, Claude'un yanıtlarında her kelimenin başını kalın yazar. Yalnız ekrandaki görünüm değişir; kaydedilen konuşma ve modelin okuduğu metin aynı kalır. Giriş alanının üstündeki bandı kullanmak için ona tıkla ya da ctrl+x, ardından Tab'e bas; Tab ile ilerle, Enter ile seç, Esc ile dön. /{cmd} yardım bunu yeniden gösterir.",
  languageLabel: 'Dil',
  languageHelp: 'ADHD Reader etiketlerinin ve mesajlarının dili. Auto, İngilizce kullanır.',
  showBandLabel: 'Bandı göster',
  showBandHelp: 'ADHD Reader denetimlerini giriş alanının üstünde göster.',
}

const es: Messages = {
  level1: 'Suave',
  level2: 'Suave+',
  level3: 'Medio',
  level4: 'Fuerte',
  level5: 'Máximo',
  preview: 'Lectura cómoda',
  toastOn: 'ADHD Reader activado: {level} ({n}/5)',
  toastOff: 'ADHD Reader desactivado. /{cmd} lo vuelve a activar.',
  usage: 'Uso: /{cmd} [activar | desactivar | alternar | estado | ayuda | 1-5]',
  invalid: '"{arg}" no es una opción válida. Los niveles van de 1 (suave) a 5 (máximo).',
  help: 'Barra sobre el campo de texto: haz clic en ella o pulsa ctrl+x y luego Tab; Tab avanza, Enter pulsa, Esc vuelve. [x] activa o desactiva ADHD Reader, - y + ajustan el nivel, y cambiar el nivel también lo activa. Solo en pantalla: la conversación guardada y lo que lee el modelo no cambian.',
  description: 'Activa o desactiva ADHD Reader, o ajusta su intensidad',
  argumentHint: '[activar | desactivar | 1-5 | ayuda]',
  intro: 'ADHD Reader pone en negrita el comienzo de cada palabra en las respuestas de Claude, solo en pantalla: la conversación guardada y lo que lee el modelo no cambian. Para usar la barra sobre el campo de texto, haz clic en ella o pulsa ctrl+x y luego Tab; Tab avanza, Enter pulsa, Esc vuelve. /{cmd} ayuda lo muestra de nuevo.',
  languageLabel: 'Idioma',
  languageHelp: 'Idioma de las etiquetas y mensajes de ADHD Reader. Auto usa inglés.',
  showBandLabel: 'Mostrar barra',
  showBandHelp: 'Muestra los controles de ADHD Reader sobre el campo de texto.',
}

const ptBR: Messages = {
  level1: 'Leve',
  level2: 'Leve+',
  level3: 'Médio',
  level4: 'Forte',
  level5: 'Máximo',
  preview: 'Leitura fluida',
  toastOn: 'ADHD Reader ligado: {level} ({n}/5)',
  toastOff: 'ADHD Reader desligado. /{cmd} liga de novo.',
  usage: 'Uso: /{cmd} [ligar | desligar | alternar | status | ajuda | 1-5]',
  invalid: '"{arg}" não é uma opção válida. Os níveis vão de 1 (leve) a 5 (máximo).',
  help: 'Barra acima do campo de texto: clique nela ou pressione ctrl+x e depois Tab; Tab avança, Enter aciona, Esc volta. [x] liga ou desliga o ADHD Reader, - e + ajustam o nível, e mudar o nível também o liga. Só na tela: a conversa salva e o que o modelo lê não mudam.',
  description: 'Liga ou desliga o ADHD Reader, ou ajusta a intensidade',
  argumentHint: '[ligar | desligar | 1-5 | ajuda]',
  intro: 'O ADHD Reader deixa em negrito o início de cada palavra nas respostas do Claude, só na tela: a conversa salva e o que o modelo lê não mudam. Para usar a barra acima do campo de texto, clique nela ou pressione ctrl+x e depois Tab; Tab avança, Enter aciona, Esc volta. /{cmd} ajuda mostra isto de novo.',
  languageLabel: 'Idioma',
  languageHelp: 'Idioma dos rótulos e mensagens do ADHD Reader. Auto usa inglês.',
  showBandLabel: 'Mostrar barra',
  showBandHelp: 'Mostra os controles do ADHD Reader acima do campo de texto.',
}

const de: Messages = {
  level1: 'Leicht',
  level2: 'Leicht+',
  level3: 'Mittel',
  level4: 'Stark',
  level5: 'Sehr stark',
  preview: 'Leichter lesen',
  toastOn: 'ADHD Reader an: {level} ({n}/5)',
  toastOff: 'ADHD Reader aus. /{cmd} schaltet ihn wieder ein.',
  usage: 'Verwendung: /{cmd} [an | aus | umschalten | status | hilfe | 1-5]',
  invalid: '„{arg}“ ist keine gültige Angabe. Die Stufen gehen von 1 (leicht) bis 5 (sehr stark).',
  help: 'Leiste über dem Eingabefeld: anklicken oder ctrl+x und dann Tab drücken; Tab springt weiter, Enter löst aus, Esc kehrt zurück. [x] schaltet ADHD Reader ein oder aus, - und + stellen die Stufe ein, und eine neue Stufe schaltet ihn auch ein. Nur auf dem Bildschirm: Das gespeicherte Gespräch und was das Modell liest, bleiben unverändert.',
  description: 'ADHD Reader ein- oder ausschalten oder die Stärke einstellen',
  argumentHint: '[an | aus | 1-5 | hilfe]',
  intro: 'ADHD Reader setzt den Anfang jedes Wortes in Claudes Antworten fett, nur auf dem Bildschirm: Das gespeicherte Gespräch und was das Modell liest, bleiben unverändert. Zur Leiste über dem Eingabefeld: anklicken oder ctrl+x und dann Tab drücken; Tab springt weiter, Enter löst aus, Esc kehrt zurück. /{cmd} hilfe zeigt das erneut.',
  languageLabel: 'Sprache',
  languageHelp: 'Sprache der Beschriftungen und Meldungen von ADHD Reader. Auto verwendet Englisch.',
  showBandLabel: 'Leiste anzeigen',
  showBandHelp: 'Zeigt die Steuerung von ADHD Reader über dem Eingabefeld.',
}

// French uses a no-break space before : ; and inside « ».
const fr: Messages = {
  level1: 'Léger',
  level2: 'Léger+',
  level3: 'Moyen',
  level4: 'Fort',
  level5: 'Maximal',
  preview: 'Lecture facile',
  toastOn: 'ADHD Reader activé : {level} ({n}/5)',
  toastOff: 'ADHD Reader désactivé. /{cmd} le réactive.',
  usage: 'Utilisation : /{cmd} [activer | désactiver | basculer | statut | aide | 1-5]',
  invalid: "« {arg} » n'est pas une option valide. Les niveaux vont de 1 (léger) à 5 (maximal).",
  help: "Barre au-dessus du champ de saisie : cliquez dessus ou appuyez sur ctrl+x puis Tab ; Tab avance, Entrée valide, Échap revient. [x] active ou désactive ADHD Reader, - et + règlent le niveau, et changer de niveau l'active aussi. À l'écran seulement : la conversation enregistrée et ce que lit le modèle ne changent pas.",
  description: 'Active ou désactive ADHD Reader, ou règle son intensité',
  argumentHint: '[activer | désactiver | 1-5 | aide]',
  intro: "ADHD Reader met en gras le début de chaque mot dans les réponses de Claude, à l'écran seulement : la conversation enregistrée et ce que lit le modèle ne changent pas. Pour utiliser la barre au-dessus du champ de saisie, cliquez dessus ou appuyez sur ctrl+x puis Tab ; Tab avance, Entrée valide, Échap revient. /{cmd} aide l'affiche à nouveau.",
  languageLabel: 'Langue',
  languageHelp: "Langue des libellés et des messages d'ADHD Reader. Auto utilise l'anglais.",
  showBandLabel: 'Afficher la barre',
  showBandHelp: "Affiche les commandes d'ADHD Reader au-dessus du champ de saisie.",
}

const ru: Messages = {
  level1: 'Слабо',
  level2: 'Слабо+',
  level3: 'Средне',
  level4: 'Сильно',
  level5: 'Максимально',
  preview: 'Удобное чтение',
  toastOn: 'ADHD Reader включён: {level} ({n}/5)',
  toastOff: 'ADHD Reader выключен. /{cmd} включит его снова.',
  usage: 'Использование: /{cmd} [вкл | выкл | переключить | статус | помощь | 1-5]',
  invalid: '«{arg}» не подходит. Уровни: от 1 (слабо) до 5 (максимально).',
  help: 'Панель над полем ввода: щёлкните по ней или нажмите ctrl+x, затем Tab; Tab переходит дальше, Enter нажимает, Esc возвращает. [x] включает и выключает ADHD Reader, - и + меняют уровень, а смена уровня также включает его. Только на экране: сохранённый диалог и то, что читает модель, не меняются.',
  description: 'Включить или выключить ADHD Reader либо настроить интенсивность',
  argumentHint: '[вкл | выкл | 1-5 | помощь]',
  intro: 'ADHD Reader выделяет жирным начало каждого слова в ответах Claude, только на экране: сохранённый диалог и то, что читает модель, не меняются. Чтобы управлять панелью над полем ввода, щёлкните по ней или нажмите ctrl+x, затем Tab; Tab переходит дальше, Enter нажимает, Esc возвращает. /{cmd} помощь покажет это снова.',
  languageLabel: 'Язык',
  languageHelp: 'Язык надписей и сообщений ADHD Reader. Auto использует английский.',
  showBandLabel: 'Показывать панель',
  showBandHelp: 'Показывает элементы управления ADHD Reader над полем ввода.',
}

// Bolding has no effect on Japanese or Chinese text: it reaches only the
// words written with spaces between them (English terms, names), so the
// preview in these two tables is English.
const ja: Messages = {
  level1: '弱',
  level2: '弱+',
  level3: '中',
  level4: '強',
  level5: '最強',
  preview: 'Easier reading',
  toastOn: 'ADHD Reader オン: {level} ({n}/5)',
  toastOff: 'ADHD Reader オフ。/{cmd} でまたオンにできます。',
  usage: '使い方: /{cmd} [オン | オフ | 切替 | 状態 | ヘルプ | 1-5]',
  invalid: '「{arg}」は使えません。強さは 1 (弱) から 5 (最強) です。',
  help: '入力欄の上のバー: クリックするか、ctrl+x のあと Tab を押します (Tab で移動、Enter で決定、Esc で戻る)。[x] でオン/オフ、- と + で強さを変えます。強さを変えるとオンになります。画面上の表示だけが変わり、保存される会話とモデルが読む内容はそのままです。日本語と中国語の文章には適用されません。',
  description: 'ADHD Reader をオン/オフするか、強さを設定します',
  argumentHint: '[オン | オフ | 1-5 | ヘルプ]',
  intro: 'ADHD Reader は Claude の返信で各単語の先頭を太字にします。画面上の表示だけが変わり、保存される会話とモデルが読む内容はそのままです。日本語と中国語の文章には適用されません。入力欄の上のバーは、クリックするか ctrl+x のあと Tab で操作できます (Tab で移動、Enter で決定、Esc で戻る)。/{cmd} ヘルプ でもう一度表示します。',
  languageLabel: '言語',
  languageHelp: 'ADHD Reader のラベルとメッセージの言語。Auto は英語を使います。',
  showBandLabel: 'バーを表示',
  showBandHelp: '入力欄の上に ADHD Reader の操作バーを表示します。',
}

const zhHans: Messages = {
  level1: '轻',
  level2: '轻+',
  level3: '中',
  level4: '强',
  level5: '最强',
  preview: 'Easier reading',
  toastOn: 'ADHD Reader 已开启：{level}（{n}/5）',
  toastOff: 'ADHD Reader 已关闭。用 /{cmd} 可重新开启。',
  usage: '用法：/{cmd} [开 | 关 | 切换 | 状态 | 帮助 | 1-5]',
  invalid: '“{arg}”不是有效选项。强度为 1（轻）到 5（最强）。',
  help: '输入框上方的控制栏：点击它，或按 ctrl+x 再按 Tab（Tab 移动，Enter 确认，Esc 返回）。[x] 开启或关闭 ADHD Reader，- 和 + 调整强度，调整强度时也会开启。只改变屏幕显示，保存的对话和模型读取的内容不变。对中文和日文文本无效。',
  description: '开启或关闭 ADHD Reader，或调整强度',
  argumentHint: '[开 | 关 | 1-5 | 帮助]',
  intro: 'ADHD Reader 会把 Claude 回复中每个单词的开头加粗，只改变屏幕显示，保存的对话和模型读取的内容不变。对中文和日文文本无效。点击输入框上方的控制栏，或按 ctrl+x 再按 Tab 即可操作（Tab 移动，Enter 确认，Esc 返回）。/{cmd} 帮助 可再次查看本说明。',
  languageLabel: '语言',
  languageHelp: 'ADHD Reader 标签和消息的语言。Auto 使用英语。',
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

const WIDE = /[\p{scx=Han}\p{scx=Hiragana}\p{scx=Katakana}\p{scx=Hangul}　-〿！-｠￠-￦]/u

// Terminal cells a text takes: East Asian wide characters two, combining marks none.
export const cells = (text: string) =>
  [...text.replace(/\p{M}/gu, '')].reduce((sum, char) => sum + (WIDE.test(char) ? 2 : 1), 0)

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

