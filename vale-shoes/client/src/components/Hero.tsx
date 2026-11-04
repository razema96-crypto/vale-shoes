import { t } from "../i18n";
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import logoSvg from "../assets/vale-logo.svg?raw";
import logoUrl from "../assets/vale-logo.svg?url";
import { useCatalog } from "../store/catalog";
import { prefersReducedMotion } from "../lib/format";
import { HeroBackdrop } from "./HeroBackdrop";

// The real logo, drawn as an outline first (pathLength=1 lets CSS animate the stroke), then filled.
const drawnLogo = logoSvg
  .replace('role="img" aria-label="VALE Shoes — Hand Made"', 'aria-hidden="true"')
  .replace("<path ", '<path pathLength="1" ');

/**
 * Brand hero: the VALE logo on a yellow disc (like the shoe box), drawn in by hand,
 * with a glossy sheen, slow gold orbits and floating gold dust. Tilts gently in 3D with the pointer.
 * No product photos here — the models live in the shop.
 */
export function Hero() {
  const settings = useCatalog((s) => s.settings);
  const title = t(settings?.hero.title || "الأناقة تبدأ من خطواتك");
  const subtitle = t(settings?.hero.subtitle || "VALE Shoes — صناعة يدوية، جودة استثنائية، وأناقة لا تُنسى.");
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = stage.current;
    if (!el || prefersReducedMotion() || window.matchMedia("(pointer: coarse)").matches) return;
    let raf = 0;
    const on = (e: PointerEvent) => {
      const x = e.clientX / window.innerWidth - 0.5;
      const y = e.clientY / window.innerHeight - 0.5;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty("--tx", x.toFixed(3));
        el.style.setProperty("--ty", y.toFixed(3));
      });
    };
    window.addEventListener("pointermove", on, { passive: true });
    return () => { window.removeEventListener("pointermove", on); cancelAnimationFrame(raf); };
  }, []);

  return (
    <section className="brand-hero relative overflow-hidden bg-ivory" aria-labelledby="hero-title">
      <HeroBackdrop />

      <div
        ref={stage}
        className="relative container-lux flex flex-col items-center justify-center text-center pt-28 md:pt-32 pb-14 md:pb-14 min-h-[92svh] md:min-h-[100svh]"
        style={{ ["--tx" as string]: 0, ["--ty" as string]: 0 }}
      >
        <div className="brand-emblem" aria-hidden="true">
          <div className="brand-ring brand-ring-1" />
          <div className="brand-ring brand-ring-2" />
          <div className="brand-ring brand-ring-3" />
          <div className="brand-disc">
            <div className="brand-logo-wrap">
              <span className="brand-logo" dangerouslySetInnerHTML={{ __html: drawnLogo }} />
              <span className="brand-sheen" style={{ WebkitMaskImage: `url(${logoUrl})`, maskImage: `url(${logoUrl})` }} />
            </div>
          </div>
        </div>

        <h1 id="hero-title" className="sr-only">VALE Shoes — {title}</h1>
        <p className="brand-title h-display mt-12 md:mt-14 text-[2.1rem] leading-[1.4] sm:text-5xl lg:text-[3.4rem]" aria-hidden="true">
          {title}
        </p>
        <p className="brand-sub mt-3 max-w-md text-[15px] md:text-[17px] text-ash leading-8 text-balance">{subtitle}</p>
        <div className="brand-cta mt-8 flex flex-col sm:flex-row justify-center gap-3 w-full sm:w-auto">
          <Link to="/shop" className="btn-dark">{t("تسوقي الآن")}</Link>
          <Link to="/collections" className="btn-ghost-dark">{t("اكتشفي المجموعة")}</Link>
        </div>

        <a href="#collections" className="brand-scroll hidden md:flex mt-10 flex-col items-center gap-2 text-[11px] text-ash" aria-label={t("انزلي لرؤية المجموعات")}>
          <span className="latin tracking-[0.35em] text-gold">SCROLL</span>
          <span className="brand-scroll-line" />
        </a>
      </div>

      <div className="relative bg-vale overflow-hidden py-3 flex" dir="ltr" aria-hidden="true">
        <div className="hero-marquee latin text-[17px] md:text-[20px] leading-7 tracking-[0.2em] whitespace-nowrap shrink-0">
          {Array.from({ length: 2 }).map((_, r) => (
            <span key={r} className="inline-flex">
              {Array.from({ length: 3 }).map((__, j) => (
                <span key={j} className="px-6">VALE SHOES <span className="mx-5">✦</span> HAND MADE <span className="mx-5">✦</span></span>
              ))}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
