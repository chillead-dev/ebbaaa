import { redis } from "./_lib/redis.js";
import { json } from "./_lib/util.js";
import { getUserIdFromReq } from "./_lib/auth.js";
import { K } from "./_lib/schema.js";

export default async function handler(req, res) {
  const userId = getUserIdFromReq(req);
  if (!userId) return json(res, 401, { error: "unauthorized" });

  const url = new URL(req.url, "http://localhost");
  const q = String(url.searchParams.get("q") || "").trim().toLowerCase();
  if (!q) return json(res, 200, []);

  // 1) попытка точного username
  const exactId = await redis.get(K.userByUsername(q));
  if (exactId) {
    const raw = await redis.get(K.user(exactId));
    if (!raw) return json(res, 200, []);
    const u = JSON.parse(raw);
    return json(res, 200, [{
      id: u.id, username: u.username, display_name: u.display_name, avatar_url: u.avatar_url
    }]);
  }

  // 2) prefix поиск через ZRANGEBYLEX по общему zset usernames
  // Мы поддерживаем zset "usernames" с member=username, score=0
  // (пополняется при signup)
  const start = `[${q}`;
  const end = `[${q}\xff`;
  const list = await redis.zrangebylex("usernames", start, end, { limit: { offset: 0, count: 10 } });

  const out = [];
  for (const name of list || []) {
    const id = await redis.get(K.userByUsername(name));
    if (!id) continue;
    const raw = await redis.get(K.user(id));
    if (!raw) continue;
    const u = JSON.parse(raw);
    out.push({ id: u.id, username: u.username, display_name: u.display_name, avatar_url: u.avatar_url });
  }
  return json(res, 200, out);
}
