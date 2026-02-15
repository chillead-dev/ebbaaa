import { redis } from "./_lib/redis.js";
import { json, readBody } from "./_lib/util.js";
import { getUserIdFromReq } from "./_lib/auth.js";
import { K } from "./_lib/schema.js";
import { nanoid } from "nanoid";

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "method_not_allowed" });

  const userId = getUserIdFromReq(req);
  if (!userId) return json(res, 401, { error: "unauthorized" });

  const body = await readBody(req);
  const text = String(body.text || "").trim();
  if (!text) return json(res, 400, { error: "empty" });

  const uraw = await redis.get(K.user(userId));
  if (!uraw) return json(res, 404, { error: "user_not_found" });
  const u = JSON.parse(uraw);

  const id = nanoid();
  const post = {
    id,
    user_id: userId,
    text,
    created_at: Date.now(),
    username: u.username,
    display_name: u.display_name,
    avatar_url: u.avatar_url
  };

  await redis.set(K.post(id), JSON.stringify(post));
  await redis.zadd(K.postsZ, { score: post.created_at, member: id });

  return json(res, 200, { ok: true, id });
}
