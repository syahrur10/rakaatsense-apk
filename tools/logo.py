"""Sumber logo RakaatSense: mihrab (lengkungan masjid) + bulan sabit + sajadah. Hasilkan SVG & PNG."""
import asyncio, os
from playwright.async_api import async_playwright

GREEN_A, GREEN_B = "#1DB86E", "#0A6B40"
CRES = "M49.31 43.50A13.5 13.5 0 1 0 61.73 61.49A11 11 0 1 1 49.31 43.50Z"
STAR = "M60.50,41.90 L61.38,44.29 L63.92,44.39 L61.93,45.96 L62.62,48.41 L60.50,47.00 L58.38,48.41 L59.07,45.96 L57.08,44.39 L59.62,44.29Z"

def art(transform=""):
    return f'''<g {transform}>
<path d="M26 80V52C26 38 38 30 50 13C62 30 74 38 74 52V80Z" fill="#fff"/>
<path d="M32 80V53C32 43 41 36.5 50 23C59 36.5 68 43 68 53V80Z" fill="#DDF4E6"/>
<path d="{CRES}" fill="#0E7C4A"/><path d="{STAR}" fill="#E0A81E"/>
<rect x="21" y="80" width="58" height="6" rx="3" fill="#F2CD6B"/></g>'''

DEFS = f'<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{GREEN_A}"/><stop offset="1" stop-color="{GREEN_B}"/></linearGradient></defs>'

def svg(kind):
    if kind == "full":      # ikon kotak membulat (favicon / PWA)
        return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">{DEFS}<rect width="100" height="100" rx="24" fill="url(#g)"/>{art()}</svg>'
    if kind == "square":    # tanpa sudut membulat (dipotong sistem / maskable)
        return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">{DEFS}<rect width="100" height="100" fill="url(#g)"/>{art("transform=\"translate(50 50) scale(.78) translate(-50 -50)\"")}</svg>'
    if kind == "bg":
        return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">{DEFS}<rect width="100" height="100" fill="url(#g)"/></svg>'
    if kind == "fg":        # adaptive foreground, area aman 66%
        return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">{art("transform=\"translate(50 50) scale(.62) translate(-50 -49.5)\"")}</svg>'
    if kind == "mono":
        return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g transform="translate(50 50) scale(.62) translate(-50 -49.5)"><path d="M26 80V52C26 38 38 30 50 13C62 30 74 38 74 52V80Z" fill="#000"/><rect x="21" y="80" width="58" height="6" rx="3" fill="#000"/></g></svg>'
    if kind == "round":
        return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">{DEFS}<circle cx="50" cy="50" r="50" fill="url(#g)"/>{art("transform=\"translate(50 50) scale(.78) translate(-50 -50)\"")}</svg>'
    if kind == "splash":
        return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">{DEFS}<rect width="100" height="100" fill="url(#g)"/>{art("transform=\"translate(50 50) scale(.3) translate(-50 -50)\"")}</svg>'

async def render(page, svg_text, size, out, transparent=False, w=None, h=None):
    w, h = w or size, h or size
    html = f'<html><body style="margin:0;background:{"transparent" if transparent else "#fff"}"><div style="width:{w}px;height:{h}px;display:grid;place-items:center">{svg_text}</div></body></html>'
    await page.set_viewport_size({"width": w, "height": h})
    await page.set_content(html)
    await page.evaluate("s=>{const e=document.querySelector('svg');e.setAttribute('width',s[0]);e.setAttribute('height',s[1])}", [size, size])
    await page.screenshot(path=out, omit_background=transparent)

async def main():
    os.makedirs("public", exist_ok=True)
    open("public/icon.svg", "w").write(svg("full"))
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page()
        await render(pg, svg("full"), 512, "public/icon-512.png", True)
        await render(pg, svg("full"), 192, "public/icon-192.png", True)
        await render(pg, svg("square"), 512, "public/icon-maskable-512.png")
        # ---- aset Android (Capacitor) ----
        A = "android-assets"; R = A + "/res"
        os.makedirs(A + "/assets", exist_ok=True)
        await render(pg, svg("square").replace('translate(50 50) scale(.78) translate(-50 -50)', 'translate(50 50) scale(.8) translate(-50 -50)'), 1024, A + "/assets/icon-only.png")
        await render(pg, svg("fg"), 1024, A + "/assets/icon-foreground.png", True)
        await render(pg, svg("bg"), 1024, A + "/assets/icon-background.png")
        await render(pg, svg("splash"), 2732, A + "/assets/splash.png")
        await render(pg, svg("splash"), 2732, A + "/assets/splash-dark.png")
        for d, legacy, layer in [("mdpi", 48, 108), ("hdpi", 72, 162), ("xhdpi", 96, 216), ("xxhdpi", 144, 324), ("xxxhdpi", 192, 432)]:
            o = f"{R}/mipmap-{d}"; os.makedirs(o, exist_ok=True)
            await render(pg, svg("full"), legacy, o + "/ic_launcher.png", True)
            await render(pg, svg("round"), legacy, o + "/ic_launcher_round.png", True)
            await render(pg, svg("fg"), layer, o + "/ic_launcher_foreground.png", True)
            await render(pg, svg("bg"), layer, o + "/ic_launcher_background.png")
            await render(pg, svg("mono"), layer, o + "/ic_launcher_monochrome.png", True)
        os.makedirs(R + "/mipmap-anydpi-v26", exist_ok=True)
        xml = '<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n  <background android:drawable="@mipmap/ic_launcher_background"/>\n  <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n  <monochrome android:drawable="@mipmap/ic_launcher_monochrome"/>\n</adaptive-icon>\n'
        open(R + "/mipmap-anydpi-v26/ic_launcher.xml", "w").write(xml); open(R + "/mipmap-anydpi-v26/ic_launcher_round.xml", "w").write(xml)
        await b.close()
asyncio.run(main())
