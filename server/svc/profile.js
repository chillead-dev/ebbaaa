import { redis } from "../db/redis.js";
import { json } from "../utils/http.js";
import { getUid } from "../utils/jwt.js";
import { safeParse } from "../utils/parse.js";
import { K } from "../utils/keys.js";
import { normalizeUsername } from "../utils/validate.js";

function strip(u){
  return {
    id:u.id,
    email:u.email,
    username:u.username,
    display_name:u.display_name||u.username,
    bio:u.bio||"",
    avatar:u.avatar||"",
    avatar_url:u.avatar_url||"",
    allow_dm:u.allow_dm?1:0,
    show_status:u.show_status?1:0,
    chat_theme:u.chat_theme||"default",
    custom_chat:u.custom_chat||null,
  };
}

export async function getMe(req,res){
  const uid=getUid(req); if(!uid) return json(res,401,{error:"unauthorized"});
  const u=safeParse(await redis.get(K.user(uid))); if(!u) return json(res,401,{error:"unauthorized"});
  return json(res,200,{me:strip(u)});
}

export async function updateMe(req,res,body){
  const uid=getUid(req); if(!uid) return json(res,401,{error:"unauthorized"});
  const u=safeParse(await redis.get(K.user(uid))); if(!u) return json(res,401,{error:"unauthorized"});

  let username=u.username;
  if(body.username!==undefined){
    const next=normalizeUsername(body.username);
    if(!/^[a-z0-9_]{3,20}$/.test(next)) return json(res,400,{error:"username_invalid"});
    if(next!==u.username){
      const existed=await redis.get(K.userByUsername(next));
      if(existed) return json(res,400,{error:"username_taken"});
      await redis.del(K.userByUsername(u.username));
      await redis.set(K.userByUsername(next),String(uid));
      await redis.zadd("usernames",{score:0,member:next});
      username=next;
    }
  }

  // avatar data URL (store small)
  let avatar=u.avatar||"";
  if(body.avatar_data!==undefined){
    const v=String(body.avatar_data||"").trim();
    if(v && !v.startsWith("data:image/")) return json(res,400,{error:"avatar_invalid"});
    if(v.length>260000) return json(res,400,{error:"avatar_too_large"});
    avatar=v;
  }

  const updated={
    ...u,
    username,
    display_name: body.display_name!==undefined ? String(body.display_name||"").trim().slice(0,32) : u.display_name,
    bio: body.bio!==undefined ? String(body.bio||"").trim().slice(0,240) : (u.bio||""),
    avatar,
    avatar_url: body.avatar_url!==undefined ? String(body.avatar_url||"").trim().slice(0,500) : (u.avatar_url||""),
    allow_dm: body.allow_dm!==undefined ? (Number(body.allow_dm)?1:0) : (u.allow_dm?1:0),
    show_status: body.show_status!==undefined ? (Number(body.show_status)?1:0) : (u.show_status?1:0),
    chat_theme: body.chat_theme!==undefined ? String(body.chat_theme||"default").slice(0,24) : (u.chat_theme||"default"),
    custom_chat: body.custom_chat!==undefined ? (body.custom_chat||null) : (u.custom_chat||null),
  };

  if(!updated.display_name) updated.display_name=updated.username;
  await redis.set(K.user(uid),JSON.stringify(updated));
  return json(res,200,{ok:true});
}

export async function presencePing(req,res){
  const uid=getUid(req); if(!uid) return json(res,401,{error:"unauthorized"});
  const u=safeParse(await redis.get(K.user(uid))); if(!u) return json(res,401,{error:"unauthorized"});

  const now=Date.now();
  u.last_seen = now;
  await redis.set(K.user(uid),JSON.stringify(u));
  // keep presence key regardless; visibility is enforced when exposing to others
  await redis.set(K.presence(uid),String(now),{ex:45});
  return json(res,200,{ok:true,ts:now});
}
