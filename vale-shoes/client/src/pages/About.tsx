import { t } from "../i18n";
import { Link } from "react-router-dom";
import { usePageMeta } from "../lib/meta";
import { Logo } from "../components/Logo";

export default function About() {
  usePageMeta({ title: t("من نحن"), description: t("VALE Shoes — علامة أحذية نسائية مصنوعة يدوياً.") });
  return (
    <div className="pb-24">
      <section className="bg-shell border-b border-line text-ink pt-36 md:pt-48 pb-20 md:pb-28">
        <div className="container-lux grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="font-[family-name:var(--font-script)] text-5xl md:text-7xl leading-[1.3]">{t("من نحن")}</h1>
            <div className="stitch w-24 my-8" aria-hidden="true" />
            <p className="text-ink/80 text-lg leading-9 max-w-lg">
              {t("VALE Shoes علامة أحذية نسائية تقوم على الصناعة اليدوية. شعارنا كعب عالٍ مرسوم بخط واحد، وتحته كلمتان تلخصان ما نفعله: Hand Made.")}
            </p>
          </div>
          <div className="flex md:justify-end">
            <Logo className="h-44 md:h-64 text-ink" />
          </div>
        </div>
      </section>
      <section className="container-lux grid md:grid-cols-2 gap-12 md:gap-20 py-20 md:py-28 items-center">
        <img src={`${import.meta.env.BASE_URL}brand/vale-store-bag.webp`} alt={t("عميلة تحمل كيس VALE Shoes الأصفر")} className="w-full aspect-[16/10] object-cover" loading="lazy" />
        <div className="space-y-6 text-[17px] leading-9 text-smoke max-w-xl">
          <h2 className="font-[family-name:var(--font-script)] text-4xl md:text-5xl text-ink">{t("الصناعة اليدوية")}</h2>
          <p>
            {t("الحذاء المصنوع يدوياً يمر بين أيدٍ تعرفه قبل أن يصل إليكِ: القص، والخياطة، والتشكيل، واللمسات الأخيرة.")}
            {t("لهذا قد تختلف كل قطعة عن أختها في تفاصيل صغيرة، وهذا جزء من طابعها.")}
          </p>
          <p>
            {t("نصمم لنساء يردن حذاءً جميلاً يمشين به فعلاً — من الكعب العالي للمناسبات، إلى البوت والفلات للأيام العادية.")}
          </p>
          <Link to="/shop" className="btn-dark mt-4">{t("تسوق الآن")}</Link>
        </div>
      </section>
    </div>
  );
}
