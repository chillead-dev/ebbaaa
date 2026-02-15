import { redis } from "./_lib/redis.js";
import { json, readBody } from "./_lib/util.js";
import { getUserId } from "./_lib/reqauth.js";

function safeParse(x){
  if (!x) return null;
  if (typeof x === "object") return x;
  try{ return JSON.parse(x); }catch{ return null; }
}

async function moveChatToTop(listKey, chatId){
  await redis.lrem(listKey, 0, chatId);
  await redis.lpush(listKey, chatId);
  await redis.ltrim(listKey, 0, 200);
}

export default async function handler(req,res){
  if (req.method !== "POST") return json(res, 405, { error:"method_not_allowed" });

  const uid = getUserId(req);
  if (!uid) return json(res, 401, { error:"unauthorized" });

  const body = await readBody(req);
  const chat_id = String(body.chat_id || "");
  const text = String(body.text || "").trim();
  if (!chat_id || !text) return json(res, 400, { error:"bad_request" });

  const chat = safeParse(await redis.get(`chat:${chat_id}`));
  if (!chat) return json(res, 404, { error:"not_found" });
  if (!chat.members?.includes(String(uid))) return json(res, 403, { error:"forbidden" });

  const msg = { from_uid: String(uid), text: text.slice(0, 4000), ts: Date.now() };

  await redis.lpush(`chat:${chat_id}:msgs`, JSON.stringify(msg));
  await redis.ltrim(`chat:${chat_id}:msgs`, 0, 600);

  await redis.set(`chat:${chat_id}:last`, JSON.stringify(msg));

  // move chat to top for both users
  const [a,b] = chat.members;
  await moveChatToTop(`u:${a}:chats`, chat_id);
  await moveChatToTop(`u:${b}:chats`, chat_id);

  // unread for the other user
  const other = String(a) === String(uid) ? String(b) : String(a);
  await redis.incr(`u:${other}:unread:${chat_id}`);

  return json(res, 200, { ok:true });
}
