import API from "../api.js";
import { $, esc } from "../lib/dom.js";
import { store } from "../store.js";
import { toast } from "../lib/toast.js";

function avatarHtml(u){
  if(u?.avatar) return `<img src="${esc(u.avatar)}" alt="">`;
  if(u?.avatar_url) return `<img src="${esc(u.avatar_url)}" alt="">`;
  const ch=(u?.display_name||u?.username||"U").trim().slice(0,1).toUpperCase();
  return `<div class="ph">${esc(ch)}</div>`;
}

export async function renderProfile(){
  const v=$("view-profile");
  const prof=await API.profileGet(store.token);
  store.me=prof.me;

  v.innerHTML=`<div class="pad">
    <div class="panel" style="padding:0;overflow:hidden">
      <div class="profileHero" style="padding-top:18px">
        <div class="bigAva">${avatarHtml(store.me)}</div>
        <div class="profileName">${esc(store.me.display_name||store.me.username)}</div>
        <div class="profileStatus">${esc(store.me.show_status?"в сети (показывается)":"статус скрыт")}</div>
      </div>
      <div class="profileActions">
        <button class="squareAct" id="btnEdit" type="button"><div class="t">Настройки</div><div class="s">Изменить профиль</div></button>
        <button class="squareAct" id="btnCopy" type="button"><div class="t">@${esc(store.me.username)}</div><div class="s">Скопировать</div></button>
      </div>
      <div class="panel" style="margin:12px;border-radius:16px">
        <div class="panelTitle">О себе</div>
        <div class="note" style="font-size:13px;white-space:pre-wrap">${esc(store.me.bio||"—")}</div>
      </div>
    </div>
  </div>`;

  $("btnEdit").onclick=()=>toast("Открой вкладку «Настройки» снизу");
  $("btnCopy").onclick=async()=>{
    try{ await navigator.clipboard.writeText("@"+store.me.username); toast("Скопировано ✅"); }
    catch{ toast("@"+store.me.username); }
  };
}
