import { t } from "../i18n";
import { Link } from "react-router-dom";
import { Logo } from "./Logo";
import { NAV } from "./Header";
import { useCatalog } from "../store/catalog";

export function Footer() {
  const settings = useCatalog((s) => s.settings);
  const c = settings?.contact;
  const categories = [...new Set(useCatalog((s) => s.products).map((p) => p.category))];
  return (
    <footer className="bg-white text-ink mt-auto border-t border-line">
      <div className="h-[3px] bg-vale" aria-hidden="true" />
            <div className="container-lux py-16 md:py-20 grid gap-12 md:grid-cols-12">
        <div className="md:col-span-4">
          <Logo className="h-24" />
          <p className="mt-6 text-ink/70 max-w-xs leading-8">{t("أحذية نسائية مصنوعة يدوياً، قطعة قطعة.")}</p>
        </div>
        <nav aria-label={t("روابط الموقع")} className="md:col-span-2">
          <h3 className="text-ink/55 text-sm mb-4">{t("الموقع")}</h3>
          <ul className="space-y-3">
            {NAV.map((n) => (
              <li key={n.to}><Link to={n.to} className="hover:underline underline-offset-4 transition-colors">{t(n.label)}</Link></li>
            ))}
          </ul>
        </nav>
        <nav aria-label={t("الأقسام")} className="md:col-span-3">
          <h3 className="text-ink/55 text-sm mb-4">{t("الأقسام")}</h3>
          <ul className="space-y-3">
            {categories.map((cat) => (
              <li key={cat}><Link to={`/shop?category=${encodeURIComponent(cat)}`} className="hover:underline underline-offset-4 transition-colors">{t(cat)}</Link></li>
            ))}
            <li><Link to="/cart" className="hover:underline underline-offset-4 transition-colors">{t("سلة التسوق")}</Link></li>
          </ul>
        </nav>
        <div className="md:col-span-3">
          <h3 className="text-ink/55 text-sm mb-4">{t("تواصل")}</h3>
          <ul className="space-y-3">
            {c?.phone && <li><a href={`tel:${c.phone.replace(/\s/g, "")}`} className="num hover:underline underline-offset-4">{c.phone}</a></li>}
            {c?.email && <li><a href={`mailto:${c.email}`} className="hover:underline underline-offset-4">{c.email}</a></li>}
            {c?.address && <li>{c.address}</li>}
            {c?.facebookUrl && <li><a href={c.facebookUrl} target="_blank" rel="noopener noreferrer" className="hover:underline underline-offset-4">{t("فيسبوك")}</a></li>}
            {c?.instagramUrl && <li><a href={c.instagramUrl} target="_blank" rel="noopener noreferrer" className="hover:underline underline-offset-4">{t("إنستغرام")}</a></li>}
            <li><Link to="/contact" className="underline underline-offset-4 hover:underline underline-offset-4">{t("صفحة التواصل")}</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-ink/15">
        <div className="container-lux py-6 flex flex-col sm:flex-row gap-2 justify-between text-[13px] text-ink/60">
          <p>© <span className="num">{new Date().getFullYear()}</span> VALE Shoes</p>
          <p>{[settings?.paymentMethods.cod && t("الدفع عند الاستلام"), settings?.paymentMethods.whatsapp && t("الطلب عبر واتساب")].filter(Boolean).join(" · ")}</p>
        </div>
      </div>
    </footer>
  );
}
