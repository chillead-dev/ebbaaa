import { redis } from "../db/redis.js";
import { json } from "../utils/http.js";
import { isGmail } from "../utils/validate.js";
import { K } from "../utils/keys.js";
import { safeParse } from "../utils/parse.js";
import { hashPass, verifyPass, randId } from "../utils/crypto.js";
import { signToken } from "../utils/jwt.js";
import { resend } from "../email/resend.js";
import { codeEmailHtml } from "../email/templates.js";

export async function requestCode(req,res,body){
  const email=String(body.email||"").trim().toLowerCase();
  if(!isGmail(email)) return json(res,400,{error:"gmail_only"});
  const exists=await redis.get(K.userByEmail(email));
  if(exists) return json(res,400,{error:"email_taken"});

  const code=String(Math.floor(100000+Math.random()*900000));
  await redis.set(K.code(email),code,{ex:10*60});

  const from=process.env.RESEND_FROM || "Exuberant <auth@exuberant.pw>";
  await resend.emails.send({from,to:email,subject:`Ваш код для Exuberant: ${code}`,html:codeEmailHtml(code)});
  return json(res,200,{ok:true});
}

export async function signup(req,res,body){
  const email=String(body.email||"").trim().toLowerCase();
  const password=String(body.password||"");
  const code=String(body.code||"").trim();

  if(!isGmail(email)) return json(res,400,{error:"gmail_only"});
  if(password.length<6) return json(res,400,{error:"bad_request"});

  const exists=await redis.get(K.userByEmail(email));
  if(exists) return json(res,400,{error:"email_taken"});

  const stored=await redis.get(K.code(email));
  if(!stored) return json(res,400,{error:"code_missing_or_expired"});
  if(String(stored)!==code) return json(res,400,{error:"code_invalid"});

  const uid=randId(12);
  const username=`user_${uid.slice(0,8)}`;
  const user={id:uid,email,username,display_name:username,bio:"",avatar:"",avatar_url:"",allow_dm:1,show_status:1,chat_theme:"default",custom_chat:null,last_seen:Date.now(),pass:hashPass(password),created_at:Date.now()};

  await redis.set(K.user(uid),JSON.stringify(user));
  await redis.set(K.userByEmail(email),uid);
  await redis.set(K.userByUsername(username),uid);
  await redis.zadd("usernames",{score:0,member:username});
  await redis.del(K.code(email));

  return json(res,200,{token:signToken(uid)});
}

export async function login(req,res,body){
  const email=String(body.email||"").trim().toLowerCase();
  const password=String(body.password||"");
  if(!email||!password) return json(res,400,{error:"bad_request"});

  const uid=await redis.get(K.userByEmail(email));
  if(!uid) return json(res,400,{error:"invalid_credentials"});

  const u=safeParse(await redis.get(K.user(uid)));
  if(!u?.pass || !verifyPass(password,u.pass)) return json(res,400,{error:"invalid_credentials"});

  return json(res,200,{token:signToken(uid)});
}
