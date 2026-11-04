import { useEffect, useRef, useState } from "react";
import { LANGS, useLang, t, type Lang } from "../i18n";

/** Header language picker: العربية / עברית / English. */
export function LangSwitch() {
  const lang = useLang((s) => s.lang);
  const setLang = useLang((s) => s.setLang);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const current = LANGS.find((l) => l.code === lang)!;

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent && e.key !== "Escape") return;
      if (e instanceof MouseEvent && box.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const pick = (code: Lang) => {
    setOpen(false);
    if (code !== lang) setLang(code);
  };

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        className="h-11 min-w-11 px-2 inline-flex items-center justify-center gap-1 text-[13px] font-medium tracking-wide hover:opacity-60 transition-opacity"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("اللغة: {l}", { l: current.label })}
        onClick={() => setOpen((v) => !v)}
      >
        <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth={1.3} aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.6 2.5 3.9 5.5 3.9 9s-1.3 6.5-3.9 9c-2.6-2.5-3.9-5.5-3.9-9S9.4 5.5 12 3z" />
        </svg>
        <span>{current.short}</span>
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label={t("اختيار اللغة")}
          className="absolute top-full end-0 mt-1 min-w-36 bg-white border border-line shadow-[0_18px_40px_-20px_rgba(0,0,0,0.35)] py-1 z-[60] anim-fade"
        >
          {LANGS.map((l) => (
            <li key={l.code}>
              <button
                type="button"
                role="option"
                aria-selected={l.code === lang}
                lang={l.code}
                dir={l.code === "en" ? "ltr" : "rtl"}
                onClick={() => pick(l.code)}
                className={`w-full flex items-center justify-between gap-4 px-4 h-11 text-[15px] text-start hover:bg-paper ${l.code === lang ? "font-medium" : "text-ink/75"}`}
              >
                {l.label}
                {l.code === lang && <span className="size-1.5 rounded-full bg-vale" aria-hidden="true" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
