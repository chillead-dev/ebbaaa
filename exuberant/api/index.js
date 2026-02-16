import { Redis } from "@upstash/redis";
import { Resend } from "resend";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const redis = Redis.fromEnv();
const resend = new Resend(process.env.RESEND_API_KEY);

const json = (res, status, obj) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(obj));
};

const readBody = async (req) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
};

const safeParse = (x) => {
  if (!x) return null;
  if (typeof x === "object") return x;
  try { return JSON.parse(x); } catch { return null; }
};

const normalizeUsername = (s) =>
  String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");

const K = {
  user: (uid) => `user:${uid}`,
  userByEmail: (email) => `userByEmail:${email}`,
  userByUsername: (u) => `userByUsername:${u}`,
};

const getUid = (req) => {
  const h = req.headers.authorization || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  try {
    const payload = jwt.verify(m[1], process.env.JWT_SECRET);
    return payload?.uid || payload?.id || payload?.user_id || null;
  } catch {
    return null;
  }
};

const hashPass = (password) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
};

const verifyPass = (password, stored) => {
  const [salt, hash] = String(stored || "").split(":");
  if (!salt || !hash) return false;
  const test = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(test, "hex"));
};

const signToken = (uid) =>
  jwt.sign({ uid: String(uid) }, process.env.JWT_SECRET, { expiresIn: "30d" });

const dmId = (a, b) => {
  const [x, y] = [String(a), String(b)].sort();
  return `dm:${x}:${y}`;
};

async function moveChatToTop(listKey, chatId) {
  await redis.lrem(listKey, 0, chatId);
  await redis.lpush(listKey, chatId);
  await redis.ltrim(listKey, 0, 200);
}

/* ----------------- ROUTES ----------------- */

async function auth_request_code(req, res, body) {
  const email = String(body.email || "").trim().toLowerCase();
  if (!email.endsWith("@gmail.com")) return json(res, 400, { error: "gmail_only" });

  const exists = await redis.get(K.userByEmail(email));
  if (exists) return json(res, 400, { error: "email_taken" });

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const key = `code:${email}`;
  await redis.set(key, code, { ex: 10 * 60 });

  const from = process.env.RESEND_FROM || "Exuberant <auth@exuberant.pw>";
  const html = `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Arial;padding:24px;background:#f6f7f9;">
    <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:20px;border:1px solid rgba(0,0,0,.08);">
      <div style="font-weight:800;font-size:18px;">Exuberant</div>
      <div style="color:#666;margin-top:6px;">Код подтверждения</div>
      <div style="margin-top:16px;font-size:34px;letter-spacing:6px;font-weight:900;">${code}</div>
      <div style="color:#666;margin-top:12px;font-size:13px;line-height:1.4;">
        Если это были не вы — игнорируйте письмо. Код действует 10 минут.
      </div>
      <div style="margin-top:18px;color:#999;font-size:12px;">auth@exuberant.pw</div>
    </div>
  </div>`;

  await resend.emails.send({
    from,
    to: email,
    subject: `Ваш код для Exuberant: ${code}`,
    html,
  });

  return json(res, 200, { ok: true });
}

async function auth_signup(req, res, body) {
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const code = String(body.code || "").trim();

  if (!email.endsWith("@gmail.com")) return json(res, 400, { error: "gmail_only" });
  if (password.length < 6) return json(res, 400, { error: "bad_request" });

  const exists = await redis.get(K.userByEmail(email));
  if (exists) return json(res, 400, { error: "email_taken" });

  const storedCode = await redis.get(`code:${email}`);
  if (!storedCode) return json(res, 400, { error: "code_missing_or_expired" });
  if (String(storedCode) !== code) return json(res, 400, { error: "code_invalid" });

  const uid = crypto.randomBytes(12).toString("hex");
  const username = `user_${uid.slice(0, 8)}`;

  const user = {
    id: uid,
    email,
    username,
    display_name: username,
    bio: "",
    avatar_url: "",
    allow_dm: 1,
    pass: hashPass(password),
    created_at: Date.now(),
  };

  await redis.set(K.user(uid), JSON.stringify(user));
  await redis.set(K.userByEmail(email), uid);
  await redis.set(K.userByUsername(username), uid);
  await redis.zadd("usernames", { score: 0, member: username });
  await redis.del(`code:${email}`);

  const token = signToken(uid);
  return json(res, 200, { token });
}

async function auth_login(req, res, body) {
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!email || !password) return json(res, 400, { error: "bad_request" });

  const uid = await redis.get(K.userByEmail(email));
  if (!uid) return json(res, 400, { error: "invalid_credentials" });

  const user = safeParse(await redis.get(K.user(uid)));
  if (!user?.pass || !verifyPass(password, user.pass))
    return json(res, 400, { error: "invalid_credentials" });

  const token = signToken(uid);
  return json(res, 200, { token });
}

async function profile_get(req, res) {
  const uid = getUid(req);
  if (!uid) return json(res, 401, { error: "unauthorized" });

  const user = safeParse(await redis.get(K.user(uid)));
  if (!user) return json(res, 401, { error: "unauthorized" });

  return json(res, 200, {
    me: {
      id: user.id,
      email: user.email,
      username: user.username,
      display_name: user.display_name || user.username,
      bio: user.bio || "",
      avatar_url: user.avatar_url || "",
      allow_dm: user.allow_dm ? 1 : 0,
    }
  });
}

async function profile_update(req, res, body) {
  const uid = getUid(req);
  if (!uid) return json(res, 401, { error: "unauthorized" });

  const user = safeParse(await redis.get(K.user(uid)));
  if (!user) return json(res, 401, { error: "unauthorized" });

  let username = user.username;

  if (body.username !== undefined) {
    const next = normalizeUsername(body.username);
    if (!/^[a-z0-9_]{3,20}$/.test(next)) return json(res, 400, { error: "username_invalid" });

    if (next !== user.username) {
      const existed = await redis.get(K.userByUsername(next));
      if (existed) return json(res, 400, { error: "username_taken" });

      await redis.del(K.userByUsername(user.username));
      await redis.set(K.userByUsername(next), String(uid));
      await redis.zadd("usernames", { score: 0, member: next });
      username = next;
    }
  }

  const updated = {
    ...user,
    username,
    display_name: body.display_name !== undefined ? String(body.display_name || "").trim().slice(0, 32) : user.display_name,
    bio: body.bio !== undefined ? String(body.bio || "").trim().slice(0, 120) : (user.bio || ""),
    avatar_url: body.avatar_url !== undefined ? String(body.avatar_url || "").trim().slice(0, 500) : (user.avatar_url || ""),
    allow_dm: body.allow_dm !== undefined ? (Number(body.allow_dm) ? 1 : 0) : (user.allow_dm ? 1 : 0),
  };

  if (!updated.display_name) updated.display_name = updated.username;

  await redis.set(K.user(uid), JSON.stringify(updated));
  return json(res, 200, { ok: true });
}

async function users_search(req, res, body) {
  const uid = getUid(req);
  if (!uid) return json(res, 401, { error: "unauthorized" });

  const q = String(body.q || "").trim().toLowerCase();
  if (!q) return json(res, 200, { users: [] });

  const candidates = await redis.zrange("usernames", 0, 800);
  const matched = candidates.filter(u => String(u).startsWith(q)).slice(0, 15);

  const users = [];
  for (const uname of matched) {
    const id = await redis.get(K.userByUsername(uname));
    if (!id) continue;
    const u = safeParse(await redis.get(K.user(id)));
    if (!u) continue;
    users.push({
      id: u.id,
      username: u.username,
      display_name: u.display_name || u.username,
      avatar_url: u.avatar_url || ""
    });
  }

  return json(res, 200, { users });
}

async function chats_start_dm(req, res, body) {
  const uid = getUid(req);
  if (!uid) return json(res, 401, { error: "unauthorized" });

  const username = String(body.username || "").trim().toLowerCase();
  if (!username) return json(res, 400, { error: "bad_request" });

  const otherId = await redis.get(K.userByUsername(username));
  if (!otherId) return json(res, 404, { error: "username_not_found" });
  if (String(otherId) === String(uid)) return json(res, 400, { error: "bad_request" });

  const other = safeParse(await redis.get(K.user(otherId)));
  if (!other) return json(res, 404, { error: "username_not_found" });

  const chatId = dmId(uid, otherId);
  const chatKey = `chat:${chatId}`;
  const existed = await redis.get(chatKey);

  if (!other.allow_dm && !existed) return json(res, 403, { error: "dm_not_allowed" });

  if (!existed) {
    const chat = { id: chatId, type: "dm", members: [String(uid), String(otherId)], created_at: Date.now() };
    await redis.set(chatKey, JSON.stringify(chat));
  }

  await moveChatToTop(`u:${uid}:chats`, chatId);
  await moveChatToTop(`u:${otherId}:chats`, chatId);

  return json(res, 200, { chat_id: chatId });
}

async function chats_list(req, res) {
  const uid = getUid(req);
  if (!uid) return json(res, 401, { error: "unauthorized" });

  const ids = (await redis.lrange(`u:${uid}:chats`, 0, 80)) || [];
  const out = [];

  for (const id of ids) {
    const chat = safeParse(await redis.get(`chat:${id}`));
    if (!chat) continue;
    if (!chat.members?.includes(String(uid))) continue;

    const last = safeParse(await redis.get(`chat:${id}:last`));
    const unread = Number(await redis.get(`u:${uid}:unread:${id}`) || 0);

    let title = "Чат";
    let peer = null;

    if (chat.type === "dm") {
      const pid = String(chat.members[0]) === String(uid) ? String(chat.members[1]) : String(chat.members[0]);
      const u = safeParse(await redis.get(K.user(pid)));
      if (u) {
        title = u.display_name || u.username;
        peer = { username: u.username, display_name: u.display_name || u.username, avatar_url: u.avatar_url || "" };
      }
    }

    out.push({
      id,
      type: chat.type,
      title,
      peer,
      last_text: last?.text ? String(last.text).slice(0, 70) : "",
      last_time: last?.ts ? new Date(last.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
      unread: unread > 0 ? unread : 0
    });
  }

  return json(res, 200, { chats: out });
}

async function messages_list(req, res, body) {
  const uid = getUid(req);
  if (!uid) return json(res, 401, { error: "unauthorized" });

  const chat_id = String(body.chat_id || "");
  if (!chat_id) return json(res, 400, { error: "bad_request" });

  const chat = safeParse(await redis.get(`chat:${chat_id}`));
  if (!chat) return json(res, 404, { error: "not_found" });
  if (!chat.members?.includes(String(uid))) return json(res, 403, { error: "forbidden" });

  const raw = (await redis.lrange(`chat:${chat_id}:msgs`, 0, 120)) || [];
  const msgs = raw.map(safeParse).filter(Boolean).reverse();

  return json(res, 200, {
    messages: msgs.map(m => ({
      text: m.text,
      ts: m.ts,
      is_me: String(m.from_uid) === String(uid),
    }))
  });
}

async function messages_send(req, res, body) {
  const uid = getUid(req);
  if (!uid) return json(res, 401, { error: "unauthorized" });

  const chat_id = String(body.chat_id || "");
  const text = String(body.text || "").trim();
  if (!chat_id || !text) return json(res, 400, { error: "bad_request" });

  const chat = safeParse(await redis.get(`chat:${chat_id}`));
  if (!chat) return json(res, 404, { error: "not_found" });
  if (!chat.members?.includes(String(uid))) return json(res, 403, { error: "forbidden" });

  const msg = { from_uid: String(uid), text: text.slice(0, 4000), ts: Date.now() };

  await redis.lpush(`chat:${chat_id}:msgs`, JSON.stringify(msg));
  await redis.ltrim(`chat:${chat_id}:msgs`, 0, 600);
  await redis.set(`chat:${chat_id}:last`, JSON.stringify(msg));

  const [a,b] = chat.members;
  await moveChatToTop(`u:${a}:chats`, chat_id);
  await moveChatToTop(`u:${b}:chats`, chat_id);

  const other = String(a) === String(uid) ? String(b) : String(a);
  await redis.incr(`u:${other}:unread:${chat_id}`);

  return json(res, 200, { ok: true });
}

async function messages_mark_read(req, res, body) {
  const uid = getUid(req);
  if (!uid) return json(res, 401, { error: "unauthorized" });

  const chat_id = String(body.chat_id || "");
  if (!chat_id) return json(res, 400, { error: "bad_request" });

  const chat = safeParse(await redis.get(`chat:${chat_id}`));
  if (!chat) return json(res, 404, { error: "not_found" });
  if (!chat.members?.includes(String(uid))) return json(res, 403, { error: "forbidden" });

  await redis.set(`u:${uid}:unread:${chat_id}`, "0");
  return json(res, 200, { ok: true });
}

async function posts_create(req, res, body) {
  const uid = getUid(req);
  if (!uid) return json(res, 401, { error: "unauthorized" });

  const text = String(body.text || "").trim();
  if (!text) return json(res, 400, { error: "bad_request" });

  const id = crypto.randomBytes(10).toString("hex");
  const post = { id, author_uid: String(uid), text: text.slice(0, 6000), ts: Date.now() };

  await redis.set(`post:${id}`, JSON.stringify(post));
  await redis.zadd("posts", { score: post.ts, member: id });

  return json(res, 200, { ok: true, id });
}

async function posts_list(req, res) {
  const uid = getUid(req);
  if (!uid) return json(res, 401, { error: "unauthorized" });

  const ids = await redis.zrevrange("posts", 0, 30);
  const posts = [];

  for (const id of ids) {
    const post = safeParse(await redis.get(`post:${id}`));
    if (!post) continue;

    const author = safeParse(await redis.get(K.user(post.author_uid)));
    const likes = Number(await redis.scard(`post:${id}:likes`) || 0);
    const liked = !!(await redis.sismember(`post:${id}:likes`, String(uid)));

    posts.push({
      id: post.id,
      text: post.text,
      ts: post.ts,
      likes,
      liked,
      author: author ? {
        username: author.username,
        display_name: author.display_name || author.username,
        avatar_url: author.avatar_url || ""
      } : { username: "unknown", display_name: "Unknown", avatar_url: "" }
    });
  }

  return json(res, 200, { posts, cursor: null });
}

async function posts_like(req, res, body) {
  const uid = getUid(req);
  if (!uid) return json(res, 401, { error: "unauthorized" });

  const post_id = String(body.post_id || "");
  if (!post_id) return json(res, 400, { error: "bad_request" });

  const key = `post:${post_id}:likes`;
  const has = await redis.sismember(key, String(uid));
  if (has) await redis.srem(key, String(uid));
  else await redis.sadd(key, String(uid));

  return json(res, 200, { ok: true });
}

const ROUTES = {
  auth_request_code,
  auth_signup,
  auth_login,

  profile_get,
  profile_update,

  users_search,

  chats_list,
  chats_start_dm,

  messages_list,
  messages_send,
  messages_mark_read,

  posts_create,
  posts_list,
  posts_like,
};

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "method_not_allowed" });

  const url = new URL(req.url, `http://${req.headers.host}`);
  const m = url.searchParams.get("m") || "";
  const fn = ROUTES[m];
  if (!fn) return json(res, 404, { error: "unknown_method" });

  const body = await readBody(req);
  try {
    return await fn(req, res, body);
  } catch (e) {
    console.error("API error", m, e);
    return json(res, 500, { error: "server_error" });
  }
}
