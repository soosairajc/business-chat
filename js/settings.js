/**
 * settings.js — Central appearance/preferences engine (frontend-only).
 *
 * A single source of truth for every Appearance option. Imported by app.js so
 * the saved preferences are applied on EVERY page. Persists to
 * localStorage['nexus-settings']; theme + RTL stay owned by theme.js and are
 * only reflected here.
 *
 * Settings are applied by writing attributes / vars on <html>, which CSS in
 * style.css turns into template-wide styling:
 *   data-accent        → remaps the whole --color-violet-* scale (accent colour)
 *   font-size (inline) → scales every rem-based utility
 *   data-density       → message row spacing
 *   data-sidebar       → collapse the secondary sidebar ([data-app-sidebar])
 *   data-layout        → centre / full-width main ([data-app-main])
 *   data-reduce-motion → kills animations & transitions
 *   data-animated-emoji / data-emoji-style / lang → persisted flags
 */

const KEY = 'nexus-settings';

const DEFAULTS = {
  accent: 'violet',
  fontSize: 16,
  density: 'comfortable',
  sidebar: 'expanded',
  layout: 'default',
  reduceMotion: false,
  animatedEmoji: true,
  emojiStyle: 'native',
  language: 'en',
};

const ACCENTS = ['violet', 'blue', 'emerald', 'rose', 'amber', 'sky'];

function load() {
  try { return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY)) || {}) }; }
  catch { return { ...DEFAULTS }; }
}

let state = load();

function save() { localStorage.setItem(KEY, JSON.stringify(state)); }

// ─── Apply to <html> ──────────────────────────────────────────
function apply() {
  const r = document.documentElement;
  r.setAttribute('data-accent', state.accent);
  r.style.fontSize = state.fontSize + 'px';
  r.setAttribute('data-density', state.density);
  r.setAttribute('data-sidebar', state.sidebar);
  r.setAttribute('data-layout', state.layout);
  r.setAttribute('data-reduce-motion', String(state.reduceMotion));
  r.setAttribute('data-animated-emoji', String(state.animatedEmoji));
  r.setAttribute('data-emoji-style', state.emojiStyle);
  if (state.language) r.setAttribute('lang', state.language.split('-')[0]);
}

// Apply as early as possible (module runs after <html> is parsed).
apply();

export function get() { return { ...state }; }

export function set(key, value, { toast = true } = {}) {
  if (!(key in DEFAULTS)) return;
  state[key] = value;
  save();
  apply();
  syncControls();
  if (toast) window.NexusComponents?.toast(labelFor(key, value), 'success', 2000);
}

export function reset() {
  state = { ...DEFAULTS };
  save();
  apply();
  // Also restore theme + direction defaults (owned by theme.js).
  window.NexusTheme?.setTheme?.('dark');
  if (document.documentElement.getAttribute('dir') === 'rtl') window.NexusTheme?.setDir?.('ltr');
  syncControls();
  window.NexusComponents?.toast('Appearance reset to defaults', 'success');
}

function labelFor(key, value) {
  const names = {
    accent: 'Accent colour', fontSize: 'Font size', density: 'Message density',
    sidebar: 'Sidebar', layout: 'Layout', reduceMotion: 'Reduce motion',
    animatedEmoji: 'Animated emoji', emojiStyle: 'Emoji style', language: 'Language',
  };
  const v = typeof value === 'boolean' ? (value ? 'on' : 'off') : value;
  return `${names[key] || key}: ${v}`;
}

// ─── Reflect state into the Settings-page controls ────────────
function setRadioGroup(name, value) {
  document.querySelectorAll(`input[name="${name}"]`).forEach(radio => {
    const active = radio.value === value;
    radio.checked = active;
    // Highlight the associated preview card, if any.
    const card = radio.closest('label')?.querySelector('[class*="border-2"]');
    if (card) {
      card.classList.toggle('border-violet-500', active);
      card.classList.toggle('border-slate-700', !active);
      const label = card.querySelector('p:last-child');
      if (label) {
        label.classList.remove('text-slate-400');
        label.classList.toggle('text-violet-400', active);
        label.classList.toggle('text-slate-300', !active);
      }
    }
  });
}

function setSwitch(btn, on) {
  if (!btn) return;
  btn.setAttribute('aria-checked', String(on));
  const thumb = btn.querySelector('.toggle-thumb') || btn.querySelector('span');
  btn.classList.toggle('bg-violet-600', on);
  btn.classList.toggle('bg-slate-700', !on);
  thumb?.classList.toggle('translate-x-6', on);
  thumb?.classList.toggle('translate-x-1', !on);
}

function syncControls() {
  // Accent swatches
  document.querySelectorAll('[data-setting="accent"]').forEach(btn => {
    const active = btn.getAttribute('data-value') === state.accent;
    const ring = `ring-${btn.getAttribute('data-value')}-400`;
    btn.classList.remove('ring-2', ...ACCENTS.map(a => `ring-${a}-400`), 'ring-0');
    btn.classList.add(active ? 'ring-2' : 'ring-0');
    if (active) btn.classList.add(ring);
  });
  // Font size
  const slider = document.getElementById('font-size-slider');
  if (slider) slider.value = state.fontSize;
  const fLabel = document.getElementById('font-size-label');
  if (fLabel) fLabel.textContent = state.fontSize + 'px';
  // Radio groups w/ preview cards
  setRadioGroup('density', state.density);
  setRadioGroup('sidebar', state.sidebar);
  setRadioGroup('layout', state.layout);
  setRadioGroup('emoji-style', state.emojiStyle);
  // Switches
  setSwitch(document.querySelector('[data-setting="reduceMotion"]'), state.reduceMotion);
  setSwitch(document.querySelector('[data-setting="animatedEmoji"]'), state.animatedEmoji);
  // Language select
  const lang = document.querySelector('[data-setting="language"]');
  if (lang) lang.value = state.language;
  if (window.lucide) lucide.createIcons();
}

// ─── Event wiring (delegated, no inline JS) ───────────────────
document.addEventListener('click', e => {
  const swatch = e.target.closest('[data-setting="accent"]');
  if (swatch) { set('accent', swatch.getAttribute('data-value')); return; }

  const sw = e.target.closest('[data-setting="reduceMotion"], [data-setting="animatedEmoji"]');
  if (sw) {
    const key = sw.getAttribute('data-setting');
    set(key, sw.getAttribute('aria-checked') !== 'true');
    return;
  }

  if (e.target.closest('[data-settings-reset]')) { e.preventDefault(); reset(); return; }
  if (e.target.closest('[data-settings-save]')) {
    e.preventDefault();
    window.NexusComponents?.toast('Appearance settings saved!', 'success');
  }
});

document.addEventListener('input', e => {
  if (e.target.id === 'font-size-slider') {
    const v = parseInt(e.target.value) || DEFAULTS.fontSize;
    document.documentElement.style.fontSize = v + 'px';
    const fLabel = document.getElementById('font-size-label');
    if (fLabel) fLabel.textContent = v + 'px';
    state.fontSize = v; save();  // live, no toast spam while dragging
  }
});

document.addEventListener('change', e => {
  const t = e.target;
  if (t.name === 'density')      set('density', t.value);
  else if (t.name === 'sidebar') set('sidebar', t.value);
  else if (t.name === 'layout')  set('layout', t.value);
  else if (t.name === 'emoji-style') set('emojiStyle', t.value);
  else if (t.matches?.('[data-setting="language"]')) set('language', t.value);
});

document.addEventListener('DOMContentLoaded', syncControls);

window.NexusSettings = { get, set, reset };
