# ChatFlow — Tailwind Chat UI Template

A polished, dark-mode chat interface template built with **Vite + Tailwind CSS v4**. No backend, no database — pure frontend.

## Stack

- **Vite 6** — dev server & build tool
- **Tailwind CSS v4** — utility-first styling (via `@tailwindcss/vite` plugin)
- Vanilla JS (no framework)

## Running locally

```bash
npm install
npm run dev        # http://localhost:5000
npm run build      # outputs to dist/
npm run preview    # preview the production build
```

## Project structure

```
index.html          # Full chat UI markup (app shell)
pages/              # 16 secondary pages (dm, threads, calls, settings, invite, 404, …)
src/
  style.css         # Tailwind import + component styles (tabs, tooltips, skeletons, RTL…)
js/
  app.js            # Entry — imports the modules below, page-level wiring
  theme.js          # Dark/Light + RTL toggle, persisted in localStorage
  components.js     # Toasts, modals, offcanvas, dropdowns, tabs, accordion, context menu
  interactions.js   # Pickers, lightbox, thread panel, media players, command palette,
                    #   filters/sort/pagination, form validation, skeleton demos
```

## Theming (Light + Dark)

Dark mode is the **default**. Light mode is implemented in [src/style.css](src/style.css)
by re-mapping the Tailwind v4 `--color-slate-*` palette variables under
`html:not(.dark)` with a symmetric luminance flip (950↔50 … 500 fixed). Because every
colour utility (bg/text/border/ring/gradient/opacity) and all JS-generated components
resolve to `var(--color-slate-*)`, this themes the **entire template with no markup
changes** and identical contrast relationships.

- **Persistence + system detection:** [js/theme.js](js/theme.js) saves the choice in
  `localStorage['nexus-theme']`; on first visit it follows the OS (`prefers-color-scheme`),
  defaulting to dark unless the system explicitly prefers light. A tiny inline script in
  each page `<head>` applies the class before first paint (no flash).
- **Controls:** the icon-rail sun/moon button (`toggleDark()`), and the Settings →
  Appearance radio cards (`dark` / `light` / `system`, wired via `NexusTheme.setTheme`).
- **Always-dark regions:** decorative full-bleed banners / media scrims that carry white
  text (welcome hero, 404, maintenance, gallery overlays) use the `.force-dark` utility to
  pin the dark palette in both themes.

## Appearance settings (Settings → Appearance)

[js/settings.js](js/settings.js) is a central preferences engine imported by app.js, so
the saved choices apply on **every** page. State persists to `localStorage['nexus-settings']`
and is applied by writing attributes/vars on `<html>` (turned into styling by
[src/style.css](src/style.css)); an inline `<head>` script re-applies them before first paint.

| Option | Mechanism (instant, template-wide) |
|--------|------------------------------------|
| Theme (Light/Dark/System) | `theme.js` — see Theming above |
| Accent colour (6) | `data-accent` remaps the whole `--color-violet-*` scale |
| Font size (12–20px) | inline `html { font-size }` scales all rem utilities |
| Message density | `data-density` → chat row spacing |
| Sidebar (expanded/collapsed) | `data-sidebar` collapses `[data-app-sidebar]` |
| Layout (full/centered) | `data-layout` constrains `[data-app-main]` |
| Reduce motion | `data-reduce-motion` disables animations/transitions |
| Animated emoji / Emoji style / Language | persisted flags (`data-*` / `lang`) |
| RTL | `theme.js` `toggleDir()` |

**Reset to Defaults** (`data-settings-reset`) clears the store and restores theme/dir too.
API: `window.NexusSettings.{get,set,reset}`.

## Interactive components (all frontend-only)

Everything is driven by `data-*` attributes so one `<script type="module" src="/js/app.js">`
wires behaviour across every page. No backend, no build-time JS required.

| Behaviour | Hook |
|-----------|------|
| Dropdown (one at a time, click-outside, Esc) | `data-dropdown-trigger="id"` + `#id[data-dropdown]` |
| Modal (multi-trigger, backdrop, Esc) | `openModal('id')` / `data-modal-close` |
| Offcanvas / drawer | `openOffcanvas('id')` / `closeOffcanvas('id')` |
| Tabs | `data-tab="panelId"` + `data-tab-group` |
| Accordion | `data-accordion-trigger="id"` |
| Context menu (right-click) | on `.message-row`, or `showContextMenu(items,x,y)` |
| Toast | `NexusComponents.toast(msg, type)` |
| Theme / RTL toggle | `NexusTheme.toggleDark()` / `toggleDir()` |
| Emoji / GIF / Sticker picker | `data-picker="emoji\|gif\|sticker"` (+`data-picker-target`) |
| File picker + attachment chips | `data-file-trigger` (+`data-attachments`) |
| Image lightbox / gallery | `data-lightbox` (+`data-lightbox-group`, `data-caption`) |
| Audio / video player (sample media) | `data-media-open="video\|audio"` |
| Thread panel (slide-in) | `data-thread-open` / `data-thread-close` + `#thread-panel` |
| Command palette (⌘/Ctrl+K) | automatic, or `data-command-open` |
| Search / filter list | `data-filter-scope` + `data-filter-input` + `data-filter-item` (+`data-filter-select`) |
| Sort list | `data-sort` / `data-sort-select` + `data-sort-list` + `data-sort-item` |
| Pagination | `data-paginate="N"` + `data-page-item` |
| Form validation | `<form data-validate>` + `data-rule="required\|email\|min:n\|match:sel"` |
| Skeleton / empty-state demo | `data-skeleton-toggle="id"` |
| Copy to clipboard | `data-copy="text"` |

## Features

- **Left sidebar** — conversation list with unread badges, online indicators, search bar, nav tabs (All / Unread / Groups)
- **Main chat area** — message bubbles (incoming/outgoing), date dividers, file attachment card, typing indicator, auto-scrolling
- **Right panel** — contact profile, shared files list, mute toggle
- **Interactive** — type a message and press Enter; Alice will "reply" after a short delay with a typing animation
- **Input** — auto-growing textarea, emoji / attachment / send buttons

## User preferences

- Tailwind CSS frontend only (no backend, no database)
