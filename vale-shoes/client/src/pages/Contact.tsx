import { t } from "../i18n";
import { useState } from "react";
import { usePageMeta } from "../lib/meta";
import { useCatalog } from "../store/catalog";
import { whatsappUrl } from "../lib/whatsapp";
import { WhatsappIcon } from "../components/Icons";

export default function Contact() {
  usePageMeta({ title: t("تواصل معنا"), description: t("تواصلي مع VALE Shoes عبر واتساب أو الهاتف أو وسائل التواصل.") });
  const settings = useCatalog((s) => s.settings);
  const c = settings?.contact;
  const [msg, setMsg] = useState({ name: "", body: "" });
  const [error, setError] = useState<string | null>(null);
  const hasWa = !!settings?.whatsappNumber;
  const anyContact = hasWa || c?.phone || c?.email || c?.address || c?.instagramUrl || c?.facebookUrl;

  return (
    <div className="pt-28 md:pt-36 pb-24 container-lux">
      <h1 className="font-[family-name:var(--font-script)] text-5xl md:text-7xl">{t("تواصل معنا")}</h1>
      <p className="mt-4 text-ash max-w-lg">{t("لأسئلة المقاسات، أو حالة طلبك، أو طلب لون غير متوفر — راسلينا.")}</p>
      <div className="mt-14 grid lg:grid-cols-2 gap-14 lg:gap-24">
        <div>
          {hasWa ? (
            <form
              className="space-y-7"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                if (msg.body.trim().length < 3) return setError(t("يرجى كتابة رسالتك."));
                setError(null);
                const text = `${msg.name ? `${t("أنا {name}.", { name: msg.name })}\n` : ""}${msg.body.trim()}`;
                window.open(whatsappUrl(settings!.whatsappNumber, text), "_blank", "noopener");
              }}
            >
              <h2 className="text-xl font-medium">{t("راسلينا عبر واتساب")}</h2>
              <label className="block">
                <span className="label">{t("الاسم (اختياري)")}</span>
                <input className="field" value={msg.name} onChange={(e) => setMsg({ ...msg, name: e.target.value })} autoComplete="name" />
              </label>
              <label className="block">
                <span className="label">{t("رسالتك")}</span>
                <textarea className="field min-h-32 resize-y" value={msg.body} onChange={(e) => setMsg({ ...msg, body: e.target.value })} aria-invalid={!!error || undefined} />
              </label>
              {error && <p role="alert" className="text-danger text-[14px]">{error}</p>}
              <button className="btn-whatsapp"><WhatsappIcon /> {t("إرسال عبر واتساب")}</button>
            </form>
          ) : (
            <p className="text-ash border border-dashed border-ash/40 p-5">
              {t("لم تُضف بيانات التواصل بعد. يمكن لصاحبة المتجر إضافة رقم واتساب والهاتف والبريد وروابط التواصل من لوحة التحكم.")}
            </p>
          )}
        </div>
        {anyContact && (
          <dl className="space-y-8 text-lg">
            {c?.phone && <div><dt className="label">{t("الهاتف")}</dt><dd><a className="num hover:underline" href={`tel:${c.phone.replace(/\s/g, "")}`}>{c.phone}</a></dd></div>}
            {hasWa && <div><dt className="label">{t("واتساب")}</dt><dd><a className="num hover:underline" href={`https://wa.me/${settings!.whatsappNumber}`} target="_blank" rel="noopener noreferrer">+{settings!.whatsappNumber}</a></dd></div>}
            {c?.email && <div><dt className="label">{t("البريد الإلكتروني")}</dt><dd><a className="hover:underline" href={`mailto:${c.email}`}>{c.email}</a></dd></div>}
            {c?.address && <div><dt className="label">{t("العنوان")}</dt><dd>{c.address}</dd></div>}
            {(c?.instagramUrl || c?.facebookUrl) && (
              <div>
                <dt className="label">{t("تابعينا")}</dt>
                <dd className="flex gap-6">
                  {c.facebookUrl && <a className="underline underline-offset-4" href={c.facebookUrl} target="_blank" rel="noopener noreferrer">{t("فيسبوك")}</a>}
                  {c.instagramUrl && <a className="underline underline-offset-4" href={c.instagramUrl} target="_blank" rel="noopener noreferrer">{t("إنستغرام")}</a>}
                </dd>
              </div>
            )}
          </dl>
        )}
      </div>
    </div>
  );
}
