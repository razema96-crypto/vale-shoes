#!/usr/bin/env python3
"""
Renders the DEMO product images from the site's own procedural 3D shoe model.

Requires the client dev server running (npm run dev --prefix client) and Python Playwright:
    pip install playwright pillow && python -m playwright install chromium
Usage:
    python3 scripts/render_demo_images.py [--base http://localhost:5173] [--only slug1,slug2]
Output: server/demo-images/<slug>-<colorIndex>-<angle>.webp
"""
import argparse, io, json, pathlib, time, urllib.parse
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "server" / "demo-images"
ANGLES = ["hero", "side", "top"]

ap = argparse.ArgumentParser()
ap.add_argument("--base", default="http://localhost:5173")
ap.add_argument("--only", default="")
ap.add_argument("--force", action="store_true", help="re-render images that already exist")
args = ap.parse_args()
only = set(filter(None, args.only.split(",")))

catalog = json.loads((ROOT / "shared" / "demo-catalog.json").read_text(encoding="utf-8"))
OUT.mkdir(parents=True, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
    page = browser.new_page(viewport={"width": 640, "height": 800}, device_scale_factor=1)
    for prod in catalog["products"]:
        if only and prod["slug"] not in only:
            continue
        for ci, color in enumerate(prod["colors"]):
            for angle in ANGLES:
                dest = OUT / f"{prod['slug']}-{ci}-{angle}.webp"
                if dest.exists() and not args.force:
                    continue
                q = {"model": prod["model"], "upper": color["hex"], "sole": color["sole"],
                     "finish": prod.get("finish", "polished"), "angle": angle, "dpr": "2"}
                if prod.get("toe"):
                    q["toe"] = prod["toe"]
                page.goto(f"{args.base}/studio?{urllib.parse.urlencode(q)}")
                page.wait_for_function("window.__studioReady === true", timeout=120000)
                time.sleep(0.3)
                png = page.locator("canvas").screenshot()
                im = Image.open(io.BytesIO(png)).convert("RGB").resize((1000, 1250), Image.LANCZOS)
                im.save(dest, "WEBP", quality=82, method=6)
                print("rendered", dest.name, flush=True)
    browser.close()
