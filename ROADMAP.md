# JoyPro Timer — Roadmap

## Now
_What's actively being worked on._

- [ ] Sound library: wire up `sound-store.js` + `sound-library.js` — custom sound selection persisting correctly across saves
- [x] Code audit fixes (June 2026): editor progress reset, duplicate rename, timer-edit duration rewrite, escHtml quote escaping + import sanitization, contrast (`--on-accent`, darker muted), focus-visible styles, touch targets, aria-labels, SVG icons replacing emoji, dead code removal, bonsai per-frame caching

---

## Next
_Queued up and ready to start once Now clears._

- [ ] Panel redesign / popout UI (branch: `feature/panel-redesign-popout`)

---

## P1 — High priority backlog
_Important, but not started yet._

- [ ] (empty — add items here)

---

## P2 — Normal backlog
_Good ideas with no urgent timeline._

- [ ] Decide on canonical segment-editing surface — inline dblclick, pencil popover, and full editor modal overlap; audit traced two bugs to the redundancy
- [ ] Modal focus management — focus trap + focus restore on close, `role="dialog"`/`aria-modal` (aria-labels done, deeper modal semantics not yet)

---

## P3 — Low priority / nice-to-have
_Defer unless it's a slow week._

- [ ] (empty — add items here)

---

## Someday / Maybe
_No commitment. Park ideas here rather than losing them._

- [ ] ES module conversion — deliberately skipped for now: app must keep working when `index.html` is opened over `file://` (no build step), which ES modules don't support

---

> **Reminder:** Before pushing to git, check in with the user — don't push automatically.
