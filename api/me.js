import { redis } from "./_lib/redis.js";
import { json } from "./_lib/util.js";
import { getUserIdFromReq } from "./_lib/auth.js";
import { K } from "./_lib/schema.js";

export default async function handler(req, res) {
  const userId = getUserIdFromReq(req);
  if (!userId) return json(res, 401, { error: "unauthorized" });

  const raw = await redis.get(K.user(userId));
  if (!raw) return json(res, 404, { error: "not_found" });

  const u = JSON.parse(raw);
  return json(res, 200, {
    id: u.id,
    email: u.email,
    username: u.username,
    display_name: u.display_name,
    avatar_url: u.avatar_url,
    allow_dm: !!u.allow_dm
  });
}
