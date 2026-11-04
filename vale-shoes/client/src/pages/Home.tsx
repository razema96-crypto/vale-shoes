import { t } from "../i18n";
import { Link } from "react-router-dom";
import { Hero } from "../components/Hero";
import { Reveal } from "../components/Reveal";
import { SectionTitle } from "../components/SectionTitle";
import { DemoNotice } from "../components/States";
import { useCatalog } from "../store/catalog";
import { usePageMeta } from "../lib/meta";

export default function Home() {
  usePageMeta({ description: t("VALE Shoes — أحذية نسائية مصنوعة يدوياً: كعب عالٍ، بوت، وفلات. صناعة يدوية، جودة استثنائية، وأناقة لا تُنسى.") });
  const settings = useCatalog((s) => s.settings);
  return (
    <>
      <Hero />

      {/* Handmade story — the brand's own photograph */}
      <section className="bg-shell border-b border-line" aria-labelledby="craft-title">
        <div className="container-lux grid md:grid-cols-2 gap-14 md:gap-20 items-center py-20 md:py-28">
          <div data-reveal className="relative">
            <div className="absolute -bottom-5 -left-5 md:-bottom-8 md:-left-8 w-2/3 h-2/3 bg-vale" aria-hidden="true" />
            <img src={`${import.meta.env.BASE_URL}brand/vale-store-bag.webp`} alt={t("كيس VALE Shoes الأصفر بشعار الكعب العالي")} loading="lazy" className="relative w-full aspect-[4/3] object-cover object-[25%_center]" />
          </div>
          <Reveal className="max-w-lg">
            <p className="latin text-[19px] text-gold mb-1">The craft</p>
            <h2 id="craft-title" className="h-display text-[2.3rem] md:text-[3.2rem] leading-[1.3]">{t("مصنوع يدوياً، خطوة بخطوة")}</h2>
            <span className="rule mt-4 mb-8" aria-hidden="true" />
            <p className="text-smoke leading-9 text-[17px]">
              {t("في VALE لا يخرج الحذاء من خط إنتاج. يُقصّ ويُخاط ويُشكَّل باليد، لذلك تحمل كل قطعة لمسة من صنعها.")}
              {t("نصمم لامرأة تريد حذاءً جميلاً تمشي به فعلاً، لا حذاءً يبقى في العلبة.")}
            </p>
            <Link to="/about" className="btn-ghost-dark mt-10">{t("قصتنا")}</Link>
          </Reveal>
        </div>
      </section>

      {/* How ordering works — a real sequence, so it's numbered */}
      <section id="collections" className="container-lux pb-24 md:pb-32" aria-labelledby="how-title">
        <div className="pt-20 md:pt-28">
          <SectionTitle id="how-title" latin="How to order" title={t("كيف تطلبين")} align="center" />
          <ol className="grid md:grid-cols-3 gap-12 md:gap-10 text-center">
            {[
              { t: t("اختاري حذاءك"), d: t("حددي اللون والمقاس والكمية، ثم أضيفيه إلى السلة.") },
              {
                t: t("أكملي الطلب"),
                d: settings?.paymentMethods.whatsapp
                  ? t("أدخلي بيانات التوصيل في صفحة الطلب، أو أرسلي طلبك جاهزاً عبر واتساب.")
                  : t("أدخلي بيانات التوصيل في صفحة الطلب."),
              },
              {
                t: t("استلمي طلبك"),
                d: settings?.paymentMethods.cod ? t("يتواصل معك المتجر لتأكيد الطلب، وتدفعين عند الاستلام.") : t("يتواصل معك المتجر لتأكيد الطلب وموعد التوصيل."),
              },
            ].map((s, i) => (
              <li data-reveal key={s.t} className="flex flex-col items-center">
                <span className="latin num text-[44px] leading-none size-20 grid place-items-center rounded-full border border-ink/15 relative">
                  <span className="absolute -top-1 -right-1 size-5 rounded-full bg-vale" aria-hidden="true" />
                  {i + 1}
                </span>
                <h3 className="h-display text-2xl mt-6">{s.t}</h3>
                <p className="mt-2 text-ash leading-8 max-w-xs">{s.d}</p>
              </li>
            ))}
          </ol>
          <DemoNotice className="mt-20" />
        </div>
      </section>

    </>
  );
}
