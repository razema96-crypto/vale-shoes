import { t } from "../i18n";
import { create } from "zustand";
import { api } from "../lib/api";
import type { Product, PublicSettings } from "../lib/types";
import { useCart } from "./cart";

type Status = "idle" | "loading" | "ready" | "error";

type CatalogState = {
  products: Product[];
  settings: PublicSettings | null;
  status: Status;
  error: string | null;
  cartNotice: string | null;
  load: (force?: boolean) => Promise<void>;
  dismissNotice: () => void;
};

export const useCatalog = create<CatalogState>((set, get) => ({
  products: [],
  settings: null,
  status: "idle",
  error: null,
  cartNotice: null,
  dismissNotice: () => set({ cartNotice: null }),
  load: async (force) => {
    if (!force && (get().status === "loading" || get().status === "ready")) return;
    set({ status: "loading", error: null });
    try {
      const [products, settings] = await Promise.all([
        api<Product[]>("/products"),
        api<PublicSettings>("/settings"),
      ]);
      set({ products, settings, status: "ready" });
      set({ cartNotice: reconcileCart(products) });
    } catch (e) {
      set({ status: "error", error: (e as Error).message });
    }
  },
}));

/** Keeps the persisted cart honest against the live catalog (prices, removed items, stock). */
function reconcileCart(products: Product[]): string | null {
  const cart = useCart.getState();
  const byId = new Map(products.map((p) => [p.id, p]));
  const notes: string[] = [];
  for (const line of cart.lines) {
    const p = byId.get(line.productId);
    if (!p || p.availability === "out_of_stock" || !p.sizes.includes(line.size) || !p.colors.some((c) => c.name === line.color)) {
      cart.remove(line.key);
      notes.push(t("أُزيل «{name}» من السلة لأنه لم يعد متاحاً بالمواصفات المختارة.", { name: t(line.name) }));
      continue;
    }
    if (p.price !== line.price) notes.push(t("تم تحديث سعر «{name}».", { name: t(p.name) }));
    cart.update(line.key, { price: p.price, name: p.name, maxQty: p.stockLeft });
    if (p.stockLeft && line.qty > p.stockLeft) cart.setQty(line.key, p.stockLeft);
  }
  return notes.length ? notes.join(" ") : null;
}

export function useSettings() {
  return useCatalog((s) => s.settings);
}
