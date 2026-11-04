import { t } from "../i18n";
import { Link } from "react-router-dom";
import { useCatalog } from "../store/catalog";
import { usePageMeta } from "../lib/meta";
import { imageFor, formatPrice, pricesOn, thumb } from "../lib/format";
import { EmptyState, LoadError, PageLoader } from "../components/States";

const BLURB: Record<string, string> = {
  "كعب عالٍ": "للسهرات والمناسبات، حين يكون الحذاء نقطة البداية.",
  "كعب متوسط": "ارتفاع مريح يرافقك من الصباح حتى المساء.",
  "بوت": "للخريف والشتاء، بخطوط نظيفة وكعب ثابت.",
  "فلات": "باليرينا ولوفر لأيامك الطويلة دون تنازل عن الأناقة.",
};

export default function Collections() {
  usePageMeta({ title: t("المجموعات"), description: t("مجموعات VALE Shoes: كعب عالٍ، كعب متوسط، بوت، وفلات — أحذية نسائية مصنوعة يدوياً.") });
  const { products, status, settings } = useCatalog();
  if (status === "error") return <div className="pt-32 container-lux"><LoadError /></div>;
  if (status !== "ready") return <div className="pt-24"><PageLoader /></div>;
  const cats = [...new Set(products.map((p) => p.category))];
  return (
    <div className="pt-28 md:pt-36 pb-24 container-lux">
      <h1 className="font-[family-name:var(--font-script)] text-5xl md:text-7xl">{t("المجموعات")}</h1>
      <p className="mt-4 text-ash max-w-lg">{t("كل مجموعة مصممة لمناسبة مختلفة من يومك.")}</p>
      {!cats.length && <EmptyState title={t("لا توجد مجموعات بعد")} body={t("ستظهر المجموعات فور إضافة المنتجات.")} />}
      <div className="mt-14 space-y-20 md:space-y-28">
        {cats.map((c, i) => {
          const items = products.filter((p) => p.category === c).sort((a, b) => b.popularity - a.popularity);
          const from = Math.min(...items.map((p) => p.price));
          return (
            <section key={c} className={`grid md:grid-cols-2 gap-8 md:gap-16 items-center ${i % 2 ? "md:[&>*:first-child]:order-2" : ""}`} aria-labelledby={`c-${i}`}>
              <Link to={`/shop?category=${encodeURIComponent(c)}`} className="group block overflow-hidden bg-[#f5f4f0] aspect-[4/5]">
                <img src={thumb(imageFor(items[0]), 800)} alt="" loading={i ? "lazy" : "eager"} className="zoom-img size-full object-cover" />
              </Link>
              <div>
                <h2 id={`c-${i}`} className="font-[family-name:var(--font-script)] text-4xl md:text-6xl">{t(c)}</h2>
                <div className="stitch w-20 my-6" aria-hidden="true" />
                {BLURB[c] && <p className="text-lg text-smoke leading-9 max-w-md">{t(BLURB[c])}</p>}
                <p className="mt-4 text-ash">
                  <span className="num">{items.length}</span> {items.length > 2 ? t("تصاميم") : t("تصميم")}{pricesOn(settings) && from > 0 && <> {t("— تبدأ من")} <span className="num">{formatPrice(from, settings)}</span></>}
                </p>
                <div className="mt-6 flex gap-3 overflow-x-auto no-scrollbar">
                  {items.slice(0, 4).map((p) => (
                    <Link key={p.id} to={`/product/${p.slug}`} className="shrink-0 w-20" aria-label={p.name}>
                      <img src={thumb(imageFor(p, p.colors[0]?.name))} alt="" className="w-20 aspect-[4/5] object-cover bg-[#f5f4f0]" loading="lazy" />
                    </Link>
                  ))}
                </div>
                <Link to={`/shop?category=${encodeURIComponent(c)}`} className="btn-dark mt-8">{t("عرض {c}", { c: t(c) })}</Link>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
