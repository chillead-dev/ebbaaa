import { redis } from "./_lib/redis.js";
import { json, readBody } from "./_lib/util.js";
import { getUserId } from "./_lib/reqauth.js";

export default async function handler(req,res){
  if (req.method !== "POST") return json(res, 405, { error:"method_not_allowed" });
  const uid = getUserId(req);
  if (!uid) return json(res, 401, { error:"unauthorized" });

  const body = await readBody(req);
  const post_id = String(body.post_id || "");
  if (!post_id) return json(res, 400, { error:"bad_request" });

  const key = `post:${post_id}:likes`;
  const has = await redis.sismember(key, String(uid));
  if (has) await redis.srem(key, String(uid));
  else await redis.sadd(key, String(uid));

  return json(res, 200, { ok:true });
}
