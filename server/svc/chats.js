import { redis } from "../db/redis.js";
import { json } from "../utils/http.js";
import { getUid } from "../utils/jwt.js";
import { safeParse } from "../utils/parse.js";
import { K } from "../utils/keys.js";
import { dmId } from "../utils/crypto.js";

async function moveChatToTop(listKey, chatId){ await redis.lrem(listKey,0,chatId); await redis.lpush(listKey,chatId); await redis.ltrim(listKey,0,200); }

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

export async function startDm(req,res,body){
  const uid=getUid(req); if(!uid) return json(res,401,{error:"unauthorized"});
  const username=String(body.username||"").trim().toLowerCase();
  if(!username) return json(res,400,{error:"bad_request"});

  const otherId=await redis.get(K.userByUsername(username));
  if(!otherId) return json(res,404,{error:"username_not_found"});
  if(String(otherId)===String(uid)) return json(res,400,{error:"bad_request"});

  const other=safeParse(await redis.get(K.user(otherId)));
  if(!other) return json(res,404,{error:"username_not_found"});

  const chatId=dmId(uid,otherId);
  const existed=await redis.get(K.chat(chatId));
  if(!other.allow_dm && !existed) return json(res,403,{error:"dm_not_allowed"});

  if(!existed){
    const chat={id:chatId,type:"dm",members:[String(uid),String(otherId)],created_at:Date.now()};
    await redis.set(K.chat(chatId),JSON.stringify(chat));
  }

  await moveChatToTop(K.userChats(uid),chatId);
  await moveChatToTop(K.userChats(otherId),chatId);

  return json(res,200,{chat_id:chatId});
}

export async function list(req,res){
  const uid=getUid(req); if(!uid) return json(res,401,{error:"unauthorized"});
  const ids=(await redis.lrange(K.userChats(uid),0,120))||[];
  const out=[];
  for(const id of ids){
    const chat=safeParse(await redis.get(K.chat(id)));
    if(!chat) continue;
    if(!chat.members?.includes(String(uid))) continue;

    const last=safeParse(await redis.get(K.chatLast(id)));
    const unread=Number(await redis.get(K.unread(uid,id))||0);

    let title="Чат"; let peer=null;
    if(chat.type==="dm"){
      const pid=String(chat.members[0])===String(uid)?String(chat.members[1]):String(chat.members[0]);
      const u=safeParse(await redis.get(K.user(pid)));
      if(u){
        const online=!!(await redis.get(K.presence(pid)));
        title=u.display_name||u.username;
        peer={
          username:u.username,
          display_name:u.display_name||u.username,
          avatar:u.avatar||"",
          avatar_url:u.avatar_url||"",
          online,
          status_text: statusText(u, online),
        };
      }
    }

    out.push({
      id,
      type:chat.type,
      title,
      peer,
      last_text:last?.text?String(last.text).slice(0,70):"",
      last_time:last?.ts?new Date(last.ts).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}):"",
      unread:unread>0?unread:0
    });
  }
  return json(res,200,{chats:out});
}
