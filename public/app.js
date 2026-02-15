import API from "./api.js";
const $ = (id) => document.getElementById(id);

let token = localStorage.getItem("ex_token") || "";
let activeTab = "chats";
let chats = [];
let activeChatId = null;
let activeChatTitle = "";
let pollTimer = null;
let me = null;

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
  if (m === "username_not_found") return "Пользователь не найден.";
  if (m === "dm_not_allowed") return "Пользователь запретил личные сообщения.";
  if (m === "unauthorized") return "Сессия устарела. Войди заново.";
  return m;
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

function showAuth(){
  $("screen-auth").classList.remove("hidden");
  $("screen-main").classList.add("hidden");
}

function showMain(){
  $("screen-auth").classList.add("hidden");
  $("screen-main").classList.remove("hidden");
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

function setTab(tab){
  activeTab = tab;
  document.querySelectorAll(".tab").forEach(b => b.classList.toggle("isOn", b.dataset.tab === tab));

  $("view-chats").classList.toggle("hidden", tab !== "chats");
  $("view-feed").classList.toggle("hidden", tab !== "feed");
  $("view-settings").classList.toggle("hidden", tab !== "settings");
  $("view-profile").classList.toggle("hidden", tab !== "profile");

  // messages is subview of chats
  if (tab !== "chats") $("view-messages").classList.add("hidden");

  $("topTitle").textContent =
    tab === "chats" ? "Чаты" :
    tab === "feed" ? "Лента" :
    tab === "settings" ? "Настройки" : "Профиль";

  $("search").placeholder =
    tab === "chats" ? "Поиск по username…" :
    tab === "feed" ? "Поиск постов (скоро)" :
    tab === "settings" ? "Поиск (скоро)" : "Поиск (скоро)";
}

function esc(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function avatarHtml(u){
  if (u?.avatar_url) return `<img src="${esc(u.avatar_url)}" alt="">`;
  const ch = (u?.display_name || u?.username || "U").trim().slice(0,1).toUpperCase();
  return `<div class="ph">${esc(ch)}</div>`;
}

/* ---------------- CHATS ---------------- */

async function loadChats(){
  const data = await API.chatsList(token);
  chats = data.chats || [];
  renderChats();
}

function renderChats(searchResults=null){
  const v = $("view-chats");
  const list = (searchResults ? searchResults.map(u => ({
    kind:"user_search",
    title: u.display_name || u.username,
    sub: "@"+u.username,
    user: u
  })) : chats.map(c => c));

  let html = `<div class="list">`;
  if (searchResults){
    html += `
      <div class="row" style="opacity:.8;cursor:default">
        <div class="mid">
          <div class="title">Результаты</div>
          <div class="sub">Нажми на пользователя, чтобы начать чат</div>
        </div>
      </div>
    `;
  }

  for (const item of list){
    if (item.kind === "user_search"){
      html += `
        <div class="row" data-user="${esc(item.user.username)}">
          <div class="avatar">${avatarHtml(item.user)}</div>
          <div class="mid">
            <div class="title">${esc(item.title)}</div>
            <div class="sub">${esc(item.sub)}</div>
          </div>
          <div class="right">
            <div class="time"></div>
          </div>
        </div>
      `;
      continue;
    }

    html += `
      <div class="row" data-chat="${esc(item.id)}">
        <div class="avatar">${item.peer ? avatarHtml(item.peer) : `<div class="ph">💬</div>`}</div>
        <div class="mid">
          <div class="title">${esc(item.title)}</div>
          <div class="sub">${esc(item.last_text || "Сообщений пока нет")}</div>
        </div>
        <div class="right">
          <div class="time">${esc(item.last_time || "")}</div>
          ${item.unread ? `<div class="badge">${item.unread}</div>` : ``}
        </div>
      </div>
    `;
  }
  html += `</div>`;
  v.innerHTML = html;

  v.querySelectorAll("[data-chat]").forEach(el => {
    el.onclick = () => openChat(el.getAttribute("data-chat"));
  });

  v.querySelectorAll("[data-user]").forEach(el => {
    el.onclick = async () => {
      const u = el.getAttribute("data-user");
      try{
        const r = await API.chatsStartDm(token, u);
        await loadChats();
        await openChat(r.chat_id);
        $("search").value = "";
        renderChats(null);
      }catch(e){
        alert(errorText(e));
      }
    };
  });
}

async function openChat(chatId){
  activeChatId = chatId;

  const chat = chats.find(c => c.id === chatId);
  activeChatTitle = chat?.title || "Чат";

  $("view-messages").classList.remove("hidden");
  $("view-chats").classList.add("hidden");

  $("view-messages").innerHTML = `
    <div class="msgShell">
      <div class="msgHeader">
        <button id="backChats" class="iconBtn" type="button" aria-label="Назад">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <div class="msgHeaderTitle">${esc(activeChatTitle)}</div>
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

  await refreshChatMessages(true);

  $("sendBtn").onclick = async () => {
    const text = $("msgInput").value.trim();
    if (!text) return;
    $("msgInput").value = "";
    await API.messagesSend(token, activeChatId, text);
    await refreshChatMessages(true);
    await loadChats();
  };

  // mark read
  await API.messagesMarkRead(token, activeChatId);
  await loadChats();
}

async function refreshChatMessages(scrollDown=false){
  const data = await API.messagesList(token, activeChatId);
  const list = $("msgList");
  list.innerHTML = "";
  for (const m of data.messages){
    const b = document.createElement("div");
    b.className = "bubble" + (m.is_me ? " me" : "");
    b.innerHTML = `<div>${esc(m.text)}</div><div class="msgMeta">${new Date(m.ts).toLocaleString()}</div>`;
    list.appendChild(b);
  }
  if (scrollDown) list.scrollTop = list.scrollHeight;
}

/* ---------------- FEED ---------------- */

async function renderFeed(){
  const v = $("view-feed");
  v.innerHTML = `
    <div class="feedBox">
      <div class="feedComposer">
        <div style="font-weight:1000">Создать пост</div>
        <textarea id="postText" class="textarea" placeholder="Что нового?"></textarea>
        <button id="btnPost" class="btnGlass primary" type="button">Опубликовать</button>
      </div>
    </div>
    <div id="feedList"></div>
  `;

  $("btnPost").onclick = async () => {
    const text = $("postText").value.trim();
    if (!text) return;
    $("postText").value = "";
    await API.postsCreate(token, text);
    await loadFeed();
  };

  await loadFeed();
}

async function loadFeed(){
  const data = await API.postsList(token, null);
  const list = document.getElementById("feedList");
  list.innerHTML = "";
  for (const p of data.posts){
    const item = document.createElement("div");
    item.className = "feedItem";
    item.innerHTML = `
      <div class="feedTop">
        <div class="avatar" style="width:42px;height:42px">${avatarHtml(p.author)}</div>
        <div>
          <div class="feedName">${esc(p.author.display_name || p.author.username)}</div>
          <div class="feedMeta">@${esc(p.author.username)} · ${new Date(p.ts).toLocaleString()}</div>
        </div>
      </div>
      <div class="feedText">${esc(p.text)}</div>
      <div class="likeRow">
        <button class="likeBtn ${p.liked ? "on":""}" data-like="${esc(p.id)}" type="button">
          ❤️ ${p.likes}
        </button>
      </div>
    `;
    list.appendChild(item);
  }

  list.querySelectorAll("[data-like]").forEach(btn => {
    btn.onclick = async () => {
      await API.postsLike(token, btn.getAttribute("data-like"));
      await loadFeed();
    };
  });
}

/* ---------------- SETTINGS / PROFILE ---------------- */

async function renderSettings(){
  const v = $("view-settings");
  const prof = await API.profileGet(token);
  me = prof.me;

  v.innerHTML = `
    <div class="settingsWrap">

      <div class="panel">
        <div class="panelTitle">Профиль</div>
        <div class="grid">
          <div>
            <div class="label">Отображаемое имя</div>
            <input id="setName" class="input" value="${esc(me.display_name || "")}" />
          </div>
          <div>
            <div class="label">Username</div>
            <input id="setUsername" class="input" value="${esc(me.username || "")}" />
            <div class="meta">a-z 0-9 _ (3–20). Можно поменять.</div>
          </div>
          <div>
            <div class="label">Bio</div>
            <input id="setBio" class="input" value="${esc(me.bio || "")}" />
          </div>
          <div>
            <div class="label">Avatar URL</div>
            <input id="setAva" class="input" value="${esc(me.avatar_url || "")}" />
          </div>
          <button id="btnSaveProfile" class="btnGlass primary" type="button">Сохранить</button>
        </div>
      </div>

      <div class="panel">
        <div class="panelTitle">Приватность</div>
        <div class="switchRow">
          <div>
            <div style="font-weight:1000">Кто может писать</div>
            <div class="meta">Если выключить — писать смогут только те, с кем уже есть чат.</div>
          </div>
          <button id="btnToggleDm" class="smallBtn" type="button">
            ${me.allow_dm ? "Все" : "Никто"}
          </button>
        </div>
      </div>

      <div class="panel">
        <div class="panelTitle">Аккаунт</div>
        <div class="meta">Почта: ${esc(me.email)}</div>
        <div style="height:10px"></div>
        <button id="btnLogout" class="btnGlass" type="button">Выйти</button>
      </div>

      <div class="panel">
        <div class="panelTitle">Как выглядит профиль</div>
        <div class="row" style="cursor:default">
          <div class="avatar">${avatarHtml(me)}</div>
          <div class="mid">
            <div class="title">${esc(me.display_name || me.username)}</div>
            <div class="sub">@${esc(me.username)} · ${esc(me.bio || "")}</div>
          </div>
        </div>
      </div>

    </div>
  `;

  $("btnSaveProfile").onclick = async () => {
    try{
      const patch = {
        display_name: $("setName").value.trim(),
        username: $("setUsername").value.trim(),
        bio: $("setBio").value.trim(),
        avatar_url: $("setAva").value.trim()
      };
      await API.profileUpdate(token, patch);
      await renderSettings();
      await renderProfile();
      await loadChats();
      alert("Сохранено ✅");
    }catch(e){
      alert(errorText(e));
    }
  };

  $("btnToggleDm").onclick = async () => {
    await API.profileUpdate(token, { allow_dm: me.allow_dm ? 0 : 1 });
    await renderSettings();
  };

  $("btnLogout").onclick = () => {
    localStorage.removeItem("ex_token");
    token = "";
    me = null;
    stopPolling();
    showAuth();
    switchAuthTab("login");
  };
}

async function renderProfile(){
  const v = $("view-profile");
  const prof = await API.profileGet(token);
  me = prof.me;

  v.innerHTML = `
    <div class="settingsWrap">
      <div class="panel">
        <div class="row" style="cursor:default">
          <div class="avatar">${avatarHtml(me)}</div>
          <div class="mid">
            <div class="title">${esc(me.display_name || me.username)}</div>
            <div class="sub">@${esc(me.username)}</div>
          </div>
        </div>
        <div style="margin-top:10px" class="meta">${esc(me.bio || "Без описания")}</div>
      </div>

      <div class="panel">
        <div class="panelTitle">Быстрые действия</div>
        <button id="goSettings" class="btnGlass primary" type="button">Открыть настройки</button>
      </div>
    </div>
  `;
  $("goSettings").onclick = async () => {
    setTab("settings");
    await renderSettings();
  };
}

/* ---------------- SEARCH ---------------- */
async function handleSearch(){
  const q = $("search").value.trim().toLowerCase();

  if (activeTab === "chats"){
    if (!q){
      renderChats(null);
      return;
    }
    const data = await API.usersSearch(token, q);
    renderChats(data.users);
    return;
  }
  // feed/settings/profile search later
}

/* ---------------- POLLING ---------------- */
function startPolling(){
  stopPolling();
  pollTimer = setInterval(async () => {
    try{
      if (!token) return;
      if (activeTab === "chats" && $("view-messages").classList.contains("hidden")){
        await loadChats();
      }
      if (activeChatId && activeTab === "chats" && !$("view-messages").classList.contains("hidden")){
        await refreshChatMessages(false);
      }
    }catch{}
  }, 3500);
}

function stopPolling(){
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
}

/* ---------------- AUTH BIND ---------------- */
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

/* ---------------- MAIN BIND ---------------- */
function bindMainUI(){
  document.querySelectorAll(".tab").forEach(btn => {
    btn.onclick = async () => {
      setTab(btn.dataset.tab);

      if (btn.dataset.tab === "chats"){
        $("view-messages").classList.add("hidden");
        $("view-chats").classList.remove("hidden");
        await loadChats();
      }
      if (btn.dataset.tab === "feed") await renderFeed();
      if (btn.dataset.tab === "settings") await renderSettings();
      if (btn.dataset.tab === "profile") await renderProfile();
    };
  });

  $("search").oninput = async () => {
    try{ await handleSearch(); }catch{}
  };

  $("btnRefresh").onclick = async () => {
    if (activeTab === "chats") await loadChats();
    if (activeTab === "feed") await loadFeed();
    if (activeTab === "settings") await renderSettings();
    if (activeTab === "profile") await renderProfile();
  };
}

/* ---------------- ENTER APP (refresh-safe) ---------------- */
async function enterApp(){
  showMain();
  setTab("chats");
  await loadChats();
  startPolling();

  // verify token in background; only kick out on real 401
  try{
    me = (await API.profileGet(token)).me;
  }catch(e){
    if (e?.status === 401 || e?.error === "unauthorized"){
      localStorage.removeItem("ex_token");
      token = "";
      stopPolling();
      showAuth();
      switchAuthTab("login");
      setHint("Сессия устарела. Войди заново.");
    }
  }
}

/* ---------------- BOOT ---------------- */
async function boot(){
  initTheme();
  bindAuthUI();
  bindMainUI();

  if (token){
    try{
      await enterApp();
      return;
    }catch{
      localStorage.removeItem("ex_token");
      token = "";
    }
  }
  showAuth();
}

boot();
