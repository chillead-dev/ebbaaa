const API = {
  me: "/api/me",
  users: "/api/admin_users",
  action: "/api/admin_user_action"
};

let token = localStorage.getItem("token") || "";

async function apiFetch(url, opts = {}) {
  const headers = opts.headers || {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (opts.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
  const res = await fetch(url, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "request_failed");
  return data;
}

function esc(s){ return (s||"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;"); }

async function load() {
  const me = await apiFetch(API.me);
  if (me.user.role !== "admin") {
    document.body.innerHTML = "<div class='main'><div class='card'>Нет доступа</div></div>";
    return;
  }

  const data = await apiFetch(API.users);
  document.getElementById("stats").textContent =
    `Всего: ${data.stats.total} | Забанено: ${data.stats.banned} | Verified: ${data.stats.verified}`;

  const root = document.getElementById("users");
  root.innerHTML = "";
  for (const u of data.users) {
    const row = document.createElement("div");
    row.className = "post";
    row.innerHTML = `
      <div class="postTop">
        <div>
          <b>ID ${u.id}</b> • @${esc(u.username)} • <span class="muted">${new Date(u.created_at).toLocaleString()}</span>
          <div class="muted">role=${u.role} | banned=${u.is_banned} | verified=${u.is_verified}</div>
        </div>
        <div class="row">
          <button data-act="ban" data-id="${u.id}" data-val="${u.is_banned ? 0 : 1}">${u.is_banned ? "Unban" : "Ban"}</button>
          <button data-act="verify" data-id="${u.id}" data-val="${u.is_verified ? 0 : 1}">${u.is_verified ? "Unverify" : "Verify ✅"}</button>
        </div>
      </div>
    `;
    root.appendChild(row);
  }

  root.querySelectorAll("button[data-act]").forEach(btn => {
    btn.onclick = async () => {
      const action = btn.getAttribute("data-act");
      const userId = Number(btn.getAttribute("data-id"));
      const value = !!Number(btn.getAttribute("data-val"));
      await apiFetch(API.action, { method: "POST", body: JSON.stringify({ userId, action, value }) });
      await load();
    };
  });
}

document.getElementById("btnReload").onclick = load;

(async () => {
  if (!token) {
    document.body.innerHTML = "<div class='main'><div class='card'>Сначала войди на главной</div></div>";
    return;
  }
  try { await load(); } catch (e) {
    document.body.innerHTML = `<div class='main'><div class='card'>Ошибка: ${e.message}</div></div>`;
  }
})();
