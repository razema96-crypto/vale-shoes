import { thumb } from "../lib/format";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import type { Badge, Color, ProductImage } from "../lib/types";
import type { AdminProduct } from "./types";
import { Input, Notice, Panel, Toggle } from "./ui";
import { CloseIcon } from "../components/Icons";

const PAGE = 50;
type Filter = "all" | "live" | "drafts" | "demo" | "low";

export function AdminProducts() {
  const [sp, setSp] = useSearchParams();
  const filter = (sp.get("filter") as Filter) || "all";
  const [list, setList] = useState<AdminProduct[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [limit, setLimit] = useState(PAGE);
  const [busy, setBusy] = useState(false);
  const load = () => api<AdminProduct[]>("/admin/products").then(setList).catch((e) => setErr(e.message));
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    setSel(new Set());
    setLimit(PAGE);
  }, [filter, q]);

  const setStock = async (p: AdminProduct, stock: number) => {
    try {
      await api(`/admin/products/${p.id}/stock`, { method: "PATCH", json: { stock } });
      setList((l) => l?.map((x) => (x.id === p.id ? { ...x, stock } : x)) ?? null);
      setMsg(`تم تحديث مخزون «${p.name}».`);
    } catch (e) {
      setErr((e as Error).message);
    }
  };
  const del = async (p: AdminProduct) => {
    if (!confirm(`حذف «${p.name}» نهائياً؟ لا يمكن التراجع.`)) return;
    try {
      await api(`/admin/products/${p.id}`, { method: "DELETE" });
      setList((l) => l?.filter((x) => x.id !== p.id) ?? null);
      setMsg(`تم حذف «${p.name}».`);
    } catch (e) {
      setErr((e as Error).message);
    }
  };
  const bulk = async (action: "publish" | "hide" | "delete" | "set", patch?: Record<string, unknown>, ids = [...sel]) => {
    if (!ids.length) return;
    if (action === "delete" && !confirm(`حذف ${ids.length} منتج نهائياً؟ لا يمكن التراجع.`)) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await api<{ count: number; skipped: number }>("/admin/products/bulk-update", { method: "POST", json: { ids, action, patch } });
      const label = { publish: "نُشر", hide: "أُخفي", delete: "حُذف", set: "عُدّل" }[action];
      setMsg(`${label} ${r.count} منتج.`);
      setSel(new Set());
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const all = list ?? [];
  const counts = {
    all: all.length,
    live: all.filter((p) => p.active).length,
    drafts: all.filter((p) => !p.active).length,
    demo: all.filter((p) => p.isDemo).length,
    low: all.filter((p) => p.stock <= 3).length,
  };
  const shown = all.filter(
    (p) =>
      (filter === "all" || (filter === "live" && p.active) || (filter === "drafts" && !p.active) || (filter === "demo" && p.isDemo) || (filter === "low" && p.stock <= 3)) &&
      (!q || p.name.includes(q) || p.category.includes(q))
  );
  const page = shown.slice(0, limit);
  const allSel = page.length > 0 && page.every((p) => sel.has(p.id));
  const toggle = (id: number) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <div className="space-y-5 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl">المنتجات</h1>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/import" className="btn-ghost-dark h-11">استيراد صور بالجملة</Link>
          <Link to="/admin/products/new" className="btn-dark h-11">إضافة منتج</Link>
        </div>
      </div>
      {err && <Notice kind="error">{err}</Notice>}
      {msg && <Notice kind="ok">{msg}</Notice>}

      <div className="flex flex-wrap gap-2">
        {([["all", "الكل"], ["live", "معروض"], ["drafts", "مسودات"], ["low", "مخزون منخفض"], ["demo", "تجريبي"]] as [Filter, string][]).map(([k, l]) => (
          <button key={k} className="chip" aria-pressed={filter === k} onClick={() => setSp(k === "all" ? {} : { filter: k }, { replace: true })}>
            {l} <span className="num ms-1.5 opacity-60">{counts[k]}</span>
          </button>
        ))}
      </div>
      <input className="w-full sm:w-80 border border-ink/15 bg-white px-3 h-11" placeholder="بحث بالاسم أو القسم" value={q} onChange={(e) => setQ(e.target.value)} aria-label="بحث في المنتجات" />

      {sel.size > 0 && (
        <div className="sticky top-2 z-20 bg-ink text-white p-3 flex flex-wrap items-center gap-2 text-[14px]">
          <span className="px-2"><span className="num">{sel.size}</span> محدد</span>
          <button disabled={busy} className="px-3 h-9 rounded-full bg-vale text-ink" onClick={() => bulk("publish")}>نشر</button>
          <button disabled={busy} className="px-3 h-9 rounded-full border border-white/30" onClick={() => bulk("hide")}>إخفاء</button>
          <button disabled={busy} className="px-3 h-9 rounded-full border border-white/30" onClick={() => { const v = prompt("السعر الجديد للمنتجات المحددة:"); if (v && !isNaN(Number(v))) bulk("set", { price: Number(v) }); }}>تغيير السعر</button>
          <button disabled={busy} className="px-3 h-9 rounded-full border border-white/30" onClick={() => { const v = prompt("القسم الجديد للمنتجات المحددة:"); if (v?.trim()) bulk("set", { category: v.trim() }); }}>تغيير القسم</button>
          <button disabled={busy} className="px-3 h-9 rounded-full border border-white/30" onClick={() => { const v = prompt("الكمية في المخزون لكل منتج محدد:"); if (v && !isNaN(Number(v))) bulk("set", { stock: Math.floor(Number(v)) }); }}>تغيير المخزون</button>
          <button disabled={busy} className="px-3 h-9 rounded-full border border-[#ff9b8f]/60 text-[#ffb3aa]" onClick={() => bulk("delete")}>حذف</button>
          <button className="ms-auto underline" onClick={() => setSel(new Set())}>إلغاء التحديد</button>
        </div>
      )}

      {!list ? (
        <p className="text-ash">جارٍ التحميل…</p>
      ) : !list.length ? (
        <Panel><p>لا توجد منتجات. <Link to="/admin/import" className="underline">استوردي صورك دفعة واحدة</Link> أو <Link to="/admin/products/new" className="underline">أضيفي منتجاً</Link>.</p></Panel>
      ) : (
        <div className="bg-white border border-ink/10 overflow-x-auto">
          <table className="w-full text-[14px] min-w-[820px]">
            <thead className="text-ash text-start border-b border-ink/10">
              <tr>
                <th className="p-3 w-10"><input type="checkbox" className="size-4 accent-ink" checked={allSel} onChange={() => setSel(allSel ? new Set() : new Set(page.map((p) => p.id)))} aria-label="تحديد الكل" /></th>
                <th className="text-start font-normal p-3">المنتج</th>
                <th className="text-start font-normal p-3">القسم</th>
                <th className="text-start font-normal p-3">السعر</th>
                <th className="text-start font-normal p-3">المخزون</th>
                <th className="text-start font-normal p-3">الحالة</th>
                <th className="p-3"><span className="sr-only">إجراءات</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {page.map((p) => (
                <tr key={p.id} className={`align-middle ${sel.has(p.id) ? "bg-vale-soft/50" : ""}`}>
                  <td className="p-3"><input type="checkbox" className="size-4 accent-ink" checked={sel.has(p.id)} onChange={() => toggle(p.id)} aria-label={`تحديد ${p.name}`} /></td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      {p.images[0] ? <img src={thumb(p.images[0].url)} alt="" loading="lazy" className="size-12 object-cover bg-paper" /> : <div className="size-12 bg-paper" />}
                      <div>
                        <Link to={`/admin/products/${p.id}`} className="hover:underline">{p.name}</Link>
                        {p.isDemo && <span className="ms-2 text-[11px] border border-dashed border-ash/60 text-ash rounded-full px-2">تجريبي</span>}
                        {p.images.length > 1 && <span className="block text-[12px] text-ash"><span className="num">{p.images.length}</span> صور</span>}
                      </div>
                    </div>
                  </td>
                  <td className="p-3">{p.category}</td>
                  <td className="p-3 num">{p.price}</td>
                  <td className="p-3">
                    <StockCell value={p.stock} onSave={(n) => setStock(p, n)} />
                  </td>
                  <td className="p-3">
                    <button className="underline-offset-4 hover:underline" onClick={() => bulk(p.active ? "hide" : "publish", undefined, [p.id])} title="تبديل الحالة">
                      {p.active ? <span className="text-ok">معروض</span> : <span className="text-ash">مسودة</span>}
                    </button>
                  </td>
                  <td className="p-3 whitespace-nowrap text-end">
                    <Link to={`/admin/products/${p.id}`} className="underline underline-offset-4 me-4">تعديل</Link>
                    <button className="text-danger underline underline-offset-4" onClick={() => del(p)}>حذف</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {shown.length > limit && (
            <div className="p-4 text-center border-t border-ink/10">
              <button className="btn-ghost-dark h-11" onClick={() => setLimit((l) => l + PAGE)}>
                عرض المزيد (<span className="num">{shown.length - limit}</span>)
              </button>
            </div>
          )}
          {!shown.length && <p className="p-6 text-center text-ash">لا توجد منتجات في هذا التصنيف.</p>}
        </div>
      )}
    </div>
  );
}

function StockCell({ value, onSave }: { value: number; onSave: (n: number) => void }) {
  const [v, setV] = useState(String(value));
  useEffect(() => setV(String(value)), [value]);
  const changed = Number(v) !== value && v !== "" && Number(v) >= 0;
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={0}
        className={`num w-20 border px-2 h-9 ${value <= 0 ? "border-danger/40" : value <= 3 ? "border-[#c08a2a]/50" : "border-ink/15"}`}
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && changed && onSave(Number(v))}
        aria-label="كمية المخزون"
      />
      {changed && <button className="text-[13px] underline" onClick={() => onSave(Math.floor(Number(v)))}>حفظ</button>}
    </div>
  );
}

/* ---------------- Editor ---------------- */

type Draft = {
  name: string; slug: string; description: string; category: string; price: string; compareAtPrice: string;
  sizes: number[]; colors: Color[]; images: ProductImage[]; badges: Badge[]; stock: string; active: boolean;
};
const EMPTY: Draft = {
  name: "", slug: "", description: "", category: "", price: "", compareAtPrice: "",
  sizes: [36, 37, 38, 39, 40, 41], colors: [{ name: "أسود", hex: "#111111" }], images: [], badges: [], stock: "0", active: true,
};
const SIZE_RANGE = Array.from({ length: 13 }, (_, i) => 34 + i);

export function ProductEditor() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const [d, setD] = useState<Draft | null>(isNew ? EMPTY : null);
  const [orig, setOrig] = useState<AdminProduct | null>(null);
  const [cats, setCats] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api<AdminProduct[]>("/admin/products").then((l) => setCats([...new Set(l.map((p) => p.category))])).catch(() => {});
    if (!isNew)
      api<AdminProduct>(`/admin/products/${id}`)
        .then((p) => {
          setOrig(p);
          setD({
            name: p.name, slug: p.slug, description: p.description, category: p.category, price: String(p.price),
            compareAtPrice: p.compareAtPrice != null ? String(p.compareAtPrice) : "", sizes: p.sizes, colors: p.colors,
            images: p.images, badges: p.badges, stock: String(p.stock), active: p.active,
          });
        })
        .catch((e) => setErr(e.message));
  }, [id, isNew]);

  const problems = useMemo(() => {
    if (!d) return [];
    const out: string[] = [];
    if (d.name.trim().length < 2) out.push("اسم المنتج مطلوب.");
    if (!d.category.trim()) out.push("القسم مطلوب.");
    if (d.price === "" || Number(d.price) < 0 || isNaN(Number(d.price))) out.push("السعر غير صالح.");
    if (!d.sizes.length) out.push("اختاري مقاساً واحداً على الأقل.");
    if (!d.colors.length || d.colors.some((c) => !c.name.trim())) out.push("كل لون يحتاج اسماً.");
    if (new Set(d.colors.map((c) => c.name.trim())).size !== d.colors.length) out.push("أسماء الألوان مكررة.");
    if (d.stock === "" || Number(d.stock) < 0) out.push("المخزون غير صالح.");
    return out;
  }, [d]);

  if (err && !d) return <Notice kind="error">{err}</Notice>;
  if (!d) return <p className="text-ash">جارٍ التحميل…</p>;
  const up = (patch: Partial<Draft>) => {
    setSaved(false);
    setD({ ...d, ...patch });
  };

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    const fd = new FormData();
    [...files].slice(0, 10).forEach((f) => fd.append("images", f));
    setUploading(true);
    setErr(null);
    try {
      const r = await fetch("/api/admin/uploads", { method: "POST", body: fd, credentials: "same-origin" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "فشل رفع الصور");
      up({ images: [...d.images, ...(j.urls as string[]).map((url) => ({ url, color: d.colors[0]?.name, alt: d.name }))] });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (problems.length) return setErr(problems.join(" "));
    setSaving(true);
    setErr(null);
    const body = {
      name: d.name.trim(), slug: d.slug.trim() || undefined, description: d.description.trim(), category: d.category.trim(),
      price: Number(d.price), compareAtPrice: d.compareAtPrice ? Number(d.compareAtPrice) : null,
      sizes: [...d.sizes].sort((a, b) => a - b), colors: d.colors.map((c) => ({ name: c.name.trim(), hex: c.hex })),
      images: d.images.map((i) => ({ url: i.url, color: i.color && d.colors.some((c) => c.name === i.color) ? i.color : undefined, alt: i.alt || d.name })),
      badges: d.badges, stock: Math.floor(Number(d.stock)), active: d.active,
      isDemo: orig?.isDemo ?? false,
    };
    try {
      const r = await api<AdminProduct>(isNew ? "/admin/products" : `/admin/products/${id}`, { method: isNew ? "POST" : "PUT", json: body });
      setSaved(true);
      if (isNew) navigate(`/admin/products/${r.id}`, { replace: true });
      else setOrig(r);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/admin/products" className="text-ash text-[14px] underline underline-offset-4">كل المنتجات</Link>
          <h1 className="text-2xl mt-1">{isNew ? "منتج جديد" : d.name || "تعديل منتج"}</h1>
        </div>
        {!isNew && orig && <Link to={`/product/${orig.slug}`} target="_blank" className="underline underline-offset-4 text-[14px]">عرض في المتجر</Link>}
      </div>
      {orig?.isDemo && (
        <Notice>
          هذا منتج تجريبي. يمكنك تعديله ليصبح منتجاً حقيقياً — عند ذلك أزيلي علامة «تجريبي» من الأسفل.
        </Notice>
      )}

      <div className="grid lg:grid-cols-[1fr_340px] gap-5 items-start">
        <div className="space-y-5">
          <Panel title="المعلومات الأساسية">
            <div className="grid sm:grid-cols-2 gap-4">
              <Input label="اسم المنتج" value={d.name} onChange={(e) => up({ name: e.target.value })} required />
              <label className="block">
                <span className="label">القسم</span>
                <input list="cats" className="w-full border border-ink/15 bg-white px-3 h-11 focus:border-ink focus:outline-none" value={d.category} onChange={(e) => up({ category: e.target.value })} placeholder="مثلاً: كعب عالٍ" />
                <datalist id="cats">{cats.map((c) => <option key={c} value={c} />)}</datalist>
              </label>
            </div>
            <label className="block mt-4">
              <span className="label">الوصف</span>
              <textarea className="w-full border border-ink/15 bg-white p-3 min-h-32 focus:border-ink focus:outline-none" value={d.description} onChange={(e) => up({ description: e.target.value })} />
            </label>
            <div className="mt-4">
              <Input label="رابط المنتج (اختياري)" hint="يُنشأ تلقائياً من الاسم إن تُرك فارغاً." value={d.slug} onChange={(e) => up({ slug: e.target.value })} dir="ltr" />
            </div>
          </Panel>

          <Panel title="الصور">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {d.images.map((im, i) => (
                <div key={im.url + i} className="border border-ink/10 bg-ivory">
                  <div className="relative">
                    <img src={thumb(im.url)} alt="" className="w-full aspect-[4/5] object-cover" loading="lazy" />
                    <button className="absolute top-1 left-1 grid size-8 place-items-center bg-white/90 rounded-full" aria-label="حذف الصورة" onClick={() => up({ images: d.images.filter((_, j) => j !== i) })}>
                      <CloseIcon className="size-4" />
                    </button>
                    {i === 0 && <span className="absolute bottom-1 right-1 text-[11px] bg-ink text-ivory px-2 rounded-full">الرئيسية</span>}
                  </div>
                  <div className="p-2 space-y-2">
                    <select className="w-full text-[13px] border border-ink/10 h-8 bg-white" value={im.color ?? ""} onChange={(e) => up({ images: d.images.map((x, j) => (j === i ? { ...x, color: e.target.value || undefined } : x)) })} aria-label="لون الصورة">
                      <option value="">كل الألوان</option>
                      {d.colors.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                    </select>
                    <div className="flex justify-between text-[12px]">
                      <button disabled={i === 0} className="underline disabled:opacity-30" onClick={() => { const a = [...d.images]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; up({ images: a }); }}>تقديم</button>
                      <button disabled={i === d.images.length - 1} className="underline disabled:opacity-30" onClick={() => { const a = [...d.images]; [a[i + 1], a[i]] = [a[i], a[i + 1]]; up({ images: a }); }}>تأخير</button>
                    </div>
                  </div>
                </div>
              ))}
              <label className={`grid place-items-center aspect-[4/5] border border-dashed border-ink/25 cursor-pointer hover:border-ink text-center p-3 text-[14px] text-ash whitespace-pre-line ${uploading ? "opacity-60 pointer-events-none" : ""}`}>
                {uploading ? "جارٍ الرفع…" : "رفع صور\nJPG / PNG / WEBP"}
                <input type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/heic" multiple className="sr-only" onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
              </label>
            </div>
            <p className="text-[12px] text-ash mt-3">تُضغط الصور تلقائياً وتُحوَّل إلى WEBP. اربطي كل صورة بلونها ليتغير المعرض عند اختيار اللون.</p>
          </Panel>

          <Panel title="المقاسات والألوان">
            <span className="label">المقاسات المتوفرة (EU)</span>
            <div className="flex flex-wrap gap-2">
              {SIZE_RANGE.map((s) => (
                <button key={s} type="button" className="chip num" aria-pressed={d.sizes.includes(s)} onClick={() => up({ sizes: d.sizes.includes(s) ? d.sizes.filter((x) => x !== s) : [...d.sizes, s] })}>{s}</button>
              ))}
            </div>
            <span className="label mt-6">الألوان</span>
            <div className="space-y-2">
              {d.colors.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="color" value={c.hex} onChange={(e) => up({ colors: d.colors.map((x, j) => (j === i ? { ...x, hex: e.target.value } : x)) })} className="size-11 border border-ink/15 bg-white p-1" aria-label="درجة اللون" />
                  <input
                    className="flex-1 border border-ink/15 bg-white px-3 h-11"
                    value={c.name}
                    placeholder="اسم اللون"
                    onChange={(e) => {
                      const old = c.name, nu = e.target.value;
                      up({ colors: d.colors.map((x, j) => (j === i ? { ...x, name: nu } : x)), images: d.images.map((im) => (im.color === old ? { ...im, color: nu } : im)) });
                    }}
                    aria-label="اسم اللون"
                  />
                  <button className="grid size-11 place-items-center text-ash hover:text-danger disabled:opacity-30" disabled={d.colors.length === 1} onClick={() => up({ colors: d.colors.filter((_, j) => j !== i) })} aria-label="حذف اللون">
                    <CloseIcon className="size-4" />
                  </button>
                </div>
              ))}
              <button className="underline text-[14px]" onClick={() => up({ colors: [...d.colors, { name: "", hex: "#888888" }] })}>إضافة لون</button>
            </div>
          </Panel>
        </div>

        <div className="space-y-5 lg:sticky lg:top-6">
          <Panel title="السعر والمخزون">
            <div className="space-y-4">
              <Input label="السعر" type="number" min={0} step="0.01" value={d.price} onChange={(e) => up({ price: e.target.value })} className="num w-full border border-ink/15 bg-white px-3 h-11" />
              <Input label="السعر قبل الخصم (اختياري)" type="number" min={0} step="0.01" value={d.compareAtPrice} onChange={(e) => up({ compareAtPrice: e.target.value })} />
              <Input label="الكمية في المخزون" type="number" min={0} step="1" value={d.stock} onChange={(e) => up({ stock: e.target.value })} hint="تُخصم تلقائياً عند كل طلب، وتُعاد عند إلغائه." />
            </div>
          </Panel>
          <Panel title="العرض">
            <div className="space-y-3">
              <Toggle label="معروض في المتجر" checked={d.active} onChange={(v) => up({ active: v })} />
              <Toggle label="شارة «الأكثر مبيعاً»" checked={d.badges.includes("bestseller")} onChange={(v) => up({ badges: v ? [...d.badges, "bestseller"] : d.badges.filter((b) => b !== "bestseller") })} />
              <Toggle label="شارة «جديد»" checked={d.badges.includes("new")} onChange={(v) => up({ badges: v ? [...d.badges, "new"] : d.badges.filter((b) => b !== "new") })} />
              {orig?.isDemo && <Toggle label="منتج تجريبي" hint="أزيلي العلامة عندما يصبح المنتج حقيقياً." checked={orig.isDemo} onChange={(v) => setOrig({ ...orig, isDemo: v })} />}
            </div>
          </Panel>
          {err && <Notice kind="error">{err}</Notice>}
          {saved && <Notice kind="ok">تم الحفظ.</Notice>}
          <button className="btn-dark w-full" onClick={save} disabled={saving}>{saving ? "جارٍ الحفظ…" : isNew ? "إنشاء المنتج" : "حفظ التغييرات"}</button>
        </div>
      </div>
    </div>
  );
}
