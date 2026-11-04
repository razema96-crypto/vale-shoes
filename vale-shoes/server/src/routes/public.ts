import crypto from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { db, tx } from "../db.js";
import {
  rowToProduct,
  toPublicProduct,
  rowToOrder,
  publicSettings,
  getSettings,
  deliveryFeeFor,
  round2,
} from "../lib/models.js";
import { rateLimit } from "../lib/auth.js";

export const publicRouter = Router();

publicRouter.get("/settings", (_req, res) => {
  res.json(publicSettings());
});

publicRouter.get("/products", (_req, res) => {
  const rows = db.prepare("SELECT * FROM products WHERE active = 1 ORDER BY created_at DESC, id DESC").all();
  const products = rows.map((r) => toPublicProduct(rowToProduct(r as any)));
  // Approved review aggregates, so cards can show real ratings only.
  const agg = db
    .prepare("SELECT product_id, COUNT(*) c, AVG(rating) a FROM reviews WHERE approved = 1 GROUP BY product_id")
    .all() as { product_id: number; c: number; a: number }[];
  const map = new Map(agg.map((x) => [x.product_id, { count: x.c, average: round2(x.a) }]));
  res.json(products.map((p) => ({ ...p, rating: map.get(p.id) ?? null })));
});

publicRouter.get("/products/:slug", (req, res) => {
  const row = db.prepare("SELECT * FROM products WHERE slug = ? AND active = 1").get(String(req.params.slug));
  if (!row) return res.status(404).json({ error: "المنتج غير موجود." });
  const product = rowToProduct(row as any);
  const reviews = db
    .prepare(
      "SELECT id, name, rating, body, created_at AS createdAt FROM reviews WHERE product_id = ? AND approved = 1 ORDER BY created_at DESC"
    )
    .all(product.id);
  const related = db
    .prepare(
      "SELECT * FROM products WHERE active = 1 AND id != ? ORDER BY (category = ?) DESC, popularity DESC LIMIT 4"
    )
    .all(product.id, product.category)
    .map((r) => toPublicProduct(rowToProduct(r as any)));
  res.json({ product: toPublicProduct(product), reviews, related });
});

/* ---------- Reviews (submitted by customers, published only after admin approval) ---------- */
const reviewSchema = z.object({
  name: z.string().trim().min(2).max(60),
  rating: z.number().int().min(1).max(5),
  body: z.string().trim().min(5).max(1000),
});

publicRouter.post(
  "/products/:slug/reviews",
  rateLimit({ windowMs: 60 * 60 * 1000, max: 5, message: "تم إرسال عدد كبير من التقييمات. حاول لاحقاً." }),
  (req, res) => {
    const parsed = reviewSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "يرجى تعبئة الاسم والتقييم ونص المراجعة." });
    const row = db.prepare("SELECT id FROM products WHERE slug = ? AND active = 1").get(String(req.params.slug)) as
      | { id: number }
      | undefined;
    if (!row) return res.status(404).json({ error: "المنتج غير موجود." });
    const { name, rating, body } = parsed.data;
    db.prepare("INSERT INTO reviews (product_id, name, rating, body) VALUES (?, ?, ?, ?)").run(row.id, name, rating, body);
    res.status(201).json({ ok: true, pending: true });
  }
);

/* ---------- Orders ---------- */
const phoneRe = /^\+?[0-9\s-]{7,20}$/;
const orderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        size: z.number(),
        color: z.string().min(1).max(40),
        qty: z.number().int().min(1).max(20),
      })
    )
    .min(1)
    .max(30),
  customer: z.object({
    name: z.string().trim().min(2).max(80),
    phone: z.string().trim().regex(phoneRe),
    city: z.string().trim().min(2).max(60),
    address: z.string().trim().min(5).max(300),
    notes: z.string().trim().max(500).optional().default(""),
  }),
  paymentMethod: z.enum(["cod", "whatsapp"]),
});

class OrderError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function orderCode() {
  const bytes = crypto.randomBytes(8);
  let s = "";
  for (const b of bytes) s += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return `VL-${s}`;
}

publicRouter.post(
  "/orders",
  rateLimit({ windowMs: 10 * 60 * 1000, max: 10, message: "عدد كبير من الطلبات في وقت قصير. حاول بعد قليل." }),
  (req, res) => {
    const parsed = orderSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "بيانات الطلب غير مكتملة. تحقق من الحقول المطلوبة.", issues: parsed.error.issues });
    }
    const { items, customer, paymentMethod } = parsed.data;
    const settings = getSettings();
    if (paymentMethod === "cod" && !settings.paymentCodEnabled)
      return res.status(400).json({ error: "الدفع عند الاستلام غير متاح حالياً." });
    if (paymentMethod === "whatsapp" && !settings.paymentWhatsappEnabled)
      return res.status(400).json({ error: "الطلب عبر واتساب غير متاح حالياً." });

    try {
      const order = tx(() => {
        const qtyByProduct = new Map<number, number>();
        const lines = items.map((it) => {
          const row = db.prepare("SELECT * FROM products WHERE id = ? AND active = 1").get(it.productId);
          if (!row) throw new OrderError("أحد المنتجات في السلة لم يعد متاحاً.");
          const p = rowToProduct(row as any);
          if (!p.sizes.includes(it.size)) throw new OrderError(`المقاس ${it.size} غير متاح لمنتج «${p.name}».`);
          if (!p.colors.some((c) => c.name === it.color)) throw new OrderError(`اللون «${it.color}» غير متاح لمنتج «${p.name}».`);
          const total = (qtyByProduct.get(p.id) ?? 0) + it.qty;
          qtyByProduct.set(p.id, total);
          if (total > p.stock)
            throw new OrderError(
              p.stock <= 0 ? `«${p.name}» نفد من المخزون.` : `الكمية المتاحة من «${p.name}» هي ${p.stock} فقط.`,
              409
            );
          return {
            productId: p.id,
            slug: p.slug,
            name: p.name,
            size: it.size,
            color: it.color,
            qty: it.qty,
            unitPrice: p.price,
            lineTotal: round2(p.price * it.qty),
          };
        });
        const subtotal = round2(lines.reduce((s, l) => s + l.lineTotal, 0));
        const deliveryFee = deliveryFeeFor(subtotal, settings);
        const total = round2(subtotal + deliveryFee);
        for (const [pid, q] of qtyByProduct) {
          db.prepare("UPDATE products SET stock = stock - ?, popularity = popularity + ?, updated_at = datetime('now') WHERE id = ?").run(q, q, pid);
        }
        const code = orderCode();
        db.prepare(
          `INSERT INTO orders (code, customer, items, subtotal, delivery_fee, total, currency, payment_method, channel)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          code,
          JSON.stringify(customer),
          JSON.stringify(lines),
          subtotal,
          deliveryFee,
          total,
          settings.currencyCode,
          paymentMethod,
          paymentMethod === "whatsapp" ? "whatsapp" : "web"
        );
        return rowToOrder(db.prepare("SELECT * FROM orders WHERE code = ?").get(code) as any);
      });
      res.status(201).json({ order: publicOrder(order) });
    } catch (e) {
      if (e instanceof OrderError) return res.status(e.status).json({ error: e.message });
      throw e;
    }
  }
);

function publicOrder(o: ReturnType<typeof rowToOrder>) {
  return {
    code: o.code,
    items: o.items,
    subtotal: o.subtotal,
    deliveryFee: o.deliveryFee,
    total: o.total,
    currency: o.currency,
    paymentMethod: o.paymentMethod,
    status: o.status,
    createdAt: o.createdAt,
    customer: { name: o.customer.name, city: o.customer.city },
  };
}

publicRouter.get("/orders/:code", (req, res) => {
  const row = db.prepare("SELECT * FROM orders WHERE code = ?").get(String(req.params.code).toUpperCase());
  if (!row) return res.status(404).json({ error: "لم يتم العثور على الطلب." });
  res.json({ order: publicOrder(rowToOrder(row as any)) });
});
