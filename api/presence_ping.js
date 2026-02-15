import { redis } from "./_lib/redis.js";
import { json } from "./_lib/util.js";
import { getUserIdFromReq } from "./_lib/auth.js";
import { K } from "./_lib/schema.js";

export default async function handler(req, res) {
  const userId = getUserIdFromReq(req);
  if (!userId) return json(res, 401, { error: "unauthorized" });

  await redis.set(K.presence(userId), String(Date.now()), { ex: 60 });
  return json(res, 200, { ok: true });
}
