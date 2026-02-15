import API from "./api.js";
const $ = (id) => document.getElementById(id);

let token = localStorage.getItem("ex_token") || "";
let me = null;
let activeTab = "messages"; // по умолчанию после входа — сообщения

function setHint(text, kind="muted") {
  const el = $("authHint");
  el.textContent = text || "";
  el.style.color = kind === "ok" ? "var(--accent)" : "var(--muted)";
}

function errorText(e) {
  const m = e?.error || "Ошибка";
  if (m === "gmail_only") return "Пока только Gmail (@gmail.com).";
  if (m === "too_fast") return "Слишком часто. Подожди немного и попробуй снова.";
  if (m === "code_invalid") return "Неверный код.";
  if (m === "code_missing_or_expired") return "Код не найден или истёк.";
  if (m === "email_taken") return "Аккаунт с этой почтой уже существует. Перейти ко входу?";
  if (m === "invalid_credentials") return "Неверная почта или пароль.";
  if (m === "bad_request") return "Заполни все поля.";
  return m;
}

function initTheme() {
  const btn = $("themeToggle");
  const saved = localStorage.getItem("ex_theme") || "light";
  document.documentElement.setAttribute("data-theme", saved);
  btn.textContent = saved === "dark" ? "Тема: Тёмная" : "Тема: Светлая";

  btn.onclick = () => {
    const cur = document.documentElement.getAttribute("data-theme") || "light";
    const next = cur === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("ex_theme", next);
    btn.textContent = next === "dark" ? "Тема: Тёмная" : "Тема: Светлая";
  };
}

function showAuth() {
  $("screen-auth").classList.remove("hidden");
  $("screen-main").classList.add("hidden");
}

function showMain() {
  $("screen-auth").classList.add("hidden");
  $("screen-main").classList.remove("hidden");
  selectTab(activeTab);
}

function switchAuthTab(mode) {
  const isLogin = mode === "login";
  $("tab-login").classList.toggle("isOn", isLogin);
  $("tab-signup").classList.toggle("isOn", !isLogin);

  $("loginForm").classList.toggle("hidden", !isLogin);
  $("signupStep1").classList.toggle("hidden", isLogin);
  $("signupStep2").classList.add("hidden");

  setHint("");
}

function showSignupStep(step) {
  $("signupStep1").classList.toggle("hidden", step !== 1);
  $("signupStep2").classList.toggle("hidden", step !== 2);
  setHint("");
}

function togglePassword(inputId) {
  const el = $(inputId);
  el.type = (el.type === "password") ? "text" : "password";
}

/* ---------- MAIN TAB UI (минимально) ---------- */
function selectTab(tab) {
  activeTab = tab;

  document.querySelectorAll(".tab").forEach(b => {
    b.classList.toggle("isOn", b.dataset.tab === tab);
  });

  $("view-feed").classList.toggle("hidden", tab !== "feed");
  $("view-messages").classList.toggle("hidden", tab !== "messages");
  $("view-settings").classList.toggle("hidden", tab !== "settings");

  $("topTitle").textContent = tab === "feed" ? "Лента" : (tab === "settings" ? "Настройки" : "Сообщения");
  $("search").placeholder = tab === "messages" ? "Найти пользователя для чата" : "Поиск по username";
}

/* ---------- Minimal content rendering ---------- */
async function renderMessagesHome() {
  const v = $("view-messages");
  v.innerHTML = `
    <div class="card2">
      <div style="font-weight:1000">Сообщения</div>
      <div class="meta">Найди пользователя через поиск сверху и начни чат.</div>
    </div>
  `;
}

async function renderFeedHome() {
  const v = $("view-feed");
  v.innerHTML = `
    <div class="card2">
      <div style="font-weight:1000">Лента</div>
      <div class="meta">Скоро: посты. Сейчас фокус на авторизации и мессенджере.</div>
    </div>
  `;
}

async function renderSettingsHome() {
  const v = $("view-settings");
  v.innerHTML = `
    <div class="card2">
      <div style="font-weight:1000">Настройки</div>
      <div class="meta">Скоро: профиль, username, аватар, приватность.</div>
      <div style="height:12px"></div>
      <button id="btnLogout" class="btnGlass" type="button">Выйти</button>
    </div>
  `;
  $("btnLogout").onclick = () => {
    localStorage.removeItem("ex_token");
    token = "";
    me = null;
    showAuth();
    switchAuthTab("login");
  };
}

async function afterAuthSuccess(newToken) {
  token = newToken;
  localStorage.setItem("ex_token", token);

  // проверим токен
  try { me = await API.me(token); } catch {}

  showMain();
  selectTab("messages");
  await renderMessagesHome();
  await renderFeedHome();
  await renderSettingsHome();
}

/* ---------- Search (minimal placeholder) ---------- */
function bindMainUI() {
  document.querySelectorAll(".tab").forEach(btn => {
    btn.onclick = async () => {
      selectTab(btn.dataset.tab);
      if (btn.dataset.tab === "messages") await renderMessagesHome();
      if (btn.dataset.tab === "feed") await renderFeedHome();
      if (btn.dataset.tab === "settings") await renderSettingsHome();
    };
  });

  $("search").oninput = async () => {
    // позже подключим users_search + старт чат
    // сейчас оставим, чтобы UI был ровный
  };
}

/* ---------- AUTH UI ---------- */
function bindAuthUI() {
  $("tab-login").onclick = () => switchAuthTab("login");
  $("tab-signup").onclick = () => switchAuthTab("signup");

  $("toggleLoginPass").onclick = () => togglePassword("loginPass");
  $("toggleSignupPass").onclick = () => togglePassword("suPass");

  $("btnSendCode").onclick = async () => {
    try {
      setHint("Отправляем код…");
      await API.requestCode($("suEmail").value);
      setHint("Код отправлен. Проверь почту.", "ok");
      showSignupStep(2);
    } catch (e) {
      // если почта уже занята — предложим логин
      if (e?.error === "email_taken") {
        setHint("Аккаунт уже существует. Перейти ко входу?", "ok");
        $("loginEmail").value = $("suEmail").value;
        switchAuthTab("login");
        return;
      }
      setHint(errorText(e));
    }
  };

  $("btnBackToStep1").onclick = () => showSignupStep(1);

  $("btnSignup").onclick = async () => {
    try {
      setHint("Создаём аккаунт…");
      const r = await API.signup(
        $("suEmail").value,
        $("suPass").value,
        $("suCode").value,
        "" // username не обязателен
      );
      await afterAuthSuccess(r.token);
    } catch (e) {
      if (e?.error === "email_taken") {
        setHint("Аккаунт уже существует. Перейти ко входу?", "ok");
        $("loginEmail").value = $("suEmail").value;
        switchAuthTab("login");
        return;
      }
      setHint(errorText(e));
    }
  };

  $("btnLogin").onclick = async () => {
    try {
      setHint("Входим…");
      const r = await API.login($("loginEmail").value, $("loginPass").value);
      await afterAuthSuccess(r.token);
    } catch (e) {
      setHint(errorText(e));
    }
  };

  // default state
  switchAuthTab("login");
}

async function boot() {
  initTheme();
  bindAuthUI();
  bindMainUI();

  // если токен уже есть — сразу в main/messages
  if (token) {
    try {
      me = await API.me(token);
      showMain();
      selectTab("messages");
      await renderMessagesHome();
      await renderFeedHome();
      await renderSettingsHome();
      return;
    } catch {
      localStorage.removeItem("ex_token");
      token = "";
    }
  }
  showAuth();
}

boot();
