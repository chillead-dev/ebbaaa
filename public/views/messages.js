import API from "../api.js";
import { $, esc } from "../lib/dom.js";
import { store } from "../store.js";
import { loadChats } from "./chats.js";
import { toast } from "../lib/toast.js";
import { showProfileModal } from "../widgets/profile_modal.js";
import { showChatMenu } from "../widgets/chat_menu.js";

import { errorText } from "../lib/errors.js";
import { openUserProfile } from "./user_profile.js";
import { openSheet } from "./sheet.js";

function fmtTime(ts){
  try{ return new Date(ts).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"}); }catch{ return ""; }
}
function fmtDate(ts){
  try{ return new Date(ts).toLocaleDateString([], {day:"2-digit", month:"long"}); }catch{ return ""; }
}

export async function openChat(chatId){
  store.activeChatId = chatId;
  const chat = store.chats.find(c => c.id === chatId);
  store.activeChatTitle = chat?.title || "Чат";
  store.activePeer = chat?.peer || null;

  $("view-messages").classList.remove("hidden");
  $("view-chats").classList.add("hidden");

  const sub = store.activePeer?.status_text ? store.activePeer.status_text : "";
  $("view-messages").innerHTML = `
    <div class="msgShell">
      <div class="msgHeader">
        <button id="backChats" class="backBtn" type="button" aria-label="Назад"><img src="/assets/back.svg" alt=""></button>
        <div id="headerInfo" class="headerInfo">
          <div class="msgHeaderTitle">${esc(store.activeChatTitle)}</div>
          <div id="headerSub" class="msgHeaderSub">${esc(sub || "")}</div>
        </div>
        <button id="menuBtn" class="menuBtn" type="button" aria-label="Меню"><img src="/assets/menu.svg" alt=""></button>
      </div>
      <div class="msgList" id="msgList">
        <div class="dayChip">${esc(fmtDate(Date.now()))}</div>
      </div>
      <div class="composer">
        <div class="composerRow">
          <input id="msgInput" class="msgInput" placeholder="Сообщение" />
          <button id="sendBtn" class="sendBtn" type="button" aria-label="Отправить"><img src="/assets/send.svg" alt=""></button>
        </div>
      </div>
    </div>`;

  $("backChats").onclick = async () => {
    $("view-messages").classList.add("hidden");
    $("view-chats").classList.remove("hidden");
    store.activeChatId = null;
    await loadChats();
  };

  $("headerInfo").onclick = async () => {
    if(!store.activePeer?.username) return;
    try{
      const data = await API.userGet(store.token, store.activePeer.username);
      openUserProfile(data.user, { allowChat: true });
    }catch(e){ toast(errorText(e)); }
  };

  $("menuBtn").onclick = () => {
    openSheet([
      { label: "Закрепить последнее сообщение", onClick: async()=>{ await pinLatest(); } },
      { label: "Открепить", danger:false, onClick: async()=>{ await API.pinClear(store.token, store.activeChatId); await refreshChatMessages(true);

  // header UI
  const chat=store.chats.find(c=>c.id===store.activeChatId);
  if(chat){
    const ava=document.getElementById("chatAva");
    if(ava){
      ava.innerHTML = chat.peer?.avatar_url ? `<img src="${esc(chat.peer.avatar_url)}" alt="">` : `<div class="ph">${esc((chat.title||"U").slice(0,1).toUpperCase())}</div>`;
      ava.onclick=()=> chat.peer ? showProfileModal(chat.peer, store.token) : null;
    }
    const nameLine=document.getElementById("chatNameLine");
    const statusLine=document.getElementById("chatStatusLine");
    if(nameLine){
      const v = chat.peer?.verified ? `<span class="vbadge" title="Verified"><svg viewBox="0 0 24 24"><path d="M12 2l3 3 4 .5-1.5 3.7 1.5 3.7-4 .5-3 3-3-3-4-.5 1.5-3.7L5 5.5 9 5l3-3z" fill="currentColor" opacity=".28"/><path d="M9.2 12.2l1.7 1.7 4.1-4.1" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>` : "";
      nameLine.innerHTML = `${esc(chat.title)} ${v}`;
    }
    if(statusLine){
      statusLine.textContent = chat.peer?.status_text || "";
    }
    const titleBlock=document.getElementById("chatTitleBlock");
    if(titleBlock) titleBlock.onclick=()=> chat.peer ? showProfileModal(chat.peer, store.token) : null;

    const menuBtn=document.getElementById("chatMenuBtn");
    if(menuBtn) menuBtn.onclick=(ev)=>showChatMenu(ev, chat, store.token);
  }

  // pin bar
  try{
    const pin = chat?.pinned_text || "";
    const host=document.getElementById("pinBarHost");
    if(host){
      host.innerHTML = pin ? `<div class="pinBar"><div class="pinText">📌 ${esc(pin)}</div><button class="pinBtn" id="pinJump">Открыть</button></div>` : "";
      const bj=document.getElementById("pinJump");
      if(bj) bj.onclick=()=>{ const list=document.getElementById("msgList"); if(list) list.scrollTop=0; };
    }
  }catch{}
 toast("Откреплено"); } },
      { label: "Очистить у меня", danger:true, onClick: async()=>{ await API.messagesClear(store.token, store.activeChatId, 0); toast("Очищено у тебя"); $("view-messages").classList.add("hidden"); $("view-chats").classList.remove("hidden"); await loadChats(); } },
      { label: "Удалить чат у меня", danger:true, onClick: async()=>{ await API.chatsDelete(store.token, store.activeChatId, 0); toast("Чат удалён у тебя"); $("view-messages").classList.add("hidden"); $("view-chats").classList.remove("hidden"); await loadChats(); } },
      { label: "Очистить у всех", danger:true, onClick: async()=>{ await API.messagesClear(store.token, store.activeChatId, 1); toast("История очищена"); await loadChats(); await refreshChatMessages(true);

  // header UI
  const chat=store.chats.find(c=>c.id===store.activeChatId);
  if(chat){
    const ava=document.getElementById("chatAva");
    if(ava){
      ava.innerHTML = chat.peer?.avatar_url ? `<img src="${esc(chat.peer.avatar_url)}" alt="">` : `<div class="ph">${esc((chat.title||"U").slice(0,1).toUpperCase())}</div>`;
      ava.onclick=()=> chat.peer ? showProfileModal(chat.peer, store.token) : null;
    }
    const nameLine=document.getElementById("chatNameLine");
    const statusLine=document.getElementById("chatStatusLine");
    if(nameLine){
      const v = chat.peer?.verified ? `<span class="vbadge" title="Verified"><svg viewBox="0 0 24 24"><path d="M12 2l3 3 4 .5-1.5 3.7 1.5 3.7-4 .5-3 3-3-3-4-.5 1.5-3.7L5 5.5 9 5l3-3z" fill="currentColor" opacity=".28"/><path d="M9.2 12.2l1.7 1.7 4.1-4.1" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>` : "";
      nameLine.innerHTML = `${esc(chat.title)} ${v}`;
    }
    if(statusLine){
      statusLine.textContent = chat.peer?.status_text || "";
    }
    const titleBlock=document.getElementById("chatTitleBlock");
    if(titleBlock) titleBlock.onclick=()=> chat.peer ? showProfileModal(chat.peer, store.token) : null;

    const menuBtn=document.getElementById("chatMenuBtn");
    if(menuBtn) menuBtn.onclick=(ev)=>showChatMenu(ev, chat, store.token);
  }

  // pin bar
  try{
    const pin = chat?.pinned_text || "";
    const host=document.getElementById("pinBarHost");
    if(host){
      host.innerHTML = pin ? `<div class="pinBar"><div class="pinText">📌 ${esc(pin)}</div><button class="pinBtn" id="pinJump">Открыть</button></div>` : "";
      const bj=document.getElementById("pinJump");
      if(bj) bj.onclick=()=>{ const list=document.getElementById("msgList"); if(list) list.scrollTop=0; };
    }
  }catch{}
 } },
      { label: "Удалить у всех", danger:true, onClick: async()=>{ await API.chatsDelete(store.token, store.activeChatId, 1); toast("Чат удалён"); $("view-messages").classList.add("hidden"); $("view-chats").classList.remove("hidden"); await loadChats(); } },
    ]);
  };

  await refreshChatMessages(true);

  // header UI
  const chat=store.chats.find(c=>c.id===store.activeChatId);
  if(chat){
    const ava=document.getElementById("chatAva");
    if(ava){
      ava.innerHTML = chat.peer?.avatar_url ? `<img src="${esc(chat.peer.avatar_url)}" alt="">` : `<div class="ph">${esc((chat.title||"U").slice(0,1).toUpperCase())}</div>`;
      ava.onclick=()=> chat.peer ? showProfileModal(chat.peer, store.token) : null;
    }
    const nameLine=document.getElementById("chatNameLine");
    const statusLine=document.getElementById("chatStatusLine");
    if(nameLine){
      const v = chat.peer?.verified ? `<span class="vbadge" title="Verified"><svg viewBox="0 0 24 24"><path d="M12 2l3 3 4 .5-1.5 3.7 1.5 3.7-4 .5-3 3-3-3-4-.5 1.5-3.7L5 5.5 9 5l3-3z" fill="currentColor" opacity=".28"/><path d="M9.2 12.2l1.7 1.7 4.1-4.1" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>` : "";
      nameLine.innerHTML = `${esc(chat.title)} ${v}`;
    }
    if(statusLine){
      statusLine.textContent = chat.peer?.status_text || "";
    }
    const titleBlock=document.getElementById("chatTitleBlock");
    if(titleBlock) titleBlock.onclick=()=> chat.peer ? showProfileModal(chat.peer, store.token) : null;

    const menuBtn=document.getElementById("chatMenuBtn");
    if(menuBtn) menuBtn.onclick=(ev)=>showChatMenu(ev, chat, store.token);
  }

  // pin bar
  try{
    const pin = chat?.pinned_text || "";
    const host=document.getElementById("pinBarHost");
    if(host){
      host.innerHTML = pin ? `<div class="pinBar"><div class="pinText">📌 ${esc(pin)}</div><button class="pinBtn" id="pinJump">Открыть</button></div>` : "";
      const bj=document.getElementById("pinJump");
      if(bj) bj.onclick=()=>{ const list=document.getElementById("msgList"); if(list) list.scrollTop=0; };
    }
  }catch{}

  await API.messagesMarkRead(store.token, store.activeChatId).catch(()=>{});
  await loadChats();

  $("sendBtn").onclick = async () => {
    const text = $("msgInput").value.trim();
    if(!text) return;
    $("msgInput").value = "";
    try{
      await API.messagesSend(store.token, store.activeChatId, text);
      await refreshChatMessages(true);

  // header UI
  const chat=store.chats.find(c=>c.id===store.activeChatId);
  if(chat){
    const ava=document.getElementById("chatAva");
    if(ava){
      ava.innerHTML = chat.peer?.avatar_url ? `<img src="${esc(chat.peer.avatar_url)}" alt="">` : `<div class="ph">${esc((chat.title||"U").slice(0,1).toUpperCase())}</div>`;
      ava.onclick=()=> chat.peer ? showProfileModal(chat.peer, store.token) : null;
    }
    const nameLine=document.getElementById("chatNameLine");
    const statusLine=document.getElementById("chatStatusLine");
    if(nameLine){
      const v = chat.peer?.verified ? `<span class="vbadge" title="Verified"><svg viewBox="0 0 24 24"><path d="M12 2l3 3 4 .5-1.5 3.7 1.5 3.7-4 .5-3 3-3-3-4-.5 1.5-3.7L5 5.5 9 5l3-3z" fill="currentColor" opacity=".28"/><path d="M9.2 12.2l1.7 1.7 4.1-4.1" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>` : "";
      nameLine.innerHTML = `${esc(chat.title)} ${v}`;
    }
    if(statusLine){
      statusLine.textContent = chat.peer?.status_text || "";
    }
    const titleBlock=document.getElementById("chatTitleBlock");
    if(titleBlock) titleBlock.onclick=()=> chat.peer ? showProfileModal(chat.peer, store.token) : null;

    const menuBtn=document.getElementById("chatMenuBtn");
    if(menuBtn) menuBtn.onclick=(ev)=>showChatMenu(ev, chat, store.token);
  }

  // pin bar
  try{
    const pin = chat?.pinned_text || "";
    const host=document.getElementById("pinBarHost");
    if(host){
      host.innerHTML = pin ? `<div class="pinBar"><div class="pinText">📌 ${esc(pin)}</div><button class="pinBtn" id="pinJump">Открыть</button></div>` : "";
      const bj=document.getElementById("pinJump");
      if(bj) bj.onclick=()=>{ const list=document.getElementById("msgList"); if(list) list.scrollTop=0; };
    }
  }catch{}

      await loadChats();
    }catch(e){ toast(errorText(e)); }
  };
}

async function pinLatest(){
  const data = await API.messagesList(store.token, store.activeChatId);
  const last = data.messages?.[data.messages.length-1];
  if(!last) return toast("Пока нечего закреплять");
  await API.pinSet(store.token, store.activeChatId, { text: last.text, ts: last.ts });
  toast("Закреплено ✅");
  await refreshChatMessages(false);
}

export async function refreshChatMessages(scrollDown=false){
  const [pin, data] = await Promise.all([
    API.pinGet(store.token, store.activeChatId).catch(()=>({pinned:null})),
    API.messagesList(store.token, store.activeChatId),
  ]);

  const list = $("msgList");
  list.innerHTML = `<div class="dayChip">${esc(fmtDate(Date.now()))}</div>`;

  if(pin?.pinned?.text){
    const pinEl = document.createElement("div");
    pinEl.className = "pinBar";
    pinEl.innerHTML = `<div class="pinTitle">Закреплено</div><div class="pinText">${esc(pin.pinned.text)}</div>`;
    list.appendChild(pinEl);
    pinEl.onclick = ()=>toast("Закреп: " + (pin.pinned.text.length>40?pin.pinned.text.slice(0,40)+"…":pin.pinned.text));
  }

  for(const m of (data.messages||[])){
    const b = document.createElement("div");
    b.className = "bubble" + (m.is_me ? " me" : "");
    b.dataset.msgid = m.id || "";
    b.dataset.isme = m.is_me ? "1":"0";
    b.innerHTML = `
      <div class="msgText">${esc(m.text)}</div>
      <div class="msgMeta"><span>${esc(fmtTime(m.ts))}</span>${m.is_me?`<span class=\"checks\">✓✓</span>`:""}</div>
    `;
    list.appendChild(b);
    // delete message (my messages)
    const tryDelete = async()=>{
      const id = b.dataset.msgid;
      if(!id || b.dataset.isme!=="1") return;
      openSheet([
        { label: "Удалить сообщение", danger:true, onClick: async()=>{ await API.messagesDelete(store.token, store.activeChatId, id); toast("Удалено"); await refreshChatMessages(true);

  // header UI
  const chat=store.chats.find(c=>c.id===store.activeChatId);
  if(chat){
    const ava=document.getElementById("chatAva");
    if(ava){
      ava.innerHTML = chat.peer?.avatar_url ? `<img src="${esc(chat.peer.avatar_url)}" alt="">` : `<div class="ph">${esc((chat.title||"U").slice(0,1).toUpperCase())}</div>`;
      ava.onclick=()=> chat.peer ? showProfileModal(chat.peer, store.token) : null;
    }
    const nameLine=document.getElementById("chatNameLine");
    const statusLine=document.getElementById("chatStatusLine");
    if(nameLine){
      const v = chat.peer?.verified ? `<span class="vbadge" title="Verified"><svg viewBox="0 0 24 24"><path d="M12 2l3 3 4 .5-1.5 3.7 1.5 3.7-4 .5-3 3-3-3-4-.5 1.5-3.7L5 5.5 9 5l3-3z" fill="currentColor" opacity=".28"/><path d="M9.2 12.2l1.7 1.7 4.1-4.1" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>` : "";
      nameLine.innerHTML = `${esc(chat.title)} ${v}`;
    }
    if(statusLine){
      statusLine.textContent = chat.peer?.status_text || "";
    }
    const titleBlock=document.getElementById("chatTitleBlock");
    if(titleBlock) titleBlock.onclick=()=> chat.peer ? showProfileModal(chat.peer, store.token) : null;

    const menuBtn=document.getElementById("chatMenuBtn");
    if(menuBtn) menuBtn.onclick=(ev)=>showChatMenu(ev, chat, store.token);
  }

  // pin bar
  try{
    const pin = chat?.pinned_text || "";
    const host=document.getElementById("pinBarHost");
    if(host){
      host.innerHTML = pin ? `<div class="pinBar"><div class="pinText">📌 ${esc(pin)}</div><button class="pinBtn" id="pinJump">Открыть</button></div>` : "";
      const bj=document.getElementById("pinJump");
      if(bj) bj.onclick=()=>{ const list=document.getElementById("msgList"); if(list) list.scrollTop=0; };
    }
  }catch{}
 await loadChats(); } },
        { label: "Отмена", danger:false, onClick: async()=>{} },
      ]);
    };
    b.oncontextmenu = (e)=>{ e.preventDefault(); tryDelete(); };
    let pressT=null;
    b.addEventListener('touchstart', ()=>{ pressT=setTimeout(()=>{ tryDelete(); }, 450); }, {passive:true});
    b.addEventListener('touchend', ()=>{ if(pressT) clearTimeout(pressT); pressT=null; }, {passive:true});
    b.addEventListener('touchmove', ()=>{ if(pressT) clearTimeout(pressT); pressT=null; }, {passive:true});
  }

  // Update header presence
  try{
    const chat = store.chats.find(c => c.id === store.activeChatId);
    const sub = chat?.peer?.status_text || "";
    const h = $("headerSub");
    if(h) h.textContent = sub;
  }catch{}

  if(scrollDown) list.scrollTop = list.scrollHeight;
}
