import { redis } from "../db/redis.js";
import { json } from "../utils/http.js";
import { safeParse } from "../utils/parse.js";
import { K } from "../utils/keys.js";

function okPass(body){
  const pass = String(body.admin_password||"");
  const env = process.env.ADMIN_PASSWORD || "Admin123";
  return pass && pass === env;
}

function strip(u){
  // If blocked -> represent as deleted labels
  const blocked = !!u.blocked;
  return {
    id:u.id,
    email:u.email,
    username:u.username,
    display_name: blocked ? "Deleted Account" : (u.display_name||u.username),
    avatar_url: blocked ? "" : (u.avatar_url||""),
    verified: u.verified?1:0,
    blocked: blocked?1:0,
    last_seen: u.last_seen||0,
  };
}

export async function stats(req,res,body){
  if(!okPass(body)) return json(res,401,{error:"unauthorized"});
  const ids = await redis.zrange("users", 0, 5000);
  let total = ids.length;
  let blocked = 0;
  let online = 0;
  const now = Date.now();
  for(const id of ids){
    const u = safeParse(await redis.get(K.user(id)));
    if(!u) continue;
    if(u.blocked) blocked++;
    if(u.last_seen && (now - u.last_seen) <= 5*60*1000) online++;
  }
  return json(res,200,{total,online,blocked});
}

export async function users(req,res,body){
  if(!okPass(body)) return json(res,401,{error:"unauthorized"});
  const ids = await redis.zrange("users", 0, 5000);
  const out=[];
  for(const id of ids){
    const u = safeParse(await redis.get(K.user(id)));
    if(!u) continue;
    out.push(strip(u));
  }
  // newest first by created_at
  out.sort((a,b)=>(b.last_seen||0)-(a.last_seen||0));
  return json(res,200,{users:out});
}

export async function toggleVerify(req,res,body){
  if(!okPass(body)) return json(res,401,{error:"unauthorized"});
  const uid = String(body.user_id||"");
  const u = safeParse(await redis.get(K.user(uid)));
  if(!u) return json(res,404,{error:"not_found"});
  u.verified = u.verified ? 0 : 1;
  await redis.set(K.user(uid), JSON.stringify(u));
  return json(res,200,{ok:true,verified:u.verified?1:0});
}

export async function blockUser(req,res,body){
  if(!okPass(body)) return json(res,401,{error:"unauthorized"});
  const uid = String(body.user_id||"");
  const u = safeParse(await redis.get(K.user(uid)));
  if(!u) return json(res,404,{error:"not_found"});
  u.blocked = u.blocked ? 0 : 1;
  await redis.set(K.user(uid), JSON.stringify(u));
  return json(res,200,{ok:true,blocked:u.blocked?1:0});
}
