/** fig3d-char.js — tokoh 3D (baju koko hijau, celana biru tua, peci hitam berpita emas) untuk fig3d.js.
 *  buildChar(rig, out) menyusun primitif dari "rangka" 3D; rigFromF() mengubah sendi tampak-samping (fk() di guide.js) menjadi rangka 3D. */
import { v3, pill, ell, meshCmd, MAT, basis, IDENT } from './fig3d.js';
const { add, sub, mul, dot, cross, nrm, mix, len } = v3;
const RAD = Math.PI / 180, cl = (x, a, b) => Math.max(a, Math.min(b, x));
export const COL = {
  shirt: [0.12, 0.60, 0.32], shirtL: [0.24, 0.76, 0.46], shirtD: [0.07, 0.42, 0.23], cuff: [0.09, 0.52, 0.29], pants: [0.14, 0.22, 0.40], pantsD: [0.09, 0.15, 0.28],
  skin: [0.93, 0.70, 0.54], skinD: [0.82, 0.55, 0.41], peci: [0.075, 0.075, 0.09], gold: [0.88, 0.70, 0.32], hair: [0.11, 0.08, 0.07], shoe: [0.07, 0.08, 0.10],
  white: [1, 1, 1], iris: [0.30, 0.18, 0.11], pupil: [0.03, 0.03, 0.04], lip: [0.74, 0.34, 0.31], cheek: [0.97, 0.60, 0.52], lipL: [0.80, 0.42, 0.38], brow: [0.16, 0.10, 0.08], tooth: [0.98, 0.96, 0.92], mouthIn: [0.42, 0.12, 0.12],
};
const SIDE = [0, 0, 1];

/** IK 2-ruas 3D: bahu s → target t, panjang l1/l2, pole = arah tekukan siku yang disukai. */
export function ik3(s, t, l1, l2, pole) {
  let d = sub(t, s), dist = len(d) || 1e-6; const mx = l1 + l2 - 0.02; if (dist > mx) { t = add(s, mul(d, mx / dist)); d = sub(t, s); dist = mx; }
  const u = mul(d, 1 / dist), a = (dist * dist + l1 * l1 - l2 * l2) / (2 * dist), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  let pp = sub(pole, mul(u, dot(pole, u))); if (len(pp) < 1e-3) pp = [0, 0, 1]; pp = nrm(pp);
  return { e: add(add(s, mul(u, a)), mul(pp, h)), w: t };
}

/** Tangan: telapak + 4 jari (2 ruas) + ibu jari. f = arah jari, n = sisi telapak, o = { gr: menggenggam, fp: telunjuk terangkat, sgn: sisi tubuh (+1 dekat) } */
function buildHand(W, f, n, o, out) {
  const HS = 1.45, sk = COL.skin, P = (...a) => out.push(pill(...a)), E = (...a) => out.push(ell(...a));
  let b = cross(n, f); if (dot(b, [0.5, -0.5, -0.8 * (o.sgn || 1)]) < 0) b = mul(b, -1); b = nrm(b);
  const at = (a, bb, c) => add(W, add(mul(f, a * HS), add(mul(b, bb * HS), mul(n, c * HS))));
  E(at(3.5, 0, 0), [2.9 * HS, 1.55 * HS, 3.7 * HS], [b, n, f], sk, { mat: MAT.skin });
  const gr = cl(o.gr || 0, 0, 1), fp = cl(o.fp || 0, 0, 1), LEN = [3.5, 3.9, 3.6, 2.8], OFF = [2.0, 0.7, -0.6, -1.9];
  for (let i = 0; i < 4; i++) {
    const point = i === 0 && fp > 0.02, c = point ? 0.06 * (1 - fp) + 0.1 : Math.max(0.1 + gr * 0.82, i > 0 ? fp * 0.97 : 0), sp = point ? fp * 0.12 : 0;
    const t1 = c * 82 * RAD, t2 = t1 + c * 74 * RAD, L1 = LEN[i] * HS * 0.56, L2 = LEN[i] * HS * 0.46, base = at(6.5, OFF[i], 0);
    const d1 = nrm(add(add(mul(f, Math.cos(t1)), mul(n, Math.sin(t1))), mul(b, sp))), d2 = nrm(add(mul(f, Math.cos(t2)), mul(n, Math.sin(t2)))), p2 = add(base, mul(d1, L1)), p3 = add(p2, mul(d2, L2));
    P(base, p2, 1.0 * HS, 0.92 * HS, sk, { mat: MAT.skin, ref: b }); P(p2, p3, 0.92 * HS, 0.8 * HS, sk, { mat: MAT.skin, ref: b });
  }
  const g2 = Math.max(gr, fp), rest = nrm(add(mul(f, 0.9), mul(b, 0.5))), grip = nrm(add(add(mul(f, 0.35), mul(b, 0.15)), mul(n, 0.95))), td = nrm(mix(rest, grip, g2)), tb = at(2.2, 2.5, 0.2);
  const t1 = add(tb, mul(td, 2.7 * HS)), td2 = nrm(mix(td, grip, 0.5)), t2 = add(t1, mul(td2, 2.3 * HS));
  P(tb, t1, 1.15 * HS, 1.0 * HS, sk, { mat: MAT.skin, ref: n }); P(t1, t2, 1.0 * HS, 0.88 * HS, sk, { mat: MAT.skin, ref: n });
}

/** Kepala + wajah ramah bergaya 3D animasi: mata besar berkelopak, alis halus, hidung kecil, senyum, telinga, rambut + peci.
 *  Hd = { C, roll°, yaw°, blink 0..1, gaze:[x,y], smile 0..1, brow: -1..1 } */
function buildHead(Hd, out) {
  const { C } = Hd, th = Hd.roll * RAD, ct = Math.cos(th), st = Math.sin(th), ph = (Hd.yaw || 0) * RAD, cp = Math.cos(ph), sp = Math.sin(ph);
  const M = 1.2, hv0 = (f, u, s) => { const fx = f * cp - s * sp, fz = f * sp + s * cp; return [fx * ct + u * st, fx * st - u * ct, fz]; }, hv = (f, u, s) => mul(hv0(f, u, s), M), hp = (f, u, s) => add(C, hv(f, u, s));
  const ax = [hv0(0, 0, 1), hv0(1, 0, 0), hv0(0, 1, 0)], E = (c, r, col, o) => out.push(ell(c, [r[0] * M, r[1] * M, r[2] * M], ax, col, o)), P = (a, b, r0, r1, ...z) => out.push(pill(a, b, r0 * M, r1 * M, ...z));
  const SK = COL.skin, surf = (s, u) => Math.max(9.0 * Math.sqrt(Math.max(0.02, 1 - (s / 8.9) ** 2 - ((u + 0.4) / 9.4) ** 2)) + 0.4, 7.2 * Math.sqrt(Math.max(0.02, 1 - (s / 7.6) ** 2 - ((u + 4.2) / 5.8) ** 2)) + 1.0);
  E(hp(0.4, -0.4, 0), [8.9, 9.2, 9.4], SK, { mat: MAT.skin });                               // tengkorak
  E(hp(1.0, -4.3, 0), [7.7, 7.2, 5.8], SK, { mat: MAT.skin });                               // pipi & rahang
  E(hp(2.6, -8.3, 0), [3.7, 3.5, 2.5], SK, { mat: MAT.skin });                               // dagu
  E(hp(-3.6, 2.2, 0), [8.0, 5.6, 6.4], COL.hair, { mat: MAT.hair });                          // rambut belakang
  for (const s of [8.1, -8.1]) E(hp(-0.6, 3.4, s), [1.0, 2.0, 2.2], COL.hair, { mat: MAT.hair }); // cambang
  for (const s of [9.1, -9.1]) { E(hp(-0.8, 0.3, s), [1.15, 1.7, 2.5], COL.skinD, { mat: MAT.skin }); E(hp(-0.4, 0.3, s * 0.99), [0.5, 1.0, 1.5], [0.82, 0.52, 0.40], { mat: MAT.skin, sh: false }); } // telinga
  const sm = Hd.smile ?? 0.8, bl = cl(Hd.blink || 0, 0, 1), gz = Hd.gaze || [0, 0];
  for (const sg of [1, -1]) { // mata
    const s = 4.5 * sg, u = 0.9, fe = surf(s, u) - 0.9, c = hp(fe, u, s);
    E(c, [2.55, 1.35, 2.55], COL.white, { mat: MAT.eye });
    const gx = gz[0] * 1.0, gy = gz[1] * 1.0;
    E(hp(fe + 0.95, u + gy, s + gx), [2.05, 0.55, 2.2], COL.iris, { mat: MAT.eye });
    E(hp(fe + 1.3, u + gy, s + gx), [1.1, 0.45, 1.2], COL.pupil, { mat: MAT.eye });
    E(hp(fe + 1.7, u + 0.8 + gy, s - 0.6 * sg + gx), [0.55, 0.3, 0.6], COL.white, { mat: MAT.eye, sh: false });
    E(hp(fe + 1.6, u - 0.8 + gy, s + 0.7 * sg + gx), [0.28, 0.25, 0.3], COL.white, { mat: MAT.eye, sh: false });
    const lid = 0.08 + 0.92 * bl;                                                                // kelopak atas: sedikit menutup, penuh saat berkedip
    if (bl > 0.04) E(hp(fe + 0.8, u + 2.8 - 3.2 * bl, s), [2.9, 1.7, 2.9 * bl + 0.3], SK, { mat: MAT.skin, sh: false });
    const ln = [-2.9, -1.5, 0, 1.5, 2.9].map((d) => { const uu = u + 2.5 - 3.0 * lid + (1 - Math.abs(d) / 2.9) * 0.45 - 0.2; return hp(surf(s + d, uu) + 0.15, uu, s + d); });
    for (let i = 0; i < 4; i++) P(ln[i], ln[i + 1], 0.2, 0.2, COL.brow, { mat: MAT.hair, sh: false });
    const bu = 5.5 + 0.5 * (Hd.brow || 0) - 0.8 * bl, bp = [-3.0, 0, 3.0].map((d, i) => { const ss = s + sg * d * 0.95, uu = bu + (i === 1 ? 0.7 : (i === 0 ? 0.5 : -0.2)); return hp(surf(ss, uu) - 0.1, uu, ss); });
    P(bp[0], bp[1], 0.27, 0.3, COL.brow, { mat: MAT.hair, sh: false }); P(bp[1], bp[2], 0.3, 0.24, COL.brow, { mat: MAT.hair, sh: false });
  }
  E(hp(surf(0, -1.4) + 0.5, -1.5, 0), [1.2, 1.1, 1.7], SK, { mat: MAT.skin });              // hidung
  for (const sg of [1, -1]) E(hp(surf(5.9 * sg, -2.6) - 0.5, -2.6, 5.9 * sg), [1.7, 0.55, 1.2], COL.cheek, { mat: MAT.skin, sh: false, a: 0.55 }); // semu pipi tipis
  { const n = 10, pts = []; for (let i = 0; i <= n; i++) { const t = i / n * 2 - 1, s = t * (3.1 + 0.5 * sm), uu = -5.0 + (0.4 + 1.5 * sm) * t * t - 0.15 * sm; pts.push(hp(surf(s, uu) + 0.15, uu, s)); }
    for (let i = 0; i < n; i++) P(pts[i], pts[i + 1], 0.34, 0.34, COL.lip, { mat: MAT.lip, sh: false });
    const lo = hp(surf(0, -6.3) + 0.2, -6.0, 0); E(lo, [1.7, 0.5, 0.7], COL.lipL, { mat: MAT.lip, sh: false }); }
  { const p0 = hp(-0.5, 7.3, 0), p1 = hp(-0.5, 10.2, 0); out.push(pill(p0, p1, 8.15 * M, 7.5 * M, COL.peci, { k: [1, 1.05, 0.2], ref: hv0(0, 0, 1), mat: MAT.hair }));
    out.push(meshCmd(Hd.torus, [hv0(0, 0, 1), hv0(0, 1, 0), hv0(1, 0, 0)], [7.85 * M, 4.4 * M, 8.3 * M], hp(-0.5, 7.9, 0), COL.gold, { mat: MAT.gold })); }
  out.push(pill(add(C, hv(-1.0, -5.0, 0)), Hd.neckBase, 4.3, 4.6, SK, { mat: MAT.skin }));       // leher (terlihat)
}

/** rangka → primitif. rig: { H, S, C, legs:[{H,K,A,toe}], arms:[{sh,tg,pole,l1,l2,sgn,hand}], head, br, shoe, twist } */
export function buildChar(R, out) {
  const P = (...a) => out.push(pill(...a)), E = (...a) => out.push(ell(...a)), { H, S } = R, ax = nrm(sub(S, H)), fw = nrm([-ax[1], ax[0], 0]), br = 1 + 0.03 * (R.br || 0);
  const tw = (R.twist || 0) * RAD, TREF = [Math.sin(tw), 0, Math.cos(tw)];
  const at = (t, w = 0, z = 0) => add(add(mix(H, S, t), mul(fw, w)), [0, 0, z]);
  // kaki + celana
  for (const L of R.legs) {
    P(L.H, L.K, 7.4, 5.9, COL.pants, { ref: SIDE }); P(L.K, L.A, 6.0, 4.1, COL.pants, { ref: SIDE });
    const d = nrm(sub(L.A, L.K)); P(sub(L.A, mul(d, 4.4)), add(L.A, mul(d, 0.4)), 4.8, 4.8, COL.pantsD, { ref: SIDE });
    const td = nrm(sub(L.toe, L.A));
    if (R.shoe) { P(sub(L.A, mul(td, 1.2)), add(L.toe, mul(td, 2.4)), 4.6, 3.9, COL.shoe, { k: [1.08, 0.82, 1], ref: SIDE, mat: MAT.gloss }); P(sub(L.A, mul(td, 0.8)), add(L.toe, mul(td, 1.6)), 4.4, 3.8, [0.78, 0.76, 0.72], { k: [1.06, 0.2, 1], ref: SIDE, sh: false }); }
    else { P(sub(L.A, mul(td, 0.6)), L.toe, 3.7, 2.7, COL.skin, { k: [1.1, 0.8, 1], ref: SIDE, mat: MAT.skin }); E(add(L.toe, mul(td, 0.3)), [2.7, 2.0, 2.5], [SIDE, [0, -1, 0], td], COL.skinD, { mat: MAT.skin }); }
  }
  // baju koko: bahu miring → dada → pinggang → ujung baju lurus
  E(at(0.9, 0, 0), [13.0, 8.6, 5.2], [TREF, fw, ax], COL.shirt, { mat: MAT.shirt });
  P(at(0.42), at(0.9), 9.3 * br, 8.8, COL.shirt, { k: [1.4, 1, 1], ref: TREF, mat: MAT.shirt });
  P(at(-0.06), at(0.44), 9.4, 9.3 * br, COL.shirt, { k: [1.4, 1, 1], ref: SIDE, mat: MAT.shirt });
  { const K0 = R.legs[0].K, hk = mix(H, [K0[0], K0[1], 0], 0.36); E(add(H, mul(ax, 1.5)), [14.0, 9.9, 9.4], [SIDE, fw, ax], COL.shirt, { mat: MAT.shirt, ao: 0.9 }); P(at(0.08), hk, 10.5, 10.3, COL.shirt, { k: [1.46, 1, 0.34], ref: SIDE, mat: MAT.shirt, ao: 0.9 }); }  // ujung baju mengikuti paha
  P(at(0.92, 9.0, 1.0), at(-0.34, 9.9, 1.0), 1.15, 1.15, COL.shirtL, { mat: MAT.shirt });
  for (let i = 0; i < 4; i++) E(at(0.8 - i * 0.19, 9.9 + 0.3 * i, 1.0), [1.0, 1.0, 0.6], [SIDE, fw, ax], COL.white, { mat: MAT.gloss, sh: false });
  { const pc = at(0.6, 8.2, 5.7), nz = nrm(add(fw, [0, 0, 0.45])); // saku dada + garis atas
    E(add(pc, mul(fw, 0.4)), [3.9, 0.5, 4.5], [SIDE, nz, ax], COL.cuff, { mat: MAT.shirt, sh: false });
    const top = add(pc, add(mul(ax, 4.4), mul(fw, 0.7))); P(add(top, [0, 0, -3.7]), add(top, [0, 0, 3.7]), 0.35, 0.35, COL.shirtD, { mat: MAT.shirt, sh: false }); }
  const Sn = at(0.965), Cn = nrm(sub(R.head.C, Sn)); P(Sn, add(Sn, mul(Cn, 3.0)), 4.9, 4.5, COL.shirtL, { mat: MAT.shirt, ref: SIDE });  // kerah berdiri
  // lengan
  for (const A of R.arms) {
    const { e, w } = ik3(A.sh, A.tg, A.l1, A.l2, A.pole), dir = nrm(sub(w, e));
    E(A.sh, [5.0, 5.0, 5.0], IDENT, COL.shirt, { mat: MAT.shirt });
    P(A.sh, e, 4.4, 3.7, COL.shirt, { mat: MAT.shirt }); E(e, [3.7, 3.7, 3.7], IDENT, COL.shirt, { mat: MAT.shirt }); P(e, w, 3.7, 3.0, COL.shirt, { mat: MAT.shirt });
    P(mix(e, w, 0.84), add(w, mul(dir, 0.5)), 3.4, 3.4, COL.cuff, { mat: MAT.shirt });
    let f, n; const h = A.hand;
    if (h.f) { f = nrm(h.f); n = nrm(h.n); } else {
      const a2 = Math.atan2(w[1] - e[1], w[0] - e[0]) / RAD, d = ((h.ha - a2 + 540) % 360) - 180, rot = (a2 + d * (h.hw || 0)) * RAD; f = [Math.cos(rot), Math.sin(rot), 0];
      const nIn = [0, 0, -A.sgn], nPl = [-f[1], f[0], 0]; n = nrm(mix(nIn, nPl, cl(h.hp ?? 0, 0, 1)));
      if (dot(n, nPl) < 0 && (h.hp ?? 0) > 0.9) n = mul(n, -1);
    }
    buildHand(add(w, mul(dir, 0.3)), f, n, { gr: h.gr, fp: h.fp, sgn: A.sgn }, out);
    A.out = { e, w, f, n };
  }
  const hd = R.head; hd.neckBase = Sn; hd.torus = R.torus; hd.C = add(hd.C, mul(Cn, 2.3)); buildHead(hd, out);   // kepala sedikit naik: leher terlihat
}

/* ===== rangka dari sendi tampak samping (fk) ===== */
const L_UA = 24, L_FA = 22, ZH = 6.0, ZS = 12.4;
export function rigFromF(F, torus, o = {}) {
  const lz = (p, z) => [p[0], p[1], z], arms = [];
  for (const sgn of [1, -1]) { // sisi dekat (+z) lalu jauh (-z)
    const sh = lz(mix(F.S, F.H, 0.1), sgn * ZS), hz = F.hz || 0, tg = [F.T[0], F.T[1], sgn * ZS * (1 - hz)];
    const d = [tg[0] - sh[0], tg[1] - sh[1]], dl = Math.hypot(d[0], d[1]) || 1, perp = [-d[1] / dl, d[0] / dl], bs = F.bend >= 0 ? 1 : -1;
    arms.push({ sh, tg, pole: [perp[0] * bs, perp[1] * bs, sgn * 0.5], l1: L_UA * F.as, l2: L_FA * F.as * F.fs, sgn, hand: { ha: F.ha, hw: F.hw, hp: F.hp || 0, gr: F.gr, fp: F.fp } });
  }
  const legs = [{ H: lz(F.H, ZH), K: lz(F.K, ZH), A: lz(F.A, ZH), toe: lz(F.toe, ZH) }, { H: lz(F.H, -ZH), K: lz(F.K2, -ZH), A: lz(F.A2, -ZH), toe: lz(F.toe2, -ZH) }];
  const roll = F.an[2] + 0.4 * (F.an[3] - F.an[2]);
  return { H: lz(F.H, 0), S: lz(F.S, 0), legs, arms, br: F.br, torus, shoe: o.shoe, head: { C: lz(F.C, 0), roll, yaw: F.turn * 70 + (o.yaw ?? 24), blink: Math.max(o.blink || 0, F.ec || 0), gaze: o.gaze, smile: o.smile ?? 0.6, brow: -0.6 * (F.ec || 0) } };
}
