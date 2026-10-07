import { expect, test } from 'claude-code/testing'
import { bionic } from '../hooks/bionic.ts'

const LEVELS = [1, 2, 3, 4, 5]

/** How many `**` pairs `out` adds to `input`, or -1 when it changes anything else. */
function insertedPairs(input: string, out: string): number {
  if (out.length < input.length || (out.length - input.length) % 4 !== 0) return -1
  let i = 0
  let j = 0
  let stars = 0
  while (i < input.length || j < out.length) {
    if (i < input.length && j < out.length && input[i] === out[j]) {
      i++
      j++
    } else if (out.startsWith('**', j)) {
      j += 2
      stars++
    } else return -1
  }
  return stars % 2 === 0 ? stars / 2 : -1
}

const runs = (s: string) => (s.match(/\*{4,}/g) ?? []).length

// Inputs and what level 3 makes of them: the regressions, spelled out.
const EXACT: Array<[string, string]> = [
  ["the **API**s and **config**uration", "**t**he **API**s **a**nd **config**uration"],
  ["**Note**: be careful, **PR**s and **item**s here", "**Note**: **b**e **care**ful, **PR**s **a**nd **item**s **he**re"],
  ["the _id field and item_id column", "**t**he _id field and item_id column"],
  ["Rename _private_name and my_var_name now", "**Ren**ame _private_name and my_var_name now"],
  ["Use __init__ and __name__ in foo_bar.py", "**U**se __init__ **a**nd __name__ **i**n foo_bar.py"],
  ["See [docs] here.\n\n[docs]: https://docs.localhost", "**S**ee [docs] **he**re.\n\n[docs]: https://docs.localhost"],
  ["See [docs][] and [the guide][g] and [Docs].\n\n[docs]: https://docs.localhost\n[g]: https://docs.localhost/g", "**S**ee [docs][] **a**nd [**t**he **gui**de][g] **a**nd [Docs].\n\n[docs]: https://docs.localhost\n[g]: https://docs.localhost/g"],
  ["A claim[^note] here.\n\n[^note]: The note text.", "**A** **cla**im[^note] **he**re.\n\n[^note]: The note text."],
  ["Read [undefined label] now.", "**Re**ad [**undef**ined **lab**el] **n**ow."],
  ["Edit src/foo/bar.ts, ./hooks/register.tsx and ~/.config/settings.json now", "**Ed**it src/foo/bar.ts, ./hooks/register.tsx **a**nd ~/.config/settings.json **n**ow"],
  ["set max_output_lines and call getElementById or useEffect now", "**s**et max_output_lines **a**nd **ca**ll getElementById **o**r useEffect **n**ow"],
  ["visit docs.localhost and docs.example.co.uk, needs v1.2.3, ES2015 and 0xdeadbeef today", "**vis**it docs.localhost **a**nd docs.example.co.uk, **nee**ds v1.2.3, ES2015 **a**nd 0xdeadbeef **tod**ay"],
  ["run --dry-run and -rf flags, 3x faster, h264 and x86_64 words", "**r**un --dry-run **a**nd -rf **fla**gs, 3x **fas**ter, h264 **a**nd x86_64 **wor**ds"],
  ["mail me@docs.localhost or ssh://files.docs.localhost/a_b or mailto:a@b.co or file:///tmp/x.txt now", "**ma**il me@docs.localhost **o**r ssh://files.docs.localhost/a_b **o**r mailto:a@b.co **o**r file:///tmp/x.txt **n**ow"],
  ["see https://docs.localhost/a_(b) and <https://docs.localhost/x_y> and www.docs.localhost/p_q ok", "**s**ee https://docs.localhost/a_(b) **a**nd <https://docs.localhost/x_y> **a**nd www.docs.localhost/p_q **o**k"],
  ["这是一个测试句子，用于检查。日本語のテキストです。สวัสดีครับ مرحبا שלום 안녕하세요", "这是一个测试句子，用于检查。日本語のテキストです。สวัสดีครับ مرحبا שלום 안녕하세요"],
  ["使用 Reader Mode 来写 words and 日本語 more words", "使用 **Rea**der **Mo**de 来写 **wor**ds **a**nd 日本語 **mo**re **wor**ds"],
  ["Euler: $e^{i\\pi} + 1 = 0$ and \\alpha, \\(x + y\\) and $$E = mc^2$$ words", "**Eul**er: $e^{i\\pi} + 1 = 0$ **a**nd \\alpha, \\(x + y\\) **a**nd $$E = mc^2$$ **wor**ds"],
  ["costs $5 and $10 plus words", "**cos**ts $5 **a**nd $10 **pl**us **wor**ds"],
  ["$$\n\\frac{a}{b}\n\nmore math\n$$\n\nAfter words", "$$\n\\frac{a}{b}\n\nmore math\n$$\n\n**Aft**er **wor**ds"],
  ["This is **Important note about", "**Th**is **i**s **Important note about"],
  ["Run `npm install foo", "**R**un `npm install foo"],
  ["Text *", "**Te**xt *"],
  ["This is **open words\n\nnext paragraph words", "This is **open words\n\n**ne**xt **parag**raph **wor**ds"],
  ["> ```js\n> const answer = compute(words)\n> ```\n> outro words", "> ```js\n> const answer = compute(words)\n> ```\n> **out**ro **wor**ds"],
  ["> ```py\n> def foo(): return bar", "> ```py\n> def foo(): return bar"],
  ["- item\n  ```sh\n  echo words here\n  ```\n- next item", "- **it**em\n  ```sh\n  echo words here\n  ```\n- **ne**xt **it**em"],
  ["```text\nlines of words\n    ```\nstill code words\n```\nafter words", "```text\nlines of words\n    ```\nstill code words\n```\n**aft**er **wor**ds"],
  ["Text\n\n    - item in code block\n    1. step in code\n\nafter words", "**Te**xt\n\n    - item in code block\n    1. step in code\n\n**aft**er **wor**ds"],
  ["- first item\n\n    continued paragraph words", "- **fir**st **it**em\n\n    **conti**nued **parag**raph **wor**ds"],
  ["<div>\nSome text inside div\n</div>\n\nOutside words", "<div>\nSome text inside div\n</div>\n\n**Outs**ide **wor**ds"],
  ["<!--\nhidden words\n-->\nvisible words", "<!--\nhidden words\n-->\n**visi**ble **wor**ds"],
  ["<details>\n<summary>Show words</summary>\n\nHidden words here\n\n</details>", "<details>\n<summary>Show words</summary>\n\n**Hid**den **wor**ds **he**re\n\n</details>"],
  ["Press <kbd>Ctrl</kbd> and <br> then Array<string> words", "**Pre**ss <kbd>**Ct**rl</kbd> **a**nd <br> **th**en **Arr**ay<string> **wor**ds"],
  ["A [link](https://docs.localhost/f(x)y \"Some title\") and ![alt text](img.png \"Title words\") words", "**A** [**li**nk](https://docs.localhost/f(x)y \"Some title\") **a**nd ![alt text](img.png \"Title words\") **wor**ds"],
  ["| Name | Value |\n|---|---|\n| **API**s | `a|b` words |", "| **Na**me | **Val**ue |\n|---|---|\n| **API**s | `a|b` **wor**ds |"],
  ["\"quoted\" text, (parens) and it's don't rock'n'roll l'homme", "\"**quo**ted\" **te**xt, (**par**ens) **a**nd **i**t's **d**on't **ro**ck'n'roll **l'hom**me"],
  ["L'intelligence de l'homme qu'il a d'autres, O'Brien İstanbul'da", "**L'intel**ligence **d**e **l'hom**me **q**u'il **a** **d'aut**res, **O'Bri**en **İsta**nbul'da"],
  ["state-of-the-art well-known", "**sta**te-**o**f-**t**he-**a**rt **we**ll-**kno**wn"],
  ["a I an the word reading international Donaudampfschifffahrtsgesellschaft", "**a** **I** **a**n **t**he **wo**rd **read**ing **inter**national **Donau**dampfschifffahrtsgesellschaft"],
  ["*one* **two** ***three*** _four_ __five__ ~~six~~ seven", "*one* **two** ***three*** _four_ __five__ ~~six~~ **sev**en"],
  ["glob src/**/*.ts and 2 * 3 and a*b*c words", "**gl**ob src/**/*.ts and 2 * 3 and a*b*c words"],
  ["\\*literal\\* and \\_under\\_ and \\[x\\] words", "\\*literal\\* **a**nd \\_under\\_ **a**nd \\[x\\] **wor**ds"],
  ["Tom &amp; Jerry &copy; and AT&T words", "**T**om &amp; **Jer**ry &copy; **a**nd AT&T **wor**ds"],
  ["- [ ] todo item\n- [x] done item", "- [ ] **to**do **it**em\n- [x] **do**ne **it**em"],
  ["line one  \nline two\\\nline three", "**li**ne **o**ne  \n**li**ne two\\\n**li**ne **thr**ee"],
  ["café naïve Zoë Привет Καλημέρα", "**ca**fé **naï**ve **Z**oë **При**вет **Καλη**μέρα"],
  ['Masaüstü çiçekçi şoför'.normalize('NFD'), '**Masa**üstü **çiçe**kçi **şof**ör'.normalize('NFD')],
  // A code span that crosses a cell's pipe is still code to a reader that splits the row first.
  ['| a | b |\n|---|---|\n| ` x | `code words` z |\n\nafter words', '| **a** | **b** |\n|---|---|\n| ` x | `code words` **z** |\n\n**aft**er **wor**ds'],
  // A definition over several lines keeps its title.
  ['[docs]:\nhttps://docs.localhost/guide\n"Title words"\n\nSee [docs] now.', '[docs]:\nhttps://docs.localhost/guide\n"Title words"\n\n**S**ee [docs] **n**ow.'],
  ['[docs]: https://docs.localhost "Title\nmore words"\n\nSee [docs] now.', '[docs]: https://docs.localhost "Title\nmore words"\n\n**S**ee [docs] **n**ow.'],
  // A `<` before a code span does not hide the span.
  ['Compare a <`> b` words here.', '**Comp**are **a** <`> b` **wor**ds **he**re.'],
  // A reply that has streamed up to a newline is still being written.
  ['Run `npm install foo\n', '**R**un `npm install foo\n'],
  ['This is **open words\n', '**Th**is **i**s **open words\n'],
  // Emphasis pairs as in CommonMark: all matched here, and a stray `*` at the end there.
  ['x*y**a*****ax_ya* more **a x**y more', 'x*y**a*****ax_ya* **mo**re **a x**y **mo**re'],
  [' __ *x**y* **a*x_y**x*ya** more', ' __ *x**y* **a*x_y**x*ya** more'],
  // Where markdown readers disagree, what any of them keeps stays as written.
  ['Text](http://docs.localhost)x words\n\nEnd words', '**Te**xt](http://docs.localhost)x **wor**ds\n\n**E**nd **wor**ds'],
  ['![``]()ç`` words\n\nEnd words', '![``]()ç`` **wor**ds\n\n**E**nd **wor**ds'],
  ['$$<$$\nnear > words\n\nEnd words', '$$<$$\nnear > **wor**ds\n\n**E**nd **wor**ds'],
  ['http://![ alt words]()\n\nEnd words', 'http://![ alt words]()\n\n**E**nd **wor**ds'],
  ['[sample](<) and [text words](h g)\n\nEnd words', '[sample](<) **a**nd [text words](h g)\n\n**E**nd **wor**ds'],
  ['[1]:<<>\n    code words\n\nEnd words', '[1]:<<>\n    code words\n\n**E**nd **wor**ds'],
  ['Intro\n[s]:\n```\n\ncode words', '**Int**ro\n[s]:\n```\n\ncode words'],
  ['> \tcode words\n\nEnd words', '> \tcode words\n\n**E**nd **wor**ds'],
  ['- <div>\nlazy words\n\nEnd words', '- <div>\nlazy words\n\n**E**nd **wor**ds'],
  ['> quoted words\n<span>\nlazy words\n\nEnd words', '> **quo**ted **wor**ds\n<span>\nlazy words\n\n**E**nd **wor**ds'],
  ['Some `code\n<span>\nwords` here', '**So**me `code\n<span>\nwords` here'],
  // Claude Code's markdown hides <...> and `...` spans from emphasis with its own pairing.
  ["If a < b the loop ends, and if c > d it goes on.","**I**f **a** < b the loop ends, and if c > **d** **i**t **go**es **o**n."],
  ["Use ``a ` b`` then some words and `x` here.","**U**se ``a ` b`` then some words and `x` **he**re."],
  ["Escape with \\` then some words and `x` here.","**Esc**ape **wi**th \\` then some words and `x` **he**re."],
  // A sibling list item, a lone tag line or a definition-like line does not swallow the fence after it.
  ["1. Install the package\n2. ```sh\n   npm install words\n   ```\n3. Done","1. **Inst**all **t**he **pack**age\n2. ```sh\n   npm install words\n   ```\n3. **Do**ne"],
  ["> 1. Install\n> 2. ```sh\n>    npm install words\n>    ```","> 1. **Inst**all\n> 2. ```sh\n>    npm install words\n>    ```"],
  ["1) Install the package\n2) ```sh\n   npm install words\n   ```","1) **Inst**all **t**he **pack**age\n2) ```sh\n   npm install words\n   ```"],
  ["Wrap it like this\n<Button>\n```tsx\nconst label = here\n\nreturn label words\n```\nafter words","**Wr**ap **i**t **li**ke **th**is\n<Button>\n```tsx\nconst label = here\n\nreturn label words\n```\n**aft**er **wor**ds"],
  ["[note]:\n```js\nconst words = here\n```\nafter words","[note]:\n```js\nconst words = here\n```\n**aft**er **wor**ds"],
  // An escaped astral symbol shifts the renderer's emphasis mask for the text before it.
  ["Some words here then \\🎉 and more words","Some words here then \\🎉 **a**nd **mo**re **wor**ds"],
]

// Adversarial inputs: every one must come out as the input plus whole `**` pairs, and bolding it again must change nothing.
const ADVERSARIAL: Record<string, string> = {
  apostrophe: "don't it's l'homme rock'n'roll",
  apos_trailing: "the students' books",
  hyphen: "well-known state-of-the-art",
  digits: "v2rc build 3x faster ES2015 utf8 h264 x86_64",
  combining: "cafe\u0301 nai\u0308ve Zoe\u0308",
  devanagari: "नमस्ते दुनिया हिन्दी",
  emoji: "great 👍 job 🎉 well👏done",
  zwj: "family 👨\u200d👩\u200d👧 here",
  arabic: "مرحبا بالعالم كيف حالك",
  hebrew: "שלום עולם מה שלומך",
  cjk: "这是一个测试句子，用于检查。日本語のテキストです",
  thai: "สวัสดีครับวันนี้อากาศดี",
  korean: "안녕하세요 세계",
  greek: "Καλημέρα κόσμε",
  cyrillic: "Привет мир, как дела",
  german: "Donaudampfschifffahrtsgesellschaftskapitän fährt",
  turkish: "İstanbul ılık ışık Iğdır çiçekçi",
  footnote: "Text with a note[^1].\n\n[^1]: The footnote body text.",
  refdef: "See [the docs][docs] and [docs].\n\n[docs]: https://docs.localhost \"Title here\"",
  refshortcut: "See [docs] here.\n\n[docs]: https://docs.localhost",
  refcollapsed: "See [docs][] here.\n\n[docs]: https://docs.localhost",
  table: "| Name | Value |\n|------|-------|\n| alpha | beta gamma |\n| a \\| b | c |",
  table_code_pipe: "| cmd | x | desc |\n|---|---|---|\n| `a|b` | pipe words |",
  nested_list: "- outer item\n  - inner item text\n    - deeper item\n\n1. first\n   continued line",
  list_code: "1. Install:\n\n    ```bash\n    npm install\n    ```\n\n2. Done",
  list_indented_cont: "- item\n\n    indented paragraph inside list item",
  blockquote: "> quoted text here\n> > nested quote",
  entity: "Tom &amp; Jerry &copy; 2024 &nbsp;space &#169; &#x41;",
  entity_bad: "AT&T and R&D",
  math_inline: "Euler: $e^{i\\pi} + 1 = 0$ and $\\alpha + \\beta$",
  math_block: "$$\n\\frac{a}{b} = \\sum_{i} x_i\n$$",
  long_word: "aaaaa Pneumonoultramicroscopicsilicovolcanoconiosis",
  domain: "Visit docs.localhost or docs.docs.localhost today",
  path: "Edit src/foo/bar.ts and ./hooks/register.tsx then ~/.config/settings.json",
  winpath: "C:\\Users\\name\\file.txt",
  snake: "set max_output_lines and MAX_OUTPUT here",
  camel: "call useEffect and getElementById now",
  dotted: "use console.log and Array.from here",
  unclosed_fence: "Here is code:\n\n```python\ndef foo():\n    return bar",
  unclosed_tilde: "~~~\nsome text",
  strike: "~~deleted text~~ here",
  star_punct: "word.** and (paren) \"quoted\" text",
  emph_inside_word: "un*frigging*believable",
  bold_inside: "**already bold** plain",
  underscore_word: "foo_bar_baz text",
  html_inline: "Press <kbd>Ctrl</kbd> and <br> next",
  html_block: "<details>\n<summary>Click me</summary>\n\nHidden content here\n\n</details>",
  heading: "# Heading Title\n\n## Second level\n\nSetext Heading\n=============",
  setext2: "Some heading\n---",
  hr: "text above\n\n***\n\ntext below",
  link_title: "[link text](https://x.localhost \"Some title\")",
  link_parens: "[wiki](https://docs.localhost/wiki/Foo_(bar)) after",
  link_angle: "[a](<path with spaces.md>) after",
  autolink: "<https://docs.localhost> and <me@x.com>",
  url_paren: "(https://docs.localhost/a_(b)) done",
  url_trailing_period: "Go to https://docs.localhost.",
  email: "mail me@docs.localhost now",
  escaped: "\\*not emphasis\\* and \\_x\\_",
  backslash_line: "line one\\\nline two",
  hard_break: "line one  \nline two",
  task: "- [ ] todo item\n- [x] done item",
  img: "![alt text here](img.png)",
  img_ref: "![alt][logo]\n\n[logo]: x.png",
  nested_link_bold: "**[bold link](u)** and [**inner**](u)",
  link_brackets_text: "[some [nested] text](u)",
  star_list: "* star item\n* another",
  emph_star_adj: "a *b* c",
  numbers_only: "123 456",
  mixed_case_acronym: "HTTP API JSON",
  indented_after_para: "para\n    not code because lazy",
  tab_code: "\tcode with tab",
  fence_in_quote: "> ```\n> code in quote\n> ```",
  fence_in_list: "- item\n  ```\n  code in list\n  ```",
  fence_longer_close: "````\ncode\n```\nstill code\n````\nafter",
  fence_info_backtick: "``` js `x`\nfoo\n```",
  html_comment: "<!-- comment -->\ntext after",
  ul_underscore_emph: "_emphasis text_ ok",
  intraword_underscore_bold: "snake__case__name",
  star_math: "2*3*4 equals words",
  asterisk_bullet_text: "a * b * c",
  apostrophe_start: "'quoted' word",
  dotless: "ılık",
  i_dot: "İi",
  word_with_bold_mid: "pre**bold**post",
  yaml_front: "---\ntitle: test\n---\nbody",
  latex_block_brackets: "\\[ x^2 \\]",
  link_def_indented: "   [x]: https://y.localhost",
  numbers_ordinal: "1st 2nd 3rd 21st",
  amp_word: "Q&A session",
  mention: "@nickname said #hashtag",
  emoji_shortcode: ":smile: face",
  zero_width: "zero\u200bwidth",
  softhyphen: "hyph\u00adenated",
  nbsp: "non\u00a0breaking",
  diff_block: "```diff\n- old\n+ new\n```",
  bold_suffix: "the **API**s and **config**uration",
  bold_prefix: "re**write** it",
  em_suffix: "the *thing*s here",
  code_suffix: "the `foo`s and `bar`-like",
  strike_suffix: "~~del~~eted",
  bold_italic: "***very important*** text",
  strong_in_em: "*this is **very** nice*",
  em_in_strong: "**this is *very* nice**",
  underscore_strong_in_em: "_this __is__ ok_",
  star_math2: "2*x*y and a*b",
  star_word: "foo*bar baz*qux",
  ref_label_word: "Use [docs] here\n\n[docs]: https://a.localhost",
  ref_label_case: "Use [Docs][] here\n\n[docs]: https://a.localhost",
  footnote_label: "See note[^note] here.\n\n[^note]: Body.",
  html_div: "<div>\nSome text inside div\n</div>",
  html_div2: "<div align=\"center\">\nCentered words here\n\n</div>",
  html_pre: "<pre>\nraw preformatted words\n</pre>",
  html_table: "<table>\n<tr><td>cell words</td></tr>\n</table>",
  indented_list_code: "Text\n\n    - item in code block",
  indented_num_code: "Text\n\n    1. step in code",
  link_url_paren: "[x](https://a.localhost/f(x)y) after",
  link_nested_bracket_url: "[a [b] c](https://x.localhost/z) d",
  url_in_text_bold: "see **https://a.localhost/foo** now",
  stream_open_bold: "This is **Important note about",
  stream_open_code: "Run `npm install foo",
  stream_open_link: "See [the docs](https://doc",
  stream_open_fence_quote: "> ```py\n> def foo(): return bar",
  stream_open_fence_list: "1. Step\n   ```bash\n   npm run build",
  stream_partial_fence_marker: "Text\n\n``",
  stream_star: "Text *",
  far_pair_bold: "2**3 is eight.\n\nLots of prose words here.\n\nAnd 4**2 is sixteen.",
  far_pair_tick: "a ` tick\n\nprose words here\n\nb ` tick",
  html_attr_gt: "<a title=\"x > y\">link words</a> after",
  html_inline_multiline: "<span\nclass=\"x\">text words</span>",
  comment_multiline: "<!--\nhidden words\n-->\nafter words",
  heading_hash_word: "#hashtag not heading",
  entity_named_letters: "&Auml;rger and caf&eacute;",
  entity_word_join: "na&iuml;ve",
  table_align: "| a | b |\n|:--|--:|\nfoo | bar",
  table_escaped_pipe_code: "| `a\\|b` | c |\n|---|---|\n| x | y |",
  quote_lazy: "> quoted\ncontinued lazy",
  setext_in_list: "- a\n  ---",
  link_with_bold_text: "[**bold** link](u)",
  autolink_ssh: "ssh://files.docs.localhost/pub",
  mailto: "mailto:a@b.co",
  file_url: "file:///Users/x/file.txt",
  url_with_trailing_star: "**see https://a.localhost**",
  url_underscore: "https://a.localhost/foo_bar_baz",
  www_bare: "www.docs.localhost/path_here",
  ipv4: "connect 127.0.0.1:8080",
  version: "v1.2.3-beta",
  hex: "color #ff00aa and 0xdeadbeef",
  cli_flag: "run --dry-run or -rf",
  dollar_words: "$total and ${count} and %value%",
  html_entity_nbsp_word: "a&nbsp;b",
  decomposed_start: "e\u0301tude",
  decomposed_cut: "re\u0301sume\u0301",
  hindi_long: "प्रधानमंत्री",
  emoji_skin: "👋🏽 hello",
  flag: "🇹🇷 Türkiye",
  math_parens: "\\(x + y\\) and \\[a^2\\]",
  dollar_money: "costs $5 and $10 total",
  math_inline_word: "$\\text{speed}$",
  nfd_tr: "Masau\u0308stu\u0308 c\u0327ic\u0327ekc\u0327i s\u0327ofo\u0308r ıg\u0306dır",
  nfd_sentence: "Yanıtı okurken go\u0308zu\u0308nu\u0308z kelimelerin bas\u0327ına odaklanır.",
  snake_private: "Rename _private_name and my_var_name now",
  snake_lead: "the _id field and item_id column",
  dunder: "Use __init__ and __name__ in foo_bar.py",
  snake_trailing: "call foo_ then bar_baz_",
  typical_reply: "I'll update `src/hooks/register.tsx` so the **AbovePrompt** band uses `useState`. Then run npm test in tests/reader.test.tsx and check max_output_lines.",
  heading_bold_suffix: "## **Step 1**s",
  table_bold: "| **Key** | Value |\n|---|---|\n| **API**s | many |",
  glob_cross_para: "Match src/**/*.ts files.\n\nMore text here.\n\n- list item words\n\nAnd **bold** here.",
  glob_alone: "Ignore **/node_modules and *.log files",
  glob_star_ts: "run on *.ts and *.tsx files",
  cross_heading_tick: "Use the ` mark.\n\n## Next heading words\n\nPress ` again.",
  nested_fence_indented: "```markdown\n- item\n    ```\n    code here\n    ```\n- more text\n```\nafter words",
  raw_line_kbd: "<kbd>Ctrl</kbd> copies the selected text",
  em_underscore_adjacent: "_foo_bar baz",
  bold_then_apos: "**Reader**'s answer",
  bold_colon: "**Note**: be careful",
  link_then_word: "[link](u)s and [x](y)ing",
  code_prefix: "`useState`Hook",
  quote_fence_closed: "> Intro words\n> ```js\n> const answer = compute(words)\n> ```\n> outro words",
  quote_fence_open: "> ```py\n> def foo(): return bar",
  quote2_fence: "> > ```\n> > deep code words\n> > ```\n> after",
  quote_fence_ends_with_quote: "> ```\n> code words\nplain words after quote",
  list_fence_deep: "- item\n\n  - sub item\n\n    ```sh\n    echo words here\n    ```\n\n  more words",
  list_marker_fence: "- ```js\n  const words = 1\n  ```\n- next item",
  num_list_fence: "1. First step:\n   ```bash\n   npm install words\n   ```\n2. Second step words",
  fence_four_space_closer: "```text\nlines of words\n    ```\nstill code words\n```\nafter words",
  fence_tilde_in_backtick: "```\n~~~\nwords inside\n~~~\n```\nafter",
  fence_unclosed_stream: "Intro words.\n\n```ts\nconst long = computeSomething(words",
  fence_empty: "```\n```\nafter words",
  fence_only_open: "```",
  fence_info_only: "```python",
  indented_code_after_heading: "# Title words\n    code words here\n\nafter words",
  indented_code_blank_between: "Intro words.\n\n    code one\n\n    code two\n\nafter words",
  indented_list_continuation: "- first item\n\n    continued paragraph words\n\n- second item",
  indented_nested_list: "- outer words\n\n    - inner words\n\n- next words",
  html_comment_multi: "<!--\nhidden words here\n-->\nvisible words",
  html_comment_blankline: "<!-- start\n\nhidden after blank\n-->\nvisible words",
  html_script: "<script>\nvar words = 1\n\nvar more = 2\n</script>\nafter words",
  html_style: "<style>\n.a { color: red }\n</style>\nafter words",
  html_br: "line one<br>line two<br/>line three",
  html_attr_quote_gt: "<a href=\"x\" title='a > b'>Linked words</a> after words",
  html_unclosed_tail: "Some words <span class=\"x",
  html_comment_unclosed: "Some words <!-- hidden words",
  html_inline_tags: "Use <b>bold</b> and <i>italic</i> and <code>code</code> words",
  html_generic_types: "Returns Array<string> or Map<string, number> values",
  html_declaration: "<!DOCTYPE html>\n<p>words</p>",
  html_cdata: "text <![CDATA[ some words ]]> text",
  html_pi: "text <?php echo words ?> text",
  html_block_with_markdown: "<div>\n\n**bold words** and plain words\n\n</div>",
  html_details: "<details>\n<summary>Show words</summary>\n\nHidden words here\n\n</details>\n\nAfter words",
  autolink_uri: "<https://docs.localhost/a_b> and <mailto:x@docs.localhost> and <ssh://docs.localhost/f>",
  autolink_email: "write <name@docs.localhost> soon",
  autolink_custom: "open <obsidian://vault/Note> words",
  url_http_inline: "see http://docs.localhost/path?q=a_b&r=2 now",
  url_https_trailing: "Visit https://docs.localhost/path, then https://docs.localhost/other.",
  url_ssh: "get ssh://files.docs.localhost/pub/file_name.tar.gz today",
  url_mailto: "contact mailto:team@docs.localhost today",
  url_file: "open file:///Users/name/My_File.txt today",
  url_www: "visit www.docs.localhost/some_path today",
  url_wrapped_bold: "**https://docs.localhost** and __https://docs.localhost/x__",
  url_after_colon: "see:https://docs.localhost now",
  url_in_link_text: "[https://docs.localhost](https://docs.localhost) words",
  url_angle_in_text: "words <https://docs.localhost/x_y> more words",
  link_empty_dest: "[words]() and [more words](<>)",
  link_title_single: "[text](u 'Some title here') after",
  link_title_paren: "[text](u (Some title here)) after",
  link_title_multiline: "[text](u\n\"Some title here\") after",
  link_dest_balanced: "[x](https://a.localhost/f(x(y))z) after words",
  link_dest_escaped: "[x](a\\)b) after words",
  link_unclosed_stream: "See [the docs](https://docs.localhost/very/lo",
  link_unclosed_text: "See [the docs and more",
  link_ref_full: "See [the guide][g] and [other thing][Other].\n\n[g]: https://docs.localhost\n[other]: https://docs.localhost/2",
  link_ref_shortcut_multi: "Read [Some Guide] now.\n\n[some   guide]: https://docs.localhost",
  link_ref_collapsed: "Read [guide][] now.\n\n[guide]: https://docs.localhost",
  link_ref_undefined: "Read [undefined label] now.",
  link_ref_def_title_next: "Read [guide] now.\n\n[guide]: https://docs.localhost\n  \"Some title words\"\n\nafter words",
  link_ref_def_angle: "Read [guide] now.\n\n[guide]: <https://docs.localhost/a b> 'Title words'",
  img_title: "![alt words](img.png \"Title words\") after",
  img_nested_alt: "![a [b] c](img.png) after",
  img_ref_full: "![alt words][logo] after\n\n[logo]: img.png",
  img_unclosed: "words ![alt words",
  footnote_def_body: "Text[^1] words.\n\n[^1]: Footnote body words here.",
  footnote_inline_label: "Claim[^long label] words\n\n[^long label]: Body words",
  task_checked: "- [x] done words\n- [ ] todo words\n- [X] big words",
  latex_inline_cmd: "Use \\alpha and \\beta plus \\frac{1}{2} words",
  latex_dollar: "Inline $a^2 + b^2 = c^2$ math words",
  latex_dollar_block_inline: "Display $$E = mc^2$$ words after",
  latex_block_lines: "Before words\n\n$$\n\\sum_{i=1}^{n} x_i\n\nmore math words\n$$\n\nAfter words",
  latex_block_unclosed: "Before words\n\n$$\n\\sum x_i words",
  latex_parens: "\\(x + y\\) and \\[a^2 + b^2\\] words",
  latex_unclosed_paren: "words \\(x + y words",
  latex_text_cmd: "$\\text{speed of light}$ words",
  money: "Costs $5 and $10 plus $3.50 words",
  money_range: "Between $5-$10 words",
  dollar_alone: "a $ b $ c words",
  dollar_digit_close: "$x$5 words",
  win_path: "C:\\Users\\name\\file.txt and D:\\Dev words",
  unc_path: "\\\\server\\share\\dir words",
  escape_star: "\\*literal\\* stars and \\_under\\_ words",
  escape_backtick: "a \\`not code\\` and words",
  escape_bracket: "\\[not link\\](words) here",
  escape_hash: "\\# not heading words",
  escaped_backslash: "a \\\\ b \\\\\\* words",
  entity_numeric: "caf&#233; and &#x41;bc words",
  entity_unknown_semicolon: "AT&T; and R&D; words",
  entity_amp_words: "Tom &amp; Jerry &lt;words&gt;",
  emph_star_multiword: "This has *some emphasized words* inside",
  emph_under_multiword: "This has _some emphasized words_ inside",
  emph_strong_star: "This has **some strong words** inside",
  emph_strong_under: "This has __some strong words__ inside",
  emph_triple: "This has ***really strong words*** inside",
  emph_nested: "**strong with *nested emphasis words* inside**",
  emph_adjacent_punct: "(**strong**), \"*em*\" and [**x**] words",
  emph_cross_line: "**strong words\nacross lines** and then words",
  emph_cross_line_unbalanced: "*start words\nmore words\n\nnew paragraph words",
  emph_unmatched_open_mid: "an *unmatched star then more words here\n\nnext paragraph words",
  emph_unmatched_close: "words here* and more words",
  emph_underscore_inside_word: "foo_bar_baz and snake_case_words here",
  emph_rule_of_three: "***a** b* and **a *b*** words",
  emph_four_stars: "****words**** and more words",
  emph_star_space: "a ** b ** c words",
  emph_stars_only: "***\n\n* * *\n\nwords",
  strike_words: "~~struck words here~~ and ordinary words",
  strike_adjacent: "~~a~~b and a~~b~~ words",
  mid_word_star: "un*frigging*believable words",
  star_after_url: "https://docs.localhost* words",
  tech_camel: "call useEffect and getElementById then JSON.parse words",
  tech_snake: "set max_output_lines and MAX_OUTPUT now",
  tech_path: "edit src/foo/bar.ts and ./hooks/register.tsx and ~/.config/settings.json",
  tech_domain: "visit docs.localhost and docs.example.co.uk today",
  tech_version: "needs v1.2.3 and 2.0.0-beta.1 and ES2015",
  tech_flags: "run --dry-run and -rf and --no-verify flags",
  tech_hex: "color #ff00aa and 0xdeadbeef and #123",
  tech_digits: "a1 b2c 3d x86_64 utf8 h264 words",
  tech_email: "mail me@docs.localhost and a.b+c@x.org words",
  tech_mention: "@someone said #topic words",
  tech_scope: "std::vector and Foo::bar words",
  tech_arrow: "a->b and x=>y and a=b words",
  tech_dotfile: ".gitignore and .editorconfig words",
  tech_abbrev: "e.g. this and i.e. that and U.S.A. words",
  tech_ellipsis: "wait...what and well... maybe words",
  tech_slash_words: "and/or either/or words",
  tech_percent: "100% sure and 50%off words",
  tech_ampersand: "Q&A and R&D and AT&T words",
  tech_braces: "{name} and {{var}} and ${item} words",
  tech_pipe_cmd: "cat file | grep words",
  tech_ordinal: "1st 2nd 3rd 21st words",
  cjk_zh: "这是一个测试句子，用于检查。",
  cjk_ja: "日本語のテキストです。カタカナも。",
  cjk_ko: "안녕하세요 세계 여러분",
  cjk_mixed: "使用 Reader Mode 来写 code and words",
  cjk_adjacent_latin: "Reader日本 and 日本Reader words",
  lao_khmer_myanmar: "ສະບາຍດີ សួស្តី မင်္ဂလာပါ",
  tibetan: "བཀྲ་ཤིས་བདེ་ལེགས",
  hindi: "प्रधानमंत्री नमस्ते दुनिया",
  greek_cyrillic: "Καλημέρα κόσμε Привет мир, как дела",
  german_long: "Donaudampfschifffahrtsgesellschaftskapitän fährt",
  turkish_dots: "İstanbul ılık ışık Iğdır çiçekçi",
  vietnamese: "Tiếng Việt rất đẹp và dễ học",
  emoji_adjacent: "great👍job and 🎉party words",
  emoji_zwj: "family 👨\u200d👩\u200d👧 here and 🏳️\u200d🌈 words",
  fullwidth_punct: "（括弧）と「引用」 and （words） here",
  combining_mark_alone: "word \u0301 words",
  zwsp_zwj: "zero\u200bwidth and join\u200dword words",
  nbsp_words: "non\u00a0breaking space words",
  bom_start: "\ufeffwords after bom",
  crlf: "First words here\r\n\r\n```js\r\ncode words\r\n```\r\n\r\nLast words here\r\n",
  hard_breaks: "line one  \nline two\\\nline three words",
  table_basic: "| Name | Value |\n|------|-------|\n| alpha | beta gamma |",
  table_aligned: "| a | b |\n|:--|--:|\nfoo words | bar words",
  table_escaped_pipe: "| a \\| b | c words |\n|---|---|\n| x | y |",
  table_bold_cells: "| **Key** words | Value |\n|---|---|\n| **API**s | many words |",
  quote_nested: "> outer words\n> > inner words\n> back words",
  quote_lazy_emph: "> *start words\nlazy words*",
  quote_list: "> - item words\n> - more words",
  quote_heading: "> # Heading words\n> body words",
  heading_atx_closing: "## Title words ##",
  heading_setext: "Title words\n===\n\nBody words\n---",
  heading_hash_no_space: "#hashtag not heading",
  list_nested_mixed: "1. one words\n   - sub words\n     1. deep words\n2. two words",
  list_star_bold: "* **Bold** item words\n* *Em* item words",
  list_loose: "- a words\n\n- b words\n\n      code words",
  list_ordered_paren: "1) first words\n2) second words",
  list_empty_item: "-\n- words",
  hr_variants: "words\n\n---\n\n***\n\n___\n\nwords",
  front_matter: "---\ntitle: test words\n---\nbody words",
  def_before_use: "[guide]: https://docs.localhost\n\nRead [guide] words",
  def_indented: "   [x]: https://y.localhost\n\nRead [x] words",
  def_in_para_not_def: "para words\n[x]: https://y.localhost\nmore words",
  stream_open_star: "Text *",
  stream_open_bold_empty: "Text **",
  stream_open_underscore: "Text _emph words",
  stream_open_code_double: "Run ``npm install `foo",
  stream_open_bracket: "See [link te",
  stream_open_image: "See ![alt te",
  stream_open_tag: "Press <kbd",
  stream_open_comment: "Hi <!-- hid",
  stream_open_math: "Euler $e^{i",
  stream_open_math_block: "Euler $$e^{i",
  stream_open_escape_math: "Euler \\(e^{i",
  stream_open_fence_marker: "Text\n\n``",
  stream_open_fence_tilde: "Text\n\n~~~py\nx = 1",
  stream_open_url: "See https://doc",
  stream_open_autolink: "See <https://doc",
  stream_trailing_newline_open: "This is **open words\n",
  stream_open_then_blank: "This is **open words\n\nnext paragraph words",
  stream_open_list: "- item *open words",
  stream_open_table: "| a | **b words",
  empty: "",
  spaces_only: "   \n  \n",
  one_letter: "a",
  one_word: "Reading",
  punct_only: "... --- *** ___ ```",
  digits_only: "123 456 7.8",
  table_code_across_cells: "| a | b |\n|---|---|\n| ` x | `code words` z |\n\nafter words",
  definition_over_lines: "[docs]:\nhttps://docs.localhost/guide\n\"Title words\"\n\nSee [docs] now.",
  definition_title_over_lines: "[docs]: https://docs.localhost \"Title\nmore words\"\n\nSee [docs] now.",
  definition_loose_title: "[docs]: https://docs.localhost\n(a parenthesis words)\n\nSee [docs] now.",
  angle_before_code: "Compare a <`> b` words here.",
  stream_newline_code: "Run `npm install foo\n",
  stream_newline_link: "See [the docs](https://doc\n",
  close_bracket_without_open: "Text](http://docs.localhost)x words",
  image_alt_code: "![``]()ç`` words",
  url_without_domain: "http://![ alt words]()",
  link_text_not_a_link: "[sample](<) and [text words](h g)",
  math_line_with_angle: "$$<$$\nnear > words",
  quote_tab: "> \tcode words",
  definition_like_then_fence: "Intro\n[s]:\n```\n\ncode words",
  list_html_lazy: "- <div>\nlazy words",
  quote_tag_lazy: "> quoted words\n<span>\nlazy words",
  tag_line_mid_paragraph: "Some `code\n<span>\nwords` here",
  one_line_display_math: "$$E = mc^2$$\nwords after it",
}

// Inputs with nothing in them to bold: they come back exactly as given, at every level.
const UNTOUCHED = ['arabic', 'hebrew', 'cjk', 'thai', 'korean', 'math_block', 'winpath', 'unclosed_tilde', 'emph_inside_word', 'img', 'img_ref', 'numbers_only', 'tab_code', 'fence_in_quote', 'intraword_underscore_bold', 'word_with_bold_mid', 'latex_block_brackets', 'link_def_indented', 'numbers_ordinal', 'zero_width', 'softhyphen', 'diff_block', 'strike_suffix', 'strong_in_em', 'em_in_strong', 'underscore_strong_in_em', 'star_word', 'html_div', 'html_div2', 'html_pre', 'html_table', 'stream_open_fence_quote', 'entity_word_join', 'autolink_ssh', 'mailto', 'file_url', 'url_with_trailing_star', 'url_underscore', 'www_bare', 'version', 'html_entity_nbsp_word', 'math_inline_word', 'heading_bold_suffix', 'em_underscore_adjacent', 'quote_fence_open', 'fence_only_open', 'fence_info_only', 'html_declaration', 'emph_nested', 'star_after_url', 'cjk_zh', 'cjk_ja', 'cjk_ko', 'lao_khmer_myanmar', 'tibetan', 'quote_lazy_emph', 'spaces_only', 'punct_only', 'digits_only']

test('the regressions give the exact output', () => {
  for (const [input, expected] of EXACT) {
    expect(bionic(input, 3)).toBe(expected)
    expect(bionic(expected, 3)).toBe(expected)
  }
})

test('levels give 1/1/2/2/3 letters for four-letter words and cap the bold run', () => {
  // Bold letters of a word of the given length, at levels 1 to 5.
  const heads: Record<number, number[]> = {
    1: [1, 1, 1, 1, 1],
    2: [1, 1, 1, 1, 1],
    3: [1, 1, 1, 1, 2],
    4: [1, 1, 2, 2, 3],
    5: [2, 2, 3, 3, 4],
    6: [2, 3, 3, 4, 5],
    7: [3, 3, 4, 5, 5],
    8: [3, 4, 4, 5, 6],
    9: [3, 4, 5, 6, 6],
    10: [3, 4, 5, 6, 6],
    12: [4, 5, 5, 6, 6],
    20: [4, 5, 5, 6, 6],
  }
  const letters = 'abcdefghijklmnopqrst'
  for (const [length, expected] of Object.entries(heads)) {
    const word = letters.slice(0, Number(length))
    LEVELS.forEach((level, k) => {
      const n = expected[k]!
      expect(bionic(word, level)).toBe(`**${word.slice(0, n)}**${word.slice(n)}`)
    })
  }
  expect(bionic('Reading', 1)).toBe('**Rea**ding')
  expect(bionic('Reading', 5)).toBe('**Readi**ng')
  for (const word of ['Okuma', 'Lectura', 'Leitura', 'Lesen', 'Lecture', 'Чтение']) {
    for (const level of LEVELS) expect(bionic(word, level)).toMatch(/^\*\*[^*]+\*\*[^*]*$/)
  }
  expect(bionic('word', 0)).toBe(bionic('word', 3))
  expect(bionic('word', 9)).toBe(bionic('word', 3))
  expect(bionic('word', 2.5)).toBe(bionic('word', 3))
})

test('decomposed text is cut at letters, not at combining marks', () => {
  for (const word of ['çiçekçi', 'gözünüz', 'Masaüstü', 'şoför', 'étude', 'résumé', 'ığdır']) {
    for (const level of LEVELS) {
      const composed = bionic(word.normalize('NFC'), level)
      const decomposed = bionic(word.normalize('NFD'), level)
      expect(decomposed.normalize('NFC')).toBe(composed)
      expect(decomposed.startsWith('**')).toBe(true)
    }
  }
  if (typeof Intl.Segmenter === 'function') {
    const out = bionic('प्रधानमंत्री नमस्ते', 3)
    const head = /^\*\*([^*]+)\*\*/.exec(out)?.[1] ?? ''
    expect(head.length).toBeGreaterThan(0)
    const parts = Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment('प्रधानमंत्री'), x => x.segment)
    const boundaries = parts.map((_, k) => parts.slice(0, k + 1).join(''))
    expect(boundaries).toContain(head)
  }
})

test('scripts that do not separate words are left as they are', () => {
  for (const text of ['这是一个测试句子，用于检查。', '日本語のテキストです。カタカナも。', '안녕하세요 세계 여러분', 'สวัสดีครับ', 'ສະບາຍດີ', 'សួស្តី', 'မင်္ဂလာပါ', 'བཀྲ་ཤིས', 'مرحبا بالعالم', 'שלום עולם']) {
    for (const level of LEVELS) expect(bionic(text, level)).toBe(text)
  }
  expect(bionic('使用 Reader Mode 来写', 3)).toBe('使用 **Rea**der **Mo**de 来写')
})

test('code, links, URLs, HTML, math and technical words stay as written', () => {
  for (const name of UNTOUCHED) {
    const input = ADVERSARIAL[name]
    expect(input).toBeDefined()
    for (const level of LEVELS) expect(bionic(input!, level)).toBe(input!)
  }
})

test('fences are never touched, nor are blocks that look like them', () => {
  // [whole block, the part that must come back exactly]
  const fenced: Array<[string, string]> = [
    ['```js\nconst words = 1\n```', '```js\nconst words = 1\n```'],
    ['> ```js\n> const words = 1\n> ```', '> ```js\n> const words = 1\n> ```'],
    ['> > ```\n> > deep words\n> > ```', '> > ```\n> > deep words\n> > ```'],
    ['- ```js\n  const words = 1\n  ```', '- ```js\n  const words = 1\n  ```'],
    ['1. Step:\n   ```bash\n   npm install words\n   ```', '   ```bash\n   npm install words\n   ```'],
    ['~~~\nwords here\n~~~', '~~~\nwords here\n~~~'],
    ['````\nwords\n```\nstill words\n````', '````\nwords\n```\nstill words\n````'],
    ['```text\nlines of words\n    ```\nstill words\n```', '```text\nlines of words\n    ```\nstill words\n```'],
    ['```ts\nconst unfinished = words', '```ts\nconst unfinished = words'],
    ['> ```ts\n> const unfinished = words', '> ```ts\n> const unfinished = words'],
    ['    indented words\n\n    more words', '    indented words\n\n    more words'],
    ['\twords after a tab', '\twords after a tab'],
  ]
  for (const [block, kept] of fenced) {
    for (const level of LEVELS) expect(bionic(block, level)).toContain(kept)
    const out = bionic(`Before words\n\n${block}`, 3)
    expect(out.startsWith('**Bef**ore **wor**ds\n\n')).toBe(true)
    expect(out).toContain(kept)
  }
})

test('link destinations, reference labels and footnotes keep working', () => {
  // [input, the part that must come back exactly]
  const links: Array<[string, string]> = [
    ['[docs](https://docs.localhost/a_(b) "Title words")', '](https://docs.localhost/a_(b) "Title words")'],
    ['[docs](<path with spaces.md>)', '](<path with spaces.md>)'],
    ['[a](https://docs.localhost/f(x)y)', '](https://docs.localhost/f(x)y)'],
    ['![alt words](img.png "Title words")', '![alt words](img.png "Title words")'],
    ['<https://docs.localhost/a_b>', '<https://docs.localhost/a_b>'],
    ['[a][ref] and [ref] and [ref][]\n\n[ref]: https://docs.localhost "Title words"', '[ref][]\n\n[ref]: https://docs.localhost "Title words"'],
    ['note[^1]\n\n[^1]: Footnote words', '[^1]\n\n[^1]: Footnote words'],
  ]
  for (const [input, kept] of links) {
    for (const level of LEVELS) {
      const out = bionic(input, level)
      expect(insertedPairs(input, out)).toBeGreaterThanOrEqual(0)
      expect(out).toContain(kept)
    }
  }
  expect(bionic('See [docs] here.\n\n[docs]: https://docs.localhost', 3)).toBe('**S**ee [docs] **he**re.\n\n[docs]: https://docs.localhost')
  expect(bionic('[link](https://docs.localhost/path)', 3)).toBe('[**li**nk](https://docs.localhost/path)')
})

test('a word touching existing emphasis is left alone', () => {
  for (const input of ['the **API**s', 'pre**bold**post', '~~del~~eted', 'un*frigging*believable', '**a**b **c**d', '_x_y z', '__a__b c']) {
    const out = bionic(input, 3)
    expect(runs(out)).toBe(runs(input))
    expect(bionic(out, 3)).toBe(out)
  }
})

test('output is the input plus whole bold pairs, and bolding twice changes nothing', () => {
  const names = Object.keys(ADVERSARIAL)
  expect(names.length).toBeGreaterThanOrEqual(150)
  for (const name of names) {
    const input = ADVERSARIAL[name]!
    for (const level of LEVELS) {
      const out = bionic(input, level)
      expect(`${name} L${level} ${insertedPairs(input, out) >= 0}`).toBe(`${name} L${level} true`)
      expect(`${name} L${level} ${bionic(out, level) === out}`).toBe(`${name} L${level} true`)
      expect(runs(out)).toBeLessThanOrEqual(runs(input))
    }
  }
})

test('every prefix of a reply streaming in is safe', () => {
  const replies = [
    'Here is **important** text, `code` and a [link](https://docs.localhost/a_(b) "Title") plus https://docs.localhost/x_y.\n\n```ts\nconst answer = compute(words)\n```\n\n> Quote with *emphasis* and [ref].\n\n- item one\n- item **two**\n\n[ref]: https://docs.localhost',
    'Ein Satz über **Größe** und `Code`. Cümle: gözünüz çiçekçi **kalın** yazı.\n\n$$\nx = y\n$$\n\n| a | b |\n|---|---|\n| c | d |',
  ]
  for (const reply of replies) {
    for (let end = 0; end <= reply.length; end++) {
      const prefix = reply.slice(0, end)
      const out = bionic(prefix, 3)
      expect(insertedPairs(prefix, out)).toBeGreaterThanOrEqual(0)
      expect(bionic(out, 3)).toBe(out)
      expect(runs(out)).toBeLessThanOrEqual(runs(prefix))
    }
  }
  expect(bionic('This is **Important note about', 3)).not.toContain('****')
  expect(bionic('Run `npm install foo', 3)).toBe('**R**un `npm install foo')
})

test('size limits: oversized input comes back as given, output stays under the cap', () => {
  const oversized = 'a '.repeat(48000)
  expect(bionic(oversized, 3)).toBe(oversized)
  const line = '- item words here\n'
  const long = line.repeat(Math.floor(94000 / line.length))
  const out = bionic(long, 3)
  expect(out.length).toBeLessThanOrEqual(95000)
  expect(out.length).toBeGreaterThan(long.length)
  expect(out.startsWith('- **it**em **wor**ds **he**re\n')).toBe(true)
  expect(bionic(out, 3)).toBe(out)
  const prose = 'Reading words here. '.repeat(1300)
  expect(bionic(prose, 3)).toContain('**Read**ing')
})

test('speed: no quadratic cases, ordinary replies are quick', () => {
  const timed = (text: string) => {
    const start = performance.now()
    bionic(text, 3)
    return performance.now() - start
  }
  expect(timed('_a'.repeat(40000))).toBeLessThan(500)
  expect(timed('*a'.repeat(40000))).toBeLessThan(500)
  expect(timed('**word '.repeat(12000))).toBeLessThan(500)
  expect(timed('](x word '.repeat(10000))).toBeLessThan(500)
  expect(timed('[x](< '.repeat(15000))).toBeLessThan(500)
  expect(timed('![a ](b '.repeat(10000))).toBeLessThan(500)
  expect(timed('<a '.repeat(30000))).toBeLessThan(500)
  expect(timed('$a '.repeat(30000))).toBeLessThan(500)
  expect(timed('[a '.repeat(30000))).toBeLessThan(500)
  expect(timed('- '.repeat(20000))).toBeLessThan(500)
  expect(timed('* '.repeat(20000))).toBeLessThan(500)
  expect(timed('- '.repeat(40000) + 'x')).toBeLessThan(500)
  expect(timed('* '.repeat(40000) + 'x')).toBeLessThan(500)
  const ladder = Array.from({ length: 12000 }, (_, i) => '`'.repeat((i % 7) + 1) + 'a').join(' ')
  expect(timed(ladder)).toBeLessThan(500)
  const reply = 'The quick brown fox jumps over the lazy dog, but `code` and [links](https://docs.localhost/x) stay put. '.repeat(200)
  expect(reply.length).toBeGreaterThan(20000)
  expect(timed(reply)).toBeLessThan(100)
})

test('a crowd of link-like text does not wear out the link scan', () => {
  // Thousands of `](` in one paragraph used to use up a scan budget, after which a real link lost its protection.
  const crowded = ']('.repeat(15000) + ' see [link](docs "Some title") words'
  const start = performance.now()
  const out = bionic(crowded, 3)
  expect(performance.now() - start).toBeLessThan(500)
  expect(out.endsWith(' **s**ee [**li**nk](docs "Some title") **wor**ds')).toBe(true)
})

test('the cache is bounded and returns what a fresh run would', () => {
  const texts = Array.from({ length: 100 }, (_, i) => `Reply number ${i}: ` + 'some plain words here. '.repeat(500))
  const first = texts.map(text => bionic(text, 3))
  texts.forEach((text, i) => {
    expect(bionic(text, 3)).toBe(first[i]!)
    expect(bionic(text, 3)).toContain('**Rep**ly')
  })
  expect(bionic(texts[0]!, 1)).not.toBe(bionic(texts[0]!, 5))
})
