import crypto from "crypto";
export function hashPass(password){const salt=crypto.randomBytes(16).toString("hex");const hash=crypto.scryptSync(password,salt,64).toString("hex");return `${salt}:${hash}`;}
export function verifyPass(password,stored){const [salt,hash]=String(stored||"").split(":");if(!salt||!hash) return false;const test=crypto.scryptSync(password,salt,64).toString("hex");return crypto.timingSafeEqual(Buffer.from(hash,"hex"),Buffer.from(test,"hex"));}
export function randId(bytes=12){return crypto.randomBytes(bytes).toString("hex");}
export function dmId(a,b){const [x,y]=[String(a),String(b)].sort();return `dm:${x}:${y}`;}