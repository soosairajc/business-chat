/**
 * ai.js — Frontend-only "AI" engine for the Nexus template.
 *
 * There is NO real model, API, or network here. Every "AI" output is produced
 * by deterministic sample transforms + curated sample data, wrapped in a fake
 * "thinking" delay so the UI feels alive. All preferences persist to
 * localStorage['nexus-ai'].
 *
 * Public API (window.NexusAI):
 *   get() / set(key,val) / reset()          preferences
 *   chatReply(text)            → string     assistant answer
 *   suggestions(incoming,style)→ string[]   quick replies
 *   summarize(convo)           → object     bullets/decisions/actions/sentiment
 *   rewrite(text,mode)         → string     professional|friendly|shorter|grammar
 *   translate(text,lang)       → string     sample translation
 *   think(ms)                  → Promise     fake latency
 *   typeInto(el,text,opts)     → Promise     typewriter effect
 *   renderSidebar(active)                    inject shared AI nav
 */

const KEY = 'nexus-ai';

const DEFAULTS = {
  assistant: true,
  suggestions: true,
  summary: true,
  rewrite: true,
  translate: true,
  style: 'professional',   // professional | friendly | casual
  language: 'es',          // default translate target
};

const LANGUAGES = [
  { code: 'es', name: 'Spanish',    flag: '🇪🇸' },
  { code: 'fr', name: 'French',     flag: '🇫🇷' },
  { code: 'de', name: 'German',     flag: '🇩🇪' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'it', name: 'Italian',    flag: '🇮🇹' },
  { code: 'hi', name: 'Hindi',      flag: '🇮🇳' },
  { code: 'ja', name: 'Japanese',   flag: '🇯🇵' },
  { code: 'zh', name: 'Chinese',    flag: '🇨🇳' },
  { code: 'ar', name: 'Arabic',     flag: '🇸🇦' },
];

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
}
export function reset() {
  prefs = { ...DEFAULTS };
  save();
  syncControls();
  window.NexusComponents?.toast('AI preferences reset to defaults', 'success');
}
export function languages() { return LANGUAGES.slice(); }
export function isEnabled(feature) { return !!prefs[feature]; }

// ─── Fake latency + typewriter ────────────────────────────────
export function think(ms = 700) {
  return new Promise(res => setTimeout(res, ms));
}

export function typeInto(el, text, { speed = 14, html = false } = {}) {
  return new Promise(resolve => {
    let i = 0;
    el.textContent = '';
    const step = () => {
      i += Math.max(1, Math.round(text.length / 90));
      const slice = text.slice(0, i);
      if (html) el.innerHTML = slice; else el.textContent = slice;
      el.scrollTop = el.scrollHeight;
      if (i < text.length) setTimeout(step, speed);
      else { if (html) el.innerHTML = text; else el.textContent = text; resolve(); }
    };
    step();
  });
}

// ─── Small helpers ────────────────────────────────────────────
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const strip = s => s.trim().replace(/\s+/g, ' ');
const sentences = s => strip(s).split(/(?<=[.!?])\s+/).filter(Boolean);
const words = s => strip(s).split(' ').filter(Boolean);

// ═══════════════════════════════════════════════════════════════
//  AI CHAT ASSISTANT
// ═══════════════════════════════════════════════════════════════
const ASSISTANT_KB = [
  { rx: /\b(summar|recap|catch me up|tl;?dr)\b/i, a: () =>
    "Here's a quick recap of today's activity:\n\n• The design team shipped the new dark-mode tokens to Figma.\n• Engineering deployed API rate-limiting to staging (10k req/s, p99 < 50ms).\n• Product moved AI summarization up to Q1.\n\nWant me to open the full Conversation Summary?" },
  { rx: /\b(meeting|schedule|calendar|remind)\b/i, a: () =>
    "I can help you plan that. Based on the thread, everyone seems free after 3 PM. A good agenda would be:\n\n1. Sprint demo (15 min)\n2. Roadmap review (20 min)\n3. Open Q&A (10 min)\n\nShould I draft an invite message you can copy?" },
  { rx: /\b(write|draft|email|message|reply)\b/i, a: () =>
    "Sure — here's a draft you can adjust:\n\n\"Hi team, thanks for the quick turnaround on this. I've reviewed the changes and they look great. Let's sync briefly tomorrow to align on next steps. Appreciate the effort! 🙌\"\n\nTip: try the AI Rewrite tool to switch the tone." },
  { rx: /\b(translate|spanish|french|german|language)\b/i, a: () =>
    "I can translate messages into 9 languages. Head to AI Translate, paste your text, and pick a target language. For example, \"Thanks for your help!\" in Spanish is \"¡Gracias por tu ayuda!\"." },
  { rx: /\b(bug|error|issue|broken|fix)\b/i, a: () =>
    "Let's troubleshoot. A good first pass:\n\n1. Reproduce it with the smallest possible steps.\n2. Check the console for the first error, not the last.\n3. Bisect recent commits if it worked before.\n\nShare the error text and I'll suggest likely causes." },
  { rx: /\b(hello|hi|hey|good morning|good afternoon)\b/i, a: () =>
    "Hi there! 👋 I'm your Nexus AI assistant. I can summarize conversations, draft replies, rewrite messages, translate text, and answer questions about your workspace. What would you like to do?" },
  { rx: /\b(thank|thanks|appreciate)\b/i, a: () =>
    "You're very welcome! 😊 Anything else I can help you with?" },
  { rx: /\b(what can you|help|feature|capabilit)\b/i, a: () =>
    "Here's what I can do:\n\n• 💬 Answer questions & brainstorm\n• 📝 Summarize long conversations\n• ✍️ Rewrite messages (professional, friendly, shorter, grammar)\n• 🌍 Translate into 9 languages\n• 💡 Suggest quick replies\n\nJust ask, or open any AI tool from the sidebar." },
];
const ASSISTANT_FALLBACK = [
  "Great question. Here's how I'd approach it: break the problem into the smallest testable piece, confirm your assumptions with a quick example, then expand from there. Want me to go deeper on any part?",
  "Based on what's in this workspace, I'd suggest starting with the highest-impact item and time-boxing it. I can draft a short plan if that helps.",
  "Here's a concise take: focus on clarity first, then polish. If you paste the specific text or context, I can give you a sharper, tailored answer.",
];
export function chatReply(text) {
  const hit = ASSISTANT_KB.find(k => k.rx.test(text));
  if (hit) return hit.a();
  // Deterministic-ish fallback based on message length so it feels responsive.
  return ASSISTANT_FALLBACK[words(text).length % ASSISTANT_FALLBACK.length];
}

// ═══════════════════════════════════════════════════════════════
//  AI REPLY SUGGESTIONS
// ═══════════════════════════════════════════════════════════════
const SUGGEST_BANK = {
  professional: [
    'Thank you for the update. I will review this and follow up shortly.',
    'Understood — I appreciate you flagging this. Let me look into it.',
    'That works for me. Please go ahead and I will align accordingly.',
    'Noted, thank you. I will circle back with next steps by end of day.',
  ],
  friendly: [
    'Thanks so much for this! 🙌 I\'ll take a look right away.',
    'Awesome, sounds great to me! Let\'s do it 😊',
    'Appreciate you sharing — I\'m on it! 💪',
    'Love it! I\'ll get back to you super soon 👍',
  ],
  casual: [
    'Cool, thanks! I\'ll check it out.',
    'Sounds good 👍 on it.',
    'Got it — will do!',
    'Nice, thanks for the heads up.',
  ],
};
// Light context sensitivity: questions get an answer-shaped reply first.
export function suggestions(incoming = '', style = prefs.style) {
  const bank = SUGGEST_BANK[style] || SUGGEST_BANK.professional;
  const list = bank.slice();
  if (/\?\s*$/.test(strip(incoming))) {
    const yes = { professional: 'Yes, that works for me.', friendly: 'Yes, absolutely! 🎉', casual: 'Yep, works for me!' };
    list.unshift(yes[style] || yes.professional);
  }
  if (/\b(thank|thanks)\b/i.test(incoming)) {
    const wc = { professional: 'You\'re welcome — happy to help.', friendly: 'Anytime! 😊', casual: 'No worries!' };
    list.unshift(wc[style] || wc.professional);
  }
  return list.slice(0, 4);
}

// ═══════════════════════════════════════════════════════════════
//  AI CONVERSATION SUMMARY
// ═══════════════════════════════════════════════════════════════
export const SAMPLE_CONVERSATIONS = {
  'design-sync': {
    title: '#design-sync', messages: 42, people: ['Alice Chen', 'David Kim', 'Sarah Park'],
    summary: {
      overview: 'The design team finalized the dark-mode design tokens and agreed on a handoff plan to engineering. Typography and spacing scales are locked; a few icon colors still need review.',
      bullets: [
        'Dark-mode color tokens, spacing scale, and typography styles are complete in Figma.',
        'Alice will export the tokens as a JSON file for the engineering team.',
        'Sarah raised that some semantic icon colors fail AA contrast on dark backgrounds.',
        'The team preferred a subtle 150ms ease for component transitions.',
      ],
      decisions: [
        'Ship design tokens as JSON, not a Style Dictionary, for the first pass.',
        'Adopt violet as the primary accent, with per-user override in Settings.',
      ],
      actions: [
        { who: 'Alice Chen', task: 'Export design tokens to JSON and share in #engineering', due: 'Tomorrow' },
        { who: 'Sarah Park', task: 'Audit icon colors for AA contrast on dark surfaces', due: 'Fri' },
        { who: 'David Kim', task: 'Prototype the 150ms transition timing in the component library', due: 'Next week' },
      ],
      sentiment: 'Positive', sentimentNote: 'Collaborative and productive; minor open concern on contrast.',
    },
  },
  'q4-planning': {
    title: '#q4-planning', messages: 68, people: ['Carol Wu', 'Mike Ross', 'Priya Sharma'],
    summary: {
      overview: 'Product reprioritized the Q4 roadmap based on user research. The notification center, file search, and team directory are top priorities; AI summarization moves to Q1.',
      bullets: [
        'User research showed notifications and search as the most-requested features.',
        'AI summarization is technically ready but deprioritized to Q1 for capacity.',
        'Mike flagged a dependency: file search needs the new indexing service.',
        'Priya will prepare updated stakeholder-facing roadmap slides.',
      ],
      decisions: [
        'Q4 scope: Notification Center, File Search, Team Directory.',
        'Push AI Summarization and Voice Messages to Q1.',
      ],
      actions: [
        { who: 'Mike Ross', task: 'Scope the indexing service and estimate effort', due: 'Wed' },
        { who: 'Priya Sharma', task: 'Update the Q4 roadmap deck for the leadership review', due: 'Mon' },
        { who: 'Carol Wu', task: 'Write the notification center PRD', due: 'This week' },
      ],
      sentiment: 'Focused', sentimentNote: 'Aligned and decisive with clear ownership.',
    },
  },
  'incident-501': {
    title: '#incident-501', messages: 31, people: ['Bob Martinez', 'Tom Baker', 'Sarah Kim'],
    summary: {
      overview: 'A staging outage caused by a rate-limit misconfiguration was identified and resolved within 40 minutes. A follow-up is planned to add alerting and a config safeguard.',
      bullets: [
        'Staging returned 429s after a bad rate-limit value was deployed.',
        'Bob rolled back the config; service recovered within 8 minutes of the fix.',
        'Root cause: an env var defaulted to 10 req/s instead of 10k.',
        'No customer impact — the issue was isolated to staging.',
      ],
      decisions: [
        'Add a validation guard so rate limits below 100 req/s require review.',
        'Create a synthetic alert for sustained 429 rates.',
      ],
      actions: [
        { who: 'Tom Baker', task: 'Add config validation for rate-limit bounds', due: 'Tomorrow' },
        { who: 'Sarah Kim', task: 'Set up a 429-rate alert in the dashboard', due: 'Thu' },
        { who: 'Bob Martinez', task: 'Write the incident postmortem', due: 'Fri' },
      ],
      sentiment: 'Resolved', sentimentNote: 'Calm, coordinated response; clear preventive follow-ups.',
    },
  },
};
export function summarize(key = 'design-sync') {
  return SAMPLE_CONVERSATIONS[key]?.summary || SAMPLE_CONVERSATIONS['design-sync'].summary;
}

// ═══════════════════════════════════════════════════════════════
//  AI REWRITE
// ═══════════════════════════════════════════════════════════════
function rewriteProfessional(t) {
  let s = strip(t);
  const map = [
    [/\bgonna\b/gi, 'going to'], [/\bwanna\b/gi, 'want to'], [/\bgotta\b/gi, 'have to'],
    [/\bkinda\b/gi, 'somewhat'], [/\byeah\b/gi, 'yes'], [/\bnope\b/gi, 'no'],
    [/\bhey\b/gi, 'Hello'], [/\bthanks\b/gi, 'thank you'], [/\bASAP\b/gi, 'at your earliest convenience'],
    [/!+/g, '.'], [/\s*u\s/gi, ' you '], [/\bpls\b/gi, 'please'], [/\bplz\b/gi, 'please'],
  ];
  map.forEach(([rx, rep]) => { s = s.replace(rx, rep); });
  s = s.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').trim();
  s = sentences(s).map(cap).join(' ');
  const openers = ['I wanted to follow up regarding this. ', 'Thank you for your message. ', 'I hope you are doing well. '];
  const closers = [' Please let me know if you have any questions.', ' I look forward to your response.', ' Do not hesitate to reach out with any concerns.'];
  return openers[s.length % openers.length] + s + closers[s.length % closers.length];
}
function rewriteFriendly(t) {
  let s = strip(t).replace(/\.$/, '');
  s = sentences(s).map(cap).join(' ');
  const emojis = ['😊', '🙌', '✨', '👍', '🎉'];
  const openers = ['Hey! ', 'Hi there! ', 'Hey, hope you\'re good! '];
  const e = emojis[s.length % emojis.length];
  return `${openers[s.length % openers.length]}${s} ${e} Let me know what you think!`;
}
function rewriteShorter(t) {
  const parts = sentences(t);
  const kept = parts.slice(0, Math.max(1, Math.ceil(parts.length / 2)));
  let s = kept.join(' ');
  s = s.replace(/\b(really|very|just|actually|basically|literally|in order to|at this point in time)\b/gi, '')
       .replace(/\bin order to\b/gi, 'to').replace(/\s+/g, ' ').trim();
  const w = words(s);
  if (w.length > 22) s = w.slice(0, 22).join(' ') + '…';
  return cap(s);
}
function rewriteGrammar(t) {
  let s = strip(t);
  s = s.replace(/\s+([,.!?;:])/g, '$1').replace(/([,.!?;:])(?=[^\s])/g, '$1 ');
  s = s.replace(/\bi\b/g, 'I').replace(/\bdont\b/gi, "don't").replace(/\bcant\b/gi, "can't")
       .replace(/\bwont\b/gi, "won't").replace(/\bim\b/gi, "I'm").replace(/\bive\b/gi, "I've")
       .replace(/\byoure\b/gi, "you're").replace(/\bteh\b/gi, 'the').replace(/\brecieve\b/gi, 'receive')
       .replace(/\bdefinately\b/gi, 'definitely').replace(/\bseperate\b/gi, 'separate');
  s = sentences(s).map(cap).join(' ');
  if (!/[.!?]$/.test(s)) s += '.';
  return s;
}
export function rewrite(text, mode = 'professional') {
  if (!strip(text)) return '';
  return ({
    professional: rewriteProfessional,
    friendly: rewriteFriendly,
    shorter: rewriteShorter,
    grammar: rewriteGrammar,
  }[mode] || rewriteProfessional)(text);
}

// ═══════════════════════════════════════════════════════════════
//  AI TRANSLATE  (sample phrasebook — clearly a demo, not real MT)
// ═══════════════════════════════════════════════════════════════
const PHRASES = {
  es: { 'hello': 'hola', 'hi': 'hola', 'thanks': 'gracias', 'thank you': 'gracias', 'please': 'por favor',
    'yes': 'sí', 'no': 'no', 'good morning': 'buenos días', 'good night': 'buenas noches', 'how are you': 'cómo estás',
    'see you': 'nos vemos', 'welcome': 'bienvenido', 'sorry': 'lo siento', 'help': 'ayuda', 'team': 'equipo',
    'meeting': 'reunión', 'message': 'mensaje', 'file': 'archivo', 'great work': 'buen trabajo', 'let me know': 'avísame' },
  fr: { 'hello': 'bonjour', 'hi': 'salut', 'thanks': 'merci', 'thank you': 'merci', 'please': 's\'il vous plaît',
    'yes': 'oui', 'no': 'non', 'good morning': 'bonjour', 'good night': 'bonne nuit', 'how are you': 'comment ça va',
    'see you': 'à bientôt', 'welcome': 'bienvenue', 'sorry': 'désolé', 'help': 'aide', 'team': 'équipe',
    'meeting': 'réunion', 'message': 'message', 'file': 'fichier', 'great work': 'excellent travail', 'let me know': 'faites-moi savoir' },
  de: { 'hello': 'hallo', 'hi': 'hallo', 'thanks': 'danke', 'thank you': 'danke', 'please': 'bitte',
    'yes': 'ja', 'no': 'nein', 'good morning': 'guten morgen', 'good night': 'gute nacht', 'how are you': 'wie geht es dir',
    'see you': 'bis bald', 'welcome': 'willkommen', 'sorry': 'entschuldigung', 'help': 'hilfe', 'team': 'team',
    'meeting': 'besprechung', 'message': 'nachricht', 'file': 'datei', 'great work': 'gute arbeit', 'let me know': 'lass es mich wissen' },
  pt: { 'hello': 'olá', 'hi': 'oi', 'thanks': 'obrigado', 'thank you': 'obrigado', 'please': 'por favor',
    'yes': 'sim', 'no': 'não', 'good morning': 'bom dia', 'good night': 'boa noite', 'how are you': 'como vai',
    'see you': 'até logo', 'welcome': 'bem-vindo', 'sorry': 'desculpe', 'help': 'ajuda', 'team': 'equipe',
    'meeting': 'reunião', 'message': 'mensagem', 'file': 'arquivo', 'great work': 'ótimo trabalho', 'let me know': 'me avise' },
  it: { 'hello': 'ciao', 'hi': 'ciao', 'thanks': 'grazie', 'thank you': 'grazie', 'please': 'per favore',
    'yes': 'sì', 'no': 'no', 'good morning': 'buongiorno', 'good night': 'buonanotte', 'how are you': 'come stai',
    'see you': 'a presto', 'welcome': 'benvenuto', 'sorry': 'scusa', 'help': 'aiuto', 'team': 'squadra',
    'meeting': 'riunione', 'message': 'messaggio', 'file': 'file', 'great work': 'ottimo lavoro', 'let me know': 'fammi sapere' },
  hi: { 'hello': 'नमस्ते', 'hi': 'नमस्ते', 'thanks': 'धन्यवाद', 'thank you': 'धन्यवाद', 'please': 'कृपया',
    'yes': 'हाँ', 'no': 'नहीं', 'good morning': 'सुप्रभात', 'good night': 'शुभ रात्रि', 'how are you': 'आप कैसे हैं',
    'see you': 'फिर मिलेंगे', 'welcome': 'स्वागत है', 'sorry': 'माफ़ करें', 'help': 'मदद', 'team': 'टीम',
    'meeting': 'बैठक', 'message': 'संदेश', 'file': 'फ़ाइल', 'great work': 'बहुत बढ़िया', 'let me know': 'मुझे बताएं' },
  ja: { 'hello': 'こんにちは', 'hi': 'やあ', 'thanks': 'ありがとう', 'thank you': 'ありがとうございます', 'please': 'お願いします',
    'yes': 'はい', 'no': 'いいえ', 'good morning': 'おはよう', 'good night': 'おやすみ', 'how are you': '元気ですか',
    'see you': 'またね', 'welcome': 'ようこそ', 'sorry': 'ごめんなさい', 'help': '助けて', 'team': 'チーム',
    'meeting': '会議', 'message': 'メッセージ', 'file': 'ファイル', 'great work': 'お疲れ様', 'let me know': '教えてください' },
  zh: { 'hello': '你好', 'hi': '嗨', 'thanks': '谢谢', 'thank you': '谢谢', 'please': '请',
    'yes': '是', 'no': '不', 'good morning': '早上好', 'good night': '晚安', 'how are you': '你好吗',
    'see you': '再见', 'welcome': '欢迎', 'sorry': '对不起', 'help': '帮助', 'team': '团队',
    'meeting': '会议', 'message': '消息', 'file': '文件', 'great work': '干得好', 'let me know': '告诉我' },
  ar: { 'hello': 'مرحبا', 'hi': 'أهلا', 'thanks': 'شكرا', 'thank you': 'شكرا لك', 'please': 'من فضلك',
    'yes': 'نعم', 'no': 'لا', 'good morning': 'صباح الخير', 'good night': 'تصبح على خير', 'how are you': 'كيف حالك',
    'see you': 'إلى اللقاء', 'welcome': 'مرحبا', 'sorry': 'آسف', 'help': 'مساعدة', 'team': 'فريق',
    'meeting': 'اجتماع', 'message': 'رسالة', 'file': 'ملف', 'great work': 'عمل رائع', 'let me know': 'أعلمني' },
};
export function translate(text, lang = prefs.language) {
  const dict = PHRASES[lang];
  const src = strip(text);
  if (!src) return '';
  if (!dict) return src;
  const low = src.toLowerCase().replace(/[.!?]+$/, '');
  // Whole-phrase match first.
  if (dict[low]) return matchCase(dict[low], src);
  // Word / known-phrase substitution.
  let out = src;
  // Longer keys first so multi-word phrases win.
  Object.keys(dict).sort((a, b) => b.length - a.length).forEach(k => {
    const rx = new RegExp('\\b' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');
    out = out.replace(rx, dict[k]);
  });
  return out;
}
function matchCase(translated, source) {
  return /^[A-Z]/.test(source) ? cap(translated) : translated;
}
export function languageName(code) { return LANGUAGES.find(l => l.code === code)?.name || code; }
export function languageFlag(code) { return LANGUAGES.find(l => l.code === code)?.flag || '🌐'; }

// ═══════════════════════════════════════════════════════════════
//  Shared AI sidebar + settings-control sync
// ═══════════════════════════════════════════════════════════════
const NAV = [
  { id: 'assistant',   href: '/pages/ai-assistant.html',  icon: 'sparkles',       label: 'AI Assistant',  feat: 'assistant' },
  { id: 'suggestions', href: '/pages/ai-suggestions.html', icon: 'lightbulb',      label: 'Reply Suggestions', feat: 'suggestions' },
  { id: 'summary',     href: '/pages/ai-summary.html',     icon: 'text-select',    label: 'Conversation Summary', feat: 'summary' },
  { id: 'rewrite',     href: '/pages/ai-rewrite.html',     icon: 'wand-2',         label: 'AI Rewrite',    feat: 'rewrite' },
  { id: 'translate',   href: '/pages/ai-translate.html',   icon: 'languages',      label: 'AI Translate',  feat: 'translate' },
];
export function renderSidebar(active) {
  const host = document.querySelector('[data-ai-nav]');
  if (!host) return;
  host.innerHTML = NAV.map(n => {
    const on = active === n.id;
    const disabled = !prefs[n.feat];
    return `<a href="${n.href}" data-ai-nav-item="${n.id}"
      class="group w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition ${on ? 'bg-violet-600/20 text-violet-300' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'}">
      <i data-lucide="${n.icon}" class="w-4 h-4 shrink-0"></i>
      <span class="flex-1 truncate">${n.label}</span>
      ${disabled ? '<span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500">Off</span>' : ''}
    </a>`;
  }).join('') +
    `<a href="/pages/ai-settings.html" data-ai-nav-item="settings"
      class="group w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition mt-1 ${active === 'settings' ? 'bg-violet-600/20 text-violet-300' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'}">
      <i data-lucide="sliders-horizontal" class="w-4 h-4 shrink-0"></i><span>AI Settings</span></a>`;
  if (window.lucide) lucide.createIcons();
}

// Reflect a "disabled feature" state onto the page (banner + dim actions).
export function guardFeature(feature) {
  const banner = document.querySelector('[data-ai-disabled]');
  if (!banner) return true;
  const enabled = !!prefs[feature];
  banner.classList.toggle('hidden', enabled);
  document.querySelectorAll('[data-ai-guarded]').forEach(el => {
    el.classList.toggle('opacity-40', !enabled);
    el.classList.toggle('pointer-events-none', !enabled);
  });
  return enabled;
}

// ─── Settings-page control sync ([data-ai="key"]) ─────────────
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
  document.querySelectorAll('[data-ai]').forEach(el => {
    const key = el.getAttribute('data-ai');
    if (!(key in prefs)) return;
    if (el.matches('[role="switch"]')) setSwitch(el, prefs[key]);
    else if (el.matches('select')) el.value = prefs[key];
    else if (el.matches('[data-ai-style-opt]')) {
      const active = el.getAttribute('data-ai-style-opt') === prefs.style;
      el.classList.toggle('border-violet-500', active);
      el.classList.toggle('bg-violet-600/10', active);
      el.classList.toggle('border-slate-700', !active);
    }
  });
  // Reflect enable/disable onto any AI nav present.
  document.querySelectorAll('[data-ai-nav]').forEach(() => {
    const active = document.querySelector('[data-ai-active]')?.getAttribute('data-ai-active');
    renderSidebar(active);
  });
  if (window.lucide) lucide.createIcons();
}

// ─── Delegated events for settings controls ───────────────────
document.addEventListener('click', e => {
  const sw = e.target.closest('[data-ai][role="switch"]');
  if (sw) { const k = sw.getAttribute('data-ai'); set(k, sw.getAttribute('aria-checked') !== 'true');
    window.NexusComponents?.toast(`${cap(k)} ${prefs[k] ? 'enabled' : 'disabled'}`, prefs[k] ? 'success' : 'info', 1800); return; }
  const styleOpt = e.target.closest('[data-ai-style-opt]');
  if (styleOpt) { set('style', styleOpt.getAttribute('data-ai-style-opt'));
    window.NexusComponents?.toast(`Default style: ${cap(prefs.style)}`, 'success', 1800); return; }
  if (e.target.closest('[data-ai-reset]')) { e.preventDefault(); reset(); return; }
});
document.addEventListener('change', e => {
  const sel = e.target.closest('select[data-ai]');
  if (sel) { set(sel.getAttribute('data-ai'), sel.value);
    window.NexusComponents?.toast('AI preference saved', 'success', 1500); }
});

document.addEventListener('DOMContentLoaded', () => {
  const active = document.querySelector('[data-ai-active]')?.getAttribute('data-ai-active');
  if (document.querySelector('[data-ai-nav]')) renderSidebar(active);
  syncControls();
});

window.NexusAI = {
  get, set, reset, languages, languageName, languageFlag, isEnabled,
  think, typeInto, renderSidebar, guardFeature,
  chatReply, suggestions, summarize, rewrite, translate,
  SAMPLE_CONVERSATIONS,
};
