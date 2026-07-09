// Chat template — interactive enhancements

const input = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const messagesEl = document.getElementById('messages');
const typingIndicator = document.getElementById('typing-indicator');

// Auto-scroll to bottom on load
messagesEl.scrollTop = messagesEl.scrollHeight;

// Send message on Enter (Shift+Enter for newline)
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

sendBtn.addEventListener('click', sendMessage);

function sendMessage() {
  const text = input.value.trim();
  if (!text) return;

  // Hide typing indicator before appending
  typingIndicator.remove();

  // Build outgoing message bubble
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const wrapper = document.createElement('div');
  wrapper.className = 'flex items-end gap-2.5 max-w-xl ml-auto flex-row-reverse';
  wrapper.innerHTML = `
    <img src="https://api.dicebear.com/9.x/avataaars/svg?seed=you"
         class="w-7 h-7 rounded-full bg-gray-700 shrink-0 mb-0.5" />
    <div class="space-y-1 items-end flex flex-col">
      <div class="flex items-center gap-2 mb-1">
        <span class="text-xs text-gray-600">${time}</span>
        <span class="text-xs font-medium text-gray-400">You</span>
      </div>
      <div class="bg-indigo-600 text-white text-sm px-4 py-2.5 rounded-2xl rounded-br-md leading-relaxed">
        ${escapeHtml(text)}
      </div>
    </div>
  `;

  messagesEl.appendChild(wrapper);
  input.value = '';
  input.style.height = 'auto';
  messagesEl.scrollTop = messagesEl.scrollHeight;

  // Simulate Alice typing after a short delay
  setTimeout(() => {
    const newTyping = buildTypingIndicator();
    messagesEl.appendChild(newTyping);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    // Simulate reply
    setTimeout(() => {
      newTyping.remove();
      const replies = [
        "Got it, thanks!",
        "Sounds good 👍",
        "I'll take a look!",
        "On it!",
        "Makes sense, let's do it.",
        "Perfect, I'll follow up shortly.",
      ];
      appendIncoming(replies[Math.floor(Math.random() * replies.length)]);
    }, 1800 + Math.random() * 1000);
  }, 600);
}

function appendIncoming(text) {
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const wrapper = document.createElement('div');
  wrapper.className = 'flex items-end gap-2.5 max-w-xl';
  wrapper.innerHTML = `
    <img src="https://api.dicebear.com/9.x/avataaars/svg?seed=alice"
         class="w-7 h-7 rounded-full bg-gray-700 shrink-0 mb-0.5" />
    <div class="space-y-1">
      <div class="flex items-center gap-2 mb-1">
        <span class="text-xs text-gray-600">${time}</span>
      </div>
      <div class="bg-gray-800 text-gray-100 text-sm px-4 py-2.5 rounded-2xl rounded-bl-md leading-relaxed">
        ${escapeHtml(text)}
      </div>
    </div>
  `;

  messagesEl.appendChild(wrapper);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function buildTypingIndicator() {
  const el = document.createElement('div');
  el.className = 'flex items-end gap-2.5 max-w-xl';
  el.innerHTML = `
    <img src="https://api.dicebear.com/9.x/avataaars/svg?seed=alice"
         class="w-7 h-7 rounded-full bg-gray-700 shrink-0 mb-0.5" />
    <div class="bg-gray-800 px-4 py-3 rounded-2xl rounded-bl-md flex items-center gap-1">
      <span class="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style="animation-delay:0ms"></span>
      <span class="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style="animation-delay:150ms"></span>
      <span class="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style="animation-delay:300ms"></span>
    </div>
  `;
  return el;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br>');
}
