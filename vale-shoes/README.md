# VALE Shoes — متجر أحذية نسائية مصنوعة يدوياً

Arabic-first (RTL) e-commerce store for **VALE Shoes** with a 3D photo-gallery hero, a working cart and checkout,
WhatsApp ordering, and a secure admin dashboard backed by a database.

| Part | Stack |
| --- | --- |
| Storefront | React 19, TypeScript, Vite, Tailwind CSS v4, React Router |
| 3D | Three.js + React Three Fiber — shoes are **procedural 3D geometry** built in code (`client/src/three/shoe.ts`), not images |
| Backend | Node.js (≥ 22.13) + Express 5, built-in `node:sqlite` database, Zod validation, Sharp image processing |
| Auth | scrypt-hashed admin passwords, random session tokens stored hashed in the DB, `httpOnly` + `SameSite=Strict` cookie, origin check, login rate limiting |

---

## 1. Run it locally

```bash
# once
npm run install:all
cp server/.env.example server/.env        # optional in development
npm run create-admin                      # choose the admin username + password (min 10 chars)

# every time
npm run dev
```

* Store: http://localhost:5173
* Admin dashboard: http://localhost:5173/admin
* API runs on http://localhost:8787 (Vite proxies `/api`, `/uploads`, `/demo-images` to it).

On first start the database (`server/data/vale.db`) is created and **10 demo products** are seeded.

## Languages

The storefront speaks **Arabic (default), Hebrew and English** — the globe button in the header switches, and the
choice is remembered. Arabic and Hebrew are right-to-left, English left-to-right. Texts are written in Arabic in the
code and translated in `client/src/i18n/dict.ts` (Hebrew + English per Arabic text); model names («موديل 12» → Model 12 /
דגם 12), categories and colours are translated there too. A text missing from the dictionary shows in Arabic. The admin
dashboard stays Arabic.

## 2. First things to configure (Admin → الإعدادات)

| Setting | Notes |
| --- | --- |
| **WhatsApp number** | Preset to the store's number **972599414308** (wa.me/972599414308). At checkout WhatsApp is the first, pre-selected option: the order is saved, then the customer lands in the store's WhatsApp chat with the order details. International format, digits only (e.g. `9055XXXXXXXX`). Use "اختبار الرقم" to verify. |
| Currency | ISO code (`SAR`, `TRY`, `EGP`, …) + the symbol shown on the site. |
| Delivery fee / free delivery threshold | Used in the cart, checkout, WhatsApp message **and recomputed on the server** for every order. |
| Payment methods | Cash on delivery and WhatsApp ordering can each be switched on/off. |
| Shipping text, phone, email, address, Facebook / Instagram links | Shown on product pages, Contact page and footer only when filled in. |

> The default currency (SAR) and delivery fee (30) are placeholders — set your real values.

## 3. Your models (already included)

`server/seed/catalog.json` + `server/seed/images/` contain **247 VALE models** imported from the owner's photos,
sorted into categories (بوت كاحل، بوت طويل، كعب، رباط وأكسفورد، لوفر وفلات، ميول وصنادل). On the first start they are
imported automatically and **published without prices** (and the demo products are skipped).

**Prices are hidden by default** (Admin → الإعدادات → «إظهار الأسعار في الموقع» is off). The site then shows
«السعر عند الطلب», hides totals, price filters and price sorting, and the WhatsApp/checkout messages ask the store to
confirm the price. Turn the switch on once prices are set (bulk: Admin → المنتجات → select → «تغيير السعر»).
Rename models (موديل 1، موديل 2…) and set colours from each product's edit page.

## 3b. Demo products

* Demo products are stored with `is_demo = 1`, carry a visible **«منتج تجريبي»** tag on the site, and a note
  explains they are not real inventory.
* Their images are rendered from the site's own 3D shoe model (`scripts/render_demo_images.py`), not photos of VALE shoes.
* Admin → المنتجات → **حذف المنتجات التجريبية** removes them all in one click, or edit one and untick «منتج تجريبي».
* To start with an empty catalogue instead, set `SEED_DEMO_PRODUCTS=0` in `server/.env` before the first run.

## 4. Adding many products at once (200+ photos)

Admin → **استيراد صور** (`/admin/import`):

1. Drag in hundreds of photos, or pick a whole folder.
2. Each photo becomes one product. With «تجميع الصور المتشابهة الاسم» on, photos named like
   `M12-1.jpg`, `M12-2.jpg`, `M12 (3).jpg` become **one** product with three photos.
3. Set the batch defaults once: name (موديل 1، موديل 2…), category, price, sizes, colour, stock.
4. Products are created as hidden **drafts** (unless «نشر مباشرة» is on). Large photos are shrunk in the
   browser before upload and re-encoded to WebP on the server.
5. In Admin → المنتجات → «مسودات», select all and press **نشر**. Bulk actions can also change price,
   category or stock, hide, or delete many products at once.

The shop shows 24 products at a time with «عرض المزيد».

## 5. What works (end to end)

* **Catalog**: filters (category, size, colour, price range, in-stock), sorting (featured, popularity, newest, price),
  search with Arabic normalisation, quick-view modal, badges (الأكثر مبيعاً / جديد), out-of-stock / low-stock states.
* **Product page**: gallery that follows the selected colour, hover zoom, size/colour/quantity selectors —
  adding to cart is blocked until a size is chosen. Shipping & payment info from settings, related products,
  **real customer reviews** (submitted by customers, published only after admin approval — none are invented).
* **Cart**: add / remove / change size, colour, quantity; persisted in `localStorage`; re-validated against the live
  catalogue on every visit (removed items, price changes, stock limits).
* **Checkout**: validated form (name, phone, city, address, notes). The server re-validates everything,
  recalculates prices and delivery from the database, checks and decrements stock in a transaction, and returns an
  order code (`VL-XXXXXXXX`).
* **WhatsApp ordering**: from the cart (quick message) or from checkout (order is saved first, and its code + delivery
  details are included). The message lists every item with size, colour, quantity, unit/line prices, subtotal,
  delivery and total.
* **Online card payment is NOT implemented** and is shown as unavailable. Enabling it requires integrating a real
  payment gateway on the server (Stripe, Tap, PayTabs, HyperPay…).
* **Admin dashboard**: add / edit / delete products, upload images (re-encoded to WebP, 10 MB max each), assign
  images to colours, set prices & compare-at prices, sizes, colours, badges, visibility, inventory (inline edit),
  view orders and change their status (cancelling returns stock), moderate reviews, configure settings.

## 6. Deploy

Any host that runs Node ≥ 22.13 with a persistent disk (VPS, Render, Railway, Fly.io…).

```bash
npm run install:all
npm run build                       # builds client/dist and server/dist
cd server && cp .env.example .env   # then edit:
#   SESSION_SECRET=<64+ random chars>   (required in production)
#   PUBLIC_URL=https://your-domain.com
#   PORT=8787
npm run create-admin
npm start                           # serves the site + API on PORT
```

* Put it behind HTTPS (Nginx/Caddy or the platform's TLS). Cookies are `Secure` in production.
* **Persist** `server/data/` (database) and `server/uploads/` (product photos) — back them up.
* Product grids use small copies (`/thumb/400|800/...`), created automatically from the originals into `server/data/thumbs/` on first start and on demand. They can be deleted at any time; they are rebuilt.
* SEO: `/sitemap.xml` and `/robots.txt` are generated; product pages get server-side title / description /
  Open Graph image / Product JSON-LD so WhatsApp & Facebook link previews show the real product.
* Replace `client/public/og-image.jpg` if you want a different social preview image.

## 7. Project structure

```
client/                 React app
  src/three/            procedural shoe model, hero scene, studio lighting
  src/components/       header, cart drawer, product card, quick view, …
  src/pages/            home, shop, collections, product, cart, checkout, order, about, contact
  src/admin/            admin dashboard
  public/brand/         VALE logo (vectorised from the original) + brand photo
server/
  src/routes/public.ts  products, settings, reviews, orders
  src/routes/admin.ts   authenticated admin API
  src/lib/              auth, models/settings
  demo-images/          rendered demo product images
shared/demo-catalog.json  demo products (also drives the image renderer)
scripts/                dev runner, demo image renderer, end-to-end test
```

## 8. Tests

```bash
npm run dev   # in one terminal
ADMIN_USER=<user> ADMIN_PASS=<pass> python3 scripts/e2e_test.py --shots e2e-shots
```
Covers admin login, settings, filters, search, quick view, size validation, cart, checkout validation,
cash-on-delivery order, WhatsApp message contents, and admin order status — on desktop and a phone viewport.

## 9. Re-rendering demo images

```bash
pip install playwright pillow && python -m playwright install chromium
npm run dev --prefix client
python3 scripts/render_demo_images.py            # all, or --only slug1,slug2
```
