import { supa, json, readBody, hashPass } from "./_lib.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { ok: false });

  const { username, password } = await readBody(req);
  const u = (username || "").trim();
  const p = (password || "").trim();

  if (u.length < 3 || p.length < 6) {
    return json(res, 400, { ok: false, error: "username>=3, password>=6" });
  }

  const db = supa();
  const pass_hash = await hashPass(p);

  const { data, error } = await db
    .from("users")
    .insert([{ username: u, pass_hash }])
    .select("id, username, created_at, is_banned, is_verified, role")
    .single();

  if (error) return json(res, 400, { ok: false, error: error.message });

  return json(res, 200, { ok: true, user: data });
}
