import { redis } from "./_lib/redis.js";
import { json } from "./_lib/util.js";
import { getUserId } from "./_lib/reqauth.js";
import { K } from "./_lib/schema.js";

function safeParse(x){
  if (!x) return null;
  if (typeof x === "object") return x;
  try{ return JSON.parse(x); }catch{ return null; }
}

export default async function handler(req,res){
  if (req.method !== "POST") return json(res, 405, { error:"method_not_allowed" });
  const uid = getUserId(req);
  if (!uid) return json(res, 401, { error:"unauthorized" });

  const me = safeParse(await redis.get(K.user(uid)));
  if (!me) return json(res, 401, { error:"unauthorized" });

  // ограничим поля
  return json(res, 200, {
    me: {
      id: me.id,
      email: me.email,
      username: me.username,
      display_name: me.display_name || me.username,
      bio: me.bio || "",
      avatar_url: me.avatar_url || "",
      allow_dm: me.allow_dm ? 1 : 0,
    }
  });
}
