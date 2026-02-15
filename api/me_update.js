import { redis } from "./_lib/redis.js";
import { json, readBody, normalizeUsername } from "./_lib/util.js";
import { getUserIdFromReq } from "./_lib/auth.js";
import { K } from "./_lib/schema.js";

export default async function handler(req, res) {
  if (req.method !== "PATCH") return json(res, 405, { error: "method_not_allowed" });

  const userId = getUserIdFromReq(req);
  if (!userId) return json(res, 401, { error: "unauthorized" });

  const body = await readBody(req);
  const raw = await redis.get(K.user(userId));
  if (!raw) return json(res, 404, { error: "not_found" });

  const u = JSON.parse(raw);

  let newUsername = body.username !== undefined ? normalizeUsername(body.username) : null;
  let displayName = body.display_name !== undefined ? String(body.display_name || "").trim() : null;
  let avatarUrl = body.avatar_url !== undefined ? String(body.avatar_url || "").trim() : null;
  let allowDm = body.allow_dm !== undefined ? (body.allow_dm ? 1 : 0) : null;

  if (newUsername && !/^[a-z0-9_]{3,20}$/.test(newUsername)) {
    return json(res, 400, { error: "username_invalid" });
  }

  // username change: update mapping
  if (newUsername && newUsername !== u.username) {
    const existed = await redis.get(K.userByUsername(newUsername));
    if (existed) return json(res, 400, { error: "username_taken" });

    // set new mapping, delete old mapping
    const ok = await redis.set(K.userByUsername(newUsername), userId, { nx: true });
    if (!ok) return json(res, 400, { error: "username_taken" });

    await redis.del(K.userByUsername(u.username));
    u.username = newUsername;
  }

  if (displayName !== null) u.display_name = displayName || u.username;
  if (avatarUrl !== null) u.avatar_url = avatarUrl;
  if (allowDm !== null) u.allow_dm = allowDm;

  await redis.set(K.user(userId), JSON.stringify(u));
  return json(res, 200, { ok: true });
}
