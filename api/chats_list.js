import { redis } from "./_lib/redis.js";
import { json } from "./_lib/util.js";
import { getUserId } from "./_lib/reqauth.js";
import { K } from "./_lib/schema.js";

function safeParse(x){
  if (!x) return null;
  if (typeof x === "object") return x;
  try{ return JSON.parse(x); }catch{ return null; }
}

function dmPeerId(chat, myId){
  const m = chat?.members || [];
  return String(m[0]) === String(myId) ? String(m[1]) : String(m[0]);
}

export default async function handler(req,res){
  if (req.method !== "POST") return json(res, 405, { error:"method_not_allowed" });
  const uid = getUserId(req);
  if (!uid) return json(res, 401, { error:"unauthorized" });

  const listKey = `u:${uid}:chats`;
  const ids = (await redis.lrange(listKey, 0, 80)) || [];

  const out = [];
  for (const id of ids){
    const chat = safeParse(await redis.get(`chat:${id}`));
    if (!chat) continue;

    const last = safeParse(await redis.get(`chat:${id}:last`));
    const unread = Number(await redis.get(`u:${uid}:unread:${id}`) || 0);

    let title = "Чат";
    let peer = null;

    if (chat.type === "dm"){
      const pid = dmPeerId(chat, uid);
      const raw = await redis.get(K.user(pid));
      const u = safeParse(raw);
      if (u){
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
      last_time: last?.ts ? new Date(last.ts).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"}) : "",
      unread: unread > 0 ? unread : 0,
    });
  }

  return json(res, 200, { chats: out });
}
