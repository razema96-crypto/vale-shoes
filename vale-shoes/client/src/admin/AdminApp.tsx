import { useCallback, useEffect, useState } from "react";
import { Link, NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import { usePageMeta } from "../lib/meta";
import { Logo } from "../components/Logo";
import { AdminProducts, ProductEditor } from "./Products";
import { AdminOrders } from "./Orders";
import { AdminReviews } from "./Reviews";
import { AdminSettings } from "./Settings";
import { AdminOverview } from "./Overview";
import { BulkImport } from "./BulkImport";

type Me = { admin: { id: number; username: string } };

export default function AdminApp() {
  usePageMeta({ title: "لوحة التحكم", noindex: true });
  const [state, setState] = useState<"loading" | "in" | "out" | "error">("loading");
  const [setup, setSetup] = useState(false);
  const [me, setMe] = useState<Me["admin"] | null>(null);

  const check = useCallback(() => {
    api<Me>("/admin/me")
      .then((r) => {
        setMe(r.admin);
        setState("in");
      })
      .catch((e: ApiError) => {
        if (e.status === 401) {
          setSetup(!!(e.data as { setupRequired?: boolean })?.setupRequired);
          setState("out");
        } else setState("error");
      });
  }, []);
  useEffect(check, [check]);

  if (state === "loading") return <Shell><p className="p-10 text-ash">جارٍ التحقق…</p></Shell>;
  if (state === "error")
    return (
      <Shell>
        <div className="p-10">
          <p>تعذر الاتصال بالخادم.</p>
          <button className="btn-dark mt-4" onClick={check}>إعادة المحاولة</button>
        </div>
      </Shell>
    );
  if (state === "out") return <Login setup={setup} onIn={check} />;

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="bg-vale text-ink">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to="/admin" aria-label="لوحة التحكم"><Logo className="h-10" /></Link>
            <span className="text-ink/60 text-sm hidden sm:inline">لوحة التحكم</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link to="/" className="text-ink/70 hover:text-ink" target="_blank">عرض المتجر</Link>
            <span className="text-ink/50 hidden sm:inline">{me?.username}</span>
            <button
              className="text-ink/70 hover:text-ink underline underline-offset-4"
              onClick={async () => {
                await api("/admin/logout", { method: "POST" }).catch(() => {});
                setState("out");
              }}
            >
              تسجيل الخروج
            </button>
          </div>
        </div>
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-1 overflow-x-auto no-scrollbar text-[15px]" aria-label="أقسام لوحة التحكم">
          {[
            ["/admin", "نظرة عامة", true],
            ["/admin/products", "المنتجات"],
            ["/admin/import", "استيراد صور"],
            ["/admin/orders", "الطلبات"],
            ["/admin/reviews", "التقييمات"],
            ["/admin/settings", "الإعدادات"],
          ].map(([to, label, end]) => (
            <NavLink
              key={to as string}
              to={to as string}
              end={!!end}
              className={({ isActive }) => `px-4 py-3 whitespace-nowrap border-b-2 ${isActive ? "border-ink text-ink font-medium" : "border-transparent text-ink/60 hover:text-ink"}`}
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <Routes>
          <Route index element={<AdminOverview />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="products/new" element={<ProductEditor />} />
          <Route path="products/:id" element={<ProductEditor />} />
          <Route path="import" element={<BulkImport />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="reviews" element={<AdminReviews />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="*" element={<p>الصفحة غير موجودة.</p>} />
        </Routes>
      </main>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-paper">{children}</div>;
}

function Login({ setup, onIn }: { setup: boolean; onIn: () => void }) {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-vale text-ink grid place-items-center px-4">
      <div className="w-full max-w-sm">
        <Logo className="h-24 mx-auto block w-fit" />
        <h1 className="text-center text-xl mt-8">لوحة تحكم المتجر</h1>
        {setup ? (
          <div className="mt-8 text-ink/80 text-[15px] leading-8 bg-white/60 p-5">
            <p>لا يوجد حساب مدير بعد. لإنشائه، شغّل الأمر التالي في مجلد المشروع على الخادم:</p>
            <pre className="mt-3 bg-ink p-3 text-[13px] text-vale" dir="ltr">npm run create-admin</pre>
            <button className="btn-dark mt-5 w-full" onClick={onIn}>تحقق مجدداً</button>
          </div>
        ) : (
          <form
            className="mt-8 space-y-6"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setErr(null);
              try {
                await api("/admin/login", { method: "POST", json: { username: u, password: p } });
                navigate("/admin", { replace: true });
                onIn();
              } catch (e) {
                setErr((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="block">
              <span className="block text-[13px] text-ink/70 mb-1">اسم المستخدم</span>
              <input className="field bg-white/70 px-3 border-ink/25 focus:border-ink" value={u} onChange={(e) => setU(e.target.value)} autoComplete="username" dir="ltr" required />
            </label>
            <label className="block">
              <span className="block text-[13px] text-ink/70 mb-1">كلمة المرور</span>
              <input type="password" className="field bg-white/70 px-3 border-ink/25 focus:border-ink" value={p} onChange={(e) => setP(e.target.value)} autoComplete="current-password" dir="ltr" required />
            </label>
            {err && <p role="alert" className="text-danger text-[14px]">{err}</p>}
            <button className="btn-dark w-full" disabled={busy}>{busy ? "جارٍ الدخول…" : "تسجيل الدخول"}</button>
          </form>
        )}
      </div>
    </div>
  );
}
