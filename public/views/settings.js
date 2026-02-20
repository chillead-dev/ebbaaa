import API from "../api.js";
import { $, esc } from "../lib/dom.js";
import { store, setToken } from "../store.js";
import { toast } from "../lib/toast.js";
import { errorText } from "../lib/errors.js";

function avatarHtml(u){
  if(u?.avatar) return `<img src="${esc(u.avatar)}" alt="">`;
  if(u?.avatar_url) return `<img src="${esc(u.avatar_url)}" alt="">`;
  const ch=(u?.display_name||u?.username||"U").trim().slice(0,1).toUpperCase();
  return `<div class="ph">${esc(ch)}</div>`;
}

const THEMES = [
  ["default","Default"],
  ["night","Night"],
  ["forest","Forest"],
  ["sunset","Sunset"],
  ["pink","Pink"],
  ["custom","Custom"],
];

function themeOptions(cur){
  return THEMES.map(([k,n])=>`<option value="${k}" ${k===cur?"selected":""}>${n}</option>`).join("");
}

async function fileToAvatarData(file){
  // compress to 256x256, return dataURL
  const img = await new Promise((resolve,reject)=>{
    const i=new Image();
    i.onload=()=>resolve(i);
    i.onerror=reject;
    i.src=URL.createObjectURL(file);
  });

  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d");

  // cover crop
  const r = Math.max(size/img.width, size/img.height);
  const nw = img.width * r, nh = img.height * r;
  const x = (size - nw)/2, y = (size - nh)/2;
  ctx.drawImage(img, x, y, nw, nh);

  let data = "";
  try{ data = canvas.toDataURL("image/webp", 0.86); }catch{}
  if(!data || !data.startsWith("data:image/")) data = canvas.toDataURL("image/jpeg", 0.86);
  return data;
}

export async function renderSettings(){
  const v=$("view-settings");
  const prof=await API.profileGet(store.token);
  store.me=prof.me;

  v.innerHTML=`<div class="pad">
    <div class="panel">
      <div class="panelTitle">Профиль</div>
      <div class="row" style="cursor:default;padding:6px 0 12px">
        <div class="avatar" style="width:64px;height:64px">${avatarHtml(store.me)}</div>
        <div class="mid">
          <div class="title">${esc(store.me.display_name||store.me.username)}</div>
          <div class="sub">@${esc(store.me.username)}</div>
          <div class="sub" style="margin-top:6px">Почта: ${esc(store.me.email)}</div>
        </div>
      </div>

      <div class="grid">
        <input id="avatarFile" class="hidden" type="file" accept="image/*" />
        <button id="btnPickAvatar" class="btn" type="button">Выбрать аватар</button>

        <label class="field"><div class="lbl">Отображаемое имя</div><input id="setName" class="input" value="${esc(store.me.display_name||"")}" /></label>
        <label class="field"><div class="lbl">Username</div><input id="setUsername" class="input" value="${esc(store.me.username||"")}" /><div class="note">a-z 0-9 _ (3–20)</div></label>
        <label class="field"><div class="lbl">Bio</div><input id="setBio" class="input" value="${esc(store.me.bio||"")}" /></label>

        <button id="btnSaveProfile" class="btn primary" type="button">Сохранить</button>
      </div>
    </div>

    <div class="panel">
      <div class="panelTitle">Приватность</div>
      <div class="switchRow">
        <div>
          <div style="font-weight:1000">Кто может писать</div>
          <div class="note">Если выключить — писать смогут только те, с кем уже есть чат.</div>
        </div>
        <button id="btnToggleDm" class="smallBtn" type="button">${store.me.allow_dm?"Все":"Никто"}</button>
      </div>

      <div style="height:10px"></div>

      <div class="switchRow">
        <div>
          <div style="font-weight:1000">Статус в сети</div>
          <div class="note">Показывать «в сети» и «был(а) недавно»</div>
        </div>
        <button id="btnToggleStatus" class="smallBtn" type="button">${store.me.show_status?"Показывать":"Скрыт"}</button>
      </div>
    </div>

    <div class="panel">
      <div class="panelTitle">Оформление</div>
      <label class="field">
        <div class="lbl">Тема чата</div>
        <select id="chatTheme" class="select">${themeOptions(store.me.chat_theme||"default")}</select>
        <div class="note">Можно выбрать готовую тему или сделать custom.</div>
      </label>

      <div id="customWrap" class="${(store.me.chat_theme||"default")==="custom"?"":"hidden"}">
        <label class="field"><div class="lbl">Custom — фон</div><input id="cBg" class="input" placeholder="#0b0d12" value="${esc(store.me.custom_chat?.bg||"")}" /></label>
        <label class="field"><div class="lbl">Custom — пузырь (я)</div><input id="cMe" class="input" placeholder="rgba(...)" value="${esc(store.me.custom_chat?.me||"")}" /></label>
        <label class="field"><div class="lbl">Custom — пузырь (другой)</div><input id="cThem" class="input" placeholder="rgba(...)" value="${esc(store.me.custom_chat?.them||"")}" /></label>
      </div>

      <button id="btnSaveTheme" class="btn primary" type="button">Применить</button>
    </div>

    <div class="panel">
      <div class="panelTitle">Безопасность</div>
      <div class="note">Пароль хранится хешем (scrypt). Токен авторизации — JWT. Данные в Redis.</div>
    </div>

    
    <div class="panel">
      <div class="panelTitle">Оформление</div>
      <div class="grid">
        <label class="field"><div class="lbl">Тема чата</div>
          <select id="chatTheme" class="input">
            <option value="tg_doodles">Telegram Doodles</option>
            <option value="plain">Plain</option>
            <option value="forest">Forest</option>
            <option value="sunset">Sunset</option>
            <option value="pink">Pink</option>
          </select>
        </label>
      </div>
      <div class="note">Темы применяются к экрану чата.</div>
    </div>

    <div class="panel">
      <div class="panelTitle">Язык</div>
      <div class="grid">
        <label class="field"><div class="lbl">Language</div>
          <select id="langSel" class="input">
            <option value="ru">Русский</option>
            <option value="en">English</option>
          </select>
        </label>
        <button id="btnApplyLang" class="btn" type="button">Применить</button>
      </div>
    </div>

    <div class="panel">
      <div class="panelTitle">Статус</div>
      <div class="switchRow">
        <div><div style="font-weight:950">Показывать онлайн</div><div class="note">Если выключить — другим будет показано «скрыто».</div></div>
        <button id="btnToggleOnline" class="smallBtn" type="button">${store.me.show_online? "Включено":"Выключено"}</button>
      </div>
    </div>

    <div class="panel">
      <div class="panelTitle">Аккаунт</div>
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

  $("btnPickAvatar").onclick=()=> $("avatarFile").click();
  $("avatarFile").onchange = async ()=>{
    const file = $("avatarFile").files?.[0];
    if(!file) return;
    if(file.size > 5_000_000){ toast("Слишком большой файл"); return; }
    try{
      toast("Обрабатываю…");
      const data = await fileToAvatarData(file);
      await API.profileUpdate(store.token,{ avatar_data: data });
      toast("Аватар обновлён ✅");
      await renderSettings();
    }catch(e){ toast(errorText(e)); }
  };

  $("btnSaveProfile").onclick=async()=>{
    try{
      await API.profileUpdate(store.token,{
        display_name:$("setName").value.trim(),
        username:$("setUsername").value.trim(),
        bio:$("setBio").value.trim(),
      });
      toast("Сохранено ✅");
      await renderSettings();
    }catch(e){ toast(errorText(e)); }
  };

  $("btnToggleDm").onclick=async()=>{ await API.profileUpdate(store.token,{allow_dm: store.me.allow_dm?0:1}); await renderSettings(); };
  $("btnToggleStatus").onclick=async()=>{ await API.profileUpdate(store.token,{show_status: store.me.show_status?0:1}); await renderSettings(); };

  $("chatTheme").onchange=()=>{ $("customWrap").classList.toggle("hidden", $("chatTheme").value!=="custom"); };

  $("btnSaveTheme").onclick=async()=>{
    const theme = $("chatTheme").value;
    const custom = theme==="custom" ? { bg:$("cBg").value.trim(), me:$("cMe").value.trim(), them:$("cThem").value.trim() } : null;
    try{
      await API.profileUpdate(store.token,{ chat_theme: theme, custom_chat: custom });
      toast("Тема сохранена ✅");
      location.reload(); // simplest: apply CSS vars on boot
    }catch(e){ toast(errorText(e)); }
  };

  $("btnLogout").onclick=()=>{ setToken(""); store.me=null; toast("Вы вышли"); location.reload(); };
}
