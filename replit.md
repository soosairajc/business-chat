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
index.html        # Full chat UI markup
src/
  style.css       # Tailwind import + custom scrollbar styles
  main.js         # Interactive message sending & simulated replies
```

## Features

- **Left sidebar** — conversation list with unread badges, online indicators, search bar, nav tabs (All / Unread / Groups)
- **Main chat area** — message bubbles (incoming/outgoing), date dividers, file attachment card, typing indicator, auto-scrolling
- **Right panel** — contact profile, shared files list, mute toggle
- **Interactive** — type a message and press Enter; Alice will "reply" after a short delay with a typing animation
- **Input** — auto-growing textarea, emoji / attachment / send buttons

## User preferences

- Tailwind CSS frontend only (no backend, no database)
