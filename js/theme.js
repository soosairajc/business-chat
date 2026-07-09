/**
 * theme.js — Dark/Light mode & RTL toggle
 * Import this in every page.
 */

const ROOT = document.documentElement;

// ─── Initialise ───────────────────────────────────────────────
(function init() {
  // Dark mode — Dark is the default. On first visit we honour the system
  // preference, but only an explicit "light" system setting yields light;
  // no-preference / dark → dark. (Kept identical to the inline no-FOUC
  // snippet in each page <head> so there is never a post-load flip.)
  const savedTheme = localStorage.getItem('nexus-theme');
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  const isDark = savedTheme ? savedTheme === 'dark' : !prefersLight;
  setDark(isDark, false);

  // React to OS theme changes while the user hasn't chosen explicitly.
  window.matchMedia('(prefers-color-scheme: light)').addEventListener?.('change', e => {
    if (!localStorage.getItem('nexus-theme')) setDark(!e.matches, false);
  });

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

// ─── Explicit choice: 'dark' | 'light' | 'system' ─────────────
export function setTheme(mode) {
  if (mode === 'system') {
    localStorage.removeItem('nexus-theme');
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    setDark(!prefersLight, false);
  } else {
    setDark(mode === 'dark', true);
  }
  syncThemeControls();
}

function currentMode() {
  return localStorage.getItem('nexus-theme') || 'system';
}

// Keep any theme radio-cards (settings page) in sync with the active choice.
function syncThemeControls() {
  const mode = currentMode();
  document.querySelectorAll('input[name="theme"]').forEach(radio => {
    const active = radio.value === mode;
    radio.checked = active;
    const card = radio.closest('label')?.querySelector('.theme-card');
    if (!card) return;
    card.classList.toggle('border-violet-500', active);
    card.classList.toggle('border-slate-700', !active);
    let badge = card.querySelector('[data-theme-check]');
    if (active && !badge) {
      badge = document.createElement('div');
      badge.setAttribute('data-theme-check', '');
      badge.className = 'absolute top-2 right-2 w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center';
      badge.innerHTML = '<i data-lucide="check" class="w-2.5 h-2.5 text-white"></i>';
      card.appendChild(badge);
    } else if (!active && badge) {
      badge.remove();
    }
  });
  if (window.lucide) lucide.createIcons();
}

// Wire the settings radio-cards.
document.addEventListener('change', e => {
  if (e.target.matches?.('input[name="theme"]')) setTheme(e.target.value);
});

function updateThemeButtons(dark) {
  // Lucide swaps <i data-lucide> for an <svg>, so we replace the node with a
  // fresh <i> carrying the new icon name and let createIcons() re-render it.
  const iconName = dark ? 'sun' : 'moon';
  document.querySelectorAll('[data-theme-icon]').forEach(el => {
    const fresh = document.createElement('i');
    fresh.setAttribute('data-lucide', iconName);
    fresh.setAttribute('data-theme-icon', '');
    // Preserve sizing/utility classes from the previous icon node.
    if (el.className) fresh.className = el.className;
    el.replaceWith(fresh);
  });
  document.querySelectorAll('[data-theme-label]').forEach(el => {
    el.textContent = dark ? 'Light mode' : 'Dark mode';
  });
  // Reflect state on any checkbox/switch bound to the theme.
  document.querySelectorAll('[data-theme-switch]').forEach(el => { el.checked = dark; });
  if (window.lucide) lucide.createIcons();
  syncThemeControls();
}

// ─── RTL ──────────────────────────────────────────────────────
export function setDir(dir, save = true) {
  ROOT.setAttribute('dir', dir);
  if (save) localStorage.setItem('nexus-dir', dir);
  document.querySelectorAll('[data-dir-icon]').forEach(el => {
    el.textContent = dir === 'rtl' ? 'align-left' : 'align-right';
  });
  // Reflect the RTL switch on the settings page.
  const rtlBtn = document.getElementById('rtl-toggle');
  if (rtlBtn) {
    const on = dir === 'rtl';
    rtlBtn.setAttribute('aria-checked', String(on));
    rtlBtn.classList.toggle('bg-violet-600', on);
    rtlBtn.classList.toggle('bg-slate-700', !on);
    const thumb = document.getElementById('rtl-thumb');
    thumb?.classList.toggle('translate-x-6', on);
    thumb?.classList.toggle('translate-x-1', !on);
  }
  if (window.lucide) lucide.createIcons();
}

export function toggleDir() {
  const current = ROOT.getAttribute('dir') || 'ltr';
  setDir(current === 'rtl' ? 'ltr' : 'rtl');
}

// ─── Expose globally ──────────────────────────────────────────
window.NexusTheme = { setDark, toggleDark, setTheme, setDir, toggleDir };
