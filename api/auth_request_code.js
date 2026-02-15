import { redis } from "./_lib/redis.js";
import { json, readBody, isGmail } from "./_lib/util.js";
import { sendVerifyCodeEmail } from "./_lib/mail.js";
import { K } from "./_lib/schema.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "method_not_allowed" });

  const body = await readBody(req);
  const email = String(body.email || "").trim().toLowerCase();
  if (!email || !isGmail(email)) return json(res, 400, { error: "gmail_only" });

  // простейший anti-spam: 1 запрос в 20 сек на email
  const rlKey = `rl:code:${email}`;
  const can = await redis.set(rlKey, "1", { nx: true, ex: 20 });
  if (!can) return json(res, 429, { error: "too_fast" });

  const code = String(Math.floor(100000 + Math.random() * 900000));
  await redis.set(K.code(email), JSON.stringify({ code }), { ex: 600 }); // 10 мин

  await sendVerifyCodeEmail({ to: email, code });
  return json(res, 200, { ok: true });
}
