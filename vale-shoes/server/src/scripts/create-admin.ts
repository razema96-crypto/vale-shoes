import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { createAdmin, hashPassword } from "../lib/auth.js";
import { db } from "../db.js";

const rl = readline.createInterface({ input: stdin, output: stdout });
const username = (process.env.ADMIN_USERNAME || (await rl.question("Admin username: "))).trim();
const password = process.env.ADMIN_PASSWORD || (await rl.question("Admin password (min 10 chars): "));
rl.close();
if (!username) { console.error("Username is required."); process.exit(1); }
const existing = db.prepare("SELECT id FROM admins WHERE username = ?").get(username) as { id: number } | undefined;
try {
  if (existing) {
    if (password.length < 10) throw new Error("Password must be at least 10 characters.");
    db.prepare("UPDATE admins SET password_hash = ? WHERE id = ?").run(hashPassword(password), existing.id);
    db.prepare("DELETE FROM sessions WHERE admin_id = ?").run(existing.id);
    console.log(`Password updated for admin "${username}".`);
  } else {
    createAdmin(username, password);
    console.log(`Admin "${username}" created. Sign in at /admin`);
  }
} catch (e) { console.error((e as Error).message); process.exit(1); }
