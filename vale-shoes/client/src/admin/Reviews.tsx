import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { Notice } from "./ui";

type R = { id: number; name: string; rating: number; body: string; approved: boolean; createdAt: string; productName: string; productSlug: string };

export function AdminReviews() {
  const [list, setList] = useState<R[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    api<R[]>("/admin/reviews").then(setList).catch((e) => setErr(e.message));
  }, []);
  const setApproved = async (r: R, approved: boolean) => {
    await api(`/admin/reviews/${r.id}`, { method: "PATCH", json: { approved } }).catch((e) => setErr(e.message));
    setList((l) => l?.map((x) => (x.id === r.id ? { ...x, approved } : x)) ?? null);
  };
  const del = async (r: R) => {
    if (!confirm("حذف هذا التقييم؟")) return;
    await api(`/admin/reviews/${r.id}`, { method: "DELETE" }).catch((e) => setErr(e.message));
    setList((l) => l?.filter((x) => x.id !== r.id) ?? null);
  };
  return (
    <div className="space-y-5">
      <h1 className="text-2xl">التقييمات</h1>
      <p className="text-ash text-[14px]">تظهر التقييمات في صفحة المنتج فقط بعد نشرها من هنا.</p>
      {err && <Notice kind="error">{err}</Notice>}
      {!list ? <p className="text-ash">جارٍ التحميل…</p> : !list.length ? (
        <div className="bg-white border border-ink/10 p-8 text-center text-ash">لا توجد تقييمات بعد.</div>
      ) : (
        <ul className="space-y-3">
          {list.map((r) => (
            <li key={r.id} className="bg-white border border-ink/10 p-4">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="font-medium">{r.name}</span>
                <span className="num text-ink">{"★".repeat(r.rating)}<span className="text-bone">{"★".repeat(5 - r.rating)}</span></span>
                <Link to={`/product/${r.productSlug}`} target="_blank" className="text-ash underline text-[14px]">{r.productName}</Link>
                <span className={`text-[12px] px-2 rounded-full ${r.approved ? "bg-ok/10 text-ok" : "bg-vale-soft"}`}>{r.approved ? "منشور" : "بانتظار المراجعة"}</span>
              </div>
              <p className="mt-2 text-smoke">{r.body}</p>
              <div className="mt-3 flex gap-4 text-[14px]">
                {r.approved ? <button className="underline" onClick={() => setApproved(r, false)}>إخفاء</button> : <button className="underline" onClick={() => setApproved(r, true)}>نشر</button>}
                <button className="underline text-danger" onClick={() => del(r)}>حذف</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
