/**
 * components.js — Modals, Toasts, Offcanvas, Dropdowns, Tabs
 * Import this in every page.
 */

// ─── Toast ────────────────────────────────────────────────────
export function toast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const colors = {
    info:    'bg-slate-800 border-slate-700 text-slate-100',
    success: 'bg-emerald-900 border-emerald-700 text-emerald-100',
    error:   'bg-red-900 border-red-700 text-red-100',
    warning: 'bg-amber-900 border-amber-700 text-amber-100',
  };
  const icons = { info: 'info', success: 'check-circle', error: 'x-circle', warning: 'alert-triangle' };

  const el = document.createElement('div');
  el.className = `flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl text-sm font-medium fade-in max-w-xs ${colors[type] || colors.info}`;
  el.innerHTML = `<i data-lucide="${icons[type]}" class="w-4 h-4 shrink-0"></i><span>${message}</span><button class="ml-auto opacity-60 hover:opacity-100" onclick="this.closest('div').remove()"><i data-lucide="x" class="w-3 h-3"></i></button>`;
  container.appendChild(el);
  if (window.lucide) lucide.createIcons();

  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.3s';
    setTimeout(() => el.remove(), 300);
  }, duration);
}

// ─── Modal ────────────────────────────────────────────────────
export function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.remove('hidden');
  modal.querySelector('[data-modal-panel]')?.classList.add('fade-in');
  document.body.style.overflow = 'hidden';
}

export function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.add('hidden');
  document.body.style.overflow = '';
}

// Close modal on backdrop click
document.addEventListener('click', e => {
  if (e.target.matches('[data-modal-backdrop]')) {
    e.target.closest('[data-modal]')?.classList.add('hidden');
    document.body.style.overflow = '';
  }
  if (e.target.matches('[data-modal-close]')) {
    e.target.closest('[data-modal]')?.classList.add('hidden');
    document.body.style.overflow = '';
  }
});

// ─── Offcanvas ────────────────────────────────────────────────
export function openOffcanvas(id) {
  const panel = document.getElementById(id);
  if (!panel) return;
  panel.classList.remove('translate-x-full', '-translate-x-full', 'hidden');
  panel.classList.add('translate-x-0');
  document.getElementById(id + '-backdrop')?.classList.remove('hidden');
}

export function closeOffcanvas(id) {
  const panel = document.getElementById(id);
  if (!panel) return;
  const isRtl = document.documentElement.dir === 'rtl';
  panel.classList.remove('translate-x-0');
  panel.classList.add(isRtl ? '-translate-x-full' : 'translate-x-full');
  document.getElementById(id + '-backdrop')?.classList.add('hidden');
}

// ─── Dropdown ─────────────────────────────────────────────────
document.addEventListener('click', e => {
  // Toggle
  const trigger = e.target.closest('[data-dropdown-trigger]');
  if (trigger) {
    e.stopPropagation();
    const targetId = trigger.getAttribute('data-dropdown-trigger');
    const menu = document.getElementById(targetId);
    if (!menu) return;
    const isOpen = !menu.classList.contains('hidden');
    closeAllDropdowns();
    if (!isOpen) {
      menu.classList.remove('hidden');
      menu.classList.add('fade-in');
    }
    return;
  }
  // Close all if clicking outside
  if (!e.target.closest('[data-dropdown]')) {
    closeAllDropdowns();
  }
});

function closeAllDropdowns() {
  document.querySelectorAll('[data-dropdown]').forEach(d => d.classList.add('hidden'));
}

// ─── Tabs ─────────────────────────────────────────────────────
document.addEventListener('click', e => {
  const tab = e.target.closest('[data-tab]');
  if (!tab) return;
  const group = tab.getAttribute('data-tab-group');
  const target = tab.getAttribute('data-tab');

  // Deactivate all tabs in group
  document.querySelectorAll(`[data-tab-group="${group}"]`).forEach(t => {
    t.classList.remove('tab-active');
    t.setAttribute('aria-selected', 'false');
  });
  // Activate clicked tab
  tab.classList.add('tab-active');
  tab.setAttribute('aria-selected', 'true');

  // Hide all panels in group
  document.querySelectorAll(`[data-tab-panel-group="${group}"]`).forEach(p => p.classList.add('hidden'));
  // Show target panel
  document.getElementById(target)?.classList.remove('hidden');
});

// ─── Accordion ────────────────────────────────────────────────
document.addEventListener('click', e => {
  const trigger = e.target.closest('[data-accordion-trigger]');
  if (!trigger) return;
  const content = document.getElementById(trigger.getAttribute('data-accordion-trigger'));
  if (!content) return;

  const isOpen = content.style.height !== '0px' && content.style.height !== '';
  if (isOpen) {
    content.style.height = content.scrollHeight + 'px';
    requestAnimationFrame(() => { content.style.height = '0px'; });
    trigger.querySelector('[data-accordion-icon]')?.classList.remove('rotate-180');
  } else {
    content.style.height = '0px';
    requestAnimationFrame(() => {
      content.style.height = content.scrollHeight + 'px';
      setTimeout(() => { content.style.height = 'auto'; }, 200);
    });
    trigger.querySelector('[data-accordion-icon]')?.classList.add('rotate-180');
  }
});

// ─── Context menu ─────────────────────────────────────────────
let activeContextMenu = null;

export function showContextMenu(items, x, y) {
  removeContextMenu();

  const menu = document.createElement('div');
  menu.id = 'context-menu';
  menu.className = 'fixed z-50 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-1.5 min-w-48 fade-in text-sm';
  menu.style.left = Math.min(x, window.innerWidth - 220) + 'px';
  menu.style.top = Math.min(y, window.innerHeight - 300) + 'px';

  items.forEach(item => {
    if (item.divider) {
      menu.insertAdjacentHTML('beforeend', '<div class="my-1 border-t border-slate-700"></div>');
      return;
    }
    const btn = document.createElement('button');
    btn.className = `w-full flex items-center gap-2.5 px-3 py-1.5 text-start text-slate-200 hover:bg-slate-700 transition ${item.danger ? 'text-red-400 hover:text-red-300' : ''}`;
    btn.innerHTML = `${item.icon ? `<i data-lucide="${item.icon}" class="w-4 h-4 opacity-70"></i>` : ''}<span>${item.label}</span>${item.shortcut ? `<span class="ml-auto text-xs text-slate-500">${item.shortcut}</span>` : ''}`;
    if (item.action) btn.addEventListener('click', () => { item.action(); removeContextMenu(); });
    menu.appendChild(btn);
  });

  document.body.appendChild(menu);
  if (window.lucide) lucide.createIcons();
  activeContextMenu = menu;
}

function removeContextMenu() {
  activeContextMenu?.remove();
  activeContextMenu = null;
}

document.addEventListener('click', removeContextMenu);
document.addEventListener('keydown', e => { if (e.key === 'Escape') { removeContextMenu(); closeAllDropdowns(); } });

// ─── Expose globally ──────────────────────────────────────────
window.NexusComponents = { toast, openModal, closeModal, openOffcanvas, closeOffcanvas, showContextMenu };
