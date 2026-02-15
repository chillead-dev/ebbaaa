import { redis } from "./_lib/redis.js";
import { json, readBody } from "./_lib/util.js";
import { getUserId } from "./_lib/reqauth.js";

function safeParse(x){
  if (!x) return null;
  if (typeof x === "object") return x;
  try{ return JSON.parse(x); }catch{ return null; }
}

export default async function handler(req,res){
  if (req.method !== "POST") return json(res, 405, { error:"method_not_allowed" });

  const uid = getUserId(req);
  if (!uid) return json(res, 401, { error:"unauthorized" });

  const body = await readBody(req);
  const chat_id = String(body.chat_id || "");
  if (!chat_id) return json(res, 400, { error:"bad_request" });

  const chat = safeParse(await redis.get(`chat:${chat_id}`));
  if (!chat) return json(res, 404, { error:"not_found" });
  if (!chat.members?.includes(String(uid))) return json(res, 403, { error:"forbidden" });

  const raw = (await redis.lrange(`chat:${chat_id}:msgs`, 0, 120)) || [];
  const msgs = raw.map(x => safeParse(x)).filter(Boolean).reverse();

  const messages = msgs.map(m => ({
    text: m.text,
    ts: m.ts,
    is_me: String(m.from_uid) === String(uid),
  }));

  return json(res, 200, { messages });
}
