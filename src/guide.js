/** guide.js — panduan animasi: cara menaruh HP di Saku Baju / Saku Celana, gerakan saat shalat, dan cara memakai aplikasi.
 *  Orang digambar sebagai kerangka sendi tampak samping (panjang tulang tetap), lengan dihitung dengan IK 2-ruas.
 *  Animasi memakai requestAnimationFrame; bila pengguna memilih "reduce motion", gambar diam dan diganti tiap diketuk. */
import { t, hooks } from './i18n.js';
import { ic } from './icons.js';
import { store } from './util.js';

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
function capsule(parent, fill) {
  const el = S('path', { fill }, parent), f = (v) => v.toFixed(2);
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
const L = { ua: 23, fa: 21 };
// A=pergelangan kaki, K=lutut, H=pinggul, S=bahu, C=kepala, T=target tangan
const RAW = {
  q: { A: [96, 125], K: [96, 95], H: [96, 63], S: [96, 24], C: [97, 12], T: [117, 44], bend: 1, toe: [110, 125] },
  r: { A: [96, 125], K: [98, 95], H: [88, 66], S: [127, 66], C: [139, 62], T: [99, 92], bend: 0.4, toe: [110, 125] },
  k: { A: [80, 121], K: [110, 121], H: [99, 93], S: [112, 56], C: [117, 44], T: [128, 98], bend: 0.6, toe: [66, 124] },
  s: { A: [80, 121], K: [110, 121], H: [97, 91], S: [136, 101], C: [148, 119], T: [164, 124], bend: -0.5, toe: [66, 124] },
  d: { A: [80, 121], K: [110, 121], H: [85, 106], S: [90, 68], C: [92, 56], T: [101, 104], bend: 0.6, toe: [66, 124] },
};
const POSE = Object.fromEntries(Object.entries(RAW).map(([k, r]) => {
  const v = [[r.K, r.A], [r.H, r.K], [r.S, r.H], [r.C, r.S]].map(([p, q]) => [p[0] - q[0], p[1] - q[1]]);
  return [k, { A: r.A, ang: v.map(angOf), len: v.map((x) => Math.hypot(...x)), T: r.T, bend: r.bend, toe: r.toe }];
}));
const stage_k = (kl, d) => ease(Math.min(1, Math.max(0, (kl - d) / (1 - d))));
/** Campur dua pose. Tiap bagian mulai sedikit terlambat dari sebelumnya (kaki → badan → lengan → kepala): gerak berurutan, tidak serentak. */
function blend(pa, pb, kl) {
  const kLeg = stage_k(kl, 0), kTo = stage_k(kl, 0.05), kArm = stage_k(kl, 0.11), kHd = stage_k(kl, 0.18), ks = [kLeg, kLeg, kTo, kHd];
  return { A: lerpV(pa.A, pb.A, kLeg), toe: lerpV(pa.toe, pb.toe, kLeg), ang: ks.map((k, i) => lerp(pa.ang[i], pb.ang[i], k)), len: ks.map((k, i) => lerp(pa.len[i], pb.len[i], k)), T: lerpV(pa.T, pb.T, kArm), bend: lerp(pa.bend, pb.bend, kArm) };
}
/** Forward kinematics + gerak napas / kepala yang sangat halus supaya orang tampak hidup saat menahan pose. */
function fk(P, now) {
  const br = Math.sin(now / 650), an = P.ang.slice(); an[2] += 0.9 * br; an[3] += 1.4 * Math.sin(now / 900 + 1);
  const K = pt(P.A, an[0], P.len[0]), H = pt(K, an[1], P.len[1]), Sh = pt(H, an[2], P.len[2]), Cc = pt(Sh, an[3], P.len[3]);
  return { A: P.A, K, H, S: Sh, C: Cc, T: [P.T[0], P.T[1] + 0.5 * br], bend: P.bend, toe: P.toe, an };
}
const TH = { shirt: { on: 50, off: 30 }, pants: { on: 25, off: 15 } }; // sama dengan ambang di counter.js

/** Gambar orang tampak samping di dalam <svg>. Mengembalikan fungsi draw(pose, nowMs) → sudut kemiringan HP. */
function sideFigure(svg, kind) {
  svg.setAttribute('viewBox', '54 -4 148 138');
  const g = S('g', {}, svg);
  S('rect', { x: 52, y: 126.5, width: 146, height: 7, rx: 3.5, fill: C.gold }, g); S('rect', { x: 52, y: 126.5, width: 146, height: 1.7, rx: 0.8, fill: '#fff', opacity: 0.4 }, g);
  S('path', { d: 'M58 130.2h134', stroke: C.gold2, 'stroke-width': 0.8, 'stroke-dasharray': '2 2', fill: 'none' }, g);
  const kb = S('g', { transform: 'translate(176 4)' }, g); // penanda arah kiblat
  S('path', { d: 'M0 4h22M16 0l6 4-6 4', stroke: C.shirtD, 'stroke-width': 1.8, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, kb);
  S('rect', { x: 8, y: 11, width: 11, height: 11, rx: 1.5, fill: C.dark }, kb); S('path', { d: 'M8 14.5h11', stroke: C.gold, 'stroke-width': 1.2 }, kb);
  const shadow = S('ellipse', { cy: 130, ry: 3, fill: '#0A5C38', opacity: 0.1 }, g);
  const leg = (parent, p) => { const th = capsule(parent, p.pants), sn = capsule(parent, p.pants), ft = capsule(parent, p.skin); return (F) => { th(F.H, F.K, 6.8, 5.3); sn(F.K, F.A, 5.6, 3.9); ft(F.A, F.toe, 3.9, 2.4); }; };
  const arm = (parent, p, glove) => {
    const ua = capsule(parent, p.shirt), fa = capsule(parent, p.skin), hd = S('g', {}, parent);
    S('ellipse', { cx: 2.4, cy: 0, rx: 4.3, ry: 2.9, fill: p.skin }, hd); S('ellipse', { cx: 0.6, cy: -2.5, rx: 2.1, ry: 1.1, fill: p.skin, transform: 'rotate(-20 0.6 -2.5)' }, hd);
    return (F) => { const { e, h } = ik(F.S, F.T, L.ua, L.fa, F.bend); ua(F.S, e, 4.9, 4.1); fa(e, h, 3.5, 2.8); hd.setAttribute('transform', `translate(${h[0].toFixed(2)} ${h[1].toFixed(2)}) rotate(${(Math.atan2(h[1] - e[1], h[0] - e[0]) / RAD).toFixed(1)})`); };
  };
  const farP = { pants: '#22365A', shirt: '#13935A', skin: '#C98F68' }, nearP = { pants: C.pants, shirt: C.shirt, skin: C.skin };
  const fg = S('g', { transform: 'translate(-3.2 -0.9)' }, g), farLeg = leg(fg, farP), farArm = arm(fg, farP);
  const nearLeg = leg(g, nearP), neck = capsule(g, C.skin), torso = capsule(g, C.shirt);
  const collar = S('ellipse', { rx: 3.6, ry: 2.8, fill: '#fff', stroke: C.shirtD, 'stroke-width': 0.8 }, g), seam = S('path', { fill: 'none', stroke: '#fff', 'stroke-opacity': 0.5, 'stroke-width': 0.9, 'stroke-linecap': 'round' }, g);
  const nearArm = arm(g, nearP);
  const head = S('g', {}, g);
  S('ellipse', { rx: 7, ry: 8, fill: C.skin }, head); S('path', { d: 'M5.8 3.2q3.2-.4 2.4 2.1q-1.6 1.7-3.6 1.1z', fill: C.skin }, head); S('path', { d: 'M6.9 -.3q2.1 1.7.6 3', fill: 'none', stroke: C.skinD, 'stroke-width': 0.7, 'stroke-linecap': 'round' }, head);
  S('ellipse', { cx: -1.6, cy: 0.8, rx: 1.5, ry: 2.1, fill: '#D29A74' }, head); S('circle', { cx: 3.2, cy: -1.5, r: 0.85, fill: C.dark }, head);
  S('path', { d: 'M-7.3 -2.4C-7.6 -9.6 -3 -11.2 0.4 -11C4.6 -10.8 7.2 -8.2 7.3 -2.4Z', fill: '#fff', stroke: C.shirtD, 'stroke-width': 0.9, 'stroke-linejoin': 'round' }, head); S('path', { d: 'M-7.2 -3.6Q0 -6.4 7.2 -3.6', fill: 'none', stroke: C.shirt, 'stroke-width': 0.9 }, head);
  const glow = S('circle', { r: 11, fill: C.gold, opacity: 0.45 }, g), ph = phoneShape(g, 3.8, 13);
  return (P, now) => {
    const F = fk(P, now);
    farLeg(F); farArm(F); nearLeg(F);
    const tl = Math.hypot(F.H[0] - F.S[0], F.H[1] - F.S[1]) || 1, E = [F.H[0] + (F.H[0] - F.S[0]) / tl * 3.5, F.H[1] + (F.H[1] - F.S[1]) / tl * 3.5];
    neck(F.S, F.C, 3.5, 3); torso(F.S, E, 6.4, 7.6);
    const cl = lerpV(F.S, F.C, 0.28); collar.setAttribute('cx', cl[0]); collar.setAttribute('cy', cl[1]);
    const sm = lerpV(F.S, F.H, 0.15), sm2 = lerpV(F.S, F.H, 0.7); seam.setAttribute('d', `M${sm[0].toFixed(1)} ${sm[1].toFixed(1)}L${sm2[0].toFixed(1)} ${sm2[1].toFixed(1)}`);
    head.setAttribute('transform', `translate(${F.C[0].toFixed(2)} ${F.C[1].toFixed(2)}) rotate(${(F.an[2] + 0.4 * (F.an[3] - F.an[2])).toFixed(1)})`);
    nearArm(F);
    let pos, a, tilt;
    if (kind === 'shirt') { // HP di dada: ikut batang badan (pinggul → bahu)
      const u = [F.S[0] - F.H[0], F.S[1] - F.H[1]], n = Math.hypot(...u), ux = u[0] / n, uy = u[1] / n, f = [-uy, ux];
      pos = [F.S[0] - ux * n * 0.3 + f[0] * 8.6, F.S[1] - uy * n * 0.3 + f[1] * 8.6]; a = Math.atan2(ux, -uy) / RAD; tilt = angle(u, [0, -1]);
    } else { // HP di paha: ikut paha (pinggul → lutut)
      const u = [F.K[0] - F.H[0], F.K[1] - F.H[1]], n = Math.hypot(...u), ux = u[0] / n, uy = u[1] / n, f = [uy, -ux];
      pos = [F.H[0] + ux * n * 0.38 + f[0] * 7.6, F.H[1] + uy * n * 0.38 + f[1] * 7.6]; a = Math.atan2(ux, -uy) / RAD; tilt = angle(u, [0, 1]);
    }
    ph.setAttribute('transform', `translate(${pos[0].toFixed(2)} ${pos[1].toFixed(2)}) rotate(${a.toFixed(1)})`);
    glow.setAttribute('cx', pos[0]); glow.setAttribute('cy', pos[1]); glow.setAttribute('opacity', (0.26 + 0.2 * Math.sin(now / 260)).toFixed(2));
    shadow.setAttribute('cx', ((F.A[0] + F.H[0] + F.S[0]) / 3).toFixed(1)); shadow.setAttribute('rx', (16 + Math.abs(F.S[0] - F.A[0]) * 0.3).toFixed(1));
    return tilt;
  };
}

/** Penjadwal: steps = [{p:'q', move, hold}], tiap langkah bergerak dari pose sebelumnya lalu menahan. */
function player(steps, onFrame) {
  const total = steps.reduce((s, x) => s + x.move + x.hold, 0); let raf = 0, t0 = 0, idx = 0, off = false;
  const at = (ms) => {
    let t = ms % total, i = 0; for (; i < steps.length - 1; i++) { const d = steps[i].move + steps[i].hold; if (t < d) break; t -= d; }
    const st = steps[i], prev = steps[(i + steps.length - 1) % steps.length], k = st.move ? Math.min(1, t / st.move) : 1;
    return { pose: blend(POSE[prev.p], POSE[st.p], k), i, local: t, k, arrived: t >= st.move, st };
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
  const sh = kind === 'shirt', g = S('g', {}, svg), SHO = [54, 72], SHO2 = [116, 72];
  S('ellipse', { cx: 85, cy: 236, rx: 54, ry: 6, fill: '#0E7C4A', opacity: 0.12 }, g);
  /* lengan: kapsul meruncing + tangan (telapak & jempol) */
  const arm = (parent, thumbSide) => {
    const ua = capsule(parent, C.shirt), fa = capsule(parent, C.skin), hd = S('g', {}, parent);
    S('ellipse', { cx: 0, cy: 5.5, rx: 6.2, ry: 8.2, fill: C.skin }, hd); S('ellipse', { cx: thumbSide * 5.6, cy: 1.5, rx: 2.3, ry: 5, fill: C.skin, transform: `rotate(${-thumbSide * 22} ${thumbSide * 5.6} 1.5)` }, hd);
    S('path', { d: 'M-4 11.5v2M-1.3 12.8v2M1.4 12.8v2M4 11.5v2', stroke: C.skinD, 'stroke-width': 0.9, 'stroke-linecap': 'round', opacity: 0.55 }, hd);
    return (s0, e, h) => { ua(s0, e, 8.6, 6.8); fa(e, h, 6.1, 4.7); hd.setAttribute('transform', `translate(${h[0].toFixed(1)} ${h[1].toFixed(1)}) rotate(${(Math.atan2(h[1] - e[1], h[0] - e[0]) / RAD - 90).toFixed(1)})`); };
  };
  const arm2 = arm(g, -1);
  // kaki + celana (meruncing ke bawah) + sepatu
  S('path', { d: 'M52 150Q51 192 55 223H80Q84 192 83 150Z', fill: C.pants }, g); S('path', { d: 'M87 150Q86 192 90 223H115Q119 192 118 150Z', fill: C.pants }, g);
  S('path', { d: 'M85 154V222', stroke: C.pantsD, 'stroke-width': 1.2, opacity: 0.5, fill: 'none' }, g); S('path', { d: 'M58 160Q57 190 59 214M112 160Q113 190 111 214', stroke: '#fff', 'stroke-opacity': 0.08, 'stroke-width': 3, fill: 'none', 'stroke-linecap': 'round' }, g);
  S('rect', { x: 48, y: 144, width: 74, height: 11, rx: 5, fill: '#223552' }, g);
  for (const x of [67, 103]) { S('path', { d: `M${x - 17} 233Q${x - 17} 222 ${x - 6} 222H${x + 7}Q${x + 17} 224 ${x + 17} 233Z`, fill: C.dark }, g); S('path', { d: `M${x - 12} 226Q${x} 223 ${x + 10} 226`, stroke: '#fff', 'stroke-opacity': 0.18, 'stroke-width': 1.6, fill: 'none', 'stroke-linecap': 'round' }, g); }
  // badan + kepala (bernapas)
  const bodyG = S('g', {}, g);
  S('path', { d: 'M50 76Q52 62 85 60Q118 62 120 76L125 150Q85 161 45 150Z', fill: C.shirt }, bodyG);
  S('path', { d: 'M50 76Q52 62 85 60', fill: 'none', stroke: '#fff', 'stroke-opacity': 0.25, 'stroke-width': 1.6, 'stroke-linecap': 'round' }, bodyG); S('path', { d: 'M46 130Q85 142 124 130', fill: 'none', stroke: C.shirtD, 'stroke-opacity': 0.25, 'stroke-width': 1.2 }, bodyG);
  S('path', { d: 'M85 79V152', stroke: C.shirtD, 'stroke-opacity': 0.45, 'stroke-width': 1.2 }, bodyG); for (const y of [92, 110, 128]) S('circle', { cx: 85, cy: y, r: 1.5, fill: '#fff', opacity: 0.85 }, bodyG);
  const headG = S('g', {}, g);
  S('rect', { x: 79, y: 50, width: 12, height: 16, rx: 5, fill: '#D29A74' }, headG); S('path', { d: 'M70 65l15 14 15-14', fill: '#fff', stroke: C.shirtD, 'stroke-width': 1.2, 'stroke-linejoin': 'round' }, headG);
  S('circle', { cx: 69.5, cy: 41, r: 3.6, fill: '#D29A74' }, headG); S('circle', { cx: 100.5, cy: 41, r: 3.6, fill: '#D29A74' }, headG);
  S('ellipse', { cx: 85, cy: 38, rx: 15.4, ry: 17.4, fill: C.skin }, headG);
  S('path', { d: 'M69 33C69 17 79 13 85 13S101 17 101 33Z', fill: '#fff', stroke: C.shirtD, 'stroke-width': 1.2, 'stroke-linejoin': 'round' }, headG); S('path', { d: 'M69.4 29.5Q85 24 100.6 29.5', fill: 'none', stroke: C.shirt, 'stroke-width': 1.3 }, headG);
  const eyes = S('g', {}, headG); S('ellipse', { cx: 79, cy: 40, rx: 1.7, ry: 2, fill: C.dark }, eyes); S('ellipse', { cx: 91, cy: 40, rx: 1.7, ry: 2, fill: C.dark }, eyes);
  S('path', { d: 'M75.5 35.5q3.5-2 7 0M87.5 35.5q3.5-2 7 0', stroke: C.skinD, 'stroke-width': 1.3, fill: 'none', 'stroke-linecap': 'round' }, headG); S('path', { d: 'M85 41v5q-2 1.4-3 .6', stroke: C.skinD, 'stroke-width': 1, fill: 'none', 'stroke-linecap': 'round' }, headG); S('path', { d: 'M79 48q6 4.4 12 0', stroke: '#B5694A', 'stroke-width': 1.5, fill: 'none', 'stroke-linecap': 'round' }, headG);
  // HP + glow
  const phone = S('g', {}, g); S('rect', { x: -7, y: -12, width: 14, height: 24, rx: 3, fill: C.dark, stroke: C.gold, 'stroke-width': 1.4 }, phone); S('circle', { cx: -2.5, cy: -7.5, r: 2, fill: '#3C5566' }, phone);
  const glow = S('ellipse', { rx: 13, ry: 17, fill: C.gold, opacity: 0 }, g);
  // saku (menutupi bagian bawah HP supaya terlihat "masuk")
  if (sh) { S('path', { d: 'M58 88h26v21a3 3 0 0 1-3 3H61a3 3 0 0 1-3-3z', fill: '#0E8F55', stroke: C.shirtD, 'stroke-width': 1.6 }, g); S('path', { d: 'M58 88h26', stroke: '#fff', 'stroke-opacity': 0.7, 'stroke-width': 1.6, 'stroke-linecap': 'round' }, g); }
  else { S('path', { d: 'M52 158L74 172V212H52Z', fill: C.pants }, g); S('path', { d: 'M52 156Q66 158 74 172', fill: 'none', stroke: '#9DB7DD', 'stroke-width': 1.8, 'stroke-linecap': 'round' }, g); S('path', { d: 'M74 172V190', stroke: '#9DB7DD', 'stroke-width': 1, opacity: 0.5, 'stroke-dasharray': '2 2' }, g); }
  const arm1 = arm(g, 1);
  // gambar perbesaran (HP + saku), dipotong oleh panel supaya HP tampak meluncur masuk
  const cid = 'gdclip' + Math.random().toString(36).slice(2, 7), df = S('defs', {}, svg); S('rect', { x: 166, y: 18, width: 126, height: 190, rx: 20 }, S('clipPath', { id: cid }, df));
  S('rect', { x: 166, y: 18, width: 126, height: 190, rx: 20, fill: '#fff', stroke: '#D3EBDD', 'stroke-width': 2 }, svg); S('path', { d: sh ? 'M128 96L166 80' : 'M110 168L166 150', stroke: C.gold2, 'stroke-width': 1.6, 'stroke-dasharray': '3 3', fill: 'none' }, svg);
  const Z = S('g', { 'clip-path': `url(#${cid})` }, svg), big = S('g', { transform: 'translate(220 98)' }, Z), bp = S('g', {}, big);
  S('rect', { x: -18, y: -35, width: 36, height: 70, rx: 8, fill: C.dark, stroke: C.gold, 'stroke-width': 2.2 }, bp); S('circle', { cx: -7, cy: -23, r: 5, fill: '#3C5566' }, bp); S('circle', { cx: -7, cy: -23, r: 2, fill: '#0f1b22' }, bp);
  S('path', { d: sh ? 'M-44 -22h88v82a8 8 0 0 1-8 8h-72a8 8 0 0 1-8-8z' : 'M-44 -24Q-4 -22 44 22V70H-44Z', fill: sh ? '#0E8F55' : C.pants, stroke: sh ? C.shirtD : C.pantsD, 'stroke-width': 2.4, 'stroke-linejoin': 'round' }, big);
  S('path', { d: sh ? 'M-44 -22h88' : 'M-44 -24Q-4 -22 44 22', fill: 'none', stroke: sh ? '#fff' : '#9DB7DD', 'stroke-width': 3, 'stroke-linecap': 'round', opacity: 0.8 }, big);
  const tx = (x, y, txt) => { const e = S('text', { x, y, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, fill: C.shirtD, 'font-family': 'Plus Jakarta Sans,Noto Sans Arabic,sans-serif' }, svg); e.textContent = txt; return e; };
  const up = S('g', { opacity: 0 }, svg); S('path', { d: 'M273 74V50M266 57l7-8 7 8', stroke: C.shirtD, 'stroke-width': 2.4, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, up); up.append(tx(273, 90, t('gd.top')));
  tx(229, 192, t('gd.screen'));
  const ok = S('g', { opacity: 0 }, svg); S('circle', { cx: 150, cy: 30, r: 15, fill: C.shirt }, ok); S('path', { d: 'M143 30l5 5 9-10', stroke: '#fff', 'stroke-width': 3.2, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, ok);
  // lintasan: tangan memegang HP (HP di bawah telapak) -> ke saku -> masuk -> tangan kembali ke sisi badan
  const REST = [46, 152], PH = (h) => [h[0], h[1] + 16], HD = (q) => [q[0], q[1] - 16];
  const SH = sh ? { above: [71, 77], in: [71, 97] } : { above: [60, 136], in: [66, 172] };
  const KF = [{ t: 0, hd: REST }, { t: 800, hd: REST }, { t: 1900, hd: HD(SH.above) }, { t: 2700, hd: HD(SH.in) }, { t: 3500, hd: REST }, { t: 5400, hd: REST }];
  const T = 5900;
  const draw = (ms, now) => {
    ms %= T; let a = KF[0], b = KF[0]; for (let i = 0; i < KF.length - 1; i++) if (ms >= KF[i].t && ms <= KF[i + 1].t) { a = KF[i]; b = KF[i + 1]; break; } if (ms > KF[KF.length - 1].t) a = b = KF[KF.length - 1];
    const k = b.t === a.t ? 1 : ease((ms - a.t) / (b.t - a.t)), dx = b.hd[0] - a.hd[0], dy = b.hd[1] - a.hd[1], dl = Math.hypot(dx, dy) || 1, lift = Math.sin(Math.PI * k) * Math.min(7, dl * 0.12);
    const hd = [lerp(a.hd[0], b.hd[0], k) + dy / dl * lift, lerp(a.hd[1], b.hd[1], k) - dx / dl * lift]; // busur: tangan tidak bergerak lurus
    const fade = ms > 5500 ? 1 - (ms - 5500) / 400 : ms < 250 ? ms / 250 : 1, inside = ms >= 2700, ph = inside ? SH.in : PH(hd), br = Math.sin(now / 650);
    bodyG.setAttribute('transform', `translate(0 ${(0.5 * br).toFixed(2)})`); headG.setAttribute('transform', `translate(0 ${(0.5 * br).toFixed(2)}) rotate(${Math.max(-3, Math.min(4, (hd[0] - 60) * 0.06) + Math.sin(now / 1100)).toFixed(1)} 85 56)`);
    const blink = now % 3300 < 130 ? 0.1 : 1; eyes.setAttribute('transform', `translate(0 40) scale(1 ${blink}) translate(0 -40)`);
    phone.setAttribute('transform', `translate(${ph[0].toFixed(1)} ${ph[1].toFixed(1)})`); phone.setAttribute('opacity', fade);
    const sw = [SHO[0], SHO[1] + 0.5 * br], r1 = ik(sw, hd, 46, 44, 1); arm1(sw, r1.e, r1.h);
    const sw2 = [SHO2[0], SHO2[1] + 0.5 * br], r2 = ik(sw2, [124, 154 + 0.6 * br], 46, 44, -1); arm2(sw2, r2.e, r2.h);
    bp.setAttribute('transform', `translate(0 ${(-(1 - ease(Math.min(1, Math.max(0, (ms - 1900) / 800)))) * 90 - 18).toFixed(1)})`);
    const hold = ms > 3500 && ms < 5500; glow.setAttribute('cx', SH.in[0]); glow.setAttribute('cy', SH.in[1]); glow.setAttribute('opacity', hold ? (0.25 + 0.2 * Math.sin(now / 240)).toFixed(2) : 0); ok.setAttribute('opacity', hold ? Math.min(1, (ms - 3500) / 300) : 0); up.setAttribute('opacity', ms > 2500 && ms < 5500 ? 1 : 0);
  };
  const p = { raf: 0, t0: 0, off: false, start() { if (reduce()) { draw(4200, 0); return; } const tick = (now) => { if (p.off) return; p.t0 ||= now; draw(now - p.t0, now); p.raf = requestAnimationFrame(tick); }; p.raf = requestAnimationFrame(tick); }, stop() { p.off = true; cancelAnimationFrame(p.raf); } };
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
