import { redis } from "../db/redis.js";
import { json } from "../utils/http.js";
import { getUid } from "../utils/jwt.js";
import { safeParse } from "../utils/parse.js";
import { K } from "../utils/keys.js";
import { randId } from "../utils/crypto.js";

export async function create(req,res,body){
  const uid=getUid(req); if(!uid) return json(res,401,{error:"unauthorized"});
  const text=String(body.text||"").trim(); if(!text) return json(res,400,{error:"bad_request"});
  const id=randId(10); const post={id,author_uid:String(uid),text:text.slice(0,6000),ts:Date.now()};
  await redis.set(K.post(id),JSON.stringify(post));
  await redis.zadd("posts",{score:post.ts,member:id});
  return json(res,200,{ok:true,id});
}

export async function list(req,res){
  const uid=getUid(req); if(!uid) return json(res,401,{error:"unauthorized"});
  const ids=await redis.zrevrange("posts",0,30);
  const posts=[];
  for(const id of ids){
    const post=safeParse(await redis.get(K.post(id))); if(!post) continue;
    const author=safeParse(await redis.get(K.user(post.author_uid)));
    const likes=Number(await redis.scard(K.postLikes(id))||0);
    const liked=!!(await redis.sismember(K.postLikes(id),String(uid)));
    posts.push({id:post.id,text:post.text,ts:post.ts,likes,liked,author: author?{username:author.username,display_name:author.display_name||author.username,avatar_url:author.avatar_url||""}:{username:"unknown",display_name:"Unknown",avatar_url:""}});
  }
  return json(res,200,{posts});
}

export async function likeToggle(req,res,body){
  const uid=getUid(req); if(!uid) return json(res,401,{error:"unauthorized"});
  const postId=String(body.post_id||""); if(!postId) return json(res,400,{error:"bad_request"});
  const key=K.postLikes(postId);
  const has=await redis.sismember(key,String(uid));
  if(has) await redis.srem(key,String(uid)); else await redis.sadd(key,String(uid));
  return json(res,200,{ok:true});
}
