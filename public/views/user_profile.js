import API from "../api.js";
import { esc } from "../lib/dom.js";
import { store } from "../store.js";
import { toast } from "../lib/toast.js";
import { errorText } from "../lib/errors.js";
import { loadChats } from "./chats.js";
import { openChat } from "./messages.js";

function avatarHtml(u){
  if(u?.avatar) return `<img src="${esc(u.avatar)}" alt="">`;
  const ch=(u?.display_name||u?.username||"U").trim().slice(0,1).toUpperCase();
  return `<div class="ph">${esc(ch)}</div>`;
}

export function openUserProfile(user, opts={allowChat:false}){
  const scrim = document.createElement("div");
  scrim.className = "scrim";
  const status = user?.status_text || " ";
  scrim.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      <div class="modalHeader">
        <div class="modalTitle">Профиль</div>
        <button class="modalClose" id="closeModal" type="button" aria-label="Закрыть">✕</button>
      </div>
      <div class="modalBody">
        <div class="profileHero">
          <div class="bigAva">${avatarHtml(user)}</div>
          <div class="profileName">${esc(user.display_name||user.username)}</div>
          <div class="profileStatus">${esc(status)}</div>
        </div>

        <div class="profileActions">
          ${opts.allowChat?`<button class="squareAct" id="btnChat" type="button"><div class="t">Чат</div><div class="s">Написать</div></button>`:""}
          <button class="squareAct" id="btnCopy" type="button"><div class="t">@${esc(user.username)}</div><div class="s">Скопировать</div></button>
        </div>

        <div class="panel" style="margin-top:12px">
          <div class="panelTitle">О себе</div>
          <div class="note" style="font-size:13px;white-space:pre-wrap">${esc(user.bio||"—")}</div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(scrim);

  function close(){ scrim.remove(); }
  scrim.querySelector("#closeModal").onclick = close;
  scrim.onclick = (e)=>{ if(e.target===scrim) close(); };

  const copyBtn = scrim.querySelector("#btnCopy");
  copyBtn.onclick = async()=>{
    try{
      await navigator.clipboard.writeText("@"+user.username);
      toast("Скопировано ✅");
    }catch{ toast("@"+user.username); }
  };

  const btnChat = scrim.querySelector("#btnChat");
  if(btnChat){
    btnChat.onclick = async()=>{
      try{
        const r = await API.chatsStartDm(store.token, user.username);
        await loadChats();
        await openChat(r.chat_id);
        close();
      }catch(e){ toast(errorText(e)); }
    };
  }
}
