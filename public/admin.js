import API from "./api.js";
import { toast } from "./lib/toast.js";
import { esc } from "./lib/dom.js";

const root = document.getElementById("adminRoot");
const PASS_KEY="ex_admin_pass";

function modalLogin(){
  const overlay=document.createElement("div");
  overlay.className="modalOverlay";
  overlay.innerHTML=`
    <div class="modal" style="max-width:420px">
      <div class="modalHeader">
        <div class="modalTitle">Admin</div>
      </div>
      <div class="grid">
        <label class="field">
          <div class="lbl">Пароль</div>
          <input id="apass" class="input" type="password" placeholder="Admin password">
        </label>
        <div id="aerr" class="note" style="color:var(--danger)"></div>
        <button id="aenter" class="btn primary" type="button">Войти</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  overlay.querySelector("#aenter").onclick=async()=>{
    const pass=overlay.querySelector("#apass").value;
    try{
      const st=await API.call("admin_stats",{admin_password:pass});
      localStorage.setItem(PASS_KEY, pass);
      overlay.remove();
      render(st, pass);
    }catch(e){
      overlay.querySelector("#aerr").textContent="Неверный пароль";
    }
  };
}

function statCard(label,val){
  return `<div class="panel" style="margin:0"><div class="note">${esc(label)}</div><div style="font-weight:950;font-size:26px;margin-top:8px">${esc(val)}</div></div>`;
}

async function render(stats, pass){
  root.innerHTML = `
    <div class="grid" style="grid-template-columns:repeat(3,1fr);gap:12px">
      ${statCard("Всего пользователей", stats.total)}
      ${statCard("Сейчас онлайн (5 мин)", stats.online)}
      ${statCard("Заблокировано", stats.blocked)}
    </div>
    <div style="height:14px"></div>
    <div class="panel">
      <div class="panelTitle">Пользователи</div>
      <div id="uList" class="grid"></div>
    </div>
  `;

  const data = await API.call("admin_users",{admin_password:pass});
  const list = document.getElementById("uList");
  list.style.gap="10px";

  for(const u of data.users){
    const row=document.createElement("div");
    row.className="row";
    row.style.margin="0";
    row.style.background="rgba(255,255,255,0.02)";
    const ava = u.avatar_url ? `<img src="${esc(u.avatar_url)}" alt="">` : `<div class="ph">${esc((u.display_name||u.username||"U").slice(0,1).toUpperCase())}</div>`;
    row.innerHTML = `
      <div class="avatar" style="width:50px;height:50px;opacity:${u.blocked?0.55:1}">${ava}</div>
      <div class="mid" style="opacity:${u.blocked?0.55:1}">
        <div class="title">${esc(u.display_name||u.username)} ${u.verified?`<span class="vbadge"><svg viewBox="0 0 24 24"><path d="M12 2l3 3 4 .5-1.5 3.7 1.5 3.7-4 .5-3 3-3-3-4-.5 1.5-3.7L5 5.5 9 5l3-3z" fill="currentColor" opacity=".28"/><path d="M9.2 12.2l1.7 1.7 4.1-4.1" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`:""}</div>
        <div class="sub">@${esc(u.username)} · ${u.blocked? "Аккаунт удален / Deleted Account": ""}</div>
      </div>
      <div class="right">
        <button class="btn" data-v="1" style="padding:10px 12px">${u.verified? "Снять галочку":"Выдать галочку"}</button>
        <button class="btn danger" data-b="1" style="padding:10px 12px">${u.blocked? "Разблок":"Заблокировать"}</button>
      </div>
    `;
    row.querySelector("[data-v]").onclick=async()=>{
      await API.call("admin_toggle_verify",{admin_password:pass,user_id:u.id});
      toast("Готово");
      const st=await API.call("admin_stats",{admin_password:pass});
      render(st, pass);
    };
    row.querySelector("[data-b]").onclick=async()=>{
      await API.call("admin_block_user",{admin_password:pass,user_id:u.id});
      toast("Готово");
      const st=await API.call("admin_stats",{admin_password:pass});
      render(st, pass);
    };
    list.appendChild(row);
  }
}

(async()=>{
  const pass=localStorage.getItem(PASS_KEY)||"";
  if(!pass) return modalLogin();
  try{
    const st=await API.call("admin_stats",{admin_password:pass});
    render(st, pass);
  }catch{
    localStorage.removeItem(PASS_KEY);
    modalLogin();
  }
})();
