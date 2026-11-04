import { t } from "../i18n";
import { Link } from "react-router-dom";
import { useCatalog } from "../store/catalog";

export function LoadError({ message }: { message?: string }) {
  const load = useCatalog((s) => s.load);
  const err = useCatalog((s) => s.error);
  return (
    <div role="alert" className="border border-danger/30 bg-danger/5 p-6 md:p-8 text-center">
      <p className="text-lg">{t("تعذر تحميل المنتجات")}</p>
      <p className="text-ash mt-1 text-[15px]">{message || err || t("حدث خطأ أثناء الاتصال بالمتجر.")}</p>
      <button className="btn-dark mt-5" onClick={() => load(true)}>{t("إعادة المحاولة")}</button>
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: { to: string; label: string } | { onClick: () => void; label: string } }) {
  return (
    <div className="text-center py-20 px-6">
      <div className="stitch w-16 mx-auto mb-8" aria-hidden="true" />
      <p className="text-xl">{title}</p>
      {body && <p className="text-ash mt-2 max-w-md mx-auto">{body}</p>}
      {action && ("to" in action ? (
        <Link to={action.to} className="btn-dark mt-7">{action.label}</Link>
      ) : (
        <button onClick={action.onClick} className="btn-dark mt-7">{action.label}</button>
      ))}
    </div>
  );
}

/** Shown while the catalogue still contains the placeholder demo products. */
export function DemoNotice({ className = "" }: { className?: string }) {
  const n = useCatalog((s) => s.products.filter((p) => p.isDemo).length);
  if (!n) return null;
  return (
    <p className={`text-[13px] text-ash border border-dashed border-ash/40 px-4 py-3 ${className}`}>
      {t("المنتجات الموسومة «منتج تجريبي» ({n}) معروضة لمعاينة تصميم المتجر فقط، وصورها مولّدة من نموذج ثلاثي الأبعاد، وليست من المخزون الفعلي.", { n })}
    </p>
  );
}

export function PageLoader() {
  return (
    <div className="min-h-[60vh] grid place-items-center" role="status" aria-label={t("جارٍ التحميل")}>
      <div className="stitch w-24 animate-pulse" />
    </div>
  );
}
