import { redis } from "./_lib/redis.js";
import { json, readBody } from "./_lib/util.js";
import { getUserId } from "./_lib/reqauth.js";
import { K } from "./_lib/schema.js";

export default async function handler(req,res){
  if (req.method !== "POST") return json(res, 405, { error:"method_not_allowed" });
  const uid = getUserId(req);
  if (!uid) return json(res, 401, { error:"unauthorized" });

  const body = await readBody(req);
  const q = String(body.q || "").trim().toLowerCase();
  if (!q) return json(res, 200, { users: [] });

  // берём пачку usernames и фильтруем по префиксу (для MVP нормально)
  const candidates = await redis.zrange("usernames", 0, 500);
  const matched = candidates
    .filter(u => String(u).startsWith(q))
    .slice(0, 15);

  const users = [];
  for (const uname of matched){
    const id = await redis.get(K.userByUsername(uname));
    if (!id) continue;
    const raw = await redis.get(K.user(id));
    let u = null;
    try{ u = typeof raw === "string" ? JSON.parse(raw) : raw; }catch{ u = null; }
    if (!u) continue;

    users.push({
      id: u.id,
      username: u.username,
      display_name: u.display_name || u.username,
      avatar_url: u.avatar_url || "",
    });
  }

  return json(res, 200, { users });
}
