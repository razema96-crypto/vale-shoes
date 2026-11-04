/** Normalises Arabic text for forgiving search (alef forms, taa marbuta, yaa, diacritics, tatweel). */
export function normalizeArabic(s: string) {
  return s
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ڤ/g, "ف")
    .replace(/\s+/g, " ");
}
