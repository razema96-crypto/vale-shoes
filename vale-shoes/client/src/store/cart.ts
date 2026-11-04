import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type CartLine = {
  key: string; // productId|size|color
  productId: number;
  slug: string;
  name: string;
  image?: string;
  price: number;
  size: number;
  color: string;
  colorHex: string;
  qty: number;
  maxQty?: number;
};

type CartState = {
  lines: CartLine[];
  drawerOpen: boolean;
  lastAdded: string | null;
  add: (l: Omit<CartLine, "key">) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  update: (key: string, patch: Partial<Pick<CartLine, "size" | "color" | "colorHex" | "image" | "price" | "name" | "maxQty">>) => void;
  clear: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
};

export const MAX_QTY = 10;
const keyOf = (l: { productId: number; size: number; color: string }) => `${l.productId}|${l.size}|${l.color}`;

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      drawerOpen: false,
      lastAdded: null,
      add: (l) =>
        set((s) => {
          const key = keyOf(l);
          const cap = Math.min(MAX_QTY, l.maxQty ?? MAX_QTY);
          const existing = s.lines.find((x) => x.key === key);
          const lines = existing
            ? s.lines.map((x) => (x.key === key ? { ...x, qty: Math.min(cap, x.qty + l.qty), price: l.price } : x))
            : [...s.lines, { ...l, key, qty: Math.min(cap, l.qty) }];
          return { lines, drawerOpen: true, lastAdded: key };
        }),
      setQty: (key, qty) =>
        set((s) => ({
          lines: s.lines.map((x) =>
            x.key === key ? { ...x, qty: Math.max(1, Math.min(Math.min(MAX_QTY, x.maxQty ?? MAX_QTY), qty)) } : x
          ),
        })),
      remove: (key) => set((s) => ({ lines: s.lines.filter((x) => x.key !== key) })),
      update: (key, patch) =>
        set((s) => {
          const line = s.lines.find((x) => x.key === key);
          if (!line) return s;
          const next = { ...line, ...patch };
          next.key = keyOf(next);
          // Merge if the new variant already exists in the cart.
          const dup = s.lines.find((x) => x.key === next.key && x !== line);
          if (dup) {
            return {
              lines: s.lines
                .filter((x) => x !== line)
                .map((x) => (x === dup ? { ...x, qty: Math.min(MAX_QTY, x.qty + line.qty) } : x)),
            };
          }
          return { lines: s.lines.map((x) => (x === line ? next : x)) };
        }),
      clear: () => set({ lines: [] }),
      openDrawer: () => set({ drawerOpen: true }),
      closeDrawer: () => set({ drawerOpen: false }),
    }),
    {
      name: "vale-cart-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ lines: s.lines }),
    }
  )
);

export const cartCount = (lines: CartLine[]) => lines.reduce((n, l) => n + l.qty, 0);
export const cartSubtotal = (lines: CartLine[]) => Math.round(lines.reduce((n, l) => n + l.price * l.qty, 0) * 100) / 100;
