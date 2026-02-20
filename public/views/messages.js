import API from "../api.js";
import { $, esc } from "../lib/dom.js";
import { toast } from "../lib/toast.js";
import { errorText } from "../lib/errors.js";
import { store } from "../store.js";
import { showProfileModal } from "../widgets/profile_modal.js";
import { showChatMenu } from "../widgets/chat_menu.js";
import { loadChats } from "./chats.js";

export async function openChat(chatId){
  store.activeChatId = String(chatId||"");
  $("view-chats").classList.add("hidden");
  $("view-messages").classList.remove("hidden");

  $("view-messages").innerHTML = `
    <div class="msgShell">
      <div class="msgHeader">
        <button id="backChats" class="backBtn" type="button" aria-label="Back"><img src="/assets/back.svg" alt=""></button>
        <div class="avatar" id="chatAva" style="width:44px;height:44px;cursor:pointer"></div>
        <div class="msgHeaderTitle" id="chatTitleBlock" style="cursor:pointer">
          <div class="nameLine" id="chatNameLine"></div>
          <div class="statusLine" id="chatStatusLine"></div>
        </div>
        <div style="flex:1"></div>
        <button id="chatMenuBtn" class="iconBtn" type="button" aria-label="Menu"><span style="font-weight:950;font-size:18px;opacity:.9">⋮</span></button>
      </div>

      <div id="pinBarHost"></div>

      <div class="msgList chatBg" id="msgList"></div>

      <div class="composer">
        <div class="composerRow">
          <input id="msgInput" class="msgInput" placeholder="Сообщение" />
          <button id="sendBtn" class="sendBtn" type="button" aria-label="Send"><img src="/assets/send.svg" alt=""></button>
        </div>
      </div>
    </div>
  `;

  $("backChats").onclick = async()=>{
    store.activeChatId = null;
    $("view-messages").classList.add("hidden");
    $("view-chats").classList.remove("hidden");
    await loadChats();
  };

  await refreshChatMessages(true);

  // apply chat wallpaper theme (client-only)
  const theme = localStorage.getItem("ex_chat_theme") || "tg_doodles";
  applyChatTheme(theme);

  // header + pin bar
  const chat = store.chats.find(c=>String(c.id)===String(store.activeChatId));
  if(chat){
    const ava=$("chatAva");
    ava.innerHTML = chat.peer?.avatar_url
      ? `<img src="${esc(chat.peer.avatar_url)}" alt="">`
      : `<div class="ph">${esc((chat.title||"U").slice(0,1).toUpperCase())}</div>`;
    ava.onclick = ()=> chat.peer ? showProfileModal(chat.peer, store.token) : null;

    const v = chat.peer?.verified ? `<span class="vbadge" title="Verified"><svg viewBox="0 0 24 24"><path d="M12 2l3 3 4 .5-1.5 3.7 1.5 3.7-4 .5-3 3-3-3-4-.5 1.5-3.7L5 5.5 9 5l3-3z" fill="currentColor" opacity=".28"/><path d="M9.2 12.2l1.7 1.7 4.1-4.1" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>` : "";
    $("chatNameLine").innerHTML = `${esc(chat.title)} ${v}`;
    $("chatStatusLine").textContent = chat.peer?.status_text || "";
    $("chatTitleBlock").onclick = ()=> chat.peer ? showProfileModal(chat.peer, store.token) : null;

    $("chatMenuBtn").onclick = (ev)=> showChatMenu(ev, chat, store.token);

    const pin = chat.pinned_text || "";
    const host = $("pinBarHost");
    host.innerHTML = pin ? `<div class="pinBar"><div class="pinText">📌 ${esc(pin)}</div><button class="pinBtn" id="pinJump">Открыть</button></div>` : "";
    const bj = document.getElementById("pinJump");
    if(bj) bj.onclick=()=>{ const list=$("msgList"); list.scrollTop = 0; };
  }

  $("sendBtn").onclick = sendMessage;
  $("msgInput").addEventListener("keydown",(e)=>{ if(e.key==="Enter"){ e.preventDefault?.(); sendMessage(); } });

  await API.messagesMarkRead(store.token, store.activeChatId).catch(()=>{});
  await loadChats();
}

function applyChatTheme(theme){
  const list = document.getElementById("msgList");
  if(!list) return;
  // remove old wallpaper
  list.style.setProperty("--chat-wallpaper","none");
  if(theme==="tg_doodles"){
    list.style.backgroundImage = "url(/assets/tg_doodles.svg)";
    list.style.opacity = "1";
    list.style.backgroundRepeat = "repeat";
    list.style.backgroundSize = "480px";
  }else if(theme==="plain"){
    list.style.backgroundImage = "none";
  }else if(theme==="forest"){
    list.style.backgroundImage = "linear-gradient(rgba(52,199,89,.10), rgba(0,0,0,0))";
  }else if(theme==="sunset"){
    list.style.backgroundImage = "linear-gradient(rgba(255,149,0,.10), rgba(0,0,0,0))";
  }else if(theme==="pink"){
    list.style.backgroundImage = "linear-gradient(rgba(255,45,85,.10), rgba(0,0,0,0))";
  }else{
    list.style.backgroundImage = "none";
  }
}

async function sendMessage(){
  const inp=$("msgInput");
  const text = inp.value.trim();
  if(!text) return;
  inp.value = "";
  try{
    await API.messagesSend(store.token, store.activeChatId, text);
    await refreshChatMessages(false);
    const list=$("msgList"); list.scrollTop = list.scrollHeight;
  }catch(e){
    toast(errorText(e));
  }
}

export async function refreshChatMessages(scrollBottom=true){
  if(!store.token || !store.activeChatId) return;
  try{
    const r = await API.messagesList(store.token, store.activeChatId);
    const list = $("msgList");
    if(!list) return;

    const wasAtBottom = Math.abs((list.scrollTop + list.clientHeight) - list.scrollHeight) < 60;
    list.innerHTML = "";

    for(const m of (r.messages||[]).reverse()){
      const b=document.createElement("div");
      b.className = "bubble " + (m.is_me ? "me" : "");
      b.dataset.mid = m.id || "";
      b.innerHTML = `
        <div>${esc(m.text)}</div>
        <div class="msgMeta"><span>${new Date(m.ts).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"})}</span>${m.is_me?`<span class="checks">✓✓</span>`:""}</div>
      `;

      // delete own message (context menu / long press)
      if(m.is_me && m.id){
        const handler=(ev)=>{
          ev.preventDefault?.();
          showChatMenu(ev, { id: store.activeChatId, action:"delete_message", mid: m.id }, store.token);
        };
        b.addEventListener("contextmenu", handler);
        let t=null;
        b.addEventListener("touchstart", ()=>{ t=setTimeout(()=>handler(new Event("contextmenu")), 520); }, {passive:true});
        b.addEventListener("touchend", ()=>{ if(t) clearTimeout(t); t=null; });
      }

      list.appendChild(b);
    }

    if(scrollBottom || wasAtBottom){
      list.scrollTop = list.scrollHeight;
    }
  }catch(e){
    toast(errorText(e));
  }
}
