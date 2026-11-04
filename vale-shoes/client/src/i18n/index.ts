/**
 * Storefront languages: Arabic (default), Hebrew, English.
 * Texts are written in Arabic in the code and looked up in DICT for the other two languages,
 * so the Arabic source stays readable and anything untranslated falls back to Arabic.
 * The admin dashboard stays Arabic.
 */
import { create } from "zustand";
import { DICT } from "./dict";

export type Lang = "ar" | "he" | "en";
export const LANGS: { code: Lang; label: string; short: string }[] = [
  { code: "ar", label: "العربية", short: "ع" },
  { code: "he", label: "עברית", short: "עב" },
  { code: "en", label: "English", short: "EN" },
];
export const isRtl = (l: Lang) => l !== "en";

const KEY = "vale-lang";
function initial(): Lang {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "ar" || saved === "he" || saved === "en") return saved;
  } catch {
    /* storage blocked */
  }
  return "ar";
}

export const useLang = create<{ lang: Lang; setLang: (l: Lang) => void }>((set) => ({
  lang: initial(),
  setLang: (lang) => {
    try {
      localStorage.setItem(KEY, lang);
    } catch {
      /* storage blocked */
    }
    set({ lang });
  },
}));

type Vars = Record<string, string | number>;
const fill = (s: string, v?: Vars) => (v ? s.replace(/\{(\w+)\}/g, (_, k) => (k in v ? String(v[k]) : `{${k}}`)) : s);

export function translate(lang: Lang, ar: string, vars?: Vars): string {
  if (lang === "ar" || !ar) return fill(ar, vars);
  const hit = DICT[ar];
  if (hit) return fill(hit[lang], vars);
  // Product names like "موديل 12"
  const m = ar.match(/^موديل\s+(\d+)$/);
  if (m) return translate(lang, "موديل {n}", { n: m[1] });
  if (import.meta.env.DEV) console.warn("[i18n] missing:", ar);
  return fill(ar, vars);
}

/** Translate for the current language. The app re-renders on language change (keyed root). */
export const t = (ar: string, vars?: Vars) => translate(useLang.getState().lang, ar, vars);
export const currentLang = () => useLang.getState().lang;
