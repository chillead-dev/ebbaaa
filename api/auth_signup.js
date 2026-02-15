import { redis } from "./_lib/redis.js";
import { json, readBody, isGmail, normalizeUsername } from "./_lib/util.js";
import { K } from "./_lib/schema.js";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";
import { signToken } from "./_lib/auth.js";

function safeJsonParse(x) {
  if (x === null || x === undefined) return null;
  if (typeof x === "object") return x;         // уже объект
  if (typeof x !== "string") return null;
  try { return JSON.parse(x); } catch { return null; }
}

async function generateUsername() {
  // гарантируем уникальность
  for (let i = 0; i < 10; i++) {
    const candidate = `user_${Math.floor(100000 + Math.random() * 900000)}`;
    const existed = await redis.get(K.userByUsername(candidate));
    if (!existed) return candidate;
  }
  // fallback
  return `user_${nanoid(6).toLowerCase()}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "method_not_allowed" });

  const body = await readBody(req);
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const code = String(body.code || "");
  let username = body.username ? normalizeUsername(body.username) : "";

  if (!email || !password || !code) return json(res, 400, { error: "bad_request" });
  if (!isGmail(email)) return json(res, 400, { error: "gmail_only" });

  const savedRaw = await redis.get(K.code(email));
  const savedObj = safeJsonParse(savedRaw);
  if (!savedObj?.code) return json(res, 400, { error: "code_missing_or_expired" });
  if (String(savedObj.code) !== code) return json(res, 400, { error: "code_invalid" });

  const existedId = await redis.get(K.userByEmail(email));
  if (existedId) return json(res, 400, { error: "email_taken" });

  if (username) {
    if (!/^[a-z0-9_]{3,20}$/.test(username)) return json(res, 400, { error: "username_invalid" });
    const existedU = await redis.get(K.userByUsername(username));
    if (existedU) return json(res, 400, { error: "username_taken" });
  } else {
    username = await generateUsername();
  }

  const id = nanoid();
  const passHash = bcrypt.hashSync(password, 12);

  const user = {
    id,
    email,
    username,
    display_name: username,
    avatar_url: "",
    allow_dm: 1,
    verified: 1,
    created_at: Date.now(),
    pass_hash: passHash
  };

  // маппинги (NX)
  const okEmail = await redis.set(K.userByEmail(email), id, { nx: true });
  if (!okEmail) return json(res, 400, { error: "email_taken" });

  const okU = await redis.set(K.userByUsername(username), id, { nx: true });
  if (!okU) {
    await redis.del(K.userByEmail(email));
    return json(res, 400, { error: "username_taken" });
  }

  await redis.set(K.user(id), JSON.stringify(user));
  await redis.del(K.code(email));

  // для prefix-поиска
  await redis.zadd("usernames", { score: 0, member: username });

  const token = signToken(id);
  return json(res, 200, { token });
}
