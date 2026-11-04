import { t } from "../i18n";
import { Link } from "react-router-dom";
import type { Product } from "../lib/types";
import { BADGE_LABEL, formatPrice, imageFor, pricesOn, PRICE_ON_REQUEST, thumb, thumbSet } from "../lib/format";
import { useCatalog } from "../store/catalog";
import { EyeIcon } from "./Icons";

export function Badges({ p, className = "" }: { p: Product; className?: string }) {
  if (!p.badges.length && p.availability !== "out_of_stock") return null;
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {p.availability === "out_of_stock" && (
        <span className="bg-white text-ash text-[12px] px-2.5 py-1">{t("نفدت الكمية")}</span>
      )}
      {p.badges.map((b) => (
        <span key={b} className={`text-[12px] px-2.5 py-1 ${b === "bestseller" ? "bg-white text-ink" : "bg-vale text-ink"}`}>
          {t(BADGE_LABEL[b])}
        </span>
      ))}
    </div>
  );
}

export function DemoTag({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center text-[11px] px-2 py-0.5 border border-dashed border-ash/50 text-ash ${className}`} title={t("منتج تجريبي لعرض المتجر وليس من المخزون الفعلي")}>
      {t("منتج تجريبي")}
    </span>
  );
}

export function PriceTag({ p, className = "", showRequest }: { p: Product; className?: string; showRequest?: boolean }) {
  const settings = useCatalog((s) => s.settings);
  if (!pricesOn(settings) || p.price <= 0) {
    return showRequest ? <span className={`text-ash text-[0.7em] ${className}`}>{t(PRICE_ON_REQUEST)}</span> : null;
  }
  return (
    <span className={`flex items-baseline gap-2 ${className}`}>
      <span className="num" data-price={p.price}>{formatPrice(p.price, settings)}</span>
      {p.compareAtPrice && p.compareAtPrice > p.price && (
        <s className="num text-ash text-[0.85em]" aria-label={t("السعر السابق {p}", { p: formatPrice(p.compareAtPrice, settings) })}>
          {formatPrice(p.compareAtPrice, settings)}
        </s>
      )}
    </span>
  );
}

export function ProductCard({ p, onQuickView, priority }: { p: Product; onQuickView: (p: Product) => void; priority?: boolean }) {
  const first = imageFor(p);
  const second = p.images.find((i) => i.url !== first && i.color === p.images[0]?.color)?.url;
  const minS = Math.min(...p.sizes), maxS = Math.max(...p.sizes);
  return (
    <article data-reveal className="group relative flex flex-col">
      <div className="relative overflow-hidden bg-[#f5f4f0] aspect-[4/5]">
        <Link to={`/product/${p.slug}`} aria-label={t(p.name)} className="absolute inset-0">
          {first ? (
            <img
              src={thumb(first, 400)}
              srcSet={thumbSet(first)}
              sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"
              width={400}
              height={500}
              alt={t(p.name)}
              loading={priority ? "eager" : "lazy"}
              decoding="async"
              className={`zoom-img absolute inset-0 size-full object-cover ${second ? "group-hover:opacity-0" : ""} transition-opacity duration-700`}
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-ash text-sm">{t("لا توجد صورة")}</div>
          )}
          {second && (
            <img src={thumb(second, 400)} srcSet={thumbSet(second)} sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw" alt="" aria-hidden="true" loading="lazy" decoding="async" className="zoom-img absolute inset-0 size-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          )}
        </Link>
        <Badges p={p} className="absolute top-3 start-3 pointer-events-none" />
        <div className="absolute inset-x-3 bottom-3 flex gap-2 md:translate-y-3 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 md:group-focus-within:translate-y-0 md:group-focus-within:opacity-100 transition-all duration-500 ease-[var(--ease-lux)]">
          <button
            type="button"
            onClick={() => onQuickView(p)}
            aria-label={p.availability === "out_of_stock" ? t("{name} غير متوفر حالياً", { name: t(p.name) }) : t("اختيار المقاس وإضافة {name} إلى السلة", { name: t(p.name) })}
            className="flex-1 h-11 bg-white text-ink text-[14px] hover:bg-ink hover:text-white transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-60"
            disabled={p.availability === "out_of_stock"}
          >
            {p.availability === "out_of_stock" ? t("غير متوفر حالياً") : t("أضف إلى السلة")}
          </button>
          <button
            type="button"
            onClick={() => onQuickView(p)}
            className="grid size-11 place-items-center bg-white text-ink hover:bg-vale transition-colors"
            aria-label={t("نظرة سريعة على {name}", { name: t(p.name) })}
          >
            <EyeIcon className="size-5" />
          </button>
        </div>
      </div>
      <div className="pt-4 flex flex-col gap-1.5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-3">
          <h3 className="text-[15px] sm:text-[16px] leading-snug font-medium">
            <Link to={`/product/${p.slug}`} className="hover:underline underline-offset-4">{t(p.name)}</Link>
          </h3>
          <PriceTag p={p} className="shrink-0 text-[15px] sm:text-[16px]" />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[13px] text-ash">
          <div className="flex items-center gap-1.5" aria-label={t("الألوان: {list}", { list: p.colors.map((c) => t(c.name)).join(", ") })}>
            {p.colors.map((c) => (
              <span key={c.name} title={t(c.name)} className="size-3 rounded-full ring-1 ring-ink/15 ring-offset-1" style={{ background: c.hex }} />
            ))}
          </div>
          <span>
            {t("المقاسات")} <span className="num">{minS === maxS ? minS : `${minS}–${maxS}`}</span>
          </span>
        </div>
        {p.isDemo && <DemoTag className="self-start mt-1" />}
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="skeleton aspect-[4/5]" />
      <div className="skeleton h-4 mt-4 w-2/3" />
      <div className="skeleton h-3 mt-2 w-1/3" />
    </div>
  );
}
