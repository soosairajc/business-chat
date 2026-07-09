/**
 * interactions.js — Advanced interactive components for the Nexus template.
 *
 * All frontend-only, no backend. Everything is driven by data-attributes so a
 * single import wires up behaviour across every page:
 *
 *   Pickers       [data-picker="emoji|gif|sticker"]   → floating panel, inserts into [data-picker-target] or nearest textarea
 *   File picker   [data-file-trigger]                  → opens file dialog, renders attachment chips into [data-attachments]
 *   Lightbox      [data-lightbox] (+ optional [data-lightbox-group]) → gallery viewer with prev/next/zoom
 *   Thread panel  [data-thread-open] / [data-thread-close] with #thread-panel
 *   Command menu  Ctrl/⌘+K, or [data-command-open]     → searchable command palette
 *   Popover       [data-popover-trigger="id"]          → anchored, one-at-a-time popover
 *   Filters       [data-filter-input] / [data-filter-chip] over [data-filter-item]
 *   Sorting       [data-sort] over a [data-sort-list]
 *   Pagination    [data-paginate="N"] container of [data-page-item]
 *   Validation    <form data-validate> with [data-rule]
 *   Skeletons     [data-skeleton-toggle="id"] demo loaders / empty states
 *
 * Media players (audio/video) use native <audio controls>/<video controls> in
 * the markup with sample media; this module only adds the custom play buttons.
 */

import { toast } from './components.js';

const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// ─── Floating panel primitive ─────────────────────────────────
// A single active floating panel at a time (pickers, popovers).
let activePanel = null;
let activeAnchor = null;

function closePanel() {
  activePanel?.remove();
  activePanel = null;
  activeAnchor = null;
}

function openPanel(anchor, node, { align = 'start', gap = 8 } = {}) {
  closePanel();
  node.classList.add('fade-in');
  node.style.position = 'fixed';
  node.style.zIndex = '9998';
  document.body.appendChild(node);

  const a = anchor.getBoundingClientRect();
  const p = node.getBoundingClientRect();
  // Prefer opening above the anchor (composer sits at the bottom); flip down if no room.
  let top = a.top - p.height - gap;
  if (top < 8) top = Math.min(a.bottom + gap, window.innerHeight - p.height - 8);
  let left = align === 'end' ? a.right - p.width : a.left;
  left = Math.max(8, Math.min(left, window.innerWidth - p.width - 8));
  node.style.top = `${Math.max(8, top)}px`;
  node.style.left = `${left}px`;

  activePanel = node;
  activeAnchor = anchor;
  if (window.lucide) lucide.createIcons();
}

// Close floating panels on outside click / Escape.
document.addEventListener('mousedown', e => {
  if (activePanel && !activePanel.contains(e.target) && !activeAnchor?.contains(e.target)) {
    closePanel();
  }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closePanel(); });

function targetTextarea(trigger) {
  const sel = trigger.getAttribute('data-picker-target');
  return (sel && $(sel)) || $('#composer-input') || $('textarea[data-auto-resize]') || $('textarea');
}

function insertAtCursor(ta, text) {
  if (!ta) { toast(`Inserted ${text}`, 'info', 1500); return; }
  const start = ta.selectionStart ?? ta.value.length;
  const end = ta.selectionEnd ?? ta.value.length;
  ta.value = ta.value.slice(0, start) + text + ta.value.slice(end);
  ta.focus();
  const pos = start + text.length;
  ta.setSelectionRange(pos, pos);
  ta.dispatchEvent(new Event('input', { bubbles: true }));
}

// ─── Emoji picker ─────────────────────────────────────────────
const EMOJI = {
  'Smileys': ['😀','😃','😄','😁','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😜','🤪','🤨','🧐','🤓','😎','🥳','😏','😒','😞','😔','😟','😕','🙁','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥'],
  'Gestures': ['👍','👎','👌','✌️','🤞','🤟','🤘','👏','🙌','👐','🤝','🙏','💪','👀','🫶','🤙','👋','✍️','💅','🦾'],
  'Hearts': ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝'],
  'Objects': ['🔥','⭐','✨','🎉','🎊','🎈','🎁','🏆','🥇','💡','📌','📎','✅','❌','⚡','💯','🚀','🌱','☕','🍕'],
  'Nature': ['🐶','🐱','🦊','🐻','🐼','🐨','🦁','🐮','🐸','🐵','🦄','🐝','🦋','🌸','🌻','🌈','🌙','⭐','🍀','🌊'],
};

function buildEmojiPanel(ta) {
  const panel = document.createElement('div');
  panel.className = 'w-72 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden text-sm';
  panel.innerHTML = `
    <div class="p-2 border-b border-slate-700">
      <div class="relative">
        <i data-lucide="search" class="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2"></i>
        <input type="text" data-emoji-search placeholder="Search emoji"
          class="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500" />
      </div>
    </div>
    <div data-emoji-scroll class="max-h-56 overflow-y-auto p-2 space-y-2"></div>
    <div class="px-3 py-2 border-t border-slate-700 text-xs text-slate-500 flex items-center gap-2">
      <span data-emoji-preview class="text-lg">😀</span><span>Pick an emoji</span>
    </div>`;

  const scroll = $('[data-emoji-scroll]', panel);
  const render = (filter = '') => {
    scroll.innerHTML = '';
    Object.entries(EMOJI).forEach(([group, list]) => {
      const matches = filter ? list.filter(e => e.includes(filter)) : list;
      if (filter && !group.toLowerCase().includes(filter) && !matches.length) return;
      const shown = filter ? (group.toLowerCase().includes(filter) ? list : matches) : list;
      if (!shown.length) return;
      const wrap = document.createElement('div');
      wrap.innerHTML = `<div class="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-1 mb-1">${group}</div>`;
      const grid = document.createElement('div');
      grid.className = 'grid grid-cols-8 gap-0.5';
      shown.forEach(e => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'w-8 h-8 rounded-lg hover:bg-slate-700 text-lg leading-none transition flex items-center justify-center';
        b.textContent = e;
        b.addEventListener('click', () => { insertAtCursor(ta, e); closePanel(); });
        grid.appendChild(b);
      });
      wrap.appendChild(grid);
      scroll.appendChild(wrap);
    });
    if (!scroll.children.length) scroll.innerHTML = '<div class="text-center text-xs text-slate-500 py-6">No emoji found</div>';
  };
  render();
  $('[data-emoji-search]', panel).addEventListener('input', e => render(e.target.value.trim().toLowerCase()));
  // Live preview on hover
  scroll.addEventListener('mouseover', e => {
    if (e.target.tagName === 'BUTTON') $('[data-emoji-preview]', panel).textContent = e.target.textContent;
  });
  return panel;
}

// ─── GIF & Sticker pickers (sample content) ───────────────────
const GIF_TERMS = ['thumbs up','celebrate','facepalm','mind blown','clapping','shrug','deal with it','high five'];
function buildGifPanel(ta) {
  const panel = document.createElement('div');
  panel.className = 'w-80 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden';
  panel.innerHTML = `
    <div class="p-2 border-b border-slate-700 flex items-center gap-2">
      <span class="text-xs font-bold text-slate-300 px-1">GIF</span>
      <div class="relative flex-1">
        <i data-lucide="search" class="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2"></i>
        <input data-gif-search placeholder="Search GIPHY" class="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500" />
      </div>
    </div>
    <div data-gif-grid class="grid grid-cols-2 gap-1.5 p-2 max-h-64 overflow-y-auto"></div>`;
  const grid = $('[data-gif-grid]', panel);
  const render = (q = '') => {
    grid.innerHTML = '';
    const terms = q ? GIF_TERMS.filter(t => t.includes(q.toLowerCase())) : GIF_TERMS;
    (terms.length ? terms : GIF_TERMS).forEach((term, i) => {
      const hue = (i * 47) % 360;
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'relative aspect-video rounded-lg overflow-hidden group';
      cell.style.background = `linear-gradient(135deg, hsl(${hue} 60% 35%), hsl(${(hue + 40) % 360} 60% 25%))`;
      cell.innerHTML = `<span class="absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-white/90 capitalize px-2 text-center">${term}</span>
        <span class="absolute bottom-1 right-1 text-[8px] font-bold text-white/70 bg-black/40 px-1 rounded">GIF</span>`;
      cell.addEventListener('click', () => { toast(`GIF “${term}” added`, 'success', 2000); insertAtCursor(ta, ` [gif: ${term}] `); closePanel(); });
      grid.appendChild(cell);
    });
    if (!grid.children.length) grid.innerHTML = '<div class="col-span-2 text-center text-xs text-slate-500 py-6">No GIFs found</div>';
  };
  render();
  $('[data-gif-search]', panel).addEventListener('input', e => render(e.target.value.trim()));
  return panel;
}

const STICKERS = ['🎯','🚀','🌟','🎨','🍩','🐙','🦖','🍄','🎸','🛸','🧩','🪁','🎡','🧸','🕹️','🍔','🌮','🥑','🐳','🦩','🌵','🍉','🎬','📸'];
function buildStickerPanel(ta) {
  const panel = document.createElement('div');
  panel.className = 'w-64 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden';
  panel.innerHTML = `<div class="px-3 py-2 border-b border-slate-700 text-xs font-semibold text-slate-400">Stickers</div>
    <div class="grid grid-cols-4 gap-1.5 p-2 max-h-64 overflow-y-auto" data-sticker-grid></div>`;
  const grid = $('[data-sticker-grid]', panel);
  STICKERS.forEach(s => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'aspect-square rounded-xl bg-slate-900 hover:bg-slate-700 hover:scale-105 transition flex items-center justify-center text-3xl';
    b.textContent = s;
    b.addEventListener('click', () => { toast('Sticker sent', 'success', 1500); insertAtCursor(ta, ` ${s} `); closePanel(); });
    grid.appendChild(b);
  });
  return panel;
}

// ─── Picker triggers ──────────────────────────────────────────
document.addEventListener('click', e => {
  const trigger = e.target.closest('[data-picker]');
  if (!trigger) return;
  e.preventDefault();
  e.stopPropagation();
  if (activeAnchor === trigger) { closePanel(); return; }
  const kind = trigger.getAttribute('data-picker');
  const ta = targetTextarea(trigger);
  const builder = { emoji: buildEmojiPanel, gif: buildGifPanel, sticker: buildStickerPanel }[kind];
  if (builder) openPanel(trigger, builder(ta), { align: trigger.getAttribute('data-picker-align') || 'start' });
});

// ─── File picker ──────────────────────────────────────────────
function fileIcon(name = '') {
  const ext = name.split('.').pop().toLowerCase();
  if (['png','jpg','jpeg','gif','webp','svg'].includes(ext)) return { icon: 'image', color: 'text-blue-400 bg-blue-900/40' };
  if (['pdf'].includes(ext)) return { icon: 'file-text', color: 'text-red-400 bg-red-900/40' };
  if (['zip','rar','7z'].includes(ext)) return { icon: 'file-archive', color: 'text-amber-400 bg-amber-900/40' };
  if (['mp4','mov','webm'].includes(ext)) return { icon: 'video', color: 'text-fuchsia-400 bg-fuchsia-900/40' };
  if (['mp3','wav','m4a'].includes(ext)) return { icon: 'music', color: 'text-emerald-400 bg-emerald-900/40' };
  if (['xls','xlsx','csv'].includes(ext)) return { icon: 'table', color: 'text-green-400 bg-green-900/40' };
  return { icon: 'file', color: 'text-slate-400 bg-slate-700' };
}

document.addEventListener('click', e => {
  const trigger = e.target.closest('[data-file-trigger]');
  if (!trigger) return;
  e.preventDefault();
  const accept = trigger.getAttribute('data-accept') || '';
  const input = document.createElement('input');
  input.type = 'file';
  input.multiple = true;
  if (accept) input.accept = accept;
  input.addEventListener('change', () => {
    const target = trigger.getAttribute('data-attachments');
    const container = (target && $(target)) || ensureAttachmentBar(trigger);
    Array.from(input.files).forEach(f => addAttachmentChip(container, f));
    if (input.files.length) toast(`${input.files.length} file(s) attached`, 'success', 2000);
  });
  input.click();
});

function ensureAttachmentBar(trigger) {
  let bar = $('#attachment-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'attachment-bar';
    bar.className = 'flex flex-wrap gap-2 px-4 pb-2';
    const composer = trigger.closest('.bg-slate-800') || trigger.parentElement;
    composer.insertBefore(bar, composer.firstChild);
  }
  return bar;
}

function addAttachmentChip(container, file) {
  const { icon, color } = fileIcon(file.name);
  const kb = file.size ? (file.size < 1024 * 1024 ? `${Math.max(1, Math.round(file.size / 1024))} KB` : `${(file.size / 1048576).toFixed(1)} MB`) : '';
  const chip = document.createElement('div');
  chip.className = 'flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl pl-2 pr-1 py-1.5 fade-in max-w-56';
  chip.innerHTML = `
    <span class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${color}"><i data-lucide="${icon}" class="w-4 h-4"></i></span>
    <span class="min-w-0"><span class="block text-xs text-slate-200 truncate">${escapeHtml(file.name)}</span>${kb ? `<span class="block text-[10px] text-slate-500">${kb}</span>` : ''}</span>
    <button type="button" class="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition shrink-0"><i data-lucide="x" class="w-3.5 h-3.5"></i></button>`;
  chip.querySelector('button').addEventListener('click', () => chip.remove());
  container.appendChild(chip);
  if (window.lucide) lucide.createIcons();
}

// ─── Lightbox / image gallery ─────────────────────────────────
let galleryItems = [];
let galleryIndex = 0;

function collectGallery(group) {
  const sel = group ? `[data-lightbox][data-lightbox-group="${group}"]` : '[data-lightbox]';
  return $$(sel).map(el => {
    const src = el.getAttribute('data-lightbox') || el.getAttribute('src') || el.querySelector('img')?.getAttribute('src');
    // Placeholder support: capture the gradient/thumbnail block when there's no real image.
    let thumbHTML = '';
    if (!src || src === 'placeholder') {
      const thumb = el.matches('[class*="from-"]') ? el : (el.querySelector('[class*="from-"]') || el.firstElementChild);
      thumbHTML = thumb ? thumb.outerHTML : el.innerHTML;
    }
    return { src: src && src !== 'placeholder' ? src : null, thumbHTML, caption: el.getAttribute('data-caption') || '' };
  });
}

function openLightbox(index) {
  galleryIndex = index;
  let box = $('#nx-lightbox');
  if (!box) {
    box = document.createElement('div');
    box.id = 'nx-lightbox';
    box.className = 'fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm fade-in';
    box.innerHTML = `
      <button data-lb-close class="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"><i data-lucide="x" class="w-5 h-5"></i></button>
      <button data-lb-prev class="absolute left-4 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition"><i data-lucide="chevron-left" class="w-6 h-6"></i></button>
      <button data-lb-next class="absolute right-4 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition"><i data-lucide="chevron-right" class="w-6 h-6"></i></button>
      <figure class="max-w-[85vw] max-h-[85vh] flex flex-col items-center gap-3">
        <img data-lb-img class="hidden max-w-full max-h-[78vh] rounded-lg shadow-2xl object-contain" alt="" />
        <div data-lb-placeholder class="hidden rounded-xl shadow-2xl overflow-hidden w-[70vw] max-w-3xl h-[70vh] flex items-center justify-center"></div>
        <figcaption data-lb-cap class="text-sm text-slate-300"></figcaption>
        <div data-lb-count class="text-xs text-slate-500"></div>
      </figure>`;
    document.body.appendChild(box);
    box.addEventListener('click', e => { if (e.target === box || e.target.closest('[data-lb-close]')) closeLightbox(); });
    $('[data-lb-prev]', box).addEventListener('click', () => showLightbox(galleryIndex - 1));
    $('[data-lb-next]', box).addEventListener('click', () => showLightbox(galleryIndex + 1));
  }
  box.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  showLightbox(index);
  if (window.lucide) lucide.createIcons();
}

function showLightbox(index) {
  if (!galleryItems.length) return;
  galleryIndex = (index + galleryItems.length) % galleryItems.length;
  const item = galleryItems[galleryIndex];
  const box = $('#nx-lightbox');
  const img = $('[data-lb-img]', box);
  const ph = $('[data-lb-placeholder]', box);
  if (item.src) {
    img.src = item.src;
    img.classList.remove('hidden');
    ph.classList.add('hidden');
  } else {
    img.classList.add('hidden');
    ph.classList.remove('hidden');
    ph.innerHTML = item.thumbHTML || '<i data-lucide="image" class="w-16 h-16 text-slate-500"></i>';
    // Blow the captured thumbnail up to fill the viewer.
    const inner = ph.firstElementChild;
    if (inner) { inner.style.height = '100%'; inner.style.width = '100%'; inner.classList.add('flex','items-center','justify-center'); }
  }
  $('[data-lb-cap]', box).textContent = item.caption;
  $('[data-lb-count]', box).textContent = `${galleryIndex + 1} / ${galleryItems.length}`;
  const many = galleryItems.length > 1;
  $('[data-lb-prev]', box).style.display = many ? '' : 'none';
  $('[data-lb-next]', box).style.display = many ? '' : 'none';
}

function closeLightbox() {
  $('#nx-lightbox')?.classList.add('hidden');
  document.body.style.overflow = '';
}

document.addEventListener('click', e => {
  const el = e.target.closest('[data-lightbox]');
  if (!el) return;
  e.preventDefault();
  const group = el.getAttribute('data-lightbox-group');
  const sel = group ? `[data-lightbox][data-lightbox-group="${group}"]` : '[data-lightbox]';
  const els = $$(sel);
  galleryItems = collectGallery(group);
  const idx = Math.max(0, els.indexOf(el));
  openLightbox(idx);
});

document.addEventListener('keydown', e => {
  if (!$('#nx-lightbox') || $('#nx-lightbox').classList.contains('hidden')) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft') showLightbox(galleryIndex - 1);
  if (e.key === 'ArrowRight') showLightbox(galleryIndex + 1);
});

// ─── Thread panel ─────────────────────────────────────────────
document.addEventListener('click', e => {
  if (e.target.closest('[data-thread-open]')) {
    e.preventDefault();
    const panel = $('#thread-panel');
    if (panel) {
      panel.classList.remove('hidden', 'translate-x-full');
      panel.classList.add('translate-x-0');
    } else {
      toast('Thread panel not on this page', 'info', 2000);
    }
  }
  if (e.target.closest('[data-thread-close]')) {
    const panel = $('#thread-panel');
    panel?.classList.add('translate-x-full');
    setTimeout(() => panel?.classList.add('hidden'), 250);
  }
});

// ─── Media custom play buttons ────────────────────────────────
document.addEventListener('click', e => {
  const btn = e.target.closest('[data-media-play]');
  if (!btn) return;
  const media = $(btn.getAttribute('data-media-play'));
  if (!media) return;
  const icon = btn.querySelector('[data-lucide]');
  if (media.paused) {
    $$('audio, video').forEach(m => { if (m !== media) m.pause(); });
    media.play();
    icon?.setAttribute('data-lucide', 'pause');
  } else {
    media.pause();
    icon?.setAttribute('data-lucide', 'play');
  }
  if (window.lucide) lucide.createIcons();
});

// ─── Command palette ──────────────────────────────────────────
const COMMANDS = [
  { icon: 'home', label: 'Go to Home', hint: 'Navigation', action: () => location.href = '/' },
  { icon: 'message-circle', label: 'Direct Messages', hint: 'Navigation', action: () => location.href = '/pages/dm.html' },
  { icon: 'message-square-text', label: 'Threads', hint: 'Navigation', action: () => location.href = '/pages/threads.html' },
  { icon: 'bell', label: 'Notifications', hint: 'Navigation', action: () => location.href = '/pages/notifications.html' },
  { icon: 'phone', label: 'Calls', hint: 'Navigation', action: () => location.href = '/pages/calls.html' },
  { icon: 'folder', label: 'Files', hint: 'Navigation', action: () => location.href = '/pages/files.html' },
  { icon: 'users', label: 'Team Directory', hint: 'Navigation', action: () => location.href = '/pages/team-directory.html' },
  { icon: 'image', label: 'Media Gallery', hint: 'Navigation', action: () => location.href = '/pages/media-gallery.html' },
  { icon: 'bookmark', label: 'Bookmarks', hint: 'Navigation', action: () => location.href = '/pages/bookmarks.html' },
  { icon: 'activity', label: 'Activity Feed', hint: 'Navigation', action: () => location.href = '/pages/activity-feed.html' },
  { icon: 'user-plus', label: 'Invite People', hint: 'Navigation', action: () => location.href = '/pages/invite.html' },
  { icon: 'sparkles', label: 'AI Assistant', hint: 'AI', action: () => location.href = '/pages/ai-assistant.html' },
  { icon: 'lightbulb', label: 'AI Reply Suggestions', hint: 'AI', action: () => location.href = '/pages/ai-suggestions.html' },
  { icon: 'text-select', label: 'AI Conversation Summary', hint: 'AI', action: () => location.href = '/pages/ai-summary.html' },
  { icon: 'wand-2', label: 'AI Rewrite', hint: 'AI', action: () => location.href = '/pages/ai-rewrite.html' },
  { icon: 'languages', label: 'AI Translate', hint: 'AI', action: () => location.href = '/pages/ai-translate.html' },
  { icon: 'sliders-horizontal', label: 'AI Settings', hint: 'AI', action: () => location.href = '/pages/ai-settings.html' },
  { icon: 'settings', label: 'Open Settings', hint: 'Navigation', action: () => location.href = '/pages/settings.html' },
  { icon: 'keyboard', label: 'Keyboard Shortcuts', hint: 'Help', action: () => location.href = '/pages/shortcuts.html' },
  { icon: 'moon', label: 'Toggle Dark / Light Mode', hint: 'Preferences', action: () => window.NexusTheme?.toggleDark() },
  { icon: 'align-right', label: 'Toggle RTL Direction', hint: 'Preferences', action: () => window.NexusTheme?.toggleDir() },
  { icon: 'edit', label: 'New Message', hint: 'Action', action: () => toast('Compose new message', 'info', 2000) },
  { icon: 'smile', label: 'Set a Status', hint: 'Action', action: () => toast('Status editor opened', 'info', 2000) },
];

function buildCommandPalette() {
  let modal = $('#command-palette');
  if (modal) return modal;
  modal = document.createElement('div');
  modal.id = 'command-palette';
  modal.className = 'hidden fixed inset-0 z-[9999] flex items-start justify-center pt-[12vh] px-4';
  modal.innerHTML = `
    <div data-cmd-backdrop class="absolute inset-0 modal-backdrop"></div>
    <div class="relative w-full max-w-xl bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden fade-in">
      <div class="flex items-center gap-2 px-4 border-b border-slate-700">
        <i data-lucide="search" class="w-4 h-4 text-slate-500"></i>
        <input data-cmd-input type="text" placeholder="Type a command or search…" class="flex-1 bg-transparent py-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none" />
        <kbd class="px-1.5 py-0.5 rounded bg-slate-900 text-slate-500 font-mono text-[10px]">ESC</kbd>
      </div>
      <div data-cmd-list class="max-h-80 overflow-y-auto py-2"></div>
      <div class="px-4 py-2 border-t border-slate-700 flex items-center gap-4 text-[10px] text-slate-500">
        <span class="flex items-center gap-1"><kbd class="px-1 py-0.5 rounded bg-slate-900 font-mono">↑↓</kbd> navigate</span>
        <span class="flex items-center gap-1"><kbd class="px-1 py-0.5 rounded bg-slate-900 font-mono">↵</kbd> select</span>
      </div>
    </div>`;
  document.body.appendChild(modal);

  const input = $('[data-cmd-input]', modal);
  const list = $('[data-cmd-list]', modal);
  let cursor = 0;
  let filtered = COMMANDS;

  const render = (q = '') => {
    filtered = COMMANDS.filter(c => c.label.toLowerCase().includes(q.toLowerCase()) || c.hint.toLowerCase().includes(q.toLowerCase()));
    cursor = 0;
    list.innerHTML = '';
    if (!filtered.length) { list.innerHTML = '<div class="px-4 py-8 text-center text-sm text-slate-500">No commands found</div>'; return; }
    filtered.forEach((c, i) => {
      const row = document.createElement('button');
      row.type = 'button';
      row.dataset.cmdRow = i;
      row.className = `w-full flex items-center gap-3 px-4 py-2.5 text-left transition ${i === cursor ? 'bg-violet-600/20' : 'hover:bg-slate-700/50'}`;
      row.innerHTML = `<i data-lucide="${c.icon}" class="w-4 h-4 text-slate-400"></i>
        <span class="text-sm text-slate-200">${c.label}</span>
        <span class="ml-auto text-[10px] text-slate-500 uppercase tracking-wide">${c.hint}</span>`;
      row.addEventListener('click', () => { closeCommandPalette(); c.action(); });
      row.addEventListener('mousemove', () => { cursor = i; highlight(); });
      list.appendChild(row);
    });
    if (window.lucide) lucide.createIcons();
  };
  const highlight = () => $$('[data-cmd-row]', list).forEach((r, i) => {
    r.classList.toggle('bg-violet-600/20', i === cursor);
    r.classList.toggle('hover:bg-slate-700/50', i !== cursor);
  });

  input.addEventListener('input', () => render(input.value));
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); cursor = Math.min(cursor + 1, filtered.length - 1); highlight(); scrollTo(list, cursor); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); cursor = Math.max(cursor - 1, 0); highlight(); scrollTo(list, cursor); }
    if (e.key === 'Enter')     { e.preventDefault(); const c = filtered[cursor]; if (c) { closeCommandPalette(); c.action(); } }
  });
  $('[data-cmd-backdrop]', modal).addEventListener('click', closeCommandPalette);
  modal._render = render;
  return modal;
}

function scrollTo(list, i) {
  const row = list.querySelector(`[data-cmd-row="${i}"]`);
  row?.scrollIntoView({ block: 'nearest' });
}

export function openCommandPalette() {
  const modal = buildCommandPalette();
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  modal._render('');
  setTimeout(() => $('[data-cmd-input]', modal)?.focus(), 20);
}
function closeCommandPalette() {
  const modal = $('#command-palette');
  if (!modal) return;
  modal.classList.add('hidden');
  document.body.style.overflow = '';
}

document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    const modal = $('#command-palette');
    if (modal && !modal.classList.contains('hidden')) closeCommandPalette();
    else openCommandPalette();
  }
  if (e.key === 'Escape') closeCommandPalette();
});
document.addEventListener('click', e => { if (e.target.closest('[data-command-open]')) { e.preventDefault(); openCommandPalette(); } });

// ─── Popover (anchored, generic) ──────────────────────────────
document.addEventListener('click', e => {
  const trigger = e.target.closest('[data-popover-trigger]');
  if (!trigger) return;
  e.preventDefault();
  e.stopPropagation();
  if (activeAnchor === trigger) { closePanel(); return; }
  const tpl = $('#' + trigger.getAttribute('data-popover-trigger'));
  if (!tpl) return;
  const node = tpl.cloneNode(true);
  node.removeAttribute('id');
  node.classList.remove('hidden');
  openPanel(trigger, node, { align: trigger.getAttribute('data-popover-align') || 'start' });
});

// ─── Filtering (search + chips) ───────────────────────────────
function applyFilters(scope) {
  const q = ($('[data-filter-input]', scope)?.value || '').trim().toLowerCase();
  const activeChip = $('[data-filter-chip].filter-chip-active', scope);
  const cat = activeChip?.getAttribute('data-filter-chip') || 'all';
  // Native <select> filters: data-filter-select="<key>" matches item's data-<key>.
  const selects = $$('[data-filter-select]', scope).map(s => ({
    key: s.getAttribute('data-filter-select'),
    val: (s.value || '').trim().toLowerCase(),
  })).filter(s => s.val && !/^all\b/.test(s.val));
  let visible = 0;
  $$('[data-filter-item]', scope).forEach(item => {
    const text = (item.getAttribute('data-filter-text') || item.textContent).toLowerCase();
    const itemCat = item.getAttribute('data-filter-cat') || 'all';
    const matchQ = !q || text.includes(q);
    const matchC = cat === 'all' || itemCat === cat || (item.getAttribute('data-filter-cat') || '').split(' ').includes(cat);
    const matchS = selects.every(s => (item.getAttribute('data-' + s.key) || '').toLowerCase() === s.val);
    const show = matchQ && matchC && matchS;
    item.classList.toggle('hidden', !show);
    if (show) visible++;
  });
  const empty = $('[data-filter-empty]', scope);
  if (empty) empty.classList.toggle('hidden', visible > 0);
  const counter = $('[data-filter-count]', scope);
  if (counter) counter.textContent = visible;
}

document.addEventListener('input', e => {
  if (e.target.matches('[data-filter-input]')) applyFilters(e.target.closest('[data-filter-scope]') || document);
});
document.addEventListener('change', e => {
  if (e.target.matches('[data-filter-select]')) applyFilters(e.target.closest('[data-filter-scope]') || document);
  // Sort <select>: data-sort-select on the element, options carry data-sort-key/data-sort-dir.
  if (e.target.matches('[data-sort-select]')) {
    const scope = e.target.closest('[data-filter-scope]') || document;
    const list = $('[data-sort-list]', scope);
    const opt = e.target.selectedOptions[0];
    if (!list || !opt) return;
    const key = opt.getAttribute('data-sort-key');
    if (!key) return;
    const dir = opt.getAttribute('data-sort-dir') || 'asc';
    const items = $$('[data-sort-item]', list);
    items.sort((a, b) => {
      const av = a.getAttribute('data-' + key) ?? '', bv = b.getAttribute('data-' + key) ?? '';
      const an = parseFloat(av), bn = parseFloat(bv);
      const cmp = (!isNaN(an) && !isNaN(bn)) ? an - bn : String(av).localeCompare(String(bv));
      return dir === 'asc' ? cmp : -cmp;
    });
    items.forEach(i => list.appendChild(i));
  }
});
document.addEventListener('click', e => {
  const chip = e.target.closest('[data-filter-chip]');
  if (!chip) return;
  const scope = chip.closest('[data-filter-scope]') || document;
  $$('[data-filter-chip]', scope).forEach(c => {
    const active = c === chip;
    c.classList.toggle('filter-chip-active', active);
    c.classList.toggle('bg-violet-600', active);
    c.classList.toggle('text-white', active);
    c.classList.toggle('text-slate-400', !active);
  });
  applyFilters(scope);
});

// ─── Sorting ──────────────────────────────────────────────────
document.addEventListener('click', e => {
  const btn = e.target.closest('[data-sort]');
  if (!btn) return;
  const scope = btn.closest('[data-filter-scope]') || document;
  const list = $('[data-sort-list]', scope);
  if (!list) return;
  const key = btn.getAttribute('data-sort');
  const dir = btn.getAttribute('data-sort-dir') === 'asc' ? 'desc' : 'asc';
  btn.setAttribute('data-sort-dir', dir);
  const items = $$('[data-sort-item]', list);
  items.sort((a, b) => {
    let av = a.getAttribute(`data-${key}`) ?? '';
    let bv = b.getAttribute(`data-${key}`) ?? '';
    const an = parseFloat(av), bn = parseFloat(bv);
    let cmp = (!isNaN(an) && !isNaN(bn)) ? an - bn : String(av).localeCompare(String(bv));
    return dir === 'asc' ? cmp : -cmp;
  });
  items.forEach(i => list.appendChild(i));
  toast(`Sorted by ${key} (${dir})`, 'info', 1500);
});

// ─── Pagination ───────────────────────────────────────────────
function initPagination() {
  $$('[data-paginate]').forEach(container => {
    const perPage = parseInt(container.getAttribute('data-paginate')) || 5;
    const items = $$('[data-page-item]', container);
    if (items.length <= perPage) return;
    const pages = Math.ceil(items.length / perPage);
    let current = 1;
    const nav = document.createElement('div');
    nav.className = 'flex items-center justify-center gap-1 mt-4';
    const render = () => {
      items.forEach((it, i) => it.classList.toggle('hidden', Math.floor(i / perPage) + 1 !== current));
      nav.innerHTML = '';
      const mk = (label, page, disabled, active) => {
        const b = document.createElement('button');
        b.className = `min-w-8 h-8 px-2 rounded-lg text-xs font-medium transition ${active ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-700'} ${disabled ? 'opacity-40 pointer-events-none' : ''}`;
        b.innerHTML = label;
        b.addEventListener('click', () => { current = page; render(); container.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
        return b;
      };
      nav.appendChild(mk('<i data-lucide="chevron-left" class="w-3.5 h-3.5"></i>', current - 1, current === 1));
      for (let p = 1; p <= pages; p++) nav.appendChild(mk(String(p), p, false, p === current));
      nav.appendChild(mk('<i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>', current + 1, current === pages));
      if (window.lucide) lucide.createIcons();
    };
    container.after(nav);
    render();
  });
}

// ─── Form validation ──────────────────────────────────────────
const VALIDATORS = {
  required: v => v.trim().length > 0 || 'This field is required',
  email:    v => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Enter a valid email address',
  min:      (v, n) => v.length >= +n || `Must be at least ${n} characters`,
  match:    (v, sel, form) => v === (form.querySelector(sel)?.value) || 'Values do not match',
};

function validateField(field, form) {
  const rules = (field.getAttribute('data-rule') || '').split('|').filter(Boolean);
  for (const rule of rules) {
    const [name, arg] = rule.split(':');
    const fn = VALIDATORS[name];
    if (!fn) continue;
    const res = fn(field.value, arg, form);
    if (res !== true) return res;
  }
  return true;
}

function showFieldError(field, message) {
  clearFieldError(field);
  field.classList.add('border-red-500');
  field.classList.remove('border-slate-700');
  const err = document.createElement('p');
  err.className = 'text-xs text-red-400 mt-1 flex items-center gap-1 field-error';
  err.innerHTML = `<i data-lucide="alert-circle" class="w-3 h-3"></i>${message}`;
  field.insertAdjacentElement('afterend', err);
  if (window.lucide) lucide.createIcons();
}
function clearFieldError(field) {
  field.classList.remove('border-red-500');
  field.parentElement.querySelector('.field-error')?.remove();
  field.nextElementSibling?.classList.contains('field-error') && field.nextElementSibling.remove();
}

document.addEventListener('submit', e => {
  const form = e.target.closest('[data-validate]');
  if (!form) return;
  e.preventDefault();
  let ok = true;
  $$('[data-rule]', form).forEach(field => {
    const res = validateField(field, form);
    if (res !== true) { showFieldError(field, res); ok = false; }
    else clearFieldError(field);
  });
  if (ok) {
    toast(form.getAttribute('data-success') || 'Submitted successfully', 'success');
    if (form.hasAttribute('data-reset')) form.reset();
    const modalId = form.getAttribute('data-close-modal');
    if (modalId) window.NexusComponents?.closeModal(modalId);
  } else {
    toast('Please fix the highlighted fields', 'error');
  }
});
document.addEventListener('blur', e => {
  if (!e.target.matches?.('[data-rule]')) return;
  const form = e.target.closest('[data-validate]');
  if (!form) return;
  const res = validateField(e.target, form);
  if (res !== true) showFieldError(e.target, res); else clearFieldError(e.target);
}, true);

// ─── Skeleton / empty-state demo toggle ───────────────────────
document.addEventListener('click', e => {
  const btn = e.target.closest('[data-skeleton-toggle]');
  if (!btn) return;
  const target = $('#' + btn.getAttribute('data-skeleton-toggle'));
  if (!target) return;
  const skel = $('[data-skeleton]', target);
  const content = $('[data-loaded]', target);
  skel?.classList.remove('hidden');
  content?.classList.add('hidden');
  setTimeout(() => { skel?.classList.add('hidden'); content?.classList.remove('hidden'); }, 1400);
});

// ─── Copy-to-clipboard ────────────────────────────────────────
document.addEventListener('click', e => {
  const btn = e.target.closest('[data-copy]');
  if (!btn) return;
  const val = btn.getAttribute('data-copy') || $(btn.getAttribute('data-copy-from'))?.value || '';
  navigator.clipboard?.writeText(val).then(() => toast('Copied to clipboard', 'success', 2000));
});

// ─── Generic toggle (e.g. show/hide password, right panel) ────
document.addEventListener('click', e => {
  const btn = e.target.closest('[data-toggle]');
  if (!btn) return;
  const target = $('#' + btn.getAttribute('data-toggle'));
  target?.classList.toggle('hidden');
});

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ─── Video / audio preview modal (sample media) ───────────────
const SAMPLE_VIDEO = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4';
const SAMPLE_AUDIO = 'https://commondatastorage.googleapis.com/codeskulptor-demos/DDR_assets/Kangaroo_MusiQue_-_The_Neverwritten_Role_Playing_Game.mp3';

export function openMediaPlayer({ type = 'video', src, title = '' } = {}) {
  let modal = $('#nx-media-player');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'nx-media-player';
    modal.className = 'fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm fade-in';
    modal.innerHTML = `
      <button data-mp-close class="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"><i data-lucide="x" class="w-5 h-5"></i></button>
      <div class="w-full max-w-3xl px-4" data-mp-body></div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal || e.target.closest('[data-mp-close]')) closeMediaPlayer(); });
  }
  const body = $('[data-mp-body]', modal);
  body.innerHTML = type === 'audio'
    ? `<div class="bg-slate-800 border border-slate-700 rounded-2xl p-6 text-center">
         <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center mx-auto mb-4"><i data-lucide="music" class="w-9 h-9 text-white"></i></div>
         <p class="text-slate-100 font-semibold mb-1">${escapeHtml(title || 'Audio clip')}</p>
         <p class="text-xs text-slate-500 mb-4">Sample audio · Nexus template</p>
         <audio controls autoplay class="w-full"><source src="${src || SAMPLE_AUDIO}" type="audio/mpeg"></audio>
       </div>`
    : `<div class="rounded-2xl overflow-hidden shadow-2xl bg-black">
         <video controls autoplay class="w-full max-h-[80vh]"><source src="${src || SAMPLE_VIDEO}" type="video/mp4"></video>
       </div>
       ${title ? `<p class="text-sm text-slate-300 mt-3 text-center">${escapeHtml(title)}</p>` : ''}`;
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  if (window.lucide) lucide.createIcons();
}
function closeMediaPlayer() {
  const modal = $('#nx-media-player');
  if (!modal) return;
  modal.querySelector('video')?.pause();
  modal.querySelector('audio')?.pause();
  modal.classList.add('hidden');
  document.body.style.overflow = '';
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMediaPlayer(); });
document.addEventListener('click', e => {
  const t = e.target.closest('[data-media-open]');
  if (!t) return;
  e.preventDefault();
  openMediaPlayer({ type: t.getAttribute('data-media-open') || 'video', src: t.getAttribute('data-media-src') || '', title: t.getAttribute('data-media-title') || '' });
});

// Auto-enhance media-gallery thumbnails (images → lightbox, videos → player).
function initMediaThumbs() {
  $$('.media-thumb').forEach(thumb => {
    if (thumb.hasAttribute('data-enhanced')) return;
    thumb.setAttribute('data-enhanced', '');
    const isVideo = /VIDEO/i.test(thumb.textContent) || thumb.querySelector('[data-lucide="video"], [data-lucide="play"]');
    const caption = thumb.querySelector('p')?.textContent?.trim() || '';
    thumb.style.cursor = 'pointer';
    if (isVideo) {
      thumb.setAttribute('data-media-open', 'video');
      thumb.setAttribute('data-media-title', caption);
    } else {
      thumb.setAttribute('data-lightbox', 'placeholder');
      thumb.setAttribute('data-lightbox-group', 'gallery');
      thumb.setAttribute('data-caption', caption);
    }
  });
}

// ─── Init on load ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initPagination();
  initMediaThumbs();
});

window.NexusInteractions = { openCommandPalette, openLightbox: (i) => { galleryItems = collectGallery(); openLightbox(i || 0); }, toast };
