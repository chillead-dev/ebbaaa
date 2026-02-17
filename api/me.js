import { supa, json, requireUser } from "./_lib.js";

export default async function handler(req, res) {
  const p = await requireUser(req, res);
  if (!p) return;

  const db = supa();
  const { data, error } = await db
    .from("users")
    .select("id, username, created_at, is_banned, is_verified, role")
    .eq("id", p.uid)
    .single();

  if (error || !data) return json(res, 404, { ok: false });
  if (data.is_banned) return json(res, 403, { ok: false, error: "banned" });

  return json(res, 200, { ok: true, user: data });
}
