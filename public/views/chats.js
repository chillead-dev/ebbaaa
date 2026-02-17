import API from "../api.js";
import { $, esc } from "../lib/dom.js";
import { store } from "../store.js";
import { toast } from "../lib/toast.js";
import { errorText } from "../lib/errors.js";
import { openChat } from "./messages.js";

function avatarHtml(u){
  const online = u?.online ? `<span class="onlineDot"></span>` : ``;
  if(u?.avatar_url) return `<img src="${esc(u.avatar_url)}" alt="">${online}`;
  if(u?.avatar) return `<img src="${esc(u.avatar)}" alt="">${online}`;
  const ch=(u?.display_name||u?.username||"U").trim().slice(0,1).toUpperCase();
  return `<div class="ph">${esc(ch)}</div>${online}`;
}

export async function loadChats(){
  const data=await API.chatsList(store.token);
  store.chats=data.chats||[];
  renderChats();
}

export function renderChats(searchResults=null){
  const v=$("view-chats");
  const list=searchResults?searchResults.map(u=>({k:"u",u})) : store.chats.map(c=>({k:"c",c}));
  let html=`<div class="list">`;

  // Telegram-style "Saved Messages" at top
  html+=`<div class="row" data-saved="1">
    <div class="avatar"><div class="ph">★</div></div>
    <div class="mid"><div class="title">Избранное</div><div class="sub">Заметки и сохранённые сообщения</div></div>
    <div class="right"><div class="time"></div></div>
  </div>`;

  if(searchResults){
    html+=`<div class="row" style="opacity:.85;cursor:default"><div class="mid"><div class="title">Результаты</div><div class="sub">Нажми на пользователя, чтобы начать чат</div></div></div>`;
  }
  for(const it of list){
    if(it.k==="u"){
      const u=it.u;
      html+=`<div class="row" data-user="${esc(u.username)}">
        <div class="avatar">${avatarHtml(u)}</div>
        <div class="mid"><div class="title">${esc(u.display_name||u.username)}</div><div class="sub">@${esc(u.username)}</div></div>
        <div class="right"><div class="time"></div></div>
      </div>`;
    }else{
      const c=it.c;
      html+=`<div class="row" data-chat="${esc(c.id)}">
        <div class="avatar">${c.peer?avatarHtml(c.peer):`<div class="ph">💬</div>`}</div>
        <div class="mid"><div class="title">${esc(c.title)}</div><div class="sub">${esc(c.last_text||"Сообщений пока нет")}</div></div>
        <div class="right"><div class="time">${esc(c.last_time||"")}</div>${c.unread?`<div class="badge">${c.unread}</div>`:""}</div>
      </div>`;
    }
  }
  html+=`</div>`;
  v.innerHTML=html;

  v.querySelectorAll("[data-saved]").forEach(el=>el.onclick=()=>toast("Избранное (скоро): локальные заметки"));
  v.querySelectorAll("[data-chat]").forEach(el=>el.onclick=()=>openChat(el.getAttribute("data-chat")));
  v.querySelectorAll("[data-user]").forEach(el=>el.onclick=async()=>{
    const uname=el.getAttribute("data-user");
    try{
      const r=await API.chatsStartDm(store.token,uname);
      await loadChats();
      await openChat(r.chat_id);
      $("search").value="";
      renderChats(null);
    }catch(e){ toast(errorText(e)); }
  });
}
