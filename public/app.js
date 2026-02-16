import API from "./api.js";
import { $, qsa } from "./lib/dom.js";
import { toast } from "./lib/toast.js";
import { errorText } from "./lib/errors.js";
import { store, setToken } from "./store.js";
import { initTheme } from "./theme.js";
import { loadChats, renderChats } from "./views/chats.js";
import { renderFeed, loadFeed } from "./views/feed.js";
import { renderSettings } from "./views/settings.js";
import { renderProfile } from "./views/profile.js";
import { refreshChatMessages } from "./views/messages.js";

function showAuth(){ $("screen-auth").classList.remove("hidden"); $("screen-main").classList.add("hidden"); }
function showMain(){ $("screen-auth").classList.add("hidden"); $("screen-main").classList.remove("hidden"); }

function setStatus(text, ok=false){
  const el=$("authHint"); el.textContent=text||""; el.style.color= ok ? "var(--accent)" : "var(--muted)";
}

function switchAuthTab(mode){
  const isLogin=mode==="login";
  $("tab-login").classList.toggle("isOn", isLogin);
  $("tab-signup").classList.toggle("isOn", !isLogin);
  $("loginForm").classList.toggle("hidden", !isLogin);
  $("signupStep1").classList.toggle("hidden", isLogin);
  $("signupStep2").classList.add("hidden");
  setStatus("");
}
function showSignupStep(step){
  $("signupStep1").classList.toggle("hidden", step!==1);
  $("signupStep2").classList.toggle("hidden", step!==2);
  setStatus("");
}
function togglePassword(inputId){ const el=$(inputId); el.type = el.type==="password" ? "text" : "password"; }

function setTab(tab){
  store.activeTab=tab;
  qsa(".tab").forEach(b=>b.classList.toggle("isOn", b.dataset.tab===tab));
  $("view-chats").classList.toggle("hidden", tab!=="chats");
  $("view-feed").classList.toggle("hidden", tab!=="feed");
  $("view-settings").classList.toggle("hidden", tab!=="settings");
  $("view-profile").classList.toggle("hidden", tab!=="profile");
  if(tab!=="chats") $("view-messages").classList.add("hidden");

  $("topTitle").textContent = tab==="chats"?"Чаты":tab==="feed"?"Лента":tab==="settings"?"Настройки":"Профиль";
  $("search").placeholder = tab==="chats" ? "Поиск по username…" : "Поиск (скоро)";
}

function stopPolling(){ if(store.pollTimer) clearInterval(store.pollTimer); store.pollTimer=null; }
function startPolling(){
  stopPolling();
  store.pollTimer=setInterval(async()=>{
    try{
      if(!store.token) return;
      if(store.activeTab==="chats" && $("view-messages").classList.contains("hidden")) await loadChats();
      if(store.activeTab==="chats" && store.activeChatId && !$("view-messages").classList.contains("hidden")) await refreshChatMessages(false);
    }catch{}
  }, 3500);
}

async function handleSearch(){
  const q=$("search").value.trim().toLowerCase();
  if(store.activeTab!=="chats") return;
  if(!q){ renderChats(null); return; }
  const data=await API.usersSearch(store.token, q);
  renderChats(data.users);
}

async function enterApp(){
  showMain();
  setTab("chats");
  await loadChats();
  startPolling();
  try{ store.me=(await API.profileGet(store.token)).me; }
  catch(e){
    if(e?.status===401 || e?.error==="unauthorized"){
      setToken(""); stopPolling(); showAuth(); switchAuthTab("login"); setStatus("Сессия устарела. Войди заново.");
    }
  }
}

function bindAuth(){
  $("tab-login").onclick=()=>switchAuthTab("login");
  $("tab-signup").onclick=()=>switchAuthTab("signup");
  $("toggleLoginPass").onclick=()=>togglePassword("loginPass");
  $("toggleSignupPass").onclick=()=>togglePassword("suPass");

  $("btnSendCode").onclick=async()=>{
    try{
      setStatus("Отправляем код…");
      await API.requestCode($("suEmail").value);
      setStatus("Код отправлен. Проверь почту.", true);
      showSignupStep(2);
    }catch(e){
      if(e?.error==="email_taken"){
        setStatus("Аккаунт уже существует. Переключил на вход.", true);
        $("loginEmail").value=$("suEmail").value;
        switchAuthTab("login");
        return;
      }
      setStatus(errorText(e));
    }
  };

  $("btnBackToStep1").onclick=()=>showSignupStep(1);

  $("btnSignup").onclick=async()=>{
    try{
      setStatus("Создаём аккаунт…");
      const r=await API.signup($("suEmail").value,$("suPass").value,$("suCode").value);
      setToken(r.token);
      toast("Аккаунт создан ✅");
      await enterApp();
    }catch(e){
      if(e?.error==="email_taken"){ setStatus("Аккаунт уже существует. Нажми «Вход».", true); switchAuthTab("login"); return; }
      setStatus(errorText(e));
    }
  };

  $("btnLogin").onclick=async()=>{
    try{
      setStatus("Входим…");
      const r=await API.login($("loginEmail").value,$("loginPass").value);
      setToken(r.token);
      toast("Успешный вход ✅");
      await enterApp();
    }catch(e){ setStatus(errorText(e)); }
  };

  switchAuthTab("login");
}

function bindMain(){
  qsa(".tab").forEach(btn=>btn.onclick=async()=>{
    setTab(btn.dataset.tab);
    if(btn.dataset.tab==="chats"){
      $("view-messages").classList.add("hidden");
      $("view-chats").classList.remove("hidden");
      await loadChats();
    }
    if(btn.dataset.tab==="feed") await renderFeed();
    if(btn.dataset.tab==="settings") await renderSettings();
    if(btn.dataset.tab==="profile") await renderProfile();
  });

  $("search").oninput=async()=>{ try{ await handleSearch(); }catch{} };

  $("btnRefresh").onclick=async()=>{
    if(store.activeTab==="chats") await loadChats();
    if(store.activeTab==="feed") await loadFeed();
    if(store.activeTab==="settings") await renderSettings();
    if(store.activeTab==="profile") await renderProfile();
  };
}

async function boot(){
  initTheme();
  bindAuth();
  bindMain();
  if(store.token){
    try{ await enterApp(); return; }catch{ setToken(""); }
  }
  showAuth();
}
boot();
