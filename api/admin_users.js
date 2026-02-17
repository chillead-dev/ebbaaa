import { supa, json, requireAdmin } from "./_lib.js";

export default async function handler(req, res) {
  const p = await requireAdmin(req, res);
  if (!p) return;

  const db = supa();
  const { data, error } = await db
    .from("users")
    .select("id, username, created_at, is_banned, is_verified, role")
    .order("id", { ascending: true })
    .limit(500);

  if (error) return json(res, 500, { ok: false, error: error.message });

  const total = data?.length || 0;
  const banned = (data || []).filter(x => x.is_banned).length;
  const verified = (data || []).filter(x => x.is_verified).length;

  return json(res, 200, { ok: true, stats: { total, banned, verified }, users: data || [] });
}
