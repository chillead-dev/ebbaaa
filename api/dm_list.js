import { redis } from "./_lib/redis.js";
import { json } from "./_lib/util.js";
import { getUserIdFromReq } from "./_lib/auth.js";
import { K } from "./_lib/schema.js";
import { decryptText } from "./_lib/crypto.js";

export default async function handler(req, res) {
  const userId = getUserIdFromReq(req);
  if (!userId) return json(res, 401, { error: "unauthorized" });

  const url = new URL(req.url, "http://localhost");
  const chatId = String(url.searchParams.get("chatId") || "");
  const afterTs = Number(url.searchParams.get("afterTs") || "0");

  if (!chatId) return json(res, 400, { error: "bad_request" });

  // check access: user is in chatId (format chat_<a>_<b>)
  if (!chatId.includes(userId)) return json(res, 403, { error: "forbidden" });

  const rawList = await redis.lrange(K.chatMsgs(chatId), -200, -1);
  const out = [];

  for (const raw of rawList || []) {
    const m = JSON.parse(raw);
    if (m.ts <= afterTs) continue;
    out.push({
      id: m.id,
      chatId: m.chatId,
      from: m.from,
      to: m.to,
      ts: m.ts,
      text: decryptText(m.ciphertext)
    });
  }

  return json(res, 200, out);
}
