import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const SERVER_ROOT = path.resolve(here, "..");

const envFile = path.join(SERVER_ROOT, ".env");
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);

export const IS_PROD = process.env.NODE_ENV === "production";
export const PORT = Number(process.env.PORT || 8787);
export const PUBLIC_URL = (process.env.PUBLIC_URL || `http://localhost:${PORT}`).replace(/\/$/, "");
// On a host with one persistent volume, point both at it (e.g. DATA_DIR=/data/db, UPLOAD_DIR=/data/uploads).
export const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(SERVER_ROOT, "data");
export const UPLOAD_DIR = process.env.UPLOAD_DIR ? path.resolve(process.env.UPLOAD_DIR) : path.join(SERVER_ROOT, "uploads");
export const DEMO_IMAGE_DIR = path.join(SERVER_ROOT, "demo-images");
export const CLIENT_DIST = path.resolve(SERVER_ROOT, "..", "client", "dist");
export const SEED_DEMO = process.env.SEED_DEMO_PRODUCTS !== "0";

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

function resolveSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 32) return s;
  if (IS_PROD) {
    console.error("[vale] SESSION_SECRET (32+ chars) is required in production. Refusing to start.");
    process.exit(1);
  }
  // Development only: persist a random secret locally so sessions survive restarts.
  const f = path.join(DATA_DIR, ".dev-session-secret");
  if (fs.existsSync(f)) return fs.readFileSync(f, "utf8").trim();
  const gen = crypto.randomBytes(48).toString("hex");
  fs.writeFileSync(f, gen, { mode: 0o600 });
  return gen;
}
export const SESSION_SECRET = resolveSecret();
export const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours
