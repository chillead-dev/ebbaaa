import API from "../api.js";
import { $, esc } from "../lib/dom.js";
import { store } from "../store.js";

function avatarHtml(u){
  if(u?.avatar_url) return `<img src="${esc(u.avatar_url)}" alt="">`;
  const ch=(u?.display_name||u?.username||"U").trim().slice(0,1).toUpperCase();
  return `<div class="ph">${esc(ch)}</div>`;
}

export async function renderProfile(){
  const v=$("view-profile");
  const prof=await API.profileGet(store.token);
  store.me=prof.me;

  v.innerHTML=`<div class="pad">
    <div class="panel">
      <div class="row" style="cursor:default">
        <div class="avatar">${avatarHtml(store.me)}</div>
        <div class="mid"><div class="title">${esc(store.me.display_name||store.me.username)}</div><div class="sub">@${esc(store.me.username)}</div></div>
      </div>
      <div style="margin-top:10px" class="note">${esc(store.me.bio||"Без описания")}</div>
    </div>
  </div>`;
}
