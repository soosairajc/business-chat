/**
 * app.js — Global app interactions
 * Import this in every page.
 */

import './theme.js';
import './settings.js';
import './components.js';
import './interactions.js';
import './notifications.js';
import './ai.js';

// ─── Init Lucide icons ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) lucide.createIcons();

  initSidebarCollapseGroups();
  initMobileMenus();
  initEmojiReactions();
  initMessageHover();
  initAutoResizeTextarea();
  initRightSidebarTabs();
});

// ─── Channel group collapse ───────────────────────────────────
function initSidebarCollapseGroups() {
  document.querySelectorAll('[data-group-toggle]').forEach(btn => {
    const groupId = btn.getAttribute('data-group-toggle');
    const content = document.getElementById(groupId);
    if (!content) return;

    // Set initial height
    content.style.height = 'auto';

    btn.addEventListener('click', () => {
      const icon = btn.querySelector('[data-group-icon]');
      const isOpen = content.style.height !== '0px';

      if (isOpen) {
        content.style.height = content.scrollHeight + 'px';
        requestAnimationFrame(() => { content.style.height = '0px'; });
        icon?.classList.remove('rotate-0');
        icon?.classList.add('-rotate-90');
      } else {
        content.style.height = '0px';
        requestAnimationFrame(() => {
          content.style.height = content.scrollHeight + 'px';
          setTimeout(() => { content.style.height = 'auto'; }, 220);
        });
        icon?.classList.remove('-rotate-90');
        icon?.classList.add('rotate-0');
      }
    });
  });
}

// ─── Mobile menus ─────────────────────────────────────────────
function initMobileMenus() {
  // Mobile sidebar toggle
  document.getElementById('mobile-menu-btn')?.addEventListener('click', () => {
    document.getElementById('mobile-sidebar')?.classList.toggle('hidden');
  });

  // Mobile right panel toggle
  document.getElementById('mobile-info-btn')?.addEventListener('click', () => {
    document.getElementById('right-sidebar')?.classList.toggle('hidden');
  });
}

// ─── Emoji reactions ──────────────────────────────────────────
function initEmojiReactions() {
  document.addEventListener('click', e => {
    const reaction = e.target.closest('[data-reaction]');
    if (!reaction) return;
    const count = reaction.querySelector('[data-count]');
    const active = reaction.classList.toggle('reaction-active');
    if (count) {
      let n = parseInt(count.textContent) || 0;
      count.textContent = active ? n + 1 : Math.max(0, n - 1);
    }
  });
}

// ─── Message hover ────────────────────────────────────────────
function initMessageHover() {
  document.querySelectorAll('.message-row').forEach(row => {
    // Right-click context menu on message
    row.addEventListener('contextmenu', e => {
      e.preventDefault();
      window.NexusComponents?.showContextMenu([
        { label: 'React', icon: 'smile', action: () => {} },
        { label: 'Reply in Thread', icon: 'message-square', action: () => {} },
        { label: 'Forward Message', icon: 'forward', action: () => {} },
        { label: 'Copy Text', icon: 'copy', shortcut: '⌘C', action: () => { navigator.clipboard?.writeText(row.querySelector('.msg-body')?.textContent || ''); window.NexusComponents?.toast('Copied!', 'success', 2000); } },
        { label: 'Pin Message', icon: 'pin', action: () => window.NexusComponents?.toast('Message pinned', 'success') },
        { label: 'Bookmark', icon: 'bookmark', action: () => window.NexusComponents?.toast('Bookmarked', 'success') },
        { divider: true },
        { label: 'Delete Message', icon: 'trash-2', danger: true, action: () => {} },
      ], e.clientX, e.clientY);
    });
  });
}

// ─── Auto-resize textarea ─────────────────────────────────────
function initAutoResizeTextarea() {
  document.querySelectorAll('textarea[data-auto-resize]').forEach(ta => {
    ta.addEventListener('input', () => {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
    });

    // Enter to send (Shift+Enter = newline)
    ta.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        document.getElementById('send-btn')?.click();
      }
    });
  });
}

// ─── Right sidebar tabs ───────────────────────────────────────
function initRightSidebarTabs() {
  const tabs = document.querySelectorAll('[data-rs-tab]');
  const panels = document.querySelectorAll('[data-rs-panel]');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => { t.classList.remove('text-violet-400', 'border-violet-400'); t.classList.add('text-slate-400', 'border-transparent'); });
      panels.forEach(p => p.classList.add('hidden'));

      tab.classList.add('text-violet-400', 'border-violet-400');
      tab.classList.remove('text-slate-400', 'border-transparent');
      document.getElementById(tab.getAttribute('data-rs-tab'))?.classList.remove('hidden');
    });
  });
}

// ─── Message send simulation ──────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const sendBtn = document.getElementById('send-btn');
  const composer = document.getElementById('composer-input');
  const msgList = document.getElementById('message-list');

  sendBtn?.addEventListener('click', () => {
    const text = composer?.value.trim();
    if (!text || !msgList) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const msgEl = document.createElement('div');
    msgEl.className = 'message-row group relative flex gap-3 px-4 py-1 hover:bg-slate-800/40 rounded-lg fade-in';
    msgEl.innerHTML = `
      <img src="https://api.dicebear.com/9.x/avataaars/svg?seed=you" alt="You" class="w-9 h-9 rounded-full shrink-0 mt-0.5 bg-slate-700" />
      <div class="flex-1 min-w-0">
        <div class="flex items-baseline gap-2 mb-0.5">
          <span class="text-sm font-semibold text-slate-100">You</span>
          <span class="text-xs text-slate-500">${timeStr}</span>
        </div>
        <p class="msg-body text-sm text-slate-300 leading-relaxed">${escapeHtml(text)}</p>
      </div>
      <div class="message-actions absolute -top-3 right-4 flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-lg px-1 py-0.5 shadow-lg">
        <button class="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition" title="React"><i data-lucide="smile" class="w-3.5 h-3.5"></i></button>
        <button class="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition" title="Reply"><i data-lucide="message-square" class="w-3.5 h-3.5"></i></button>
        <button class="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition" title="More"><i data-lucide="more-horizontal" class="w-3.5 h-3.5"></i></button>
      </div>`;
    msgList.appendChild(msgEl);
    if (window.lucide) lucide.createIcons();

    composer.value = '';
    composer.style.height = 'auto';
    msgList.scrollTop = msgList.scrollHeight;

    // Simulate reply
    setTimeout(() => {
      showTypingIndicator(msgList);
      setTimeout(() => {
        removeTypingIndicator(msgList);
        const replies = ['Got it, thanks! 👍', 'Makes sense.', 'On it!', 'Sounds good, let me check.', 'Perfect, will do!'];
        appendBotMessage(msgList, replies[Math.floor(Math.random() * replies.length)]);
      }, 1500 + Math.random() * 1000);
    }, 800);
  });
});

function escapeHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
}

function showTypingIndicator(list) {
  const el = document.createElement('div');
  el.id = 'typing-ind';
  el.className = 'flex gap-3 px-4 py-2 fade-in';
  el.innerHTML = `<img src="https://api.dicebear.com/9.x/avataaars/svg?seed=alice" class="w-9 h-9 rounded-full shrink-0 bg-slate-700" /><div class="flex items-center gap-1 bg-slate-800 px-3 py-2 rounded-2xl"><span class="typing-dot w-2 h-2 rounded-full bg-slate-400 block"></span><span class="typing-dot w-2 h-2 rounded-full bg-slate-400 block"></span><span class="typing-dot w-2 h-2 rounded-full bg-slate-400 block"></span></div>`;
  list.appendChild(el);
  list.scrollTop = list.scrollHeight;
}

function removeTypingIndicator(list) {
  document.getElementById('typing-ind')?.remove();
}

function appendBotMessage(list, text) {
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const el = document.createElement('div');
  el.className = 'message-row group relative flex gap-3 px-4 py-1 hover:bg-slate-800/40 rounded-lg fade-in';
  el.innerHTML = `
    <img src="https://api.dicebear.com/9.x/avataaars/svg?seed=alice" alt="Alice" class="w-9 h-9 rounded-full shrink-0 mt-0.5 bg-slate-700" />
    <div class="flex-1 min-w-0">
      <div class="flex items-baseline gap-2 mb-0.5">
        <span class="text-sm font-semibold text-slate-100">Alice Chen</span>
        <span class="text-xs text-slate-500">${timeStr}</span>
      </div>
      <p class="msg-body text-sm text-slate-300 leading-relaxed">${escapeHtml(text)}</p>
    </div>`;
  list.appendChild(el);
  if (window.lucide) lucide.createIcons();
  list.scrollTop = list.scrollHeight;
  // Received-message sound (respects the Settings → Notifications preference).
  window.NexusNotifications?.playMessageSound();
}
