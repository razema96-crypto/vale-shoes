import crypto from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { db } from "../db.js";
import { IS_PROD, PUBLIC_URL, SESSION_SECRET, SESSION_TTL_MS } from "../config.js";

export const COOKIE_NAME = "vale_admin";

/* ---------- Password hashing (scrypt, salted) ---------- */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [alg, saltHex, keyHex] = stored.split("$");
  if (alg !== "scrypt" || !saltHex || !keyHex) return false;
  const key = crypto.scryptSync(password, Buffer.from(saltHex, "hex"), 64, { N: 16384, r: 8, p: 1 });
  const expected = Buffer.from(keyHex, "hex");
  return expected.length === key.length && crypto.timingSafeEqual(expected, key);
}

export function createAdmin(username: string, password: string) {
  if (password.length < 10) throw new Error("Password must be at least 10 characters.");
  db.prepare("INSERT INTO admins (username, password_hash) VALUES (?, ?)").run(username.trim(), hashPassword(password));
}

/* ---------- Sessions (opaque random token, only its HMAC is stored) ---------- */
const tokenHash = (t: string) => crypto.createHmac("sha256", SESSION_SECRET).update(t).digest("hex");

export function startSession(res: Response, adminId: number) {
  const token = crypto.randomBytes(32).toString("base64url");
  const expires = Date.now() + SESSION_TTL_MS;
  db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(Date.now());
  db.prepare("INSERT INTO sessions (token_hash, admin_id, expires_at) VALUES (?, ?, ?)").run(tokenHash(token), adminId, expires);
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: "strict",
    maxAge: SESSION_TTL_MS,
    path: "/api",
  });
}

export function endSession(req: Request, res: Response) {
  const t = req.cookies?.[COOKIE_NAME];
  if (t) db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash(t));
  res.clearCookie(COOKIE_NAME, { path: "/api" });
}

export function currentAdmin(req: Request): { id: number; username: string } | null {
  const t = req.cookies?.[COOKIE_NAME];
  if (!t || typeof t !== "string") return null;
  const row = db
    .prepare(
      "SELECT a.id, a.username, s.expires_at FROM sessions s JOIN admins a ON a.id = s.admin_id WHERE s.token_hash = ?"
    )
    .get(tokenHash(t)) as { id: number; username: string; expires_at: number } | undefined;
  if (!row || row.expires_at < Date.now()) return null;
  return { id: row.id, username: row.username };
}

/** Rejects cross-site state-changing requests (defence in depth on top of SameSite=strict). */
function sameOrigin(req: Request): boolean {
  const site = req.get("sec-fetch-site");
  if (site && site !== "same-origin") return false;
  const origin = req.get("origin");
  if (!origin) return true; // same-origin fetches from older browsers / non-browser clients with a valid cookie
  try {
    const o = new URL(origin);
    const allowed = new Set(
      [req.get("host"), req.get("x-forwarded-host"), new URL(PUBLIC_URL).host].filter(Boolean) as string[]
    );
    if (allowed.has(o.host)) return true;
    // Development: the Vite dev server proxies the API from another localhost port.
    return !IS_PROD && (o.hostname === "localhost" || o.hostname === "127.0.0.1");
  } catch {
    return false;
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const admin = currentAdmin(req);
  if (!admin) return res.status(401).json({ error: "يجب تسجيل الدخول." });
  if (req.method !== "GET" && !sameOrigin(req)) return res.status(403).json({ error: "طلب غير مسموح." });
  (req as any).admin = admin;
  next();
}

/* ---------- Simple in-memory rate limiter ---------- */
export function rateLimit(opts: { windowMs: number; max: number; message: string }) {
  const hits = new Map<string, { count: number; reset: number }>();
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || "unknown";
    const now = Date.now();
    const h = hits.get(key);
    if (!h || h.reset < now) {
      hits.set(key, { count: 1, reset: now + opts.windowMs });
      if (hits.size > 5000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
      return next();
    }
    h.count++;
    if (h.count > opts.max) {
      res.setHeader("Retry-After", Math.ceil((h.reset - now) / 1000));
      return res.status(429).json({ error: opts.message });
    }
    next();
  };
}
