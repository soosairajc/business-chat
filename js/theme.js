/**
 * theme.js — Dark/Light mode & RTL toggle
 * Import this in every page.
 */

const ROOT = document.documentElement;

// ─── Initialise ───────────────────────────────────────────────
(function init() {
  // Dark mode
  const savedTheme = localStorage.getItem('nexus-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
  setDark(isDark, false);

  // RTL
  const savedDir = localStorage.getItem('nexus-dir') || 'ltr';
  setDir(savedDir, false);
})();

// ─── Dark mode ────────────────────────────────────────────────
export function setDark(dark, save = true) {
  if (dark) {
    ROOT.classList.add('dark');
  } else {
    ROOT.classList.remove('dark');
  }
  if (save) localStorage.setItem('nexus-theme', dark ? 'dark' : 'light');
  updateThemeButtons(dark);
}

export function toggleDark() {
  const isDark = ROOT.classList.contains('dark');
  setDark(!isDark);
}

function updateThemeButtons(dark) {
  document.querySelectorAll('[data-theme-icon]').forEach(el => {
    el.textContent = dark ? 'sun' : 'moon';
    el.setAttribute('data-tooltip', dark ? 'Light mode' : 'Dark mode');
  });
  if (window.lucide) lucide.createIcons();
}

// ─── RTL ──────────────────────────────────────────────────────
export function setDir(dir, save = true) {
  ROOT.setAttribute('dir', dir);
  if (save) localStorage.setItem('nexus-dir', dir);
  document.querySelectorAll('[data-dir-icon]').forEach(el => {
    el.textContent = dir === 'rtl' ? 'align-left' : 'align-right';
  });
  if (window.lucide) lucide.createIcons();
}

export function toggleDir() {
  const current = ROOT.getAttribute('dir') || 'ltr';
  setDir(current === 'rtl' ? 'ltr' : 'rtl');
}

// ─── Expose globally ──────────────────────────────────────────
window.NexusTheme = { setDark, toggleDark, setDir, toggleDir };
