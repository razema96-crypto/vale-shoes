import { t } from "../i18n";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CloseIcon, SearchIcon } from "./Icons";
import { useCatalog } from "../store/catalog";
import { formatPrice, imageFor, pricesOn, thumb } from "../lib/format";
import { normalizeArabic } from "../lib/search";

export function SearchOverlay({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const products = useCatalog((s) => s.products);
  const settings = useCatalog((s) => s.settings);
  const status = useCatalog((s) => s.status);

  useEffect(() => {
    input.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const results = useMemo(() => {
    const n = normalizeArabic(q.trim());
    if (!n) return [];
    return products.filter((p) =>
      normalizeArabic([p.name, p.category, t(p.name), t(p.category), p.description, ...p.colors.flatMap((c) => [c.name, t(c.name)])].join(" ")).includes(n)
    );
  }, [q, products]);

  return (
    <div role="dialog" aria-modal="true" aria-label={t("البحث في المتجر")} className="fixed inset-0 z-[60] bg-white text-ink anim-fade overflow-y-auto">
      <div className="container-lux pt-6 pb-16">
        <div className="flex justify-end">
          <button onClick={onClose} className="grid size-11 place-items-center -me-2" aria-label={t("إغلاق البحث")}>
            <CloseIcon />
          </button>
        </div>
        <form
          role="search"
          className="mt-6 md:mt-12 max-w-3xl mx-auto"
          onSubmit={(e) => {
            e.preventDefault();
            if (!q.trim()) return;
            navigate(`/shop?q=${encodeURIComponent(q.trim())}`);
            onClose();
          }}
        >
          <label htmlFor="site-search" className="sr-only">{t("ابحث عن حذاء")}</label>
          <div className="flex items-center gap-4 border-b border-ink/20 focus-within:border-ink pb-3">
            <SearchIcon className="text-ink/60 size-7" />
            <input
              id="site-search"
              ref={input}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("ابحث باسم الحذاء أو اللون أو النوع")}
              className="w-full bg-transparent text-2xl md:text-4xl h-display placeholder:text-ink/30 focus:outline-none"
              autoComplete="off"
            />
          </div>
        </form>

        <div className="max-w-3xl mx-auto mt-8" aria-live="polite">
          {status === "loading" && <p className="text-ink/60">{t("جارٍ تحميل المنتجات…")}</p>}
          {q.trim() && status === "ready" && results.length === 0 && (
            <p className="text-ink/70">{t("لا توجد نتائج لـ «{q}». جرّبي كلمة أخرى مثل «بوت» أو «كعب».", { q })}</p>
          )}
          <ul className="divide-y divide-ink/10">
            {results.slice(0, 8).map((p) => (
              <li key={p.id}>
                <Link to={`/product/${p.slug}`} onClick={onClose} className="flex items-center gap-4 py-4 group">
                  <img src={thumb(imageFor(p))} alt="" className="size-20 object-cover bg-[#f5f4f0]" loading="lazy" />
                  <div className="flex-1 min-w-0">
                    <p className="text-lg group-hover:underline underline-offset-4 transition-colors">{t(p.name)}</p>
                    <p className="text-sm text-ink/55">{t(p.category)}</p>
                  </div>
                  {pricesOn(settings) && p.price > 0 && <span className="num text-ink/85">{formatPrice(p.price, settings)}</span>}
                </Link>
              </li>
            ))}
          </ul>
          {results.length > 8 && (
            <Link to={`/shop?q=${encodeURIComponent(q.trim())}`} onClick={onClose} className="inline-block mt-6 underline underline-offset-8">
              {t("عرض كل النتائج ({n})", { n: results.length })}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
