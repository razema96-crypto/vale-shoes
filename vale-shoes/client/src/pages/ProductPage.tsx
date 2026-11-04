import { t } from "../i18n";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import type { Product, Review } from "../lib/types";
import { useCatalog } from "../store/catalog";
import { formatPrice, pricesOn, thumb } from "../lib/format";
import { usePageMeta } from "../lib/meta";
import { Badges, DemoTag, PriceTag, ProductCard } from "../components/ProductCard";
import { ProductOptions } from "../components/ProductOptions";
import { QuickView } from "../components/QuickView";
import { EmptyState, PageLoader } from "../components/States";
import { ChevronIcon, StarIcon } from "../components/Icons";

type Data = { product: Product; reviews: Review[]; related: Product[] };

export default function ProductPage() {
  const { slug = "" } = useParams();
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState<{ status: number; message: string } | null>(null);
  const [color, setColor] = useState("");
  const [qv, setQv] = useState<Product | null>(null);
  const settings = useCatalog((s) => s.settings);

  const load = () => {
    setErr(null);
    setData(null);
    api<Data>(`/products/${encodeURIComponent(slug)}`)
      .then((d) => {
        setData(d);
        setColor(d.product.colors[0]?.name ?? "");
      })
      .catch((e: ApiError) => setErr({ status: e.status, message: e.message }));
  };
  useEffect(load, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const p = data?.product;
  usePageMeta({
    title: p ? t(p.name) : t("منتج"),
    description: p?.description.slice(0, 160),
    image: p?.images[0]?.url,
    jsonLd: p && settings
      ? {
          "@context": "https://schema.org",
          "@type": "Product",
          name: p.name,
          description: p.description,
          image: p.images.map((i) => new URL(i.url, location.origin).href),
          brand: { "@type": "Brand", name: "VALE Shoes" },
          category: p.category,
          sku: `VALE-${p.id}`,
          ...(pricesOn(settings) && p.price > 0
            ? {
                offers: {
                  "@type": "Offer",
                  priceCurrency: settings.currencyCode,
                  price: p.price,
                  availability: p.availability === "out_of_stock" ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
                  url: location.href,
                },
              }
            : {}),
          ...(data?.reviews.length
            ? {
                aggregateRating: {
                  "@type": "AggregateRating",
                  ratingValue: (data.reviews.reduce((a, r) => a + r.rating, 0) / data.reviews.length).toFixed(1),
                  reviewCount: data.reviews.length,
                },
              }
            : {}),
        }
      : null,
  });

  if (err?.status === 404)
    return (
      <div className="pt-32 container-lux">
        <EmptyState title={t("هذا المنتج غير متاح")} body={t("ربما أُزيل من المتجر أو تغيّر رابطه.")} action={{ to: "/shop", label: t("العودة إلى المتجر") }} />
      </div>
    );
  if (err)
    return (
      <div className="pt-32 container-lux">
        <EmptyState title={t("تعذر تحميل المنتج")} body={err.message} action={{ onClick: load, label: t("إعادة المحاولة") }} />
      </div>
    );
  if (!p) return <div className="pt-24"><PageLoader /></div>;

  return (
    <div className="pt-20 md:pt-28 pb-24">
      <nav aria-label={t("مسار التنقل")} className="container-lux text-[13px] text-ash py-4 flex items-center gap-1.5">
        <Link to="/" className="hover:text-ink">{t("الرئيسية")}</Link>
        <ChevronIcon className="size-3.5 rtl:rotate-180" />
        <Link to="/shop" className="hover:text-ink">{t("المتجر")}</Link>
        <ChevronIcon className="size-3.5 rtl:rotate-180" />
        <Link to={`/shop?category=${encodeURIComponent(p.category)}`} className="hover:text-ink">{t(p.category)}</Link>
      </nav>

      <div className="container-lux grid lg:grid-cols-[1.25fr_1fr] gap-10 lg:gap-20">
        <Gallery p={p} color={color} />

        <div className="lg:sticky lg:top-28 self-start">
          <Badges p={p} className="mb-4" />
          <h1 className="h-display font-[family-name:var(--font-script)] text-4xl md:text-5xl leading-[1.3]">{t(p.name)}</h1>
          <PriceTag p={p} className="mt-4 text-2xl" showRequest />
          {p.isDemo && (
            <p className="mt-4 flex items-start gap-2 text-[13px] text-ash">
              <DemoTag className="shrink-0" /> {t("منتج لعرض تصميم المتجر، وليس من المخزون الفعلي.")}
            </p>
          )}
          <p className="mt-6 leading-9 text-[16px] text-smoke">{p.description}</p>
          <div className="stitch my-8 opacity-60" aria-hidden="true" />
          <ProductOptions p={p} color={color} onColor={setColor} />

          <div className="mt-10 divide-y divide-ink/10 border-y border-ink/10">
            <Detail title={t("الشحن والتوصيل")} open>
              <p>{settings?.shippingInfo ? t(settings.shippingInfo) : null}</p>
              {settings && pricesOn(settings) && (
                <p className="mt-2">
                  {t("رسوم التوصيل:")} <span className="num">{settings.deliveryFee === 0 ? t("مجاني") : formatPrice(settings.deliveryFee, settings)}</span>
                  {settings.freeDeliveryThreshold > 0 && (
                    <> {t("— مجاني للطلبات من")} <span className="num">{formatPrice(settings.freeDeliveryThreshold, settings)}</span></>
                  )}
                </p>
              )}
            </Detail>
            <Detail title={t("طرق الدفع")}>
              <ul className="list-disc ps-5 space-y-1">
                {settings?.paymentMethods.cod && <li>{t("الدفع نقداً عند الاستلام")}</li>}
                {settings?.paymentMethods.whatsapp && <li>{t("تأكيد الطلب والدفع بالاتفاق عبر واتساب")}</li>}
                <li className="text-ash">{t("الدفع الإلكتروني بالبطاقة غير متاح حالياً")}</li>
              </ul>
            </Detail>
            <Detail title={t("المقاسات")}>
              <p>{t("المقاسات بالنظام الأوروبي (EU). إذا كنتِ بين مقاسين، اختاري الأكبر أو تواصلي معنا قبل الطلب.")}</p>
            </Detail>
          </div>
        </div>
      </div>

      <Reviews slug={p.slug} reviews={data.reviews} />

      {data.related.length > 0 && (
        <section className="container-lux mt-24 md:mt-32" aria-labelledby="related-title">
          <h2 id="related-title" className="font-[family-name:var(--font-script)] text-3xl md:text-5xl mb-10">{t("قد يعجبك أيضاً")}</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-10 md:gap-x-6">
            {data.related.map((r) => <ProductCard key={r.id} p={r} onQuickView={setQv} />)}
          </div>
        </section>
      )}
      {qv && <QuickView p={qv} onClose={() => setQv(null)} />}
    </div>
  );
}

function Gallery({ p, color }: { p: Product; color: string }) {
  const imgs = p.images.filter((i) => !i.color || i.color === color);
  const shown = imgs.length ? imgs : p.images;
  const [idx, setIdx] = useState(0);
  const strip = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setIdx(0);
    strip.current?.scrollTo({ left: 0 });
  }, [color, p.id]);

  if (!shown.length) return <div className="aspect-[4/5] bg-[#f5f4f0] grid place-items-center text-ash">{t("لا توجد صور لهذا المنتج")}</div>;
  return (
    <div>
      {/* mobile: swipeable strip */}
      <div
        ref={strip}
        className="lg:hidden -mx-4 sm:-mx-8 flex overflow-x-auto snap-x snap-mandatory no-scrollbar"
        onScroll={(e) => {
          const el = e.currentTarget;
          setIdx(Math.round(Math.abs(el.scrollLeft) / el.clientWidth));
        }}
        aria-label={t("صور المنتج")}
      >
        {shown.map((im, i) => (
          <img key={im.url} src={thumb(im.url, 800)} srcSet={`${thumb(im.url, 800)} 800w, ${im.url} 1600w`} sizes="100vw" alt={`${t(p.name)} — ${t("صورة {n}", { n: i + 1 })}`} className="snap-center w-full shrink-0 aspect-[4/5] object-cover bg-[#f5f4f0]" loading={i ? "lazy" : "eager"} />
        ))}
      </div>
      {shown.length > 1 && (
        <div className="lg:hidden flex justify-center gap-2 mt-4" aria-hidden="true">
          {shown.map((im, i) => <span key={im.url} className={`h-1 rounded-full transition-all ${i === idx ? "w-6 bg-ink" : "w-2 bg-ink/20"}`} />)}
        </div>
      )}

      {/* desktop: main image + thumbnails */}
      <div className="hidden lg:grid grid-cols-[88px_1fr] gap-4">
        <div className="flex flex-col gap-3">
          {shown.map((im, i) => (
            <button key={im.url} onClick={() => setIdx(i)} aria-label={t("عرض الصورة {n}", { n: i + 1 })} aria-current={i === idx} className={`aspect-[4/5] overflow-hidden transition ${i === idx ? "ring-1 ring-ink" : "opacity-55 hover:opacity-100"}`}>
              <img src={thumb(im.url)} alt="" className="size-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
        <ZoomImage src={shown[idx]?.url} alt={t(p.name)} />
      </div>
    </div>
  );
}

/** Hover-to-zoom main image (desktop). */
function ZoomImage({ src, alt }: { src?: string; alt: string }) {
  const [origin, setOrigin] = useState<string | null>(null);
  return (
    <div
      className="relative overflow-hidden bg-[#f5f4f0] aspect-[4/5] cursor-zoom-in"
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
      }}
      onMouseLeave={() => setOrigin(null)}
    >
      <img
        key={src}
        src={src}
        alt={alt}
        className="size-full object-cover anim-fade transition-transform duration-300"
        style={{ transformOrigin: origin ?? "50% 50%", transform: origin ? "scale(1.8)" : "scale(1)" }}
      />
    </div>
  );
}

function Detail({ title, children, open }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details className="group py-4" open={open}>
      <summary className="flex items-center justify-between cursor-pointer list-none py-1 text-[15px] [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronIcon className="size-4 rotate-90 group-open:-rotate-90 transition-transform" />
      </summary>
      <div className="pt-3 text-[15px] text-ash leading-8">{children}</div>
    </details>
  );
}

function Stars({ value, size = "size-4" }: { value: number; size?: string }) {
  return (
    <span className="inline-flex gap-0.5 text-ink" aria-label={t("{v} من 5", { v: value })}>
      {[1, 2, 3, 4, 5].map((i) => <StarIcon key={i} filled={i <= Math.round(value)} className={size} />)}
    </span>
  );
}

function Reviews({ slug, reviews }: { slug: string; reviews: Review[] }) {
  const [form, setForm] = useState({ name: "", rating: 0, body: "" });
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const avg = reviews.length ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.name.trim().length < 2) return setError(t("يرجى كتابة اسمك."));
    if (!form.rating) return setError(t("يرجى اختيار التقييم بالنجوم."));
    if (form.body.trim().length < 5) return setError(t("يرجى كتابة رأيك في المنتج."));
    setError(null);
    setState("sending");
    try {
      await api(`/products/${encodeURIComponent(slug)}/reviews`, { method: "POST", json: form });
      setState("sent");
    } catch (e) {
      setError((e as Error).message);
      setState("idle");
    }
  };

  return (
    <section className="container-lux mt-24 md:mt-32 grid lg:grid-cols-[1fr_1.2fr] gap-12 lg:gap-20" aria-labelledby="reviews-title">
      <div>
        <h2 id="reviews-title" className="font-[family-name:var(--font-script)] text-3xl md:text-5xl">{t("آراء العميلات")}</h2>
        {reviews.length ? (
          <p className="mt-4 flex items-center gap-3 text-ash">
            <Stars value={avg} /> {t("{avg} من {n} تقييم", { avg: avg.toFixed(1), n: reviews.length })}
          </p>
        ) : (
          <p className="mt-4 text-ash">{t("لا توجد تقييمات لهذا المنتج بعد. هل جرّبتِه؟ شاركينا رأيك.")}</p>
        )}

        {state === "sent" ? (
          <p role="status" className="mt-8 border border-ok/30 bg-ok/5 p-5 text-[15px]">
            {t("شكراً لكِ. وصل تقييمك وسيظهر هنا بعد مراجعته من المتجر.")}
          </p>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-6" noValidate>
            <div>
              <span className="label" id="rate-label">{t("تقييمك")}</span>
              <div className="flex gap-1" role="radiogroup" aria-labelledby="rate-label">
                {[1, 2, 3, 4, 5].map((i) => (
                  <button key={i} type="button" role="radio" aria-checked={form.rating === i} aria-label={t("{v} من 5", { v: i })} className="p-1.5 -m-0.5" onClick={() => setForm({ ...form, rating: i })}>
                    <StarIcon filled={i <= form.rating} className="size-6" />
                  </button>
                ))}
              </div>
            </div>
            <label className="block">
              <span className="label">{t("الاسم")}</span>
              <input className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={60} autoComplete="given-name" />
            </label>
            <label className="block">
              <span className="label">{t("رأيك في المنتج")}</span>
              <textarea className="field min-h-28 resize-y" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} maxLength={1000} />
            </label>
            {error && <p role="alert" className="text-danger text-[14px]">{error}</p>}
            <button className="btn-dark" disabled={state === "sending"}>{state === "sending" ? t("جارٍ الإرسال…") : t("إرسال التقييم")}</button>
          </form>
        )}
      </div>
      <ul className="divide-y divide-ink/10 border-t border-ink/10 lg:border-t-0 self-start">
        {reviews.map((r) => (
          <li key={r.id} className="py-6">
            <div className="flex items-center justify-between">
              <p className="font-medium">{r.name}</p>
              <Stars value={r.rating} />
            </div>
            <p className="mt-2 text-smoke leading-8">{r.body}</p>
            <p className="mt-2 text-[12px] text-ash num">{r.createdAt.slice(0, 10)}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
