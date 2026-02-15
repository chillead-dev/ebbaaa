import API from "./api.js";
const $ = (id) => document.getElementById(id);

let token = localStorage.getItem("ex_token") || "";
let activeTab = "chats";
let chats = [];
let activeChatId = null;

function setHint(text, ok=false){
  const el = $("authHint");
  if (!el) return;
  el.textContent = text || "";
  el.style.color = ok ? "var(--accent)" : "var(--muted)";
}

function errorText(e){
  const m = e?.error || "Ошибка";
  if (m === "gmail_only") return "Пока только Gmail (@gmail.com).";
  if (m === "too_fast") return "Слишком часто. Подожди немного.";
  if (m === "code_invalid") return "Неверный код.";
  if (m === "code_missing_or_expired") return "Код истёк или не найден.";
  if (m === "email_taken") return "Аккаунт уже существует. Переключаю на вход.";
  if (m === "invalid_credentials") return "Неверная почта или пароль.";
  if (m === "unauthorized") return "Сессия устарела. Войди заново.";
  return m;
}

function showAuth(){
  $("screen-auth").classList.remove("hidden");
  $("screen-main").classList.add("hidden");
}

function showMain(){
  $("screen-auth").classList.add("hidden");
  $("screen-main").classList.remove("hidden");
}

function initTheme(){
  const btn = $("themeToggle");
  const saved = localStorage.getItem("ex_theme") || "dark";
  document.documentElement.setAttribute("data-theme", saved);
  btn.textContent = saved === "dark" ? "Тема: Тёмная" : "Тема: Светлая";
  btn.onclick = () => {
    const cur = document.documentElement.getAttribute("data-theme") || "dark";
    const next = cur === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("ex_theme", next);
    btn.textContent = next === "dark" ? "Тема: Тёмная" : "Тема: Светлая";
  };
}

function switchAuthTab(mode){
  const isLogin = mode === "login";
  $("tab-login").classList.toggle("isOn", isLogin);
  $("tab-signup").classList.toggle("isOn", !isLogin);

  $("loginForm").classList.toggle("hidden", !isLogin);
  $("signupStep1").classList.toggle("hidden", isLogin);
  $("signupStep2").classList.add("hidden");
  setHint("");
}

function showSignupStep(step){
  $("signupStep1").classList.toggle("hidden", step !== 1);
  $("signupStep2").classList.toggle("hidden", step !== 2);
  setHint("");
}

function togglePassword(inputId){
  const el = $(inputId);
  el.type = el.type === "password" ? "text" : "password";
}

/* ---------- Tabs like TG ---------- */
function setTab(tab){
  activeTab = tab;
  document.querySelectorAll(".tab").forEach(b => b.classList.toggle("isOn", b.dataset.tab === tab));

  $("view-chats").classList.toggle("hidden", tab !== "chats");
  $("view-feed").classList.toggle("hidden", tab !== "feed");
  $("view-settings").classList.toggle("hidden", tab !== "settings");
  $("view-profile").classList.toggle("hidden", tab !== "profile");

  // messages view is separate screen inside chats
  if (tab !== "chats") $("view-messages").classList.add("hidden");

  const title = tab === "chats" ? "Telegram" : (tab === "feed" ? "Лента" : (tab === "settings" ? "Настройки" : "Профиль"));
  $("topTitle").textContent = title;
}

/* ---------- Render chats list ---------- */
function renderChats(){
  const v = $("view-chats");
  v.innerHTML = `<div class="list" id="chatList"></div>`;
  const list = $("chatList");

  for (const c of chats){
    const row = document.createElement("div");
    row.className = "chatRow";
    row.innerHTML = `
      <div class="avatar" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/>
        </svg>
      </div>
      <div class="chatMid">
        <div class="chatTitle">${c.title}</div>
        <div class="chatSub">${c.last_text || "Сообщений пока нет"}</div>
      </div>
      <div class="chatRight">
        <div class="chatTime">${c.last_time || ""}</div>
      </div>
    `;
    row.onclick = () => openChat(c.id);
    list.appendChild(row);
  }
}

/* ---------- Open chat + messages ---------- */
async function openChat(chatId){
  activeChatId = chatId;

  // show messages view inside chats tab
  $("view-messages").classList.remove("hidden");
  $("view-chats").classList.add("hidden");

  // render skeleton
  $("view-messages").innerHTML = `
    <div class="msgShell">
      <div class="msgHeader">
        <button id="backChats" class="iconBtn" type="button" aria-label="Назад">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <div class="msgHeaderTitle">Избранное</div>
      </div>

      <div class="msgList" id="msgList"></div>

      <div class="composer">
        <div class="composerRow">
          <input id="msgInput" class="msgInput" placeholder="Сообщение" />
          <button id="sendBtn" class="sendBtn" type="button" aria-label="Отправить">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 2L11 13"/>
              <path d="M22 2l-7 20-4-9-9-4 20-7Z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `;

  $("backChats").onclick = () => {
    $("view-messages").classList.add("hidden");
    $("view-chats").classList.remove("hidden");
  };

  // load messages
  const data = await API.messagesList(token, chatId);
  const list = $("msgList");
  list.innerHTML = "";
  for (const m of data.messages){
    const b = document.createElement("div");
    b.className = "bubble" + (m.is_me ? " me" : "");
    b.innerHTML = `
      <div>${escapeHtml(m.text)}</div>
      <div class="msgMeta">${new Date(m.ts).toLocaleString()}</div>
    `;
    list.appendChild(b);
  }
  list.scrollTop = list.scrollHeight;

  $("sendBtn").onclick = async () => {
    const text = $("msgInput").value.trim();
    if (!text) return;
    $("msgInput").value = "";
    await API.messagesSend(token, chatId, text);
    await openChat(chatId); // простое обновление (позже сделаем без перерендера)
  };
}

function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

/* ---------- Load chats (only Favorites at start) ---------- */
async function loadChats(){
  const data = await API.chatsList(token);
  chats = data.chats || [];
  renderChats();
}

/* ---------- Bind UI ---------- */
function bindAuthUI(){
  $("tab-login").onclick = () => switchAuthTab("login");
  $("tab-signup").onclick = () => switchAuthTab("signup");

  $("toggleLoginPass").onclick = () => togglePassword("loginPass");
  $("toggleSignupPass").onclick = () => togglePassword("suPass");

  $("btnSendCode").onclick = async () => {
    try{
      setHint("Отправляем код…");
      await API.requestCode($("suEmail").value);
      setHint("Код отправлен. Проверь почту.", true);
      showSignupStep(2);
    }catch(e){
      if (e?.error === "email_taken"){
        setHint("Аккаунт уже существует. Переключаю на вход.", true);
        $("loginEmail").value = $("suEmail").value;
        switchAuthTab("login");
        return;
      }
      setHint(errorText(e));
    }
  };

  $("btnBackToStep1").onclick = () => showSignupStep(1);

  $("btnSignup").onclick = async () => {
    try{
      setHint("Создаём аккаунт…");
      const r = await API.signup($("suEmail").value, $("suPass").value, $("suCode").value, "");
      token = r.token;
      localStorage.setItem("ex_token", token);
      // сразу в приложение
      await enterApp();
    }catch(e){
      if (e?.error === "email_taken"){
        setHint("Аккаунт уже существует. Переключаю на вход.", true);
        $("loginEmail").value = $("suEmail").value;
        switchAuthTab("login");
        return;
      }
      setHint(errorText(e));
    }
  };

  $("btnLogin").onclick = async () => {
    try{
      setHint("Входим…");
      const r = await API.login($("loginEmail").value, $("loginPass").value);
      token = r.token;
      localStorage.setItem("ex_token", token);
      await enterApp();
    }catch(e){
      setHint(errorText(e));
    }
  };

  switchAuthTab("login");
}

function bindMainUI(){
  document.querySelectorAll(".tab").forEach(btn => {
    btn.onclick = async () => {
      setTab(btn.dataset.tab);
      if (btn.dataset.tab === "chats"){
        await loadChats();
      } else {
        // простые заглушки
        if (btn.dataset.tab === "feed") $("view-feed").innerHTML = `<div class="list"><div class="chatRow"><div class="chatMid"><div class="chatTitle">Лента</div><div class="chatSub">Скоро тут будут посты.</div></div></div></div>`;
        if (btn.dataset.tab === "settings") $("view-settings").innerHTML = `<div class="list"><div class="chatRow"><div class="chatMid"><div class="chatTitle">Настройки</div><div class="chatSub">Профиль/приватность — дальше сделаем.</div></div></div></div>`;
        if (btn.dataset.tab === "profile") $("view-profile").innerHTML = `<div class="list"><div class="chatRow"><div class="chatMid"><div class="chatTitle">Профиль</div><div class="chatSub">Скоро: аватар, ник, username.</div></div></div></div>`;
      }
    };
  });

  // chips (пока визуально)
  $("chipAll").onclick = () => {
    $("chipAll").classList.add("isOn");
    $("chipFolder").classList.remove("isOn");
  };
  $("chipFolder").onclick = () => {
    $("chipFolder").classList.add("isOn");
    $("chipAll").classList.remove("isOn");
  };
}

/* ---------- Enter app with refresh-safe auth ---------- */
async function enterApp(){
  // 1) показываем приложение сразу (чтобы refresh не кидал на логин)
  showMain();
  setTab("chats");
  await loadChats();

  // 2) открываем избранное по умолчанию
  const fav = chats.find(x => x.kind === "saved") || chats[0];
  if (fav) await openChat(fav.id);

  // 3) проверяем токен в фоне. если реально плохой — выкинуть
  try{
    await API.me(token);
  }catch(e){
    // только если это реально unauthorized
    if (e?.status === 401 || e?.error === "unauthorized"){
      localStorage.removeItem("ex_token");
      token = "";
      showAuth();
      switchAuthTab("login");
      setHint("Сессия устарела. Войди заново.");
    }
  }
}

async function boot(){
  initTheme();
  bindAuthUI();
  bindMainUI();

  if (token){
    // Сразу внутрь (не ждём /me)
    try{
      await enterApp();
      return;
    }catch{
      // если что-то совсем сломалось — вернем на auth
      localStorage.removeItem("ex_token");
      token = "";
    }
  }
  showAuth();
}

boot();
