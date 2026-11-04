import fs from "node:fs";
import path from "node:path";
import { db } from "./db.js";
import { SERVER_ROOT, SEED_DEMO, UPLOAD_DIR } from "./config.js";

export const DEMO_ANGLES = ["hero", "side", "top"] as const;

type DemoColor = { name: string; hex: string; sole: string };
type DemoProduct = {
  slug: string; name: string; category: string; price: number; compareAtPrice: number | null;
  sizes: number[]; badges: string[]; stock: number; popularity: number; description: string; colors: DemoColor[];
};

const CATALOG = path.join(SERVER_ROOT, "seed", "catalog.json");

/**
 * Seeds the owner's real catalog (server/seed/catalog.json + seed/images) once, on a fresh database.
 * Products are created published with no price (shown as "price on request"); prices can be added later from /admin.
 */
export function seedRealCatalog(): boolean {
  if (!fs.existsSync(CATALOG)) return false;
  if (db.prepare("SELECT value FROM settings WHERE key = '_catalogSeeded'").get()) return true;
  if ((db.prepare("SELECT COUNT(*) c FROM products").get() as { c: number }).c > 0) return true;
  const data = JSON.parse(fs.readFileSync(CATALOG, "utf8")) as {
    heroImages?: string[];
    products: { name: string; description: string; category: string; price: number; sizes: number[];
      colors: { name: string; hex: string }[]; badges: string[]; stock: number; images: { url: string; alt?: string }[] }[];
  };
  const imgDir = path.join(SERVER_ROOT, "seed", "images");
  const copy = (url: string) => {
    const f = path.basename(url);
    const src = path.join(imgDir, f);
    if (fs.existsSync(src) && !fs.existsSync(path.join(UPLOAD_DIR, f))) fs.copyFileSync(src, path.join(UPLOAD_DIR, f));
  };
  const insert = db.prepare(
    `INSERT INTO products (slug, name, description, category, price, compare_at_price, sizes, colors, images, badges, stock, popularity, is_demo, active)
     VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, 0, 0, 1)`
  );
  db.exec("BEGIN");
  try {
    data.products.forEach((p, i) => {
      p.images.forEach((im) => copy(im.url));
      insert.run(`model-${i + 1}`, p.name, p.description, p.category, p.price, JSON.stringify(p.sizes), JSON.stringify(p.colors),
        JSON.stringify(p.images), JSON.stringify(p.badges), p.stock);
    });
    if (data.heroImages?.length) {
      data.heroImages.forEach(copy);
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('heroImages', ?)").run(JSON.stringify(data.heroImages));
    }
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('_catalogSeeded', 'true')").run();
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
  console.log(`[vale] Imported ${data.products.length} VALE models (published, price on request).`);
  return true;
}

/** Seeds the clearly-labelled demo catalog once, on a fresh database (only when there is no real catalog). */
export function seedDemoProducts() {
  if (seedRealCatalog()) return;
  if (!SEED_DEMO) return;
  const done = db.prepare("SELECT value FROM settings WHERE key = '_demoSeeded'").get();
  if (done) return;
  const count = (db.prepare("SELECT COUNT(*) c FROM products").get() as { c: number }).c;
  if (count > 0) return;
  const file = path.resolve(SERVER_ROOT, "..", "shared", "demo-catalog.json");
  const { products } = JSON.parse(fs.readFileSync(file, "utf8")) as { products: DemoProduct[] };
  const insert = db.prepare(
    `INSERT INTO products (slug, name, description, category, price, compare_at_price, sizes, colors, images, badges, stock, popularity, is_demo, active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)`
  );
  for (const p of products) {
    const images = p.colors.flatMap((c, ci) =>
      DEMO_ANGLES.map((a) => ({ url: `/demo-images/${p.slug}-${ci}-${a}.webp`, color: c.name, alt: `${p.name} — ${c.name}` }))
    );
    insert.run(
      p.slug, p.name, p.description, p.category, p.price, p.compareAtPrice, JSON.stringify(p.sizes),
      JSON.stringify(p.colors.map(({ name, hex }) => ({ name, hex }))), JSON.stringify(images),
      JSON.stringify(p.badges), p.stock, p.popularity
    );
  }
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('_demoSeeded', 'true')").run();
  console.log(`[vale] Seeded ${products.length} DEMO products (labelled as demo; replace them from /admin).`);
}
