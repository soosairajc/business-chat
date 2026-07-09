/**
 * notifications.js — Realistic frontend notification experience (no backend).
 *
 * Everything here is 100% client-side:
 *   • Sounds are SYNTHESIZED with the Web Audio API — no audio files, no network.
 *   • "Incoming" messages/calls are simulated on random timers with sample data.
 *   • Toasts + optional browser Notifications surface each event.
 *   • Sidebar unread badges + chat previews update automatically.
 *
 * Preferences persist to localStorage['nexus-notif'] and are surfaced in
 * Settings → Notifications via [data-notif="..."] toggles.
 *
 * Public API (window.NexusNotifications):
 *   get() / set(key, val)         read / write a preference
 *   ping(type, data)              fire a single notification of a given type
 *   playMessageSound()            play the message ding (respects prefs)
 *   incomingCall({name,seed,video}) open the ringing call modal
 *   startSimulation()/stopSimulation()
 */

const KEY = 'nexus-notif';

const DEFAULTS = {
  messageSound: true,   // ding on new message
  callRingtone: true,   // ringtone on incoming call
  browserNotif: false,  // OS-level notifications (needs permission)
  badges: true,         // unread badge counters
  simulate: true,       // demo: simulate live incoming activity
};

function load() {
  try { return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY)) || {}) }; }
  catch { return { ...DEFAULTS }; }
}
let prefs = load();
function save() { localStorage.setItem(KEY, JSON.stringify(prefs)); }

export function get() { return { ...prefs }; }
export function set(key, value) {
  if (!(key in DEFAULTS)) return;
  prefs[key] = value;
  save();
  syncControls();
  // Browser-notification opt-in triggers the permission prompt.
  if (key === 'browserNotif' && value) requestBrowserPermission();
  // Toggling the simulator on/off starts/stops the timers live.
  if (key === 'simulate') value ? startSimulation() : stopSimulation();
}

// ─── Web Audio: synthesized sounds (no files) ─────────────────
let audioCtx = null;
function ctx() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  return audioCtx;
}
// Browsers gate audio behind a user gesture — unlock the context on first input.
['pointerdown', 'keydown', 'touchstart'].forEach(ev =>
  window.addEventListener(ev, () => ctx(), { once: true, passive: true }));

function tone(freq, start, dur, { type = 'sine', gain = 0.14, ac = ctx() } = {}) {
  if (!ac) return;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  // Soft attack/decay so it sounds like a chime, not a click.
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

export function playMessageSound() {
  if (!prefs.messageSound) return;
  const ac = ctx(); if (!ac) return;
  const t = ac.currentTime;
  // Two-note rising "ding-dong".
  tone(880, t, 0.18, { ac });
  tone(1244, t + 0.11, 0.22, { ac });
}

function playMentionSound() {
  if (!prefs.messageSound) return;
  const ac = ctx(); if (!ac) return;
  const t = ac.currentTime;
  tone(1046, t, 0.12, { ac, gain: 0.12 });
  tone(1568, t + 0.09, 0.16, { ac, gain: 0.12 });
  tone(2093, t + 0.18, 0.2, { ac, gain: 0.1 });
}

// ─── Ringtone (looping, for calls) ────────────────────────────
let ringTimer = null;
function startRingtone() {
  if (!prefs.callRingtone) return;
  stopRingtone();
  const ring = () => {
    const ac = ctx(); if (!ac) return;
    const t = ac.currentTime;
    // Classic double-buzz ring: two warble bursts, then a pause before repeat.
    for (const offset of [0, 0.4]) {
      for (let i = 0; i < 4; i++) {
        const s = t + offset + i * 0.08;
        tone(i % 2 ? 480 : 440, s, 0.075, { ac, type: 'triangle', gain: 0.16 });
      }
    }
  };
  ring();
  ringTimer = setInterval(ring, 2400);
}
function stopRingtone() {
  if (ringTimer) { clearInterval(ringTimer); ringTimer = null; }
}

// ─── Browser (OS) notifications ───────────────────────────────
function requestBrowserPermission() {
  if (!('Notification' in window)) {
    window.NexusComponents?.toast('Browser notifications are not supported here', 'warning');
    return;
  }
  if (Notification.permission === 'granted') return;
  if (Notification.permission === 'denied') {
    window.NexusComponents?.toast('Notifications are blocked in your browser settings', 'warning');
    return;
  }
  Notification.requestPermission().then(p => {
    if (p === 'granted') window.NexusComponents?.toast('Browser notifications enabled', 'success');
    else { prefs.browserNotif = false; save(); syncControls(); }
  });
}

function browserNotify(title, body, tag) {
  if (!prefs.browserNotif || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  // Don't duplicate the OS toast while the user is actively looking at the tab.
  if (document.visibilityState === 'visible') return;
  try {
    const n = new Notification(title, { body, tag, icon: '/favicon.ico', silent: true });
    n.onclick = () => { window.focus(); n.close(); };
    setTimeout(() => n.close(), 6000);
  } catch { /* no-op */ }
}

// ─── Unread badges (auto-update across the icon rail) ─────────
// Targets the left icon-rail links by aria-label; injects/updates a count pill.
function bumpBadge(labels, by = 1) {
  if (!prefs.badges) return;
  const selectors = labels.map(l => `a[aria-label="${l}"]`).join(',');
  document.querySelectorAll(selectors).forEach(link => {
    link.classList.add('relative');
    let badge = link.querySelector('[data-notif-badge]');
    if (!badge) {
      badge = document.createElement('span');
      badge.setAttribute('data-notif-badge', '');
      badge.className = 'absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center fade-in';
      badge.textContent = '0';
      link.appendChild(badge);
    }
    const n = (parseInt(badge.textContent) || 0) + by;
    badge.textContent = n > 99 ? '99+' : String(n);
    badge.classList.remove('fade-in'); void badge.offsetWidth; badge.classList.add('fade-in');
  });
  updateTitleBadge();
}

// Reflect total unread in the tab title, e.g. "(3) Nexus".
let baseTitle = null;
function updateTitleBadge() {
  if (baseTitle === null) baseTitle = document.title.replace(/^\(\d+\)\s*/, '');
  let total = 0;
  document.querySelectorAll('[data-notif-badge]').forEach(b => { total += parseInt(b.textContent) || 0; });
  document.title = total > 0 ? `(${total}) ${baseTitle}` : baseTitle;
}

// Update the DM list preview + unread pill for a person, when on dm.html.
function updateChatPreview(name, text) {
  const items = document.querySelectorAll('.dm-item, [data-dm-item]');
  items.forEach(item => {
    const nameEl = item.querySelector('.dm-name, [data-dm-name]') ||
      Array.from(item.querySelectorAll('span,p')).find(el => el.textContent.trim() === name);
    if (!nameEl || nameEl.textContent.trim() !== name) return;
    const preview = item.querySelector('[data-dm-preview]') ||
      item.querySelector('p.truncate, .dm-preview');
    if (preview) preview.textContent = text;
    // Bump the per-conversation unread pill.
    let pill = item.querySelector('[data-notif-pill]');
    if (!pill) {
      pill = document.createElement('span');
      pill.setAttribute('data-notif-pill', '');
      pill.className = 'ml-auto min-w-5 h-5 px-1.5 rounded-full bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 fade-in';
      pill.textContent = '0';
      (item.querySelector('.flex.items-center') || item).appendChild(pill);
    }
    pill.textContent = String((parseInt(pill.textContent) || 0) + 1);
  });
}

// ─── Sample data for simulated activity ───────────────────────
const PEOPLE = [
  { name: 'Alice Chen', seed: 'alice' },
  { name: 'Mike Ross', seed: 'mike' },
  { name: 'Priya Sharma', seed: 'priya' },
  { name: 'Tom Baker', seed: 'tom' },
  { name: 'Sarah Kim', seed: 'sarah' },
  { name: 'David Park', seed: 'david' },
  { name: 'Carol Wu', seed: 'carol' },
];
const MESSAGES = [
  'Hey, do you have a minute?', 'Just pushed the latest changes 🚀',
  'Can you review my PR?', 'Lunch in 10?', 'Great work on the demo! 🎉',
  'The client loved it 👏', 'Are we still on for 3pm?', 'Check your inbox 📩',
  'Ping me when you\'re free', 'Nice catch on that bug 🐛',
];
const MENTIONS = [
  'mentioned you in #general', 'mentioned you in #design',
  'mentioned you in a thread', 'mentioned you in #engineering',
];
const FILES = [
  { name: 'Q3-report.pdf', kind: 'PDF' }, { name: 'mockups-v2.fig', kind: 'Figma' },
  { name: 'demo-recording.mp4', kind: 'Video' }, { name: 'budget.xlsx', kind: 'Sheet' },
  { name: 'brand-assets.zip', kind: 'Archive' },
];
const pick = arr => arr[Math.floor(rand() * arr.length)];

// Deterministic-free RNG (Math.random is available in the browser at runtime).
function rand() { return Math.random(); }

function avatar(seed) { return `https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}`; }

// ─── Rich toast for an incoming event ─────────────────────────
function richToast({ title, body, seed, icon = 'message-circle', accent = 'violet', onClick }) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const el = document.createElement('div');
  el.className = 'flex items-start gap-3 p-3 pr-2 rounded-xl border bg-slate-800 border-slate-700 text-slate-100 shadow-2xl max-w-xs w-72 fade-in cursor-pointer hover:border-slate-600 transition';
  const media = seed
    ? `<img src="${avatar(seed)}" class="w-9 h-9 rounded-full shrink-0 bg-slate-700" alt="" />`
    : `<span class="w-9 h-9 rounded-full shrink-0 bg-${accent}-600/20 text-${accent}-400 flex items-center justify-center"><i data-lucide="${icon}" class="w-4.5 h-4.5"></i></span>`;
  el.innerHTML = `
    ${media}
    <div class="min-w-0 flex-1">
      <p class="text-sm font-semibold truncate">${title}</p>
      <p class="text-xs text-slate-400 line-clamp-2">${body}</p>
    </div>
    <button class="p-1 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-700 transition shrink-0" aria-label="Dismiss">
      <i data-lucide="x" class="w-3.5 h-3.5"></i>
    </button>`;
  const close = () => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 300); };
  el.querySelector('button').addEventListener('click', e => { e.stopPropagation(); close(); });
  el.addEventListener('click', () => { onClick?.(); close(); });
  container.appendChild(el);
  if (window.lucide) lucide.createIcons();
  setTimeout(close, 5000);
}

// ─── Fire a single notification ───────────────────────────────
export function ping(type = 'message', data = {}) {
  if (type === 'message') {
    const p = data.person || pick(PEOPLE);
    const text = data.text || pick(MESSAGES);
    playMessageSound();
    richToast({ title: p.name, body: text, seed: p.seed,
      onClick: () => location.href = '/pages/dm.html' });
    bumpBadge(['Direct Messages']);
    updateChatPreview(p.name, text);
    browserNotify(p.name, text, 'dm-' + p.seed);
  } else if (type === 'mention') {
    const p = data.person || pick(PEOPLE);
    const where = data.text || pick(MENTIONS);
    playMentionSound();
    richToast({ title: `${p.name} ${where}`, body: 'Tap to view the mention', seed: p.seed,
      accent: 'amber', onClick: () => location.href = '/pages/notifications.html' });
    bumpBadge(['Mentions']);
    browserNotify(`${p.name} mentioned you`, where, 'mention');
  } else if (type === 'file') {
    const p = data.person || pick(PEOPLE);
    const f = data.file || pick(FILES);
    playMessageSound();
    richToast({ title: `${p.name} shared a file`, body: `${f.name} · ${f.kind}`, seed: p.seed,
      icon: 'paperclip', onClick: () => location.href = '/pages/files.html' });
    bumpBadge(['Direct Messages']);
    browserNotify(`${p.name} shared a file`, f.name, 'file');
  } else if (type === 'call') {
    incomingCall(data.person || pick(PEOPLE), data.video);
  }
}

// ─── Incoming call modal (ringing, Accept / Decline) ──────────
let callModal = null;
export function incomingCall(person = pick(PEOPLE), video = rand() > 0.5) {
  const p = typeof person === 'string' ? { name: person, seed: person.toLowerCase() } : person;
  if (!callModal) {
    callModal = document.createElement('div');
    callModal.id = 'nx-call-modal';
    callModal.className = 'hidden fixed inset-0 z-[9999] flex items-center justify-center p-4';
    callModal.innerHTML = `
      <div data-call-backdrop class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"></div>
      <div class="relative w-full max-w-sm bg-slate-800 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden fade-in text-center">
        <div class="pt-8 pb-6 px-6">
          <p class="text-xs uppercase tracking-widest text-slate-400 mb-6" data-call-kind>Incoming call</p>
          <div class="relative w-24 h-24 mx-auto mb-4">
            <span class="absolute inset-0 rounded-full bg-violet-500/30 animate-ping"></span>
            <img data-call-avatar class="relative w-24 h-24 rounded-full bg-slate-700 ring-4 ring-violet-500/40" alt="" />
          </div>
          <p class="text-lg font-bold text-slate-100" data-call-name>—</p>
          <p class="text-sm text-slate-400 mt-1" data-call-sub>Nexus · ringing…</p>
        </div>
        <div class="flex items-center justify-center gap-10 pb-8">
          <button data-call-decline class="flex flex-col items-center gap-2 group">
            <span class="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-500 flex items-center justify-center shadow-lg transition group-active:scale-95"><i data-lucide="phone-off" class="w-6 h-6 text-white"></i></span>
            <span class="text-xs text-slate-400">Decline</span>
          </button>
          <button data-call-accept class="flex flex-col items-center gap-2 group">
            <span class="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center shadow-lg transition group-active:scale-95"><i data-lucide="phone" class="w-6 h-6 text-white"></i></span>
            <span class="text-xs text-slate-400">Accept</span>
          </button>
        </div>
      </div>`;
    document.body.appendChild(callModal);
    callModal.querySelector('[data-call-decline]').addEventListener('click', () => endCall('declined'));
    callModal.querySelector('[data-call-accept]').addEventListener('click', () => endCall('accepted'));
    callModal.querySelector('[data-call-backdrop]').addEventListener('click', () => endCall('dismissed'));
  }
  callModal.querySelector('[data-call-avatar]').src = avatar(p.seed || p.name);
  callModal.querySelector('[data-call-name]').textContent = p.name;
  callModal.querySelector('[data-call-kind]').textContent = video ? 'Incoming video call' : 'Incoming voice call';
  callModal.querySelector('[data-call-sub]').innerHTML = `<i data-lucide="${video ? 'video' : 'phone'}" class="w-3.5 h-3.5 inline-block -mt-0.5"></i> Nexus · ringing…`;
  callModal.dataset.caller = p.name;
  callModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  if (window.lucide) lucide.createIcons();
  startRingtone();
  browserNotify(`Incoming ${video ? 'video' : 'voice'} call`, p.name, 'call');
  // Auto-miss after 25s if unanswered.
  clearTimeout(callModal._miss);
  callModal._miss = setTimeout(() => { if (!callModal.classList.contains('hidden')) endCall('missed'); }, 25000);
}

function endCall(outcome) {
  stopRingtone();
  clearTimeout(callModal?._miss);
  const caller = callModal?.dataset.caller || 'Caller';
  callModal?.classList.add('hidden');
  document.body.style.overflow = '';
  const msg = {
    accepted:  [`Call connected with ${caller}`, 'success'],
    declined:  [`Call from ${caller} declined`, 'info'],
    dismissed: [`Call from ${caller} dismissed`, 'info'],
    missed:    [`Missed call from ${caller}`, 'warning'],
  }[outcome] || ['Call ended', 'info'];
  window.NexusComponents?.toast(msg[0], msg[1]);
  if (outcome === 'missed') bumpBadge(['Calls']);
}

// ─── Live activity simulation (demo) ──────────────────────────
let simTimer = null;
function scheduleNext() {
  if (!prefs.simulate) return;
  const delay = 18000 + rand() * 27000; // 18–45s between events
  simTimer = setTimeout(() => {
    // Only fire while the tab is visible so a backgrounded tab doesn't pile up.
    if (document.visibilityState === 'visible') fireRandom();
    scheduleNext();
  }, delay);
}
function fireRandom() {
  const roll = rand();
  if (roll < 0.62) ping('message');
  else if (roll < 0.80) ping('mention');
  else if (roll < 0.92) ping('file');
  else ping('call');
}
export function startSimulation() {
  stopSimulation();
  if (!prefs.simulate) return;
  scheduleNext();
}
export function stopSimulation() {
  if (simTimer) { clearTimeout(simTimer); simTimer = null; }
}

// ─── Settings controls sync ([data-notif="key"]) ──────────────
function setNotifSwitch(btn, on) {
  if (!btn) return;
  btn.setAttribute('aria-checked', String(on));
  const thumb = btn.querySelector('.toggle-thumb') || btn.querySelector('span');
  btn.classList.toggle('bg-violet-600', on);
  btn.classList.toggle('bg-slate-700', !on);
  thumb?.classList.toggle('translate-x-6', on);
  thumb?.classList.toggle('translate-x-1', !on);
}
function syncControls() {
  document.querySelectorAll('[data-notif]').forEach(btn => {
    const key = btn.getAttribute('data-notif');
    if (key in prefs) setNotifSwitch(btn, prefs[key]);
  });
}

document.addEventListener('click', e => {
  const btn = e.target.closest('[data-notif]');
  if (!btn) return;
  const key = btn.getAttribute('data-notif');
  if (!(key in DEFAULTS)) return;
  e.preventDefault();
  set(key, btn.getAttribute('aria-checked') !== 'true');
  window.NexusComponents?.toast(
    `${labelFor(key)} ${prefs[key] ? 'on' : 'off'}`,
    prefs[key] ? 'success' : 'info', 1800);
});

// Manual "test" / trigger hooks for buttons in the UI.
document.addEventListener('click', e => {
  const t = e.target.closest('[data-notif-test]');
  if (t) { e.preventDefault(); ping(t.getAttribute('data-notif-test') || 'message'); }
  const c = e.target.closest('[data-notif-call]');
  if (c) { e.preventDefault(); incomingCall(undefined, c.getAttribute('data-notif-call') === 'video'); }
});

function labelFor(key) {
  return ({
    messageSound: 'Message sound', callRingtone: 'Call ringtone',
    browserNotif: 'Browser notifications', badges: 'Unread badges',
    simulate: 'Live activity demo',
  })[key] || key;
}

// ─── Boot ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  syncControls();
  updateTitleBadge();
  // Kick off the demo simulator a little after load so the page settles first.
  if (prefs.simulate) setTimeout(startSimulation, 8000);
});
document.addEventListener('visibilitychange', () => {
  // Pause ringtone audio when the tab is hidden; resume scheduling on return.
  if (document.visibilityState === 'hidden') stopRingtone();
});

window.NexusNotifications = {
  get, set, ping, incomingCall, playMessageSound,
  startSimulation, stopSimulation,
  startRingtone, stopRingtone,
};
