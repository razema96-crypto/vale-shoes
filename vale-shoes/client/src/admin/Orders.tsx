import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { STATUS_LABEL } from "../lib/format";
import type { AdminOrder } from "./types";
import { Notice } from "./ui";

const STATUSES = ["new", "confirmed", "shipped", "delivered", "cancelled"] as const;

export function AdminOrders() {
  const [filter, setFilter] = useState<string>("");
  const [list, setList] = useState<AdminOrder[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState<number | null>(null);

  const load = () => {
    setList(null);
    api<AdminOrder[]>(`/admin/orders${filter ? `?status=${filter}` : ""}`).then(setList).catch((e) => setErr(e.message));
  };
  useEffect(load, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const setStatus = async (o: AdminOrder, status: string) => {
    if (status === "cancelled" && !confirm(`إلغاء الطلب ${o.code}؟ ستُعاد الكميات إلى المخزون.`)) return;
    try {
      const r = await api<AdminOrder>(`/admin/orders/${o.id}`, { method: "PATCH", json: { status } });
      setList((l) => l?.map((x) => (x.id === o.id ? r : x)) ?? null);
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl">الطلبات</h1>
        <button className="underline text-[14px]" onClick={load}>تحديث</button>
      </div>
      <div className="flex flex-wrap gap-2">
        <button className="chip" aria-pressed={!filter} onClick={() => setFilter("")}>الكل</button>
        {STATUSES.map((s) => <button key={s} className="chip" aria-pressed={filter === s} onClick={() => setFilter(s)}>{STATUS_LABEL[s]}</button>)}
      </div>
      {err && <Notice kind="error">{err}</Notice>}
      {!list ? (
        <p className="text-ash">جارٍ التحميل…</p>
      ) : !list.length ? (
        <div className="bg-white border border-ink/10 p-8 text-center text-ash">لا توجد طلبات {filter ? "بهذه الحالة" : "بعد"}.</div>
      ) : (
        <ul className="space-y-3">
          {list.map((o) => (
            <li key={o.id} className="bg-white border border-ink/10">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 p-4">
                <button className="num font-medium underline underline-offset-4" onClick={() => setOpen(open === o.id ? null : o.id)} aria-expanded={open === o.id}>{o.code}</button>
                <span>{o.customer.name}</span>
                <span className="text-ash">{o.customer.city}</span>
                <span className="num">{o.total} {o.currency}</span>
                <span className="text-[13px] text-ash">{o.paymentMethod === "cod" ? "عند الاستلام" : "واتساب"}</span>
                <span className="text-[13px] text-ash num">{o.createdAt.slice(0, 16)}</span>
                <label className="ms-auto flex items-center gap-2 text-[14px]">
                  <span className="sr-only">حالة الطلب</span>
                  <select
                    value={o.status}
                    onChange={(e) => setStatus(o, e.target.value)}
                    className={`h-10 border px-2 bg-white ${o.status === "new" ? "border-vale bg-vale-soft" : o.status === "cancelled" ? "border-danger/40 text-danger" : "border-ink/15"}`}
                  >
                    {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                  </select>
                </label>
              </div>
              {open === o.id && (
                <div className="border-t border-ink/10 p-4 grid md:grid-cols-2 gap-6 text-[14px]">
                  <div className="space-y-1">
                    <p><span className="text-ash">الهاتف: </span><a className="num underline" href={`tel:${o.customer.phone}`}>{o.customer.phone}</a></p>
                    <p><span className="text-ash">واتساب: </span><a className="underline" target="_blank" rel="noopener noreferrer" href={`https://wa.me/${o.customer.phone.replace(/\D/g, "")}`}>مراسلة العميلة</a></p>
                    <p><span className="text-ash">العنوان: </span>{o.customer.city} — {o.customer.address}</p>
                    {o.customer.notes && <p><span className="text-ash">ملاحظات: </span>{o.customer.notes}</p>}
                  </div>
                  <div>
                    <ul className="divide-y divide-ink/5">
                      {o.items.map((it, i) => (
                        <li key={i} className="py-2 flex justify-between gap-3">
                          <span>{it.name} — مقاس <span className="num">{it.size}</span>، {it.color} × <span className="num">{it.qty}</span></span>
                          <span className="num">{it.lineTotal}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="flex justify-between pt-2 text-ash"><span>التوصيل</span><span className="num">{o.deliveryFee}</span></p>
                    <p className="flex justify-between font-medium"><span>الإجمالي</span><span className="num">{o.total} {o.currency}</span></p>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
