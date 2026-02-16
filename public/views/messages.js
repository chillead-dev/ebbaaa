import API from "../api.js";
import { $, esc } from "../lib/dom.js";
import { store } from "../store.js";
import { loadChats } from "./chats.js";
import { toast } from "../lib/toast.js";
import { errorText } from "../lib/errors.js";

export async function openChat(chatId){
  store.activeChatId=chatId;
  const chat=store.chats.find(c=>c.id===chatId);
  store.activeChatTitle=chat?.title||"Чат";
  $("view-messages").classList.remove("hidden");
  $("view-chats").classList.add("hidden");

  $("view-messages").innerHTML=`
    <div class="msgShell">
      <div class="msgHeader">
        <button id="backChats" class="backBtn" type="button" aria-label="Назад"><img src="/assets/back.svg" alt=""></button>
        <div class="msgHeaderTitle">${esc(store.activeChatTitle)}</div>
      </div>
      <div class="msgList" id="msgList"></div>
      <div class="composer">
        <div class="composerRow">
          <input id="msgInput" class="msgInput" placeholder="Сообщение" />
          <button id="sendBtn" class="sendBtn" type="button" aria-label="Отправить"><img src="/assets/send.svg" alt=""></button>
        </div>
      </div>
    </div>`;

  $("backChats").onclick=()=>{
    $("view-messages").classList.add("hidden");
    $("view-chats").classList.remove("hidden");
  };

  await refreshChatMessages(true);

  $("sendBtn").onclick=async()=>{
    const text=$("msgInput").value.trim();
    if(!text) return;
    $("msgInput").value="";
    try{
      await API.messagesSend(store.token,store.activeChatId,text);
      await refreshChatMessages(true);
      await loadChats();
    }catch(e){ toast(errorText(e)); }
  };

  try{ await API.messagesMarkRead(store.token,store.activeChatId); await loadChats(); }catch{}
}

export async function refreshChatMessages(scrollDown=false){
  const data=await API.messagesList(store.token,store.activeChatId);
  const list=$("msgList"); list.innerHTML="";
  for(const m of data.messages){
    const b=document.createElement("div");
    b.className="bubble"+(m.is_me?" me":"");
    b.innerHTML=`<div>${esc(m.text)}</div><div class="msgMeta">${new Date(m.ts).toLocaleString()}</div>`;
    list.appendChild(b);
  }
  if(scrollDown) list.scrollTop=list.scrollHeight;
}
