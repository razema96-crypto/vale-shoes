import { t } from "../i18n";
import { Link } from "react-router-dom";
import { useCart, cartSubtotal, MAX_QTY, type CartLine } from "../store/cart";
import { useCatalog } from "../store/catalog";
import { formatPrice, imageFor, pricesOn, thumb } from "../lib/format";
import { MinusIcon, PlusIcon, TrashIcon, WhatsappIcon } from "./Icons";
import { buildWhatsappMessage, whatsappUrl, type WhatsappCustomer } from "../lib/whatsapp";

export function QtyStepper({ value, onChange, max = MAX_QTY, size = "md", label }: {
  value: number; onChange: (n: number) => void; max?: number; size?: "sm" | "md"; label: string;
}) {
  const h = size === "sm" ? "h-10" : "h-12";
  return (
    <div className={`inline-flex ltr:flex-row-reverse items-center border border-ink/15 rounded-full ${h}`} role="group" aria-label={label}>
      <button type="button" className={`grid ${size === "sm" ? "w-10" : "w-12"} h-full place-items-center disabled:opacity-30`} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={t("زيادة الكمية")}>
        <PlusIcon className="size-4" />
      </button>
      <span className="num w-8 text-center" aria-live="polite">{value}</span>
      <button type="button" className={`grid ${size === "sm" ? "w-10" : "w-12"} h-full place-items-center disabled:opacity-30`} onClick={() => onChange(value - 1)} disabled={value <= 1} aria-label={t("إنقاص الكمية")}>
        <MinusIcon className="size-4" />
      </button>
    </div>
  );
}

/** One editable cart line: change size / colour / quantity, or remove. */
export function CartLineItem({ line, compact, onNavigate }: { line: CartLine; compact?: boolean; onNavigate?: () => void }) {
  const { setQty, remove, update } = useCart();
  const product = useCatalog((s) => s.products.find((p) => p.id === line.productId));
  const settings = useCatalog((s) => s.settings);
  return (
    <li className="flex gap-4 py-5">
      <Link to={`/product/${line.slug}`} onClick={onNavigate} className="shrink-0">
        <img src={thumb(line.image)} alt={t(line.name)} className={`${compact ? "w-22 h-28" : "w-28 h-36"} object-cover bg-[#f5f4f0]`} loading="lazy" />
      </Link>
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-start justify-between gap-3">
          <Link to={`/product/${line.slug}`} onClick={onNavigate} className="text-[16px] leading-snug hover:underline underline-offset-4">
            {t(line.name)}
          </Link>
          <button className="grid size-9 -m-1.5 place-items-center text-ash hover:text-danger" onClick={() => remove(line.key)} aria-label={t("حذف {name} من السلة", { name: t(line.name) })}>
            <TrashIcon className="size-[18px]" />
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-[14px] text-ash">
          <label className="flex items-center gap-1.5">
            <span>{t("المقاس")}</span>
            <select
              className="bg-transparent border-b border-ink/15 py-0.5 text-ink focus:outline-none focus:border-ink"
              value={line.size}
              onChange={(e) => update(line.key, { size: Number(e.target.value) })}
              disabled={!product}
            >
              {(product?.sizes ?? [line.size]).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1.5">
            <span className="size-3 rounded-full border border-ink/20" style={{ background: line.colorHex }} aria-hidden="true" />
            <span className="sr-only">{t("اللون")}</span>
            <select
              className="bg-transparent border-b border-ink/15 py-0.5 text-ink focus:outline-none focus:border-ink"
              value={line.color}
              onChange={(e) => {
                const c = product?.colors.find((x) => x.name === e.target.value);
                if (c && product) update(line.key, { color: c.name, colorHex: c.hex, image: imageFor(product, c.name) });
              }}
              disabled={!product}
            >
              {(product?.colors ?? [{ name: line.color, hex: line.colorHex }]).map((c) => (
                <option key={c.name} value={c.name}>{t(c.name)}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-auto pt-3 flex items-center justify-between gap-3">
          <QtyStepper size="sm" value={line.qty} max={Math.min(MAX_QTY, line.maxQty ?? MAX_QTY)} onChange={(n) => setQty(line.key, n)} label={t("كمية {name}", { name: t(line.name) })} />
          {pricesOn(settings) && <span className="num font-medium">{formatPrice(line.price * line.qty, settings)}</span>}
        </div>
      </div>
    </li>
  );
}

export function useTotals() {
  const lines = useCart((s) => s.lines);
  const settings = useCatalog((s) => s.settings);
  const subtotal = cartSubtotal(lines);
  const fee = !settings || !lines.length
    ? 0
    : settings.freeDeliveryThreshold > 0 && subtotal >= settings.freeDeliveryThreshold
      ? 0
      : settings.deliveryFee;
  return { lines, settings, subtotal, deliveryFee: fee, total: Math.round((subtotal + fee) * 100) / 100 };
}

export function TotalsBlock({ dark }: { dark?: boolean }) {
  const { settings, subtotal, deliveryFee, total } = useTotals();
  const muted = dark ? "text-ivory/60" : "text-ash";
  const remaining = settings && settings.freeDeliveryThreshold > 0 ? settings.freeDeliveryThreshold - subtotal : 0;
  if (!pricesOn(settings)) {
    return (
      <p className={`text-[14px] leading-7 ${muted}`}>
        {t("السعر ورسوم التوصيل يتم تأكيدهما معك هاتفياً أو عبر واتساب قبل الشحن. الدفع عند الاستلام.")}
      </p>
    );
  }
  return (
    <dl className="space-y-2 text-[15px]">
      <div className="flex justify-between"><dt className={muted}>{t("المجموع الفرعي")}</dt><dd className="num">{formatPrice(subtotal, settings)}</dd></div>
      <div className="flex justify-between">
        <dt className={muted}>{t("التوصيل")}</dt>
        <dd className="num">{deliveryFee === 0 ? <span>{t("مجاني")}</span> : formatPrice(deliveryFee, settings)}</dd>
      </div>
      {remaining > 0 && (
        <p className={`text-[13px] ${muted}`}>
          {t("أضيفي بقيمة")} <span className="num">{formatPrice(remaining, settings)}</span> {t("للحصول على توصيل مجاني.")}
        </p>
      )}
      <div className={`flex justify-between pt-3 mt-1 border-t ${dark ? "border-ivory/15" : "border-ink/10"} text-lg font-medium`}>
        <dt>{t("الإجمالي")}</dt>
        <dd className="num">{formatPrice(total, settings)}</dd>
      </div>
    </dl>
  );
}

/** "اطلب عبر واتساب" — opens WhatsApp with the cart (and customer details when given). */
export function WhatsappOrderButton({ customer, orderCode, className = "", onBeforeOpen }: {
  customer?: WhatsappCustomer; orderCode?: string; className?: string; onBeforeOpen?: () => Promise<string | undefined | false> | void;
}) {
  const { lines, settings, subtotal, deliveryFee, total } = useTotals();
  const available = !!settings?.paymentMethods.whatsapp;
  const configured = !!settings?.whatsappNumber;
  if (!available) return null;
  if (!configured) {
    return (
      <p className={`text-[13px] text-ash ${className}`}>
        {t("الطلب عبر واتساب سيتوفر بعد أن يضيف المتجر رقم واتساب من لوحة التحكم.")}
      </p>
    );
  }
  if (!onBeforeOpen) {
    const msg = settings ? buildWhatsappMessage({ lines, settings, subtotal, deliveryFee, total, customer, orderCode }) : "";
    return (
      <a href={whatsappUrl(settings!.whatsappNumber, msg)} target="_blank" rel="noopener noreferrer" className={`btn-whatsapp w-full ${className}`}>
        <WhatsappIcon />
        {t("اطلب عبر واتساب")}
      </a>
    );
  }
  return (
    <button
      type="button"
      className={`btn-whatsapp w-full ${className}`}
      disabled={!lines.length}
      onClick={async () => {
        // Open the window synchronously so mobile browsers don't block it as a popup.
        const win = window.open("about:blank", "_blank");
        let code = orderCode;
        if (onBeforeOpen) {
          const r = await onBeforeOpen();
          if (r === false) {
            win?.close();
            return;
          }
          if (typeof r === "string") code = r;
        }
        const msg = buildWhatsappMessage({ lines, settings: settings!, subtotal, deliveryFee, total, customer, orderCode: code });
        const url = whatsappUrl(settings!.whatsappNumber, msg);
        if (win) win.location.href = url;
        else window.location.href = url;
      }}
    >
      <WhatsappIcon />
      {t("اطلب عبر واتساب")}
    </button>
  );
}
