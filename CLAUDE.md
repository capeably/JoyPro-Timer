# JoyPro Timer — Project Context

## What this is
A web-based focus timer app (Pomodoro-style). Users run structured work sessions made of segments (e.g. "Set Intentions → Focus Block → Break → Focus Block → Wrap Up"). The UI is clean and opinionated: one session runs at a time, themes change the visual feel, and custom sounds mark segment transitions.

## Tech stack
- Vanilla JS (no framework, no build step)
- Plain CSS (tokens/design system in `css/tokens.css`)
- Single-page app served directly from `index.html`
- State persisted to `localStorage`

## Key files
| File | Role |
|---|---|
| `index.html` | App shell and all markup |
| `js/state.js` | App state, localStorage keys, default sessions |
| `js/app.js` | Timer engine and main orchestration |
| `js/editor.js` | Session editor modal (add/remove/reorder segments) |
| `js/inline-edit.js` | Click-to-edit segment titles in the timer |
| `js/audio.js` | Sound playback logic |
| `js/sound-library.js` | Sound library browser/picker |
| `js/sound-store.js` | Sound persistence (new, replaces legacy `joypro_custom_sounds`) |
| `js/themes.js` | Theme switching |
| `js/ui.js` | UI helpers (progress bar, overlays, etc.) |
| `js/onboarding.js` | First-run onboarding flow |
| `js/dialogs.js` | Shared dialog/modal utilities |
| `js/popout.js` | Popout window (mini timer) |
| `css/tokens.css` | Design tokens (colors, spacing, fonts) |
| `css/layout.css` | App layout |
| `css/timer.css` | Timer display and controls |
| `css/modals.css` | Modal and panel styles |

## Preferences & workflow rules

**Never push to git unless the user explicitly asks.**
The user controls when code is pushed to remote. After making changes, only commit if asked. Only push (or even suggest pushing) when the user says "push to git" or equivalent.

## Fonts
- Abhaya Libre (600) — decorative/display
- DM Mono — monospace (timer digits)
- Rethink Sans — UI body text
