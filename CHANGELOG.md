# Changelog

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
