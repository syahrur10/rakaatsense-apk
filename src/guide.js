/** guide.js — panduan animasi: cara menaruh HP di Saku Baju / Saku Celana, gerakan saat shalat, cara memakai aplikasi (satu adegan per posisi HP: Saku Celana / Saku Baju), dan cara memakai KAMERA (HP di depan sejadah, layar hitam).
 *  Orang digambar sebagai kerangka sendi tampak samping (panjang tulang tetap), lengan dihitung dengan IK 2-ruas.
 *  Animasi memakai requestAnimationFrame; bila pengguna memilih "reduce motion", gambar diam dan diganti tiap diketuk. */
import { t, hooks } from './i18n.js';
import { ic } from './icons.js';
import { store } from './util.js';
import { createTracker } from './rakaat.js';
import { engine, makeLayer, v3, meshCmd, MAT, IDENT, prismMesh, project, SV, FLOOR } from './fig3d.js';
import { buildChar, rigFromF, COL } from './fig3d-char.js';

const NS = 'http://www.w3.org/2000/svg';
const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const S = (n, a = {}, p) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); p?.append(e); return e; };
const ease = (x) => x * x * x * (x * (6 * x - 15) + 10); // smootherstep: awal & akhir gerak sangat lembut
const lerp = (a, b, k) => a + (b - a) * k;
const lerpV = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
const angle = (a, b) => Math.acos(Math.max(-1, Math.min(1, (a[0] * b[0] + a[1] * b[1]) / (Math.hypot(...a) * Math.hypot(...b))))) * 180 / Math.PI;
const C = { shirt: '#1DB86E', shirtD: '#0A6B40', pants: '#2C4468', pantsD: '#1B2A3F', skin: '#E5AE86', skinD: '#B97F58', dark: '#1B2A35', gold: '#F2CD6B', gold2: '#C9A23F' };

/** IK 2-ruas: bahu s -> target tg, panjang l1/l2; bend = sisi tekukan siku (−1..1). */
function ik(s, tg, l1, l2, bend) {
  let dx = tg[0] - s[0], dy = tg[1] - s[1], d = Math.hypot(dx, dy) || 1e-6; const mx = l1 + l2 - 0.01;
  if (d > mx) { tg = [s[0] + dx / d * mx, s[1] + dy / d * mx]; dx = tg[0] - s[0]; dy = tg[1] - s[1]; d = mx; }
  const a = (d * d + l1 * l1 - l2 * l2) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a)), ux = dx / d, uy = dy / d;
  return { e: [s[0] + ux * a - uy * h * bend, s[1] + uy * a + ux * h * bend], h: tg };
}
/** Bentuk "kapsul" meruncing: lingkaran (a, ra) dan (b, rb) dihubungkan garis singgung luar. Dipakai untuk badan, lengan, kaki supaya organik, bukan tabung seragam. */
function capsule(parent, fill, edge) {
  const el = S('path', edge ? { fill, stroke: edge, 'stroke-width': 0.6, 'stroke-linejoin': 'round' } : { fill }, parent), f = (v) => v.toFixed(2);
  return (a, b, ra, rb) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy);
    if (d < 0.01 || Math.abs(ra - rb) >= d) { const r = Math.max(ra, rb), c = ra >= rb ? a : b; el.setAttribute('d', `M${f(c[0] - r)} ${f(c[1])}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`); return; }
    const ux = dx / d, uy = dy / d, s = (ra - rb) / d, c = Math.sqrt(1 - s * s), nx = -uy, ny = ux;
    const m1 = [s * ux + c * nx, s * uy + c * ny], m2 = [s * ux - c * nx, s * uy - c * ny];
    el.setAttribute('d', `M${f(a[0] + ra * m1[0])} ${f(a[1] + ra * m1[1])}L${f(b[0] + rb * m1[0])} ${f(b[1] + rb * m1[1])}A${rb} ${rb} 0 ${s < 0 ? 1 : 0} 0 ${f(b[0] + rb * m2[0])} ${f(b[1] + rb * m2[1])}L${f(a[0] + ra * m2[0])} ${f(a[1] + ra * m2[1])}A${ra} ${ra} 0 ${s > 0 ? 1 : 0} 0 ${f(a[0] + ra * m1[0])} ${f(a[1] + ra * m1[1])}Z`);
  };
}
const phoneShape = (p, w = 4, h = 13) => { const g = S('g', {}, p); S('rect', { x: -w / 2, y: -h / 2, width: w, height: h, rx: 1.4, fill: C.dark, stroke: C.gold, 'stroke-width': 1 }, g); S('rect', { x: -w / 2 + 0.7, y: -h / 2 + 1.2, width: w - 1.4, height: h - 3, rx: 0.8, fill: '#9AD9B8', opacity: 0.85 }, g); return g; };

/* ===== Pose tampak samping (menghadap kanan = kiblat). Pose disimpan sebagai SUDUT sendi + panjang ruas, bukan titik,
   sehingga transisi berupa putaran sendi (lintasan melengkung, panjang tulang terjaga) dan tidak kaku. ===== */
const RAD = Math.PI / 180, dirv = (a) => [Math.sin(a * RAD), -Math.cos(a * RAD)], angOf = (v) => Math.atan2(v[0], -v[1]) / RAD, pt = (o, a, l) => { const d = dirv(a); return [o[0] + d[0] * l, o[1] + d[1] * l]; };
const L = { ua: 23, fa: 21 }, FL = 14; // panjang lengan atas/bawah, panjang telapak kaki (pergelangan → ujung jari)
const lerpA = (a, b, k) => a + (((b - a + 540) % 360) - 180) * k; // interpolasi sudut lewat jalur terpendek
// A=pergelangan kaki, K=lutut, H=pinggul, S=bahu, C=kepala, T=target tangan, toe=ujung jari kaki.
// Opsional: A2/toe2 = kaki sebelah kiri (jauh) bila posisinya beda; as = skala panjang lengan (perspektif, siku melebar ke samping); hw/ha = bobot & sudut telapak tangan (ha: 0 = rata menghadap kiblat, 90 = ke bawah).
// Kaidah yang dijaga: panjang betis 30, paha 32, badan 39, leher 12 (tulang tidak memanjang/memendek).
const RAW = {
  // Berdiri bersedekap (tangan kanan di atas kiri, di bawah dada), pandangan ke tempat sujud (kepala sedikit menunduk).
  // Tampak samping: lengan atas turun di sisi badan, SIKU menonjol sedikit ke belakang, lengan bawah MENDATAR menyilang di depan perut (fs = lengan bawah tampak memendek karena menyilang ke arah badan); tangan menempel di badan, tidak terjulur ke depan.
  q: { A: [96, 125], K: [96, 95], H: [96, 63], S: [96, 24], C: [98.1, 12.2], T: [104, 45.5], bend: 1, as: 1, fs: 0.55, toe: [110, 125], hw: 1, ha: 12 },
  // I'tidal: berdiri tegak, kedua tangan dilepas turun di sisi badan
  i: { A: [96, 125], K: [96, 95], H: [96, 63], S: [96, 24], C: [98.1, 12.2], T: [98, 66], bend: 0.15, toe: [110, 125] },
  // Rukuk: kaki lurus (lutut tidak ditekuk), punggung rata sejajar lantai, kepala sejajar punggung, kedua telapak tangan memegang lutut
  r: { A: [96, 125], K: [89.8, 95.7], H: [83.1, 64.4], S: [122.1, 64.4], C: [134, 63.6], T: [91, 93], bend: 0.3, toe: [110, 125] },
  // Turun ke sujud: lutut dulu, badan masih tegak condong sedikit, tangan menuju lantai; jari kaki sudah ditekuk menghadap kiblat
  k: { A: [81.5, 112], K: [110, 121], H: [105.5, 89.3], S: [118.8, 52.7], C: [123.9, 41.8], T: [130, 92], bend: 0.3, toe: [88.5, 124.1], ec: 0.5 },
  // Sujud (7 anggota): dahi + hidung, 2 telapak tangan, 2 lutut, jari-jari 2 kaki menyentuh lantai; pinggul lebih tinggi dari kepala.
  // TANGAN: kedua telapak DATAR menapak sejadah (fl = 1), jari rapat menghadap kiblat, diletakkan di samping kepala (sejajar bahu/telinga), BUKAN terlipat/menyatu di depan wajah (itu mirip sembah/sedekap).
  // Siku menekuk ke belakang & terangkat dari lantai, lengan bawah miring ke depan-bawah; ujung jari berhenti sebelum wajah supaya hidung, mulut, dan mata tidak tertutup; mata terpejam lembut (ec = 1)
  s: { A: [81.5, 112], K: [110, 121], H: [97.5, 91.9], S: [135, 102.7], C: [145.7, 119.2], T: [121, 124.3], bend: 1, as: 1, toe: [88.5, 124.1], hw: 1, ha: 0, fl: 1, ec: 1 },
  // Tangan terangkat (takbiratul ihram; juga sebelum rukuk & saat bangkit dari rukuk): berdiri tegak, kedua tangan diangkat sejajar bahu/telinga, telapak menghadap kiblat.
  // Tampak samping hanya satu tangan yang kelihatan jelas (fo kecil = tangan sebelah nyaris tertutup di baliknya), supaya tidak terbaca seperti tangan terkatup (sembah); siku turun, wajah tidak tertutup.
  u: { A: [96, 125], K: [96, 95], H: [96, 63], S: [96, 24], C: [98.1, 12.2], T: [115, 24], bend: 0.9, as: 1, fo: 0.15, toe: [110, 125], hw: 1, ha: -76 },
  // Duduk tawarruk (tahiyat akhir): pantat menyentuh lantai, kaki kiri keluar di bawah betis kanan, kaki kanan ditegakkan, tangan di atas paha
  w: { A: [97, 120], K: [119, 101], A2: [112, 123], toe2: [124, 124], H: [91, 117], S: [91.5, 78], C: [93.6, 66.2], T: [106, 103], bend: 0.2, toe: [108, 124], hw: 1, ha: 24 },
  // Duduk di antara dua sujud (iftirasy): duduk di atas telapak kaki kiri (rebah), kaki kanan ditegakkan dengan jari menghadap kiblat, tangan di atas paha
  d: { A: [81.5, 112], K: [110, 121], K2: [108, 121.8], A2: [80, 121.5], toe2: [66, 124.2], f2s: 1, H: [81, 108], S: [84.4, 69.1], C: [86.5, 57.3], T: [98, 108.5], bend: 0.2, toe: [88.5, 124.1], hw: 1, ha: 24 },
};
// Seberapa kuat telapak tangan "menapak" (lantai / lutut / paha): bila menapak, tangan tidak ikut bergoyang saat bernapas.
// fp = telunjuk terangkat (tahiyat). 'dt' = duduk iftirasy + telunjuk terangkat, dipakai untuk tahiyat awal.
const PLANT = { q: 0.15, i: 0, u: 0, r: 1, k: 0.2, s: 1, d: 1, w: 1 };
for (const k in PLANT) RAW[k].pl = PLANT[k];
const HZ = { q: 0.3, u: 0.05, i: 0, r: 0, k: 0.1, s: 0.3, d: 0.35, w: 0.35 }, HP = { q: 0.7, u: 1, i: 0.1, r: 0.55, k: 0.3, s: 1, d: 0.9, w: 0.9 }; // 3D: tangan menyilang ke tengah (hz) & telapak menghadap (hp)
for (const k in HZ) { RAW[k].hz = HZ[k]; RAW[k].hp = HP[k]; }
RAW.r.gr = 0.75; RAW.q.gr = 0.1; RAW.w.fp = 1; RAW.dt = { ...RAW.d, fp: 1 };
// Duduk tawarruk (tahiyat akhir): pantat menyentuh lantai, kaki kanan ditegakkan (jari menghadap kiblat), kaki kiri KELUAR di bawah betis kanan.
// Tampak dari kanan: lutut kiri di lantai (K2), betis kiri rebah di bawah betis kanan (A2), telapak kiri hampir tertutup (f2s = diperpendek karena menghadap penonton).
Object.assign(RAW.w, { A: [88, 114.5], K: [119, 119.5], H: [92, 120], S: [92.5, 81], C: [94.6, 69.2], T: [107, 112.5], K2: [118, 122], A2: [98, 122.8], toe2: [106, 124.3], toe: [93.5, 124.2], f2s: 0.6 });
RAW.sa = { ...RAW.w, sa: 1 }; // salam: posisi sama, kepala menoleh kanan lalu kiri
RAW.w0 = { ...RAW.w, fp: 0 }; // selesai: telunjuk sudah diturunkan
const POSE = Object.fromEntries(Object.entries(RAW).map(([k, r]) => {
  const v = [[r.K, r.A], [r.H, r.K], [r.S, r.H], [r.C, r.S]].map(([p, q]) => [p[0] - q[0], p[1] - q[1]]), A2 = r.A2 || r.A, K2 = r.K2 || r.K, toe2 = r.toe2 || r.toe, off = (a, b) => [b[0] - a[0], b[1] - a[1]];
  return [k, { A: r.A, ang: v.map(angOf), len: v.map((x) => Math.hypot(...x)), T: r.T, bend: r.bend, a2: angOf(off(A2, K2)), ak2: angOf(off(r.H, K2)), f2s: r.f2s ?? 1, sa: r.sa ?? 0, fa: angOf(off(r.A, r.toe)), fa2: angOf(off(A2, toe2)), as: r.as ?? 1, fs: r.fs ?? 1, fo: r.fo ?? 1, hw: r.hw ?? 0, ha: r.ha ?? 0, sy: r.S[1], pl: r.pl ?? 0, fp: r.fp ?? 0, gr: r.gr ?? 0, fl: r.fl ?? 0, ec: r.ec ?? 0, hz: r.hz ?? 0, hp: r.hp ?? 0 }];
}));
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const ramp = (x, a, b = 1) => clamp01((x - a) / (b - a));
/** Gerak halus (min-jerk) yang boleh "lewat sedikit" (o) lalu mengendap, jadi kepala/badan tidak berhenti mendadak seperti mesin.
 *  Paruh awal gerakan tidak berubah; lonjakan hanya ditambahkan di ujung dan hilang tepat di 1 (kecepatan 0), jadi pose akhir selalu persis. */
function swing(x, o = 0) {
  if (x <= 0) return 0; if (x >= 1) return 1;
  return ease(x) + (o ? o * Math.sin(Math.PI * ramp(x, 0.5)) ** 2 : 0);
}
const part = (kl, d, p = 1, o = 0) => swing(Math.pow(ramp(kl, d), p), o);
/** Campur dua pose. Orang tidak bergerak serentak: saat TURUN kaki/badan memimpin dan kepala menyusul, saat BANGKIT badan memimpin dan kaki menyusul;
 *  turun mulai pelan lalu cepat (tertarik gravitasi), bangkit mulai cepat (mendorong). Ada aba-aba kecil sebelum turun, kepala mengendap sedikit di akhir,
 *  dan tangan bergerak melengkung (busur), bukan garis lurus. */
function blend(pa, pb, kl) {
  const dy = pb.sy - pa.sy, dn = dy > 6, up = dy < -6;
  const [dL, dT, dA, dH] = dn ? [0, 0.05, 0.09, 0.17] : up ? [0.05, 0, 0.03, 0.12] : [0, 0.02, 0, 0.1];
  const [pL, pT, pA] = dn ? [1.12, 1.18, 1.08] : up ? [0.9, 0.9, 0.95] : [1, 1, 1];
  let kLeg = part(kl, dL, pL), kTo = part(kl, dT, pT), kArm = part(kl, dA, pA), kHd = part(kl, dH, 1), kHand = part(kl, dA + 0.08);
  const kFp = ease(ramp(kl, 0.5)), floor = Math.max(pa.sy, pb.sy) > 90 && Math.abs(dy) > 6; // gerak dari/ke sujud
  if (floor) { // turun: tangan menapak lantai lebih dulu, badan lalu bersandar pelan; naik: badan terangkat dulu, tangan menyusul. Tanpa overshoot supaya dahi tidak "menjedot" lantai.
    kLeg = part(kl, 0, 1); kTo = dn ? ease(Math.pow(ramp(kl, 0.06), 0.85)) : ease(Math.pow(ramp(kl, 0), 1.1)); kArm = dn ? ease(ramp(kl, 0, 0.72)) : ease(ramp(kl, 0.18)); kHand = dn ? ease(ramp(kl, 0.05, 0.75)) : ease(ramp(kl, 0.2)); kHd = kTo;
  }
  const ks = [kLeg, kLeg, kTo, kHd];
  const ang = ks.map((k, i) => lerp(pa.ang[i], pb.ang[i], k));
  { // kepala mengikuti badan (sudut RELATIF terhadap badan), bukan berayun sendiri. Sudut mutlak membuat kepala tertinggal jauh lalu menyambar & memantul di ujung gerak (terasa "kejedot" saat bangkit dari rukuk).
    // Relatif: kepala ikut terangkat bersama badan, hanya selisih kecil (menunduk/mendongak) yang berubah, mulus dan berhenti tepat di pose akhir tanpa melewati.
    const rel = (P) => ((P.ang[3] - P.ang[2] + 540) % 360) - 180, lag = floor ? 0.1 : dn ? 0.08 : up ? 0.05 : 0.03;
    ang[3] = ang[2] + lerp(rel(pa), rel(pb), ease(ramp(kl, lag, 1)));
  }
  const ant = dn ? clamp01(Math.abs(dy) / 60) * Math.sin(Math.PI * ramp(kl, 0, 0.24)) : 0; // aba-aba: badan & kepala sedikit ke belakang sebelum turun
  ang[2] -= 3.2 * ant; ang[3] -= 5 * ant;
  const dx = pb.T[0] - pa.T[0], dyT = pb.T[1] - pa.T[1], dist = Math.hypot(dx, dyT) || 1; let nx = -dyT / dist, ny = dx / dist;
  if (Math.abs(dx) > Math.abs(dyT) ? ny > 0 : nx < 0) { nx = -nx; ny = -ny; } // gerak mendatar: melengkung ke atas; gerak tegak: melengkung ke depan
  const bulge = 0.15 * dist * Math.sin(Math.PI * kArm);
  return { A: lerpV(pa.A, pb.A, kLeg), a2: lerpA(pa.a2, pb.a2, kLeg), fa: lerpA(pa.fa, pb.fa, kLeg), fa2: lerpA(pa.fa2, pb.fa2, kLeg), ang, len: ks.map((k, i) => lerp(pa.len[i], pb.len[i], k)),
    T: [lerp(pa.T[0], pb.T[0], kArm) + nx * bulge, Math.min(124.4, lerp(pa.T[1], pb.T[1], kArm) + ny * bulge)], bend: lerp(pa.bend, pb.bend, kArm), as: lerp(pa.as, pb.as, kArm), fs: lerp(pa.fs, pb.fs, kArm), fo: lerp(pa.fo, pb.fo, kArm), hw: lerp(pa.hw, pb.hw, kArm), ha: lerpA(pa.ha, pb.ha, kHand),
    ak2: lerpA(pa.ak2, pb.ak2, kLeg), f2s: lerp(pa.f2s, pb.f2s, kLeg), sa: lerp(pa.sa, pb.sa, kHd), sy: lerp(pa.sy, pb.sy, kTo), pl: lerp(pa.pl, pb.pl, kArm), fp: lerp(pa.fp, pb.fp, kFp), gr: lerp(pa.gr, pb.gr, kHand), fl: lerp(pa.fl, pb.fl, kHand), ec: lerp(pa.ec, pb.ec, ease(ramp(kl, 0.15, 0.9))), hz: lerp(pa.hz, pb.hz, kArm), hp: lerp(pa.hp, pb.hp, kHand) };
}
/** Forward kinematics + "kehidupan" saat menahan pose: napas (dada naik-turun), badan bergoyang pelan memindahkan berat (hanya saat berdiri),
 *  kepala melayang halus, tangan yang tidak menapak ikut bergoyang. Semua suku bernilai 0 saat now = 0, jadi hitungan simulasi (fk(pose, 0)) tidak berubah. */
/** Urutan salam: menoleh ke kanan (ke arah penonton), kembali ke tengah, lalu menoleh ke kiri (menjauh). Mengembalikan -1..1; 0 saat t = 0. */
const salamTurn = (t) => { const m = t % 6400, E = (a, b) => ease(clamp01((m - a) / (b - a))); return E(700, 1500) - E(2500, 3300) - E(3300, 4100) + E(5100, 5900); };
function fk(P, now, tl = now) {
  const br = Math.sin(now / 700), g = clamp01((70 - P.sy) / 46), sw = (Math.sin(now / 1900) + 0.6 * Math.sin(now / 3100)) * g, free = 1 - P.pl, an = P.ang.slice();
  an[0] += 0.45 * sw; an[1] -= 0.35 * sw; an[2] += 1.1 * br + 0.5 * sw; an[3] += 1.3 * Math.sin(now / 1100) + Math.sin(now / 2900) - 0.5 * br;
  const K = pt(P.A, an[0], P.len[0]), H = pt(K, an[1], P.len[1]), Sh = pt(H, an[2], P.len[2]), Cc = pt(Sh, an[3], P.len[3]), K2 = pt(H, P.ak2 + (an[1] - P.ang[1]), P.len[1]), A2 = pt(K2, P.a2 + 180, P.len[0]);
  return { A: P.A, K, H, S: Sh, C: Cc, K2, A2, toe: pt(P.A, P.fa, FL), toe2: pt(A2, P.fa2, FL * P.f2s), turn: P.sa * salamTurn(tl), T: [P.T[0] + free * 0.5 * Math.sin(now / 1300), P.T[1] + free * (0.5 * br + 0.4 * Math.sin(now / 1700))], bend: P.bend, as: P.as, fs: P.fs, fo: P.fo, hw: P.hw, ha: P.ha, fp: P.fp, gr: P.gr, fl: P.fl, ec: P.ec, hz: P.hz, hp: P.hp, br, an };
}
const TH = { shirt: { on: 50, off: 30, hold: 500 }, pants: { on: 25, off: 15, hold: 2500 } }; // sama dengan ambang di counter.js
/** sudut kemiringan HP dari sendi: Saku Baju = batang badan (pinggul → bahu) vs tegak, Saku Celana = paha (pinggul → lutut) vs tegak ke bawah */
const tiltOf = (kind, F) => (kind === 'shirt' ? angle([F.S[0] - F.H[0], F.S[1] - F.H[1]], [0, -1]) : angle([F.K[0] - F.H[0], F.K[1] - F.H[1]], [0, 1]));

const f2 = (v) => v.toFixed(2);
/** Kurva mulus tertutup melalui titik-titik (Catmull-Rom → Bezier): dipakai untuk badan (dada, pinggang, pinggul). */
function smoothClosed(P) {
  const n = P.length; let d = `M${f2(P[0][0])} ${f2(P[0][1])}`;
  for (let i = 0; i < n; i++) { const p0 = P[(i + n - 1) % n], p1 = P[i], p2 = P[(i + 1) % n], p3 = P[(i + 2) % n]; d += `C${f2(p1[0] + (p2[0] - p0[0]) / 6)} ${f2(p1[1] + (p2[1] - p0[1]) / 6)} ${f2(p2[0] - (p3[0] - p1[0]) / 6)} ${f2(p2[1] - (p3[1] - p1[1]) / 6)} ${f2(p2[0])} ${f2(p2[1])}`; }
  return d + 'Z';
}
/** Anggota badan gaya ilustrasi flat: garis tebal berujung bulat (tanpa garis tepi). Masih dipakai untuk leher. */
const limb = (parent, color, w) => { const el = S('path', { fill: 'none', stroke: color, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, parent); return (...P) => el.setAttribute('d', 'M' + P.map((p) => f2(p[0]) + ' ' + f2(p[1])).join('L')); };
/** Tangan manusia: telapak + empat jari + ibu jari. fp = telunjuk terangkat (tahiyat: tiga jari lain menggenggam, ibu jari menempel), gr = menggenggam (rukuk memegang lutut).
 *  Koordinat lokal: titik awal = pergelangan, sumbu +x searah lengan bawah, −y sisi ibu jari/telunjuk. */
function hand(parent, skin, shade) {
  const g = S('g', {}, parent), st = (w, c) => ({ fill: 'none', stroke: c, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
  const og = S('g', {}, g); // tangan biasa (telapak + jari + ibu jari)
  const thumbB = S('path', st(1.9, shade), og), fing = [0, 1, 2, 3].map(() => S('path', st(1.55, skin), og)), palm = S('path', { fill: skin }, og), thumb = S('path', st(1.9, skin), og);
  /* fl = telapak DATAR menapak lantai (sujud): tampak samping hanya sisi kelingking, berupa lempengan rata; jari rapat menghadap kiblat, ibu jari tersembunyi di sisi dalam. */
  const flat = S('g', { display: 'none' }, g);
  S('path', { d: 'M-0.9 -1.3Q2.4 -2.7 6.2 -2.3Q10.8 -2.1 13.3 -0.5Q14.5 0.6 13.5 1.9Q12.8 2.5 11.7 2.5L-0.9 2.5Q-1.8 0.6 -0.9 -1.3Z', fill: skin }, flat);
  S('path', { d: 'M6.4 -2.2Q6.9 0.2 6.3 2.4M7.6 0.1H12.6', fill: 'none', stroke: shade, 'stroke-width': 0.5, 'stroke-linecap': 'round', opacity: 0.55 }, flat);
  S('path', { d: 'M1.2 -1.9Q4 -2.4 6 -2', fill: 'none', stroke: '#fff', 'stroke-width': 0.5, 'stroke-linecap': 'round', opacity: 0.28 }, flat);
  const BY = [-1.75, -0.6, 0.55, 1.6], LEN = [4.4, 4.9, 4.5, 3.5];
  return { set(h, rot, fp, gr = 0, fl = 0) {
    g.setAttribute('transform', `translate(${f2(h[0])} ${f2(h[1])}) rotate(${rot.toFixed(1)})`);
    og.setAttribute('opacity', (1 - fl).toFixed(2)); og.setAttribute('display', fl > 0.97 ? 'none' : 'inline'); flat.setAttribute('opacity', fl.toFixed(2)); flat.setAttribute('display', fl > 0.03 ? 'inline' : 'none');
    palm.setAttribute('d', `M-0.6 -2.5Q2.4 -3.3 5.2 -2.6Q6 0 5.2 2.4Q2.4 3.2 -0.6 2.4Q-1.5 0 -0.6 -2.5Z`);
    fing.forEach((f, i) => {
      const point = i === 0 && fp > 0.03, c = point ? 0.1 * (1 - fp) + 0.15 : Math.max(gr * 0.9, fp * 0.95, 0.12), L = LEN[i] * (point ? 1 + 0.35 * fp : 1) * (1 - 0.62 * c), y = BY[i], x0 = 5, x1 = x0 + L;
      const bend = point ? -0.5 * fp : c * 1.9, ye = y + bend;
      f.setAttribute('d', `M${f2(x0 - 0.5)} ${f2(y)}Q${f2(x0 + L * 0.55)} ${f2(y + bend * 0.2)} ${f2(x1)} ${f2(ye)}`);
    });
    const tip = fp > 0.5 ? [4.4, -0.2] : [4.1 - 1.4 * gr, -3.5 + 2.2 * gr];
    thumb.setAttribute('d', `M1.2 -2.4Q${f2((1.2 + tip[0]) / 2)} ${f2(-3.6 + 1.6 * Math.max(fp, gr))} ${f2(tip[0])} ${f2(tip[1])}`);
    thumbB.setAttribute('d', '');
  } };
}
/** Kedip: 0 (terbuka) .. 1 (tertutup). Dua irama berbeda supaya tidak berulang teratur; bernilai 0 saat now = 0. */
const blinkAt = (now) => { const f = (x, w) => (x < w ? Math.sin(Math.PI * x / w) : 0); return Math.max(f(now % 4300, 150), f((now + 1700) % 7100, 130)); };
const PK = { shirt: '#1DB86E', shirtF: '#13935A', shirtL: '#3FD08B', shirtS: '#0F9A5B', cuff: '#10A262', pants: '#2C4468', pantsF: '#21345A', pantsL: '#3B5A87', skin: '#F0C09A', skinF: '#CF9A74', skinS: '#E0A47E', peci: '#23262C', hair: '#2B211C' };

/** Gambar orang tampak samping di dalam <svg>. Mengembalikan fungsi draw(pose, nowMs) → sudut kemiringan HP. */
function sideFigure2D(svg, kind) {
  const cam = kind === 'cam', plain = kind === 'plain'; // varian kamera: tanpa HP di saku, sejadah lebih panjang supaya HP di depan muat
  svg.setAttribute('viewBox', cam ? '40 -36 240 188' : '54 -15 148 149');
  const g = S('g', {}, svg), gx = cam ? 40 : 52, gw = cam ? 240 : 146;
  S('rect', { x: gx, y: 126.5, width: gw, height: 7, rx: 3.5, fill: C.gold }, g); S('rect', { x: gx, y: 126.5, width: gw, height: 1.7, rx: 0.8, fill: '#fff', opacity: 0.4 }, g);
  S('path', { d: `M${gx + 6} 130.2h${gw - 12}`, stroke: C.gold2, 'stroke-width': 0.8, 'stroke-dasharray': '2 2', fill: 'none' }, g);
  if (!cam) { const kb = S('g', { transform: 'translate(176 4)' }, g); // penanda arah kiblat
    S('path', { d: 'M0 4h22M16 0l6 4-6 4', stroke: C.shirtD, 'stroke-width': 1.8, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, kb);
    S('rect', { x: 8, y: 11, width: 11, height: 11, rx: 1.5, fill: C.dark }, kb); S('path', { d: 'M8 14.5h11', stroke: C.gold, 'stroke-width': 1.2 }, kb); }
  const shadow = S('ellipse', { cy: 130, ry: 3, fill: '#0A5C38', opacity: 0.1 }, g);
  /* kaki: celana meruncing (paha → lutut → pergelangan) + telapak kaki berbentuk, bukan garis tebal seragam */
  const leg = (parent, pc, sk, hl, split) => {
    const thG = S('g', {}, parent); let loG = thG;
    const mk = (pp) => { const ft = capsule(pp, sk), toe = capsule(pp, sk), sn = capsule(pp, pc), hem = capsule(pp, hl); return { ft, toe, sn, hem }; };
    const lo = split ? null : mk(thG), th = split ? null : capsule(thG, pc), up = split ? capsule(thG, pc) : null;
    const draw = (F, L) => {
      L.ft(F.A, F.toe, 3.2, 2.2);
      const v = [F.toe[0] - F.A[0], F.toe[1] - F.A[1]], vl = Math.hypot(...v) || 1; L.toe([F.toe[0] - v[0] / vl * 2.2, F.toe[1] - v[1] / vl * 2.2], F.toe, 2.3, 1.7);
      L.sn(F.K, F.A, 4.7, 3.3); L.hem(lerpV(F.K, F.A, 0.88), F.A, 3.5, 3.5);
    };
    if (!split) return (F) => { draw(F, lo); th(F.H, F.K, 6.3, 4.8); };
    return { up: (F) => up(F.H, F.K, 6.3, 4.8), low: (parent2) => { const L = mk(parent2); return (F) => draw(F, L); } };
  };
  /* lengan: lengan baju koko panjang sampai pergelangan, manset, telapak tangan dengan jari */
  const arm = (parent, sl, sk, shd) => {
    const hd = hand(parent, sk, shd), fa = capsule(parent, sl), cf = capsule(parent, PK.cuff), ua = capsule(parent, sl), sh = S('circle', { r: 4.1, fill: sl }, parent);
    return (F) => {
      const { e, h } = ik(F.S, F.T, L.ua * F.as, L.fa * F.as * F.fs, F.bend), rot = lerpA(Math.atan2(h[1] - e[1], h[0] - e[0]) / RAD, F.ha, F.hw);
      hd.set(h, rot, F.fp, F.gr, F.fl); fa(e, h, 3.7, 3.0); cf(lerpV(e, h, 0.86), h, 3.1, 3.1); ua(lerpV(F.S, F.H, 0.06), e, 4.3, 3.7); { const q = lerpV(F.S, F.H, 0.06); sh.setAttribute('cx', f2(q[0])); sh.setAttribute('cy', f2(q[1])); }
    };
  };
  const fg = S('g', { transform: 'translate(-3.2 -0.9)' }, g), farLeg = leg(fg, PK.pantsF, PK.skinF, '#17263B'), fga = S('g', { transform: 'translate(-3.2 -0.9)' }, g), farArm = arm(fga, PK.shirtF, PK.skinF, PK.skinF);
  const nearLeg = leg(g, PK.pants, PK.skin, '#1F3350', true), neck = limb(g, PK.skin, 6.2);
  const skirt = S('path', { fill: PK.shirt }, g); // ujung baju koko yang jatuh menutupi pinggul & paha atas
  const PF = [[-0.05, 4], [0.07, 7.6], [0.27, 8.8], [0.55, 8.2], [0.82, 8.4], [1.0, 7.2]], PB = [[1.0, 7.2], [0.82, 8], [0.55, 7.2], [0.27, 8], [0.07, 7.4], [-0.05, 4.2]];
  const torso = S('path', { fill: PK.shirt }, g), shade = S('path', { fill: PK.shirtS, opacity: 0.55 }, g), seam = S('path', { fill: 'none', stroke: '#fff', 'stroke-opacity': 0.5, 'stroke-width': 0.8, 'stroke-linecap': 'round' }, g);
  const btn = [0, 1, 2].map(() => S('circle', { r: 0.7, fill: '#fff', opacity: 0.85 }, g)), collar = S('path', { fill: PK.shirtL, stroke: PK.shirtS, 'stroke-width': 0.5, 'stroke-linejoin': 'round' }, g);
  const nearLow = nearLeg.low(g);
  const head = S('g', {}, g), hairB = S('path', { d: 'M-8.2 -3Q-9.6 2.4 -5.4 6.4L-3.2 2.8Q-5 0 -5 -3Z', fill: PK.hair }, head);
  S('ellipse', { cx: 1.4, cy: 3.6, rx: 6.4, ry: 5.4, fill: PK.skin }, head); S('circle', { r: 8.3, fill: PK.skin }, head); // tengkorak + rahang
  S('path', { d: 'M-4.5 7.6Q1 10.4 6.4 8', fill: 'none', stroke: PK.skinS, 'stroke-width': 1.1, 'stroke-linecap': 'round', opacity: 0.5 }, head); // bayangan rahang
  /* Fitur wajah diproyeksikan dari posisi 3D (f = ke depan, s = ke sisi kanan, y = tinggi) menurut sudut menoleh, jadi saat salam wajah benar-benar berputar
     ke arah penonton (kanan) lalu menjauh (kiri), bukan sekadar bergeser. */
  const fts = [], lids = [], lashes = [], brows = [], fe = (f, s, y, zt, build) => { const gg = S('g', {}, head); build(gg); fts.push({ gg, f, s, y, zt }); };
  fe(7.9, 0, 1.6, 2, (q) => { S('path', { d: 'M-1 -2.6Q2.6 -0.4 2.3 1.6Q1.6 3 -1.2 2.6Z', fill: PK.skin }, q); S('path', { d: 'M0.2 2.7Q1.5 3 2.2 2', fill: 'none', stroke: PK.skinS, 'stroke-width': 0.6, 'stroke-linecap': 'round' }, q); }); // hidung mancung proporsional
  fe(6.1, 0, 4.2, 1.5, (q) => S('path', { d: 'M-1.6 0Q0 1 1.6 -0.2', stroke: '#B45F55', 'stroke-width': 0.75, fill: 'none', 'stroke-linecap': 'round' }, q)); // bibir
  fe(5.2, 0, 7, 1.2, (q) => S('path', { d: 'M-2.6 0Q0 1.3 2.6 0', stroke: PK.skinS, 'stroke-width': 0.6, fill: 'none', 'stroke-linecap': 'round', opacity: 0.8 }, q)); // dagu
  for (const s of [4.7, -4.7]) fe(3, s, 3.2, 0, (q) => S('circle', { r: 2, fill: '#F08C84', opacity: 0.25 }, q));
  fts[fts.length - 2].wide = true;
  for (const s of [3.5, -3.5]) fe(3.9, s, -0.9, 0, (q) => {
    brows.push(S('path', { d: 'M-2.1 -2.8Q0 -4 2.2 -2.6', fill: 'none', stroke: '#3A2A22', 'stroke-width': 1.05, 'stroke-linecap': 'round' }, q)); // alis
    S('ellipse', { rx: 1.75, ry: 1.45, fill: '#fff' }, q); S('ellipse', { cx: 0.4, rx: 1.15, ry: 1.2, fill: '#4A3022' }, q); S('circle', { cx: 0.5, r: 0.62, fill: C.dark }, q); S('circle', { cx: 0.95, cy: -0.5, r: 0.38, fill: '#fff' }, q);
    lids.push(S('ellipse', { rx: 1.95, ry: 0, fill: PK.skin }, q)); lashes.push(S('path', { d: 'M-1.6 0.1Q0 1.2 1.7 0.1', fill: 'none', stroke: '#4A3328', 'stroke-width': 0.55, 'stroke-linecap': 'round', opacity: 0 }, q)); // garis kelopak tertutup (tanpa bulu mata)
  });
  const hairF = S('ellipse', { cy: 1.4, rx: 7.9, ry: 5.6, fill: PK.hair, opacity: 0 }, head); // tampak belakang kepala saat menoleh ke kiri
  for (const s of [7.8, -7.8]) fe(-1.8, s, 1.2, 2.5, (q) => { S('ellipse', { rx: 1.7, ry: 2.3, fill: PK.skinS }, q); S('path', { d: 'M-0.5 -1Q0.8 0 -0.3 1.3', fill: 'none', stroke: '#C98A66', 'stroke-width': 0.6, 'stroke-linecap': 'round' }, q); });
  S('path', { d: 'M-8.6 -2.4C-9 -9.8 -3.8 -11.6 0 -11.6C4.2 -11.6 9 -9.6 8.7 -2.4Q0 -4.8 -8.6 -2.4Z', fill: PK.peci }, head); S('path', { d: 'M-7.9 -3.5Q0 -5.6 8 -3.5', fill: 'none', stroke: C.gold, 'stroke-width': 0.7, 'stroke-linecap': 'round', opacity: 0.9 }, head);
  S('path', { d: 'M-5 -9.2Q0 -11 4.6 -9.4', fill: 'none', stroke: '#fff', 'stroke-width': 0.8, 'stroke-linecap': 'round', opacity: 0.22 }, head); // kilap peci
  const setHead = (F, now) => {
    const ph = F.turn * 1.2217, c = Math.cos(ph), sn = Math.sin(ph), bk = blinkAt(now);
    for (const t of fts) { const x = t.f * c - t.s * sn, z = t.f * sn + t.s * c, o = clamp01((z + t.zt) / 1.5), sx = t.wide ? 1 + 0.9 * Math.abs(sn) : Math.max(0.62, Math.min(1, 0.62 + z / 9)); t.gg.setAttribute('transform', `translate(${x.toFixed(2)} ${t.y}) scale(${sx.toFixed(2)} 1)`); t.gg.setAttribute('opacity', o.toFixed(2)); }
    const cl = Math.max(bk, F.ec || 0); // kedip atau terpejam tenang (sujud)
    lids.forEach((l) => l.setAttribute('ry', (1.7 * cl).toFixed(2))); lashes.forEach((l) => l.setAttribute('opacity', cl > 0.5 ? (bk > 0.5 ? 0.85 : 0.75) : 0));
    brows.forEach((b) => { b.setAttribute('transform', `translate(0 ${(0.45 * (F.ec || 0)).toFixed(2)})`); b.setAttribute('stroke-width', (1.05 - 0.2 * (F.ec || 0)).toFixed(2)); });
    hairB.setAttribute('opacity', (1 - clamp01(sn * 2)).toFixed(2)); hairF.setAttribute('opacity', clamp01((-sn - 0.45) * 5).toFixed(2));
  };
  const nearArm = arm(g, PK.shirt, PK.skin, PK.skinS);
  const glow = S('circle', { r: 11, fill: C.gold, opacity: 0.45 }, g), ph = phoneShape(g, 3.8, 13);
  if (cam || plain) { glow.setAttribute('display', 'none'); ph.setAttribute('display', 'none'); }
  const fn = (P, now, tm) => {
    const F = fk(P, now, tm);
    farLeg({ ...F, K: F.K2, A: F.A2, toe: F.toe2 }); fga.setAttribute('transform', `translate(${f2(-3.2 * F.fo)} ${f2(-0.9 * F.fo)})`); farArm(F); nearLeg.up(F); nearLow(F);
    const tl = Math.hypot(F.H[0] - F.S[0], F.H[1] - F.S[1]) || 1, ux0 = (F.H[0] - F.S[0]) / tl, uy0 = (F.H[1] - F.S[1]) / tl, E = [F.H[0] + ux0 * 3.5, F.H[1] + uy0 * 3.5];
    neck(F.S, F.C);
    const n = Math.hypot(E[0] - F.S[0], E[1] - F.S[1]) || 1, ux = (E[0] - F.S[0]) / n, uy = (E[1] - F.S[1]) / n, at = (t, w) => [F.S[0] + ux * n * t + uy * w, F.S[1] + uy * n * t - ux * w], chest = 1 + 0.045 * F.br;
    /* ujung baju: kapsul dari pinggul menyusuri paha, ikut tertekuk saat duduk */
    { const a = at(0.9, 0), tk = lerpV(F.H, F.K, 0.3), dx = tk[0] - a[0], dy = tk[1] - a[1], d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d, r1 = 7, r2 = 6.6;
      skirt.setAttribute('d', `M${f2(a[0] + nx * r1)} ${f2(a[1] + ny * r1)}L${f2(tk[0] + nx * r2)} ${f2(tk[1] + ny * r2)}A${r2} ${r2} 0 0 0 ${f2(tk[0] - nx * r2)} ${f2(tk[1] - ny * r2)}L${f2(a[0] - nx * r1)} ${f2(a[1] - ny * r1)}A${r1} ${r1} 0 0 0 ${f2(a[0] + nx * r1)} ${f2(a[1] + ny * r1)}Z`); }
    const body = [at(-0.11, 0), ...PF.map(([t, w]) => at(t, t > 0.05 && t < 0.6 ? w * chest : w)), at(1.07, 0), ...PB.map(([t, w]) => at(t, -w))];
    torso.setAttribute('d', smoothClosed(body));
    shade.setAttribute('d', smoothClosed([at(0.1, -2), at(0.3, -2.4), at(0.6, -2), at(0.95, -2.6), at(1.05, 0), at(0.95, -(6.4)), at(0.6, -(6.2)), at(0.3, -(7)), at(0.1, -(6.4))]));
    const sm = lerpV(F.S, F.H, 0.14), sm2 = lerpV(F.S, F.H, 0.86); seam.setAttribute('d', `M${f2(sm[0] + uy * 6.8)} ${f2(sm[1] - ux * 6.8)}L${f2(sm2[0] + uy * 6.6)} ${f2(sm2[1] - ux * 6.6)}`);
    btn.forEach((b, i) => { const p = at(0.28 + i * 0.2, 6.9); b.setAttribute('cx', f2(p[0])); b.setAttribute('cy', f2(p[1])); });
    { const a = at(-0.02, 5.6), b = at(-0.02, -4.6); collar.setAttribute('d', `M${f2(a[0])} ${f2(a[1])}L${f2(b[0])} ${f2(b[1])}L${f2(b[0] - ux * 3.2)} ${f2(b[1] - uy * 3.2)}L${f2(a[0] - ux * 3.2)} ${f2(a[1] - uy * 3.2)}Z`); }
    head.setAttribute('transform', `translate(${F.C[0].toFixed(2)} ${F.C[1].toFixed(2)}) rotate(${(F.an[2] + 0.4 * (F.an[3] - F.an[2])).toFixed(1)})`);
    setHead(F, now);
    nearArm(F);
    shadow.setAttribute('cx', ((F.A[0] + F.H[0] + F.S[0]) / 3).toFixed(1)); shadow.setAttribute('rx', (16 + Math.abs(F.S[0] - F.A[0]) * 0.3).toFixed(1));
    if (cam || plain) { fn.F = F; return 0; } // varian kamera: simpan sendi (dibaca simulasi), tidak ada meter kemiringan
    let pos, a, tilt;
    if (kind === 'shirt') { // HP di dada: ikut batang badan (pinggul → bahu)
      const u = [F.S[0] - F.H[0], F.S[1] - F.H[1]], nn = Math.hypot(...u), vx = u[0] / nn, vy = u[1] / nn, f = [-vy, vx];
      pos = [F.S[0] - vx * nn * 0.3 + f[0] * 8.6, F.S[1] - vy * nn * 0.3 + f[1] * 8.6]; a = Math.atan2(vx, -vy) / RAD; tilt = angle(u, [0, -1]);
    } else { // HP di paha: ikut paha (pinggul → lutut)
      const u = [F.K[0] - F.H[0], F.K[1] - F.H[1]], nn = Math.hypot(...u), vx = u[0] / nn, vy = u[1] / nn, f = [vy, -vx];
      pos = [F.H[0] + vx * nn * 0.38 + f[0] * 7.6, F.H[1] + vy * nn * 0.38 + f[1] * 7.6]; a = Math.atan2(vx, -vy) / RAD; tilt = angle(u, [0, 1]);
    }
    ph.setAttribute('transform', `translate(${pos[0].toFixed(2)} ${pos[1].toFixed(2)}) rotate(${a.toFixed(1)})`);
    glow.setAttribute('cx', pos[0]); glow.setAttribute('cy', pos[1]); glow.setAttribute('opacity', (0.26 + 0.2 * Math.sin(now / 260)).toFixed(2));
    return tilt;
  };
  return fn;
}

/* ===== 3D: sajadah, ruangan, HP, dan figur tampak samping (WebGL) ===== */
let _carpet = null, _glow = null;
function carpetTex() {
  if (_carpet) return _carpet; const c = document.createElement('canvas'); c.width = 1024; c.height = 256; const g = c.getContext('2d');
  const bg = g.createLinearGradient(0, 0, 0, 256); bg.addColorStop(0, '#1F7655'); bg.addColorStop(1, '#0F4B38'); g.fillStyle = bg; g.fillRect(0, 0, 1024, 256);
  g.strokeStyle = '#E9CB7E'; g.lineWidth = 12; g.strokeRect(8, 8, 1008, 240); g.strokeStyle = '#B38F3E'; g.lineWidth = 3; g.strokeRect(28, 28, 968, 200); g.strokeRect(38, 38, 948, 180);
  g.fillStyle = 'rgba(233,203,126,.55)'; for (let x = 70; x < 640; x += 46) for (let y = 70; y < 200; y += 46) { g.beginPath(); g.moveTo(x, y - 9); g.lineTo(x + 9, y); g.lineTo(x, y + 9); g.lineTo(x - 9, y); g.closePath(); g.fill(); }
  g.fillStyle = 'rgba(15,70,50,.55)'; g.beginPath(); g.moveTo(690, 52); g.lineTo(810, 52); g.quadraticCurveTo(930, 52, 984, 128); g.quadraticCurveTo(930, 204, 810, 204); g.lineTo(690, 204); g.closePath(); g.fill();
  g.strokeStyle = '#F2D687'; g.lineWidth = 6; g.stroke(); g.strokeStyle = 'rgba(242,214,135,.5)'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(710, 76); g.lineTo(810, 76); g.quadraticCurveTo(900, 76, 940, 128); g.quadraticCurveTo(900, 180, 810, 180); g.lineTo(710, 180); g.stroke();
  return (_carpet = c);
}
function glowTex() {
  if (_glow) return _glow; const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.45, 'rgba(255,255,255,.35)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return (_glow = c);
}
const glowCmd = (eng, p, r, col, a) => { const c = meshCmd(eng.meshes.quad, IDENT, [r, r, 1], p, col, { mode: 3, tex: glowTex(), a, sh: false }); c.fx = true; return c; };
/** sajadah 3D + rumbai, memanjang searah kiblat (x) */
function carpetCmds(eng, x0, x1, hz = 24) {
  const cx = (x0 + x1) / 2, hw = (x1 - x0) / 2, out = [meshCmd(eng.meshes.slab, IDENT, [hw, 0.75, hz], [cx, FLOOR + 0.75, 0], [1, 1, 1], { mode: 2, tex: carpetTex(), ground: true, sh: false, ao: 0 })];
  for (const s of [-1, 1]) out.push(meshCmd(eng.meshes.slab, IDENT, [1.6, 0.35, hz], [cx + s * (hw + 1.5), FLOOR + 0.4, 0], [0.93, 0.88, 0.74], { ground: true, sh: false, ao: 0 }));
  return out;
}
/** Interior masjid hangat (senada video Saku Baju/Saku Celana): dinding krem berlapis cahaya, jendela di kiri dengan berkas cahaya jatuh ke lantai kayu, mihrab berukir emas, plint, vinyet lembut, debu melayang. */
function roomBackdrop(back, vb, fy = 118.5) {
  const id = 'rm' + Math.random().toString(36).slice(2, 7), d = SV('defs', {}, back), X0 = vb[0] - 400, W = vb[2] + 800, [vx, vy, vw, vh] = vb, top = vy - 300;
  const lg = (n, stops, x2 = 0, y2 = 1) => { const e = SV('linearGradient', { id: id + n, x1: 0, y1: 0, x2, y2 }, d); stops.forEach(([o, c, a]) => SV('stop', { offset: o, 'stop-color': c, 'stop-opacity': a ?? 1 }, e)); return `url(#${id}${n})`; };
  const rg = (n, stops, o = {}) => { const e = SV('radialGradient', { id: id + n, cx: 0.5, cy: 0.5, r: 0.5, ...o }, d); stops.forEach(([of, c, a]) => SV('stop', { offset: of, 'stop-color': c, 'stop-opacity': a }, e)); return `url(#${id}${n})`; };
  const bl = SV('filter', { id: id + 'b', x: '-30%', y: '-30%', width: '160%', height: '160%' }, d); SV('feGaussianBlur', { stdDeviation: 5 }, bl);
  const bl2 = SV('filter', { id: id + 'c', x: '-30%', y: '-30%', width: '160%', height: '160%' }, d); SV('feGaussianBlur', { stdDeviation: 1.6 }, bl2);
  // dinding + plint
  SV('rect', { x: X0, y: top, width: W, height: fy - top, fill: lg('w', [[0, '#EFDDBD'], [0.55, '#E7D0A8'], [1, '#DDBF92']]) }, back);
  SV('rect', { x: X0, y: fy - 7, width: W, height: 7.5, fill: lg('p', [[0, '#F3E6CC'], [1, '#D9BE92']]) }, back); SV('rect', { x: X0, y: fy - 7.4, width: W, height: 0.9, fill: '#FFF7E4', opacity: 0.8 }, back);
  // mihrab (relung berlengkung lancip, bingkai kayu + pita emas)
  const mx = vx + vw * 0.5, mw = 27, mt = vy + vh * 0.04, mb = fy - 7;
  const arch = (hw, t, b) => `M${mx - hw} ${b}V${t + 34}C${mx - hw} ${t + 14} ${mx - hw * 0.35} ${t + 8} ${mx} ${t}C${mx + hw * 0.35} ${t + 8} ${mx + hw} ${t + 14} ${mx + hw} ${t + 34}V${b}Z`;
  SV('path', { d: arch(mw + 7, mt - 6, mb), fill: lg('m1', [[0, '#C79B63'], [1, '#A47843']]) }, back);
  SV('path', { d: arch(mw + 7, mt - 6, mb), fill: 'none', stroke: '#E8CA86', 'stroke-width': 1.4 }, back);
  SV('path', { d: arch(mw, mt, mb), fill: lg('m2', [[0, '#7E5A36'], [0.5, '#9B7447'], [1, '#B58A55']]) }, back);
  SV('path', { d: arch(mw - 7, mt + 8, mb), fill: lg('m3', [[0, '#6F4F30'], [1, '#A47A4B']]), opacity: 0.85 }, back);
  SV('path', { d: arch(mw - 3.5, mt + 4, mb), fill: 'none', stroke: '#E8CA86', 'stroke-width': 0.9, opacity: 0.9 }, back);
  for (let i = -3; i <= 3; i++) SV('circle', { cx: mx + i * 5.2, cy: mt + 12 + Math.abs(i) * 3.4 - (i === 0 ? 3 : 0), r: i === 0 ? 1.7 : 1, fill: '#F2D78F', opacity: 0.85 }, back);
  SV('rect', { x: mx - mw - 9, y: mb - 3, width: (mw + 9) * 2, height: 3.5, rx: 1, fill: '#8A6338' }, back);
  // jendela kiri + silau
  const wx = vx - 4, ww = vw * 0.17, wt = vy + vh * 0.06, wb = fy - 18;
  SV('ellipse', { cx: wx + ww * 0.6, cy: (wt + wb) / 2, rx: ww * 1.5, ry: (wb - wt) * 0.75, fill: rg('g', [[0, '#FFFFFF', 0.75], [1, '#FFF3D2', 0]]) }, back);
  SV('rect', { x: wx, y: wt, width: ww, height: wb - wt, rx: 2, fill: lg('wn', [[0, '#FFFFFF'], [1, '#FFF1CF']]) }, back);
  SV('path', { d: `M${wx + ww / 2} ${wt}V${wb}M${wx} ${(wt + wb) / 2}H${wx + ww}`, stroke: '#D9B986', 'stroke-width': 1.6 }, back);
  SV('rect', { x: wx, y: wt, width: ww, height: wb - wt, rx: 2, fill: 'none', stroke: '#E6CFA3', 'stroke-width': 2 }, back);
  // lantai kayu + papan
  SV('rect', { x: X0, y: fy, width: W, height: 400, fill: lg('f', [[0, '#DDBC8B'], [0.5, '#C99F68'], [1, '#B58750']]) }, back);
  for (let y = fy + 4, k = 0; y < vy + vh + 6; y += 5.2 + k * 0.5, k++) SV('path', { d: `M${X0} ${y.toFixed(1)}H${X0 + W}`, stroke: '#8E6535', 'stroke-opacity': 0.2, 'stroke-width': 0.5 }, back);
  SV('path', { d: `M${wx - 4} ${fy}L${wx + ww + 6} ${fy}L${wx + ww + vw * 0.55} ${vy + vh + 8}L${wx + vw * 0.12} ${vy + vh + 8}Z`, fill: '#FFF8E2', opacity: 0.34, filter: `url(#${id}b)` }, back);   // bercak cahaya jendela di lantai
  SV('path', { d: `M${wx + ww} ${wt + 4}L${wx + ww + vw * 0.62} ${fy - 3}L${wx + ww + vw * 0.36} ${fy - 3}L${wx + ww} ${wb - 6}Z`, fill: '#FFFBEA', opacity: 0.2, filter: `url(#${id}b)` }, back);   // berkas cahaya
  SV('ellipse', { cx: vx + vw * 0.5, cy: fy + 2, rx: vw * 0.42, ry: 5, fill: '#000', opacity: 0.08, filter: `url(#${id}c)` }, back);
  SV('rect', { x: vx - 40, y: vy - 40, width: vw + 80, height: vh + 80, fill: rg('v', [[0.62, '#6B4423', 0], [1, '#6B4423', 0.2]], { r: 0.75 }), 'pointer-events': 'none' }, back);   // vinyet lembut
  const dust = Array.from({ length: 10 }, (_, i) => SV('circle', { r: 0.6 + (i % 3) * 0.3, fill: '#FFF6D6', opacity: 0 }, back));
  return { tick(now) { dust.forEach((c, i) => { const t = (now / (9000 + i * 900) + i * 0.37) % 1; c.setAttribute('cx', (vb[0] + vb[2] * (0.08 + ((i * 0.097 + 0.06 * Math.sin(now / 1900 + i)) % 0.5))).toFixed(1)); c.setAttribute('cy', (vb[1] + vb[3] * 0.85 * (1 - t)).toFixed(1)); c.setAttribute('opacity', (0.55 * Math.sin(Math.PI * t)).toFixed(2)); }); } };
}
const backG = (svg) => { if (svg.__back) return SV('g', {}, svg.__back); const g = S('g', {}); svg.insertBefore(g, svg.firstChild); return g; };
const SIDE_CAM = { yaw: 0, s: 1, tx: 0, ty: 0, k: 0.21 };

/** figur 3D tampak samping; antarmuka sama dengan versi SVG: draw(pose, nowMs, tl) → sudut kemiringan HP */
function sideFigure3D(svg, kind) {
  const cam = kind === 'cam', plain = kind === 'plain', vb = cam ? [40, -36, 240, 188] : [54, -15, 148, 149];
  svg.setAttribute('viewBox', vb.join(' ')); const lay = makeLayer(svg, vb); if (!lay) return null;
  const eng = lay.eng, room = roomBackdrop(lay.back, vb), ground = carpetCmds(eng, cam ? 36 : 50, cam ? 286 : 208), fig = { lay, extras: [], views: [], rig: null, add(fn) { this.extras.push(fn); } };
  svg.__back = lay.back; svg.__fig = fig; svg.__vb = vb;
  if (!cam) { const kb = S('g', { transform: 'translate(176 4)' }, svg); S('path', { d: 'M0 4h22M16 0l6 4-6 4', stroke: C.shirtD, 'stroke-width': 1.8, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, kb); S('rect', { x: 8, y: 11, width: 11, height: 11, rx: 1.5, fill: C.dark }, kb); S('path', { d: 'M8 14.5h11', stroke: C.gold, 'stroke-width': 1.2 }, kb); }
  const fn = (P, now, tm) => {
    const F = fk(P, now, tm), rig = rigFromF(F, eng.meshes.torus, { blink: blinkAt(now) }), cmds = ground.slice(); buildChar(rig, cmds);
    let tilt = 0;
    if (!cam && !plain) {
      const sh = kind === 'shirt', a = sh ? F.S : F.K, b = F.H, u = sh ? [F.S[0] - F.H[0], F.S[1] - F.H[1]] : [F.K[0] - F.H[0], F.K[1] - F.H[1]], nn = Math.hypot(...u), vx = u[0] / nn, vy = u[1] / nn;
      const c2 = sh ? [F.S[0] - vx * nn * 0.3 + -vy * 6.2, F.S[1] - vy * nn * 0.3 + vx * 6.2] : [F.H[0] + vx * nn * 0.38 + vy * 2.2, F.H[1] + vy * nn * 0.38 - vx * 2.2], z = sh ? 8.4 : 12.2;
      tilt = tiltOf(kind, F); const R3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]], ax = v3.nrm([vx * (sh ? 1 : -1), vy * (sh ? 1 : -1), 0]), side = [0, 0, 1], fwd = v3.cross(side, ax);
      const Rb = [side, ax, fwd]; // x lokal = lebar (z), y = panjang HP, z = tebal
      cmds.push(meshCmd(eng.meshes.box(6.4, 12.8, 2.0, 0.9), Rb, [1, 1, 1], [c2[0], c2[1], z], [0.09, 0.11, 0.13], { mat: MAT.gloss }));
      cmds.push(meshCmd(eng.meshes.box(5.2, 11.0, 0.4, 0.2), Rb, [1, 1, 1], [c2[0], c2[1], z + 0.95], [0.45, 0.88, 0.66], { mat: MAT.glass, sh: false }));
      cmds.push(meshCmd(eng.meshes.torus, [side, [0, 0, 1], [1, 0, 0]], [0.8, 1, 0.8], [c2[0] + (sh ? 0 : 0), c2[1] - ax[1] * 4.6, z + 1.1], [0.2, 0.25, 0.3], { sh: false }));
      cmds.push(glowCmd(eng, [c2[0], c2[1], z + 6], 12, COL.gold, 0.28 + 0.2 * Math.sin(now / 260)));
    } else fn.F = F;
    fig.rig = rig; for (const x of fig.extras) x(cmds, now, F, rig);
    const views = [{ cam: SIDE_CAM, cmds }]; for (const v of fig.views) { v.cmds = cmds.filter((c) => !c.noPov); views.push(v); }
    lay.render(views); room.tick(now); return tilt;
  };
  fn.fig = fig; return fn;
}
const WEBGL3D = () => { try { return !!engine(); } catch (e) { return false; } };
/** pilih 3D bila WebGL ada; bila tidak, pakai gambar SVG lama */
function sideFigure(svg, kind) { if (WEBGL3D()) { const f = sideFigure3D(svg, kind); if (f) return f; } return sideFigure2D(svg, kind); }

/** Penjadwal: steps = [{p:'q', move, hold}], tiap langkah bergerak dari pose sebelumnya lalu menahan. */
function player(steps, onFrame) {
  const total = steps.reduce((s, x) => s + x.move + x.hold, 0); let raf = 0, t0 = 0, idx = 0, off = false;
  const at = (ms) => {
    let t = ms % total, i = 0; for (; i < steps.length - 1; i++) { const d = steps[i].move + steps[i].hold; if (t < d) break; t -= d; }
    const st = steps[i], prev = steps[(i + steps.length - 1) % steps.length], k = st.move ? Math.min(1, t / st.move) : 1;
    return { pose: blend(POSE[prev.p], POSE[st.p], k), i, local: t, k, arrived: t >= st.move, st, abs: ms };
  };
  const tick = (now) => { if (off) return; if (!t0) t0 = now; onFrame(at(now - t0), now); raf = requestAnimationFrame(tick); };
  const still = () => { onFrame(at(steps.slice(0, idx).reduce((s, x) => s + x.move + x.hold, 0) + steps[idx].move), performance.now()); };
  return {
    at, total,
    start() { if (reduce()) { still(); return; } raf = requestAnimationFrame(tick); },
    next() { idx = (idx + 1) % steps.length; still(); },
    stop() { off = true; cancelAnimationFrame(raf); },
    get still() { return reduce(); },
  };
}

/* ===== Urutan gerak ===== */
const HOW = [
  // Rukuk: angkat kedua tangan sejajar bahu (takbir intiqal) lalu turun ke rukuk. I'tidal: bangkit sambil mengangkat tangan lagi ("sami'allahu liman hamidah"), lalu tangan dilepas turun.
  { p: 'q', move: 0, hold: 3600, k: 'po.stand' }, { p: 'u', move: 700, hold: 150, k: 'po.stand' }, { p: 'r', move: 900, hold: 1100, k: 'po.ruku' }, { p: 'u', move: 850, hold: 150, k: 'po.stand' }, { p: 'i', move: 650, hold: 450, k: 'po.stand' }, { p: 'k', move: 900, hold: 0, k: 'po.sujud' },
  { p: 's', move: 1200, hold: 1200, k: 'po.sujud' }, { p: 'd', move: 750, hold: 1000, k: 'po.sit' }, { p: 's', move: 950, hold: 1300, k: 'po.sujud' }, { p: 'k', move: 650, hold: 0, k: 'po.sujud' }, { p: 'q', move: 850, hold: 1800, k: 'po.stand' },
];

/** Adegan "cara pakai" (satu untuk tiap posisi HP): orang + meter kemiringan + tampilan mini aplikasi yang berubah sinkron.
 *  Hitungannya meniru penghitung asli (counter.js) memakai sudut HP & ambang yang sama:
 *  Saku Baju → rukuk, sujud 1, sujud 2 = 3 gerakan = 1 rakaat; Saku Celana → paha turun ≥ 2,5 dtk lalu bangun = 1 rakaat (rukuk : sujud ≈ 1 : 2). */
function howScene(box, kind) {
  const svg = S('svg', { 'aria-hidden': 'true' }); box.querySelector('.sv').append(svg);
  const shirt = kind === 'shirt', th = TH[kind], CAL = 3000, total = HOW.reduce((x, y) => x + y.move + y.hold, 0);
  const draw = sideFigure(svg, kind), chip = box.querySelector('.stage-chip'), $m = (c) => box.querySelector(c), bar = $m('.tilt i'), val = $m('.tilt b'), det = $m('.tilt em');
  $m('.tilt .th').style.insetInlineStart = th.on / 90 * 100 + '%';
  let st, cur, last = '';
  const reset = () => { st = { n: 0, bent: false, since: 0, counted: false }; cur = 0; };
  reset();
  /** majukan "penghitung" sampai waktu `to` (ms dalam satu putaran); mundur = ulang dari awal. Langkah 40 ms agar ketukan tidak terlewat meski gambar diam. */
  const adv = (to) => {
    if (to < cur) reset();
    while (cur < to) {
      cur = Math.min(to, cur + 40); if (cur < CAL) continue; // 3 detik pertama = kalibrasi
      const a = tiltOf(kind, fk(p.at(cur).pose, 0));
      if (!st.bent && a > th.on) { st.bent = true; st.since = cur; st.counted = false; }
      else if (st.bent) { if (a < th.off) st.bent = false; else if (!st.counted && cur - st.since > th.hold) { st.counted = true; st.n++; } }
    }
  };
  const p = player(HOW, (f, now) => {
    const ms = f.abs % total; adv(ms);
    const a = draw(f.pose, now), n = st.n, r = shirt ? Math.ceil(n / 3) : n, sj = shirt ? n - r : n * 2, rk = shirt ? Math.floor(n / 3) : n;
    chip.textContent = t(f.st.k); bar.style.width = Math.min(100, a / 90 * 100) + '%'; bar.classList.toggle('hot', st.bent); val.textContent = Math.round(a) + '°'; det.textContent = st.bent ? '✓ ' + t('gd.det') : ''; det.classList.toggle('on', st.bent);
    const ph = ms < CAL ? ['rk.cal', { n: Math.ceil((CAL - ms) / 1000) }] : ms < CAL + 600 ? ['rk.ready'] : shirt ? [['ph.new', 'ph.ruku', 'ph.sujud1'][n % 3]] : [st.bent ? 'ph.down' : 'ph.stand'];
    const key = ph[0] + (ph[1]?.n ?? '') + '|' + r + sj + rk;
    if (key !== last) {
      last = key; $m('.ma-ph').textContent = t(ph[0], ph[1]); $m('.ma-r b').textContent = r; $m('.ma-s b').textContent = sj; $m('.ma-n b').textContent = rk;
      for (const c of ['.ma-r', '.ma-s']) { const e = $m(c); e.classList.remove('pop'); void e.offsetWidth; e.classList.add('pop'); }
    }
  });
  p.start(); if (p.still) box.onclick = () => p.next(); return p;
}

/* ===== Adegan "cara meletakkan HP": VIDEO animasi (Saku Baju / Saku Celana) =====
 *  Video di public/guide/ (tanpa audio, H.264). Diputar otomatis, senyap, berulang: setelah selesai, pose akhir (HP sudah di saku) ditahan sebentar
 *  lalu memudar ke gambar poster (= bingkai pertama) supaya sambungan putaran tidak melompat. Ketuk video = jeda / lanjut.
 *  Berhenti sendiri saat keluar layar (hemat baterai). "Kurangi gerakan" (reduce motion): tidak diputar otomatis, tampil poster + tombol putar,
 *  diputar sekali per ketukan. Ukuran dikunci ke rasio asli video dan dibatasi tinggi layar (lihat .stage.pvid di style.css). */
const PLACE_VID = {
  shirt: { src: '/guide/saku-baju.mp4', poster: '/guide/saku-baju.jpg', w: 368, h: 496, mh: 460 },
  pants: { src: '/guide/saku-celana.mp4', poster: '/guide/saku-celana.jpg', w: 368, h: 384, mh: 380 },
  flat: { src: '/guide/datar.mp4', poster: '/guide/datar.jpg', w: 368, h: 496, mh: 460, auto: true },   // opsional: bila file ada dipakai, bila tidak → animasi 3D
  cam: { src: '/guide/tegak.mp4', poster: '/guide/tegak.jpg', w: 368, h: 496, mh: 460, auto: true },
};
const VID_OK = {};   // hasil cek keberadaan video opsional: true / false / undefined (belum dicek)
const probeVid = (k) => fetch(PLACE_VID[k].src, { method: 'HEAD', cache: 'no-cache' }).then((r) => r.ok && /video|octet/i.test(r.headers.get('content-type') || '')).catch(() => false);
const VID_HOLD = 1100, VID_FADE = 380;
function placeScene(box, kind) {
  const k = PLACE_VID[kind] ? kind : 'pants', V = PLACE_VID[k], holder = box.querySelector('.sv'), rm = reduce();
  box.classList.add('pvid', 'pv-' + k);
  holder.style.setProperty('--ar', `${V.w} / ${V.h}`); holder.style.setProperty('--arn', (V.w / V.h).toFixed(4)); holder.style.setProperty('--mh', V.mh + 'px');
  holder.style.backgroundImage = `url(${V.poster})`;
  const v = document.createElement('video');
  Object.assign(v, { muted: true, defaultMuted: true, playsInline: true, preload: 'auto', loop: false, disablePictureInPicture: true, disableRemotePlayback: true, poster: V.poster });
  v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', ''); v.setAttribute('aria-hidden', 'true'); v.setAttribute('controlsList', 'nodownload noremoteplayback');
  v.className = 'pv-video';
  if (V.auto) v.addEventListener('loadedmetadata', () => { if (v.videoWidth && v.videoHeight) { holder.style.setProperty('--ar', `${v.videoWidth} / ${v.videoHeight}`); holder.style.setProperty('--arn', (v.videoWidth / v.videoHeight).toFixed(4)); } });
  const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'pv-btn'; btn.innerHTML = '<i></i>';
  holder.append(v, btn);
  let timer = 0, off = false, userPaused = rm, stalled = false, visible = true, io = null;
  const sync = () => { box.classList.toggle('paused', v.paused && !v.ended && (userPaused || stalled)); btn.setAttribute('aria-label', t(v.paused ? 'gd.vid.play' : 'gd.vid.pause')); };
  const play = () => { if (off) return; const r = v.play(); if (r?.catch) r.catch(() => { stalled = true; sync(); }); };   // autoplay ditolak → tampilkan tombol putar
  const onSeeked = () => { v.removeEventListener('seeked', onSeeked); if (off) return; v.classList.remove('fade'); if (!userPaused && visible) play(); };
  const clear = () => { clearTimeout(timer); timer = 0; v.removeEventListener('seeked', onSeeked); };
  v.addEventListener('play', () => { stalled = false; sync(); }); v.addEventListener('pause', sync);
  v.addEventListener('playing', () => box.classList.add('ready'));
  v.addEventListener('error', () => { box.classList.add('ready', 'broken'); btn.hidden = true; });   // video gagal dimuat → tetap tampil poster diam
  v.addEventListener('ended', () => {
    if (rm) { userPaused = true; sync(); box.classList.add('paused'); return; }
    timer = setTimeout(() => { v.classList.add('fade'); timer = setTimeout(() => { timer = 0; v.addEventListener('seeked', onSeeked); v.currentTime = 0; }, VID_FADE); }, VID_HOLD);
  });
  btn.onclick = () => {
    if (v.ended || (rm && v.currentTime === 0)) { clear(); v.classList.remove('fade'); v.currentTime = 0; userPaused = false; play(); return; }   // ulang dari awal
    if (v.paused) { userPaused = false; play(); } else { userPaused = true; v.pause(); }
  };
  if ('IntersectionObserver' in window) {   // jeda saat tidak terlihat; lanjut otomatis bila sebelumnya tidak dijeda pengguna
    io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (off || v.ended) return; if (!visible) v.pause(); else if (!userPaused && !timer) play(); }, { threshold: 0.25 });
    io.observe(box);
  }
  sync(); v.src = V.src; v.load();
  return {
    still: false,
    start() { if (!rm) play(); },
    stop() { off = true; clear(); io?.disconnect(); v.pause(); v.removeAttribute('src'); v.load(); },
  };
}

/* ===== Panduan KAMERA: HP diletakkan di lantai DI DEPAN orang shalat (di atas sejadah), layar hitam saat memantau ===== */
const FONT = 'Plus Jakarta Sans,Noto Sans Arabic,sans-serif';
const CAMPT = [253, 108.6]; // titik kamera depan HP (HP bersandar miring 25° dari tegak, layar menghadap orang)
const tt = (ms, a, b) => Math.min(1, Math.max(0, (ms - a) / (b - a)));
const label = (p, x, y, txt, size = 7, fill = C.shirtD, anchor = 'start') => { const e = S('text', { x, y, 'font-size': size, 'font-weight': 800, fill, 'text-anchor': anchor, 'font-family': FONT, stroke: '#fff', 'stroke-width': 2.4, 'paint-order': 'stroke', 'stroke-linejoin': 'round' }, p); e.textContent = txt; return e; };

/** Kotak "pandangan kamera" (tampak DEPAN). Yang dibaca AI hanya tinggi vertikal kepala, bahu, dan pinggul. Sendi diambil dari figur tampak samping. */
function frontPiP2D(svg, x, y, w, h) {
  const g = S('g', { transform: `translate(${x} ${y})` }, svg), cx = w / 2, Y = (v) => 6 + (v + 4) / 134 * (h - 12);
  S('rect', { width: w, height: h, rx: 7, fill: '#0D1F18', stroke: C.gold2, 'stroke-width': 1.1 }, g);
  const legs = S('path', { fill: 'none', stroke: '#2C4468', 'stroke-width': 3.2, 'stroke-linecap': 'round' }, g), torso = S('path', { fill: C.shirt, opacity: 0.92 }, g);
  const head = S('circle', { r: 4.8, fill: C.skin }, g), cap = S('path', { fill: '#23262C' }, g), sk = S('path', { fill: 'none', stroke: '#4ADE80', 'stroke-width': 0.9, 'stroke-linejoin': 'round' }, g);
  const dots = Array.from({ length: 5 }, () => S('circle', { r: 1.8, fill: '#4ADE80', stroke: '#fff', 'stroke-width': 0.5 }, g));
  const ai = S('text', { x: 6, y: 12, 'font-size': 7, 'font-weight': 800, fill: '#4ADE80', 'font-family': FONT }, g); ai.textContent = 'AI';
  const f1 = (n) => n.toFixed(1);
  return { g, draw(F, now) {
    const ys = Y(F.S[1]), yh = Y(F.H[1]), yc = Y(F.C[1]), ya = Y(F.A[1]), sw = 11, hw = 7, pulse = 1.8 + 0.5 * Math.sin(now / 260);
    torso.setAttribute('d', `M${f1(cx - sw)} ${f1(ys)}L${f1(cx + sw)} ${f1(ys)}L${f1(cx + hw)} ${f1(yh)}L${f1(cx - hw)} ${f1(yh)}Z`);
    legs.setAttribute('d', yh < ya - 2 ? `M${f1(cx - hw * 0.55)} ${f1(yh)}L${f1(cx - hw * 0.75)} ${f1(ya)}M${f1(cx + hw * 0.55)} ${f1(yh)}L${f1(cx + hw * 0.75)} ${f1(ya)}` : '');
    head.setAttribute('cx', cx); head.setAttribute('cy', f1(yc)); cap.setAttribute('d', `M${f1(cx - 4.8)} ${f1(yc - 0.6)}a4.8 4.4 0 0 1 9.6 0z`);
    const P = [[cx, yc + 0.8], [cx - sw, ys], [cx + sw, ys], [cx - hw, yh], [cx + hw, yh]];
    dots.forEach((d, i) => { d.setAttribute('cx', f1(P[i][0])); d.setAttribute('cy', f1(P[i][1])); d.setAttribute('r', pulse.toFixed(2)); });
    sk.setAttribute('d', `M${f1(P[1][0])} ${f1(P[1][1])}L${f1(P[2][0])} ${f1(P[2][1])}L${f1(P[4][0])} ${f1(P[4][1])}L${f1(P[3][0])} ${f1(P[3][1])}ZM${f1(P[0][0])} ${f1(P[0][1])}L${f1(cx)} ${f1(ys)}`);
  } };
}

/** versi 3D: tampilan kamera depan = render 3D sungguhan dari posisi HP (perspektif), titik-titik rangka AI diproyeksikan dari sendi 3D */
function frontPiP(svg, x, y, w, h) {
  const fig = svg.__fig; if (!fig) return frontPiP2D(svg, x, y, w, h);
  const bg = S('rect', { x, y, width: w, height: h, rx: 7, fill: '#102A20' }, svg.__back), g = S('g', {}, svg);
  S('rect', { x, y, width: w, height: h, rx: 7, fill: 'none', stroke: C.gold2, 'stroke-width': 1.1 }, g);
  const sk = S('path', { fill: 'none', stroke: '#4ADE80', 'stroke-width': 0.9, 'stroke-linejoin': 'round' }, g), dots = Array.from({ length: 5 }, () => S('circle', { r: 1.8, fill: '#4ADE80', stroke: '#fff', 'stroke-width': 0.5 }, g));
  const ai = S('text', { x: x + 6, y: y + 12, 'font-size': 7, 'font-weight': 800, fill: '#4ADE80', 'font-family': 'Plus Jakarta Sans,sans-serif' }, g); ai.textContent = 'AI';
  const view = { rect: [x, y, w, h], clip: 7, alpha: 1, cam: { persp: true, eye: [CAMPT[0] + 8, 106, 0], at: [96, 62, 0], fov: 50 }, light: { L: [0.6, -0.8, 0.4] }, shadow: false, cmds: [] };
  fig.views.push(view);
  const set = g.setAttribute.bind(g); g.setAttribute = (k, v) => { set(k, v); if (k === 'opacity') { view.alpha = +v; bg.setAttribute('opacity', v); } };
  const f1 = (n) => n.toFixed(1);
  return { g, draw(F, now) {
    const R = fig.rig, M = view.M; if (!R || !M) return; const pr = (p) => project(M, view.vbUsed, p), pulse = 1.8 + 0.5 * Math.sin(now / 260);
    const P = [R.head.C, v3.add(R.S, [0, 0, 12.4]), v3.add(R.S, [0, 0, -12.4]), v3.add(R.H, [0, 0, 6.0]), v3.add(R.H, [0, 0, -6.0])].map(pr);
    dots.forEach((d, i) => { d.setAttribute('cx', f1(P[i][0])); d.setAttribute('cy', f1(P[i][1])); d.setAttribute('r', pulse.toFixed(2)); });
    sk.setAttribute('d', `M${f1(P[1][0])} ${f1(P[1][1])}L${f1(P[2][0])} ${f1(P[2][1])}L${f1(P[4][0])} ${f1(P[4][1])}L${f1(P[3][0])} ${f1(P[3][1])}Z`);
  } };
}

/** HP bersandar di penyangga + kerucut pandangan kamera + garis jarak. Mengembalikan fungsi set({ fall, cone, dim, now, out }). */
function camRig(svg) {
  const under = backG(svg), fig = svg.__fig, st3 = { fall: 1, out: 1 };
  const id = 'gc' + Math.random().toString(36).slice(2, 7), defs = S('defs', {}, svg), poly = 'M253 108.6L169.5 -36H40V126.5H151.6Z';
  S('path', { d: poly }, S('clipPath', { id }, defs));
  const lg = S('linearGradient', { id: id + 'g', x1: 1, y1: 0, x2: 0, y2: 0 }, defs); S('stop', { offset: 0, 'stop-color': '#FFFFFF', 'stop-opacity': 0.5 }, lg); S('stop', { offset: 1, 'stop-color': '#FFFFFF', 'stop-opacity': 0.04 }, lg);
  const cone = S('path', { d: poly, fill: `url(#${id}g)` }, under), arcs = S('g', { 'clip-path': `url(#${id})`, fill: 'none', stroke: '#FFFFFF', 'stroke-width': 1.2 }, under);
  const A = [0, 1, 2].map(() => S('circle', { cx: CAMPT[0], cy: CAMPT[1] }, arcs));
  const stand = S('path', { d: 'M249 126.5H270L257.5 108Z', fill: '#C9A86A', stroke: '#9A7A3E', 'stroke-width': 0.8, 'stroke-linejoin': 'round' }, svg);
  const ph = S('g', {}, svg); S('rect', { x: -1.8, y: -21, width: 3.6, height: 21, rx: 1.3, fill: C.dark, stroke: C.gold, 'stroke-width': 0.9 }, ph); S('rect', { x: -1.8, y: -19.3, width: 1.2, height: 17.4, rx: 0.5, fill: '#9AD9B8' }, ph); S('circle', { cx: -1.2, cy: -19.2, r: 0.95, fill: '#3C5566' }, ph);
  const dim = S('g', {}, svg); S('path', { d: 'M110 139H244M110 135v8M244 135v8', stroke: C.shirtD, 'stroke-width': 1.3, 'stroke-dasharray': '3 2.5', fill: 'none', 'stroke-linecap': 'round' }, dim);
  S('rect', { x: 150, y: 132.2, width: 54, height: 13.6, rx: 6.8, fill: '#fff', stroke: C.shirtD, 'stroke-width': 0.9 }, dim); const dl = S('text', { x: 177, y: 142, 'font-size': 7.6, 'font-weight': 800, fill: C.shirtD, 'text-anchor': 'middle', 'font-family': FONT }, dim); dl.textContent = t('gd.cm.dist');
  if (fig) { // 3D: penyangga & HP sungguhan di scene
    stand.setAttribute('display', 'none'); ph.setAttribute('display', 'none'); const eng = fig.lay.eng, prism = prismMesh([[249, 126.5], [270, 126.5], [257.5, 108]], 12);
    fig.add((cmds) => {
      const { fall, out } = st3, a = lerp(75, 25, fall) * RAD, c = Math.cos(a), sn = Math.sin(a), cy = 126.5 - (1 - fall) * 70, op = Math.min(1, fall * 4) * out, so = tt(fall, 0.95, 1) * out;
      const Rb = [[c, sn, 0], [-sn, c, 0], [0, 0, 1]], at = (lx, ly) => [246 + c * lx - sn * ly, cy + sn * lx + c * ly, 0], fx = (cc) => { cc.noPov = true; return cc; };
      if (so > 0.01) cmds.push(fx(meshCmd(prism, IDENT, [1, 1, 1], [0, 0, 0], [0.80, 0.66, 0.42], { mat: MAT.matte, a: so, sh: so > 0.99 })));
      if (op > 0.01) { const o = op < 0.999;
        cmds.push(fx(meshCmd(eng.meshes.box(3.6, 21, 11.5, 1.5), Rb, [1, 1, 1], at(0, -10.5), [0.09, 0.11, 0.13], { mat: MAT.gloss, a: op, sh: !o })));
        cmds.push(fx(meshCmd(eng.meshes.box(0.5, 18.6, 9.6, 0.2), Rb, [1, 1, 1], at(-1.75, -10.2), [0.40, 0.86, 0.62], { mat: MAT.glass, a: op, sh: false })));
        cmds.push(fx(meshCmd(eng.meshes.torus, [[-c, -sn, 0], [0, 0, 1], [-sn, c, 0]], [0.9, 1, 0.9], at(-2.0, -19.2), [0.2, 0.25, 0.3], { a: op, sh: false }))); }
    });
  }
  return ({ fall = 1, cone: co = 0, dim: di = 0, now = 0, out = 1 }) => {
    st3.fall = fall; st3.out = out;
    ph.setAttribute('transform', `translate(246 ${(126.5 - (1 - fall) * 70).toFixed(1)}) rotate(${lerp(75, 25, fall).toFixed(1)})`); ph.setAttribute('opacity', Math.min(1, fall * 4) * out);
    stand.setAttribute('opacity', tt(fall, 0.95, 1) * out); cone.setAttribute('opacity', co * out); dim.setAttribute('opacity', di * out);
    A.forEach((c, i) => { const k = (now / 1500 + i / 3) % 1; c.setAttribute('r', (6 + k * 175).toFixed(1)); c.setAttribute('opacity', (co * (1 - k) * 0.9 * out).toFixed(2)); });
  };
}

/** Adegan 1: cara meletakkan HP di depan sejadah. */
function camPlaceScene(box) {
  const svg = S('svg', { 'aria-hidden': 'true' }); box.querySelector('.sv').append(svg);
  const draw = sideFigure(svg, 'cam'), rig = camRig(svg), pip = frontPiP(svg, 192, -32, 84, 70);
  const okb = S('g', { transform: 'translate(126 8)' }, svg); S('circle', { r: 6.8, fill: C.shirt }, okb); S('path', { d: 'M-3.2 0.2l2.3 2.4 4.4-5', stroke: '#fff', 'stroke-width': 1.7, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, okb); label(okb, 10, 2.6, t('gd.cm.see'), 6.8);
  const T = 8400; let raf = 0, t0 = 0, off = false;
  const frame = (ms, now) => {
    draw(POSE.q, now); const out = ms > 7700 ? Math.max(0, 1 - (ms - 7700) / 650) : 1;
    rig({ fall: ease(tt(ms, 300, 1500)), cone: ease(tt(ms, 2200, 3200)), dim: ease(tt(ms, 3300, 4100)), now, out });
    pip.g.setAttribute('opacity', ease(tt(ms, 4200, 4900)) * out); pip.draw(draw.F, now); okb.setAttribute('opacity', ease(tt(ms, 5000, 5500)) * out);
  };
  const p = { still: false, start() { if (reduce()) { frame(6500, 0); return; } const tick = (now) => { if (off) return; t0 ||= now; frame((now - t0) % T, now); raf = requestAnimationFrame(tick); }; raf = requestAnimationFrame(tick); }, stop() { off = true; cancelAnimationFrame(raf); } };
  p.start(); return p;
}

/** MODE DATAR: HP rebah di sejadah SEJAJAR DADA (tepat di bawah dada saat sujud, bukan di bawah dahi), kamera menghadap atas. Sujud = kamera tertutup dada (pandangan kamera menggelap).
 *  Memakai urutan gerak SIM yang sama dengan simulasi Mode Tegak; hitungan: 2 sujud = 1 rakaat. */
function flatScene(box) {
  const svg = S('svg', { 'aria-hidden': 'true' }); box.querySelector('.sv').append(svg);
  const draw = sideFigure(svg, 'cam'), under = backG(svg);
  const id = 'gf' + Math.random().toString(36).slice(2, 7), defs = S('defs', {}, svg), lg = S('linearGradient', { id: id + 'g', x1: 0, y1: 1, x2: 0, y2: 0 }, defs);
  S('stop', { offset: 0, 'stop-color': '#FFFFFF', 'stop-opacity': 0.5 }, lg); S('stop', { offset: 1, 'stop-color': '#FFFFFF', 'stop-opacity': 0.04 }, lg);
  const cone = S('path', { d: 'M126 124L14 -36H238Z', fill: `url(#${id}g)` }, under);
  const mk = S('g', {}, svg); // penanda posisi dada (sejajar HP)
  S('path', { d: 'M126 131V140', stroke: C.shirtD, 'stroke-width': 1.2, 'stroke-dasharray': '3 2.5', fill: 'none', 'stroke-linecap': 'round' }, mk);
  label(mk, 126, 148, t('gd.fl.chest'), 6.5, C.shirtD, 'middle');
  const ph = S('g', {}, svg); S('rect', { x: -14, y: -2.7, width: 28, height: 2.7, rx: 1.2, fill: C.dark, stroke: C.gold, 'stroke-width': 0.8 }, ph); S('rect', { x: -11, y: -2.2, width: 22, height: 0.7, rx: 0.3, fill: '#9AD9B8' }, ph); S('circle', { cx: -11.8, cy: -1.35, r: 0.9, fill: C.gold }, ph);
  const pip = S('g', {}, svg), X = 192, Y = -32, W = 84, H = 70, cid = id + 'c';
  S('rect', { x: X, y: Y, width: W, height: H, rx: 9 }, S('clipPath', { id: cid }, defs));
  const inner = S('g', { 'clip-path': `url(#${cid})` }, pip); S('rect', { x: X, y: Y, width: W, height: H, fill: '#F6F1D8' }, inner); S('circle', { cx: X + W / 2, cy: Y + 14, r: 9, fill: '#fff' }, inner); S('circle', { cx: X + W / 2, cy: Y + 14, r: 15, fill: C.gold, opacity: 0.35 }, inner);
  const head = S('ellipse', { cx: X + W / 2, cy: Y + H, rx: 40, ry: 30, fill: C.shirt }, inner), shade = S('rect', { x: X, y: Y, width: W, height: H, fill: '#101820' }, inner);
  const fig = svg.__fig, st3 = { fall: 1 };
  if (fig) { // 3D: HP rebah sungguhan + pandangan kamera dari lantai menghadap atas
    ph.setAttribute('display', 'none'); [...inner.children].forEach((c) => { if (c !== shade) c.setAttribute('display', 'none'); }); S('rect', { x: X, y: Y, width: W, height: H, rx: 9, fill: '#EFE6C8' }, svg.__back);
    fig.views.push({ rect: [X, Y, W, H], clip: 9, alpha: 1, cam: { persp: true, eye: [126, 123.2, 0], at: [98, 44, 0], fov: 78 }, light: { L: [0.3, -0.9, 0.4] }, shadow: false, cmds: [] });
    const eng = fig.lay.eng; fig.add((cmds) => { const fl = st3.fall, a = -28 * (1 - fl) * RAD, c = Math.cos(a), sn = Math.sin(a), Rb = [[c, sn, 0], [-sn, c, 0], [0, 0, 1]], y = 126.5 - (1 - fl) * 62 - 1.5, at = (lx, ly) => [126 + c * lx - sn * ly, y + sn * lx + c * ly, 0], op = Math.min(1, fl * 4);
      if (op < 0.01) return; const m1 = meshCmd(eng.meshes.box(28, 3, 15, 1.3), Rb, [1, 1, 1], at(0, 0), [0.09, 0.11, 0.13], { mat: MAT.gloss, a: op, sh: op > 0.99 }), m2 = meshCmd(eng.meshes.box(23, 0.5, 12, 0.22), Rb, [1, 1, 1], at(0, -1.45), [0.40, 0.86, 0.62], { mat: MAT.glass, a: op, sh: false }); m1.noPov = m2.noPov = true; cmds.push(m1, m2); });
  }
  S('rect', { x: X, y: Y, width: W, height: H, rx: 9, fill: 'none', stroke: C.shirtD, 'stroke-width': 1.6 }, pip);
  label(pip, X + 5, Y + 9, t('gd.fl.view'), 6, C.shirtD);
  const badge = label(pip, X + W / 2, Y + H + 11, '', 7.2, C.shirtD, 'middle'), cnt = label(pip, X + W / 2, Y + H + 21, '', 6.6, C.pantsD, 'middle');
  let lastTxt = '';
  const pl = player(SIM, (st, now) => {
    draw(st.pose, now);
    const cur = st.st.p, prev = SIM[(st.i + SIM.length - 1) % SIM.length].p;
    const dark = cur === 's' ? Math.min(1, st.k * 1.5) : prev === 's' ? Math.max(0, 1 - st.k * 1.6) : 0;
    const fall = pl.still || st.i > 0 ? 1 : ease(tt(st.local, 0, 900)); st3.fall = fall;
    ph.setAttribute('transform', `translate(126 ${(126.5 - (1 - fall) * 62).toFixed(1)}) rotate(${(-28 * (1 - fall)).toFixed(1)})`); ph.setAttribute('opacity', Math.min(1, fall * 4).toFixed(2));
    cone.setAttribute('opacity', (1 - 0.8 * dark).toFixed(2)); mk.setAttribute('opacity', ease(tt(st.local + (st.i ? 9e3 : 0), 700, 1300)).toFixed(2));
    shade.setAttribute('opacity', (dark * 0.93).toFixed(2)); head.setAttribute('transform', `translate(0 ${((1 - dark) * 38).toFixed(1)})`);
    const done = SIM.slice(0, st.i).filter((x) => x.p === 's').length, sj = done + (cur === 's' && st.k > 0.6 ? 1 : 0), txt = `${dark > 0.5 ? 'on' : 'off'}|${sj}`;
    if (txt !== lastTxt) { lastTxt = txt; badge.textContent = t(dark > 0.5 ? 'gd.fl.on' : 'gd.fl.off'); badge.setAttribute('fill', dark > 0.5 ? C.shirtD : C.gold2); cnt.textContent = t('gd.fl.cnt', { n: sj, m: Math.floor(done / 2) }); }
  });
  pl.start(); return pl;
}

/** Simulasi: orang bergerak (rakaat 1 → rakaat 2 selesai duduk → "lupa" berdiri lagi). Dihitung oleh mesin penghitung yang ASLI (rakaat.js). */
const SIM = [
  { p: 'q', move: 0, hold: 1500 },
  { p: 'u', move: 650, hold: 120 }, { p: 'r', move: 900, hold: 800 }, { p: 'u', move: 800, hold: 120 }, { p: 'i', move: 650, hold: 300 }, { p: 'k', move: 900, hold: 0 }, { p: 's', move: 1200, hold: 800 }, { p: 'd', move: 750, hold: 700 }, { p: 's', move: 950, hold: 800 }, { p: 'k', move: 650, hold: 0 }, { p: 'q', move: 850, hold: 600 },
  { p: 'u', move: 650, hold: 120 }, { p: 'r', move: 900, hold: 800 }, { p: 'u', move: 800, hold: 120 }, { p: 'i', move: 650, hold: 300 }, { p: 'k', move: 900, hold: 0 }, { p: 's', move: 1200, hold: 800 }, { p: 'd', move: 750, hold: 700 }, { p: 's', move: 950, hold: 800 }, { p: 'k', move: 650, hold: 0 }, { p: 'd', move: 750, hold: 2600 },
  { p: 'q', move: 900, hold: 1800 },
];
const SIM_TARGET = 2, SIM_STEP = 90, F0 = fk(POSE.q, 0);
const simFeat = (F) => ({ d: (F.S[1] - F0.S[1]) / (F0.H[1] - F0.C[1]), tr: Math.abs(F.S[1] - F.H[1]) / (F0.H[1] - F0.S[1]) }); // sama dengan pose.js, dari tinggi vertikal sendi
function simulator(p, onEv) {
  let tr, cur, last = 0; const reset = () => { cur = 0; tr = createTracker({ target: SIM_TARGET, onEvent: (e) => onEv(e) }); onEv({ type: 'reset' }); }; reset();
  return { get tr() { return tr; }, feedTo(local) { if (local < last) reset(); last = local; while (cur + SIM_STEP <= local) { cur += SIM_STEP; tr.feed(cur, simFeat(fk(p.at(cur).pose, 0))); } } };
}

/** Adegan 2: cara kamera menghitung. Kiri: orang + kotak pandangan kamera. Kanan: HP berlayar hitam yang bergetar, plus hitungan. */
function camHowScene(box) {
  const svg = S('svg', { 'aria-hidden': 'true' }); box.querySelector('.sv').append(svg);
  const draw = sideFigure(svg, 'cam'), rig = camRig(svg), pip = frontPiP(svg, 192, -32, 84, 70), chip = box.querySelector('.stage-chip');
  const $b = (c) => box.querySelector(c), ph = $b('.cw-phone'), ev = $b('.cw-ev'), sEl = $b('.cw-s'), nEl = $b('.cw-n'); let sim;
  rig({ fall: 1, cone: 0.5, dim: 0, now: 0 });
  const buzz = (cls, n, key, v) => { ph.className = 'cw-phone'; void ph.offsetWidth; ph.style.setProperty('--n', n); ph.classList.add('buzz', ...cls.split(' ')); ev.className = 'cw-ev ' + cls.replace(' long', ''); ev.textContent = t(key, v); };
  const onEv = (e) => {
    if (e.type === 'reset') { ev.textContent = ''; ev.className = 'cw-ev'; ph.className = 'cw-phone'; }
    else if (e.type === 'rakaat') e.final ? buzz('fin long', 1, 'w.ev.final', { n: e.n }) : buzz('ok', e.n, 'w.ev.rakaat', { n: e.n });
    else if (e.type === 'extra') buzz('bad', 3, 'w.ev.extra', {});
  };
  const p = player(SIM, (f, now) => {
    draw(f.pose, now); rig({ fall: 1, cone: 0.35 + 0.1 * Math.sin(now / 500), dim: 0, now }); pip.draw(draw.F, now);
    sim.feedTo(f.abs % p.total); chip.textContent = t('po.' + sim.tr.state); sEl.textContent = sim.tr.sujud; nEl.textContent = sim.tr.rakaat;
  });
  sim = simulator(p, onEv);
  p.start(); if (p.still) box.onclick = () => p.next(); return p;
}

/** Adegan 3: layar hitam + pola getar. Hitung mundur → hitam → rakaat selesai (getar pendek) → target tercapai (getar panjang) → rakaat berlebih (getar kuat + suara). */
function camAlertScene(box) {
  const svg = S('svg', { viewBox: '0 0 300 178', 'aria-hidden': 'true' }); box.querySelector('.sv').append(svg);
  const PH = [105, 14, 90, 142], cap = box.querySelector('.ca-cap'), capB = cap.querySelector('b'), capS = cap.querySelector('small');
  const ring = (c) => S('rect', { x: PH[0] - 8, y: PH[1] - 8, width: PH[2] + 16, height: PH[3] + 16, rx: 24, fill: 'none', stroke: c, 'stroke-width': 3.5, opacity: 0 }, svg);
  const EV = [{ at: 4600 + 400, c: '#1DB86E', d: 950, n: 1 }, { at: 6800 + 300, c: '#F2B63E', d: 1500, long: 1 }, { at: 9300 + 300, c: '#E5484D', d: 900 }, { at: 9300 + 1000, c: '#E5484D', d: 900 }, { at: 9300 + 1700, c: '#E5484D', d: 900 }];
  const rings = EV.map((e) => ring(e.c));
  const lay = WEBGL3D() ? makeLayer(svg, [0, 0, 300, 178]) : null, phg = S('g', {}, svg), body = S('rect', { x: PH[0], y: PH[1], width: PH[2], height: PH[3], rx: 18, fill: '#000', stroke: '#1B2A35', 'stroke-width': 5 }, phg);
  const phoneBody = lay && [meshCmd(lay.eng.meshes.box(PH[2] + 12, PH[3] + 12, 16, 14), IDENT, [1, 1, 1], [PH[0] + PH[2] / 2, PH[1] + PH[3] / 2, -8.5], [0.12, 0.17, 0.21], { mat: MAT.gloss, sh: false }), meshCmd(lay.eng.meshes.box(PH[2] + 4, PH[3] + 4, 16.6, 11), IDENT, [1, 1, 1], [PH[0] + PH[2] / 2, PH[1] + PH[3] / 2, -8.2], [0.05, 0.07, 0.09], { mat: MAT.gloss, sh: false })];
  if (lay) { body.setAttribute('fill', 'none'); body.setAttribute('stroke', 'none'); lay.back.style.background = 'radial-gradient(ellipse at 16% 8%,rgba(255,255,255,.95),rgba(255,255,255,0) 52%),radial-gradient(ellipse at 50% 50%,rgba(107,68,35,0) 58%,rgba(107,68,35,.2)),linear-gradient(180deg,#EFDDBD,#DDBF92)'; }
  const scr = S('rect', { x: PH[0] + 5, y: PH[1] + 5, width: PH[2] - 10, height: PH[3] - 10, rx: 13, fill: '#0F3A28' }, phg), cam = S('circle', { cx: PH[0] + PH[2] / 2, cy: PH[1] + 14, r: 3, fill: '#1DB86E' }, phg);
  const num = S('text', { x: PH[0] + PH[2] / 2, y: PH[1] + 86, 'font-size': 44, 'font-weight': 800, fill: '#7FE0AE', 'text-anchor': 'middle', 'font-family': FONT }, phg);
  const wv = [0, 1, 2].map((i) => S('path', { d: `M${PH[0] + PH[2] + 16 + i * 11} ${PH[1] + 56}q${5 + i * 3} 15 0 30`, stroke: '#E5484D', 'stroke-width': 3, fill: 'none', 'stroke-linecap': 'round', opacity: 0 }, svg));
  const dots = Array.from({ length: 5 }, (_, i) => S('circle', { cx: 130 + i * 10, cy: 168, r: 3 }, svg));
  const B = [0, 2300, 4600, 6800, 9300, 12500], T = B[5], CAP = ['gd.ca.1', 'gd.ca.2', 'gd.ca.3', 'gd.ca.4', 'gd.ca.5'], SUB = ['gd.cb.1', 'gd.cb.2', 'gd.cb.3', 'gd.cb.4', 'gd.cb.5'];
  let raf = 0, t0 = 0, off = false, lastI = -1;
  const frame = (ms, now) => {
    let i = 0; while (i < 4 && ms >= B[i + 1]) i++;
    if (i !== lastI) { lastI = i; capB.textContent = t(CAP[i]); capS.textContent = t(SUB[i]); dots.forEach((d, k) => { d.setAttribute('fill', k === i ? C.shirt : '#C9E3D3'); }); }
    const lit = i === 0 ? 1 : i === 1 ? 1 - ease(tt(ms, B[1], B[1] + 1500)) : 0;
    scr.setAttribute('fill', lit > 0.02 ? `rgb(${Math.round(15 * lit)},${Math.round(58 * lit)},${Math.round(40 * lit)})` : '#000'); num.setAttribute('opacity', lit.toFixed(2));
    num.textContent = i === 0 ? Math.max(1, 10 - Math.floor(ms / B[1] * 10)) : i === 1 ? '1' : ''; cam.setAttribute('opacity', (0.35 + 0.65 * Math.abs(Math.sin(now / 700))).toFixed(2));
    let shake = 0; EV.forEach((e, k) => { const u = (ms - e.at) / e.d; const on = u >= 0 && u < 1; rings[k].setAttribute('opacity', on ? ((1 - u) * 0.9).toFixed(2) : 0);
      if (on) { const sc = 1 + 0.07 * u; rings[k].setAttribute('transform', `translate(${PH[0] + PH[2] / 2} ${PH[1] + PH[3] / 2}) scale(${sc.toFixed(3)}) translate(${-(PH[0] + PH[2] / 2)} ${-(PH[1] + PH[3] / 2)})`);
        if (u * e.d < (e.long ? 520 : 170)) shake = Math.sin(ms / 14) * (e.long ? 2.2 : 3); } });
    phg.setAttribute('transform', `translate(${shake.toFixed(2)} 0)`);
    if (lay) { const m = phoneBody.map((c) => ({ ...c, M: c.M.slice() })); m.forEach((c) => { c.M[12] += shake; }); lay.render([{ cam: { yaw: 0, s: 1, tx: 0, ty: 0, k: 0.3 }, cmds: m, shadow: false }]); }
    const sp = ms >= B[4] ? (ms - B[4]) / (B[5] - B[4]) : -1; wv.forEach((w, k) => w.setAttribute('opacity', sp < 0 ? 0 : (0.25 + 0.6 * Math.abs(Math.sin(ms / 160 - k * 0.7))) * Math.min(1, sp * 6) * (sp > 0.9 ? (1 - sp) * 10 : 1)));
  };
  const p = { still: false, start() { if (reduce()) { frame(B[3] + 600, 0); return; } const tick = (now) => { if (off) return; t0 ||= now; frame((now - t0) % T, now); raf = requestAnimationFrame(tick); }; raf = requestAnimationFrame(tick); }, stop() { off = true; cancelAnimationFrame(raf); } };
  p.start(); return p;
}

/* ===== Halaman panduan ===== */
let root = null, tab = 'shirt', players = [], open = false;
const steps = (pre, n, ov = {}) => `<ol class="gd-steps">${Array.from({ length: n }, (_, i) => `<li><i>${i + 1}</i><span>${t(ov[i + 1] || `${pre}.${i + 1}`)}</span></li>`).join('')}</ol>`;
const stage = (cls, extra = '') => `<div class="stage ${cls}"><span class="stage-chip"></span><div class="sv"></div>${extra}</div>`;
const tiltBox = '<div class="tilt"><span class="tl"></span><div class="tm"><i></i><u class="th"></u></div><b>0°</b><em></em></div>';
const miniApp = () => `<div class="mini-app"><p class="ma-ph"></p><div class="ma-r"><small>${t('rk.ruku')}</small><b>0</b></div><div class="ma-s"><small>${t('rk.sujud')}</small><b>0</b></div><div class="ma-n"><small>${t('rk.rakaat')}</small><b>0</b></div></div>`;

const camPanel = () => `<div class="cw-panel"><div class="cw-phone"><i></i><u></u></div><p class="cw-ev"></p><div class="cw-cnt"><span>${t('rk.sujud')}</span><b class="cw-s">0</b><span>${t('rk.rakaat')}</span><b class="cw-n">0</b><em>/ ${SIM_TARGET}</em></div></div>`;
const legend = () => `<ul class="gd-legend">${[['●●', '', 'gd.cm.l1'], ['━━', 'fin', 'gd.cm.l2'], ['▮▮▮', 'bad', 'gd.cm.l3'], ['▮ ▮', '', 'gd.cm.l4'], ['···', '', 'gd.cm.l5']].map(([g, c, k]) => `<li class="${c}"><i>${g}</i><span>${t(k)}</span></li>`).join('')}</ul>`;

function render() {
  players.forEach((p) => p.stop()); players = [];
  const tabs = [['pants', 'rk.pants', 'pants'], ['shirt', 'rk.shirt', 'shirt'], ['flat', 'cam.m.datar', 'eye'], ['cam', 'cam.m.tegak', 'scan']]; // urutan prioritas: sensor saku dulu, lalu kamera
  let body;
  const alert = `<h3 class="gd-h"><i>${tab === 'flat' ? 2 : 3}</i>${t('gd.cm.alert')}</h3>${stage('calert', '<div class="ca-cap"><b></b><small></small></div>')}${legend()}<div class="gd-tip">${t('gd.cm.safe')}</div>`;
  if (tab === 'flat') body = `<h3 class="gd-h"><i>1</i>${t('gd.fl.place')}</h3>${stage('fplace')}${steps('gd.fl', 5)}<div class="gd-tip">${t('gd.fl.tip')}</div>${alert}`;
  else if (tab === 'cam') body = `<h3 class="gd-h"><i>1</i>${t('gd.cm.place')}</h3>${stage('cplace')}${steps('gd.cm', 6)}<div class="gd-tip">${t('gd.cm.tip')}</div>
    <h3 class="gd-h"><i>2</i>${t('gd.cm.how')}</h3>${stage('chow', camPanel())}<div class="gd-tip alt">${t('gd.cm.how.tip')}</div>
    <h3 class="gd-h"><i>3</i>${t('gd.cm.alert')}</h3>${stage('calert', '<div class="ca-cap"><b></b><small></small></div>')}${legend()}<div class="gd-tip">${t('gd.cm.safe')}</div>`;
  else {
    const pre = tab === 'shirt' ? 'gd.sh' : 'gd.pa';
    body = `<h3 class="gd-h"><i>1</i>${t('gd.place')}</h3>${stage('place')}${steps(pre, 4)}<h3 class="gd-h"><i>2</i>${t('gd.howt')}</h3>${stage('how', miniApp() + tiltBox)}<div class="gd-tip">${t(pre + '.tip')}</div>${steps('gd.h', 6, { 2: tab === 'shirt' ? 'gd.h.2s' : 'gd.h.2p' })}<div class="gd-tip alt">${t('gd.h.tip')}</div><div class="gd-tip alt">${t('gd.h.sn')}</div>`;
  }
  root.innerHTML = `<div class="gd-head"><button class="icon flip" data-gx aria-label="${t('gd.close')}">${ic('back')}</button><h2 class="ttl">${t('gd.title')}</h2></div>
    <div class="gd-tabs" role="tablist">${tabs.map(([k, l, i]) => `<button role="tab" aria-selected="${k === tab}" data-tab="${k}" class="${k === tab ? 'on' : ''}">${ic(i, 22)}<span>${t(l)}</span></button>`).join('')}</div>
    <div class="gd-wrap">${body}</div>`;
  const q = (c) => root.querySelector(c);
  if (tab === 'flat' || tab === 'cam') { const k = tab; if (VID_OK[k] === undefined) { VID_OK[k] = false; probeVid(k).then((ok) => { VID_OK[k] = ok; if (ok && open && tab === k) render(); }); } }
  if (tab === 'flat') players.push(VID_OK.flat ? placeScene(q('.stage.fplace'), 'flat') : flatScene(q('.stage.fplace')), camAlertScene(q('.stage.calert')));
  else if (tab === 'cam') players.push(VID_OK.cam ? placeScene(q('.stage.cplace'), 'cam') : camPlaceScene(q('.stage.cplace')), camHowScene(q('.stage.chow')), camAlertScene(q('.stage.calert')));
  else {
    players.push(placeScene(q('.stage.place'), tab)); const hw = q('.stage.how'); hw.querySelector('.tilt .tl').textContent = t('gd.tilt'); players.push(howScene(hw, tab));
  }
  if (players.some((p) => p.still)) root.querySelectorAll('.stage.how,.stage.chow').forEach((s) => s.insertAdjacentHTML('afterend', `<small class="mute gd-tap">${t('gd.tap')}</small>`));
  root.scrollTo(0, 0);
}
function build() {
  root = document.createElement('div'); root.id = 'guide'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); document.body.append(root);
  root.addEventListener('click', (e) => { if (e.target.closest('[data-gx]')) closeGuide(); const b = e.target.closest('[data-tab]'); if (b) { tab = b.dataset.tab; render(); } });
  document.addEventListener('keydown', (e) => { if (open && e.key === 'Escape') closeGuide(); });
  hooks.push(() => { if (open) render(); });
  document.addEventListener('visibilitychange', () => { if (open) { players.forEach((p) => p.stop()); players = []; if (!document.hidden) render(); } });
}
export function openGuide(k = 'shirt') { if (!root) build(); tab = ['pants', 'shirt', 'flat', 'cam'].includes(k) ? k : 'pants'; open = true; root.classList.add('on'); document.body.classList.add('gd-open'); render(); store.set('rs.gd', 1); const ng = document.getElementById('navGuide'); if (ng && ng.parentElement.scrollWidth > ng.parentElement.clientWidth) ng.scrollIntoView({ inline: 'center', block: 'nearest' }); }
export function closeGuide() { open = false; players.forEach((p) => p.stop()); players = []; root?.classList.remove('on'); document.body.classList.remove('gd-open'); document.querySelector('#guideBtn')?.classList.remove('new'); }

/** dipakai halaman Belajar Shalat (belajar.js): gambar orang tampak samping + pose + pencampur gerak */
export { sideFigure, blend, POSE, placeScene };
