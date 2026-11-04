import { t, useLang, isRtl } from "./i18n";
import { lazy, Suspense, useEffect, useLayoutEffect } from "react";
import { useReveal } from "./lib/reveal";
import { BrowserRouter, MemoryRouter, Route, Routes, useLocation, Outlet } from "react-router-dom";
import { PREVIEW } from "./lib/preview";

// The preview is hosted at an unknown path inside a frame, so it keeps its route in memory.
const Router = PREVIEW ? MemoryRouter : BrowserRouter;
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { CartDrawer } from "./components/CartDrawer";
import { PageLoader } from "./components/States";
import { useCatalog } from "./store/catalog";
import { CloseIcon } from "./components/Icons";
import Home from "./pages/Home";

const Shop = lazy(() => import("./pages/Shop"));
const Collections = lazy(() => import("./pages/Collections"));
const ProductPage = lazy(() => import("./pages/ProductPage"));
const CartPage = lazy(() => import("./pages/CartPage"));
const Checkout = lazy(() => import("./pages/Checkout"));
const OrderConfirmation = lazy(() => import("./pages/OrderConfirmation"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminApp = lazy(() => import("./admin/AdminApp"));
const Studio = lazy(() => import("./pages/Studio"));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function CartNotice() {
  const notice = useCatalog((s) => s.cartNotice);
  const dismiss = useCatalog((s) => s.dismissNotice);
  if (!notice) return null;
  return (
    <div role="status" className="fixed bottom-4 inset-x-4 md:inset-x-auto md:end-6 md:max-w-sm z-[90] bg-ink text-ivory p-4 pe-12 text-[14px] shadow-2xl anim-up">
      {notice}
      <button className="absolute top-2 end-2 grid size-9 place-items-center" onClick={dismiss} aria-label={t("إغلاق التنبيه")}><CloseIcon className="size-4" /></button>
    </div>
  );
}

function StoreLayout() {
  const lang = useLang((s) => s.lang);
  // Language + direction on <html>; the dashboard (outside this layout) always goes back to Arabic.
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.lang = lang;
    root.dir = isRtl(lang) ? "rtl" : "ltr";
    return () => {
      root.lang = "ar";
      root.dir = "rtl";
    };
  }, [lang]);
  return (
    // keyed by language so every text re-renders in the new language
    <div key={lang} className="min-h-screen flex flex-col">
      <Header />
      <main id="main" className="flex-1">
        <Suspense fallback={<div className="pt-24"><PageLoader /></div>}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <CartDrawer />
      <CartNotice />
    </div>
  );
}

export default function App() {
  const load = useCatalog((s) => s.load);
  useReveal();
  useEffect(() => {
    load();
  }, [load]);
  return (
    <Router>
      <ScrollToTop />
      <Routes>
        <Route element={<StoreLayout />}>
          <Route index element={<Home />} />
          <Route path="shop" element={<Shop />} />
          <Route path="collections" element={<Collections />} />
          <Route path="product/:slug" element={<ProductPage />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="checkout" element={<Checkout />} />
          <Route path="order/:code" element={<OrderConfirmation />} />
          <Route path="about" element={<About />} />
          <Route path="contact" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route path="admin/*" element={<Suspense fallback={<PageLoader />}><AdminApp /></Suspense>} />
        <Route path="studio" element={<Suspense fallback={null}><Studio /></Suspense>} />
      </Routes>
    </Router>
  );
}
