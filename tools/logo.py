"""Sumber logo RakaatSense v8: orang BERJUBAH & bersorban sedang SUJUD (tampak samping) di bawah lengkung mihrab emas,
bulan sabit emas, di atas sajadah berumbai. Tanpa titik sendi. Hasilkan SVG, PNG, aset Android, dan sinkronkan logo() di src/icons.js.
Jalankan dari root project: python3 tools/logo.py   (butuh: pip install playwright && playwright install chromium)"""
import asyncio, os, re
from playwright.async_api import async_playwright

CRES = "M49.31 43.50A13.5 13.5 0 1 0 61.73 61.49A11 11 0 1 1 49.31 43.50Z"
STAR = "M60.50,41.90 L61.38,44.29 L63.92,44.39 L61.93,45.96 L62.62,48.41 L60.50,47.00 L58.38,48.41 L59.07,45.96 L57.08,44.39 L59.62,44.29Z"
_OLD_ROBE = "M18 77.5C14 77.5 14 70.6 18.2 70.6L26 70.2C27 64 24 56 25 49C26.5 42 34 40 39 43C47 47 55 52 62.5 57C66.5 59.5 68.5 62.3 66.3 65L38.5 77.5Z"
_OLD_SLEEVE = "M60 59C61.5 64 63.5 70 69 74.2"
_OLD_TURBAN = "M73.6 69C72.8 63.4 78.4 60.8 83.2 62.4C86.8 63.6 88 66.8 87.5 69.4C85.6 67.6 83.6 66.8 81.6 66.6C78.6 66.4 75.8 67.4 73.6 69Z"

def defs(p="rs"):
    return f'''<defs><linearGradient id="{p}Bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#22C57A"/><stop offset=".55" stop-color="#0F8A52"/><stop offset="1" stop-color="#075A35"/></linearGradient><radialGradient id="{p}Gl" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".30"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient><linearGradient id="{p}Ar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".20"/><stop offset="1" stop-color="#fff" stop-opacity=".03"/></linearGradient><linearGradient id="{p}Au" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFE9A3"/><stop offset=".5" stop-color="#F2CD6B"/><stop offset="1" stop-color="#D9A93A"/></linearGradient><linearGradient id="{p}Ro" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#CFEFDD"/></linearGradient><linearGradient id="{p}Rb" gradientUnits="userSpaceOnUse" x1="16" y1="44" x2="70" y2="78"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#C9EBD9"/></linearGradient><linearGradient id="{p}Sl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#E3F6EB"/><stop offset="1" stop-color="#B9E3CC"/></linearGradient><pattern id="{p}Pt" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M6 1.5L7.6 4.4L10.5 6L7.6 7.6L6 10.5L4.4 7.6L1.5 6L4.4 4.4Z" fill="none" stroke="#fff" stroke-width=".35"/></pattern><radialGradient id="{p}Fd" cx=".5" cy=".5" r=".6"><stop offset=".25" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient><mask id="{p}Mk"><rect width="100" height="100" fill="url(#{p}Fd)"/></mask></defs>'''

def figure(p, mono=False):
    """Orang berjubah sujud menghadap kanan. Anggota badan = garis tebal bersambung (bahu, pinggul, lutut menyatu mulus)."""
    if mono:
        return """<g fill="none" stroke="#000" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 73.7H36" stroke-width="7.6"/><path d="M35 72.2C34.6 64.5 34 56 33.4 48" stroke-width="10.6"/><path d="M33.4 48C44 49.5 52 54 58 60.2" stroke-width="12"/><path d="M58 60.5L73 67.6" stroke-width="6.4"/><path d="M58.5 61L60.5 70L68.5 75.3" stroke-width="6.2"/></g><circle cx="79.5" cy="70.4" r="6.9" fill="#000"/>"""
    return f"""<g fill="none" stroke="url(#{p}Rb)" stroke-linecap="round" stroke-linejoin="round">
<path d="M17.5 73.7H36" stroke-width="7.6"/><path d="M35 72.2C34.6 64.5 34 56 33.4 48" stroke-width="10.6"/><path d="M33.4 48C44 49.5 52 54 58 60.2" stroke-width="12"/><path d="M58 60.5L73 67.6" stroke-width="6.4"/></g>
<ellipse cx="14.6" cy="74.3" rx="2.9" ry="3.2" fill="#E7C29B"/>
<path d="M20.4 70.2V77.4" stroke="url(#{p}Au)" stroke-width="1.5" stroke-linecap="round"/>
<g fill="none" stroke="#0A6B40" stroke-opacity=".2" stroke-width=".9" stroke-linecap="round"><path d="M30 50.5C29.4 58 30.6 65 30 71"/><path d="M35.5 49.5C35.6 57 36.6 64 36.3 70"/><path d="M42 51.5C47.5 53.5 52 56.5 56 60"/><path d="M38.5 56.5C43 57.5 47 59.5 50.5 62.5"/></g>
<path d="M59 61.6L61 70.4L68.6 75.4" fill="none" stroke="#06502F" stroke-opacity=".26" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M58.5 61L60.5 70L68.5 75.3" fill="none" stroke="url(#{p}Sl)" stroke-width="6.2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M62.6 70.6L67.6 74.2" stroke="url(#{p}Au)" stroke-width="2" stroke-linecap="round"/>
<path d="M60 63C60.6 65.5 61.2 67.5 62 69" fill="none" stroke="#0A6B40" stroke-opacity=".2" stroke-width=".8" stroke-linecap="round"/>
<ellipse cx="71.3" cy="75.9" rx="3.8" ry="1.7" fill="#E7C29B"/>
<circle cx="79.5" cy="70.4" r="6.9" fill="#E7C29B"/>
<circle cx="86.2" cy="74.2" r="1.3" fill="#E7C29B"/>
<path d="M72.9 73.4C71.6 66.6 77.4 62.6 83.4 63.8C87 64.6 87.6 67.2 86.4 69.2C82.4 69.6 77.6 71 72.9 73.4Z" fill="#fff"/>
<path d="M73 73.2C77.6 70.8 82.4 69.4 86.4 69" fill="none" stroke="url(#{p}Au)" stroke-width="1.5" stroke-linecap="round"/>
<path d="M76 65.2C77.4 66.6 77.8 68 77.6 69.4M80 64.2C81.6 65.4 82.2 67 82.2 68.4" fill="none" stroke="#0A6B40" stroke-opacity=".2" stroke-width=".8" stroke-linecap="round"/>"""

def art(p="rs", transform="", mono=False):
    """Gambar logo v8 (kanvas 100x100). mono=True -> semua hitam (ikon monokrom Android 13+)."""
    if mono:
        return f'''<g {transform}><g transform="translate(50 24) scale(.74)"><path d="{CRES}" fill="#000" transform="translate(-49 -43)"/></g>
<rect x="8" y="77.5" width="84" height="7" rx="3.5" fill="#000"/>{figure(p, True)}</g>'''
    return f'''<g {transform}>
<rect width="100" height="100" fill="url(#{p}Pt)" opacity=".10" mask="url(#{p}Mk)"/>
<circle cx="50" cy="50" r="42" fill="url(#{p}Gl)"/>
<path d="M18 82V54C18 37 35 29 50 9C65 29 82 37 82 54V82Z" fill="url(#{p}Ar)" stroke="#F2CD6B" stroke-opacity=".55" stroke-width="1.1" stroke-linejoin="round"/>
<path d="M22.5 82V55C22.5 40.5 37 33 50 16C63 33 77.5 40.5 77.5 55V82Z" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width=".8" stroke-linejoin="round"/>
<g class="moon" transform="translate(50 24) scale(.74)"><path d="{CRES}" fill="url(#{p}Au)" transform="translate(-49 -43)"/><path d="{STAR}" fill="#fff" transform="translate(-49 -43)"/></g>
<ellipse cx="55" cy="79" rx="38" ry="2.6" fill="#043d23" opacity=".28"/>
<rect x="8" y="77.5" width="84" height="7" rx="3.5" fill="url(#{p}Au)"/>
<rect x="8" y="77.5" width="84" height="1.6" rx=".8" fill="#fff" opacity=".35"/>
<path d="M14 81h72" stroke="#9A6F14" stroke-opacity=".35" stroke-width=".7" stroke-dasharray="1.6 1.6"/>
<path d="M50 78.7l2 2.2-2 2.2-2-2.2z" fill="#9A6F14" fill-opacity=".45"/>
{figure(p)}
</g>'''

T = lambda s: f'transform="translate(50 50) scale({s}) translate(-50 -48)"'

def svg(kind):
    D, X = defs(), 'xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"'
    if kind == "full":   return f'<svg {X}>{D}<rect width="100" height="100" rx="24" fill="url(#rsBg)"/>{art()}</svg>'
    if kind == "square": return f'<svg {X}>{D}<rect width="100" height="100" fill="url(#rsBg)"/>{art(transform=T(.78))}</svg>'
    if kind == "bg":     return f'<svg {X}>{D}<rect width="100" height="100" fill="url(#rsBg)"/></svg>'
    if kind == "fg":     return f'<svg {X}>{D}{art(transform=T(.56))}</svg>'
    if kind == "mono":   return f'<svg {X}>{art(transform=T(.56), mono=True)}</svg>'
    if kind == "round":  return f'<svg {X}>{D}<circle cx="50" cy="50" r="50" fill="url(#rsBg)"/>{art(transform=T(.78))}</svg>'
    if kind == "splash": return f'<svg {X}>{D}<rect width="100" height="100" fill="url(#rsBg)"/>{art(transform=T(.42))}</svg>'

def inline():
    """logo() untuk di dalam aplikasi (gradien ikut di dalam SVG, tidak bergantung index.html)."""
    return f'<svg class="logo" viewBox="0 0 100 100" aria-hidden="true">{defs()}<rect width="100" height="100" rx="24" fill="url(#rsBg)"/>{art()}</svg>'

async def render(page, svg_text, size, out, transparent=False):
    html = f'<html><body style="margin:0;background:{"transparent" if transparent else "#fff"}"><div style="width:{size}px;height:{size}px;display:grid;place-items:center">{svg_text}</div></body></html>'
    await page.set_viewport_size({"width": size, "height": size})
    await page.set_content(html)
    await page.evaluate("s=>{const e=document.querySelector('svg');e.setAttribute('width',s);e.setAttribute('height',s)}", size)
    await page.screenshot(path=out, omit_background=transparent)

async def main():
    os.makedirs("public", exist_ok=True)
    open("public/icon.svg", "w").write(svg("full"))
    # sinkronkan logo() di src/icons.js
    src = open("src/icons.js", encoding="utf-8").read()
    src = re.sub(r"export const logo = \(\) => `.*?`;", lambda m: "export const logo = () => `" + inline() + "`;", src, count=1, flags=re.S)
    open("src/icons.js", "w", encoding="utf-8").write(src)
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page()
        await render(pg, svg("full"), 512, "public/icon-512.png", True)
        await render(pg, svg("full"), 192, "public/icon-192.png", True)
        await render(pg, svg("square"), 512, "public/icon-maskable-512.png")
        # ---- aset Android (Capacitor) ----
        A = "android-assets"; R = A + "/res"
        os.makedirs(A + "/assets", exist_ok=True)
        await render(pg, svg("square").replace(T(.78), T(.8)), 1024, A + "/assets/icon-only.png")
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
