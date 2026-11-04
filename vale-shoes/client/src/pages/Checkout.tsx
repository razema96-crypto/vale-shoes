import { t } from "../i18n";
import { PREVIEW, PREVIEW_ORDER_MSG } from "../lib/preview";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useCart } from "../store/cart";
import { useCatalog } from "../store/catalog";
import { TotalsBlock, useTotals, WhatsappOrderButton } from "../components/CartParts";
import { EmptyState } from "../components/States";
import { WhatsappIcon } from "../components/Icons";
import { usePageMeta } from "../lib/meta";
import { formatPrice, pricesOn, thumb } from "../lib/format";
import { buildWhatsappMessage, whatsappUrl } from "../lib/whatsapp";
import type { PublicOrder } from "../lib/types";

type Form = { name: string; phone: string; city: string; address: string; notes: string };
const EMPTY: Form = { name: "", phone: "", city: "", address: "", notes: "" };
const SAVED = "vale-checkout-details";
const phoneRe = /^\+?[0-9\s-]{7,20}$/;

function validate(f: Form) {
  const e: Partial<Record<keyof Form, string>> = {};
  if (f.name.trim().length < 2) e.name = t("يرجى كتابة الاسم الكامل.");
  if (!phoneRe.test(f.phone.trim())) e.phone = t("يرجى كتابة رقم هاتف صحيح (أرقام فقط، يمكن أن يبدأ بـ +).");
  if (f.city.trim().length < 2) e.city = t("يرجى كتابة المدينة.");
  if (f.address.trim().length < 5) e.address = t("يرجى كتابة العنوان بالتفصيل (الحي، الشارع، رقم المبنى).");
  return e;
}

export default function Checkout() {
  usePageMeta({ title: t("إتمام الطلب"), noindex: true });
  const navigate = useNavigate();
  const settings = useCatalog((s) => s.settings);
  const { lines, total } = useTotals();
  const clear = useCart((s) => s.clear);
  const [form, setForm] = useState<Form>(() => {
    try {
      return { ...EMPTY, ...JSON.parse(localStorage.getItem(SAVED) || "{}"), notes: "" };
    } catch {
      return EMPTY;
    }
  });
  const [touched, setTouched] = useState<Partial<Record<keyof Form, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const methods = useMemo(() => {
    const m: { v: "cod" | "whatsapp"; label: string; hint: string }[] = [];
    // WhatsApp first: the order is saved, then the customer lands straight in the store's WhatsApp chat.
    if (settings?.paymentMethods.whatsapp && settings.whatsappNumber)
      m.push({ v: "whatsapp", label: t("تأكيد الطلب عبر واتساب"), hint: t("يُسجَّل طلبك ثم تُفتح محادثة واتساب برسالة جاهزة بتفاصيله.") });
    if (settings?.paymentMethods.cod) m.push({ v: "cod", label: t("الدفع عند الاستلام"), hint: t("ادفعي نقداً عند وصول الطلب.") });
    return m;
  }, [settings]);
  const [method, setMethod] = useState<"cod" | "whatsapp" | "">("");
  useEffect(() => {
    if (!method && methods.length) setMethod(methods[0].v);
  }, [methods, method]);

  const errors = validate(form);
  const show = (k: keyof Form) => (submitted || touched[k]) && errors[k];
  const field = (k: keyof Form) => ({
    value: form[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value }),
    onBlur: () => setTouched({ ...touched, [k]: true }),
    "aria-invalid": show(k) ? true : undefined,
    "aria-describedby": show(k) ? `err-${k}` : undefined,
  });

  if (!lines.length)
    return (
      <div className="pt-32 container-lux">
        <EmptyState title={t("لا توجد منتجات في السلة")} body={t("أضيفي منتجاً إلى السلة أولاً لإتمام الطلب.")} action={{ to: "/shop", label: t("تسوق الآن") }} />
      </div>
    );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setServerError(null);
    if (Object.keys(errors).length) {
      const first = Object.keys(errors)[0];
      document.getElementById(`f-${first}`)?.focus();
      return;
    }
    if (!method) return setServerError(t("لا توجد طريقة دفع متاحة حالياً. تواصلي مع المتجر."));
    // WhatsApp: open the tab now (inside the click) so it isn't blocked as a popup.
    const win = method === "whatsapp" ? window.open("about:blank", "_blank") : null;
    setSending(true);
    try {
      const { order } = await api<{ order: PublicOrder }>("/orders", {
        method: "POST",
        json: {
          items: lines.map((l) => ({ productId: l.productId, size: l.size, color: l.color, qty: l.qty })),
          customer: { name: form.name, phone: form.phone, city: form.city, address: form.address, notes: form.notes },
          paymentMethod: method,
        },
      });
      try {
        const { notes: _n, ...keep } = form;
        localStorage.setItem(SAVED, JSON.stringify(keep));
      } catch { /* storage unavailable */ }
      if (method === "whatsapp" && settings) {
        const msg = buildWhatsappMessage({
          lines, settings, subtotal: order.subtotal, deliveryFee: order.deliveryFee, total: order.total,
          customer: form, orderCode: order.code,
        });
        const url = whatsappUrl(settings.whatsappNumber, msg);
        if (win) win.location.href = url;
        else window.open(url, "_blank");
      }
      clear();
      navigate(`/order/${order.code}`, { replace: true, state: { fresh: true } });
    } catch (err) {
      win?.close();
      setServerError((err as Error).message);
      useCatalog.getState().load(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="pt-28 md:pt-36 pb-24 container-lux">
      <h1 className="font-[family-name:var(--font-script)] text-5xl md:text-7xl mb-10 md:mb-14">{t("إتمام الطلب")}</h1>
      <form onSubmit={submit} noValidate className="grid lg:grid-cols-[1fr_420px] gap-12 lg:gap-20 items-start">
        <div className="space-y-12">
          <fieldset className="space-y-7">
            <legend className="text-xl font-medium mb-6">{t("بيانات التوصيل")}</legend>
            <div className="grid sm:grid-cols-2 gap-7">
              <Field id="name" label={t("الاسم الكامل")} error={show("name")}>
                <input id="f-name" className="field" autoComplete="name" required {...field("name")} />
              </Field>
              <Field id="phone" label={t("رقم الهاتف")} error={show("phone")}>
                <input id="f-phone" className="field num w-full text-start" dir="ltr" type="tel" inputMode="tel" autoComplete="tel" placeholder="+" required {...field("phone")} />
              </Field>
            </div>
            <Field id="city" label={t("المدينة")} error={show("city")}>
              <input id="f-city" className="field" autoComplete="address-level2" required {...field("city")} />
            </Field>
            <Field id="address" label={t("العنوان الكامل")} error={show("address")}>
              <textarea id="f-address" className="field min-h-20 resize-y" autoComplete="street-address" required placeholder={t("الحي، الشارع، رقم المبنى، أقرب معلم")} {...field("address")} />
            </Field>
            <Field id="notes" label={t("ملاحظات الطلب (اختياري)")}>
              <textarea id="f-notes" className="field min-h-20 resize-y" maxLength={500} placeholder={t("مثلاً: أفضّل التوصيل مساءً")} {...field("notes")} />
            </Field>
          </fieldset>

          <fieldset>
            <legend className="text-xl font-medium mb-6">{t("طريقة الدفع")}</legend>
            <div className="space-y-3" role="radiogroup">
              {methods.map((m) => (
                <label key={m.v} className={`flex items-start gap-4 p-5 border cursor-pointer transition-colors ${method === m.v ? "border-ink bg-paper" : "border-ink/15 hover:border-ink/40"}`}>
                  <input type="radio" name="pay" className="mt-1.5 size-4 accent-ink" checked={method === m.v} onChange={() => setMethod(m.v)} />
                  <span>
                    <span className="flex items-center gap-2">{m.v === "whatsapp" && <WhatsappIcon className="size-5" />}{m.label}</span>
                    <span className="block text-[14px] text-ash mt-1">{m.hint}</span>
                  </span>
                </label>
              ))}
              <div className="flex items-start gap-4 p-5 border border-dashed border-ink/15 text-ash" aria-disabled="true">
                <input type="radio" disabled className="mt-1.5 size-4" />
                <span>
                  {t("الدفع الإلكتروني بالبطاقة")}
                  <span className="block text-[14px] mt-1">{t("غير متاح حالياً.")}</span>
                </span>
              </div>
              {!methods.length && settings && (
                <p className="text-danger text-[14px]">{t("لا توجد طريقة دفع مفعّلة حالياً. يرجى التواصل مع المتجر.")}</p>
              )}
            </div>
          </fieldset>
        </div>

        <aside className="bg-paper p-6 md:p-8 lg:sticky lg:top-28 space-y-6" aria-label={t("ملخص الطلب")}>
          <h2 className="text-xl font-medium">{t("طلبك")}</h2>
          <ul className="space-y-4">
            {lines.map((l) => (
              <li key={l.key} className="flex gap-3 text-[14px]">
                <img src={thumb(l.image)} alt="" className="w-14 h-[70px] object-cover bg-[#f5f4f0]" />
                <div className="flex-1 min-w-0">
                  <p className="truncate">{t(l.name)}</p>
                  <p className="text-ash">{t("المقاس")} <span className="num">{l.size}</span>{t("،")} {t(l.color)}{t("،")} {t("الكمية")} <span className="num">{l.qty}</span></p>
                </div>
                {pricesOn(settings) && <span className="num">{formatPrice(l.price * l.qty, settings)}</span>}
              </li>
            ))}
          </ul>
          <Link to="/cart" className="inline-block text-[14px] underline underline-offset-4 text-ash">{t("تعديل السلة")}</Link>
          <TotalsBlock />
          {PREVIEW && <p className="text-[14px] border border-vale bg-vale-soft p-3 leading-7">{method === "whatsapp" ? t("هذه نسخة معاينة: الطلب لا يُسجَّل في لوحة التحكم، لكن الزر يفتح محادثة واتساب المتجر برسالة الطلب.") : t(PREVIEW_ORDER_MSG)}</p>}
          {serverError && <p role="alert" className="text-danger text-[14px] border border-danger/30 bg-danger/5 p-3">{serverError}</p>}
          {PREVIEW && method === "whatsapp" ? <WhatsappOrderButton customer={form} /> : <button type="submit" className={method === "whatsapp" ? "btn-whatsapp w-full" : "btn-dark w-full"} disabled={sending || !methods.length}>
            {sending ? t("جارٍ إرسال الطلب…") : method === "whatsapp" ? (<><WhatsappIcon /> {t("اطلب عبر واتساب")}</>) : pricesOn(settings) ? (<>{t("تأكيد الطلب —")} <span className="num">{formatPrice(total, settings)}</span></>) : t("تأكيد الطلب")}
          </button>}
          <p className="text-[12px] text-ash leading-6">
            {t("بالضغط على الزر يُرسَل طلبك إلى المتجر ويُحجز المخزون. لا يتم خصم أي مبلغ إلكترونياً.")}
          </p>
        </aside>
      </form>
    </div>
  );
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string | false; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={`f-${id}`} className="label">{label}</label>
      {children}
      {error && <p id={`err-${id}`} className="text-danger text-[13px] mt-1.5">{error}</p>}
    </div>
  );
}
