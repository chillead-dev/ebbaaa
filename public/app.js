import API from "./api.js";

const $ = (id) => document.getElementById(id);

let token = localStorage.getItem("ex_token") || "";
let me = null;

let activeTab = "feed";
let activeChat = null;  // { chatId, peerId, peerUsername }
let lastTsByChat = new Map();
let pollTimer = null;
let presenceTimer = null;

function setHint(text, good=false) {
  const el = $("authHint");
  el.style.color = good ? "var(--ok)" : "var(--muted)";
  el.textContent = text || "";
}

function showAuth() {
  $("screen-auth").classList.remove("hidden");
  $("screen-main").classList.add("hidden");
  stopPolling();
}

function showMain() {
  $("screen-auth").classList.add("hidden");
  $("screen-main").classList.remove("hidden");
  renderTab(activeTab);
  startPresence();
  startPolling();
}

function switchAuthTab(mode) {
  const isLogin = mode === "login";
  $("tab-login").classList.toggle("isOn", isLogin);
  $("tab-signup").classList.toggle("isOn", !isLogin);
  $("loginForm").classList.toggle("hidden", !isLogin);
  $("signupForm").classList.toggle("hidden", isLogin);
  setHint("");
}

async function boot() {
  bindUI();

  if (token) {
    try {
      me = await API.me(token);
      showMain();
      await loadFeed();
      await loadChats();
      await loadSettings();
    } catch {
      token = "";
      localStorage.removeItem("ex_token");
      showAuth();
    }
  } else {
    showAuth();
  }
}

function bindUI() {
  $("tab-login").onclick = () => switchAuthTab("login");
  $("tab-signup").onclick = () => switchAuthTab("signup");

  $("btnSendCode").onclick = async () => {
    try {
      setHint("Отправляем код…");
      await API.requestCode($("suEmail").value);
      setHint("Код отправлен на почту (10 минут).", true);
    } catch (e) {
      setHint(errorText(e));
    }
  };

  $("btnSignup").onclick = async () => {
    try {
      setHint("Создаём аккаунт…");
      const r = await API.signup(
        $("suEmail").value,
        $("suPass").value,
        $("suCode").value,
        $("suUsername").value
      );
      token = r.token;
      localStorage.setItem("ex_token", token);
      me = await API.me(token);
      showMain();
      await loadFeed();
      await loadChats();
      await loadSettings();
    } catch (e) {
      setHint(errorText(e));
    }
  };

  $("btnLogin").onclick = async () => {
    try {
      setHint("Входим…");
      const r = await API.login($("loginEmail").value, $("loginPass").value);
      token = r.token;
      localStorage.setItem("ex_token", token);
      me = await API.me(token);
      showMain();
      await loadFeed();
      await loadChats();
      await loadSettings();
    } catch (e) {
      setHint(errorText(e));
    }
  };

  document.querySelectorAll(".tab").forEach(btn => {
    btn.onclick = async () => {
      document.querySelectorAll(".tab").forEach(b => b.classList.remove("isOn"));
      btn.classList.add("isOn");
      activeTab = btn.dataset.tab;
      renderTab(activeTab);
      if (activeTab === "feed") await loadFeed();
      if (activeTab === "messages") await loadChats();
      if (activeTab === "settings") await loadSettings();
    };
  });

  $("search").oninput = async () => {
    const q = $("search").value.trim();
    if (activeTab === "feed") {
      await renderSearchResults(q);
    } else if (activeTab === "messages") {
      await renderSearchToStartChat(q);
    }
  };
}

function renderTab(tab) {
  $("view-feed").classList.toggle("hidden", tab !== "feed");
  $("view-messages").classList.toggle("hidden", tab !== "messages");
  $("view-settings").classList.toggle("hidden", tab !== "settings");

  $("topTitle").textContent =
    tab === "feed" ? "Лента" :
    tab === "messages" ? "Сообщения" : "Настройки";

  // search visible only on feed/messages
  $("search").classList.toggle("hidden", tab === "settings");
  $("search").placeholder = tab === "feed" ? "Поиск по username" : "Найти пользователя для чата";
  $("search").value = "";
}

function errorText(e) {
  const m = e?.error || "Ошибка";
  if (m === "gmail_only") return "Только Gmail (@gmail.com) пока что.";
  if (m === "too_fast") return "Слишком часто. Подожди 20 секунд.";
  if (m === "code_invalid") return "Неверный код.";
  if (m === "code_missing_or_expired") return "Код не найден или истёк.";
  if (m === "email_taken") return "Эта почта уже занята.";
  if (m === "username_taken") return "Этот username уже занят.";
  if (m === "username_invalid") return "Username: 3–20 символов, a-z 0-9 _.";
  if (m === "invalid_credentials") return "Неверная почта или пароль.";
  if (m === "dm_disabled") return "Пользователь отключил личные сообщения.";
  return m;
}

/* FEED */

async function loadFeed() {
  const v = $("view-feed");
  v.innerHTML = `
    <div class="card2">
      <div class="hrow">
        <div style="font-weight:900">Новый пост</div>
        <div class="badge">как в Telegram iOS</div>
      </div>
      <div style="height:10px"></div>
      <textarea id="newPost" class="input" rows="3" placeholder="Что нового?" style="resize:none"></textarea>
      <div style="height:10px"></div>
      <button id="btnPost" class="btn">Опубликовать</button>
    </div>
    <div id="posts"></div>
  `;

  $("btnPost").onclick = async () => {
    const text = $("newPost").value.trim();
    if (!text) return;
    await API.postsCreate(token, text);
    $("newPost").value = "";
    await loadFeed();
  };

  const posts = await API.postsList(token);
  renderPosts(posts);
}

function renderPosts(posts) {
  const wrap = $("posts");
  wrap.innerHTML = "";
  for (const p of posts) {
    const el = document.createElement("div");
    el.className = "card2";
    el.innerHTML = `
      <div class="hrow">
        <div class="avatar">${p.avatar_url ? `<img src="${escapeHtml(p.avatar_url)}" />` : ""}</div>
        <div>
          <div style="font-weight:900">${escapeHtml(p.display_name)} <span class="meta">@${escapeHtml(p.username)}</span></div>
          <div class="meta">${new Date(p.created_at).toLocaleString()}</div>
        </div>
      </div>
      <div style="height:10px"></div>
      <div style="white-space:pre-wrap">${escapeHtml(p.text)}</div>
    `;
    wrap.appendChild(el);
  }
}

async function renderSearchResults(q) {
  const wrap = $("posts");
  if (!q) {
    const posts = await API.postsList(token);
    renderPosts(posts);
    return;
  }
  const users = await API.usersSearch(token, q);
  wrap.innerHTML = `
    <div class="card2">
      <div style="font-weight:900">Результаты поиска</div>
      <div class="meta">Найдено: ${users.length}</div>
    </div>
  `;
  for (const u of users) {
    const el = document.createElement("div");
    el.className = "card2";
    el.innerHTML = `
      <div class="hrow">
        <div class="avatar">${u.avatar_url ? `<img src="${escapeHtml(u.avatar_url)}" />` : ""}</div>
        <div style="flex:1">
          <div style="font-weight:900">${escapeHtml(u.display_name)} <span class="meta">@${escapeHtml(u.username)}</span></div>
          <div class="meta">Нажми, чтобы открыть чат</div>
        </div>
        <button class="btnLite">Чат</button>
      </div>
    `;
    el.querySelector("button").onclick = async () => {
      activeTab = "messages";
      document.querySelectorAll(".tab").forEach(b => b.classList.toggle("isOn", b.dataset.tab === "messages"));
      renderTab("messages");
      await startChatWithUser(u);
    };
    wrap.appendChild(el);
  }
}

/* MESSAGES */

async function loadChats() {
  const v = $("view-messages");
  v.innerHTML = `
    <div id="chatHeader" class="card2">
      <div style="font-weight:900">Диалоги</div>
      <div class="meta">Поиск сверху: найди пользователя и начни чат</div>
    </div>
    <div id="chats"></div>
    <div id="chatView"></div>
  `;

  const chats = await API.chatsList(token);
  await renderChats(chats);
}

async function renderChats(chats) {
  const wrap = $("chats");
  wrap.innerHTML = "";
  if (!chats.length) {
    wrap.innerHTML = `<div class="card2"><div class="meta">Пока нет диалогов. Найди пользователя сверху.</div></div>`;
    return;
  }

  for (const c of chats) {
    const peerId = (c.a_id === me.id) ? c.b_id : c.a_id;
    const peer = await API.req(`/api/me?`, { token }).catch(()=>null); // не используем; оставим простое
    // Для MVP: peer username мы восстановим через users_search по exact id невозможно.
    // Поэтому покажем chatId и откроем чат по нему.
    const el = document.createElement("div");
    el.className = "card2";
    el.innerHTML = `
      <div class="hrow">
        <div style="flex:1">
          <div style="font-weight:900">Чат</div>
          <div class="meta">${escapeHtml(c.id)}</div>
        </div>
        <button class="btnLite">Открыть</button>
      </div>
    `;
    el.querySelector("button").onclick = async () => {
      activeChat = { chatId: c.id, peerId };
      await openChat(activeChat);
    };
    wrap.appendChild(el);
  }
}

async function renderSearchToStartChat(q) {
  const v = $("chatView");
  if (!q) {
    v.innerHTML = activeChat ? v.innerHTML : `<div class="card2"><div class="meta">Выбери чат или найди пользователя сверху.</div></div>`;
    return;
  }

  const users = await API.usersSearch(token, q);
  v.innerHTML = `
    <div class="card2">
      <div style="font-weight:900">Начать чат</div>
      <div class="meta">Найдено: ${users.length}</div>
    </div>
  `;

  for (const u of users) {
    if (u.id === me.id) continue;
    const el = document.createElement("div");
    el.className = "card2";
    el.innerHTML = `
      <div class="hrow">
        <div class="avatar">${u.avatar_url ? `<img src="${escapeHtml(u.avatar_url)}" />` : ""}</div>
        <div style="flex:1">
          <div style="font-weight:900">${escapeHtml(u.display_name)} <span class="meta">@${escapeHtml(u.username)}</span></div>
          <div class="meta">Откроет/создаст чат</div>
        </div>
        <button class="btn">Написать</button>
      </div>
    `;
    el.querySelector("button").onclick = async () => startChatWithUser(u);
    v.appendChild(el);
  }
}

async function startChatWithUser(u) {
  // chatId вычисляется на сервере по pair, но мы его знаем форматом:
  const a = me.id < u.id ? me.id : u.id;
  const b = me.id < u.id ? u.id : me.id;
  const chatId = `chat_${a}_${b}`;
  activeChat = { chatId, peerId: u.id, peerUsername: u.username };
  await openChat(activeChat);
}

async function openChat(chat) {
  const v = $("chatView");
  v.innerHTML = `
    <div class="card2">
      <div style="font-weight:900">Чат</div>
      <div class="meta">${escapeHtml(chat.peerUsername || chat.peerId)}</div>
    </div>
    <div id="msgList" class="msgList"></div>
    <div class="chatBar">
      <input id="msgInput" class="input" placeholder="Сообщение…" />
      <button id="msgSend" class="btn">Отпр</button>
    </div>
  `;

  $("msgSend").onclick = async () => {
    const text = $("msgInput").value.trim();
    if (!text) return;
    await API.dmSend(token, chat.peerId, text);
    $("msgInput").value = "";
    await pullNewMessages(chat.chatId);
  };

  lastTsByChat.set(chat.chatId, 0);
  await pullNewMessages(chat.chatId, true);
}

async function pullNewMessages(chatId, full=false) {
  const lastTs = full ? 0 : (lastTsByChat.get(chatId) || 0);
  const msgs = await API.dmList(token, chatId, lastTs);
  if (!msgs.length) return;

  const list = $("msgList");
  for (const m of msgs) {
    const el = document.createElement("div");
    el.className = `bubble ${m.from === me.id ? "me" : ""}`;
    el.innerHTML = `
      <div style="white-space:pre-wrap">${escapeHtml(m.text)}</div>
      <div class="meta" style="margin-top:6px">${new Date(m.ts).toLocaleTimeString()}</div>
    `;
    list.appendChild(el);
    lastTsByChat.set(chatId, Math.max(lastTsByChat.get(chatId) || 0, m.ts));
  }
  list.scrollTop = list.scrollHeight;
}

/* SETTINGS */

async function loadSettings() {
  const v = $("view-settings");
  me = await API.me(token);

  v.innerHTML = `
    <div class="card2">
      <div class="hrow">
        <div class="avatar" style="width:52px;height:52px;border-radius:18px">${me.avatar_url ? `<img src="${escapeHtml(me.avatar_url)}" />` : ""}</div>
        <div style="flex:1">
          <div style="font-weight:900">${escapeHtml(me.display_name)}</div>
          <div class="meta">@${escapeHtml(me.username)}</div>
        </div>
        <button id="btnLogout" class="btnLite">Выйти</button>
      </div>
      <div style="height:12px"></div>
      <div class="meta">Почта: ${escapeHtml(me.email)}</div>
    </div>

    <div class="card2">
      <div style="font-weight:900;margin-bottom:10px">Профиль</div>
      <input id="setName" class="input" placeholder="Ник (display name)" value="${escapeHtml(me.display_name)}" />
      <div style="height:10px"></div>
      <input id="setUsername" class="input" placeholder="Username" value="${escapeHtml(me.username)}" />
      <div style="height:10px"></div>
      <input id="setAvatar" class="input" placeholder="Avatar URL" value="${escapeHtml(me.avatar_url || "")}" />
      <div style="height:12px"></div>
      <button id="btnSaveProfile" class="btn">Сохранить</button>
      <div id="setHint" class="hint"></div>
    </div>

    <div class="card2">
      <div style="font-weight:900;margin-bottom:10px">Приватность</div>
      <label class="hrow" style="justify-content:space-between">
        <div>
          <div style="font-weight:800">Кто может писать</div>
          <div class="meta">Если выключить — никто не сможет DM</div>
        </div>
        <input id="allowDm" type="checkbox" ${me.allow_dm ? "checked" : ""} />
      </label>
    </div>
  `;

  $("btnLogout").onclick = () => {
    localStorage.removeItem("ex_token");
    token = "";
    me = null;
    showAuth();
  };

  $("btnSaveProfile").onclick = async () => {
    const hint = $("setHint");
    hint.textContent = "Сохраняем…";
    try {
      await API.meUpdate(token, {
        display_name: $("setName").value,
        username: $("setUsername").value,
        avatar_url: $("setAvatar").value
      });
      hint.style.color = "var(--ok)";
      hint.textContent = "Сохранено.";
      await loadSettings();
    } catch (e) {
      hint.style.color = "var(--bad)";
      hint.textContent = errorText(e);
    }
  };

  $("allowDm").onchange = async () => {
    try {
      await API.meUpdate(token, { allow_dm: $("allowDm").checked });
    } catch {}
  };
}

/* Polling + Presence */

function startPolling() {
  stopPolling();
  pollTimer = setInterval(async () => {
    if (!token || !me) return;
    if (activeTab === "messages" && activeChat?.chatId) {
      await pullNewMessages(activeChat.chatId);
    }
  }, 1500);
}

function stopPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
  stopPresence();
}

function startPresence() {
  stopPresence();
  presenceTimer = setInterval(async () => {
    if (!token) return;
    try { await API.presencePing(token); } catch {}
  }, 25000);
}

function stopPresence() {
  if (presenceTimer) clearInterval(presenceTimer);
  presenceTimer = null;
}

/* helpers */
function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

boot();
