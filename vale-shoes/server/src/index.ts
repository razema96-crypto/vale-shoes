import fs from "node:fs";
import path from "node:path";
import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import sharp from "sharp";
import { PORT, IS_PROD, UPLOAD_DIR, DEMO_IMAGE_DIR, CLIENT_DIST, PUBLIC_URL, DATA_DIR } from "./config.js";
import { db } from "./db.js";
import { publicRouter } from "./routes/public.js";
import { adminRouter } from "./routes/admin.js";
import { seedDemoProducts } from "./seed.js";
import { createAdmin } from "./lib/auth.js";
import { rowToProduct, getSettings } from "./lib/models.js";

seedDemoProducts();

// Optional bootstrap of the first admin from env (only when no admin exists yet).
{
  const c = (db.prepare("SELECT COUNT(*) c FROM admins").get() as { c: number }).c;
  if (c === 0) {
    const u = process.env.ADMIN_USERNAME, p = process.env.ADMIN_PASSWORD;
    if (u && p) {
      try {
        createAdmin(u, p);
        console.log(`[vale] Created admin "${u}" from environment. Remove ADMIN_PASSWORD from .env now.`);
      } catch (e) {
        console.error(`[vale] Could not create admin: ${(e as Error).message}`);
      }
    } else {
      console.warn("[vale] No admin account yet. Run `npm run create-admin` to create one.");
    }
  }
}

const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        "script-src": ["'self'"],
        "style-src": ["'self'", "'unsafe-inline'"],
        "img-src": ["'self'", "data:", "blob:"],
        "font-src": ["'self'", "data:"],
        "connect-src": ["'self'"],
        "worker-src": ["'self'", "blob:"],
        "frame-ancestors": ["'none'"],
        "upgrade-insecure-requests": IS_PROD && PUBLIC_URL.startsWith("https") ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);
app.use(express.json({ limit: "200kb" }));
app.use(cookieParser());

app.use("/api", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});
app.use("/api/admin", adminRouter);
app.use("/api", publicRouter);
app.use("/api", (_req, res) => res.status(404).json({ error: "Not found" }));

const imgCache = { maxAge: "30d", immutable: true, index: false, fallthrough: false } as const;
app.use("/uploads", express.static(UPLOAD_DIR, imgCache));
app.use("/demo-images", express.static(DEMO_IMAGE_DIR, imgCache));

/* Resized copies for grids/lists: /thumb/400/uploads/<file>.webp — generated once, cached on disk. */
const THUMB_DIR = path.join(DATA_DIR, "thumbs");
const THUMB_WIDTHS = new Set([400, 800]);
const pending = new Map<string, Promise<string | null>>();
function makeThumb(w: number, dir: string, file: string): Promise<string | null> {
  const base = dir === "uploads" ? UPLOAD_DIR : dir === "demo-images" ? DEMO_IMAGE_DIR : null;
  if (!THUMB_WIDTHS.has(w) || !base || !/^[\w.\-]+\.webp$/.test(file)) return Promise.resolve(null);
  const src = path.join(base, file);
  const out = path.join(THUMB_DIR, String(w), dir, file);
  if (fs.existsSync(out)) return Promise.resolve(out);
  if (!fs.existsSync(src)) return Promise.resolve(null);
  let job = pending.get(out);
  if (!job) {
    job = (async () => {
      fs.mkdirSync(path.dirname(out), { recursive: true });
      const tmp = `${out}.${process.pid}.tmp`;
      await sharp(src).resize({ width: w, withoutEnlargement: true }).webp({ quality: 74, effort: 4 }).toFile(tmp);
      fs.renameSync(tmp, out);
      return out;
    })().finally(() => pending.delete(out));
    pending.set(out, job);
  }
  return job;
}
app.get("/thumb/:w/:dir/:file", async (req, res) => {
  try {
    const out = await makeThumb(Number(req.params.w), String(req.params.dir), String(req.params.file));
    if (!out) return res.status(404).end();
    res.setHeader("Cache-Control", "public, max-age=2592000, immutable");
    res.type("image/webp").sendFile(out);
  } catch {
    res.status(404).end();
  }
});

/** Pre-builds the small copies in the background so the first visitor never waits. */
async function warmThumbs() {
  for (const [dir, base] of [["uploads", UPLOAD_DIR], ["demo-images", DEMO_IMAGE_DIR]] as const) {
    if (!fs.existsSync(base)) continue;
    for (const f of fs.readdirSync(base).filter((x) => x.endsWith(".webp"))) {
      for (const w of THUMB_WIDTHS) await makeThumb(w, dir, f).catch(() => null);
    }
  }
}

/* ---------------- SEO: robots + sitemap ---------------- */
app.get("/robots.txt", (_req, res) => {
  res.type("text/plain").send(`User-agent: *\nDisallow: /admin\nDisallow: /checkout\nDisallow: /cart\nDisallow: /studio\nSitemap: ${PUBLIC_URL}/sitemap.xml\n`);
});
app.get("/sitemap.xml", (_req, res) => {
  const slugs = db.prepare("SELECT slug, updated_at FROM products WHERE active = 1").all() as { slug: string; updated_at: string }[];
  const urls = ["/", "/shop", "/collections", "/about", "/contact"].map((p) => `<url><loc>${PUBLIC_URL}${p}</loc></url>`);
  for (const s of slugs)
    urls.push(`<url><loc>${PUBLIC_URL}/product/${encodeURIComponent(s.slug)}</loc><lastmod>${s.updated_at.slice(0, 10)}</lastmod></url>`);
  res.type("application/xml").send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}</urlset>`);
});

/* ---------------- Client (production build) ---------------- */
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

if (fs.existsSync(CLIENT_DIST)) {
  const indexHtml = fs.readFileSync(path.join(CLIENT_DIST, "index.html"), "utf8").replaceAll("__PUBLIC_URL__", PUBLIC_URL);
  app.use(express.static(CLIENT_DIST, { index: false, maxAge: "1h", setHeaders: (res, p) => {
    if (p.includes(`${path.sep}assets${path.sep}`)) res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  } }));

  // Server-side meta for product pages so link previews (WhatsApp, Facebook) and crawlers see real data.
  app.get("/product/:slug", (req, res) => {
    const row = db.prepare("SELECT * FROM products WHERE slug = ? AND active = 1").get(String(req.params.slug));
    if (!row) return res.status(404).send(indexHtml);
    const p = rowToProduct(row as any);
    const s = getSettings();
    const title = `${p.name} | ${s.storeName}`;
    const desc = p.description.slice(0, 160);
    const img = p.images[0] ? `${PUBLIC_URL}${p.images[0].url}` : `${PUBLIC_URL}/og-image.jpg`;
    const url = `${PUBLIC_URL}/product/${encodeURIComponent(p.slug)}`;
    const ld = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: p.name,
      description: p.description,
      image: p.images.map((i) => `${PUBLIC_URL}${i.url}`),
      brand: { "@type": "Brand", name: "VALE Shoes" },
      sku: `VALE-${p.id}`,
      ...(s.showPrices && p.price > 0
        ? {
            offers: {
              "@type": "Offer",
              url,
              priceCurrency: s.currencyCode,
              price: p.price,
              availability: p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            },
          }
        : {}),
    };
    const html = indexHtml
      .replace(/<title>.*?<\/title>/, `<title>${esc(title)}</title>`)
      .replace(/(<meta name="description" content=")[^"]*/, `$1${esc(desc)}`)
      .replace(/(<meta property="og:title" content=")[^"]*/, `$1${esc(title)}`)
      .replace(/(<meta property="og:description" content=")[^"]*/, `$1${esc(desc)}`)
      .replace(/(<meta property="og:image" content=")[^"]*/, `$1${esc(img)}`)
      .replace(/(<meta property="og:type" content=")[^"]*/, `$1product`)
      .replace(/(<meta property="og:url" content=")[^"]*/, `$1${esc(url)}`)
      .replace("</head>", `<link rel="canonical" href="${esc(url)}"><script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script></head>`);
    res.send(html);
  });

  app.get(/^\/(?!api\/|uploads\/|demo-images\/|thumb\/).*/, (_req, res) => {
    res.send(indexHtml);
  });
} else if (IS_PROD) {
  console.warn("[vale] client/dist not found — run `npm run build` at the project root.");
}

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err?.code === "LIMIT_FILE_SIZE") return res.status(413).json({ error: "حجم الصورة أكبر من 15MB." });
  if (err?.type === "entity.parse.failed") return res.status(400).json({ error: "طلب غير صالح." });
  if (err?.status === 404 || err?.statusCode === 404) return res.status(404).end();
  console.error(err);
  res.status(500).json({ error: "حدث خطأ غير متوقع في الخادم. حاول مرة أخرى." });
});

app.listen(PORT, () => {
  console.log(`[vale] API ${IS_PROD ? "+ site " : ""}listening on http://localhost:${PORT}`);
  setTimeout(() => warmThumbs().catch(() => {}), 1500);
});
