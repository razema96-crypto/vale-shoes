import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import type { Color } from "../lib/types";
import type { AdminProduct } from "./types";
import { Input, Notice, Panel, Toggle } from "./ui";
import { CloseIcon } from "../components/Icons";

/**
 * Bulk import: pick hundreds of photos at once → each photo (or each group of photos with the
 * same base file name) becomes a product with shared defaults. Products are created as hidden
 * drafts by default so the owner can review them before publishing.
 */

type Group = { key: string; files: File[] };
type Phase = "pick" | "running" | "done";

const SIZE_RANGE = Array.from({ length: 13 }, (_, i) => 34 + i);
const IMG_RE = /\.(jpe?g|png|webp|avif|heic|heif)$/i;
const UPLOAD_BATCH = 8;
const CREATE_BATCH = 50;

/** "M12-2.jpg", "M12 (3).jpg", "M12_1.jpeg" → "M12" */
function baseName(name: string) {
  return name
    .replace(/\.[^.]+$/, "")
    .replace(/[\s_-]*\(\d+\)$/, "")
    .replace(/[\s_-]+\d{1,2}$/, "")
    .trim()
    .toLowerCase();
}
const natural = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

/** Downscale large photos in the browser before upload (much faster on slow connections). */
async function shrink(file: File): Promise<Blob> {
  if (file.size < 600 * 1024 || !/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  try {
    const bmp = await createImageBitmap(file);
    const max = 2000;
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    if (k === 1 && file.size < 3 * 1024 * 1024) return file;
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k);
    c.height = Math.round(bmp.height * k);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    bmp.close();
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.9));
    return blob ?? file;
  } catch {
    return file;
  }
}

async function uploadFiles(files: File[]): Promise<string[]> {
  const fd = new FormData();
  for (const f of files) {
    const b = await shrink(f);
    fd.append("images", b, b === f ? f.name : f.name.replace(/\.[^.]+$/, "") + ".jpg");
  }
  for (let attempt = 0; ; attempt++) {
    try {
      const r = await fetch("/api/admin/uploads", { method: "POST", body: fd, credentials: "same-origin" });
      const j = await r.json().catch(() => ({}));
      if (r.status === 401) throw Object.assign(new Error("انتهت الجلسة. سجّلي الدخول مجدداً ثم أعيدي المحاولة."), { fatal: true });
      if (!r.ok) throw new Error(j.error || `فشل الرفع (${r.status})`);
      return j.urls as string[];
    } catch (e) {
      if ((e as { fatal?: boolean }).fatal || attempt >= 2) throw e;
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
}

export function BulkImport() {
  const [files, setFiles] = useState<File[]>([]);
  const [grouping, setGrouping] = useState(true);
  const [phase, setPhase] = useState<Phase>("pick");
  const [progress, setProgress] = useState({ uploaded: 0, total: 0, created: 0 });
  const [errors, setErrors] = useState<string[]>([]);
  const [drag, setDrag] = useState(false);
  const [cats, setCats] = useState<string[]>([]);
  const [existingCount, setExistingCount] = useState(0);
  const stopRef = useRef(false);

  const [d, setD] = useState({
    prefix: "موديل",
    start: 1,
    category: "",
    price: "",
    sizes: [36, 37, 38, 39, 40, 41],
    colors: [{ name: "حسب الصورة", hex: "#111111" }] as Color[],
    stock: "5",
    publish: false,
    badgeNew: true,
  });

  useEffect(() => {
    api<AdminProduct[]>("/admin/products")
      .then((l) => {
        setCats([...new Set(l.map((p) => p.category))]);
        setExistingCount(l.filter((p) => !p.isDemo).length);
        setD((x) => ({ ...x, start: l.filter((p) => !p.isDemo).length + 1 }));
      })
      .catch(() => {});
  }, []);

  const groups: Group[] = useMemo(() => {
    const sorted = [...files].sort((a, b) => natural.compare(a.name, b.name));
    if (!grouping) return sorted.map((f, i) => ({ key: `${i}-${f.name}`, files: [f] }));
    const m = new Map<string, File[]>();
    for (const f of sorted) {
      const k = baseName(f.name);
      m.set(k, [...(m.get(k) ?? []), f]);
    }
    return [...m.entries()].map(([key, fs]) => ({ key, files: fs }));
  }, [files, grouping]);

  const previews = useMemo(() => groups.slice(0, 60).map((g) => ({ key: g.key, n: g.files.length, url: URL.createObjectURL(g.files[0]) })), [groups]);
  useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p.url)), [previews]);

  const [dupes, setDupes] = useState(0);
  const addFiles = (list: FileList | File[] | null) => {
    if (!list) return;
    const imgs = [...list].filter((f) => f.type.startsWith("image/") || IMG_RE.test(f.name));
    setFiles((cur) => {
      // Skip exact duplicates: same file downloaded twice ("photo.jpg" and "photo (1).jpg" with the same size).
      const key = (f: File) => `${f.name.replace(/\s*\(\d+\)(?=\.[^.]+$)/, "").toLowerCase()}|${f.size}`;
      const seen = new Set(cur.map(key));
      const fresh: File[] = [];
      let skipped = 0;
      for (const f of imgs) {
        const k = key(f);
        if (seen.has(k)) skipped++;
        else {
          seen.add(k);
          fresh.push(f);
        }
      }
      setDupes((d) => d + skipped);
      return [...cur, ...fresh];
    });
  };

  const problems: string[] = [];
  if (!files.length) problems.push("اختاري الصور أولاً.");
  if (d.price !== "" && (isNaN(Number(d.price)) || Number(d.price) < 0)) problems.push("السعر غير صالح.");
  if (!d.sizes.length) problems.push("اختاري المقاسات.");
  if (d.colors.some((c) => !c.name.trim())) problems.push("اكتبي اسم اللون.");

  const run = async () => {
    if (problems.length) return;
    stopRef.current = false;
    setPhase("running");
    setErrors([]);
    const total = files.length;
    setProgress({ uploaded: 0, total, created: 0 });
    const colors = d.colors.map((c) => ({ name: c.name.trim(), hex: c.hex }));
    const pending: Record<string, unknown>[] = [];
    let created = 0, uploaded = 0, n = d.start;

    const flush = async (force = false) => {
      while (pending.length >= CREATE_BATCH || (force && pending.length)) {
        const chunk = pending.splice(0, CREATE_BATCH);
        await api("/admin/products/bulk", { method: "POST", json: { products: chunk } });
        created += chunk.length;
        setProgress((p) => ({ ...p, created }));
      }
    };

    try {
      for (const g of groups) {
        if (stopRef.current) break;
        const urls: string[] = [];
        for (let i = 0; i < g.files.length; i += UPLOAD_BATCH) {
          try {
            urls.push(...(await uploadFiles(g.files.slice(i, i + UPLOAD_BATCH))));
          } catch (e) {
            if ((e as { fatal?: boolean }).fatal) throw e;
            setErrors((x) => [...x, `${g.files.map((f) => f.name).join("، ")}: ${(e as Error).message}`]);
          }
          uploaded += Math.min(UPLOAD_BATCH, g.files.length - i);
          setProgress((p) => ({ ...p, uploaded }));
        }
        if (!urls.length) continue;
        const name = `${d.prefix.trim() || "موديل"} ${n++}`;
        pending.push({
          name,
          description: "",
          category: d.category.trim() || "جديد",
          price: d.price === "" ? 0 : Number(d.price),
          compareAtPrice: null,
          sizes: [...d.sizes].sort((a, b) => a - b),
          colors,
          images: urls.map((url) => ({ url, alt: name })),
          badges: d.badgeNew ? ["new"] : [],
          stock: Math.max(0, Math.floor(Number(d.stock) || 0)),
          active: d.publish,
        });
        await flush();
      }
      await flush(true);
    } catch (e) {
      setErrors((x) => [...x, (e as Error).message]);
      try {
        await flush(true);
      } catch { /* already reported */ }
    }
    setPhase("done");
  };

  if (phase !== "pick") {
    const pct = progress.total ? Math.round((progress.uploaded / progress.total) * 100) : 0;
    return (
      <div className="space-y-5 max-w-3xl">
        <h1 className="text-2xl">استيراد جماعي</h1>
        <Panel>
          <p className="text-lg">{phase === "running" ? "جارٍ رفع الصور وإنشاء الموديلات… لا تغلقي الصفحة." : "انتهى الاستيراد"}</p>
          <div className="mt-5 h-3 bg-ink/10 rounded-full overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-vale transition-[width]" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-3 text-[14px] text-ash">
            الصور: <span className="num">{progress.uploaded}</span> / <span className="num">{progress.total}</span> — الموديلات المُنشأة: <span className="num">{progress.created}</span>
          </p>
          {phase === "running" && (
            <button className="btn-ghost-dark h-11 mt-5" onClick={() => (stopRef.current = true)}>إيقاف بعد الموديل الحالي</button>
          )}
          {phase === "done" && (
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/admin/products?filter=drafts" className="btn-dark h-11">مراجعة الموديلات</Link>
              <button className="btn-ghost-dark h-11" onClick={() => { setFiles([]); setPhase("pick"); setD((x) => ({ ...x, start: x.start + progress.created })); }}>استيراد دفعة أخرى</button>
            </div>
          )}
        </Panel>
        {errors.length > 0 && (
          <Notice kind="error">
            <p className="font-medium">تعذر رفع بعض الصور (<span className="num">{errors.length}</span>):</p>
            <ul className="list-disc ps-5 mt-2 space-y-1 max-h-60 overflow-auto">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
          </Notice>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-24">
      <div>
        <Link to="/admin/products" className="text-ash text-[14px] underline underline-offset-4">المنتجات</Link>
        <h1 className="text-2xl mt-1">استيراد جماعي للصور</h1>
        <p className="text-ash text-[14px] mt-1">اختاري عشرات أو مئات الصور مرة واحدة، وتتحول كل صورة إلى موديل. تعدّلين أي موديل لاحقاً.</p>
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-5 items-start">
        <div className="space-y-5">
          <Panel title="١. الصور">
            <label
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}
              className={`block border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${drag ? "border-ink bg-vale-soft" : "border-ink/20 hover:border-ink/50"}`}
            >
              <p className="text-lg">اسحبي الصور إلى هنا أو اضغطي للاختيار</p>
              <p className="text-ash text-[14px] mt-1">JPG / PNG / WEBP — يمكن اختيار مئات الصور دفعة واحدة</p>
              <input type="file" multiple accept="image/*,.heic,.heif" className="sr-only" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
            </label>
            <label className="inline-block mt-3 text-[14px] underline underline-offset-4 cursor-pointer">
              أو اختاري مجلداً كاملاً
              <input
                type="file"
                multiple
                className="sr-only"
                // @ts-expect-error non-standard but widely supported folder picker
                webkitdirectory=""
                onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
              />
            </label>

            {files.length > 0 && (
              <>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  <p>
                    <span className="num font-medium">{files.length}</span> صورة ← <span className="num font-medium">{groups.length}</span> موديل
                  </p>
                  <button className="text-[14px] text-danger underline" onClick={() => { setFiles([]); setDupes(0); }}>إزالة الكل</button>
                </div>
                {dupes > 0 && (
                  <p className="text-[13px] text-ash mt-1">تم تجاهل <span className="num">{dupes}</span> صورة مكررة (نفس الصورة منزّلة مرتين).</p>
                )}
                <div className="mt-3">
                  <Toggle
                    label="تجميع الصور المتشابهة الاسم في موديل واحد"
                    hint="مثال: M12-1.jpg و M12-2.jpg و M12 (3).jpg ← موديل واحد بثلاث صور. أطفئيه إذا كانت كل صورة موديلاً مستقلاً."
                    checked={grouping}
                    onChange={setGrouping}
                  />
                </div>
                <div className="mt-4 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                  {previews.map((p, i) => (
                    <div key={p.key} className="relative">
                      <img src={p.url} alt="" className="w-full aspect-[4/5] object-cover bg-paper" loading="lazy" />
                      <span className="absolute bottom-1 right-1 text-[10px] bg-white/90 px-1.5 rounded-full num">{d.start + i}</span>
                      {p.n > 1 && <span className="absolute top-1 left-1 text-[10px] bg-ink text-white px-1.5 rounded-full num">{p.n}</span>}
                      <button
                        className="absolute top-1 right-1 grid size-6 place-items-center bg-white/90 rounded-full"
                        aria-label="إزالة"
                        onClick={() => { const g = groups[i]; setFiles((cur) => cur.filter((f) => !g.files.includes(f))); }}
                      >
                        <CloseIcon className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
                {groups.length > previews.length && <p className="text-ash text-[13px] mt-2">و<span className="num">{groups.length - previews.length}</span> موديل آخر…</p>}
              </>
            )}
          </Panel>

          <Panel title="٢. المقاسات والألوان لكل الدفعة">
            <span className="label">المقاسات (EU)</span>
            <div className="flex flex-wrap gap-2">
              {SIZE_RANGE.map((s) => (
                <button key={s} type="button" className="chip num" aria-pressed={d.sizes.includes(s)} onClick={() => setD({ ...d, sizes: d.sizes.includes(s) ? d.sizes.filter((x) => x !== s) : [...d.sizes, s] })}>{s}</button>
              ))}
            </div>
            <span className="label mt-6">اللون</span>
            <div className="space-y-2">
              {d.colors.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="color" value={c.hex} onChange={(e) => setD({ ...d, colors: d.colors.map((x, j) => (j === i ? { ...x, hex: e.target.value } : x)) })} className="size-11 border border-ink/15 bg-white p-1" aria-label="درجة اللون" />
                  <input className="flex-1 border border-ink/15 bg-white px-3 h-11" value={c.name} placeholder="اسم اللون، مثلاً: أسود" onChange={(e) => setD({ ...d, colors: d.colors.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} aria-label="اسم اللون" />
                  <button className="grid size-11 place-items-center text-ash hover:text-danger disabled:opacity-30" disabled={d.colors.length === 1} onClick={() => setD({ ...d, colors: d.colors.filter((_, j) => j !== i) })} aria-label="حذف اللون"><CloseIcon className="size-4" /></button>
                </div>
              ))}
              <button className="underline text-[14px]" onClick={() => setD({ ...d, colors: [...d.colors, { name: "", hex: "#888888" }] })}>إضافة لون</button>
            </div>
            <p className="text-[12px] text-ash mt-3">إذا كانت ألوان الموديلات مختلفة، اكتبي «حسب الصورة» الآن وعدّلي اللون لكل موديل لاحقاً، أو استوردي كل لون كدفعة منفصلة.</p>
          </Panel>
        </div>

        <div className="space-y-5 lg:sticky lg:top-6">
          <Panel title="٣. بيانات الدفعة">
            <div className="space-y-4">
              <div className="grid grid-cols-[1fr_90px] gap-3">
                <Input label="اسم الموديل" value={d.prefix} onChange={(e) => setD({ ...d, prefix: e.target.value })} />
                <Input label="يبدأ من رقم" type="number" min={1} value={d.start} onChange={(e) => setD({ ...d, start: Math.max(1, Number(e.target.value) || 1) })} />
              </div>
              <p className="text-[12px] text-ash -mt-2">الأسماء ستكون: {d.prefix || "موديل"} <span className="num">{d.start}</span>، {d.prefix || "موديل"} <span className="num">{d.start + 1}</span>، …</p>
              <label className="block">
                <span className="label">القسم</span>
                <input list="bulk-cats" className="w-full border border-ink/15 bg-white px-3 h-11 focus:border-ink focus:outline-none" value={d.category} onChange={(e) => setD({ ...d, category: e.target.value })} placeholder="اختياري، مثلاً: كعب عالٍ" />
                <datalist id="bulk-cats">{cats.map((c) => <option key={c} value={c} />)}</datalist>
              </label>
              <Input label="السعر (اختياري)" hint="اختياري. يمكن ترك الموديلات بدون سعر وعرضها بـ«السعر عند الطلب»." type="number" min={0} step="0.01" value={d.price} onChange={(e) => setD({ ...d, price: e.target.value })} />
              <Input label="الكمية لكل موديل" type="number" min={0} value={d.stock} onChange={(e) => setD({ ...d, stock: e.target.value })} />
              <Toggle label="شارة «جديد»" checked={d.badgeNew} onChange={(v) => setD({ ...d, badgeNew: v })} />
              <Toggle label="نشر مباشرة في المتجر" hint="إذا لم تفعّليه، تُحفظ الموديلات كمسودات مخفية حتى تراجعيها." checked={d.publish} onChange={(v) => setD({ ...d, publish: v })} />
            </div>
          </Panel>
          {files.length > 0 && problems.length > 0 && <Notice kind="error">{problems.join(" ")}</Notice>}
          <button className="btn-dark w-full" disabled={problems.length > 0} onClick={run}>
            استيراد <span className="num">{groups.length || ""}</span> موديل
          </button>
          {existingCount > 0 && <p className="text-[12px] text-ash">لديك حالياً <span className="num">{existingCount}</span> منتجاً (غير التجريبية).</p>}
        </div>
      </div>
    </div>
  );
}
