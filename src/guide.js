/** guide.js — panduan animasi: cara menaruh HP di Saku Baju / Saku Celana, gerakan saat shalat, dan cara memakai aplikasi.
 *  Orang digambar sebagai kerangka sendi tampak samping (panjang tulang tetap), lengan dihitung dengan IK 2-ruas.
 *  Animasi memakai requestAnimationFrame; bila pengguna memilih "reduce motion", gambar diam dan diganti tiap diketuk. */
import { t, hooks } from './i18n.js';
import { ic } from './icons.js';
import { store } from './util.js';

const NS = 'http://www.w3.org/2000/svg';
const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const S = (n, a = {}, p) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); p?.append(e); return e; };
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
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
/** Ruas tebal dengan garis tepi tipis. */
function limb(p, fill, w, edge) {
  const o = S('line', { stroke: edge, 'stroke-width': w + 2.2, 'stroke-linecap': 'round' }, p), f = S('line', { stroke: fill, 'stroke-width': w, 'stroke-linecap': 'round' }, p);
  return (a, b) => { for (const l of [o, f]) { l.setAttribute('x1', a[0]); l.setAttribute('y1', a[1]); l.setAttribute('x2', b[0]); l.setAttribute('y2', b[1]); } };
}
const phoneShape = (p, w = 4, h = 13) => { const g = S('g', {}, p); S('rect', { x: -w / 2, y: -h / 2, width: w, height: h, rx: 1.4, fill: C.dark, stroke: C.gold, 'stroke-width': 1 }, g); S('rect', { x: -w / 2 + 0.7, y: -h / 2 + 1.2, width: w - 1.4, height: h - 3, rx: 0.8, fill: '#9AD9B8', opacity: 0.85 }, g); return g; };

/* ===== Pose tampak samping (menghadap kanan = kiblat). A=pergelangan kaki, K=lutut, H=pinggul, S=bahu, C=kepala, T=target tangan ===== */
const L = { th: 32, sh: 30, to: 39, ua: 23, fa: 21 };
const POSE = {
  q: { A: [96, 125], K: [96, 95], H: [96, 63], S: [96, 24], C: [97, 12], T: [117, 44], bend: 1, toe: [110, 125] },
  r: { A: [96, 125], K: [98, 95], H: [88, 66], S: [127, 66], C: [139, 62], T: [99, 92], bend: 0.4, toe: [110, 125] },
  k: { A: [80, 121], K: [110, 121], H: [99, 93], S: [112, 56], C: [117, 44], T: [128, 98], bend: 0.6, toe: [72, 125] },
  s: { A: [80, 121], K: [110, 121], H: [97, 91], S: [136, 101], C: [148, 119], T: [164, 124], bend: -0.5, toe: [72, 125] },
  d: { A: [80, 121], K: [110, 121], H: [85, 106], S: [90, 68], C: [92, 56], T: [101, 104], bend: 0.6, toe: [72, 125] },
};
const mixPose = (a, b, k) => { const o = {}; for (const key in a) o[key] = Array.isArray(a[key]) ? lerpV(a[key], b[key], k) : lerp(a[key], b[key], k); return o; };
const TH = { shirt: { on: 50, off: 30 }, pants: { on: 25, off: 15 } }; // sama dengan ambang di counter.js

/** Gambar orang tampak samping di dalam <svg>. Mengembalikan fungsi draw(pose, nowMs) → sudut kemiringan HP. */
function sideFigure(svg, kind) {
  svg.setAttribute('viewBox', '38 -10 176 160');
  const g = S('g', {}, svg);
  S('rect', { x: 52, y: 126.5, width: 146, height: 7, rx: 3.5, fill: C.gold }, g); S('rect', { x: 52, y: 126.5, width: 146, height: 1.7, rx: 0.8, fill: '#fff', opacity: 0.4 }, g);
  S('path', { d: 'M58 130.2h134', stroke: C.gold2, 'stroke-width': 0.8, 'stroke-dasharray': '2 2', fill: 'none' }, g);
  const kb = S('g', { transform: 'translate(180 8)' }, g); // penanda arah kiblat
  S('path', { d: 'M0 4h22M16 0l6 4-6 4', stroke: C.shirtD, 'stroke-width': 1.8, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, kb);
  S('rect', { x: 8, y: 11, width: 11, height: 11, rx: 1.5, fill: C.dark }, kb); S('path', { d: 'M8 14.5h11', stroke: C.gold, 'stroke-width': 1.2 }, kb);
  const shin = limb(g, C.pants, 10, C.pantsD), thigh = limb(g, C.pants, 11, C.pantsD), foot = limb(g, C.dark, 5, C.dark);
  const torso = limb(g, C.shirt, 15, C.shirtD), neck = limb(g, C.skin, 5.5, C.skinD), ua = limb(g, C.shirt, 7.5, C.shirtD), fa = limb(g, C.skin, 6, C.skinD);
  const hand = S('circle', { r: 3.6, fill: C.skin, stroke: C.skinD, 'stroke-width': 0.9 }, g);
  const head = S('g', {}, g); S('circle', { r: 8, fill: C.skin, stroke: C.skinD, 'stroke-width': 1 }, head);
  S('path', { d: 'M-8.4 -1.5C-8.4 -9 -3 -11.6 1 -11.4C6 -11.2 8.6 -7 8.4 -1.5Z', fill: '#fff', stroke: C.shirtD, 'stroke-width': 1 }, head); S('path', { d: 'M7.6 1.2l2.3 1.4-2.3 1' , fill: C.skinD }, head);
  const glow = S('circle', { r: 11, fill: C.gold, opacity: 0.45 }, g), ph = phoneShape(g, 3.8, 13);
  return (P, now) => {
    shin(P.A, P.K); thigh(P.K, P.H); foot(P.A, P.toe); torso(P.H, P.S); neck(P.S, P.C);
    const { e, h } = ik(P.S, P.T, L.ua, L.fa, P.bend); ua(P.S, e); fa(e, h); hand.setAttribute('cx', h[0]); hand.setAttribute('cy', h[1]);
    const rot = Math.atan2(P.S[0] - P.H[0], -(P.S[1] - P.H[1])) * 180 / Math.PI;
    head.setAttribute('transform', `translate(${P.C[0]} ${P.C[1]}) rotate(${rot.toFixed(1)})`);
    let pos, a, tilt;
    if (kind === 'shirt') { // HP di dada: ikut batang badan (pinggul → bahu)
      const u = [P.S[0] - P.H[0], P.S[1] - P.H[1]], n = Math.hypot(...u), ux = u[0] / n, uy = u[1] / n, f = [-uy, ux];
      pos = [P.S[0] - ux * n * 0.3 + f[0] * 8.6, P.S[1] - uy * n * 0.3 + f[1] * 8.6]; a = Math.atan2(ux, -uy) * 180 / Math.PI; tilt = angle(u, [0, -1]);
    } else { // HP di paha: ikut paha (pinggul → lutut)
      const u = [P.K[0] - P.H[0], P.K[1] - P.H[1]], n = Math.hypot(...u), ux = u[0] / n, uy = u[1] / n, f = [uy, -ux];
      pos = [P.H[0] + ux * n * 0.38 + f[0] * 7.4, P.H[1] + uy * n * 0.38 + f[1] * 7.4]; a = Math.atan2(ux, -uy) * 180 / Math.PI; tilt = angle(u, [0, 1]);
    }
    ph.setAttribute('transform', `translate(${pos[0].toFixed(2)} ${pos[1].toFixed(2)}) rotate(${a.toFixed(1)})`);
    glow.setAttribute('cx', pos[0]); glow.setAttribute('cy', pos[1]); glow.setAttribute('opacity', (0.28 + 0.22 * Math.sin(now / 260)).toFixed(2));
    return tilt;
  };
}

/** Penjadwal: steps = [{p:'q', move, hold}], tiap langkah bergerak dari pose sebelumnya lalu menahan. */
function player(steps, onFrame) {
  const total = steps.reduce((s, x) => s + x.move + x.hold, 0); let raf = 0, t0 = 0, idx = 0, off = false;
  const at = (ms) => {
    let t = ms % total, i = 0; for (; i < steps.length - 1; i++) { const d = steps[i].move + steps[i].hold; if (t < d) break; t -= d; }
    const st = steps[i], prev = steps[(i + steps.length - 1) % steps.length], k = st.move ? Math.min(1, t / st.move) : 1;
    return { pose: mixPose(POSE[prev.p], POSE[st.p], ease(k)), i, local: t, k, arrived: t >= st.move, st };
  };
  const tick = (now) => { if (off) return; if (!t0) t0 = now; onFrame(at(now - t0), now); raf = requestAnimationFrame(tick); };
  const still = () => { onFrame(at(steps.slice(0, idx).reduce((s, x) => s + x.move + x.hold, 0) + steps[idx].move), performance.now()); };
  return {
    start() { if (reduce()) { still(); return; } raf = requestAnimationFrame(tick); },
    next() { idx = (idx + 1) % steps.length; still(); },
    stop() { off = true; cancelAnimationFrame(raf); },
    get still() { return reduce(); },
  };
}

/* ===== Urutan gerak ===== */
const MOVE = [
  { p: 'q', move: 0, hold: 1100, k: 'po.stand' }, { p: 'r', move: 900, hold: 1000, k: 'po.ruku' }, { p: 'q', move: 800, hold: 600, k: 'po.stand' },
  { p: 'k', move: 800, hold: 0, k: 'po.sujud' }, { p: 's', move: 700, hold: 1100, k: 'po.sujud' }, { p: 'd', move: 750, hold: 1000, k: 'po.sit' },
  { p: 's', move: 650, hold: 1100, k: 'po.sujud' }, { p: 'k', move: 650, hold: 0, k: 'po.sujud' }, { p: 'q', move: 850, hold: 900, k: 'po.stand' },
];
const HOW = [
  { p: 'q', move: 0, hold: 3600, k: 'po.stand' }, { p: 'r', move: 900, hold: 1100, k: 'po.ruku' }, { p: 'q', move: 800, hold: 600, k: 'po.stand' }, { p: 'k', move: 800, hold: 0, k: 'po.sujud' },
  { p: 's', move: 700, hold: 1200, k: 'po.sujud' }, { p: 'd', move: 750, hold: 1000, k: 'po.sit' }, { p: 's', move: 650, hold: 1300, k: 'po.sujud' }, { p: 'k', move: 650, hold: 0, k: 'po.sujud' }, { p: 'q', move: 850, hold: 1800, k: 'po.stand' },
];

/** Adegan "saat shalat": orang bergerak + meter kemiringan HP dengan logika ambang yang sama dengan penghitung asli. */
function moveScene(box, kind) {
  const svg = S('svg', { 'aria-hidden': 'true' }); box.querySelector('.sv').append(svg);
  const draw = sideFigure(svg, kind), chip = box.querySelector('.stage-chip'), bar = box.querySelector('.tilt i'), val = box.querySelector('.tilt b'), det = box.querySelector('.tilt em'), th = TH[kind];
  let bent = false;
  const p = player(MOVE, (f, now) => {
    const a = draw(f.pose, now); if (!bent && a > th.on) bent = true; else if (bent && a < th.off) bent = false;
    chip.textContent = t(f.st.k); bar.style.width = Math.min(100, a / 90 * 100) + '%'; bar.classList.toggle('hot', bent);
    val.textContent = Math.round(a) + '°'; det.textContent = bent ? '✓ ' + t('gd.det') : ''; det.classList.toggle('on', bent);
  });
  box.querySelector('.tilt .th').style.insetInlineStart = th.on / 90 * 100 + '%';
  p.start(); if (p.still) box.onclick = () => p.next(); return p;
}

/** Adegan "cara pakai": orang + tampilan mini aplikasi yang berubah sinkron (kalibrasi 3 detik → rukuk → sujud → rakaat). */
function howScene(box) {
  const svg = S('svg', { 'aria-hidden': 'true' }); box.querySelector('.sv').append(svg);
  const draw = sideFigure(svg, 'shirt'), chip = box.querySelector('.stage-chip'), $m = (c) => box.querySelector(c); let last = '';
  const p = player(HOW, (f, now) => {
    const a = draw(f.pose, now); chip.textContent = t(f.st.k);
    let ph = ['rk.ready'], r = 0, sj = 0, rk = 0, i = f.i;
    if (i === 0) { if (f.local < 3000) ph = ['rk.cal', { n: Math.ceil((3000 - f.local) / 1000) }]; }
    else if (i === 1) { if (f.arrived) { ph = ['ph.ruku']; r = 1; } }
    else if (i <= 3) { ph = ['ph.ruku']; r = 1; }
    else if (i === 4) { r = 1; ph = f.arrived ? ['ph.sujud1'] : ['ph.ruku']; sj = f.arrived ? 1 : 0; }
    else if (i === 5) { r = 1; sj = 1; ph = ['ph.sujud1']; }
    else if (i === 6) { r = 1; sj = f.arrived ? 2 : 1; rk = f.arrived ? 1 : 0; ph = f.arrived ? ['ph.new'] : ['ph.sujud1']; }
    else { r = 1; sj = 2; rk = 1; ph = ['ph.new']; }
    const key = ph[0] + (ph[1]?.n ?? '') + r + sj + rk; if (key !== last) {
      last = key; $m('.ma-ph').textContent = t(ph[0], ph[1]); $m('.ma-r b').textContent = r; $m('.ma-s b').textContent = sj; $m('.ma-n b').textContent = rk;
      for (const c of ['.ma-r', '.ma-s']) { const e = $m(c); e.classList.remove('pop'); void e.offsetWidth; e.classList.add('pop'); }
    }
    $m('.ma-m i').style.width = Math.min(100, a / 90 * 100) + '%';
  });
  p.start(); if (p.still) box.onclick = () => p.next(); return p;
}

/* ===== Adegan "cara meletakkan HP": tampak depan, tangan memasukkan HP ke saku + gambar perbesaran ===== */
function placeScene(box, kind) {
  const svg = S('svg', { viewBox: '0 0 300 245', 'aria-hidden': 'true' }); box.querySelector('.sv').append(svg);
  const sh = kind === 'shirt', g = S('g', {}, svg);
  S('ellipse', { cx: 85, cy: 236, rx: 52, ry: 6, fill: '#0E7C4A', opacity: 0.12 }, g);
  const arm2 = limb(g, C.shirt, 12, C.shirtD), fore2 = limb(g, C.skin, 10, C.skinD); // lengan kiri-orang (kanan layar), diam
  const { e: e2, h: h2 } = ik([116, 72], [124, 154], 46, 44, -1); arm2([116, 72], e2); fore2(e2, h2); S('circle', { cx: h2[0], cy: h2[1], r: 6, fill: C.skin, stroke: C.skinD }, g);
  // kaki + celana
  for (const x of [52, 88]) S('rect', { x, y: 148, width: 30, height: 78, rx: 8, fill: C.pants, stroke: C.pantsD, 'stroke-width': 1.6 }, g);
  S('rect', { x: 48, y: 144, width: 74, height: 11, rx: 4, fill: '#223552', stroke: C.pantsD, 'stroke-width': 1.4 }, g); S('path', { d: 'M85 156v26', stroke: C.pantsD, 'stroke-width': 1.2, opacity: 0.6 }, g);
  for (const x of [67, 103]) S('ellipse', { cx: x, cy: 229, rx: 18, ry: 7, fill: C.dark }, g);
  // badan + kepala
  S('path', { d: 'M50 70Q85 58 120 70L125 150Q85 158 45 150Z', fill: C.shirt, stroke: C.shirtD, 'stroke-width': 1.6, 'stroke-linejoin': 'round' }, g);
  S('rect', { x: 79, y: 48, width: 12, height: 16, rx: 5, fill: C.skin }, g); S('path', { d: 'M71 64l14 15 14-15', fill: '#fff', stroke: C.shirtD, 'stroke-width': 1.3, 'stroke-linejoin': 'round' }, g);
  S('circle', { cx: 85, cy: 38, r: 16, fill: C.skin, stroke: C.skinD, 'stroke-width': 1.2 }, g); S('path', { d: 'M69 33C69 17 79 13 85 13s16 4 16 20Z', fill: '#fff', stroke: C.shirtD, 'stroke-width': 1.3 }, g);
  S('circle', { cx: 79, cy: 40, r: 1.5, fill: C.dark }, g); S('circle', { cx: 91, cy: 40, r: 1.5, fill: C.dark }, g); S('path', { d: 'M80 47q5 4 10 0', stroke: C.skinD, 'stroke-width': 1.4, fill: 'none', 'stroke-linecap': 'round' }, g);
  // HP + lengan kanan-orang (animasi)
  const phone = S('g', {}, g); S('rect', { x: -7, y: -12, width: 14, height: 24, rx: 3, fill: C.dark, stroke: C.gold, 'stroke-width': 1.4 }, phone); S('circle', { cx: -2.5, cy: -7.5, r: 2, fill: '#3C5566' }, phone);
  const glow = S('ellipse', { rx: 13, ry: 17, fill: C.gold, opacity: 0 }, g);
  // saku (menutupi bagian bawah HP supaya terlihat "masuk")
  if (sh) { S('path', { d: 'M58 88h26v21a3 3 0 0 1-3 3H61a3 3 0 0 1-3-3z', fill: '#0E8F55', stroke: C.shirtD, 'stroke-width': 1.6 }, g); S('path', { d: 'M58 88h26', stroke: '#fff', 'stroke-opacity': 0.7, 'stroke-width': 1.6, 'stroke-linecap': 'round' }, g); }
  else { S('path', { d: 'M52 158L74 172V212H52Z', fill: C.pants }, g); S('path', { d: 'M52 156Q66 158 74 172', fill: 'none', stroke: '#9DB7DD', 'stroke-width': 1.8, 'stroke-linecap': 'round' }, g); S('path', { d: 'M74 172V190', stroke: '#9DB7DD', 'stroke-width': 1, opacity: 0.5, 'stroke-dasharray': '2 2' }, g); }
  const arm1 = limb(g, C.shirt, 12, C.shirtD), fore1 = limb(g, C.skin, 10, C.skinD), hand1 = S('circle', { r: 7, fill: C.skin, stroke: C.skinD, 'stroke-width': 1.2 }, g);
  // gambar perbesaran (HP + saku), dipotong oleh panel supaya HP tampak meluncur masuk
  const cid = 'gdclip' + Math.random().toString(36).slice(2, 7), df = S('defs', {}, svg); S('rect', { x: 166, y: 18, width: 126, height: 190, rx: 20 }, S('clipPath', { id: cid }, df));
  S('rect', { x: 166, y: 18, width: 126, height: 190, rx: 20, fill: '#fff', stroke: '#D3EBDD', 'stroke-width': 2 }, svg); S('path', { d: sh ? 'M128 96L166 80' : 'M110 168L166 150', stroke: C.gold2, 'stroke-width': 1.6, 'stroke-dasharray': '3 3', fill: 'none' }, svg);
  const Z = S('g', { 'clip-path': `url(#${cid})` }, svg), big = S('g', { transform: 'translate(220 98)' }, Z), bp = S('g', {}, big);
  S('rect', { x: -18, y: -35, width: 36, height: 70, rx: 8, fill: C.dark, stroke: C.gold, 'stroke-width': 2.2 }, bp); S('circle', { cx: -7, cy: -23, r: 5, fill: '#3C5566' }, bp); S('circle', { cx: -7, cy: -23, r: 2, fill: '#0f1b22' }, bp);
  S('path', { d: sh ? 'M-44 -22h88v82a8 8 0 0 1-8 8h-72a8 8 0 0 1-8-8z' : 'M-44 -24Q-4 -22 44 22V70H-44Z', fill: sh ? '#0E8F55' : C.pants, stroke: sh ? C.shirtD : C.pantsD, 'stroke-width': 2.4, 'stroke-linejoin': 'round' }, big);
  S('path', { d: sh ? 'M-44 -22h88' : 'M-44 -24Q-4 -22 44 22', fill: 'none', stroke: sh ? '#fff' : '#9DB7DD', 'stroke-width': 3, 'stroke-linecap': 'round', opacity: 0.8 }, big);
  const tx = (x, y, txt, anc = 'middle') => { const e = S('text', { x, y, 'text-anchor': anc, 'font-size': 11, 'font-weight': 700, fill: C.shirtD, 'font-family': 'Plus Jakarta Sans,Noto Sans Arabic,sans-serif' }, svg); e.textContent = txt; return e; };
  const up = S('g', { opacity: 0 }, svg); S('path', { d: 'M273 74V50M266 57l7-8 7 8', stroke: C.shirtD, 'stroke-width': 2.4, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, up); const upT = tx(273, 90, t('gd.top')); up.append(upT);
  tx(229, 192, t('gd.screen'));
  const ok = S('g', { opacity: 0 }, svg); S('circle', { cx: 150, cy: 30, r: 15, fill: C.shirt }, ok); S('path', { d: 'M143 30l5 5 9-10', stroke: '#fff', 'stroke-width': 3.2, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, ok);
  // lintasan: tangan memegang HP (HP di bawah telapak) -> ke saku -> masuk -> tangan kembali ke sisi badan
  const REST = [44, 150], PH = (h) => [h[0], h[1] + 16];
  const SH = sh ? { above: [71, 66], in: [71, 97] } : { above: [60, 138], in: [66, 172] }, HD = (p) => [p[0], p[1] - 16];
  const KF = [{ t: 0, hd: REST, pr: 0 }, { t: 700, hd: REST, pr: 0 }, { t: 1700, hd: HD(SH.above), pr: 0 }, { t: 2500, hd: HD(SH.in), pr: 1 }, { t: 3300, hd: REST, pr: 1 }, { t: 5400, hd: REST, pr: 1 }];
  const T = 5800, shoulder = [54, 72];
  const draw = (ms, now) => {
    ms %= T; let a = KF[0], b = KF[0]; for (let i = 0; i < KF.length - 1; i++) if (ms >= KF[i].t && ms <= KF[i + 1].t) { a = KF[i]; b = KF[i + 1]; break; } if (ms > KF[KF.length - 1].t) a = b = KF[KF.length - 1];
    const k = b.t === a.t ? 1 : ease((ms - a.t) / (b.t - a.t)), hd = lerpV(a.hd, b.hd, k), pr = lerp(a.pr, b.pr, k), fade = ms > 5400 ? 1 - (ms - 5400) / 400 : ms < 250 ? ms / 250 : 1;
    const inside = ms >= 2500, ph = inside ? SH.in : PH(hd);
    phone.setAttribute('transform', `translate(${ph[0]} ${ph[1]})`); phone.setAttribute('opacity', fade);
    const { e, h } = ik(shoulder, hd, 46, 44, 1); arm1(shoulder, e); fore1(e, h); hand1.setAttribute('cx', h[0]); hand1.setAttribute('cy', h[1]); hand1.setAttribute('opacity', fade);
    bp.setAttribute('transform', `translate(0 ${(-(1 - ease(Math.min(1, Math.max(0, (ms - 1700) / 800)))) * 90 - 18).toFixed(1)})`);
    const hold = ms > 3300 && ms < 5400; glow.setAttribute('cx', SH.in[0]); glow.setAttribute('cy', SH.in[1]); glow.setAttribute('opacity', hold ? (0.25 + 0.2 * Math.sin(now / 240)).toFixed(2) : 0); ok.setAttribute('opacity', hold ? Math.min(1, (ms - 3300) / 300) : 0); up.setAttribute('opacity', ms > 2300 && ms < 5400 ? 1 : 0);
  };
  const p = { raf: 0, t0: 0, off: false, start() { if (reduce()) { draw(4000, 0); return; } const tick = (now) => { if (p.off) return; p.t0 ||= now; draw(now - p.t0, now); p.raf = requestAnimationFrame(tick); }; p.raf = requestAnimationFrame(tick); }, stop() { p.off = true; cancelAnimationFrame(p.raf); } };
  p.start(); return p;
}

/* ===== Halaman panduan ===== */
let root = null, tab = 'shirt', players = [], open = false;
const steps = (pre, n) => `<ol class="gd-steps">${Array.from({ length: n }, (_, i) => `<li><i>${i + 1}</i><span>${t(`${pre}.${i + 1}`)}</span></li>`).join('')}</ol>`;
const stage = (cls, extra = '') => `<div class="stage ${cls}"><span class="stage-chip"></span><div class="sv"></div>${extra}</div>`;
const tiltBox = '<div class="tilt"><span class="tl"></span><div class="tm"><i></i><u class="th"></u></div><b>0°</b><em></em></div>';
const miniApp = () => `<div class="mini-app"><p class="ma-ph"></p><div class="ma-r"><small>${t('rk.ruku')}</small><b>0</b></div><div class="ma-s"><small>${t('rk.sujud')}</small><b>0</b></div><div class="ma-m"><i></i></div><div class="ma-n"><small>${t('rk.rakaat')}</small><b>0</b></div></div>`;

function render() {
  players.forEach((p) => p.stop()); players = [];
  const tabs = [['shirt', 'rk.shirt', 'shirt'], ['pants', 'rk.pants', 'pants'], ['how', 'gd.tab.how', 'help']];
  let body;
  if (tab === 'how') body = `<h3 class="gd-h"><i>▶</i>${t('gd.howt')}</h3>${stage('how', miniApp())}${steps('gd.h', 6)}<div class="gd-tip">${t('gd.h.tip')}</div><div class="gd-tip alt">${t('gd.h.sn')}</div>`;
  else {
    const pre = tab === 'shirt' ? 'gd.sh' : 'gd.pa';
    body = `<h3 class="gd-h"><i>1</i>${t('gd.place')}</h3>${stage('place')}${steps(pre, 4)}<h3 class="gd-h"><i>2</i>${t('gd.move')}</h3>${stage('move', tiltBox)}<div class="gd-tip">${t(pre + '.tip')}</div>`;
  }
  root.innerHTML = `<div class="gd-head"><button class="icon flip" data-gx aria-label="${t('gd.close')}">${ic('back')}</button><h2 class="ttl">${t('gd.title')}</h2></div>
    <div class="gd-tabs" role="tablist">${tabs.map(([k, l, i]) => `<button role="tab" aria-selected="${k === tab}" data-tab="${k}" class="${k === tab ? 'on' : ''}">${ic(i, 22)}<span>${t(l)}</span></button>`).join('')}</div>
    <div class="gd-wrap">${body}</div>`;
  const q = (c) => root.querySelector(c);
  if (tab === 'how') players.push(howScene(q('.stage.how')));
  else {
    players.push(placeScene(q('.stage.place'), tab)); const mv = q('.stage.move'); mv.querySelector('.tilt .tl').textContent = t('gd.tilt'); players.push(moveScene(mv, tab));
  }
  if (players.some((p) => p.still)) root.querySelectorAll('.stage.move,.stage.how').forEach((s) => s.insertAdjacentHTML('afterend', `<small class="mute gd-tap">${t('gd.tap')}</small>`));
  root.scrollTo(0, 0);
}
function build() {
  root = document.createElement('div'); root.id = 'guide'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); document.body.append(root);
  root.addEventListener('click', (e) => { if (e.target.closest('[data-gx]')) closeGuide(); const b = e.target.closest('[data-tab]'); if (b) { tab = b.dataset.tab; render(); } });
  document.addEventListener('keydown', (e) => { if (open && e.key === 'Escape') closeGuide(); });
  hooks.push(() => { if (open) render(); });
  document.addEventListener('visibilitychange', () => { if (open) { players.forEach((p) => p.stop()); players = []; if (!document.hidden) render(); } });
}
export function openGuide(k = 'shirt') { if (!root) build(); tab = k; open = true; root.classList.add('on'); document.body.classList.add('gd-open'); render(); store.set('rs.gd', 1); }
export function closeGuide() { open = false; players.forEach((p) => p.stop()); players = []; root?.classList.remove('on'); document.body.classList.remove('gd-open'); document.querySelector('#guideBtn')?.classList.remove('new'); }
