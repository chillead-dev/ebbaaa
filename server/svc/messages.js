import { redis } from "../db/redis.js";
import { json } from "../utils/http.js";
import { getUid } from "../utils/jwt.js";
import { safeParse } from "../utils/parse.js";
import { K } from "../utils/keys.js";
import { randId } from "../utils/crypto.js";

async function moveChatToTop(listKey, chatId){ await redis.lrem(listKey,0,chatId); await redis.lpush(listKey,chatId); await redis.ltrim(listKey,0,200); }

async function mustMember(uid, chatId){
  const chat=safeParse(await redis.get(K.chat(chatId)));
  if(!chat) return {ok:false, status:404, error:"not_found"};
  if(!chat.members?.includes(String(uid))) return {ok:false, status:403, error:"forbidden"};
  return {ok:true, chat};
}

export async function list(req,res,body){
  const uid=getUid(req); if(!uid) return json(res,401,{error:"unauthorized"});
  const chatId=String(body.chat_id||""); if(!chatId) return json(res,400,{error:"bad_request"});
  const chk=await mustMember(uid, chatId); if(!chk.ok) return json(res,chk.status,{error:chk.error});

  const raw=(await redis.lrange(K.chatMsgs(chatId),0,120))||[];
  const msgs=raw.map(safeParse).filter(Boolean).reverse();
  return json(res,200,{messages:msgs.map(m=>({id:m.id||null,text:m.text,ts:m.ts,is_me:String(m.from_uid)===String(uid)}))});
}

export async function send(req,res,body){
  const uid=getUid(req); if(!uid) return json(res,401,{error:"unauthorized"});
  const chatId=String(body.chat_id||""); const text=String(body.text||"").trim();
  if(!chatId||!text) return json(res,400,{error:"bad_request"});

  const chk=await mustMember(uid, chatId); if(!chk.ok) return json(res,chk.status,{error:chk.error});
  const chat=chk.chat;

  const msg={id:randId(8),from_uid:String(uid),text:text.slice(0,4000),ts:Date.now()};
  await redis.lpush(K.chatMsgs(chatId),JSON.stringify(msg));
  await redis.ltrim(K.chatMsgs(chatId),0,600);
  await redis.set(K.chatLast(chatId),JSON.stringify(msg));

  const [a,b]=chat.members;
  await moveChatToTop(K.userChats(a),chatId);
  await moveChatToTop(K.userChats(b),chatId);

  const other=String(a)===String(uid)?String(b):String(a);
  await redis.incr(K.unread(other,chatId));

  return json(res,200,{ok:true});
}

export async function markRead(req,res,body){
  const uid=getUid(req); if(!uid) return json(res,401,{error:"unauthorized"});
  const chatId=String(body.chat_id||""); if(!chatId) return json(res,400,{error:"bad_request"});
  const chk=await mustMember(uid, chatId); if(!chk.ok) return json(res,chk.status,{error:chk.error});

  await redis.set(K.unread(uid,chatId),"0");
  return json(res,200,{ok:true});
}

export async function pinGet(req,res,body){
  const uid=getUid(req); if(!uid) return json(res,401,{error:"unauthorized"});
  const chatId=String(body.chat_id||""); if(!chatId) return json(res,400,{error:"bad_request"});
  const chk=await mustMember(uid, chatId); if(!chk.ok) return json(res,chk.status,{error:chk.error});

  const pinned=safeParse(await redis.get(K.pinned(chatId)));
  return json(res,200,{pinned:pinned||null});
}

export async function pinSet(req,res,body){
  const uid=getUid(req); if(!uid) return json(res,401,{error:"unauthorized"});
  const chatId=String(body.chat_id||""); if(!chatId) return json(res,400,{error:"bad_request"});
  const chk=await mustMember(uid, chatId); if(!chk.ok) return json(res,chk.status,{error:chk.error});

  const p=body.pinned||{};
  const text=String(p.text||"").trim().slice(0,4000);
  const ts=Number(p.ts||Date.now());
  if(!text) return json(res,400,{error:"bad_request"});

  await redis.set(K.pinned(chatId),JSON.stringify({text,ts,by:String(uid)}));
  return json(res,200,{ok:true});
}

export async function pinClear(req,res,body){
  const uid=getUid(req); if(!uid) return json(res,401,{error:"unauthorized"});
  const chatId=String(body.chat_id||""); if(!chatId) return json(res,400,{error:"bad_request"});
  const chk=await mustMember(uid, chatId); if(!chk.ok) return json(res,chk.status,{error:chk.error});

  await redis.del(K.pinned(chatId));
  return json(res,200,{ok:true});
}


export async function clear(req,res,body){
  const uid=getUid(req); if(!uid) return json(res,401,{error:"unauthorized"});
  const chatId=String(body.chat_id||""); if(!chatId) return json(res,400,{error:"bad_request"});
  const forAll=Number(body.for_all||0)?1:0;

  const chat=safeParse(await redis.get(K.chat(chatId)));
  if(!chat) return json(res,404,{error:"not_found"});
  if(!chat.members?.includes(String(uid))) return json(res,403,{error:"forbidden"});

  if(forAll){
    // clear for everyone
    await redis.del(K.chatMsgs(chatId));
    await redis.del(K.chatLast(chatId));
    for(const member of chat.members){
      await redis.set(K.unread(member,chatId),"0");
    }
    return json(res,200,{ok:true});
  }

  // for self only: delete chat from list (acts like "clear" locally)
  await redis.lrem(K.userChats(uid),0,chatId);
  await redis.set(K.unread(uid,chatId),"0");
  return json(res,200,{ok:true,removed_for_self:true});
}

export async function deleteOne(req,res,body){
  const uid=getUid(req); if(!uid) return json(res,401,{error:"unauthorized"});
  const chatId=String(body.chat_id||""); const msgId=String(body.msg_id||"");
  if(!chatId||!msgId) return json(res,400,{error:"bad_request"});

  const chat=safeParse(await redis.get(K.chat(chatId)));
  if(!chat) return json(res,404,{error:"not_found"});
  if(!chat.members?.includes(String(uid))) return json(res,403,{error:"forbidden"});

  const raw=(await redis.lrange(K.chatMsgs(chatId),0,300))||[];
  let removed=0;
  for(const s of raw){
    const m=safeParse(s);
    if(m?.id===msgId){
      removed += await redis.lrem(K.chatMsgs(chatId),0,s);
      break;
    }
  }
  // update last message if needed
  const last=safeParse(await redis.get(K.chatLast(chatId)));
  if(last?.id===msgId){
    const left=(await redis.lrange(K.chatMsgs(chatId),0,0))||[];
    if(left.length){
      await redis.set(K.chatLast(chatId), left[0]);
    }else{
      await redis.del(K.chatLast(chatId));
    }
  }
  return json(res,200,{ok:true,removed});
}
