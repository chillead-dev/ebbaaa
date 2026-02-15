import jwt from "jsonwebtoken";

export function getUserId(req){
  const h = req.headers.authorization || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  try{
    const payload = jwt.verify(m[1], process.env.JWT_SECRET);
    return payload?.uid || payload?.user_id || payload?.id || null;
  }catch{
    return null;
  }
}
