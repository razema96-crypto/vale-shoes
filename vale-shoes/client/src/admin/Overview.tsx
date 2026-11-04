import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { Panel, Notice } from "./ui";

type Summary = { products: number; lowStock: number; newOrders: number; pendingReviews: number; revenue: number; demoProducts: number };
type S = { whatsappNumber: string; currencySymbol: string };

export function AdminOverview() {
  const [s, setS] = useState<Summary | null>(null);
  const [st, setSt] = useState<S | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    Promise.all([api<Summary>("/admin/summary"), api<S>("/admin/settings")]).then(([a, b]) => { setS(a); setSt(b); }).catch((e) => setErr(e.message));
  }, []);
  if (err) return <Notice kind="error">{err}</Notice>;
  if (!s) return <p className="text-ash">جارٍ التحميل…</p>;
  const cards = [
    { label: "طلبات جديدة", value: s.newOrders, to: "/admin/orders" },
    { label: "منتجات قاربت على النفاد", value: s.lowStock, to: "/admin/products" },
    { label: "تقييمات بانتظار المراجعة", value: s.pendingReviews, to: "/admin/reviews" },
    { label: "إجمالي المنتجات", value: s.products, to: "/admin/products" },
  ];
  return (
    <div className="space-y-6">
      {!st?.whatsappNumber && (
        <Notice>
          لم يُضبط رقم واتساب بعد، لذلك زر «اطلب عبر واتساب» لا يظهر للعميلات. <Link className="underline" to="/admin/settings">أضيفيه من الإعدادات</Link>.
        </Notice>
      )}
      {s.demoProducts > 0 && (
        <Notice>
          يوجد <span className="num">{s.demoProducts}</span> منتجاً تجريبياً معروضاً في المتجر (موسوم «منتج تجريبي»). احذفيها أو عدّليها بمنتجاتك الحقيقية قبل الإطلاق. <Link className="underline" to="/admin/products">إدارة المنتجات</Link>
        </Notice>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Link key={c.label} to={c.to} className="bg-white border border-ink/10 p-5 hover:border-ink/40 transition-colors">
            <p className="text-ash text-[14px]">{c.label}</p>
            <p className="num text-4xl mt-3">{c.value}</p>
          </Link>
        ))}
      </div>
      <Panel title="مبيعات مُسلَّمة">
        <p className="num text-3xl">{s.revenue.toLocaleString("en-US")} {st?.currencySymbol}</p>
        <p className="text-ash text-[13px] mt-1">مجموع الطلبات التي حالتها «تم التسليم».</p>
      </Panel>
    </div>
  );
}
