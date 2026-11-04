#!/usr/bin/env python3
"""
End-to-end smoke test of the store with Playwright (mobile + desktop).
Requires: the app running (npm run dev) and an admin account.
    ADMIN_USER=owner ADMIN_PASS=... python3 scripts/e2e_test.py [--base http://localhost:5173] [--shots out_dir]
"""
import argparse, os, re, sys, time, urllib.parse, json
from playwright.sync_api import sync_playwright, expect

ap = argparse.ArgumentParser()
ap.add_argument("--base", default="http://localhost:5173")
ap.add_argument("--shots", default="e2e-shots")
args = ap.parse_args()
BASE = args.base
os.makedirs(args.shots, exist_ok=True)
USER, PASS = os.environ.get("ADMIN_USER", "owner"), os.environ.get("ADMIN_PASS", "")
GL = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]

failures, errors = [], []
def check(cond, msg):
    print(("  ✓ " if cond else "  ✗ ") + msg, flush=True)
    if not cond: failures.append(msg)

def shot(page, name, full=False):
    page.screenshot(path=f"{args.shots}/{name}.png", full_page=full)

def watch(page, tag):
    page.on("pageerror", lambda e: errors.append(f"[{tag}] pageerror: {e}"))
    page.on("console", lambda m: errors.append(f"[{tag}] console.{m.type}: {m.text}") if m.type == "error" else None)

with sync_playwright() as p:
    browser = p.chromium.launch(args=GL)

    # ---------------- Admin: configure WhatsApp number ----------------
    print("Admin")
    actx = browser.new_context(viewport={"width": 1280, "height": 900}, locale="ar")
    a = actx.new_page(); watch(a, "admin")
    a.goto(f"{BASE}/admin")
    a.get_by_label("اسم المستخدم").fill(USER)
    a.get_by_label("كلمة المرور").fill("wrong-password")
    a.get_by_role("button", name="تسجيل الدخول").click()
    expect(a.get_by_role("alert")).to_contain_text("غير صحيحة")
    check(True, "wrong password rejected")
    a.get_by_label("كلمة المرور").fill(PASS)
    a.get_by_role("button", name="تسجيل الدخول").click()
    expect(a.get_by_text("نظرة عامة")).to_be_visible()
    check(True, "admin login works")
    shot(a, "admin-overview")
    a.get_by_role("link", name="الإعدادات", exact=True).click()
    a.get_by_label("رقم واتساب المتجر").fill("905000000000")
    a.get_by_label("رسوم التوصيل").fill("25")
    a.get_by_role("button", name="حفظ الإعدادات").click()
    expect(a.get_by_text("تم حفظ الإعدادات.")).to_be_visible()
    check(True, "settings saved (test WhatsApp number 905000000000, delivery 25)")

    # reset stock so repeated runs don't exhaust inventory (also exercises bulk update)
    ids = [x["id"] for x in a.request.get(f"{BASE}/api/admin/products").json()]
    r = a.request.post(f"{BASE}/api/admin/products/bulk-update", data={"ids": ids, "action": "set", "patch": {"stock": 20}}, headers={"origin": BASE})
    check(r.ok, f"bulk stock reset ({len(ids)} products)")

    # unauthenticated API must be rejected
    r = browser.new_context().request.get(f"{BASE}/api/admin/orders")
    check(r.status == 401, f"admin API without session → {r.status}")

    # ---------------- Desktop storefront ----------------
    print("Desktop storefront")
    dctx = browser.new_context(viewport={"width": 1440, "height": 900}, locale="ar")
    d = dctx.new_page(); watch(d, "desktop"); d.set_default_timeout(60000)
    d.goto(BASE)
    expect(d.get_by_role("heading", name="الأناقة تبدأ من خطواتك")).to_be_visible()
    time.sleep(3)
    shot(d, "desktop-hero")
    strip_h = lambda: d.evaluate("document.querySelector('header > div').getBoundingClientRect().height")
    check(strip_h() > 20, "brand strip visible at top")
    d.evaluate("window.scrollTo(0, 900)")
    d.wait_for_function("document.querySelector('header > div').getBoundingClientRect().height < 2", timeout=15000)
    check(True, "brand strip collapses on scroll")
    shot(d, "desktop-home-scrolled")

    # nav links
    for label, path in [("المتجر", "/shop"), ("المجموعات", "/collections"), ("من نحن", "/about"), ("تواصل معنا", "/contact"), ("الرئيسية", "/")]:
        d.locator("header").get_by_role("link", name=label, exact=True).click()
        d.wait_for_url(re.compile(re.escape(path) + r"$"))
        check(True, f"nav → {label}")
        if path != "/": shot(d, f"desktop-{path.strip('/')}", full=True)

    # shop filters + sort
    d.goto(f"{BASE}/shop")
    d.wait_for_selector("article")
    total = d.locator("article").count()
    aside = d.get_by_role("complementary")
    aside.get_by_role("button", name="بوت", exact=True).click()
    expect(d).to_have_url(re.compile("category="))
    expect(d.locator("h1")).to_have_text("بوت")
    boots = d.locator("article").count()
    check(0 < boots < total, f"category filter: {total} → {boots}")
    aside.get_by_role("button", name="بوت", exact=True).click()
    expect(d.locator("article")).to_have_count(total)
    aside.get_by_role("button", name="أحمر").click()
    expect(d).to_have_url(re.compile("colors="))
    d.wait_for_function(f"document.querySelectorAll('article').length < {total}")
    red = d.locator("article").count()
    check(0 < red < total, f"color filter (أحمر): {red}")
    d.get_by_role("button", name="مسح كل الفلاتر").click()
    expect(d.locator("article")).to_have_count(total)
    d.get_by_label("ترتيب المنتجات").select_option("price-asc")
    expect(d).to_have_url(re.compile("sort=price-asc"))
    try:
        d.wait_for_function("(() => { const p=[...document.querySelectorAll('article [data-price]')].map(e=>+e.dataset.price); return p.length>2 && p.every((v,i)=>!i||p[i-1]<=v) })()", timeout=15000)
    except Exception: pass
    prices = d.evaluate("[...document.querySelectorAll('article [data-price]')].map(e => +e.dataset.price)")
    check(len(prices) == total and prices == sorted(prices), f"sort by price ascending: {prices}")
    shot(d, "desktop-shop-sorted")
    aside.get_by_role("button", name="40", exact=True).click()
    expect(d).to_have_url(re.compile("sizes=40"))
    check(d.locator("article").count() > 0, "size filter works")

    # search
    d.get_by_role("button", name="بحث").click()
    d.get_by_label("ابحث عن حذاء").fill("ستيليتو")
    time.sleep(0.3)
    check(d.get_by_role("dialog").get_by_role("link").count() >= 3, "search finds stilettos")
    d.keyboard.press("Escape")

    # quick view + validation
    d.goto(f"{BASE}/shop")
    d.wait_for_selector("article")
    d.locator("article").first.hover()
    d.locator("article").first.get_by_role("button", name=re.compile("نظرة سريعة")).click()
    dlg = d.get_by_role("dialog")
    expect(dlg).to_be_visible()
    shot(d, "desktop-quickview")
    dlg.get_by_role("button", name="أضف إلى السلة", exact=True).click()
    expect(dlg.get_by_role("alert")).to_contain_text("المقاس")
    check(True, "quick view blocks add without size")
    d.keyboard.press("Escape")

    # product page
    d.goto(f"{BASE}/product/stiletto-vale-classic")
    expect(d.get_by_role("heading", level=1)).to_contain_text("ستيليتو")
    ld = d.evaluate("[...document.querySelectorAll('script[type=\"application/ld+json\"]')].map(s=>s.textContent).join('|')")
    check('"@type":"Product"' in ld, "product JSON-LD present")
    d.get_by_role("button", name="أضف إلى السلة", exact=True).first.click()
    expect(d.get_by_role("alert")).to_contain_text("المقاس")
    d.get_by_role("radio", name="بيج").click()
    d.get_by_role("radio", name="38").click()
    d.get_by_role("button", name="زيادة الكمية").first.click()
    d.get_by_role("button", name="أضف إلى السلة", exact=True).first.click()
    drawer = d.get_by_role("dialog", name="سلة التسوق")
    expect(drawer).to_be_visible()
    check("بيج" in drawer.inner_text() and "38" in drawer.inner_text(), "drawer shows chosen colour/size")
    shot(d, "desktop-drawer")
    badge = d.locator("header button[aria-label^='سلة التسوق']").get_attribute("aria-label")
    check("2" in badge, f"cart count live: {badge}")
    d.keyboard.press("Escape")
    shot(d, "desktop-product", full=True)

    # ---------------- Mobile storefront + checkout ----------------
    print("Mobile flow")
    mctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True, locale="ar")
    m = mctx.new_page(); watch(m, "mobile"); m.set_default_timeout(60000)
    m.goto(BASE)
    time.sleep(3)
    shot(m, "mobile-hero")
    m.get_by_role("button", name="فتح القائمة").click()
    time.sleep(1)
    shot(m, "mobile-menu")
    m.locator("#mobile-menu").get_by_role("link", name="المتجر").click()
    m.wait_for_url(re.compile("/shop"))
    m.wait_for_selector("article")
    shot(m, "mobile-shop")
    sw = m.evaluate("document.documentElement.scrollWidth"); check(sw <= 390, f"no horizontal scroll on shop ({sw}px)")
    m.get_by_role("button", name=re.compile("تصفية")).click()
    shot(m, "mobile-filters")
    m.get_by_role("dialog", name="تصفية المنتجات").get_by_role("button", name="كعب عالٍ").click()
    m.get_by_role("dialog", name="تصفية المنتجات").get_by_role("button", name=re.compile("^عرض")).click()
    check(m.locator("article").count() >= 2, "mobile category filter")
    m.locator("article a").first.click()
    m.wait_for_url(re.compile("/product/"))
    m.get_by_role("radio", name="37").click()
    m.get_by_role("button", name="أضف إلى السلة", exact=True).first.click()
    expect(m.get_by_role("dialog", name="سلة التسوق")).to_be_visible()
    shot(m, "mobile-drawer")
    m.get_by_role("link", name="إتمام الطلب").click()
    m.wait_for_url(re.compile("/checkout"))
    m.get_by_role("button", name=re.compile("تأكيد الطلب")).click()
    check(m.locator("[aria-invalid=true]").count() >= 4, "checkout shows required-field errors")
    shot(m, "mobile-checkout-errors", full=True)
    m.locator("#f-name").fill("ليلى أحمد")
    m.locator("#f-phone").fill("abc")
    m.locator("#f-city").fill("إسطنبول")
    m.locator("#f-address").fill("حي فاتح، شارع 12، مبنى 4")
    m.get_by_role("button", name=re.compile("تأكيد الطلب")).click()
    check(m.locator("#err-phone").count() == 1, "invalid phone rejected")
    m.locator("#f-phone").fill("+90 500 000 0000")
    m.locator("#f-notes").fill("مساءً من فضلك")
    totals = m.get_by_role("complementary", name="ملخص الطلب").inner_text()
    m.get_by_role("button", name=re.compile("تأكيد الطلب")).click()
    m.wait_for_url(re.compile(r"/order/VL-"), timeout=15000)
    code = m.url.rsplit("/", 1)[-1]
    check(True, f"COD order placed: {code}")
    shot(m, "mobile-confirmation", full=True)
    check(m.evaluate("JSON.parse(localStorage.getItem('vale-cart-v1')).state.lines.length") == 0, "cart cleared after order")

    # ---------------- WhatsApp ordering ----------------
    print("WhatsApp ordering")
    wa_urls = []
    def wa_route(route):
        wa_urls.append(route.request.url)
        route.fulfill(status=200, content_type="text/html", body="<title>wa</title>whatsapp stub")
    dctx.route(re.compile(r"https://(wa\.me|api\.whatsapp\.com)/.*"), wa_route)
    w = dctx.new_page(); watch(w, "wa")
    w.goto(f"{BASE}/cart")
    expect(w.get_by_role("heading", name="سلة التسوق")).to_be_visible()
    with dctx.expect_page() as popup_info:
        w.get_by_role("button", name="اطلب عبر واتساب").first.click()
    pop = popup_info.value
    for _ in range(40):
        if wa_urls: break
        time.sleep(0.25)
    url = wa_urls[-1] if wa_urls else pop.url
    check("wa.me/905000000000" in url or "api.whatsapp.com" in url, f"WhatsApp opened: {url[:60]}…")
    text = urllib.parse.unquote(url.split("text=", 1)[1]).replace("+", " ") if "text=" in url else ""
    print("    message:\n      " + text.replace("\n", "\n      "))
    check("ستيليتو ڤالي الكلاسيكي" in text and "المقاس: 38" in text and "اللون: بيج" in text and "الكمية: 2" in text, "message has product, size, colour, qty")
    check("الإجمالي" in text and "1,405" in text, "message has correct total (690×2 + 25)")
    pop.close()

    # checkout with WhatsApp method creates an order too
    w.goto(f"{BASE}/checkout")
    w.locator("#f-name").fill("سارة")
    w.locator("#f-phone").fill("905111111111")
    w.locator("#f-city").fill("أنقرة")
    w.locator("#f-address").fill("شارع الاستقلال 10")
    w.get_by_text("تأكيد الطلب عبر واتساب").click()
    n0 = len(wa_urls)
    with dctx.expect_page() as pi:
        w.get_by_role("button", name="اطلب عبر واتساب").click()
    pop = pi.value
    for _ in range(240):
        if len(wa_urls) > n0: break
        time.sleep(0.25)
    u2 = wa_urls[-1] if len(wa_urls) > n0 else ""
    if not u2: print("    debug:", n0, len(wa_urls), pop.url[:80], [pg.url[:60] for pg in dctx.pages], w.locator("[role=alert]").all_inner_texts(), w.locator("button[type=submit]").all_inner_texts())
    t2 = urllib.parse.unquote(u2.split("text=", 1)[1]) if "text=" in u2 else ""
    print("    checkout message:\n      " + t2.replace("\n", "\n      "))
    check("رقم الطلب: VL-" in t2 and "الاسم: سارة" in t2 and "العنوان: شارع الاستقلال 10" in t2, "checkout WhatsApp message includes order code + delivery details")
    pop.close()
    w.wait_for_url(re.compile(r"/order/VL-"))

    # ---------------- Admin sees orders, updates status ----------------
    print("Admin orders")
    a.goto(f"{BASE}/admin/orders")
    expect(a.get_by_text(code)).to_be_visible()
    check(True, "admin sees the new COD order")
    row = a.locator("li", has_text=code)
    row.get_by_role("combobox").select_option("confirmed")
    time.sleep(0.5)
    a.reload()
    check(a.locator("li", has_text=code).get_by_role("combobox").input_value() == "confirmed", "order status persisted")
    shot(a, "admin-orders")
    a.goto(f"{BASE}/admin/products")
    shot(a, "admin-products")
    a.get_by_role("link", name="تعديل").first.click()
    a.wait_for_url(re.compile(r"/admin/products/\d+"))
    shot(a, "admin-editor", full=True)

    browser.close()

print("\nConsole/page errors:")
noise = ("THREE.Clock", "PCFSoftShadowMap", "favicon", "net::ERR_ABORTED", "[admin] console.error: Failed to load resource: the server responded with a status of 401")
real = [e for e in errors if not any(n in e for n in noise)]
print("\n".join(real) or "  none")
print(f"\n{len(failures)} failure(s)")
for f in failures: print("  -", f)
sys.exit(1 if failures or real else 0)
