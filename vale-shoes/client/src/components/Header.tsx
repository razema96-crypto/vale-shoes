import { t } from "../i18n";
import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Logo } from "./Logo";
import { BagIcon, CloseIcon, MenuIcon, SearchIcon } from "./Icons";
import { cartCount, useCart } from "../store/cart";
import { SearchOverlay } from "./SearchOverlay";
import { LangSwitch } from "./LangSwitch";
import { useCatalog } from "../store/catalog";

export const NAV = [
  { to: "/", label: "الرئيسية", end: true },
  { to: "/shop", label: "المتجر" },
  { to: "/collections", label: "المجموعات" },
  { to: "/about", label: "من نحن" },
  { to: "/contact", label: "تواصل معنا" },
];

export function Header() {
  const { pathname } = useLocation();
  const overHero = pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const count = useCart((s) => cartCount(s.lines));
  const openDrawer = useCart((s) => s.openDrawer);
  const [bump, setBump] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => {
    if (!count) return;
    setBump(true);
    const t = setTimeout(() => setBump(false), 450);
    return () => clearTimeout(t);
  }, [count]);
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const compact = scrolled || !overHero;
  const settings = useCatalog((s) => s.settings);
  const strip = [settings?.paymentMethods.cod && t("الدفع عند الاستلام"), settings?.paymentMethods.whatsapp && t("اطلبي عبر واتساب")].filter(Boolean);

  const navLink = (n: (typeof NAV)[number]) => (
    <NavLink
      to={n.to}
      end={n.end}
      className={({ isActive }) => `group relative py-2 transition-colors ${isActive ? "text-ink" : "text-ink/65 hover:text-ink"}`}
    >
      {({ isActive }) => (
        <>
          {t(n.label)}
          <span
            className={`absolute start-0 -bottom-0.5 h-[2px] bg-vale transition-all duration-500 ease-[var(--ease-lux)] ${isActive ? "w-full" : "w-0 group-hover:w-full"}`}
            aria-hidden="true"
          />
        </>
      )}
    </NavLink>
  );

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:start-3 focus:z-[100] focus:bg-ivory focus:text-ink focus:px-4 focus:py-2">
        {t("تخطَّ إلى المحتوى")}
      </a>
      <header className="fixed inset-x-0 top-0 z-50 text-ink bg-white border-b border-line">
        {/* slim brand strip */}
        <div className={`bg-vale overflow-hidden transition-[height] duration-500 ease-[var(--ease-lux)] ${compact ? "h-0" : "h-8"}`}>
          <p className="h-8 grid place-items-center text-[12.5px] tracking-wide">
            <span>
              {[t("صناعة يدوية"), ...strip].join(" — ")}
            </span>
          </p>
        </div>
        <div className="container-lux grid grid-cols-[1fr_auto_1fr] items-center h-16 md:h-[76px]">
          {/* start (right): nav on desktop, menu button on mobile */}
          <div className="flex items-center">
            <button
              className="lg:hidden grid size-11 place-items-center -ms-2"
              aria-label={menuOpen ? t("إغلاق القائمة") : t("فتح القائمة")}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
            <nav aria-label={t("القائمة الرئيسية")} className="hidden lg:block">
              <ul className="flex items-center gap-8 text-[15px]">
                {NAV.slice(0, 3).map((n) => <li key={n.to}>{navLink(n)}</li>)}
              </ul>
            </nav>
          </div>

          <Link to="/" aria-label={t("VALE Shoes — الصفحة الرئيسية")} className="justify-self-center">
            <Logo className="h-11 md:h-[54px]" />
          </Link>

          {/* end (left): secondary nav + icons */}
          <div className="flex items-center justify-end gap-6">
            <nav aria-label={t("روابط إضافية")} className="hidden lg:block">
              <ul className="flex items-center gap-8 text-[15px]">
                {NAV.slice(3).map((n) => <li key={n.to}>{navLink(n)}</li>)}
              </ul>
            </nav>
            <div className="flex items-center -me-2">
              <LangSwitch />
              <button className="grid size-11 place-items-center hover:opacity-60 transition-opacity" aria-label={t("بحث")} onClick={() => setSearchOpen(true)}>
                <SearchIcon strokeWidth={1.3} />
              </button>
              <button
                className="relative grid size-11 place-items-center hover:opacity-60 transition-opacity"
                aria-label={t("سلة التسوق، {n} قطعة", { n: count })}
                onClick={openDrawer}
              >
                <BagIcon strokeWidth={1.3} />
                {count > 0 && (
                  <span
                    className={`absolute top-1.5 end-1 grid min-w-[18px] h-[18px] place-items-center rounded-full px-1 text-[10.5px] font-bold bg-vale text-ink transition-transform ${bump ? "scale-125" : "scale-100"}`}
                    aria-hidden="true"
                  >
                    <span className="num">{count}</span>
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>
      {menuOpen && (
        <div id="mobile-menu" className="lg:hidden fixed inset-x-0 bottom-0 top-[var(--header-h,64px)] z-40 bg-white text-ink anim-fade overflow-y-auto" style={{ ["--header-h" as string]: compact ? "65px" : "97px" }}>
          <nav aria-label={t("قائمة الجوال")} className="container-lux pt-4 pb-12">
            <ul>
              {NAV.map((n, i) => (
                <li key={n.to} className="anim-rise border-b border-line" style={{ animationDelay: `${60 + i * 50}ms` }}>
                  <NavLink
                    to={n.to}
                    end={n.end}
                    className={({ isActive }) => `flex items-center gap-3 py-5 text-[26px] h-display ${isActive ? "text-ink" : "text-ink/75"}`}
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && <span className="size-2 rounded-full bg-vale" aria-hidden="true" />}
                        {t(n.label)}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
            <Link to="/shop" className="btn-dark w-full mt-10">{t("تسوق الآن")}</Link>
          </nav>
        </div>
      )}
      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
    </>
  );
}
