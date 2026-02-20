import jwt from "jsonwebtoken";
export function signToken(uid){return jwt.sign({uid:String(uid)},process.env.JWT_SECRET,{expiresIn:"30d"});}
export function getUid(req){const h=req.headers.authorization||"";const m=h.match(/^Bearer\s+(.+)$/i);if(!m) return null;try{const p=jwt.verify(m[1],process.env.JWT_SECRET);return p?.uid||null;}catch{return null;}}