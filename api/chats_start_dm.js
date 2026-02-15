import { redis } from "./_lib/redis.js";
import { json, readBody } from "./_lib/util.js";
import { getUserId } from "./_lib/reqauth.js";
import { K } from "./_lib/schema.js";

function dmId(a,b){
  const [x,y] = [String(a), String(b)].sort();
  return `dm:${x}:${y}`;
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
  const username = String(body.username || "").trim().toLowerCase();
  if (!username) return json(res, 400, { error:"bad_request" });

  const otherId = await redis.get(K.userByUsername(username));
  if (!otherId) return json(res, 404, { error:"username_not_found" });
  if (String(otherId) === String(uid)) return json(res, 400, { error:"bad_request" });

  // check other allow_dm
  const otherRaw = await redis.get(K.user(otherId));
  let other = null;
  try{ other = typeof otherRaw === "string" ? JSON.parse(otherRaw) : otherRaw; }catch{ other = null; }
  if (!other) return json(res, 404, { error:"username_not_found" });

  // allow_dm: if 0 then only allow if already has chat
  const chatId = dmId(uid, otherId);
  const chatKey = `chat:${chatId}`;
  const existed = await redis.get(chatKey);

  if (!other.allow_dm && !existed) return json(res, 403, { error:"dm_not_allowed" });

  if (!existed){
    const chat = { id: chatId, type:"dm", members:[String(uid), String(otherId)], created_at: Date.now() };
    await redis.set(chatKey, JSON.stringify(chat));
  }

  // put into both users chat lists
  await moveChatToTop(`u:${uid}:chats`, chatId);
  await moveChatToTop(`u:${otherId}:chats`, chatId);

  return json(res, 200, { chat_id: chatId });
}
