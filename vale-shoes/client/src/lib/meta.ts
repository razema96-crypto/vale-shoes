import { t } from "../i18n";
import { useEffect } from "react";

const SITE = "VALE Shoes";
function setMeta(attr: "name" | "property", key: string, value: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = value;
}

/** Per-page title, description, Open Graph, canonical and optional JSON-LD. */
export function usePageMeta(opts: { title?: string; description?: string; image?: string; jsonLd?: object | null; noindex?: boolean }) {
  const { title, description, image, jsonLd, noindex } = opts;
  const ld = jsonLd ? JSON.stringify(jsonLd) : "";
  useEffect(() => {
    const full = title ? `${title} | ${SITE}` : `${SITE} | ${t("أحذية نسائية مصنوعة يدوياً")}`;
    document.title = full;
    setMeta("property", "og:title", full);
    if (description) {
      setMeta("name", "description", description);
      setMeta("property", "og:description", description);
    }
    if (image) setMeta("property", "og:image", new URL(image, location.origin).href);
    setMeta("property", "og:url", location.href);
    setMeta("name", "robots", noindex ? "noindex" : "index,follow");
    let canon = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canon) {
      canon = document.createElement("link");
      canon.rel = "canonical";
      document.head.appendChild(canon);
    }
    canon.href = location.origin + location.pathname;
    let script: HTMLScriptElement | null = null;
    if (ld) {
      script = document.createElement("script");
      script.type = "application/ld+json";
      script.dataset.page = "1";
      script.textContent = ld;
      document.head.appendChild(script);
    }
    return () => script?.remove();
  }, [title, description, image, ld, noindex]);
}
