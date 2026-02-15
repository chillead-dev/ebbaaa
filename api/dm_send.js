import { redis } from "./_lib/redis.js";
import { json, readBody } from "./_lib/util.js";
import { getUserIdFromReq } from "./_lib/auth.js";
import { K } from "./_lib/schema.js";
import { nanoid } from "nanoid";
import { encryptText } from "./_lib/crypto.js";

function pairChatId(a, b) {
  const [x, y] = a < b ? [a, b] : [b, a];
  return `chat_${x}_${y}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "method_not_allowed" });

  const from = getUserIdFromReq(req);
  if (!from) return json(res, 401, { error: "unauthorized" });

  const body = await readBody(req);
  const to = String(body.toUserId || "");
  const text = String(body.text || "").trim();
  if (!to || !text) return json(res, 400, { error: "bad_request" });
  if (to === from) return json(res, 400, { error: "cannot_dm_self" });

  const toRaw = await redis.get(K.user(to));
  if (!toRaw) return json(res, 404, { error: "user_not_found" });
  const toUser = JSON.parse(toRaw);
  if (!toUser.allow_dm) return json(res, 403, { error: "dm_disabled" });

  const fromRaw = await redis.get(K.user(from));
  if (!fromRaw) return json(res, 404, { error: "user_not_found" });
  const fromUser = JSON.parse(fromRaw);

  const chatId = pairChatId(from, to);

  // create chat meta if missing
  const chatRaw = await redis.get(K.chat(chatId));
  if (!chatRaw) {
    const chat = {
      id: chatId,
      a_id: (from < to ? from : to),
      b_id: (from < to ? to : from),
      title: "",
      last_ts: 0,
      // для UI: peer info будет вычисляться на клиенте по a_id/b_id
      created_at: Date.now()
    };
    await redis.set(K.chat(chatId), JSON.stringify(chat));
  }

  const msg = {
    id: nanoid(),
    chatId,
    from,
    to,
    ts: Date.now(),
    ciphertext: encryptText(text)
  };

  // store message in list
  await redis.rpush(K.chatMsgs(chatId), JSON.stringify(msg));
  // limit list size
  await redis.ltrim(K.chatMsgs(chatId), -200, -1);

  // update chats ordering
  await redis.zadd(K.userChatsZ(from), { score: msg.ts, member: chatId });
  await redis.zadd(K.userChatsZ(to), { score: msg.ts, member: chatId });

  // update chat meta last_ts
  const metaRaw2 = await redis.get(K.chat(chatId));
  if (metaRaw2) {
    const meta = JSON.parse(metaRaw2);
    meta.last_ts = msg.ts;
    await redis.set(K.chat(chatId), JSON.stringify(meta));
  }

  // (polling) presence set for sender
  await redis.set(K.presence(from), String(Date.now()), { ex: 60 });

  // возвращаем plaintext отправителю (для UI)
  return json(res, 200, {
    ok: true,
    message: {
      id: msg.id,
      chatId,
      from,
      to,
      ts: msg.ts,
      text, // plaintext only in response
      from_username: fromUser.username,
      to_username: toUser.username
    }
  });
}
