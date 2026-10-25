# Changelog

## 1.1.0

- A quieter band: `[x] ADHD Reader  - Medium 3/5    +  Easier reading`. While the reader is off it shows only `[ ] ADHD Reader`.
- The band picks the fullest layout that fits the terminal, in every language, so it no longer runs past the edge on narrow windows.
- The band's letter keys (t, l, m) are gone. Press ctrl+x, then Tab, to reach the band; Tab moves, Enter presses, Esc goes back. The introduction and `/adhd-reader help` now say so.
- Any level change, from the band or the command, switches the reader on.
- Two quick presses in a row both count; before, one could be lost.
- The preview shows two words that look different at every level.
- With `showBand` off, the prompt footer shows `adhd 3/5` while the reader is on.
- An argument it does not know now says what was wrong and lists the valid choices.
- Full-width input such as `３` or `ＯＮ` works, and the `language` option also takes locale names such as `pt_BR.UTF-8`.
- File patterns such as `src/*.ts` and `__init__.py` are no longer bolded inside.
- Words glued to code or a link, such as `` `npm`'i `` or `[Ali](...)'nin`, and names like `URLSession` or `OAuth` are no longer bolded. A task item that starts with a code block is no longer bolded inside.
- Long replies cost far less while they stream (about 6x less work for a 50,000 character reply), also when several replies stream at once, and finished replies stay cached.
- Long nested lists no longer slow down: a case that took 3 seconds now takes 3 milliseconds.
- A reply cut in the middle of an emoji while streaming no longer bolds the word before it.
- Cleaner code and a test suite about three times faster.

## 1.0.6

- Your on/off and level choice is kept after `/clear`, `/resume` and `/branch`. Before, those commands switched the reader back on at level 3.
- With two sessions open, a change in one builds on what the other saved instead of undoing it.
- No more literal `**` in replies that compare values with `<` and `>`, or that mix single and double backticks.
- Code blocks that start a numbered list item, or follow a lone tag line or a `[label]:` line, are no longer bolded inside.
- An escaped emoji no longer garbles the bold words before it.
- The introduction waits for the terminal or the Desktop app instead of being used up where it cannot be shown.
- The `/config` help for `language` now says Auto uses English in every language.
- README: minimum Claude Code version is 2.1.289; notes on the stable channel and where the plugin does not draw.

## 1.0.5

- Links with any scheme (for example `ssh://`) are now left as written, not only `http`, `https` and `ftp`.
- Test fixtures use local host names only.

## 1.0.4

- Documentation, support, privacy and terms links in the plugin manifest.

## 1.0.3

- Test fixtures no longer use environment-variable-like or credential-like sample text. No change to the plugin's behavior.

## 1.0.2

- No longer reads Claude Code's settings. The interface language comes only from the plugin's own `language` option in `/config`; Auto means English.

## 1.0.1

- The `language` setting is now free text instead of a fixed list. Type a language name (English or in the language itself) or a code such as `tr` or `pt-BR`; case and accents do not matter. Auto, empty or unknown follows the Claude Code `language` setting, then English. Turkmen is no longer mistaken for Turkish.
- No longer reads system locale environment variables (`LANG`, `LANGUAGE`, `LC_ALL`, `LC_MESSAGES`). Auto now uses only the Claude Code `language` setting, then English.
- README: new "What it changes" section listing every hook the plugin registers and what each does.

## 1.0.0

First public release.

- Bolds the first letters of each word in replies, shown in the transcript.
- Five intensity levels (1 to 5), default 3.
- A band above the prompt to switch it on or off and adjust the level.
- Slash command `/adhd-reader` with `on`, `off`, `toggle`, `status`, `help` and `1` to `5`. Running it with no argument toggles; setting a level also switches it on.
- Settings (on or off, level) are remembered between sessions.
- A short one-time introduction the first time it is enabled.
- Interface available in English, Türkçe, Español, Português (Brasil), Deutsch, Français, Русский, 日本語 and 简体中文. Choose it in `/config` (default: Auto).
- `showBand` setting in `/config` to hide the band.
- Runs locally, makes no network requests and collects no data.
