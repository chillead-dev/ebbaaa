const $ = (id) => document.getElementById(id);
const API = {
  register: "/api/register",
  login: "/api/login",
  me: "/api/me",
  posts: "/api/posts"
};

let state = {
  token: localStorage.getItem("token") || "",
  me: null
};

function setTab(tab) {
  $("btnFeed").classList.toggle("active", tab === "feed");
  $("btnChat").classList.toggle("active", tab === "chat");
  $("feedPanel").classList.toggle("hidden", tab !== "feed");
  $("chatPanel").classList.toggle("hidden", tab !== "chat");
  $("chatWidget").classList.toggle("hidden", tab !== "chat" || !state.token);
}

function setAuthedUI(authed) {
  $("authPanel").classList.toggle("hidden", authed);
  $("btnLogout").classList.toggle("hidden", !authed);
  $("fab").classList.toggle("hidden", !authed);
  $("feedPanel").classList.toggle("hidden", !authed);
  $("chatWidget").classList.toggle("hidden", !authed || !$("btnChat").classList.contains("active"));
}

async function apiFetch(url, opts = {}) {
  const headers = opts.headers || {};
  if (state.token) headers["Authorization"] = `Bearer ${state.token}`;
  if (opts.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
  const res = await fetch(url, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "request_failed");
  return data;
}

function renderMe() {
  if (!state.me) return;
  const v = state.me.is_verified ? " ✅" : "";
  $("meLine").textContent = `ID: ${state.me.id} | @${state.me.username}${v} | role: ${state.me.role}`;
  $("btnAdmin").classList.toggle("hidden", state.me.role !== "admin");
}

function escapeHtml(s) {
  return (s || "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
}

function renderFeed(posts) {
  const root = $("feed");
  root.innerHTML = "";
  for (const p of posts) {
    const author = p.users || {};
    const verified = author.is_verified ? `<span class="badge">✅ verified</span>` : "";
    const el = document.createElement("div");
    el.className = "post";
    el.innerHTML = `
      <div class="postTop">
        <div>
          <b>@${author.username || "unknown"}</b>
          <span class="muted"> • ${new Date(p.created_at).toLocaleString()}</span>
        </div>
        ${verified}
      </div>
      <div style="margin-top:8px; white-space: pre-wrap;">${escapeHtml(p.text)}</div>
    `;
    root.appendChild(el);
  }
}

async function loadMe() {
  const data = await apiFetch(API.me);
  state.me = data.user;
  renderMe();
}

async function loadFeed() {
  const data = await apiFetch(API.posts, { method: "GET" });
  renderFeed(data.posts || []);
}

function openModal(open) {
  $("modal").classList.toggle("hidden", !open);
  if (open) $("postText").focus();
}

$("btnFeed").onclick = () => setTab("feed");
$("btnChat").onclick = () => setTab("chat");
$("btnAdmin").onclick = () => { location.href = "/admin.html"; };

$("btnLogout").onclick = () => {
  state.token = "";
  state.me = null;
  localStorage.removeItem("token");
  setAuthedUI(false);
  $("authInfo").textContent = "Вышел.";
};

$("btnRegister").onclick = async () => {
  $("authInfo").textContent = "…";
  try {
    const username = $("username").value;
    const password = $("password").value;
    const data = await apiFetch(API.register, {
      method: "POST",
      body: JSON.stringify({ username, password })
    });
    $("authInfo").textContent = `Создан: ID ${data.user.id} @${data.user.username}`;
  } catch (e) {
    $("authInfo").textContent = `Ошибка: ${e.message}`;
  }
};

$("btnLogin").onclick = async () => {
  $("authInfo").textContent = "…";
  try {
    const username = $("username").value;
    const password = $("password").value;
    const ownerKey = $("ownerKey").value;
    const data = await apiFetch(API.login, {
      method: "POST",
      body: JSON.stringify({ username, password, ownerKey })
    });
    state.token = data.token;
    localStorage.setItem("token", state.token);

    await loadMe();
    setAuthedUI(true);
    setTab("feed");
    await loadFeed();
    $("authInfo").textContent = "";
  } catch (e) {
    $("authInfo").textContent = `Ошибка: ${e.message}`;
  }
};

$("fab").onclick = () => openModal(true);
$("btnPostCancel").onclick = () => openModal(false);

$("btnPostSend").onclick = async () => {
  const text = $("postText").value.trim();
  if (!text) return;
  try {
    await apiFetch(API.posts, { method: "POST", body: JSON.stringify({ text }) });
    $("postText").value = "";
    openModal(false);
    await loadFeed();
  } catch (e) {
    alert("Ошибка поста: " + e.message);
  }
};

(async function init() {
  if (state.token) {
    try {
      await loadMe();
      setAuthedUI(true);
      setTab("feed");
      await loadFeed();
      return;
    } catch {
      state.token = "";
      localStorage.removeItem("token");
    }
  }
  setAuthedUI(false);
  setTab("feed");
})();
