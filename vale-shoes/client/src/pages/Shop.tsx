import { t } from "../i18n";
import { pricesOn } from "../lib/format";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useCatalog } from "../store/catalog";
import { ProductCard, ProductCardSkeleton } from "../components/ProductCard";
import { QuickView } from "../components/QuickView";
import { DemoNotice, EmptyState, LoadError } from "../components/States";
import { CloseIcon, FilterIcon } from "../components/Icons";
import { usePageMeta } from "../lib/meta";
import { normalizeArabic } from "../lib/search";
import type { Product } from "../lib/types";

const SORTS = [
  { v: "featured", label: "المميزة" },
  { v: "popular", label: "الأكثر طلباً" },
  { v: "newest", label: "الأحدث" },
  { v: "price-asc", label: "السعر: من الأقل" },
  { v: "price-desc", label: "السعر: من الأعلى" },
];

const CAT_ORDER = ["كعب", "بوت كاحل", "بوت طويل", "لوفر وفلات", "رباط وأكسفورد", "ميول وصنادل"];

export default function Shop() {
  const { products, status, settings } = useCatalog();
  const [sp, setSp] = useSearchParams();
  const [qv, setQv] = useState<Product | null>(null);
  const [sheet, setSheet] = useState(false);

  const category = sp.get("category") || "";
  const sizes = (sp.get("sizes") || "").split(",").filter(Boolean).map(Number);
  const colors = (sp.get("colors") || "").split(",").filter(Boolean);
  const min = sp.get("min") ? Number(sp.get("min")) : null;
  const max = sp.get("max") ? Number(sp.get("max")) : null;
  const inStock = sp.get("stock") === "1";
  const q = sp.get("q") || "";
  const sort = sp.get("sort") || "featured";

  usePageMeta({
    title: category ? `${t(category)} — ${t("المتجر")}` : t("المتجر"),
    description: t("تسوقي أحذية VALE النسائية المصنوعة يدوياً حسب النوع والمقاس واللون والسعر."),
  });

  const facets = useMemo(() => {
    const counts = new Map<string, number>();
    products.forEach((p) => counts.set(p.category, (counts.get(p.category) ?? 0) + 1));
    const cats = [...counts.keys()].sort((a, b) => {
      const ia = CAT_ORDER.indexOf(a), ib = CAT_ORDER.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || (counts.get(b)! - counts.get(a)!);
    });
    const allSizes = [...new Set(products.flatMap((p) => p.sizes))].sort((a, b) => a - b);
    const cmap = new Map<string, string>();
    products.forEach((p) => p.colors.forEach((c) => !cmap.has(c.name) && cmap.set(c.name, c.hex)));
    const prices = products.map((p) => p.price);
    return {
      cats,
      counts,
      sizes: allSizes,
      colors: [...cmap.entries()].map(([name, hex]) => ({ name, hex })),
      priceMin: prices.length ? Math.min(...prices) : 0,
      priceMax: prices.length ? Math.max(...prices) : 0,
    };
  }, [products]);

  const list = useMemo(() => {
    const nq = normalizeArabic(q.trim());
    let r = products.filter(
      (p) =>
        (!category || p.category === category) &&
        (!sizes.length || sizes.some((s) => p.sizes.includes(s))) &&
        (!colors.length || colors.some((c) => p.colors.some((x) => x.name === c))) &&
        (min == null || p.price >= min) &&
        (max == null || p.price <= max) &&
        (!inStock || p.availability !== "out_of_stock") &&
        (!nq || normalizeArabic(`${p.name} ${p.category} ${t(p.name)} ${t(p.category)} ${p.description} ${p.colors.map((c) => `${c.name} ${t(c.name)}`).join(" ")}`).includes(nq))
    );
    const byStock = (a: Product, b: Product) => Number(a.availability === "out_of_stock") - Number(b.availability === "out_of_stock");
    r = [...r].sort((a, b) => {
      switch (sort) {
        case "popular": return b.popularity - a.popularity;
        case "newest": return b.createdAt.localeCompare(a.createdAt) || b.id - a.id;
        case "price-asc": return a.price - b.price;
        case "price-desc": return b.price - a.price;
        default: return byStock(a, b) || Number(b.badges.includes("bestseller")) - Number(a.badges.includes("bestseller")) || b.popularity - a.popularity || a.id - b.id;
      }
    });
    return r;
  }, [products, category, sizes.join(), colors.join(), min, max, inStock, q, sort]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k: string, v: string | null) => {
    const n = new URLSearchParams(sp);
    if (v === null || v === "") n.delete(k);
    else n.set(k, v);
    setSp(n, { replace: true });
  };
  const toggleList = (k: string, list: (string | number)[], v: string | number) => {
    const next = list.includes(v as never) ? list.filter((x) => x !== v) : [...list, v];
    set(k, next.join(","));
  };
  const activeCount = [sizes.length, colors.length, min != null || max != null, inStock].filter(Boolean).length;
  const grouped = !category && !q && !activeCount && sort === "featured";
  const pickCategory = (c: string | null) => {
    set("category", c);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const clearAll = () => setSp(new URLSearchParams(q ? { q } : {}), { replace: true });

  useEffect(() => {
    document.body.style.overflow = sheet ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sheet]);

  const filters = (
    <div className="space-y-9">
      <FilterGroup title={t("المقاس")}>
        <div className="flex flex-wrap gap-2">
          {facets.sizes.map((s) => (
            <button key={s} className="chip num" aria-pressed={sizes.includes(s)} onClick={() => toggleList("sizes", sizes, s)}>{s}</button>
          ))}
        </div>
      </FilterGroup>
      {facets.colors.length > 1 && (
      <FilterGroup title={t("اللون")}>
        <div className="flex flex-wrap gap-2">
          {facets.colors.map((c) => (
            <button key={c.name} className="chip gap-2" aria-pressed={colors.includes(c.name)} onClick={() => toggleList("colors", colors, c.name)}>
              <span className="size-3.5 rounded-full ring-1 ring-current/30" style={{ background: c.hex }} aria-hidden="true" />
              {t(c.name)}
            </button>
          ))}
        </div>
      </FilterGroup>
      )}
      {pricesOn(settings) && <FilterGroup title={`${t("السعر")} (${settings?.currencySymbol ?? ""})`}>
        <div className="flex items-center gap-3">
          <label className="flex-1">
            <span className="label">{t("من")}</span>
            <input type="number" inputMode="numeric" min={0} className="field num text-start" placeholder={String(facets.priceMin)} value={min ?? ""} onChange={(e) => set("min", e.target.value)} />
          </label>
          <span className="text-ash mt-5">—</span>
          <label className="flex-1">
            <span className="label">{t("إلى")}</span>
            <input type="number" inputMode="numeric" min={0} className="field num text-start" placeholder={String(facets.priceMax)} value={max ?? ""} onChange={(e) => set("max", e.target.value)} />
          </label>
        </div>
      </FilterGroup>}
      <label className="flex items-center gap-3 cursor-pointer">
        <input type="checkbox" className="size-5 accent-ink" checked={inStock} onChange={(e) => set("stock", e.target.checked ? "1" : null)} />
        <span>{t("المتوفر فقط")}</span>
      </label>
      {activeCount > 0 && (
        <button onClick={clearAll} className="text-[14px] underline underline-offset-4 text-ash hover:text-ink">{t("مسح كل الفلاتر")}</button>
      )}
    </div>
  );

  return (
    <div className="pt-28 md:pt-36 pb-24">
      <div className="container-lux">
        <header className="text-center mb-8 md:mb-12" data-reveal>
          <p className="latin text-[19px] md:text-[22px] text-gold">{category ? "The Collection" : "VALE Collection"}</p>
          <h1 className="h-display mt-1 text-[2.8rem] md:text-7xl leading-[1.3]">{category ? t(category) : t("تسوقي الموديلات")}</h1>
          <span className="rule mx-auto mt-4" aria-hidden="true" />
          <p className="mt-4 text-ash text-[15px]">
            {status === "ready" && (<><span className="num">{category ? list.length : products.length}</span> {t("موديل مصنوع يدوياً")}</>)}
          </p>
          {q && (
            <p className="mt-3 text-ash">
              {t("نتائج البحث عن «{q}»", { q })} <button className="underline underline-offset-4 ms-2" onClick={() => set("q", null)}>{t("إلغاء البحث")}</button>
            </p>
          )}
        </header>

        {/* Category tabs + tools — sticky */}
        <div className="sticky top-16 md:top-[76px] z-30 -mx-4 px-4 sm:mx-0 sm:px-0 bg-ivory border-b border-ink/10 mb-10 md:mb-14">
          <nav className="flex gap-1 md:gap-2 overflow-x-auto no-scrollbar md:justify-center pt-2" aria-label={t("أنواع الأحذية")}>
            {[{ c: "", label: "الكل", n: products.length }, ...facets.cats.map((c) => ({ c, label: c, n: facets.counts.get(c) ?? 0 }))].map((tab) => {
              const on = (category || "") === tab.c;
              return (
                <button
                  key={tab.c || "all"}
                  onClick={() => pickCategory(tab.c || null)}
                  aria-current={on ? "page" : undefined}
                  className={`shrink-0 relative px-3 md:px-4 h-12 text-[15px] whitespace-nowrap transition-colors ${on ? "text-ink font-medium" : "text-ash hover:text-ink"}`}
                >
                  {t(tab.label)} <span className="num text-[12px] text-ash ms-0.5">{tab.n}</span>
                  <span className={`absolute inset-x-3 bottom-0 h-[2px] bg-vale transition-transform duration-500 origin-center ${on ? "scale-x-100" : "scale-x-0"}`} aria-hidden="true" />
                </button>
              );
            })}
          </nav>
          <div className="flex items-center justify-between gap-4 h-12 border-t border-ink/5">
            <button className="inline-flex items-center gap-2 h-11 text-[14px]" onClick={() => setSheet(true)} aria-haspopup="dialog">
              <FilterIcon className="size-5" /> {t("المقاس واللون")} {activeCount > 0 && <span className="num grid place-items-center size-5 rounded-full bg-ink text-ivory text-[11px]">{activeCount}</span>}
            </button>
            <label className="flex items-center gap-2 text-[14px]">
              <span className="text-ash hidden sm:inline">{t("ترتيب حسب")}</span>
              <select value={sort} onChange={(e) => set("sort", e.target.value === "featured" ? null : e.target.value)} className="bg-transparent h-11 pe-2 focus:outline-none cursor-pointer" aria-label={t("ترتيب المنتجات")}>
                {SORTS.filter((s) => pricesOn(settings) || !s.v.startsWith("price")).map((s) => <option key={s.v} value={s.v}>{t(s.label)}</option>)}
              </select>
            </label>
          </div>
        </div>

        {status === "error" ? (
          <LoadError />
        ) : status !== "ready" ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-3 gap-y-10 md:gap-x-6">
            {Array.from({ length: 8 }, (_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        ) : products.length === 0 ? (
          <EmptyState title={t("لا توجد منتجات بعد")} body={t("ستظهر المنتجات هنا فور إضافتها من لوحة التحكم.")} />
        ) : list.length === 0 ? (
          <EmptyState title={t("لا توجد منتجات مطابقة")} body={t("جرّبي إزالة بعض الفلاتر أو اختيار مقاس آخر.")} action={{ onClick: clearAll, label: t("مسح الفلاتر") }} />
        ) : grouped ? (
          <div className="space-y-20 md:space-y-28">
            {facets.cats.map((c, gi) => {
              const items = list.filter((p) => p.category === c);
              if (!items.length) return null;
              return (
                <section key={c} aria-labelledby={`g-${gi}`} className="shop-group">
                  <div className="flex items-end justify-between gap-4 mb-8 md:mb-10 pb-4 border-b border-ink/10" data-reveal>
                    <div>
                      <p className="latin text-gold text-[15px] num">{String(gi + 1).padStart(2, "0")}</p>
                      <h2 id={`g-${gi}`} className="h-display text-[2rem] md:text-[2.8rem] leading-[1.3]">{t(c)}</h2>
                      <p className="text-ash text-[13px] mt-1"><span className="num">{items.length}</span> {t("موديل")}</p>
                    </div>
                    <button onClick={() => pickCategory(c)} className="shrink-0 inline-flex items-center gap-2 text-[14px] md:text-[15px] border-b border-ink pb-1 hover:border-vale transition-colors">
                      {t("فقط {c}", { c: t(c) })} <span aria-hidden="true" className="rtl:rotate-0 ltr:rotate-180 inline-block">←</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-3 gap-y-12 md:gap-x-6">
                    {items.map((p, i) => <ProductCard key={p.id} p={p} onQuickView={setQv} priority={gi === 0 && i < 4} />)}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-3 gap-y-12 md:gap-x-6">
              {list.map((p, i) => <ProductCard key={p.id} p={p} onQuickView={setQv} priority={i < 4} />)}
            </div>
          </>
        )}
        <DemoNotice className="mt-16" />
      </div>

      {sheet && (
        <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label={t("تصفية المنتجات")}>
          <button className="absolute inset-0 bg-ink/50 anim-fade" onClick={() => setSheet(false)} aria-label={t("إغلاق")} tabIndex={-1} />
          <div className="absolute inset-x-0 bottom-0 max-h-[88dvh] bg-paper rounded-t-3xl flex flex-col anim-up md:inset-x-auto md:left-0 md:top-0 md:bottom-0 md:max-h-none md:w-[400px] md:rounded-none">
            <div className="flex items-center justify-between px-6 py-4 border-b border-ink/10">
              <h2 className="text-lg font-medium">{t("المقاس واللون")}</h2>
              <button className="grid size-11 place-items-center -ms-3" onClick={() => setSheet(false)} aria-label={t("إغلاق")}><CloseIcon /></button>
            </div>
            <div className="overflow-y-auto px-6 py-6">{filters}</div>
            <div className="px-6 py-4 border-t border-ink/10 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button className="btn-dark w-full" onClick={() => setSheet(false)}>
                {t("عرض {n} منتج", { n: list.length })}
              </button>
            </div>
          </div>
        </div>
      )}
      {qv && <QuickView p={qv} onClose={() => setQv(null)} />}
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="text-[14px] text-ash mb-3">{title}</legend>
      {children}
    </fieldset>
  );
}
