"""Sumber logo RakaatSense v9.
Orang berjubah putih & berpeci sedang SUJUD (tampak samping, dahi + hidung menyentuh sajadah) di dalam mihrab bercahaya.
Bulan sabit + bintang kini jadi FINIAL di puncak mihrab (seperti kubah masjid), jauh dari sosok yang sujud,
supaya tidak ada kesan sujud/menatap ke bulan. Hasilkan SVG, PNG, aset Android, dan sinkronkan logo() di src/icons.js.
Jalankan dari root project: python3 tools/logo.py   (butuh: pip install playwright && playwright install chromium)"""
import asyncio, os, re, math
from playwright.async_api import async_playwright

CRES = "M49.31 43.50A13.5 13.5 0 1 0 61.73 61.49A11 11 0 1 1 49.31 43.50Z"   # bulan sabit bentuk C (asli)
STAR = "M60.50,41.90 L61.38,44.29 L63.92,44.39 L61.93,45.96 L62.62,48.41 L60.50,47.00 L58.38,48.41 L59.07,45.96 L57.08,44.39 L59.62,44.29Z"
MOON_T = "translate(50 6.9) scale(.45) translate(-49 -43)"

# ---------------------------------------------------------------- util kurva
def sp(pts, closed=True, t=0.5):
    """Catmull-Rom -> kurva bezier kubik: titik kunci jadi siluet organik yang halus."""
    n = len(pts); d = f"M{pts[0][0]:.2f} {pts[0][1]:.2f}"
    for i in (range(n) if closed else range(n - 1)):
        p0 = pts[(i - 1) % n] if (closed or i > 0) else pts[i]
        p1, p2 = pts[i], pts[(i + 1) % n]
        p3 = pts[(i + 2) % n] if (closed or i + 2 < n) else p2
        k = t / 3
        c1 = (p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k)
        c2 = (p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k)
        d += f"C{c1[0]:.2f} {c1[1]:.2f} {c2[0]:.2f} {c2[1]:.2f} {p2[0]:.2f} {p2[1]:.2f}"
    return d + ("Z" if closed else "")

def crescent(cx, cy, R=6.0, r=5.0, off=2.7):
    """Bulan sabit menghadap ke ATAS (tanduk ke atas). Lingkaran luar R di (cx,cy), lingkaran dalam r digeser `off` ke atas."""
    d = off; a = (R * R - r * r + d * d) / (2 * d); h = math.sqrt(max(R * R - a * a, 0))
    # titik potong dua lingkaran (pusat luar (0,0), pusat dalam (0,-d))
    x1, y1 = -h, -a; x2, y2 = h, -a
    return (f"M{cx + x1:.2f} {cy + y1:.2f}A{R} {R} 0 1 0 {cx + x2:.2f} {cy + y2:.2f}"
            f"A{r} {r} 0 1 1 {cx + x1:.2f} {cy + y1:.2f}Z")

def star(cx, cy, R, r=None):
    r = r or R * .42; pts = []
    for i in range(10):
        ang = -math.pi / 2 + i * math.pi / 5; rad = R if i % 2 == 0 else r
        pts.append(f"{cx + rad * math.cos(ang):.2f},{cy + rad * math.sin(ang):.2f}")
    return "M" + "L".join(pts) + "Z"

def spark(cx, cy, s):
    """Kilau 4 sudut."""
    return f"M{cx} {cy - s}Q{cx + s * .16} {cy - s * .16} {cx + s} {cy}Q{cx + s * .16} {cy + s * .16} {cx} {cy + s}Q{cx - s * .16} {cy + s * .16} {cx - s} {cy}Q{cx - s * .16} {cy - s * .16} {cx} {cy - s}Z"

# ---------------------------------------------------------------- defs
def defs(p="rs"):
    return f'''<defs><linearGradient id="{p}Bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#22C57A"/><stop offset=".55" stop-color="#0F8A52"/><stop offset="1" stop-color="#075A35"/></linearGradient><radialGradient id="{p}Gl" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".34"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient><linearGradient id="{p}Ar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity=".04"/></linearGradient><linearGradient id="{p}Au" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFE9A3"/><stop offset=".5" stop-color="#F2CD6B"/><stop offset="1" stop-color="#D9A93A"/></linearGradient><linearGradient id="{p}Ro" gradientUnits="userSpaceOnUse" x1="32" y1="42" x2="64" y2="78"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#DCF1E5"/></linearGradient><linearGradient id="{p}Rs" gradientUnits="userSpaceOnUse" x1="25" y1="55" x2="50" y2="78"><stop offset="0" stop-color="#D3EBDD"/><stop offset="1" stop-color="#A3D0B8"/></linearGradient><linearGradient id="{p}Pn" gradientUnits="userSpaceOnUse" x1="25" y1="66" x2="56" y2="78"><stop offset="0" stop-color="#3C7A62"/><stop offset="1" stop-color="#2B6350"/></linearGradient><linearGradient id="{p}Pt" gradientUnits="userSpaceOnUse" x1="32" y1="46" x2="56" y2="76"><stop offset="0" stop-color="#4C8F74"/><stop offset="1" stop-color="#2F6A55"/></linearGradient><linearGradient id="{p}Sk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F3CBA5"/><stop offset="1" stop-color="#DCA87E"/></linearGradient><linearGradient id="{p}Sd" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#D9A57B"/><stop offset="1" stop-color="#C58F66"/></linearGradient><linearGradient id="{p}Cp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2B3F36"/><stop offset="1" stop-color="#141F1A"/></linearGradient><linearGradient id="{p}Sh" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><pattern id="{p}Pt" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M6 1.5L7.6 4.4L10.5 6L7.6 7.6L6 10.5L4.4 7.6L1.5 6L4.4 4.4Z" fill="none" stroke="#fff" stroke-width=".35"/></pattern><radialGradient id="{p}Fd" cx=".5" cy=".5" r=".6"><stop offset=".25" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient><mask id="{p}Mk"><rect width="100" height="100" fill="url(#{p}Fd)"/></mask><clipPath id="{p}Cr"><rect x="8" y="77.5" width="84" height="7" rx="3.5"/></clipPath></defs>'''

# ---------------------------------------------------------------- sosok sujud
# (permukaan sajadah y=77.5; menghadap kanan / kiblat). Baju koko putih + celana gelap + peci hitam.
FOOT  = sp([(25.6,68.2),(27.6,68.4),(29,70.6),(29.8,74.4),(29.8,77.4),(25.2,77.5),(23,77.3),(22.6,75.2),(23.4,71.6)])
CALF  = sp([(26.6,70.2),(30.4,68),(39,68.8),(47,69.8),(53,71.4),(56,74),(55,76.8),(51,77.6),(38,77.6),(31,76.8),(27.2,74.6)])
THIGH = sp([(30.0,54.5),(31.4,48.8),(36,45.4),(41.6,45.2),(46.4,48.4),(49.6,54),(52.4,61.4),(55.4,68.8),(56.6,73.2),(55,76.8),(51,77.6),(47.6,76),(46.6,72),(44.4,66.8),(40.2,62.4),(35,59.8),(31.2,58.2)])
SHIRT = sp([(32.2,52.8),(31.4,49.6),(33.6,46.2),(37,44.2),(43,43.4),(49,45.2),(55,48.8),(60.6,52.4),(65.4,55.4),(70.4,58.4),(73.4,61.4),(72.6,65.6),(68,67.6),(62.5,67.6),(57,66.4),(52.4,62.8),(48.8,58.6),(42.4,56.8),(36,55)])
ARM   = sp([(58.8,60),(62.8,59.4),(66.2,62.6),(68,67.4),(70.8,71.4),(73.8,73.4),(74.6,77.3),(70.6,77.5),(66.6,75.6),(63.4,73),(61.4,69.2),(59.6,64.8)])
CUFF  = sp([(72.6,72.8),(75.4,74.2),(75.6,77.5),(72.2,77.5),(72,74.2)])
HAND  = sp([(73.6,74.4),(77,74),(80.6,74.8),(83,76.2),(82.2,77.5),(74,77.5)])
# kepala: profil tegak digambar lalu diputar ke posisi sujud (ubun-ubun ke depan, dahi & hidung di sajadah)
SKULL = sp([(-5.3,0.6),(-4.7,-3.8),(-1.6,-6.2),(2.6,-5.9),(4.9,-3.4),(5.5,-0.8),(7.6,1.7),(6.0,2.8),(6.1,4.2),(5.3,6.1),(2.2,7.0),(-1.5,5.9),(-4.4,3.3)])
PECI  = sp([(-5.4,-0.4),(-5.3,-4.2),(-2.6,-6.9),(2.6,-7.0),(5.3,-4.8),(5.4,-3.6),(2.4,-3.9),(-1.2,-3.7),(-4.4,-2.4)])
HEAD_ROT = 112
HEAD_T = f"translate(79.4 70.4) rotate({HEAD_ROT}) scale(1.06)"
PANT_LN = "#78B99B"   # warna lipatan celana

def figure(p, mono=False):
    if mono:
        return (f'<g fill="#000"><path d="{FOOT}"/><path d="{CALF}"/><path d="{THIGH}"/><path d="{SHIRT}"/><path d="{ARM}"/><path d="{HAND}"/>'
                f'<g transform="{HEAD_T}"><path d="{SKULL}"/><path d="{PECI}"/></g></g>')
    return f'''<defs><clipPath id="{p}Cs"><path d="{SHIRT}"/></clipPath><clipPath id="{p}Ct"><path d="{THIGH}"/></clipPath></defs>
<path d="{FOOT}" fill="url(#{p}Sd)"/>
<path d="M23.2 72.6C22.6 74.6 22.8 76.4 23.4 77.3" stroke="#A97650" stroke-width=".8" fill="none" stroke-linecap="round" opacity=".55"/><path d="M26.6 76.2L26.8 77.4M28.2 76L28.4 77.4" stroke="#A97650" stroke-width=".4" stroke-linecap="round" opacity=".7"/>
<path d="{CALF}" fill="url(#{p}Pn)"/>
<path d="M33 71.4C38 72 44 72.4 50 73.4M28.6 72.2C30 74 32 75.4 35 76" stroke="{PANT_LN}" stroke-width=".55" fill="none" stroke-linecap="round" opacity=".6"/>
<path d="{THIGH}" fill="url(#{p}Pt)"/>
<g clip-path="url(#{p}Ct)"><path d="M28 58C34 60 42 64 47 72L50 80L24 80Z" fill="#06301F" opacity=".22"/><path d="{sp([(49,58),(52,62),(55,69),(56,75),(51,77),(52,68)])}" fill="#06301F" opacity=".2"/><path d="M34 46C40 44.4 46 46.4 49 51" fill="none" stroke="#fff" stroke-width=".9" stroke-linecap="round" opacity=".22"/></g>
<path d="M44 52C47 58 49 63 50.6 68M40 50C41 54 43 57 46 60M53 66.5C54.8 68.6 55.8 70.8 56 73" stroke="{PANT_LN}" stroke-width=".55" fill="none" stroke-linecap="round" opacity=".55"/>
<g class="fb"><path d="{SHIRT}" fill="url(#{p}Ro)"/>
<g clip-path="url(#{p}Cs)"><path d="M28 56C36 57.6 44 59 50 62L58 70L30 70Z" fill="#0A6B40" opacity=".09"/></g>
<path d="M32.6 52.6C38 54.8 44 56.4 48.8 58.6" fill="none" stroke="#9CCBB4" stroke-width=".7" stroke-linecap="round"/>
<g fill="none" stroke="#6DAE92" stroke-width=".6" stroke-linecap="round" opacity=".65"><path d="M40 47.6C41.4 50.6 42.2 53 42.4 55"/><path d="M50 49C52 52.4 53.4 55.6 54 58.6"/><path d="M58 53.2C59.6 56 60.4 58.6 60.6 60.6"/></g>
<path d="M36 46C41 43.8 47 44.4 53 47.6C58 50.4 62.4 53.4 66.2 56.4" fill="none" stroke="#fff" stroke-width="1" stroke-linecap="round" opacity=".75"/></g>
<g transform="{HEAD_T}"><path d="{SKULL}" fill="url(#{p}Sk)"/>
<path d="M-.2 -1.5C1.2 -1.7 1.9 -.4 1.5 1C1.2 2.1 -.2 2.5 -.7 1.8C-.1 1.4 -.1 .8 -.5 .5C-.9 .2 -1 -.9 -.2 -1.5Z" fill="#D9A27B"/><path d="M.1 -.7C.7 -.7 1 -.2 .8 .5" stroke="#B57D5B" stroke-width=".28" fill="none" stroke-linecap="round"/>
<path d="{PECI}" fill="url(#{p}Cp)"/><path d="M-4.2 -3.9C-2.2 -5 1 -5.2 3.4 -4.6" stroke="#fff" stroke-opacity=".28" stroke-width=".5" fill="none" stroke-linecap="round"/></g>
<path d="{ARM}" fill="#0A6B40" opacity=".12" transform="translate(-.7 .5)"/>
<g class="fa"><path d="{ARM}" fill="url(#{p}Ro)"/><path d="M60.6 62C62.6 67 65.4 71 70 74.2" fill="none" stroke="#6DAE92" stroke-width=".6" stroke-linecap="round" opacity=".7"/><path d="{CUFF}" fill="url(#{p}Au)"/></g>
<path d="{HAND}" fill="url(#{p}Sk)"/><path d="M79.2 75.2L79.6 77.4M81.4 76L81.7 77.4" stroke="#C48F66" stroke-width=".32" stroke-linecap="round"/>'''

# ---------------------------------------------------------------- komposisi
ARCH = "M14 82V58C14 45 32 39 50 21C68 39 86 45 86 58V82Z"
ARCH_IN = "M18.6 82V59C18.6 48 34 42 50 26.5C66 42 81.4 48 81.4 59V82Z"
FIG_T = "translate(48.6 77.5) scale(.92) translate(-52 -77.5)"

def art(p="rs", transform="", mono=False):
    cres = crescent(50, 13.4, 6.2, 5.1, 2.8)
    if mono:
        return (f'<g {transform}><path d="{ARCH}" fill="none" stroke="#000" stroke-width="3" stroke-linejoin="round"/>'
                f'<g transform="{MOON_T}"><path d="{CRES}" fill="#000"/><path d="{STAR}" fill="#000" transform="translate(-3.4 3.4)"/></g>'
                f'<rect x="8" y="77.5" width="84" height="7" rx="3.5" fill="#000"/><g transform="{FIG_T}">{figure(p, True)}</g></g>')
    sparks = "".join(f'<path class="sk s{i}" d="{spark(x, y, s)}" fill="#FFF4CC"/>' for i, (x, y, s) in enumerate([(36.5, 35.5, 2.1), (65, 33, 1.7), (50, 40.5, 1.4)]))
    return f'''<g {transform}>
<rect width="100" height="100" fill="url(#{p}Pt)" opacity=".10" mask="url(#{p}Mk)"/>
<circle class="gl" cx="50" cy="58" r="44" fill="url(#{p}Gl)"/>
<path d="{ARCH}" fill="url(#{p}Ar)"/>
<path class="ar" pathLength="1" d="{ARCH}" fill="none" stroke="#F2CD6B" stroke-opacity=".62" stroke-width="1.1" stroke-linejoin="round"/>
<path d="{ARCH_IN}" fill="none" stroke="#fff" stroke-opacity=".2" stroke-width=".8" stroke-linejoin="round"/>
<g class="moon"><path d="M49.45 19.2h1.1v2.4h-1.1z" fill="url(#{p}Au)"/><g transform="{MOON_T}"><path d="{CRES}" fill="url(#{p}Au)"/><path d="{STAR}" fill="#fff" transform="translate(-3.4 3.4)"/></g></g>
{sparks}
<rect x="8" y="77.5" width="84" height="7" rx="3.5" fill="url(#{p}Au)"/>
<rect x="8" y="77.5" width="84" height="1.6" rx=".8" fill="#fff" opacity=".35"/>
<g clip-path="url(#{p}Cr)"><rect class="sh" x="-30" y="77.5" width="30" height="7" fill="url(#{p}Sh)"/></g>
<path d="M14 81h72" stroke="#9A6F14" stroke-opacity=".35" stroke-width=".7" stroke-dasharray="1.6 1.6"/>
<path d="M50 78.7l2 2.2-2 2.2-2-2.2z" fill="#9A6F14" fill-opacity=".45"/>
<ellipse cx="53" cy="78.7" rx="31" ry="1.3" fill="#6B4300" opacity=".26"/>
<g transform="{FIG_T}"><g class="fig">{figure(p)}</g></g>
</g>'''

T = lambda s: f'transform="translate(50 50) scale({s}) translate(-50 -46)"'

def svg(kind, p="rs"):
    D, X = defs(p), 'xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"'
    if kind == "full":   return f'<svg {X}>{D}<rect width="100" height="100" rx="24" fill="url(#{p}Bg)"/>{art(p)}</svg>'
    if kind == "square": return f'<svg {X}>{D}<rect width="100" height="100" fill="url(#{p}Bg)"/>{art(p, transform=T(.8))}</svg>'
    if kind == "bg":     return f'<svg {X}>{D}<rect width="100" height="100" fill="url(#{p}Bg)"/></svg>'
    if kind == "fg":     return f'<svg {X}>{D}{art(p, transform=T(.56))}</svg>'
    if kind == "mono":   return f'<svg {X}>{art(p, transform=T(.56), mono=True)}</svg>'
    if kind == "round":  return f'<svg {X}>{D}<circle cx="50" cy="50" r="50" fill="url(#{p}Bg)"/>{art(p, transform=T(.8))}</svg>'
    if kind == "splash": return f'<svg {X}>{D}<rect width="100" height="100" fill="url(#{p}Bg)"/>{art(p, transform=T(.46))}</svg>'

def inline():
    """logo() untuk di dalam aplikasi: id gradien dibuat unik per pemanggilan (${p}) supaya aman dipakai berkali-kali di DOM."""
    return f'<svg class="logo" viewBox="0 0 100 100" aria-hidden="true">{defs("${p}")}<rect width="100" height="100" rx="24" fill="url(#${{p}}Bg)"/>{art("${p}")}</svg>'

def logo_js():
    body = inline().replace("${p}", "${p}")
    return "/*LOGO-START*/export const logo = (() => { let n = 0; return () => { const p = 'rs' + (++n); return `" + body + "`; }; })();/*LOGO-END*/"

async def render(page, svg_text, size, out, transparent=False):
    html = f'<html><body style="margin:0;background:{"transparent" if transparent else "#fff"}"><div style="width:{size}px;height:{size}px;display:grid;place-items:center">{svg_text}</div></body></html>'
    await page.set_viewport_size({"width": size, "height": size})
    await page.set_content(html)
    await page.evaluate("s=>{const e=document.querySelector('svg');e.setAttribute('width',s);e.setAttribute('height',s)}", size)
    await page.screenshot(path=out, omit_background=transparent)

def sync_icons_js():
    src = open("src/icons.js", encoding="utf-8").read()
    new = logo_js()
    if "/*LOGO-START*/" in src:
        src = re.sub(r"/\*LOGO-START\*/.*?/\*LOGO-END\*/", lambda m: new, src, count=1, flags=re.S)
    else:
        src = re.sub(r"export const logo = \(\) => `.*?`;", lambda m: new, src, count=1, flags=re.S)
    open("src/icons.js", "w", encoding="utf-8").write(src)

async def main():
    os.makedirs("public", exist_ok=True)
    open("public/icon.svg", "w").write(svg("full"))
    sync_icons_js()
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page()
        await render(pg, svg("full"), 512, "public/icon-512.png", True)
        await render(pg, svg("full"), 192, "public/icon-192.png", True)
        await render(pg, svg("square"), 512, "public/icon-maskable-512.png")
        # ---- aset Android (Capacitor) ----
        A = "android-assets"; R = A + "/res"
        os.makedirs(A + "/assets", exist_ok=True)
        await render(pg, svg("square"), 1024, A + "/assets/icon-only.png")
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

if __name__ == "__main__":
    asyncio.run(main())
