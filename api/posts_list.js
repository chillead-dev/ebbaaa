import { redis } from "./_lib/redis.js";
import { json, readBody } from "./_lib/util.js";
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

  // cursor later; MVP: latest 30
  const ids = await redis.zrevrange("posts", 0, 30);
  const posts = [];

  for (const id of ids){
    const post = safeParse(await redis.get(`post:${id}`));
    if (!post) continue;

    const author = safeParse(await redis.get(K.user(post.author_uid)));
    const likes = await redis.scard(`post:${id}:likes`);
    const liked = await redis.sismember(`post:${id}:likes`, String(uid));

    posts.push({
      id: post.id,
      text: post.text,
      ts: post.ts,
      likes: Number(likes || 0),
      liked: !!liked,
      author: author ? {
        username: author.username,
        display_name: author.display_name || author.username,
        avatar_url: author.avatar_url || ""
      } : { username:"unknown", display_name:"Unknown", avatar_url:"" }
    });
  }

  return json(res, 200, { posts, cursor: null });
}
