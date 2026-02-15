import { redis } from "./_lib/redis.js";
import { json, readBody } from "./_lib/util.js";
import { getUserId } from "./_lib/reqauth.js";
import { nanoid } from "nanoid";

export default async function handler(req,res){
  if (req.method !== "POST") return json(res, 405, { error:"method_not_allowed" });
  const uid = getUserId(req);
  if (!uid) return json(res, 401, { error:"unauthorized" });

  const body = await readBody(req);
  const text = String(body.text || "").trim();
  if (!text) return json(res, 400, { error:"bad_request" });

  const id = nanoid();
  const post = { id, author_uid: String(uid), text: text.slice(0, 6000), ts: Date.now() };

  await redis.set(`post:${id}`, JSON.stringify(post));
  await redis.zadd("posts", { score: post.ts, member: id });

  return json(res, 200, { ok:true, id });
}
