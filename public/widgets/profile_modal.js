import API from "../api.js";
import { esc } from "../lib/dom.js";
import { toast } from "../lib/toast.js";
import { errorText } from "../lib/errors.js";

function avatarHtml(u){
  if(u?.avatar_url) return `<img src="${esc(u.avatar_url)}" alt="">`;
  const ch=(u?.display_name||u?.username||"U").trim().slice(0,1).toUpperCase();
  return `<div class="ph">${esc(ch)}</div>`;
}

export async function showProfileModal(peer, token){
  // fetch full profile if possible (future расширение)
  const overlay=document.createElement("div");
  overlay.className="modalOverlay";
  overlay.innerHTML = `
    <div class="modal">
      <div class="modalHeader">
        <div class="modalTitle">Профиль</div>
        <button class="modalClose" id="pmClose" type="button">✕</button>
      </div>
      <div class="panel" style="margin:0">
        <div class="row" style="cursor:default;margin:0;padding:10px;background:transparent">
          <div class="avatar" style="width:76px;height:76px">${avatarHtml(peer)}</div>
          <div class="mid">
            <div class="title" style="font-size:18px">${esc(peer.display_name||peer.username)} ${peer.verified?`<span class="vbadge"><svg viewBox="0 0 24 24"><path d="M12 2l3 3 4 .5-1.5 3.7 1.5 3.7-4 .5-3 3-3-3-4-.5 1.5-3.7L5 5.5 9 5l3-3z" fill="currentColor" opacity=".28"/><path d="M9.2 12.2l1.7 1.7 4.1-4.1" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`:""}</div>
            <div class="sub">@${esc(peer.username||"")}</div>
            <div class="sub" style="margin-top:8px">${esc(peer.status_text||"")}</div>
          </div>
        </div>
        <div style="height:10px"></div>
        <button id="pmChat" class="btn primary" type="button">Чат</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener("click",(e)=>{ if(e.target===overlay) overlay.remove(); });
  overlay.querySelector("#pmClose").onclick=()=>overlay.remove();
  overlay.querySelector("#pmChat").onclick=async()=>{
    try{
      const r=await API.chatsStartDm(token, peer.username);
      toast("Открываю чат…");
      overlay.remove();
      // пусть основной экран подхватит чаты по поллингу/рефрешу
      location.hash = "#chat:"+r.chat_id;
    }catch(e){ toast(errorText(e)); }
  };
}
