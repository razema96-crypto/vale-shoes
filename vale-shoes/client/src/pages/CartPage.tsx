import { t } from "../i18n";
import { Link } from "react-router-dom";
import { useCart } from "../store/cart";
import { CartLineItem, TotalsBlock, WhatsappOrderButton } from "../components/CartParts";
import { EmptyState } from "../components/States";
import { usePageMeta } from "../lib/meta";

export default function CartPage() {
  usePageMeta({ title: t("سلة التسوق"), noindex: true });
  const { lines, clear } = useCart();
  return (
    <div className="pt-28 md:pt-36 pb-24 container-lux">
      <h1 className="font-[family-name:var(--font-script)] text-5xl md:text-7xl mb-10 md:mb-14">{t("سلة التسوق")}</h1>
      {lines.length === 0 ? (
        <EmptyState title={t("سلتك فارغة")} body={t("تصفحي المتجر واختاري حذاءك، وسيظهر هنا.")} action={{ to: "/shop", label: t("تسوق الآن") }} />
      ) : (
        <div className="grid lg:grid-cols-[1fr_400px] gap-12 lg:gap-20 items-start">
          <div>
            <ul className="divide-y divide-ink/10 border-y border-ink/10">
              {lines.map((l) => <CartLineItem key={l.key} line={l} />)}
            </ul>
            <div className="flex justify-between mt-6 text-[14px]">
              <Link to="/shop" className="underline underline-offset-4">{t("متابعة التسوق")}</Link>
              <button className="text-ash hover:text-danger underline underline-offset-4" onClick={() => confirm(t("هل تريدين إفراغ السلة؟")) && clear()}>{t("إفراغ السلة")}</button>
            </div>
          </div>
          <aside className="bg-paper p-6 md:p-8 lg:sticky lg:top-28 space-y-5" aria-label={t("ملخص الطلب")}>
            <h2 className="text-xl font-medium">{t("ملخص الطلب")}</h2>
            <TotalsBlock />
            <Link to="/checkout" className="btn-dark w-full">{t("إتمام الطلب")}</Link>
            <WhatsappOrderButton />
          </aside>
        </div>
      )}
    </div>
  );
}
