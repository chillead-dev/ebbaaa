import { supa, json, readBody, checkPass, signJWT, isOwnerAdminToken } from "./_lib.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { ok: false });

  const { username, password, ownerKey } = await readBody(req);
  const u = (username || "").trim();
  const p = (password || "").trim();

  const db = supa();
  const { data: user, error } = await db
    .from("users")
    .select("id, username, pass_hash, is_banned, is_verified, role")
    .eq("username", u)
    .single();

  if (error || !user) return json(res, 400, { ok: false, error: "bad_credentials" });
  if (user.is_banned) return json(res, 403, { ok: false, error: "banned" });

  const ok = await checkPass(p, user.pass_hash);
  if (!ok) return json(res, 400, { ok: false, error: "bad_credentials" });

  let role = user.role;
  if (isOwnerAdminToken(ownerKey) && role !== "admin") {
    await db.from("users").update({ role: "admin" }).eq("id", user.id);
    role = "admin";
  }

  const token = signJWT({ uid: user.id, username: user.username, role });

  return json(res, 200, {
    ok: true,
    token,
    user: { id: user.id, username: user.username, is_verified: user.is_verified, role }
  });
}
