"""Membuat semua aset logo RakaatSense dari gambar 3D `tools/logo-source.png` (logo + tulisan).
Jalankan dari root project:  python3 tools/logo-from-image.py        (butuh: pip install pillow numpy)
Hasil: public/logo.png, icon-192/512, icon-maskable-512, icon.svg, android-assets/assets/*, android-assets/res/mipmap-*/*"""
import os, base64, io
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(R, *a)
src = Image.open(P('tools', 'logo-source.png')).convert('RGB')
W, H = src.size  # 1024 x 945

# ---- bentuk emblem (kotak membulat emas) + bulan sabit di atasnya
EL, ER, ET, EB = 236, 802, 168, 735       # kotak luar emblem
def squircle_mask(size, box, n=5.2, ss=3):
    w, h = size; a = np.zeros((h * ss, w * ss), np.float32)
    x0, y0, x1, y1 = [v * ss for v in box]; cx, cy = (x0 + x1) / 2, (y0 + y1) / 2; ra, rb = (x1 - x0) / 2, (y1 - y0) / 2
    yy, xx = np.mgrid[0:h * ss, 0:w * ss]
    a[(np.abs((xx - cx) / ra) ** n + np.abs((yy - cy) / rb) ** n) <= 1] = 1
    return Image.fromarray((a * 255).astype(np.uint8)).resize((w, h), Image.LANCZOS)
arr = np.asarray(src).astype(np.int32); r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
goldb = (r > 110) & (g > 90) & (r - b > 35) & (r > g - 10)
body = squircle_mask((W, H), (240, 172, 797, 729), n=4.4)                               # kotak membulat (hasil ukur cincin emas)
yy, xx = np.mgrid[0:H, 0:W]
moon_zone = ((xx - 520) ** 2 + (yy - 118) ** 2 <= 70 ** 2)
moon = Image.fromarray(np.where(moon_zone, goldb * 255, 0).astype(np.uint8)).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(0.9))
alpha = Image.fromarray(np.maximum(np.asarray(body), np.asarray(moon)))
emb = src.convert('RGBA'); emb.putalpha(alpha)
bbox = alpha.point(lambda v: 255 if v > 8 else 0).getbbox(); emb = emb.crop(bbox)           # emblem bertepi transparan
emb_full = emb.copy()

def fit(img, box_w, box_h):
    s = min(box_w / img.width, box_h / img.height); return img.resize((round(img.width * s), round(img.height * s)), Image.LANCZOS)
def paste_center(canvas, img, dy=0):
    canvas.alpha_composite(img, ((canvas.width - img.width) // 2, (canvas.height - img.height) // 2 + dy)); return canvas

# ---- latar pola hijau (diambil dari gambar asli, area emblem ditambal dengan blur)
import cv2
small = np.asarray(src.resize((256, 256), Image.LANCZOS))
m = np.zeros((256, 256), np.uint8); sy = 256 / H; sx = 256 / W
m[int(40 * sy):int(780 * sy), int(190 * sx):int(850 * sx)] = 255; m[int(770 * sy):int(900 * sy), int(150 * sx):int(880 * sx)] = 255
inp = cv2.inpaint(small, m, 9, cv2.INPAINT_TELEA)
bg_clean = Image.fromarray(inp).resize((W, W), Image.BICUBIC).filter(ImageFilter.GaussianBlur(14))
nz = np.random.RandomState(3).normal(0, 2.2, (W, W, 1)); bg_clean = Image.fromarray(np.clip(np.asarray(bg_clean) + nz, 0, 255).astype(np.uint8))
def bg_square(size):
    return bg_clean.resize((size, size), Image.LANCZOS)

# ---- 1) logo bertepi transparan untuk di dalam aplikasi
paste_center(Image.new('RGBA', (640, 640), (0, 0, 0, 0)), fit(emb_full, 620, 620)).save(P('public', 'logo.png'), optimize=True)

# ---- 2) ikon penuh (ikon web / PWA / legacy): emblem di atas latar pola
def icon_full(size, pad=0.10):
    c = bg_square(size).convert('RGBA'); return paste_center(c, fit(emb_full, size * (1 - 2 * pad), size * (1 - 2 * pad)), dy=int(size * 0.005))
icon_full(1024).convert('RGB').save(P('android-assets', 'assets', 'icon-only.png'), optimize=True)
icon_full(192).save(P('public', 'icon-192.png'), optimize=True); icon_full(512).save(P('public', 'icon-512.png'), optimize=True)
icon_full(512, 0.17).convert('RGB').save(P('public', 'icon-maskable-512.png'), optimize=True)   # maskable: zona aman 80%

# ---- 3) ikon adaptif Android: latar, foreground (zona aman 66%), monochrome
def fg(size):
    c = Image.new('RGBA', (size, size), (0, 0, 0, 0)); return paste_center(c, fit(emb_full, size * 0.66, size * 0.68))
fg(1024).save(P('android-assets', 'assets', 'icon-foreground.png'), optimize=True)
bg_square(1024).convert('RGB').save(P('android-assets', 'assets', 'icon-background.png'), optimize=True)
def mono(size):
    f = fg(size); a = np.asarray(f).astype(np.int32); gd = ((a[..., 0] > 150) & (a[..., 1] > 115) & (a[..., 2] < 170) & (a[..., 0] - a[..., 2] > 55) & (a[..., 3] > 0))
    out = np.zeros((size, size, 4), np.uint8); out[..., :3] = 255; out[..., 3] = np.where(gd, 255, 0)
    return Image.fromarray(out).filter(ImageFilter.GaussianBlur(0.4))
for d, (fgsz, lg) in {'mdpi': (108, 48), 'hdpi': (162, 72), 'xhdpi': (216, 96), 'xxhdpi': (324, 144), 'xxxhdpi': (432, 192)}.items():
    o = P('android-assets', 'res', 'mipmap-' + d)
    fg(1024).resize((fgsz, fgsz), Image.LANCZOS).save(f'{o}/ic_launcher_foreground.png', optimize=True)
    bg_square(1024).resize((fgsz, fgsz), Image.LANCZOS).convert('RGB').save(f'{o}/ic_launcher_background.png', optimize=True)
    mono(1024).resize((fgsz, fgsz), Image.LANCZOS).save(f'{o}/ic_launcher_monochrome.png', optimize=True)
    full = icon_full(1024, 0.05)
    sq = Image.new('L', (1024, 1024), 0); ImageDraw.Draw(sq).rounded_rectangle((0, 0, 1023, 1023), 190, fill=255)
    a = full.copy(); a.putalpha(sq); a.resize((lg, lg), Image.LANCZOS).save(f'{o}/ic_launcher.png', optimize=True)
    ci = Image.new('L', (1024, 1024), 0); ImageDraw.Draw(ci).ellipse((0, 0, 1023, 1023), fill=255)
    b = full.copy(); b.putalpha(ci); b.resize((lg, lg), Image.LANCZOS).save(f'{o}/ic_launcher_round.png', optimize=True)

# ---- 4) splash 2732x2732: logo + tulisan di tengah, latar diperluas dari pola asli
def splash(dark):
    S = 2732; base = src.resize((S, round(S * H / W)), Image.LANCZOS).filter(ImageFilter.GaussianBlur(40)).convert('RGB')
    cv = Image.new('RGB', (S, S)); cv.paste(base.resize((S, S), Image.LANCZOS))
    if dark: cv = Image.blend(cv, Image.new('RGB', (S, S), (6, 28, 18)), 0.45)
    w = 1180; lg = src.resize((w, round(w * H / W)), Image.LANCZOS).convert('RGBA'); m = Image.new('L', lg.size, 0)
    ImageDraw.Draw(m).rectangle((60, 60, lg.width - 60, lg.height - 60), fill=255); m = m.filter(ImageFilter.GaussianBlur(50)); lg.putalpha(m)
    if dark: lg = Image.blend(lg, Image.new('RGBA', lg.size, (6, 28, 18, 255)), 0.0)
    cv = cv.convert('RGBA'); cv.alpha_composite(lg, ((S - lg.width) // 2, (S - lg.height) // 2)); return cv.convert('RGB')
splash(False).save(P('android-assets', 'assets', 'splash.png'), optimize=True); splash(True).save(P('android-assets', 'assets', 'splash-dark.png'), optimize=True)

# ---- 5) favicon SVG (membungkus PNG supaya <link rel=icon href=/icon.svg> tetap jalan)
buf = io.BytesIO(); icon_full(128).save(buf, 'PNG', optimize=True)
open(P('public', 'icon.svg'), 'w').write('<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 128 128"><image width="128" height="128" xlink:href="data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode() + '"/></svg>')
print('selesai')
