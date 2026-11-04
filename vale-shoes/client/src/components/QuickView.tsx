import { t } from "../i18n";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { Product } from "../lib/types";
import { thumb } from "../lib/format";
import { CloseIcon } from "./Icons";
import { Badges, DemoTag, PriceTag } from "./ProductCard";
import { ProductOptions } from "./ProductOptions";

export function QuickView({ p, onClose }: { p: Product; onClose: () => void }) {
  const [color, setColor] = useState(p.colors[0]?.name ?? "");
  const [idx, setIdx] = useState(0);
  const dialog = useRef<HTMLDivElement>(null);
  const imgs = p.images.filter((i) => !i.color || i.color === color);
  const shown = imgs.length ? imgs : p.images;

  useEffect(() => setIdx(0), [color]);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    dialog.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      prev?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[80] flex items-end md:items-center justify-center md:p-6" role="dialog" aria-modal="true" aria-labelledby="qv-title">
      <button className="absolute inset-0 bg-ink/60 anim-fade" onClick={onClose} aria-label={t("إغلاق")} tabIndex={-1} />
      <div
        ref={dialog}
        tabIndex={-1}
        className="relative bg-paper w-full md:max-w-5xl max-h-[92dvh] overflow-y-auto anim-up outline-none grid md:grid-cols-2 rounded-t-3xl md:rounded-none"
      >
        <button onClick={onClose} className="absolute top-3 end-3 z-10 grid size-11 place-items-center rounded-full bg-paper/80 backdrop-blur" aria-label={t("إغلاق النافذة")}>
          <CloseIcon />
        </button>
        <div className="bg-[#f5f4f0]">
          <img src={thumb(shown[idx]?.url, 800)} alt={t(p.name)} className="w-full aspect-[4/5] object-cover" />
          {shown.length > 1 && (
            <div className="flex gap-2 p-3 justify-center">
              {shown.map((im, i) => (
                <button key={im.url} onClick={() => setIdx(i)} aria-label={t("صورة {n}", { n: i + 1 })} aria-current={i === idx} className={`size-14 overflow-hidden ${i === idx ? "ring-1 ring-ink" : "opacity-60 hover:opacity-100"}`}>
                  <img src={thumb(im.url)} alt="" className="size-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="p-6 md:p-10 flex flex-col">
          <Badges p={p} className="mb-3" />
          <p className="text-ash text-[14px]">{t(p.category)}</p>
          <h2 id="qv-title" className="h-display text-3xl mt-1">{t(p.name)}</h2>
          <PriceTag p={p} className="mt-3 text-xl" showRequest />
          {p.isDemo && <DemoTag className="self-start mt-3" />}
          <p className="mt-5 text-[15px] text-ash leading-8 line-clamp-3">{p.description}</p>
          <div className="mt-7">
            <ProductOptions p={p} color={color} onColor={setColor} />
          </div>
          <Link to={`/product/${p.slug}`} onClick={onClose} className="mt-6 text-center text-[14px] underline underline-offset-4">
            {t("عرض تفاصيل المنتج كاملة")}
          </Link>
        </div>
      </div>
    </div>
  );
}
