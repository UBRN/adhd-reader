// Bolds the first letters of each word in markdown and leaves the markdown
// reading as it did: code, links and their destinations, URLs, HTML, math,
// technical tokens (paths, identifiers, versions, flags), existing emphasis and
// scripts written without spaces between words stay as they are. The output is
// the input plus whole `**` pairs, and bolding it again changes nothing.
//
// A block pass reads the lines the way a CommonMark reader does and yields the
// inline scopes: paragraphs, headings and tables. An inline pass then marks what
// each scope must keep as written and bolds the words that are left. Bold only
// goes around a word bounded by whitespace or punctuation, so each new pair can
// only ever match itself.

const DEFAULT_LEVEL = 3
// Share of a word to bold and the longest bold run in graphemes, per level.
const RATIO = [0.3, 0.4, 0.5, 0.6, 0.7]
const MAX_BOLD = [4, 5, 5, 6, 6]
// Bold graphemes for words of one to four graphemes, per level.
const SHORT_BOLD = [
  [1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1],
  [1, 1, 1, 1, 2],
  [1, 1, 2, 2, 3],
]

// The engine drops a rewritten message above 1e5 characters; stay below it.
const MAX_OUTPUT = 95_000
const CACHE_ENTRIES = 64
const CACHE_CHARS = 1_200_000

// Results of the scanners that look for the end of a construct.
const NONE = -1
const CUT = -2 // the construct is still open where the text ends

const TAB = 9
const NEWLINE = 10
const SPACE = 32
const BANG = 33
const DOLLAR = 36
const AMPERSAND = 38
const OPEN_PAREN = 40
const CLOSE_PAREN = 41
const STAR = 42
const DASH = 45
const LESS = 60
const GREATER = 62
const OPEN_BRACKET = 91
const BACKSLASH = 92
const CLOSE_BRACKET = 93
const CARET = 94
const UNDERSCORE = 95
const BACKTICK = 96
const PIPE = 124

// ---------------------------------------------------------------- characters

const isAsciiLetter = (c: number) => (c | 32) >= 97 && (c | 32) <= 122
const isDigit = (c: number) => c >= 48 && c <= 57
const isAsciiPunctuation = (c: number) =>
  (c >= 33 && c <= 47) || (c >= 58 && c <= 64) || (c >= 91 && c <= 96) || (c >= 123 && c <= 126)
const isSpace = (c: number) => c === SPACE || (c >= TAB && c <= 13)

const WHITESPACE = /^[\t\n\f\r \p{Zs}]$/u
const PUNCTUATION = /^[\p{P}\p{S}]$/u

/** 0 for whitespace or the edge of the text, 1 for punctuation or a symbol, 2 otherwise. */
function charClass(ch: string): 0 | 1 | 2 {
  if (ch === '' || WHITESPACE.test(ch)) return 0
  return PUNCTUATION.test(ch) ? 1 : 2
}

function charBefore(s: string, i: number): string {
  if (i <= 0) return ''
  const low = s.charCodeAt(i - 1)
  return low >= 0xdc00 && low <= 0xdfff && i >= 2 ? String.fromCodePoint(s.codePointAt(i - 2)!) : s[i - 1]!
}

function charFrom(s: string, i: number): string {
  return i < s.length ? String.fromCodePoint(s.codePointAt(i)!) : ''
}

// --------------------------------------------------------------------- blocks

/** [start, end) offsets in the text. */
type Span = [number, number]

interface Scope {
  /** One span per line; the scope reads as these lines joined by newlines. */
  lines: Span[]
  /** Index in `lines` of the first table row, or -1. */
  table: number
  /** Indexes in `lines` of lines kept as written. */
  held: number[]
  /** The scope may go on past its last line: a construct left open runs to its end. */
  open: boolean
}

type Container = { quote: true } | { quote: false; indent: number; empty: boolean }

type Leaf =
  | { kind: 'paragraph'; lines: Span[]; table: number; held: number[] }
  | { kind: 'fence'; marker: string; length: number }
  // HTML and the like: kept as written up to a line matching `end`, or a blank line.
  | { kind: 'raw'; end: RegExp | null }
  | { kind: 'math' }

const ATX_HEADING = /^#{1,6}(?:[ \t]|$)/
const SETEXT_UNDERLINE = /^(?:=+|-+)[ \t]*$/
const THEMATIC_BREAK = /^([-*_])(?:[ \t]*\1){2,}[ \t]*$/
const FENCE = /^(`{3,}|~{3,})(.*)$/
const FENCE_CLOSE = /^(`{3,}|~{3,})[ \t]*$/
const LIST_MARKER = /(?:[-+*]|(\d{1,9})[.)])(?= |$)/y
const DELIMITER_ROW = /^\|?[ \t]*:?-+:?[ \t]*(?:\|[ \t]*:?-+:?[ \t]*)*\|?[ \t]*$/
const BLOCK_TAGS =
  'address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|' +
  'fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|' +
  'menuitem|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul'
const ATTRIBUTE = String.raw`\s+[A-Za-z_:][\w.:-]*(?:\s*=\s*(?:[^\s"'=<>\x60]+|'[^']*'|"[^"]*"))?`
const OPEN_TAG = String.raw`<[A-Za-z][A-Za-z0-9-]*(?:${ATTRIBUTE})*\s*\/?>`
const CLOSING_TAG = String.raw`<\/[A-Za-z][A-Za-z0-9-]*\s*>`
// The CommonMark HTML block starts, each with what ends it (null: a blank line).
const HTML_BLOCKS: Array<[start: RegExp, end: RegExp | null]> = [
  [/^<(?:script|pre|style|textarea)(?:\s|>|$)/i, /<\/(?:script|pre|style|textarea)>/i],
  [/^<!--/, /-->/],
  [/^<\?/, /\?>/],
  [/^<![A-Za-z]/, />/],
  [/^<!\[CDATA\[/, /\]\]>/],
  [new RegExp(`^<\\/?(?:${BLOCK_TAGS})(?:\\s|\\/?>|$)`, 'i'), null],
  [new RegExp(`^(?:${OPEN_TAG}|${CLOSING_TAG})\\s*$`), null],
]
// A lone tag line starts an HTML block, but CommonMark does not let it end a paragraph.
const LONE_TAG = HTML_BLOCKS.length - 1
const RAW_UNTIL_BLANK: Leaf = { kind: 'raw', end: null }
// A link reference definition, its destination read as loosely as marked reads it.
const DEFINITION = new RegExp(
  String.raw`\[((?:[^\\\[\]]|\\[\s\S]){1,999})\]:[ \t]*(?:\r?\n)?[ \t]*(?:<[^\r\n]*?>|[^\s<]\S*)` +
    String.raw`(?:(?:[ \t]+|[ \t]*\r?\n[ \t]*)("(?:[^"\\]|\\[\s\S])*"|'(?:[^'\\]|\\[\s\S])*'|\((?:[^()\\]|\\[\s\S])*\)))?` +
    String.raw`[ \t]*(?:\r?\n|$)`,
  'y',
)
const BLANK_LINE = /\n[ \t]*\r?\n/
// marked takes a line after a definition that opens with a quote or a parenthesis for its title.
const LOOSE_TITLE = /[ \t]*["'(][^\r\n]*(?:\r?\n|$)/y
// A definition, a footnote definition, or one still being written.
const DEFINITION_LIKE = /^\[(?:[^\\\]]|\\.)+\]:/
const LABELS = /^[ \t>]*(?:(?:[-+*]|\d{1,9}[.)])[ \t]+)*\[((?:[^\\\]\n]|\\.)+)\]:/gm

function readBlocks(text: string): { scopes: Scope[]; labels: Set<string> } {
  const reader = new BlockReader(text)
  reader.read()
  // Every label that might be defined, wherever a reader might find its definition.
  const labels = new Set(Array.from(text.matchAll(LABELS), label => normalizeLabel(label[1]!)))
  return { scopes: reader.scopes, labels }
}

class BlockReader {
  readonly scopes: Scope[] = []
  private readonly text: string
  private readonly containers: Container[] = []
  private leaf: Leaf | null = null
  /** Lines starting before this offset belong to a definition already read. */
  private skipUntil = 0

  constructor(text: string) {
    this.text = text
  }

  read(): void {
    const lines = this.text.split('\n')
    // A newline at the very end opens a line that has nothing in it yet.
    if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop()
    let start = 0
    let end = 0
    for (const line of lines) {
      end = start + line.length - (line.endsWith('\r') ? 1 : 0)
      if (start >= this.skipUntil) this.readLine(start, end)
      start += line.length + 1
    }
    this.endParagraph()
    const last = this.scopes[this.scopes.length - 1]
    if (last && last.lines[last.lines.length - 1]![1] === end) last.open = true
  }

  private readLine(start: number, end: number): void {
    const { line, source } = expandTabs(this.text.slice(start, end))
    let pos = 0
    let matched = 0
    for (; matched < this.containers.length; matched++) {
      const next = enter(this.containers[matched]!, line, pos)
      if (next === NONE) break
      pos = next
    }
    const continued = matched === this.containers.length
    const contentFrom = (at: number): Span => [start + source(at + indentWidth(line, at)), end]
    const leaf = this.leaf
    // A paragraph takes lazy continuation lines; marked lets raw HTML take them too.
    if (!continued && (leaf?.kind === 'raw' || leaf?.kind === 'paragraph') && isLazyContinuation(line, pos)) {
      const indent = indentWidth(line, pos)
      if (leaf.kind === 'raw' || this.paragraphTakes(leaf, line.slice(pos + indent), indent, contentFrom(pos))) return
    }
    if (leaf && leaf.kind !== 'paragraph') {
      if (continued && this.rawLeafTakes(leaf, line, pos)) return
      this.leaf = null
    }
    if (!continued) {
      this.endParagraph()
      this.containers.length = matched
    }
    pos = this.openContainers(line, pos)
    // marked counts a tab after a container's marker as four columns: indented code.
    const tabbed = pos > 0 && this.text.charCodeAt(start + source(pos)) === TAB
    this.readLeaf(line, pos, contentFrom(pos), tabbed)
  }

  /** Whether a fence, raw block or math block takes this line; it may end on it. */
  private rawLeafTakes(leaf: Exclude<Leaf, { kind: 'paragraph' }>, line: string, pos: number): boolean {
    const indent = indentWidth(line, pos)
    const body = line.slice(pos + indent)
    if (leaf.kind === 'fence') {
      const close = FENCE_CLOSE.exec(body)
      if (indent < 4 && close && close[1]![0] === leaf.marker && close[1]!.length >= leaf.length) this.leaf = null
      return true
    }
    if (leaf.kind === 'raw') {
      if (leaf.end ? leaf.end.test(body) : body === '') this.leaf = null
      return true
    }
    // Readers that know nothing of math still start a fence or HTML block here.
    if (indent < 4 && (openingFence(body) || htmlBlock(body) >= 0)) return false
    if (body.includes('$$')) this.leaf = null
    return true
  }

  private openContainers(line: string, pos: number): number {
    for (;;) {
      const indent = indentWidth(line, pos)
      if (indent >= 4) return pos
      const at = pos + indent
      if (line.charCodeAt(at) === GREATER) {
        this.endParagraph()
        this.containers.push({ quote: true })
        pos = at + 1 + (line.charCodeAt(at + 1) === SPACE ? 1 : 0)
        continue
      }
      const item = listItem(line, at, this.leaf?.kind === 'paragraph')
      if (!item) return pos
      this.endParagraph()
      this.containers.push({ quote: false, indent: indent + item.indent, empty: item.empty })
      pos = Math.min(line.length, at + item.indent)
    }
  }

  private readLeaf(line: string, pos: number, content: Span, tabbed: boolean): void {
    const spaces = indentWidth(line, pos)
    const indent = tabbed ? Math.max(4, spaces) : spaces
    const body = line.slice(pos + spaces)
    if (body === '') return this.endParagraph()
    const leaf = this.leaf
    if (leaf?.kind === 'paragraph') {
      if (this.paragraphTakes(leaf, body, indent, content)) return
      if (SETEXT_UNDERLINE.test(body)) return // the underline of a heading
    }
    if (indent >= 4) return // indented code
    const fence = openingFence(body)
    const html = htmlBlock(body)
    if (fence) this.leaf = { kind: 'fence', marker: fence[0]!, length: fence.length }
    else if (ATX_HEADING.test(body)) this.scopes.push({ lines: [content], table: -1, held: [], open: false })
    else if (THEMATIC_BREAK.test(body)) return
    else if (html >= 0) {
      const end = HTML_BLOCKS[html]![1]
      if (!end?.test(body.slice(2))) this.leaf = { kind: 'raw', end }
    } else if (body.startsWith('$$') && !body.includes('$$', 2)) this.leaf = { kind: 'math' }
    else if (!(DEFINITION_LIKE.test(body) && this.skipDefinition(content[0]))) {
      this.leaf = { kind: 'paragraph', lines: [], table: -1, held: [] }
      this.continueParagraph(this.leaf, body, content)
    }
  }

  /** Whether the open paragraph or table takes the line; when it does not, it ends. */
  private paragraphTakes(leaf: Extract<Leaf, { kind: 'paragraph' }>, body: string, indent: number, content: Span): boolean {
    const blockStart = indent < 4 && startsLeaf(body)
    if (leaf.table >= 0) {
      if (indent < 4 && !blockStart) {
        leaf.lines.push(content)
        return true
      }
    } else if (indent >= 4 || !(blockStart || SETEXT_UNDERLINE.test(body))) {
      if (indent < 4 && this.isTableStart(leaf.lines, body)) leaf.table = leaf.lines.length - 1
      this.continueParagraph(leaf, body, content)
      return true
    }
    this.endParagraph()
    return false
  }

  /** Skips the lines of a link reference definition at `at`, which may run over several. */
  private skipDefinition(at: number): boolean {
    DEFINITION.lastIndex = at
    const definition = DEFINITION.exec(this.text)
    if (!definition || !definition[1]!.trim() || BLANK_LINE.test(definition[0])) return false
    LOOSE_TITLE.lastIndex = DEFINITION.lastIndex
    this.skipUntil = !definition[2] && LOOSE_TITLE.test(this.text) ? LOOSE_TITLE.lastIndex : DEFINITION.lastIndex
    return true
  }

  /**
   * Adds a line to a paragraph. Some readers take a line that looks like a
   * definition for one, so it is kept as written. marked starts an HTML block at
   * a lone tag line where CommonMark reads on, so the text is kept as written up
   * to the next blank line, and the paragraph so far is read as one that may go on.
   */
  private continueParagraph(leaf: Extract<Leaf, { kind: 'paragraph' }>, body: string, content: Span): void {
    if (htmlBlock(body) === LONE_TAG) {
      this.endParagraph(true)
      this.leaf = RAW_UNTIL_BLANK
      return
    }
    if (DEFINITION_LIKE.test(body)) leaf.held.push(leaf.lines.length)
    leaf.lines.push(content)
  }

  private isTableStart(lines: Span[], row: string): boolean {
    if (!row.includes('|') || !DELIMITER_ROW.test(row)) return false
    const [start, end] = lines[lines.length - 1]!
    return cellCount(this.text.slice(start, end)) === cellCount(row)
  }

  private endParagraph(open = false): void {
    const leaf = this.leaf
    if (leaf?.kind !== 'paragraph') return
    this.leaf = null
    this.scopes.push({ lines: leaf.lines, table: leaf.table, held: leaf.held, open })
  }
}

/** The line with tabs expanded to tab stops of four, and where each of its positions came from. */
function expandTabs(text: string): { line: string; source: (pos: number) => number } {
  if (!text.includes('\t')) return { line: text, source: pos => pos }
  let line = ''
  const from: number[] = []
  for (let i = 0; i < text.length; i++) {
    const width = text[i] === '\t' ? 4 - (line.length % 4) : 1
    line += text[i] === '\t' ? ' '.repeat(width) : text[i]
    for (let k = 0; k < width; k++) from.push(i)
  }
  return { line, source: pos => (pos < from.length ? from[pos]! : text.length) }
}

function indentWidth(line: string, pos: number): number {
  let end = pos
  while (line.charCodeAt(end) === SPACE) end++
  return end - pos
}

/** Where the line goes on inside the container, or NONE when it leaves it. Content marks an item as not empty. */
function enter(container: Container, line: string, pos: number): number {
  const indent = indentWidth(line, pos)
  const at = pos + indent
  if (container.quote) {
    if (indent > 3 || line.charCodeAt(at) !== GREATER) return NONE
    return at + 1 + (line.charCodeAt(at + 1) === SPACE ? 1 : 0)
  }
  // A list item that began with a blank line ends at the next one.
  if (at >= line.length) return container.empty ? NONE : line.length
  if (indent < container.indent) return NONE
  container.empty = false
  return pos + container.indent
}

// The thematic-break tail of the last line asked about: its marker, where it
// starts, and where the third marker from the end is. One scan per line keeps
// a long run of nested `- ` markers linear.
let tailLine: string | undefined
let tailChar = 0
let tailStart = 0
let tailThird = -1

/** Whether the line from `at` on is a thematic break, as THEMATIC_BREAK would say. */
function breakFrom(line: string, at: number): boolean {
  if (line !== tailLine) {
    tailLine = line
    let end = line.length
    while (end > 0 && (line.charCodeAt(end - 1) === SPACE || line.charCodeAt(end - 1) === TAB)) end--
    tailChar = line.charCodeAt(end - 1)
    tailStart = end
    tailThird = -1
    if (tailChar === DASH || tailChar === STAR || tailChar === UNDERSCORE) {
      let seen = 0
      for (let i = end - 1; i >= 0; i--) {
        const c = line.charCodeAt(i)
        if (c === tailChar) {
          if (++seen === 3) tailThird = i
        } else if (c !== SPACE && c !== TAB) break
        tailStart = i
      }
    }
  }
  return line.charCodeAt(at) === tailChar && at >= tailStart && at <= tailThird
}

/** The width up to an item's content, when a list item starts at `at`. */
function listItem(line: string, at: number, interrupting: boolean): { indent: number; empty: boolean } | null {
  LIST_MARKER.lastIndex = at
  const marker = LIST_MARKER.exec(line)
  if (!marker || breakFrom(line, at)) return null
  const after = at + marker[0].length
  const spaces = indentWidth(line, after)
  const empty = after + spaces >= line.length
  // Only a non-empty bullet or an ordered list starting at 1 may interrupt a paragraph.
  if (interrupting && (empty || (marker[1] !== undefined && Number(marker[1]) !== 1))) return null
  return { indent: marker[0].length + (empty || spaces > 4 ? 1 : spaces), empty }
}

function openingFence(body: string): string | null {
  const fence = FENCE.exec(body)
  if (!fence || (fence[1]![0] === '`' && fence[2]!.includes('`'))) return null
  return fence[1]!
}

/** Index in HTML_BLOCKS of the block the line starts, or -1. */
function htmlBlock(body: string): number {
  return body.charCodeAt(0) === LESS ? HTML_BLOCKS.findIndex(([start]) => start.test(body)) : -1
}

/** Whether a line indented less than four ends a paragraph and starts a block of its own. */
function startsLeaf(body: string): boolean {
  const html = htmlBlock(body)
  return (html >= 0 && html !== LONE_TAG) || openingFence(body) !== null || ATX_HEADING.test(body) || THEMATIC_BREAK.test(body)
}

function isLazyContinuation(line: string, pos: number): boolean {
  const indent = indentWidth(line, pos)
  const at = pos + indent
  if (at >= line.length) return false
  if (indent >= 4) return true
  const body = line.slice(at)
  return body[0] !== '>' && !listItem(line, at, true) && !startsLeaf(body)
}

function cellCount(row: string): number {
  return cellsOf(row.trim()).filter(([start, end], k, all) => !((k === 0 || k === all.length - 1) && start === end)).length
}

/** Cell ranges of a table row, split at the pipes that are not escaped. */
function cellsOf(row: string, offset = 0): Span[] {
  const cells: Span[] = []
  let start = 0
  for (let i = 0; i < row.length; i++) {
    const c = row.charCodeAt(i)
    if (c === BACKSLASH) i++
    else if (c === PIPE) {
      cells.push([offset + start, offset + i])
      start = i + 1
    }
  }
  cells.push([offset + start, offset + row.length])
  return cells
}

function normalizeLabel(label: string): string {
  return label.trim().replace(/\s+/g, ' ').toLowerCase().toUpperCase()
}

// --------------------------------------------------------------------- inline

const TEXT = 1 // kept as written, still read as part of its token
const OPAQUE = 2 // kept as written and hidden from the token tests

const ENTITY = /&(?:#[0-9]{1,7}|#[xX][0-9a-fA-F]{1,6}|[A-Za-z][A-Za-z0-9]{1,31});/y
const BARE_URL = /(?:(?:https?|ftp):\/\/(?=[\p{L}\p{N}_-])|file:\/\/|mailto:|www\.(?=[\p{L}\p{N}_-]))[^\s<>`]+/iuy
const URL_TRAILER = `.,:;!?'"*_~]`
const TAG_OR_AUTOLINK = new RegExp(
  `${OPEN_TAG}|${CLOSING_TAG}|<[A-Za-z][A-Za-z0-9+.-]{1,31}:[^\\s<>]*>|<[^\\s<>@]+@[^\\s<>]+>`,
  'y',
)
const HTML_SPANS: Array<[open: string, close: string]> = [
  ['<!--', '-->'],
  ['<![CDATA[', ']]>'],
  ['<?', '?>'],
]

interface DelimiterRun {
  star: boolean
  index: number
  start: number
  /** Delimiters not yet matched. */
  length: number
  /** Length of the whole run, for the rule of three. */
  size: number
  canOpen: boolean
  canClose: boolean
}

/** Per character of `s`: 0 free, TEXT or OPAQUE. */
function guard(s: string, open: boolean, labels: ReadonlySet<string>): Uint8Array {
  const scan = new InlineScan(s, open, labels)
  scan.run()
  return scan.flags()
}

class InlineScan {
  private readonly s: string
  private readonly open: boolean
  private readonly labels: ReadonlySet<string>
  private readonly runs: DelimiterRun[] = []
  // Difference arrays of the TEXT and OPAQUE ranges.
  private readonly text: Int32Array
  private readonly opaque: Int32Array
  private readonly found = new Map<string, [from: number, at: number]>()
  private bracketPairs: Int32Array | null = null
  private tickRuns: Map<number, number[]> | null = null
  private readonly tickCursor = new Map<number, number>()
  private parens: { match: Int32Array; lastClose: Int32Array } | null = null
  private readonly links = new Map<number, { end: number; reach: number }>()

  constructor(s: string, open: boolean, labels: ReadonlySet<string>) {
    this.s = s
    this.open = open
    this.labels = labels
    this.text = new Int32Array(s.length + 1)
    this.opaque = new Int32Array(s.length + 1)
  }

  run(): void {
    const { s } = this
    let i = 0
    while (i < s.length) {
      switch (s.charCodeAt(i)) {
        case BACKSLASH: i = this.backslash(i); break
        case BACKTICK: i = this.codeSpan(i); break
        case LESS: i = this.angle(i); break
        case DOLLAR: i = this.dollar(i); break
        case BANG: i = this.image(i); break
        case OPEN_BRACKET: i = this.bracket(i); break
        case CLOSE_BRACKET: i = this.linkTail(i); break
        case AMPERSAND: i = this.entity(i); break
        case STAR:
        case UNDERSCORE: i = this.delimiterRun(i); break
        default: i = this.bareUrl(i)
      }
    }
    const stray = matchEmphasis(this.runs, (start, end) => this.protect(start, end, OPAQUE))
    // A delimiter that matches nothing leaves the reading of the scope uncertain,
    // and readers differ on it. While streaming it opens what is still to come,
    // so keep the rest as it is; otherwise keep the whole scope.
    if (stray >= 0) this.protect(this.open ? stray : 0, s.length, OPAQUE)
  }

  flags(): Uint8Array {
    const flags = new Uint8Array(this.s.length)
    let text = 0
    let opaque = 0
    for (let k = 0; k < flags.length; k++) {
      text += this.text[k]!
      opaque += this.opaque[k]!
      flags[k] = opaque > 0 ? OPAQUE : text > 0 ? TEXT : 0
    }
    return flags
  }

  private protect(start: number, end: number, level: number): void {
    const marks = level === OPAQUE ? this.opaque : this.text
    marks[start]!++
    marks[Math.min(end, this.s.length)]!--
  }

  /** Protects [start, end) and moves on past it. */
  private keep(start: number, end: number, level = OPAQUE): number {
    this.protect(start, end, level)
    return end
  }

  private keepRest(start: number): number {
    return this.keep(start, this.s.length)
  }

  /** indexOf, remembering misses so that scanning forward stays linear. */
  private find(token: string, from: number): number {
    const last = this.found.get(token)
    if (last && from >= last[0] && (last[1] < 0 || last[1] >= from)) return last[1]
    const at = this.s.indexOf(token, from)
    this.found.set(token, [from, at])
    return at
  }

  private bracketPair(i: number): number {
    this.bracketPairs ??= bracketPairs(this.s)
    return this.bracketPairs[i]!
  }

  private isLabel(start: number, end: number): boolean {
    return end - start <= 999 && this.labels.has(normalizeLabel(this.s.slice(start, end)))
  }

  private backslash(i: number): number {
    const { s } = this
    const next = s.charCodeAt(i + 1)
    if (isAsciiLetter(next)) {
      // a LaTeX command
      let end = i + 2
      while (isAsciiLetter(s.charCodeAt(end))) end++
      return this.keep(i, end, TEXT)
    }
    if (next === OPEN_PAREN || next === OPEN_BRACKET) {
      // \( math \) and \[ math \]
      const close = this.find(next === OPEN_PAREN ? '\\)' : '\\]', i + 2)
      if (close >= 0 && mathFits(s, i, close)) return this.keep(i, close + 2, TEXT)
      if (close < 0 && this.open) return this.keepRest(i)
    }
    return isAsciiPunctuation(next) ? this.keep(i, i + 2, TEXT) : i + 1
  }

  private codeSpan(i: number): number {
    let end = i + 1
    while (this.s.charCodeAt(end) === BACKTICK) end++
    const close = this.closingTicks(end - i, end)
    if (close >= 0) return this.keep(i, close + end - i)
    return this.open ? this.keepRest(i) : end
  }

  /** Start of the first run of exactly `length` backticks at or after `from`, or -1. */
  private closingTicks(length: number, from: number): number {
    this.tickRuns ??= backtickRuns(this.s)
    const starts = this.tickRuns.get(length)
    if (!starts) return -1
    let k = this.tickCursor.get(length) ?? 0
    while (k < starts.length && starts[k]! < from) k++
    this.tickCursor.set(length, k)
    return k < starts.length ? starts[k]! : -1
  }

  private angle(i: number): number {
    const { s } = this
    const end = this.htmlEnd(i)
    if (end > 0) return this.keep(i, end)
    if (end === CUT && this.open) return this.keepRest(i)
    // marked keeps emphasis away from a `<` that is not before a space, up to the next `>`.
    if (s.charCodeAt(i + 1) !== SPACE) {
      const less = this.find('<', i + 1)
      const greater = this.find('>', i + 1)
      if (greater >= 0 && (less < 0 || greater < less)) this.protect(i, greater + 1, OPAQUE)
    }
    return i + 1
  }

  /** End of the raw HTML or autolink at i, NONE or CUT. */
  private htmlEnd(i: number): number {
    const { s } = this
    for (const [open, close] of HTML_SPANS) {
      if (!s.startsWith(open, i)) continue
      const at = this.find(close, i + 2)
      return at < 0 ? CUT : at + close.length
    }
    if (s.startsWith('<!', i) && isAsciiLetter(s.charCodeAt(i + 2))) {
      const at = this.find('>', i + 2)
      return at < 0 ? CUT : at + 1
    }
    TAG_OR_AUTOLINK.lastIndex = i
    if (TAG_OR_AUTOLINK.test(s)) return TAG_OR_AUTOLINK.lastIndex
    // A tag still being written: nothing after it closes it or opens another.
    const next = s.charCodeAt(i + 1)
    return (isAsciiLetter(next) || next === 47) && this.find('>', i) < 0 && this.find('<', i + 1) < 0 ? CUT : NONE
  }

  private dollar(i: number): number {
    const { s } = this
    if (s.charCodeAt(i + 1) === DOLLAR) {
      const close = this.find('$$', i + 2)
      if (close >= 0 && mathFits(s, i, close)) return this.keep(i, close + 2, TEXT)
      if (close < 0 && this.open) return this.keepRest(i)
      return i + 2
    }
    // Pandoc's rule: `$` before a non-space, closed on the same line by a `$`
    // after a non-space that is not followed by a digit.
    if (i + 1 >= s.length || isSpace(s.charCodeAt(i + 1))) return i + 1
    const close = this.find('$', i + 1)
    const lineEnd = this.find('\n', i)
    const fits =
      close > 0 &&
      (lineEnd < 0 || close < lineEnd) &&
      !isSpace(s.charCodeAt(close - 1)) &&
      !isDigit(s.charCodeAt(close + 1)) &&
      mathFits(s, i, close)
    return fits ? this.keep(i, close + 1, TEXT) : i + 1
  }

  /** An image is kept whole, alt text included; the scan goes on inside it. */
  private image(i: number): number {
    if (this.s.charCodeAt(i + 1) !== OPEN_BRACKET) return i + 1
    const close = this.bracketPair(i + 1)
    if (close < 0) return this.open ? this.keepRest(i) : i + 1
    const next = this.s.charCodeAt(close + 1)
    let end = this.isLabel(i + 2, close) ? close + 1 : NONE
    if (next === OPEN_PAREN) {
      const link = this.destination(close + 1)
      if (link.end === CUT && this.open) return this.keepRest(i)
      end = Math.max(end, link.reach)
    } else if (next === OPEN_BRACKET) end = Math.max(end, this.bracketPair(close + 1) + 1)
    if (end > 0) this.protect(i, end, OPAQUE)
    return i + 1
  }

  private bracket(i: number): number {
    const { s } = this
    const close = this.bracketPair(i)
    if (close < 0) return i + 1
    const after = s.charCodeAt(close + 1)
    const footnote = s.charCodeAt(i + 1) === CARET && close > i + 2 && after !== OPEN_PAREN
    const taskBox = close === i + 2 && /[ xX]/.test(s[i + 1]!) && (close + 1 >= s.length || isSpace(after))
    if (footnote || taskBox) return this.keep(i, close + 1)
    if (this.isLabel(i + 1, close)) return this.keep(i, s.startsWith('[]', close + 1) ? close + 3 : close + 1)
    if (after === OPEN_PAREN) {
      // marked keeps emphasis out of `[text](...)` even when it is not a link.
      const { end, reach } = this.destination(close + 1)
      if (end < 0 && reach > 0) this.protect(i, reach, OPAQUE)
    }
    return i + 1
  }

  private linkTail(i: number): number {
    if (this.s.charCodeAt(i + 1) !== OPEN_PAREN) return i + 1
    const { end, reach } = this.destination(i + 1)
    if (reach > 0) this.protect(i, reach, OPAQUE)
    // Only a `]` that closes a `[` can end link text; past any other the scan goes on.
    if (this.bracketPair(i) < 0) return i + 1
    if (end > 0) return end
    return end === CUT && this.open ? this.keepRest(i) : i + 1
  }

  /**
   * The link destination and title after the `(` at k: `end` is where a
   * CommonMark reader ends the link (or NONE, CUT), `reach` the furthest point
   * any reader takes it to. marked balances the parentheses without looking at
   * quotes, or runs to the last `)` before a space.
   */
  private destination(k: number): { end: number; reach: number } {
    let link = this.links.get(k)
    if (!link) {
      this.parens ??= parenIndex(this.s)
      const end = inlineLinkEnd(this.s, k)
      link = { end, reach: Math.max(end, this.parens.match[k]! + 1, this.parens.lastClose[k]! + 1) }
      this.links.set(k, link)
    }
    return link
  }

  private entity(i: number): number {
    ENTITY.lastIndex = i
    return ENTITY.test(this.s) ? this.keep(i, ENTITY.lastIndex, TEXT) : i + 1
  }

  private delimiterRun(i: number): number {
    const { s } = this
    let end = i + 1
    while (s.charCodeAt(end) === s.charCodeAt(i)) end++
    const before = charClass(charBefore(s, i))
    const after = charClass(charFrom(s, end))
    const left = after !== 0 && (after === 2 || before !== 2)
    const right = before !== 0 && (before === 2 || after !== 2)
    const star = s.charCodeAt(i) === STAR
    this.runs.push({
      star,
      index: this.runs.length,
      start: i,
      length: end - i,
      size: end - i,
      canOpen: left && (star || !right || before === 1),
      canClose: right && (star || !left || after === 1),
    })
    return end
  }

  /** Where link text that holds `start` ends before `end`: a `]` that closes an earlier `[`. */
  private linkTextEnd(start: number, end: number): number {
    for (let k = this.find(']', start); k >= 0 && k < end; k = this.find(']', k + 1)) {
      const open = this.bracketPair(k)
      if (open >= 0 && open < start) return k
    }
    return end
  }

  /** A URL the GFM autolink extension turns into a link. */
  private bareUrl(i: number): number {
    const { s } = this
    const c = s.charCodeAt(i) | 32
    if ((c === 104 || c === 102 || c === 109 || c === 119) && !/[A-Za-z0-9]/.test(s[i - 1] ?? '')) {
      BARE_URL.lastIndex = i
      const url = BARE_URL.exec(s)
      if (url) {
        const end = trimUrl(s, i, this.linkTextEnd(i, i + url[0].length))
        if (end > i + 3) return this.keep(i, end, TEXT)
      }
    }
    return i + 1
  }
}

/** Whether `$` math from a to b can be taken out without cutting across markdown. */
function mathFits(s: string, a: number, b: number): boolean {
  let depth = 0
  for (let k = a; k < b; k++) {
    const c = s.charCodeAt(k)
    if (c === BACKTICK || c === LESS) return false
    if (c === OPEN_BRACKET) depth++
    else if (c === CLOSE_BRACKET && --depth < 0) return false
    else if (c === OPEN_PAREN && s.charCodeAt(k - 1) === CLOSE_BRACKET) return false
  }
  return depth === 0
}

/** A bare URL without the trailing punctuation that readers leave out of it. */
function trimUrl(s: string, start: number, end: number): number {
  let opens = 0
  let closes = 0
  for (let k = start; k < end; k++) {
    if (s.charCodeAt(k) === OPEN_PAREN) opens++
    else if (s.charCodeAt(k) === CLOSE_PAREN) closes++
  }
  while (end > start) {
    const c = s[end - 1]!
    if (c === ')' && closes > opens) closes--
    else if (!URL_TRAILER.includes(c)) break
    end--
  }
  return end
}

/** For each `[` the `]` that closes it and the other way round; -1 elsewhere. */
function bracketPairs(s: string): Int32Array {
  const pairs = new Int32Array(s.length).fill(-1)
  const open: number[] = []
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    if (c === BACKSLASH) i++
    else if (c === OPEN_BRACKET) open.push(i)
    else if (c === CLOSE_BRACKET && open.length) {
      const start = open.pop()!
      pairs[start] = i
      pairs[i] = start
    }
  }
  return pairs
}

/** Starts of the backtick runs of each length. */
function backtickRuns(s: string): Map<number, number[]> {
  const runs = new Map<number, number[]>()
  for (let i = s.indexOf('`'); i >= 0; i = s.indexOf('`', i)) {
    let end = i + 1
    while (s.charCodeAt(end) === BACKTICK) end++
    const starts = runs.get(end - i)
    if (starts) starts.push(i)
    else runs.set(end - i, [i])
    i = end
  }
  return runs
}

/** For each `(`, its balancing `)`; for each position, the last `)` before the next space. */
function parenIndex(s: string): { match: Int32Array; lastClose: Int32Array } {
  const match = new Int32Array(s.length).fill(-1)
  const lastClose = new Int32Array(s.length + 1).fill(-1)
  const open: number[] = []
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    if (c === BACKSLASH) i++
    else if (c === OPEN_PAREN) open.push(i)
    else if (c === CLOSE_PAREN && open.length) match[open.pop()!] = i
  }
  for (let i = s.length - 1; i >= 0; i--) {
    const c = s.charCodeAt(i)
    if (c > SPACE) lastClose[i] = lastClose[i + 1]! >= 0 ? lastClose[i + 1]! : c === CLOSE_PAREN ? i : -1
  }
  return { match, lastClose }
}

function skipSpace(s: string, i: number): number {
  while (isSpace(s.charCodeAt(i))) i++
  return i
}

/** End of a CommonMark link destination and title after the `(` at k: past its `)`, NONE or CUT. */
function inlineLinkEnd(s: string, k: number): number {
  const start = skipSpace(s, k + 1)
  const end = s.charCodeAt(start) === LESS ? angleDestinationEnd(s, start) : bareDestinationEnd(s, start)
  if (end < 0) return end
  const title = skipSpace(s, end)
  if (title >= s.length) return CUT
  if (s.charCodeAt(title) === CLOSE_PAREN) return title + 1
  if (title === end || !`"'(`.includes(s[title]!)) return NONE
  const after = titleEnd(s, title)
  if (after < 0) return after
  const close = skipSpace(s, after)
  if (close >= s.length) return CUT
  return s.charCodeAt(close) === CLOSE_PAREN ? close + 1 : NONE
}

function angleDestinationEnd(s: string, start: number): number {
  for (let p = start + 1; p < s.length; p++) {
    const c = s.charCodeAt(p)
    if (c === BACKSLASH) p++
    else if (c === GREATER) return p + 1
    else if (c === LESS || c === NEWLINE) return NONE
  }
  return CUT
}

function bareDestinationEnd(s: string, start: number): number {
  let depth = 0
  for (let p = start; p < s.length; p++) {
    const c = s.charCodeAt(p)
    if (c === BACKSLASH && isAsciiPunctuation(s.charCodeAt(p + 1))) p++
    else if (c <= SPACE) return depth === 0 ? p : NONE
    else if (c === OPEN_PAREN) depth++
    else if (c === CLOSE_PAREN && depth-- === 0) return p
    // Brackets are rare in a destination; treating them as not one keeps each
    // scan inside its own link, so scanning stays linear.
    else if (c === OPEN_BRACKET || c === CLOSE_BRACKET) return NONE
  }
  return CUT
}

function titleEnd(s: string, start: number): number {
  const open = s.charCodeAt(start)
  const close = open === OPEN_PAREN ? CLOSE_PAREN : open
  for (let p = start + 1; p < s.length; p++) {
    const c = s.charCodeAt(p)
    if (c === BACKSLASH) p++
    else if (c === close) return p + 1
    else if (c === open) return NONE
  }
  return CUT
}

/**
 * Pairs the delimiter runs into emphasis as CommonMark does and reports each
 * matched span. Returns where the first delimiter that matched nothing sits, or -1.
 */
function matchEmphasis(runs: DelimiterRun[], span: (start: number, end: number) => void): number {
  const openers: DelimiterRun[] = []
  // Per kind of closer, the first run that may still open for it.
  const floor = new Int32Array(12)
  let stray = Infinity
  for (const run of runs) {
    if (run.canClose) {
      const kind = (run.star ? 0 : 6) + (run.canOpen ? 3 : 0) + (run.size % 3)
      while (run.length > 0) {
        let k = openers.length - 1
        while (k >= 0 && openers[k]!.index >= floor[kind]! && !canPair(openers[k]!, run)) k--
        if (k < 0 || openers[k]!.index < floor[kind]!) {
          floor[kind] = run.index
          break
        }
        const opener = openers[k]!
        const used = opener.length >= 2 && run.length >= 2 ? 2 : 1
        opener.length -= used
        span(opener.start + opener.length, run.start + used)
        run.start += used
        run.length -= used
        openers.length = opener.length > 0 ? k + 1 : k
      }
      if (run.length > 0 && !run.canOpen) stray = Math.min(stray, run.start)
    }
    if (run.canOpen && run.length > 0) openers.push(run)
  }
  for (const opener of openers) stray = Math.min(stray, opener.start)
  return stray === Infinity ? -1 : stray
}

function canPair(opener: DelimiterRun, closer: DelimiterRun): boolean {
  if (opener.star !== closer.star) return false
  const ruleOfThree = (opener.canClose || closer.canOpen) && (opener.size + closer.size) % 3 === 0
  return !ruleOfThree || (opener.size % 3 === 0 && closer.size % 3 === 0)
}

// ---------------------------------------------------------------------- words

const HAS_LETTER = /\p{L}/u
const TOKEN = /\S+/g
const WORD = /\p{L}[\p{L}\p{M}]*(?:['’]\p{L}[\p{L}\p{M}]*)*/gu
const APOSTROPHE = /['’]/
const ASCII = /^[\x00-\x7f]*$/
// A token with any of these is not prose: paths, identifiers, addresses,
// versions, flags, URLs, anything with a digit.
const TECHNICAL =
  /[/\\_@#=+$%&^|{}<>~*]|\p{Ll}\p{Lu}|\p{L}\.\p{L}|\p{N}|(?:^|[^\p{L}\p{N}-])-{1,2}\p{L}|^\.\p{L}|:\/\/|::/u
// Scripts written without spaces between words, and cursive scripts.
const UNSPACED_SCRIPT =
  /(?=\p{L})[\p{scx=Han}\p{scx=Hiragana}\p{scx=Katakana}\p{scx=Hangul}\p{scx=Thai}\p{scx=Lao}\p{scx=Khmer}\p{scx=Myanmar}\p{scx=Tibetan}\p{scx=Arabic}\p{scx=Hebrew}\p{scx=Syriac}\p{scx=Thaana}\p{scx=Mongolian}]/u

/** Offsets in `s` where `**` goes: the start and the end of each bold head. */
function boldPoints(s: string, flags: Uint8Array, level: number): number[] {
  const points: number[] = []
  for (const token of hideOpaque(s, flags).matchAll(TOKEN)) {
    if (TECHNICAL.test(token[0])) continue
    for (const word of token[0].matchAll(WORD)) {
      const start = token.index! + word.index!
      const end = start + word[0].length
      if (flags.subarray(start, end).some(flag => flag !== 0)) continue
      if (!standsAlone(s, start, end) || UNSPACED_SCRIPT.test(word[0])) continue
      points.push(start, start + boldLength(word[0], level))
    }
  }
  return points
}

/** `s` with each OPAQUE character replaced by U+0001, so token tests do not see it. */
function hideOpaque(s: string, flags: Uint8Array): string {
  let view = ''
  let from = 0
  for (let k = flags.indexOf(OPAQUE); k >= 0; k = flags.indexOf(OPAQUE, from)) {
    let end = k + 1
    while (flags[end] === OPAQUE) end++
    view += s.slice(from, k) + '\u0001'.repeat(end - k)
    from = end
  }
  return view + s.slice(from)
}

/** Whether only whitespace or punctuation other than `*`, `_` and `~` touches the word. */
function standsAlone(s: string, start: number, end: number): boolean {
  let before = charBefore(s, start)
  // After an apostrophe the word is judged as if the apostrophe were part of it.
  if (before === "'" || before === '’') before = charBefore(s, start - 1)
  return isBoundary(before) && isBoundary(charFrom(s, end))
}

function isBoundary(ch: string): boolean {
  return ch !== '*' && ch !== '_' && ch !== '~' && charClass(ch) !== 2
}

let segmenter: Intl.Segmenter | null | undefined
function graphemes(s: string): string[] {
  if (ASCII.test(s)) return s.split('')
  if (segmenter === undefined) {
    try {
      segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    } catch {
      segmenter = null
    }
  }
  if (segmenter) return Array.from(segmenter.segment(s), part => part.segment)
  return s.match(/\P{M}\p{M}*/gu) ?? [s]
}

/**
 * Code units of `word` to bold at `level`: the part before an apostrophe decides,
 * unless it is a short elided article or pronoun (French l', d', qu') followed by
 * a longer word; then the bold runs through the apostrophe into that word.
 */
function boldLength(word: string, level: number): number {
  const stem = word.split(APOSTROPHE, 1)[0]!
  // A word this long is past every cap; the first graphemes are all that matter.
  const parts = graphemes(stem.slice(0, 64))
  const count = stem.length > 64 ? Infinity : parts.length
  if (count <= 2 && stem.length < word.length) {
    const rest = word.slice(stem.length + 1)
    const next = rest.split(APOSTROPHE, 1)[0]!
    if (next.length > 64 || graphemes(next).length > count) return stem.length + 1 + boldLength(rest, level)
  }
  const bold =
    count <= 4 ? SHORT_BOLD[count - 1]![level - 1]! : Math.min(Math.ceil(count * RATIO[level - 1]!), MAX_BOLD[level - 1]!)
  return parts.slice(0, bold).join('').length
}

// ------------------------------------------------------------------ transform

/** Offsets in the text where `**` goes for one scope. */
function scopePoints(text: string, scope: Scope, labels: ReadonlySet<string>, level: number): number[] {
  // Where each line starts and ends in `content`, the lines joined by newlines.
  const spans: Span[] = []
  let length = 0
  for (const [start, end] of scope.lines) {
    spans.push([length, length + end - start])
    length += end - start + 1
  }
  const content = scope.lines.map(([start, end]) => text.slice(start, end)).join('\n')
  if (!HAS_LETTER.test(content)) return []
  const flags = guard(content, scope.open, labels)
  for (const line of scope.held) flags.fill(OPAQUE, ...spans[line]!)
  if (scope.table >= 0) {
    // Rows are read both as cells and as paragraph text: readers disagree on
    // what makes a table, so keep what either reading keeps.
    for (let row = scope.table; row < spans.length; row++) {
      const [rowStart, rowEnd] = spans[row]!
      const cells = cellsOf(content.slice(rowStart, rowEnd), rowStart)
      cells.forEach(([start, end], k) => {
        const last = scope.open && row === spans.length - 1 && k === cells.length - 1
        guard(content.slice(start, end), last, labels).forEach((flag, at) => {
          if (flag > flags[start + at]!) flags[start + at] = flag
        })
      })
    }
  }
  let line = 0
  return boldPoints(content, flags, level).map(point => {
    while (point > spans[line]![1]) line++
    return scope.lines[line]![0] + point - spans[line]![0]
  })
}

function transform(text: string, level: number): string {
  const { scopes, labels } = readBlocks(text)
  const parts: string[] = []
  let from = 0
  let room = MAX_OUTPUT - text.length
  for (const scope of scopes) {
    const points = scopePoints(text, scope, labels, level)
    // Each point adds two characters; past the limit the rest stays plain.
    room -= 2 * points.length
    if (room < 0) break
    for (const point of points) {
      parts.push(text.slice(from, point), '**')
      from = point
    }
  }
  if (!parts.length) return text
  parts.push(text.slice(from))
  return parts.join('')
}

// ---------------------------------------------------------------------- cache

const cache = new Map<string, string>()
let cachedChars = 0

function remember(key: string, value: string): string {
  cache.set(key, value)
  cachedChars += key.length + value.length
  while (cache.size > CACHE_ENTRIES || cachedChars > CACHE_CHARS) {
    const [oldKey, oldValue] = cache.entries().next().value!
    cache.delete(oldKey)
    cachedChars -= oldKey.length + oldValue.length
  }
  return value
}

/** Level 1..5 (default 3). Text it cannot or need not change comes back as given. */
export function bionic(text: string, level: number = DEFAULT_LEVEL): string {
  if (typeof text !== 'string' || text.length === 0 || text.length >= MAX_OUTPUT) return text
  const lv = Number.isInteger(level) && level >= 1 && level <= 5 ? level : DEFAULT_LEVEL
  const key = lv + text
  const hit = cache.get(key)
  if (hit === undefined) return remember(key, transform(text, lv))
  cache.delete(key)
  cache.set(key, hit)
  return hit
}
