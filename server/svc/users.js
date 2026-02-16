import { redis } from "../db/redis.js";
import { json } from "../utils/http.js";
import { getUid } from "../utils/jwt.js";
import { safeParse } from "../utils/parse.js";
import { K } from "../utils/keys.js";

export async function search(req,res,body){
  const uid=getUid(req); if(!uid) return json(res,401,{error:"unauthorized"});
  const q=String(body.q||"").trim().toLowerCase();
  if(!q) return json(res,200,{users:[]});

  const candidates=await redis.zrange("usernames",0,800);
  const matched=candidates.filter(u=>String(u).startsWith(q)).slice(0,15);

  const users=[];
  for(const uname of matched){
    const id=await redis.get(K.userByUsername(uname));
    if(!id) continue;
    const u=safeParse(await redis.get(K.user(id)));
    if(!u) continue;
    users.push({id:u.id,username:u.username,display_name:u.display_name||u.username,avatar_url:u.avatar_url||""});
  }
  return json(res,200,{users});
}
