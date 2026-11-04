import { t } from "../i18n";
import type { CartLine } from "../store/cart";
import type { PublicSettings } from "./types";
import { formatPrice, pricesOn } from "./format";

export type WhatsappCustomer = { name?: string; phone?: string; city?: string; address?: string; notes?: string };

/** Builds the order message sent to the store's WhatsApp. */
export function buildWhatsappMessage(opts: {
  lines: CartLine[];
  settings: PublicSettings;
  subtotal: number;
  deliveryFee: number;
  total: number;
  customer?: WhatsappCustomer;
  orderCode?: string;
}) {
  const { lines, settings: s, subtotal, deliveryFee, total, customer, orderCode } = opts;
  const out: string[] = [];
  out.push(t("مرحباً {store}، أرغب في طلب:", { store: s.storeName }));
  if (orderCode) out.push(`${t("رقم الطلب:")} ${orderCode}`);
  out.push("");
  lines.forEach((l, i) => {
    out.push(`${i + 1}) ${t(l.name)}`);
    out.push(`   ${t("المقاس:")} ${l.size} | ${t("اللون:")} ${t(l.color)} | ${t("الكمية:")} ${l.qty}`);
    if (pricesOn(s)) out.push(`   ${t("السعر:")} ${formatPrice(l.price, s)} × ${l.qty} = ${formatPrice(l.price * l.qty, s)}`);
  });
  out.push("");
  if (pricesOn(s)) {
    out.push(`${t("المجموع الفرعي:")} ${formatPrice(subtotal, s)}`);
    out.push(`${t("التوصيل:")} ${deliveryFee === 0 ? t("مجاني") : formatPrice(deliveryFee, s)}`);
    out.push(`${t("الإجمالي:")} ${formatPrice(total, s)}`);
  } else {
    out.push(t("أرجو تأكيد السعر وموعد التوصيل."));
  }
  const c = customer ?? {};
  const details = [
    c.name && `${t("الاسم:")} ${c.name}`,
    c.phone && `${t("الهاتف:")} ${c.phone}`,
    c.city && `${t("المدينة:")} ${c.city}`,
    c.address && `${t("العنوان:")} ${c.address}`,
    c.notes && `${t("ملاحظات:")} ${c.notes}`,
  ].filter(Boolean) as string[];
  if (details.length) {
    out.push("");
    out.push(t("بيانات التوصيل:"));
    out.push(...details);
  }
  return out.join("\n");
}

export function whatsappUrl(number: string, message: string) {
  const digits = number.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
