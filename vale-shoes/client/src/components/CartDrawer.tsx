import { t } from "../i18n";
import { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { useCart, cartCount } from "../store/cart";
import { CloseIcon, BagIcon } from "./Icons";
import { CartLineItem, TotalsBlock, WhatsappOrderButton } from "./CartParts";

export function CartDrawer() {
  const { lines, drawerOpen, closeDrawer } = useCart();
  const panel = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();

  useEffect(() => closeDrawer(), [pathname, closeDrawer]);
  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeDrawer();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      prev?.focus?.();
    };
  }, [drawerOpen, closeDrawer]);

  if (!drawerOpen) return null;
  const count = cartCount(lines);
  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label={t("سلة التسوق")}>
      <button className="absolute inset-0 bg-ink/50 anim-fade" aria-label={t("إغلاق السلة")} onClick={closeDrawer} tabIndex={-1} />
      <div
        ref={panel}
        tabIndex={-1}
        className="absolute inset-y-0 end-0 w-full max-w-[440px] bg-paper flex flex-col anim-sheet outline-none shadow-2xl"
      >
        <div className="flex items-center justify-between px-6 h-18 py-5 border-b border-ink/10">
          <h2 className="text-xl font-medium">
            {t("سلة التسوق")} <span className="text-ash text-base">(<span className="num">{count}</span>)</span>
          </h2>
          <button onClick={closeDrawer} className="grid size-11 place-items-center -ms-3" aria-label={t("إغلاق السلة")}>
            <CloseIcon />
          </button>
        </div>

        {lines.length === 0 ? (
          <div className="flex-1 grid place-items-center px-8 text-center">
            <div>
              <BagIcon className="size-12 mx-auto text-stone" strokeWidth={1} />
              <p className="mt-5 text-lg">{t("سلتك فارغة")}</p>
              <p className="mt-1 text-ash text-[15px]">{t("اختاري حذاءك الأول من المتجر وسيظهر هنا.")}</p>
              <Link to="/shop" className="btn-dark mt-7">{t("تسوق الآن")}</Link>
            </div>
          </div>
        ) : (
          <>
            <ul className="flex-1 overflow-y-auto px-6 divide-y divide-ink/10">
              {lines.map((l) => (
                <CartLineItem key={l.key} line={l} compact onNavigate={closeDrawer} />
              ))}
            </ul>
            <div className="border-t border-ink/10 px-6 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-4 bg-paper">
              <TotalsBlock />
              <Link to="/checkout" className="btn-dark w-full">{t("إتمام الطلب")}</Link>
              <WhatsappOrderButton />
              <Link to="/cart" className="block text-center text-[14px] text-ash underline underline-offset-4 hover:text-ink">
                {t("عرض السلة كاملة")}
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
