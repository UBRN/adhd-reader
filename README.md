# ADHD Reader

Bolds the first letters of each word in Claude's replies so text is easier to scan.

## Install

Inside Claude Code:

```
/plugin marketplace add UBRN/adhd-reader
/plugin install adhd-reader@adhd-reader
```

Or in one command:

```
/plugin install adhd-reader --marketplace UBRN/adhd-reader
```

Or from a terminal:

```
claude plugin marketplace add UBRN/adhd-reader
claude plugin install adhd-reader@adhd-reader
```

Then run `/reload-plugins` or start a new session.

## Use

A band above the prompt shows the current state. Use it to switch the reader on or off and to raise or lower the level.

The `/adhd-reader` command does the same from the keyboard:

```
/adhd-reader          toggle on or off
/adhd-reader on
/adhd-reader off
/adhd-reader toggle
/adhd-reader status
/adhd-reader help
/adhd-reader 1-5      set the level (1 is light, 5 is strong)
```

Setting a level also switches the reader on. Your choice is remembered between sessions. `/okuma` is a Turkish alias; it is listed in the command menu only when the interface language is Türkçe.

## Settings

Open `/config` to change:

- `language`: free text. Type a language name (English, Türkçe, Español, Português (Brasil), Deutsch, Français, Русский, 日本語, 简体中文) or a code (en, tr, es, pt-BR, de, fr, ru, ja, zh-Hans). Case and accents do not matter. Auto, empty or anything unknown means English.
- `showBand`: show or hide the band above the prompt.

## Requirements

Claude Code 2.1.287 or newer, in the terminal or in the Code tab of the Desktop app. Mods are enabled by default from that version.

## What it changes

The plugin registers six hooks. Each one is listed here with the event it uses:

- `ui.render` on the reply component: rewrites only how Claude's replies are drawn on screen, bolding the first letters of each word. The stored conversation and what is sent to the model are unchanged.
- `ui.render` on the area above the prompt: draws the band with the on/off switch, the level controls and a preview word, and keeps whatever else is drawn there.
- `session.start`: registers the `/adhd-reader` command and the `/okuma` alias, restores your saved on/off and level choice, shows a one-time introduction message.
- `command.run`: handles `/adhd-reader` and `/okuma`. It answers with a short on-screen message and adds nothing to the conversation.
- `command.describe`: translates the description and argument hint of its own two commands, and hides `/okuma` unless the interface language is Türkçe.
- `config.describe`: translates the labels and descriptions of its own two `/config` rows, `language` and `showBand`.

It changes nothing else: no other command, setting, instruction, tool description or plugin.

## Privacy

Everything runs locally. The plugin makes no network requests and collects or sends no data. It does not read environment variables, Claude Code settings or credentials; the interface language comes only from its own `language` option.

## Notes

This is a display aid only, not a medical device, and research has not shown a reliable reading speed benefit. It has no effect on languages written without spaces between words, such as Chinese and Japanese, although the interface is still translated.

Bionic Reading is a registered trademark of BRCG Casutt GmbH. This project is not affiliated with it.

## License

MIT
