import { redis } from "./_lib/redis.js";
import { json, readBody, isGmail, normalizeUsername } from "./_lib/util.js";
import { K } from "./_lib/schema.js";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";
import { signToken } from "./_lib/auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "method_not_allowed" });

  const body = await readBody(req);
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const code = String(body.code || "");
  const username = normalizeUsername(body.username);

  if (!email || !password || !code || !username) return json(res, 400, { error: "bad_request" });
  if (!isGmail(email)) return json(res, 400, { error: "gmail_only" });
  if (!/^[a-z0-9_]{3,20}$/.test(username)) return json(res, 400, { error: "username_invalid" });

  const saved = await redis.get(K.code(email));
  if (!saved) return json(res, 400, { error: "code_missing_or_expired" });
  const { code: savedCode } = JSON.parse(saved);
  if (savedCode !== code) return json(res, 400, { error: "code_invalid" });

  // email unique
  const existedId = await redis.get(K.userByEmail(email));
  if (existedId) return json(res, 400, { error: "email_taken" });

  // username unique
  const existedU = await redis.get(K.userByUsername(username));
  if (existedU) return json(res, 400, { error: "username_taken" });

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
    created_at: Date.now()
  };

  // atomic-ish: set mappings first with NX
  const okEmail = await redis.set(K.userByEmail(email), id, { nx: true });
  if (!okEmail) return json(res, 400, { error: "email_taken" });

  const okU = await redis.set(K.userByUsername(username), id, { nx: true });
  if (!okU) {
    await redis.del(K.userByEmail(email));
    return json(res, 400, { error: "username_taken" });
  }

  await redis.set(K.user(id), JSON.stringify({ ...user, pass_hash: passHash }));
  await redis.del(K.code(email));

  const token = signToken(id);
  return json(res, 200, { token });
}
