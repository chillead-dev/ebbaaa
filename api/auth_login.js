import { redis } from "./_lib/redis.js";
import { json, readBody } from "./_lib/util.js";
import { K } from "./_lib/schema.js";
import bcrypt from "bcryptjs";
import { signToken } from "./_lib/auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "method_not_allowed" });

  const body = await readBody(req);
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!email || !password) return json(res, 400, { error: "bad_request" });

  const userId = await redis.get(K.userByEmail(email));
  if (!userId) return json(res, 400, { error: "invalid_credentials" });

  const raw = await redis.get(K.user(userId));
  if (!raw) return json(res, 400, { error: "invalid_credentials" });
  const user = JSON.parse(raw);

  const ok = bcrypt.compareSync(password, user.pass_hash || "");
  if (!ok) return json(res, 400, { error: "invalid_credentials" });

  const token = signToken(userId);
  return json(res, 200, { token });
}
