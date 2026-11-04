import { t } from "../i18n";
import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { api } from "../lib/api";
import type { PublicOrder } from "../lib/types";
import { formatPrice, pricesOn, STATUS_LABEL } from "../lib/format";
import { useCatalog } from "../store/catalog";
import { usePageMeta } from "../lib/meta";
import { EmptyState, PageLoader } from "../components/States";
import { CheckIcon } from "../components/Icons";

export default function OrderConfirmation() {
  usePageMeta({ title: t("تفاصيل الطلب"), noindex: true });
  const { code = "" } = useParams();
  const fresh = (useLocation().state as { fresh?: boolean } | null)?.fresh;
  const settings = useCatalog((s) => s.settings);
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ order: PublicOrder }>(`/orders/${encodeURIComponent(code)}`).then((r) => setOrder(r.order)).catch((e) => setError(e.message));
  }, [code]);

  if (error) return <div className="pt-32 container-lux"><EmptyState title={t("لم نجد هذا الطلب")} body={error} action={{ to: "/shop", label: t("العودة إلى المتجر") }} /></div>;
  if (!order) return <div className="pt-24"><PageLoader /></div>;
  const s = settings ? { ...settings, currencySymbol: settings.currencyCode === order.currency ? settings.currencySymbol : order.currency } : null;

  return (
    <div className="pt-28 md:pt-36 pb-24 container-lux max-w-3xl">
      {fresh && (
        <div className="grid place-items-center size-14 rounded-full bg-vale text-ink mb-8"><CheckIcon /></div>
      )}
      <h1 className="font-[family-name:var(--font-script)] text-4xl md:text-6xl leading-[1.3]">
        {fresh ? t("شكراً {name}، وصلنا طلبك", { name: order.customer.name }) : t("تفاصيل الطلب")}
      </h1>
      <p className="mt-5 text-ash leading-8">
        {t("رقم الطلب")} <span className="num text-ink font-medium">{order.code}</span>
        {fresh && t(" — احتفظي به للمتابعة. ")}
        {fresh && (order.paymentMethod === "cod"
          ? t("سيتواصل معك المتجر على رقم هاتفك لتأكيد الطلب قبل الشحن، والدفع عند الاستلام.")
          : t("إذا لم تُفتح محادثة واتساب تلقائياً، استخدمي الزر أدناه وأرسلي الرسالة لتأكيد الطلب."))}
      </p>
      <div className="mt-6 flex flex-wrap gap-3 text-[14px]">
        <span className="px-3 py-1.5 rounded-full bg-paper border border-ink/10">{t("الحالة:")} {STATUS_LABEL[order.status] ? t(STATUS_LABEL[order.status]) : order.status}</span>
        <span className="px-3 py-1.5 rounded-full bg-paper border border-ink/10">{order.paymentMethod === "cod" ? t("الدفع عند الاستلام") : t("عبر واتساب")}</span>
      </div>

      <div className="stitch my-10 opacity-60" aria-hidden="true" />
      <ul className="divide-y divide-ink/10">
        {order.items.map((it, i) => (
          <li key={i} className="flex justify-between gap-4 py-4">
            <div>
              <Link to={`/product/${it.slug}`} className="hover:underline underline-offset-4">{t(it.name)}</Link>
              <p className="text-[14px] text-ash">{t("المقاس")} <span className="num">{it.size}</span>{t("،")} {t(it.color)}{t("،")} {t("الكمية")} <span className="num">{it.qty}</span></p>
            </div>
            {pricesOn(settings) && <span className="num">{formatPrice(it.lineTotal, s)}</span>}
          </li>
        ))}
      </ul>
      {pricesOn(settings) ? <dl className="mt-6 space-y-2 border-t border-ink/10 pt-6">
        <div className="flex justify-between"><dt className="text-ash">{t("المجموع الفرعي")}</dt><dd className="num">{formatPrice(order.subtotal, s)}</dd></div>
        <div className="flex justify-between"><dt className="text-ash">{t("التوصيل")}</dt><dd className="num">{order.deliveryFee ? formatPrice(order.deliveryFee, s) : t("مجاني")}</dd></div>
        <div className="flex justify-between text-lg font-medium pt-2"><dt>{t("الإجمالي")}</dt><dd className="num">{formatPrice(order.total, s)}</dd></div>
      </dl> : <p className="mt-6 border-t border-ink/10 pt-6 text-ash leading-7">{t("سنتواصل معك لتأكيد السعر وموعد التوصيل. الدفع عند الاستلام.")}</p>}

      <div className="mt-12 flex flex-col sm:flex-row gap-3">
        {order.paymentMethod === "whatsapp" && settings?.whatsappNumber && (
          <a
            className="btn-whatsapp"
            target="_blank"
            rel="noopener noreferrer"
            href={`https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(t("مرحباً {store}، أود تأكيد طلبي رقم {code}.", { store: settings.storeName, code: order.code }) + (pricesOn(settings) ? " " + t("القيمة: {total}", { total: formatPrice(order.total, s) }) : ""))}`}
          >
            {t("فتح واتساب لتأكيد الطلب")}
          </a>
        )}
        <Link to="/shop" className="btn-dark">{t("متابعة التسوق")}</Link>
      </div>
    </div>
  );
}
