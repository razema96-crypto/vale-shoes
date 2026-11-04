import type { ReactNode } from "react";

export function Panel({ title, actions, children }: { title?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="bg-white border border-ink/10 p-5 sm:p-6">
      {(title || actions) && (
        <div className="flex items-center justify-between gap-4 mb-5">
          {title && <h2 className="text-lg font-medium">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Notice({ kind = "info", children }: { kind?: "info" | "error" | "ok"; children: ReactNode }) {
  const cls = kind === "error" ? "border-danger/30 bg-danger/5 text-danger" : kind === "ok" ? "border-ok/30 bg-ok/5 text-ok" : "border-ink/15 bg-ivory text-smoke";
  return <div role={kind === "error" ? "alert" : "status"} className={`border px-4 py-3 text-[14px] ${cls}`}>{children}</div>;
}

export function Input({ label, hint, ...p }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input className="w-full border border-ink/15 bg-white px-3 h-11 focus:border-ink focus:outline-none" {...p} />
      {hint && <span className="block text-[12px] text-ash mt-1">{hint}</span>}
    </label>
  );
}

export function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input type="checkbox" className="mt-1 size-5 accent-ink" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        {label}
        {hint && <span className="block text-[12px] text-ash">{hint}</span>}
      </span>
    </label>
  );
}
