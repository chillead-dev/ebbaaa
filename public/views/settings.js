import API from "../api.js";
import { $, esc } from "../lib/dom.js";
import { store, setToken } from "../store.js";
import { toast } from "../lib/toast.js";
import { errorText } from "../lib/errors.js";

function avatarHtml(u){
  if(u?.avatar_url) return `<img src="${esc(u.avatar_url)}" alt="">`;
  const ch=(u?.display_name||u?.username||"U").trim().slice(0,1).toUpperCase();
  return `<div class="ph">${esc(ch)}</div>`;
}

export async function renderSettings(){
  const v=$("view-settings");
  const prof=await API.profileGet(store.token);
  store.me=prof.me;

  v.innerHTML=`<div class="pad">
    <div class="panel">
      <div class="panelTitle">Профиль</div>
      <div class="grid">
        <label class="field"><div class="lbl">Отображаемое имя</div><input id="setName" class="input" value="${esc(store.me.display_name||"")}" /></label>
        <label class="field"><div class="lbl">Username</div><input id="setUsername" class="input" value="${esc(store.me.username||"")}" /><div class="note">a-z 0-9 _ (3–20)</div></label>
        <label class="field"><div class="lbl">Bio</div><input id="setBio" class="input" value="${esc(store.me.bio||"")}" /></label>
        <label class="field"><div class="lbl">Avatar URL</div><input id="setAva" class="input" value="${esc(store.me.avatar_url||"")}" /></label>
        <button id="btnSaveProfile" class="btn primary" type="button">Сохранить</button>
      </div>
    </div>

    <div class="panel">
      <div class="panelTitle">Приватность</div>
      <div class="switchRow">
        <div><div style="font-weight:1000">Кто может писать</div><div class="note">Если выключить — писать смогут только те, с кем уже есть чат.</div></div>
        <button id="btnToggleDm" class="smallBtn" type="button">${store.me.allow_dm?"Все":"Никто"}</button>
      </div>
    </div>

    <div class="panel">
      <div class="panelTitle">Аккаунт</div>
      <div class="note">Почта: ${esc(store.me.email)}</div>
      <div style="height:10px"></div>
      <button id="btnLogout" class="btn" type="button">Выйти</button>
    </div>

    <div class="panel">
      <div class="panelTitle">Превью профиля</div>
      <div class="row" style="cursor:default">
        <div class="avatar">${avatarHtml(store.me)}</div>
        <div class="mid"><div class="title">${esc(store.me.display_name||store.me.username)}</div><div class="sub">@${esc(store.me.username)} · ${esc(store.me.bio||"")}</div></div>
      </div>
    </div>
  </div>`;

  $("btnSaveProfile").onclick=async()=>{
    try{
      await API.profileUpdate(store.token,{
        display_name:$("setName").value.trim(),
        username:$("setUsername").value.trim(),
        bio:$("setBio").value.trim(),
        avatar_url:$("setAva").value.trim()
      });
      toast("Сохранено ✅");
      await renderSettings();
    }catch(e){ toast(errorText(e)); }
  };

  $("btnToggleDm").onclick=async()=>{ await API.profileUpdate(store.token,{allow_dm: store.me.allow_dm?0:1}); await renderSettings(); };
  $("btnLogout").onclick=()=>{ setToken(""); store.me=null; toast("Вы вышли"); location.reload(); };
}
