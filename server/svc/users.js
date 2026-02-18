import { redis } from "../db/redis.js";
import { json } from "../utils/http.js";
import { getUid } from "../utils/jwt.js";
import { safeParse } from "../utils/parse.js";
import { K } from "../utils/keys.js";

function statusText(u, isOnline){
  if(!u?.show_status) return "";
  if(isOnline) return "в сети";
  const ls = Number(u.last_seen||0);
  if(!ls) return "был(а) недавно";
  const diff = Date.now() - ls;
  if(diff < 60*1000) return "был(а) только что";
  if(diff < 10*60*1000) return "был(а) недавно";
  if(diff < 60*60*1000) return "был(а) в течение часа";
  try{
    const d = new Date(ls);
    return "был(а) " + d.toLocaleString([], {day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit"});
  }catch{
    return "был(а) давно";
  }
}

export async function search(req,res,body){
  const uid=getUid(req); if(!uid) return json(res,401,{error:"unauthorized"});
  const q=String(body.q||"").trim().toLowerCase();
  if(!q) return json(res,200,{users:[]});

  const candidates=await redis.zrange("usernames",0,1200);
  const matched=candidates.filter(u=>String(u).startsWith(q)).slice(0,20);

  const users=[];
  for(const uname of matched){
    const id=await redis.get(K.userByUsername(uname));
    if(!id) continue;
    const u=safeParse(await redis.get(K.user(id)));
    if(!u) continue;
    const online=!!(await redis.get(K.presence(id)));
    users.push({
      id:u.id,
      username:u.username,
      display_name:u.display_name||u.username,
      avatar:u.avatar||"",
      avatar_url:u.avatar_url||"",
      online,
      status_text: statusText(u, online),
    });
  }
  return json(res,200,{users});
}

export async function getUser(req,res,body){
  const uid=getUid(req); if(!uid) return json(res,401,{error:"unauthorized"});
  const username=String(body.username||"").trim().toLowerCase();
  if(!username) return json(res,400,{error:"bad_request"});

  const id=await redis.get(K.userByUsername(username));
  if(!id) return json(res,404,{error:"username_not_found"});
  const u=safeParse(await redis.get(K.user(id)));
  if(!u) return json(res,404,{error:"username_not_found"});

  const online=!!(await redis.get(K.presence(id)));
  const pub={
    id:u.id,
    username:u.username,
    display_name:u.display_name||u.username,
    bio:u.bio||"",
    avatar:u.avatar||"",
    avatar_url:u.avatar_url||"",
    online,
    status_text: statusText(u, online),
  };
  return json(res,200,{user:pub});
}
