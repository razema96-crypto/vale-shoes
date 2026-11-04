import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useCatalog } from "../store/catalog";
import type { AdminSettingsT } from "./types";
import { Input, Notice, Panel, Toggle } from "./ui";
import { CloseIcon } from "../components/Icons";

export function AdminSettings() {
  const [s, setS] = useState<AdminSettingsT | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    api<AdminSettingsT>("/admin/settings").then(setS).catch((e) => setErr(e.message));
  }, []);
  if (!s) return err ? <Notice kind="error">{err}</Notice> : <p className="text-ash">جارٍ التحميل…</p>;
  const up = (p: Partial<AdminSettingsT>) => {
    setOk(false);
    setS({ ...s, ...p });
  };
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      const r = await api<AdminSettingsT>("/admin/settings", { method: "PUT", json: { ...s, whatsappNumber: s.whatsappNumber.replace(/\D/g, "") } });
      setS(r);
      setOk(true);
      useCatalog.getState().load(true);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <form onSubmit={save} className="space-y-5 max-w-3xl pb-24">
      <h1 className="text-2xl">الإعدادات</h1>
      <HeroPanel s={s} up={up} />
      <Panel title="واتساب">
        <Input
          label="رقم واتساب المتجر"
          dir="ltr"
          inputMode="numeric"
          placeholder="مثال: 9665XXXXXXXX"
          value={s.whatsappNumber}
          onChange={(e) => up({ whatsappNumber: e.target.value })}
          hint="بالصيغة الدولية بدون + أو أصفار في البداية (رمز الدولة ثم الرقم). تُرسل إليه طلبات «اطلب عبر واتساب»."
        />
        {s.whatsappNumber && (
          <a className="inline-block mt-3 underline text-[14px]" target="_blank" rel="noopener noreferrer" href={`https://wa.me/${s.whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent("اختبار من لوحة تحكم VALE")}`}>
            اختبار الرقم
          </a>
        )}
      </Panel>
      <Panel title="العملة والتوصيل">
        <div className="mb-5">
          <Toggle label="إظهار الأسعار في الموقع" hint="عند الإطفاء تختفي الأسعار من الموقع كله، ويظهر «السعر عند الطلب»، ويُؤكَّد السعر مع الزبونة هاتفياً أو عبر واتساب." checked={s.showPrices} onChange={(v) => up({ showPrices: v })} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="رمز العملة (ISO)" dir="ltr" maxLength={3} value={s.currencyCode} onChange={(e) => up({ currencyCode: e.target.value.toUpperCase() })} hint="مثل SAR، AED، EGP، TRY، USD" />
          <Input label="رمز العملة الظاهر" value={s.currencySymbol} onChange={(e) => up({ currencySymbol: e.target.value })} hint="مثل ر.س، د.إ، ج.م" />
          <Input label="رسوم التوصيل" type="number" min={0} step="0.01" value={s.deliveryFee} onChange={(e) => up({ deliveryFee: Number(e.target.value) })} />
          <Input label="توصيل مجاني للطلبات من" type="number" min={0} step="1" value={s.freeDeliveryThreshold} onChange={(e) => up({ freeDeliveryThreshold: Number(e.target.value) })} hint="0 = بدون توصيل مجاني" />
        </div>
        <label className="block mt-4">
          <span className="label">معلومات الشحن (تظهر في صفحة المنتج)</span>
          <textarea className="w-full border border-ink/15 bg-white p-3 min-h-24" value={s.shippingInfo} onChange={(e) => up({ shippingInfo: e.target.value })} />
        </label>
      </Panel>
      <Panel title="طرق الدفع">
        <div className="space-y-3">
          <Toggle label="الدفع عند الاستلام" checked={s.paymentCodEnabled} onChange={(v) => up({ paymentCodEnabled: v })} />
          <Toggle label="الطلب عبر واتساب" hint="يتطلب رقم واتساب." checked={s.paymentWhatsappEnabled} onChange={(v) => up({ paymentWhatsappEnabled: v })} />
          <p className="text-[13px] text-ash">الدفع الإلكتروني بالبطاقة غير مفعّل لأنه لا توجد بوابة دفع مدمجة. يحتاج تفعيله إلى ربط بوابة دفع حقيقية (مثل Stripe أو Tap أو PayTabs) في الخادم.</p>
        </div>
      </Panel>
      <Panel title="بيانات التواصل (اختياري)">
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="اسم المتجر" value={s.storeName} onChange={(e) => up({ storeName: e.target.value })} />
          <Input label="الهاتف" dir="ltr" value={s.contactPhone} onChange={(e) => up({ contactPhone: e.target.value })} />
          <Input label="البريد الإلكتروني" dir="ltr" type="email" value={s.contactEmail} onChange={(e) => up({ contactEmail: e.target.value })} />
          <Input label="العنوان" value={s.contactAddress} onChange={(e) => up({ contactAddress: e.target.value })} />
          <Input label="رابط فيسبوك" dir="ltr" type="url" value={s.facebookUrl} onChange={(e) => up({ facebookUrl: e.target.value })} />
          <Input label="رابط إنستغرام" dir="ltr" type="url" value={s.instagramUrl} onChange={(e) => up({ instagramUrl: e.target.value })} />
        </div>
      </Panel>
      {err && <Notice kind="error">{err}</Notice>}
      {ok && <Notice kind="ok">تم حفظ الإعدادات.</Notice>}
      <button className="btn-dark" disabled={saving}>{saving ? "جارٍ الحفظ…" : "حفظ الإعدادات"}</button>
    </form>
  );
}

function HeroPanel({ s, up }: { s: AdminSettingsT; up: (p: Partial<AdminSettingsT>) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    const fd = new FormData();
    [...files].slice(0, 8 - s.heroImages.length).forEach((f) => fd.append("images", f));
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/admin/uploads", { method: "POST", body: fd, credentials: "same-origin" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "فشل الرفع");
      up({ heroImages: [...s.heroImages, ...j.urls].slice(0, 8) });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Panel title="الواجهة الرئيسية">
      <div className="space-y-4">
        <Input label="العنوان الرئيسي" value={s.heroTitle} onChange={(e) => up({ heroTitle: e.target.value })} />
        <Input label="النص تحت العنوان" value={s.heroSubtitle} onChange={(e) => up({ heroSubtitle: e.target.value })} />
        <div>
          <span className="label">صور الواجهة (حتى 8 صور، تتبدل تلقائياً)</span>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {s.heroImages.map((u, i) => (
              <div key={u} className="relative">
                <img src={u} alt="" className="w-full aspect-[4/5] object-cover rounded-t-full bg-paper" />
                <button type="button" className="absolute top-1 left-1 grid size-7 place-items-center bg-white rounded-full" aria-label="حذف الصورة" onClick={() => up({ heroImages: s.heroImages.filter((_, j) => j !== i) })}>
                  <CloseIcon className="size-3.5" />
                </button>
              </div>
            ))}
            {s.heroImages.length < 8 && (
              <label className={`grid place-items-center aspect-[4/5] border border-dashed border-ink/25 cursor-pointer hover:border-ink text-[13px] text-ash text-center p-2 ${busy ? "opacity-50 pointer-events-none" : ""}`}>
                {busy ? "جارٍ الرفع…" : "+ إضافة صور"}
                <input type="file" multiple accept="image/*" className="sr-only" onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
              </label>
            )}
          </div>
          <p className="text-[12px] text-ash mt-2">
            أفضل الصور: عمودية (طولية) وواضحة لموديل أو لحذاء على قدم. بدون صور، تظهر صورة كيس VALE. اضغطي «حفظ الإعدادات» بعد الإضافة.
          </p>
          {err && <p className="text-danger text-[13px] mt-1">{err}</p>}
        </div>
      </div>
    </Panel>
  );
}
