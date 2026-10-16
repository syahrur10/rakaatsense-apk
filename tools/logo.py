"""Sumber logo RakaatSense: siluet orang sedang SUJUD (tampak samping) di atas sajadah + bulan sabit. Hasilkan SVG & PNG.
Jalankan dari root project: python3 tools/logo.py   (butuh: pip install playwright && playwright install chromium)"""
import asyncio, os
from playwright.async_api import async_playwright

GREEN_A, GREEN_B = "#1DB86E", "#0A6B40"
CRES = "M49.31 43.50A13.5 13.5 0 1 0 61.73 61.49A11 11 0 1 1 49.31 43.50Z"
STAR = "M60.50,41.90 L61.38,44.29 L63.92,44.39 L61.93,45.96 L62.62,48.41 L60.50,47.00 L58.38,48.41 L59.07,45.96 L57.08,44.39 L59.62,44.29Z"

def art(transform="", mono=False):
    """Gambar logo v7 (kanvas 100x100): orang SUJUD tampak samping di bawah lengkung mihrab + bulan sabit, di atas sajadah.
    mono=True -> semua hitam (ikon monokrom Android 13+)."""
    c = lambda x: "#000" if mono else x
    glow = "" if mono else '<circle cx="50" cy="52" r="40" fill="url(#gl)"/>'
    arch = "" if mono else '<path d="M20 86V54C20 38 36 30 50 12C64 30 80 38 80 54V86Z" fill="#fff" fill-opacity=".07" stroke="#fff" stroke-opacity=".28" stroke-width="1.6" stroke-linejoin="round"/>'
    dots = "" if mono else '<g fill="#F2CD6B" fill-opacity=".95"><circle cx="32" cy="46" r="1.7"/><circle cx="55" cy="58.5" r="1.7"/><circle cx="33" cy="73.5" r="1.7"/></g>'
    return f'''<g {transform}>
{glow}{arch}
<g transform="translate(50 23) scale(.72)"><path d="{CRES}" fill="{c('#F2CD6B')}" transform="translate(-49 -43)"/><path d="{STAR}" fill="{c('#fff')}" transform="translate(-49 -43)"/></g>
<rect x="9" y="77.5" width="82" height="6.5" rx="3.25" fill="{c('#F2CD6B')}"/>
<rect x="30" y="79.3" width="40" height="1.6" rx=".8" fill="#0A6B40" fill-opacity="{0 if mono else .35}"/>
<g fill="none" stroke-linecap="round" stroke-linejoin="round" stroke="{c('#fff')}">
<path d="M33 73.5H15" stroke-width="8"/><path d="M33 73.5L32 47" stroke-width="10.5"/><path d="M32 47L55 59" stroke-width="12"/><path d="M55 59L76 67" stroke-width="6"/>
<path d="M58 62L63 71.5L70 73.5" stroke-width="5.5" stroke="{c('#CDEFDB')}"/></g>
<circle cx="79" cy="69" r="7.2" fill="{c('#fff')}"/>{dots}
</g>'''

DEFS = f'<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{GREEN_A}"/><stop offset="1" stop-color="{GREEN_B}"/></linearGradient><radialGradient id="gl"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>'

def svg(kind):
    if kind == "full":      # ikon kotak membulat (favicon / PWA)
        return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">{DEFS}<rect width="100" height="100" rx="24" fill="url(#g)"/>{art()}</svg>'
    if kind == "square":    # tanpa sudut membulat (dipotong sistem / maskable)
        return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">{DEFS}<rect width="100" height="100" fill="url(#g)"/>{art("transform=\"translate(50 50) scale(.78) translate(-50 -48)\"")}</svg>'
    if kind == "bg":
        return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">{DEFS}<rect width="100" height="100" fill="url(#g)"/></svg>'
    if kind == "fg":        # adaptive foreground, area aman 66%
        return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">{DEFS}{art("transform=\"translate(50 50) scale(.56) translate(-50 -48)\"")}</svg>'
    if kind == "mono":
        return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">{art("transform=\"translate(50 50) scale(.56) translate(-50 -48)\"", mono=True)}</svg>'
    if kind == "round":
        return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">{DEFS}<circle cx="50" cy="50" r="50" fill="url(#g)"/>{art("transform=\"translate(50 50) scale(.78) translate(-50 -48)\"")}</svg>'
    if kind == "splash":
        return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">{DEFS}<rect width="100" height="100" fill="url(#g)"/>{art("transform=\"translate(50 50) scale(.42) translate(-50 -48)\"")}</svg>'

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
        await render(pg, svg("square").replace('translate(50 50) scale(.78) translate(-50 -48)', 'translate(50 50) scale(.8) translate(-50 -48)'), 1024, A + "/assets/icon-only.png")
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
