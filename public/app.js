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
  const el=$("authHint");
  el.textContent=text||"";
  el.style.color= ok ? "var(--accent)" : "var(--muted)";
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
function togglePassword(inputId){
  const el=$(inputId);
  el.type = el.type==="password" ? "text" : "password";
}

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

function stopTimers(){
  if(store.pollTimer) clearInterval(store.pollTimer);
  store.pollTimer=null;
  if(store.presenceTimer) clearInterval(store.presenceTimer);
  store.presenceTimer=null;
}

function applyChatTheme(me){
  // set CSS vars on <html> so msgList background changes globally
  const root = document.documentElement;
  const t = me?.chat_theme || "default";

  const presets = {
    default:{bg:"#0b0d12", me:"rgba(42,171,238,.18)", them:"rgba(255,255,255,.06)"},
    night:{bg:"#05070c", me:"rgba(88,101,242,.20)", them:"rgba(255,255,255,.06)"},
    forest:{bg:"#07110c", me:"rgba(34,197,94,.18)", them:"rgba(255,255,255,.06)"},
    sunset:{bg:"#130b07", me:"rgba(249,115,22,.18)", them:"rgba(255,255,255,.06)"},
    pink:{bg:"#120713", me:"rgba(236,72,153,.18)", them:"rgba(255,255,255,.06)"},
  };

  let cfg = presets[t] || presets.default;
  if(t==="custom" && me?.custom_chat){
    cfg = {
      bg: me.custom_chat.bg || cfg.bg,
      me: me.custom_chat.me || cfg.me,
      them: me.custom_chat.them || cfg.them,
    };
  }

  root.style.setProperty("--chat-bg", cfg.bg);
  root.style.setProperty("--bubble-me-bg", cfg.me);
  root.style.setProperty("--bubble-me-border", "color-mix(in srgb, "+cfg.me+" 70%, rgba(42,171,238,.34))");
  root.style.setProperty("--bubble-them-bg", cfg.them);
}

function startPolling(){
  // chats/messages refresh
  if(store.pollTimer) clearInterval(store.pollTimer);
  store.pollTimer=setInterval(async()=>{
    try{
      if(!store.token) return;
      if(store.activeTab==="chats" && $("view-messages").classList.contains("hidden")) await loadChats();
      if(store.activeTab==="chats" && store.activeChatId && !$("view-messages").classList.contains("hidden")) await refreshChatMessages(false);
    }catch{}
  }, 3500);

  // presence ping (online)
  if(store.presenceTimer) clearInterval(store.presenceTimer);
  store.presenceTimer=setInterval(async()=>{
    try{ if(store.token) await API.presencePing(store.token); }catch{}
  }, 20000);
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

  try{
    const prof = await API.profileGet(store.token);
    store.me = prof.me;
    applyChatTheme(store.me);
    await API.presencePing(store.token).catch(()=>{});
  }catch(e){
    if(e?.status===401 || e?.error==="unauthorized"){
      setToken("");
      stopTimers();
      showAuth();
      switchAuthTab("login");
      setStatus("Сессия устарела. Войди заново.");
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
