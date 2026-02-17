import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change";
const OWNER_ADMIN_TOKEN = process.env.OWNER_ADMIN_TOKEN || "dev-owner-token-change";

export function supa() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY env vars");
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });
}

export function json(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(data));
}

export async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  try { return raw ? JSON.parse(raw) : {}; }
  catch { return {}; }
}

function b64url(input) {
  return Buffer.from(input).toString("base64url");
}

export function signJWT(payload, ttlSeconds = 60 * 60 * 24 * 7) {
  const header = { alg: "HS256", typ: "JWT" };
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const body = { ...payload, exp };

  const h = b64url(JSON.stringify(header));
  const p = b64url(JSON.stringify(body));
  const data = `${h}.${p}`;
  const sig = crypto.createHmac("sha256", JWT_SECRET).update(data).digest("base64url");
  return `${data}.${sig}`;
}

export function verifyJWT(token) {
  if (!token || token.split(".").length !== 3) return null;
  const [h, p, s] = token.split(".");
  const data = `${h}.${p}`;
  const sig = crypto.createHmac("sha256", JWT_SECRET).update(data).digest("base64url");
  if (sig !== s) return null;
  const payload = JSON.parse(Buffer.from(p, "base64url").toString("utf8"));
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

export function getTokenFromReq(req) {
  const auth = req.headers["authorization"] || "";
  if (auth.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

export async function requireUser(req, res) {
  const token = getTokenFromReq(req);
  const payload = verifyJWT(token);
  if (!payload?.uid) {
    json(res, 401, { ok: false, error: "unauthorized" });
    return null;
  }
  return payload;
}

export async function requireAdmin(req, res) {
  const p = await requireUser(req, res);
  if (!p) return null;
  if (p.role !== "admin") {
    json(res, 403, { ok: false, error: "admin_only" });
    return null;
  }
  return p;
}

export async function hashPass(pass) {
  return await bcrypt.hash(pass, 10);
}

export async function checkPass(pass, hash) {
  return await bcrypt.compare(pass, hash);
}

export function isOwnerAdminToken(value) {
  return value && value === OWNER_ADMIN_TOKEN;
}
