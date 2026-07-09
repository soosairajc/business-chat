(function(){const r=document.createElement("link").relList;if(r&&r.supports&&r.supports("modulepreload"))return;for(const e of document.querySelectorAll('link[rel="modulepreload"]'))a(e);new MutationObserver(e=>{for(const s of e)if(s.type==="childList")for(const l of s.addedNodes)l.tagName==="LINK"&&l.rel==="modulepreload"&&a(l)}).observe(document,{childList:!0,subtree:!0});function i(e){const s={};return e.integrity&&(s.integrity=e.integrity),e.referrerPolicy&&(s.referrerPolicy=e.referrerPolicy),e.crossOrigin==="use-credentials"?s.credentials="include":e.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function a(e){if(e.ep)return;e.ep=!0;const s=i(e);fetch(e.href,s)}})();const o=document.getElementById("message-input"),m=document.getElementById("send-btn"),n=document.getElementById("messages"),u=document.getElementById("typing-indicator");n.scrollTop=n.scrollHeight;o.addEventListener("keydown",t=>{t.key==="Enter"&&!t.shiftKey&&(t.preventDefault(),d())});m.addEventListener("click",d);function d(){const t=o.value.trim();if(!t)return;u.remove();const i=new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}),a=document.createElement("div");a.className="flex items-end gap-2.5 max-w-xl ml-auto flex-row-reverse",a.innerHTML=`
    <img src="https://api.dicebear.com/9.x/avataaars/svg?seed=you"
         class="w-7 h-7 rounded-full bg-gray-700 shrink-0 mb-0.5" />
    <div class="space-y-1 items-end flex flex-col">
      <div class="flex items-center gap-2 mb-1">
        <span class="text-xs text-gray-600">${i}</span>
        <span class="text-xs font-medium text-gray-400">You</span>
      </div>
      <div class="bg-indigo-600 text-white text-sm px-4 py-2.5 rounded-2xl rounded-br-md leading-relaxed">
        ${c(t)}
      </div>
    </div>
  `,n.appendChild(a),o.value="",o.style.height="auto",n.scrollTop=n.scrollHeight,setTimeout(()=>{const e=g();n.appendChild(e),n.scrollTop=n.scrollHeight,setTimeout(()=>{e.remove();const s=["Got it, thanks!","Sounds good 👍","I'll take a look!","On it!","Makes sense, let's do it.","Perfect, I'll follow up shortly."];p(s[Math.floor(Math.random()*s.length)])},1800+Math.random()*1e3)},600)}function p(t){const i=new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}),a=document.createElement("div");a.className="flex items-end gap-2.5 max-w-xl",a.innerHTML=`
    <img src="https://api.dicebear.com/9.x/avataaars/svg?seed=alice"
         class="w-7 h-7 rounded-full bg-gray-700 shrink-0 mb-0.5" />
    <div class="space-y-1">
      <div class="flex items-center gap-2 mb-1">
        <span class="text-xs text-gray-600">${i}</span>
      </div>
      <div class="bg-gray-800 text-gray-100 text-sm px-4 py-2.5 rounded-2xl rounded-bl-md leading-relaxed">
        ${c(t)}
      </div>
    </div>
  `,n.appendChild(a),n.scrollTop=n.scrollHeight}function g(){const t=document.createElement("div");return t.className="flex items-end gap-2.5 max-w-xl",t.innerHTML=`
    <img src="https://api.dicebear.com/9.x/avataaars/svg?seed=alice"
         class="w-7 h-7 rounded-full bg-gray-700 shrink-0 mb-0.5" />
    <div class="bg-gray-800 px-4 py-3 rounded-2xl rounded-bl-md flex items-center gap-1">
      <span class="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style="animation-delay:0ms"></span>
      <span class="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style="animation-delay:150ms"></span>
      <span class="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style="animation-delay:300ms"></span>
    </div>
  `,t}function c(t){return t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/\n/g,"<br>")}
