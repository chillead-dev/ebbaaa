import { supa, json, readBody, requireUser } from "./_lib.js";

export default async function handler(req, res) {
  const db = supa();

  if (req.method === "GET") {
    const { data, error } = await db
      .from("posts")
      .select("id, text, created_at, author_id, users:author_id(id, username, is_verified)")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) return json(res, 500, { ok: false, error: error.message });
    return json(res, 200, { ok: true, posts: data || [] });
  }

  if (req.method === "POST") {
    const p = await requireUser(req, res);
    if (!p) return;

    const body = await readBody(req);
    const text = (body.text || "").trim();
    if (text.length < 1 || text.length > 2000) {
      return json(res, 400, { ok: false, error: "text 1..2000" });
    }

    const { data: u } = await db.from("users").select("is_banned").eq("id", p.uid).single();
    if (u?.is_banned) return json(res, 403, { ok: false, error: "banned" });

    const { data, error } = await db
      .from("posts")
      .insert([{ author_id: p.uid, text }])
      .select("id, text, created_at, author_id")
      .single();

    if (error) return json(res, 500, { ok: false, error: error.message });
    return json(res, 200, { ok: true, post: data });
  }

  return json(res, 405, { ok: false });
}
