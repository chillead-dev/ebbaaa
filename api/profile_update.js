import { redis } from "./_lib/redis.js";
import { json, readBody, normalizeUsername } from "./_lib/util.js";
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

  const body = await readBody(req);
  const me = safeParse(await redis.get(K.user(uid)));
  if (!me) return json(res, 401, { error:"unauthorized" });

  // patch
  const display_name = (body.display_name !== undefined) ? String(body.display_name || "").trim().slice(0, 32) : me.display_name;
  const bio = (body.bio !== undefined) ? String(body.bio || "").trim().slice(0, 120) : (me.bio || "");
  const avatar_url = (body.avatar_url !== undefined) ? String(body.avatar_url || "").trim().slice(0, 500) : (me.avatar_url || "");
  const allow_dm = (body.allow_dm !== undefined) ? (Number(body.allow_dm) ? 1 : 0) : (me.allow_dm ? 1 : 0);

  let username = me.username;
  if (body.username !== undefined){
    const next = normalizeUsername(String(body.username || ""));
    if (!/^[a-z0-9_]{3,20}$/.test(next)) return json(res, 400, { error:"username_invalid" });

    if (next !== me.username){
      const existed = await redis.get(K.userByUsername(next));
      if (existed) return json(res, 400, { error:"username_taken" });

      // move mapping
      await redis.del(K.userByUsername(me.username));
      await redis.set(K.userByUsername(next), String(uid));
      // add to zset for search
      await redis.zadd("usernames", { score: 0, member: next });
      username = next;
    }
  }

  const updated = {
    ...me,
    username,
    display_name: display_name || username,
    bio,
    avatar_url,
    allow_dm
  };

  await redis.set(K.user(uid), JSON.stringify(updated));
  return json(res, 200, { ok:true });
}
