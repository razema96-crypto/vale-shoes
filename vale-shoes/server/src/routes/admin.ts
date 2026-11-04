import crypto from "node:crypto";
import path from "node:path";
import fs from "node:fs";
import { Router } from "express";
import multer from "multer";
import sharp from "sharp";
import { z } from "zod";
import { db, tx } from "../db.js";
import { UPLOAD_DIR } from "../config.js";
import {
  rowToProduct,
  rowToOrder,
  getSettings,
  saveSettings,
  ORDER_STATUSES,
  DEFAULT_SETTINGS,
} from "../lib/models.js";
import {
  requireAdmin,
  verifyPassword,
  startSession,
  endSession,
  currentAdmin,
  rateLimit,
} from "../lib/auth.js";

export const adminRouter = Router();

/* ---------------- Auth ---------------- */
const loginSchema = z.object({ username: z.string().min(1).max(60), password: z.string().min(1).max(200) });

// Brute-force protection: count failed logins per IP (successful logins reset the counter).
const failed = new Map<string, { n: number; until: number }>();
const FAIL_WINDOW = 15 * 60 * 1000, FAIL_MAX = 8;

adminRouter.post(
  "/login",
  rateLimit({ windowMs: 60 * 1000, max: 20, message: "طلبات كثيرة. انتظر دقيقة ثم حاول مجدداً." }),
  (req, res) => {
    const ip = req.ip || "unknown";
    const f = failed.get(ip);
    if (f && f.until > Date.now() && f.n >= FAIL_MAX)
      return res.status(429).json({ error: "محاولات دخول خاطئة كثيرة. انتظر 15 دقيقة ثم حاول مجدداً." });
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "أدخل اسم المستخدم وكلمة المرور." });
    const row = db.prepare("SELECT id, password_hash FROM admins WHERE username = ?").get(parsed.data.username.trim()) as
      | { id: number; password_hash: string }
      | undefined;
    // Always run a hash comparison to keep timing uniform.
    const ok = row
      ? verifyPassword(parsed.data.password, row.password_hash)
      : (verifyPassword(parsed.data.password, "scrypt$00$00"), false);
    if (!row || !ok) {
      const cur = f && f.until > Date.now() ? f : { n: 0, until: Date.now() + FAIL_WINDOW };
      cur.n++;
      failed.set(ip, cur);
      return res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة." });
    }
    failed.delete(ip);
    startSession(res, row.id);
    res.json({ ok: true });
  }
);

adminRouter.post("/logout", (req, res) => {
  endSession(req, res);
  res.json({ ok: true });
});

adminRouter.get("/me", (req, res) => {
  const admin = currentAdmin(req);
  const hasAdmin = (db.prepare("SELECT COUNT(*) c FROM admins").get() as { c: number }).c > 0;
  if (!admin) return res.status(401).json({ error: "غير مسجل الدخول.", setupRequired: !hasAdmin });
  res.json({ admin });
});

// Everything below requires a valid admin session.
adminRouter.use(requireAdmin);

/* ---------------- Dashboard summary ---------------- */
adminRouter.get("/summary", (_req, res) => {
  const one = (sql: string) => (db.prepare(sql).get() as { v: number }).v ?? 0;
  res.json({
    products: one("SELECT COUNT(*) v FROM products"),
    lowStock: one("SELECT COUNT(*) v FROM products WHERE active = 1 AND stock <= 3"),
    newOrders: one("SELECT COUNT(*) v FROM orders WHERE status = 'new'"),
    pendingReviews: one("SELECT COUNT(*) v FROM reviews WHERE approved = 0"),
    revenue: one("SELECT COALESCE(SUM(total),0) v FROM orders WHERE status = 'delivered'"),
    demoProducts: one("SELECT COUNT(*) v FROM products WHERE is_demo = 1"),
  });
});

/* ---------------- Products ---------------- */
const colorSchema = z.object({
  name: z.string().trim().min(1).max(40),
  hex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});
const imageSchema = z.object({
  url: z.string().regex(/^\/(uploads|demo-images)\/[\w.\-]+$/, "Invalid image URL"),
  color: z.string().max(40).optional(),
  alt: z.string().max(200).optional(),
});
const productSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().max(120).optional(),
  description: z.string().trim().max(5000).default(""),
  category: z.string().trim().min(1).max(60),
  price: z.number().nonnegative().max(1_000_000),
  compareAtPrice: z.number().nonnegative().max(1_000_000).nullable().optional(),
  sizes: z.array(z.number().min(15).max(60)).min(1).max(30),
  colors: z.array(colorSchema).min(1).max(20),
  images: z.array(imageSchema).max(30).default([]),
  badges: z.array(z.enum(["bestseller", "new"])).max(2).default([]),
  stock: z.number().int().min(0).max(100000),
  popularity: z.number().int().min(0).optional(),
  active: z.boolean().default(true),
  isDemo: z.boolean().optional(),
});

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}
function uniqueSlug(base: string, exceptId?: number) {
  let slug = slugify(base) || `product-${crypto.randomBytes(3).toString("hex")}`;
  let i = 2;
  while (db.prepare("SELECT id FROM products WHERE slug = ? AND id != ?").get(slug, exceptId ?? -1)) {
    slug = `${slugify(base)}-${i++}`;
  }
  return slug;
}

adminRouter.get("/products", (_req, res) => {
  res.json(db.prepare("SELECT * FROM products ORDER BY created_at DESC, id DESC").all().map((r) => rowToProduct(r as any)));
});

adminRouter.get("/products/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM products WHERE id = ?").get(Number(req.params.id));
  if (!row) return res.status(404).json({ error: "المنتج غير موجود." });
  res.json(rowToProduct(row as any));
});

function invalid(res: any, err: z.ZodError) {
  const first = err.issues[0];
  return res.status(400).json({ error: `حقل غير صالح: ${first?.path.join(".") || "?"}`, issues: err.issues });
}

function insertProduct(p: z.infer<typeof productSchema>) {
  const slug = uniqueSlug(p.slug || p.name);
  const r = db
    .prepare(
      `INSERT INTO products (slug, name, description, category, price, compare_at_price, sizes, colors, images, badges, stock, popularity, is_demo, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`
    )
    .run(
      slug,
      p.name,
      p.description,
      p.category,
      p.price,
      p.compareAtPrice ?? null,
      JSON.stringify(p.sizes),
      JSON.stringify(p.colors),
      JSON.stringify(p.images),
      JSON.stringify(p.badges),
      p.stock,
      p.popularity ?? 0,
      p.active ? 1 : 0
    );
  return Number(r.lastInsertRowid);
}

adminRouter.post("/products", (req, res) => {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) return invalid(res, parsed.error);
  const id = insertProduct(parsed.data);
  res.status(201).json(rowToProduct(db.prepare("SELECT * FROM products WHERE id = ?").get(id) as any));
});

/* Bulk create (used by the bulk image import). All-or-nothing per request. */
adminRouter.post("/products/bulk", (req, res) => {
  const parsed = z.object({ products: z.array(productSchema).min(1).max(100) }).safeParse(req.body);
  if (!parsed.success) return invalid(res, parsed.error);
  const ids = tx(() => parsed.data.products.map(insertProduct));
  res.status(201).json({ created: ids.length, ids });
});

/* Bulk update: publish / hide / price / category / stock / delete for many products at once. */
adminRouter.post("/products/bulk-update", (req, res) => {
  const parsed = z
    .object({
      ids: z.array(z.number().int().positive()).min(1).max(2000),
      action: z.enum(["publish", "hide", "delete", "set"]),
      patch: z
        .object({
          price: z.number().nonnegative().max(1_000_000).optional(),
          category: z.string().trim().min(1).max(60).optional(),
          stock: z.number().int().min(0).max(100000).optional(),
        })
        .optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) return invalid(res, parsed.error);
  const { ids, action, patch } = parsed.data;
  const removedImages: string[] = [];
  let skipped = 0;
  tx(() => {
    for (const id of ids) {
      if (action === "publish") {
        const r = db.prepare("UPDATE products SET active = 1, updated_at = datetime('now') WHERE id = ?").run(id);
        if (!r.changes) skipped++;
      }
      else if (action === "hide") db.prepare("UPDATE products SET active = 0, updated_at = datetime('now') WHERE id = ?").run(id);
      else if (action === "delete") {
        const row = db.prepare("SELECT images FROM products WHERE id = ?").get(id) as { images: string } | undefined;
        if (row) removedImages.push(...(JSON.parse(row.images) as { url: string }[]).map((i) => i.url));
        db.prepare("DELETE FROM products WHERE id = ?").run(id);
      } else if (patch) {
        if (patch.price !== undefined) db.prepare("UPDATE products SET price = ?, updated_at = datetime('now') WHERE id = ?").run(patch.price, id);
        if (patch.category !== undefined) db.prepare("UPDATE products SET category = ?, updated_at = datetime('now') WHERE id = ?").run(patch.category, id);
        if (patch.stock !== undefined) db.prepare("UPDATE products SET stock = ?, updated_at = datetime('now') WHERE id = ?").run(patch.stock, id);
      }
    }
  });
  if (removedImages.length) cleanupImages(removedImages);
  res.json({ ok: true, count: ids.length - skipped, skipped });
});

function cleanupImages(urls: string[]) {
  const still = new Set(
    (db.prepare("SELECT images FROM products").all() as { images: string }[]).flatMap((r) =>
      (JSON.parse(r.images) as { url: string }[]).map((i) => i.url)
    )
  );
  for (const u of urls) {
    if (u.startsWith("/uploads/") && !still.has(u)) fs.rm(path.join(UPLOAD_DIR, path.basename(u)), { force: true }, () => {});
  }
}

adminRouter.put("/products/:id", (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare("SELECT * FROM products WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ error: "المنتج غير موجود." });
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) return invalid(res, parsed.error);
  const p = parsed.data;
  const prev = rowToProduct(existing as any);
  const slug = p.slug && p.slug !== prev.slug ? uniqueSlug(p.slug, id) : prev.slug;
  db.prepare(
    `UPDATE products SET slug=?, name=?, description=?, category=?, price=?, compare_at_price=?, sizes=?, colors=?, images=?, badges=?,
     stock=?, popularity=?, active=?, is_demo=?, updated_at=datetime('now') WHERE id=?`
  ).run(
    slug,
    p.name,
    p.description,
    p.category,
    p.price,
    p.compareAtPrice ?? null,
    JSON.stringify(p.sizes),
    JSON.stringify(p.colors),
    JSON.stringify(p.images),
    JSON.stringify(p.badges),
    p.stock,
    p.popularity ?? prev.popularity,
    p.active ? 1 : 0,
    (p.isDemo ?? prev.isDemo) ? 1 : 0,
    id
  );
  res.json(rowToProduct(db.prepare("SELECT * FROM products WHERE id = ?").get(id) as any));
});

adminRouter.patch("/products/:id/stock", (req, res) => {
  const parsed = z.object({ stock: z.number().int().min(0).max(100000) }).safeParse(req.body);
  if (!parsed.success) return invalid(res, parsed.error);
  const r = db.prepare("UPDATE products SET stock = ?, updated_at = datetime('now') WHERE id = ?").run(parsed.data.stock, Number(req.params.id));
  if (!r.changes) return res.status(404).json({ error: "المنتج غير موجود." });
  res.json({ ok: true });
});

adminRouter.delete("/products/:id", (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare("SELECT images FROM products WHERE id = ?").get(id) as { images: string } | undefined;
  if (!row) return res.status(404).json({ error: "المنتج غير موجود." });
  db.prepare("DELETE FROM products WHERE id = ?").run(id);
  // Remove uploaded image files no longer referenced by any product.
  const still = new Set(
    (db.prepare("SELECT images FROM products").all() as { images: string }[]).flatMap((r) =>
      (JSON.parse(r.images) as { url: string }[]).map((i) => i.url)
    )
  );
  for (const img of JSON.parse(row.images) as { url: string }[]) {
    if (img.url.startsWith("/uploads/") && !still.has(img.url)) {
      fs.rm(path.join(UPLOAD_DIR, path.basename(img.url)), { force: true }, () => {});
    }
  }
  res.json({ ok: true });
});

/* ---------------- Image upload ---------------- */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: 20 },
  fileFilter: (_req, file, cb) => cb(null, /^image\/(jpeg|png|webp|avif|heic|heif)$/.test(file.mimetype)),
});

adminRouter.post("/uploads", upload.array("images", 20), async (req, res) => {
  const files = (req.files as Express.Multer.File[]) || [];
  if (!files.length) return res.status(400).json({ error: "اختر صوراً بصيغة JPG أو PNG أو WEBP (حتى 15MB لكل صورة)." });
  try {
    const urls: string[] = [];
    for (const f of files) {
      const name = `${Date.now().toString(36)}-${crypto.randomBytes(6).toString("hex")}.webp`;
      // Re-encode: strips metadata, normalises orientation, caps size, and guarantees it's a real image.
      await sharp(f.buffer)
        .rotate()
        .resize({ width: 1600, height: 2000, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 84 })
        .toFile(path.join(UPLOAD_DIR, name));
      urls.push(`/uploads/${name}`);
    }
    res.status(201).json({ urls });
  } catch {
    res.status(400).json({ error: "تعذرت معالجة إحدى الصور. تأكد أن الملف صورة صالحة." });
  }
});

/* ---------------- Orders ---------------- */
adminRouter.get("/orders", (req, res) => {
  const status = typeof req.query.status === "string" ? req.query.status : "";
  const rows = ORDER_STATUSES.includes(status as any)
    ? db.prepare("SELECT * FROM orders WHERE status = ? ORDER BY id DESC").all(status)
    : db.prepare("SELECT * FROM orders ORDER BY id DESC").all();
  res.json(rows.map((r) => rowToOrder(r as any)));
});

adminRouter.patch("/orders/:id", (req, res) => {
  const parsed = z.object({ status: z.enum(ORDER_STATUSES as [string, ...string[]]) }).safeParse(req.body);
  if (!parsed.success) return invalid(res, parsed.error);
  const id = Number(req.params.id);
  const row = db.prepare("SELECT * FROM orders WHERE id = ?").get(id);
  if (!row) return res.status(404).json({ error: "الطلب غير موجود." });
  const order = rowToOrder(row as any);
  const next = parsed.data.status;
  tx(() => {
    // Keep inventory honest: cancelling returns items to stock; un-cancelling takes them again.
    const sign = order.status !== "cancelled" && next === "cancelled" ? 1 : order.status === "cancelled" && next !== "cancelled" ? -1 : 0;
    if (sign) {
      for (const it of order.items as { productId: number; qty: number }[]) {
        db.prepare("UPDATE products SET stock = MAX(0, stock + ?) WHERE id = ?").run(sign * it.qty, it.productId);
      }
    }
    db.prepare("UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?").run(next, id);
  });
  res.json(rowToOrder(db.prepare("SELECT * FROM orders WHERE id = ?").get(id) as any));
});

/* ---------------- Reviews moderation ---------------- */
adminRouter.get("/reviews", (_req, res) => {
  res.json(
    db
      .prepare(
        `SELECT r.id, r.name, r.rating, r.body, r.approved, r.created_at AS createdAt, p.name AS productName, p.slug AS productSlug
         FROM reviews r JOIN products p ON p.id = r.product_id ORDER BY r.approved ASC, r.id DESC`
      )
      .all()
      .map((r: any) => ({ ...r, approved: !!r.approved }))
  );
});
adminRouter.patch("/reviews/:id", (req, res) => {
  const parsed = z.object({ approved: z.boolean() }).safeParse(req.body);
  if (!parsed.success) return invalid(res, parsed.error);
  db.prepare("UPDATE reviews SET approved = ? WHERE id = ?").run(parsed.data.approved ? 1 : 0, Number(req.params.id));
  res.json({ ok: true });
});
adminRouter.delete("/reviews/:id", (req, res) => {
  db.prepare("DELETE FROM reviews WHERE id = ?").run(Number(req.params.id));
  res.json({ ok: true });
});

/* ---------------- Settings ---------------- */
const settingsSchema = z.object({
  storeName: z.string().trim().min(1).max(60),
  currencyCode: z.string().trim().regex(/^[A-Z]{3}$/),
  currencySymbol: z.string().trim().min(1).max(8),
  deliveryFee: z.number().min(0).max(100000),
  freeDeliveryThreshold: z.number().min(0).max(10_000_000),
  whatsappNumber: z.string().trim().regex(/^(\d{8,15})?$/, "WhatsApp number must be digits in international format"),
  paymentCodEnabled: z.boolean(),
  paymentWhatsappEnabled: z.boolean(),
  shippingInfo: z.string().trim().max(1000),
  contactPhone: z.string().trim().max(40),
  contactEmail: z.union([z.literal(""), z.string().trim().email()]),
  contactAddress: z.string().trim().max(200),
  instagramUrl: z.union([z.literal(""), z.string().trim().url()]),
  facebookUrl: z.union([z.literal(""), z.string().trim().url()]),
  heroImages: z.array(z.string().regex(/^\/(uploads|demo-images|brand)\/[\w.\-]+$/)).max(8),
  heroTitle: z.string().trim().min(2).max(80),
  heroSubtitle: z.string().trim().max(200),
  showPrices: z.boolean(),
});

adminRouter.get("/settings", (_req, res) => res.json(getSettings()));
adminRouter.put("/settings", (req, res) => {
  const parsed = settingsSchema.partial().safeParse(req.body);
  if (!parsed.success) return invalid(res, parsed.error);
  res.json(saveSettings(parsed.data));
});
adminRouter.get("/settings/defaults", (_req, res) => res.json(DEFAULT_SETTINGS));
