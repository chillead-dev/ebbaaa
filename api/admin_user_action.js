import { supa, json, readBody, requireAdmin } from "./_lib.js";

export default async function handler(req, res) {
  const p = await requireAdmin(req, res);
  if (!p) return;

  if (req.method !== "POST") return json(res, 405, { ok: false });

  const { userId, action, value } = await readBody(req);
  const uid = Number(userId);

  if (!uid || !["ban", "verify"].includes(action)) {
    return json(res, 400, { ok: false, error: "bad_request" });
  }

  const db = supa();
  const patch =
    action === "ban" ? { is_banned: !!value } :
    action === "verify" ? { is_verified: !!value } :
    null;

  const { error } = await db.from("users").update(patch).eq("id", uid);
  if (error) return json(res, 500, { ok: false, error: error.message });

  return json(res, 200, { ok: true });
}
