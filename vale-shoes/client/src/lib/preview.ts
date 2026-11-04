import { t } from "../i18n";
/**
 * Preview build (VITE_PREVIEW=1): the storefront runs without the server, reading a saved snapshot
 * of the catalogue (preview-data.json) published next to the page. Ordering is switched off.
 */
import type { Product, PublicSettings } from "./types";

export const PREVIEW = import.meta.env.VITE_PREVIEW === "1";
export const PREVIEW_ORDER_MSG = "هذه نسخة معاينة للموقع، لذلك لا يتم إرسال الطلبات منها.";

type Snapshot = { settings: PublicSettings; products: Product[] };
let snap: Promise<Snapshot> | null = null;
const load = (): Promise<Snapshot> => (snap ??= fetch(`${import.meta.env.BASE_URL}preview-data.json`).then((r) => r.json() as Promise<Snapshot>));

export async function previewApi(path: string, method = "GET"): Promise<{ status: number; data: unknown }> {
  const { settings, products } = await load();
  if (method !== "GET") return { status: 400, data: { error: t(PREVIEW_ORDER_MSG) } };
  if (path === "/settings") return { status: 200, data: settings };
  if (path === "/products") return { status: 200, data: products };
  const m = path.match(/^\/products\/(.+)$/);
  if (m) {
    const slug = decodeURIComponent(m[1]);
    const product = products.find((p) => p.slug === slug);
    if (!product) return { status: 404, data: { error: t("المنتج غير موجود.") } };
    const related = products
      .filter((p) => p.id !== product.id)
      .sort((a, b) => Number(b.category === product.category) - Number(a.category === product.category) || a.id - b.id)
      .slice(0, 4);
    return { status: 200, data: { product, reviews: [], related } };
  }
  return { status: 404, data: { error: t("غير متاح في المعاينة.") } };
}
