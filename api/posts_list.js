import { redis } from "./_lib/redis.js";
import { json } from "./_lib/util.js";
import { getUserIdFromReq } from "./_lib/auth.js";
import { K } from "./_lib/schema.js";

export default async function handler(req, res) {
  const userId = getUserIdFromReq(req);
  if (!userId) return json(res, 401, { error: "unauthorized" });

  const ids = await redis.zrange(K.postsZ, 0, 49, { rev: true });
  const out = [];

  for (const id of ids || []) {
    const raw = await redis.get(K.post(id));
    if (!raw) continue;
    out.push(JSON.parse(raw));
  }

  return json(res, 200, out);
}
