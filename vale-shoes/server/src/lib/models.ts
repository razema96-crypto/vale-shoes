import { db } from "../db.js";

export type Color = { name: string; hex: string };
export type ProductImage = { url: string; color?: string; alt?: string };
export type Badge = "bestseller" | "new";

export type Product = {
  id: number;
  slug: string;
  name: string;
  description: string;
  category: string;
  price: number;
  compareAtPrice: number | null;
  sizes: number[];
  colors: Color[];
  images: ProductImage[];
  badges: Badge[];
  stock: number;
  popularity: number;
  isDemo: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

type Row = Record<string, any>;

export function rowToProduct(r: Row): Product {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    description: r.description,
    category: r.category,
    price: r.price,
    compareAtPrice: r.compare_at_price ?? null,
    sizes: JSON.parse(r.sizes),
    colors: JSON.parse(r.colors),
    images: JSON.parse(r.images),
    badges: JSON.parse(r.badges),
    stock: r.stock,
    popularity: r.popularity,
    isDemo: !!r.is_demo,
    active: !!r.active,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/** Public shape: hides exact stock count, exposes availability only. */
export function toPublicProduct(p: Product) {
  const { stock, active, ...rest } = p;
  return {
    ...rest,
    availability: stock <= 0 ? "out_of_stock" : stock <= 3 ? "low_stock" : "in_stock",
    stockLeft: stock > 0 && stock <= 3 ? stock : undefined,
  };
}

export type OrderStatus = "new" | "confirmed" | "shipped" | "delivered" | "cancelled";
export const ORDER_STATUSES: OrderStatus[] = ["new", "confirmed", "shipped", "delivered", "cancelled"];

export function rowToOrder(r: Row) {
  return {
    id: r.id,
    code: r.code,
    customer: JSON.parse(r.customer),
    items: JSON.parse(r.items),
    subtotal: r.subtotal,
    deliveryFee: r.delivery_fee,
    total: r.total,
    currency: r.currency,
    paymentMethod: r.payment_method,
    channel: r.channel,
    status: r.status as OrderStatus,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/* ---------------- Settings ---------------- */

export type Settings = {
  storeName: string;
  currencyCode: string; // ISO code, e.g. SAR, EGP, AED, USD
  currencySymbol: string; // shown next to prices, e.g. ر.س
  deliveryFee: number;
  freeDeliveryThreshold: number; // 0 = disabled
  whatsappNumber: string; // international format digits only, e.g. 9665XXXXXXXX. EMPTY until owner sets it.
  paymentCodEnabled: boolean;
  paymentWhatsappEnabled: boolean;
  shippingInfo: string;
  contactPhone: string;
  contactEmail: string;
  contactAddress: string;
  instagramUrl: string;
  facebookUrl: string;
  heroImages: string[]; // homepage hero photos (uploaded by the owner); empty = brand photo
  heroTitle: string;
  heroSubtitle: string;
  showPrices: boolean; // false = prices hidden everywhere; price confirmed with the customer
};

export const DEFAULT_SETTINGS: Settings = {
  storeName: "VALE Shoes",
  currencyCode: "SAR",
  currencySymbol: "ر.س",
  deliveryFee: 30,
  freeDeliveryThreshold: 0,
  whatsappNumber: "972599414308", // VALE Shoes WhatsApp (wa.me/972599414308), given by the owner. Editable in admin.
  paymentCodEnabled: true,
  paymentWhatsappEnabled: true,
  shippingInfo: "يتم تأكيد الطلب هاتفياً قبل الشحن. مدة التوصيل ورسومها تختلف حسب المدينة.",
  contactPhone: "",
  contactEmail: "",
  contactAddress: "",
  instagramUrl: "https://www.instagram.com/vale_shoess2/", // VALE Shoes Instagram, given by the owner
  facebookUrl: "https://www.facebook.com/share/19oRZkEKTb/", // VALE Shoes Facebook page, given by the owner
  heroImages: [],
  heroTitle: "الأناقة تبدأ من خطواتك",
  heroSubtitle: "VALE Shoes — صناعة يدوية، جودة استثنائية، وأناقة لا تُنسى.",
  showPrices: false,
};

export function getSettings(): Settings {
  const rows = db.prepare("SELECT key, value FROM settings").all() as { key: string; value: string }[];
  const s: Settings = { ...DEFAULT_SETTINGS };
  for (const { key, value } of rows) {
    if (key in s) (s as any)[key] = JSON.parse(value);
  }
  return s;
}

export function saveSettings(patch: Partial<Settings>) {
  const stmt = db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  );
  for (const [k, v] of Object.entries(patch)) {
    if (k in DEFAULT_SETTINGS && v !== undefined) stmt.run(k, JSON.stringify(v));
  }
  return getSettings();
}

export function publicSettings() {
  const s = getSettings();
  return {
    storeName: s.storeName,
    currencyCode: s.currencyCode,
    currencySymbol: s.currencySymbol,
    deliveryFee: s.deliveryFee,
    freeDeliveryThreshold: s.freeDeliveryThreshold,
    whatsappNumber: s.whatsappNumber,
    paymentMethods: {
      cod: s.paymentCodEnabled,
      whatsapp: s.paymentWhatsappEnabled,
      online: false, // No payment gateway is integrated. Never enable without one.
    },
    shippingInfo: s.shippingInfo,
    showPrices: s.showPrices,
    hero: { images: s.heroImages, title: s.heroTitle, subtitle: s.heroSubtitle },
    contact: {
      phone: s.contactPhone,
      email: s.contactEmail,
      address: s.contactAddress,
      instagramUrl: s.instagramUrl,
      facebookUrl: s.facebookUrl,
    },
  };
}

export function deliveryFeeFor(subtotal: number, s: Settings = getSettings()) {
  if (s.freeDeliveryThreshold > 0 && subtotal >= s.freeDeliveryThreshold) return 0;
  return s.deliveryFee;
}

export const round2 = (n: number) => Math.round(n * 100) / 100;
