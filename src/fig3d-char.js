/** fig3d-char.js — tokoh 3D (baju koko hijau, celana biru tua, peci hitam berpita emas) untuk fig3d.js.
 *  buildChar(rig, out) menyusun primitif dari "rangka" 3D; rigFromF() mengubah sendi tampak-samping (fk() di guide.js) menjadi rangka 3D. */
import { v3, pill, ell, meshCmd, MAT, basis, IDENT } from './fig3d.js';
const { add, sub, mul, dot, cross, nrm, mix, len } = v3;
const RAD = Math.PI / 180, RAD_ = Math.PI / 180, cl = (x, a, b) => Math.max(a, Math.min(b, x));
export const COL = {
  shirt: [0.11, 0.58, 0.36], shirtL: [0.26, 0.74, 0.50], shirtD: [0.06, 0.40, 0.25], cuff: [0.09, 0.50, 0.31], pants: [0.17, 0.24, 0.40], pantsD: [0.11, 0.17, 0.29],
  skin: [0.90, 0.66, 0.48], skinD: [0.76, 0.50, 0.36], peci: [0.075, 0.075, 0.09], gold: [0.88, 0.70, 0.32], hair: [0.11, 0.08, 0.07], shoe: [0.07, 0.08, 0.10],
  white: [1, 1, 1], iris: [0.26, 0.15, 0.09], pupil: [0.03, 0.03, 0.04], lip: [0.70, 0.34, 0.30], cheek: [0.95, 0.56, 0.46], lipL: [0.80, 0.42, 0.38], brow: [0.16, 0.10, 0.08], tooth: [0.98, 0.96, 0.92], mouthIn: [0.42, 0.12, 0.12],
};
const PAL1 = { ...COL };
/** Gaya "v2" (referensi film animasi 3D): kulit cerah, baju hijau polos berkerah mandarin, celana navy tergulung, songkok hitam tinggi berpita emas */
const PAL2 = { shirt: [0.34, 0.62, 0.38], shirtL: [0.40, 0.68, 0.44], shirtD: [0.27, 0.52, 0.32], cuff: [0.31, 0.58, 0.36], pants: [0.15, 0.19, 0.34], pantsD: [0.18, 0.23, 0.40],
  skin: [0.97, 0.79, 0.65], skinD: [0.88, 0.65, 0.52], peci: [0.06, 0.06, 0.07], gold: [0.86, 0.70, 0.40], hair: [0.09, 0.07, 0.07], iris: [0.34, 0.19, 0.10], lip: [0.80, 0.45, 0.42], cheek: [0.98, 0.66, 0.58], brow: [0.10, 0.07, 0.06] };
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
  const HS = 1.12, sk = COL.skin, sd = COL.skinD, P = (...a) => out.push(pill(...a)), E = (...a) => out.push(ell(...a));
  let b = cross(n, f); if (dot(b, [0.5, -0.5, -0.8 * (o.sgn || 1)]) < 0) b = mul(b, -1); b = nrm(b);
  const at = (a, bb, c) => add(W, add(mul(f, a * HS), add(mul(b, bb * HS), mul(n, c * HS))));
  // pergelangan ramping menyambung manset, lalu telapak yang melebar ke arah jari (tidak bulat gemuk)
  P(at(-0.6, 0, 0), at(1.6, 0, 0), 2.6 * HS, 2.7 * HS, sk, { mat: MAT.skin, ref: b, k: [1.25, 0.8, 1] });
  E(at(3.9, 0.1, 0), [2.75 * HS, 1.25 * HS, 3.3 * HS], [b, n, f], sk, { mat: MAT.skin });
  E(at(5.6, 0, -0.15), [2.8 * HS, 1.0 * HS, 2.0 * HS], [b, n, f], sk, { mat: MAT.skin, sh: false });  // pangkal jari (lebar buku jari)
  E(at(3.0, 2.0, 0.55), [1.75 * HS, 1.2 * HS, 2.3 * HS], [b, n, f], sk, { mat: MAT.skin, sh: false });  // tonjolan pangkal ibu jari
  const gr = cl(o.gr || 0, 0, 1), fp = cl(o.fp || 0, 0, 1), fl = cl(o.fl || 0, 0, 1);
  const LEN = [3.7, 4.1, 3.8, 3.0], OFF = [1.95, 0.65, -0.65, -1.9], SEG = [0.46, 0.33, 0.27], RAD = [0.98, 0.9, 0.8, 0.7];
  for (let i = 0; i < 4; i++) {
    const point = i === 0 && fp > 0.02;
    const relax = 0.11 + 0.045 * i + 0.05 * Math.sin(i * 1.7);                                        // jari santai: sedikit melengkung, tiap jari beda
    let c = point ? 0.03 + 0.05 * (1 - fp) : Math.max(relax + gr * (0.98 - relax), i > 0 ? fp * 0.98 : 0);
    if (fl > 0.5) c = Math.max(c, 0.6 + 0.05 * i);                                                       // memegang HP: jari melingkari tepi HP
    const sp = point ? fp * 0.1 : 0.02 * (i - 1.5);                                                      // sedikit renggang
    const a1 = c * 80 * RAD_, a2 = a1 + c * 92 * RAD_ * (1 - 0.62 * fl), a3 = a2 + c * 48 * RAD_ * (1 - 0.62 * fl);
    const base = at(7.0, OFF[i], 0), Ls = SEG.map((q) => LEN[i] * HS * q * 1.16);
    const dir = (t, sx) => nrm(add(add(mul(f, Math.cos(t)), mul(n, Math.sin(t))), mul(b, sx)));
    const d1 = dir(a1, sp), d2 = dir(a2, sp * 0.5), d3 = dir(a3, 0), p1 = add(base, mul(d1, Ls[0])), p2 = add(p1, mul(d2, Ls[1])), p3 = add(p2, mul(d3, Ls[2]));
    P(base, p1, RAD[i] * HS, RAD[i] * 0.93 * HS, sk, { mat: MAT.skin, ref: b }); P(p1, p2, RAD[i] * 0.93 * HS, RAD[i] * 0.84 * HS, sk, { mat: MAT.skin, ref: b }); P(p2, p3, RAD[i] * 0.84 * HS, RAD[i] * 0.72 * HS, sk, { mat: MAT.skin, ref: b });
    E(add(p3, mul(d3, 0.15 * HS)), [0.7 * HS, 0.55 * HS, 0.7 * HS], [b, n, d3], sk, { mat: MAT.skin, sh: false });                               // ujung jari membulat
  }
  const g2 = Math.max(gr, fp), rest = nrm(add(add(mul(f, 0.95), mul(b, 0.16)), mul(n, 0.12))), grip = nrm(add(add(mul(f, 0.35), mul(b, 0.15)), mul(n, 0.95))), td = nrm(mix(rest, grip, g2 * 0.6)), tb = at(2.6, 2.0, 0.35);
  const t1 = add(tb, mul(td, 2.4 * HS)), td2 = nrm(mix(td, grip, 0.45)), t2 = add(t1, mul(td2, 2.1 * HS)), td3 = nrm(mix(td2, grip, 0.3)), t3 = add(t2, mul(td3, 1.4 * HS));
  P(tb, t1, 1.22 * HS, 1.0 * HS, sk, { mat: MAT.skin, ref: n }); P(t1, t2, 1.0 * HS, 0.88 * HS, sk, { mat: MAT.skin, ref: n }); P(t2, t3, 0.88 * HS, 0.74 * HS, sk, { mat: MAT.skin, ref: n });
}

/** Kepala + wajah ramah bergaya film animasi 3D: kepala bulat telur yang mulus, mata besar menghadap tegak lurus permukaan wajah (tidak juling),
 *  alis tipis melengkung, hidung kecil, senyum lembut, telinga, rambut + peci.  Hd = { C, roll°, yaw°, blink 0..1, gaze:[x,y], smile 0..1, brow: -1..1 } */
function buildHead(Hd, out) {
  const { C } = Hd, th = Hd.roll * RAD, ct = Math.cos(th), st = Math.sin(th), ph = (Hd.yaw || 0) * RAD, cp = Math.cos(ph), sp = Math.sin(ph);
  const M = Hd.v2 ? 1.38 : 1.27, hv0 = (f, u, s) => { const fx = f * cp - s * sp, fz = f * sp + s * cp; return [fx * ct + u * st, fx * st - u * ct, fz]; }, hv = (f, u, s) => mul(hv0(f, u, s), M), hp = (f, u, s) => add(C, hv(f, u, s));
  const ax = [hv0(0, 0, 1), hv0(1, 0, 0), hv0(0, 1, 0)], E = (c, r, col, o) => out.push(ell(c, [r[0] * M, r[1] * M, r[2] * M], ax, col, o)), P = (a, b, r0, r1, ...z) => out.push(pill(a, b, r0 * M, r1 * M, ...z));
  const V2 = !!Hd.v2, SK = COL.skin, HC = [0.3, -1.2], LR = V2 ? 7.7 : 7.4, FR = V2 ? 8.7 : 8.5, UR = V2 ? 10.0 : 10.3;   // kepala lonjong: lebar 7.4 (dulu 9.0) supaya wajah tidak melebar seperti labu
  const surf = (s, u) => HC[0] + FR * Math.sqrt(Math.max(0.02, 1 - (s / LR) ** 2 - ((u - HC[1]) / UR) ** 2));
  const nrmAt = (s, u) => { const f = surf(s, u), n = [(f - HC[0]) / (FR * FR), (u - HC[1]) / (UR * UR), s / (LR * LR)], l = Math.hypot(...n); return hv0(n[0] / l, n[1] / l, n[2] / l); };
  /** elipsoid yang menempel di permukaan wajah dan menghadap keluar (tegak lurus) */
  const FP = (s, u, rw, rh, rd, off, col, o) => {
    const n = nrmAt(s, u), upw = hv0(0, 1, 0); let t = sub(upw, mul(n, dot(upw, n))); t = nrm(t); const sd = nrm(cross(t, n));
    out.push(ell(add(hp(surf(s, u), u, s), mul(n, off * M)), [rw * M, rh * M, rd * M], [sd, t, n], col, o));
  };
  E(hp(HC[0], HC[1], 0), [LR, FR, UR], SK, { mat: MAT.skin });                                // tengkorak
  E(hp(1.5, -6.3, 0), [4.9, 5.6, 4.4], SK, { mat: MAT.skin });                                    // rahang & dagu (garis wajah tegas, tidak bulat polos)
  E(hp(-2.2, 1.4, 0), [7.85, 8.1, 9.8], COL.hair, { mat: MAT.hair });                              // rambut belakang
  for (const s of [6.7, -6.7]) E(hp(-0.6, 2.2, s), [0.8, 2.3, 2.2], COL.hair, { mat: MAT.hair }); // cambang rapi
  for (const s of [LR - 0.1, -(LR - 0.1)]) { E(hp(-0.6, -0.8, s), [V2 ? 1.1 : 0.9, V2 ? 1.6 : 1.4, V2 ? 2.2 : 2.0], COL.skinD, { mat: MAT.skin }); E(hp(-0.2, -0.8, s * 0.99), [0.4, 0.8, 1.2], [0.78, 0.48, 0.36], { mat: MAT.skin, sh: false }); } // telinga
  const sm = Hd.smile ?? 0.7, bl = cl(Hd.blink || 0, 0, 1), gz = Hd.gaze || [0, 0];
  for (const sg of [1, -1]) { // mata: bentuk almond bersih, iris besar berwarna cokelat hangat, tanpa kelopak yang menonjol
    const s = 3.5 * sg, u = -0.1, gx = gz[0] * 0.4 * sg * sg, gy = gz[1] * 0.4, open = 1 - 0.92 * bl;
    FP(s, u, V2 ? 1.95 : 1.7, (V2 ? 1.65 : 1.4) * open + 0.12, 0.9, -0.3, COL.white, { mat: MAT.eye });
    if (bl < 0.8) {
      FP(s + gx, u + gy, V2 ? 1.5 : 1.2, (V2 ? 1.6 : 1.3) * open + 0.1, 0.5, 0.25, COL.iris, { mat: MAT.eye });
      FP(s + gx, u + gy, V2 ? 0.78 : 0.62, (V2 ? 0.84 : 0.68) * open + 0.05, 0.35, 0.55, COL.pupil, { mat: MAT.eye });
      FP(s + gx - 0.5 * sg, u + gy + 0.55 * open, V2 ? 0.46 : 0.36, V2 ? 0.44 : 0.34, 0.25, 0.85, COL.white, { mat: MAT.eye, sh: false });
    }
    if (bl > 0.1) FP(s, u, 1.95, 1.5 * bl + 0.1, 1.1, 0.2, SK, { mat: MAT.skin, sh: false });                      // kelopak menutup saat berkedip / mata terpejam
    const top = u + 1.65 * open + 0.12, arc = (d) => top + 0.5 * (1 - (d / 1.95) ** 2) - 0.1;
    const lash = [-1.85, -0.9, 0, 0.9, 1.85].map((d) => { const uu = arc(d); return hp(surf(s + d, uu) + 0.14, uu, s + d); });
    for (let i = 0; i < 4; i++) P(lash[i], lash[i + 1], 0.2, 0.2, COL.pupil, { mat: MAT.hair, sh: false });          // garis kelopak atas tegas
    const cr = [-1.7, 0, 1.7].map((d) => { const uu = arc(d) + 0.75; return hp(surf(s + d, uu) + 0.1, uu, s + d); });
    P(cr[0], cr[1], 0.13, 0.13, COL.skinD, { mat: MAT.skin, sh: false, a: 0.7 }); P(cr[1], cr[2], 0.13, 0.13, COL.skinD, { mat: MAT.skin, sh: false, a: 0.7 }); // lipatan kelopak halus
    const bu = u + 4.0 + 0.3 * (Hd.brow || 0) - 0.2 * bl, bp = [-1.9, 0, 2.1].map((d, i) => { const ss = s + sg * d, uu = bu + (i === 1 ? 0.45 : (i === 0 ? 0.1 : -0.25)); return hp(surf(ss, uu) - 0.05, uu, ss); });
    const bt = V2 ? 1.35 : 1; P(bp[0], bp[1], 0.3 * bt, 0.32 * bt, COL.brow, { mat: MAT.hair, sh: false }); P(bp[1], bp[2], 0.32 * bt, 0.22 * bt, COL.brow, { mat: MAT.hair, sh: false });
  }
  if (!V2) FP(0, -2.2, 0.62, 1.4, 0.9, -0.05, SK, { mat: MAT.skin });                                          // batang hidung
  FP(0, V2 ? -3.4 : -3.7, V2 ? 0.95 : 1.15, V2 ? 0.7 : 0.85, V2 ? 0.8 : 0.9, 0.1, SK, { mat: MAT.skin });                                        // ujung hidung
  for (const sg of [1, -1]) FP(4.6 * sg, -3.7, 1.5, 1.0, 0.5, -0.1, COL.cheek, { mat: MAT.skin, sh: false, a: V2 ? 0.16 : 0.28 }); // semu pipi tipis
  { const n = 10, pts = []; for (let i = 0; i <= n; i++) { const t = i / n * 2 - 1, s = t * ((V2 ? 1.5 : 1.9) + 0.45 * sm), uu = -6.0 + (0.2 + 0.9 * sm) * t * t - 0.1 * sm; pts.push(hp(surf(s, uu) + 0.14, uu, s)); }
    for (let i = 0; i < n; i++) P(pts[i], pts[i + 1], V2 ? 0.22 : 0.3, V2 ? 0.22 : 0.3, COL.lip, { mat: MAT.lip, sh: false }); }
  if (V2) {  // songkok tinggi lurus dengan sedikit melebar ke atas, pita emas di pangkalnya
    const p0 = hp(-0.4, 6.6, 0), p1 = hp(-0.4, 12.2, 0); out.push(pill(p0, p1, 7.15 * M, 7.5 * M, COL.peci, { k: [1, 1.04, 0.22], ref: hv0(0, 0, 1), mat: MAT.hair }));
    out.push(meshCmd(Hd.torus, [hv0(0, 0, 1), hv0(0, 1, 0), hv0(1, 0, 0)], [7.1 * M, 3.3 * M, 7.5 * M], hp(-0.4, 6.9, 0), COL.gold, { mat: MAT.gold }));
  } else { const p0 = hp(-0.5, 6.8, 0), p1 = hp(-0.5, 9.8, 0); out.push(pill(p0, p1, 7.0 * M, 6.6 * M, COL.peci, { k: [1, 1.05, 0.2], ref: hv0(0, 0, 1), mat: MAT.hair }));
    out.push(meshCmd(Hd.torus, [hv0(0, 0, 1), hv0(0, 1, 0), hv0(1, 0, 0)], [6.8 * M, 4.4 * M, 7.6 * M], hp(-0.5, 7.4, 0), COL.gold, { mat: MAT.gold })); }
  out.push(pill(add(C, hv(-1.2, -4.5, 0)), Hd.neckBase, 4.4, 4.9, SK, { mat: MAT.skin }));       // leher lebih kokoh
}

/** rangka → primitif. rig: { H, S, C, legs:[{H,K,A,toe}], arms:[{sh,tg,pole,l1,l2,sgn,hand}], head, br, shoe, twist } */
export function buildChar(R, out) {
  Object.assign(COL, R.v2 ? PAL2 : PAL1); const V2 = !!R.v2;
  const P = (...a) => out.push(pill(...a)), E = (...a) => out.push(ell(...a)), { H, S } = R, ax = nrm(sub(S, H)), fw = nrm([-ax[1], ax[0], 0]), br = 1 + 0.03 * (R.br || 0);
  const tw = (R.twist || 0) * RAD, TREF = [Math.sin(tw), 0, Math.cos(tw)];
  const at = (t, w = 0, z = 0) => add(add(mix(H, S, t), mul(fw, w)), [0, 0, z]);
  // kaki + celana (paha berisi, betis agak membulat, kaki celana lurus dengan lipatan di bawah, sepatu hitam mengilap)
  for (const L of R.legs) {
    P(L.H, L.K, V2 ? 7.1 : 8.0, V2 ? 6.3 : 6.6, COL.pants, { ref: SIDE }); P(L.K, V2 ? sub(L.A, mul(nrm(sub(L.A, L.K)), 2.8)) : L.A, V2 ? 6.3 : 6.7, V2 ? 4.6 : 4.4, COL.pants, { ref: SIDE });
    const d = nrm(sub(L.A, L.K));
    if (V2) { P(sub(L.A, mul(d, 6.4)), sub(L.A, mul(d, 2.6)), 5.0, 4.9, COL.pantsD, { ref: SIDE }); P(sub(L.A, mul(d, 5.0)), add(L.A, mul(d, 0.8)), 3.2, 3.3, COL.skin, { ref: SIDE, mat: MAT.skin }); }   // celana digulung, pergelangan kaki terlihat
    else P(sub(L.A, mul(d, 4.6)), add(L.A, mul(d, 0.4)), 4.6, 4.6, COL.pantsD, { ref: SIDE });
    const td = nrm(sub(L.toe, L.A));
    if (R.shoe && !V2) { P(sub(L.A, mul(td, 1.4)), add(L.toe, mul(td, 2.6)), 4.7, 4.0, COL.shoe, { k: [1.08, 0.84, 1], ref: SIDE, mat: MAT.gloss }); P(sub(L.A, mul(td, 0.9)), add(L.toe, mul(td, 1.8)), 4.5, 3.9, [0.78, 0.76, 0.72], { k: [1.06, 0.2, 1], ref: SIDE, sh: false }); }
    else { P(sub(L.A, mul(td, 0.6)), L.toe, 3.7, 2.7, COL.skin, { k: [1.1, 0.8, 1], ref: SIDE, mat: MAT.skin }); E(add(L.toe, mul(td, 0.3)), [2.7, 2.0, 2.5], [SIDE, [0, -1, 0], td], COL.skinD, { mat: MAT.skin });
      if (V2) { const inn = L.A[2] > 0 ? -1 : 1; [[2.3, 1.15], [1.05, 0.95], [-0.05, 0.86], [-1.0, 0.78], [-1.9, 0.7]].forEach(([dz, r], i) => E(add(add(L.toe, mul(td, 1.2 - i * 0.12)), [0, 0.7, inn * dz]), [r, r * 0.85, r * 1.15], [SIDE, [0, -1, 0], td], COL.skin, { mat: MAT.skin })); } }  // jari kaki
  }
  // baju koko: bahu lebar dan miring → dada bidang → pinggang sedikit mengecil → ujung baju lurus menutup pinggul
  P(at(0.0), at(0.46), 9.0, 8.5, COL.shirt, { k: [1.45, 1, 1], ref: SIDE, mat: MAT.shirt });           // perut/pinggang sampai ujung baju (satu bentuk mulus, tanpa cincin)
  P(at(0.46), at(0.80), 8.5, 9.5 * br, COL.shirt, { k: [1.56, 1, 1], ref: TREF, mat: MAT.shirt });    // dada
  P(at(0.80), at(0.95), 9.4 * br, 7.6, COL.shirt, { k: [1.6, 1, 1], ref: TREF, mat: MAT.shirt });     // pundak
  { const K0 = R.legs[0].K, hk = mix(H, [K0[0], K0[1], 0], V2 ? 0.24 : 0.2); P(at(0.1), hk, V2 ? 8.6 : 8.8, V2 ? 8.6 : 8.8, COL.shirt, { k: V2 ? [1.34, 1, 0.95] : [1.4, 1, 0.3], ref: SIDE, mat: MAT.shirt }); }  // ujung baju mengikuti paha
  if (V2) P(at(0.93, 8.2, 1.0), at(0.66, 9.4, 1.0), 0.8, 0.8, COL.shirtD, { mat: MAT.shirt, sh: false });   // plaket pendek berujung bulat (seperti referensi)
  else P(at(0.92, 9.0, 1.0), at(-0.08, 9.9, 1.0), 1.1, 1.1, COL.shirtL, { mat: MAT.shirt });
  if (!V2) for (let i = 0; i < 4; i++) E(at(0.8 - i * 0.19, 9.9 + 0.3 * i, 1.0), [1.0, 1.0, 0.6], [SIDE, fw, ax], COL.white, { mat: MAT.gloss, sh: false });
  if (!V2) { const pt0 = at(0.74, 8.35, 5.6), pt1 = at(0.55, 8.6, 5.6);   // saku dada: tambalan persegi tipis + garis atas
    out.push(pill(pt0, pt1, 0.55, 0.55, COL.cuff, { k: [6.4, 1, 1], ref: SIDE, mat: MAT.shirt, sh: false }));
    P(add(pt0, [0, 0, -3.6]), add(pt0, [0, 0, 3.6]), 0.3, 0.3, COL.shirtD, { mat: MAT.shirt, sh: false }); }
  const Sn = at(0.965), Cn = nrm(sub(R.head.C, Sn)); P(Sn, add(Sn, mul(Cn, V2 ? 2.6 : 3.0)), V2 ? 4.7 : 4.9, V2 ? 4.4 : 4.5, V2 ? COL.shirt : COL.shirtL, { mat: MAT.shirt, ref: SIDE });  // kerah berdiri
  // lengan: lereng bahu (trapezius) menyambung ke lengan, lengan atas berisi, lengan bawah mengecil ke manset
  for (const A of R.arms) {
    const { e, w } = ik3(A.sh, A.tg, A.l1, A.l2, A.pole), dir = nrm(sub(w, e));
    const ra = V2 ? [4.4, 4.7, 3.9, 3.8, 3.05, 3.45] : [4.5, 5.2, 4.3, 4.3, 3.4, 3.7];
    P(add(Sn, [0, 3.2, 0]), A.sh, ra[0], ra[1], COL.shirt, { mat: MAT.shirt, ref: SIDE });
    E(A.sh, [ra[1], ra[1], ra[1]], IDENT, COL.shirt, { mat: MAT.shirt });
    P(A.sh, e, ra[1], ra[2], COL.shirt, { mat: MAT.shirt }); E(e, [ra[3], ra[3], ra[3]], IDENT, COL.shirt, { mat: MAT.shirt }); P(e, w, ra[3], ra[4], COL.shirt, { mat: MAT.shirt });
    P(mix(e, w, 0.82), add(w, mul(dir, 0.6)), ra[5], ra[5], COL.cuff, { mat: MAT.shirt });
    let f, n; const h = A.hand;
    if (h.f) { f = nrm(h.f); n = nrm(h.n); } else {
      const a2 = Math.atan2(w[1] - e[1], w[0] - e[0]) / RAD, d = ((h.ha - a2 + 540) % 360) - 180, rot = (a2 + d * (h.hw || 0)) * RAD; f = [Math.cos(rot), Math.sin(rot), 0];
      const nIn = [0, 0, -A.sgn], nPl = [-f[1], f[0], 0]; n = nrm(mix(nIn, nPl, cl(h.hp ?? 0, 0, 1)));
      if (dot(n, nPl) < 0 && (h.hp ?? 0) > 0.9) n = mul(n, -1);
    }
    buildHand(add(w, mul(dir, 0.3)), f, n, { gr: h.gr, fp: h.fp, fl: h.fl, sgn: A.sgn }, out);
    A.out = { e, w, f, n };
  }
  const hd = R.head; hd.v2 = V2; hd.neckBase = Sn; hd.torus = R.torus; hd.C = add(hd.C, mul(Cn, 2.3));
  { const t = hd.roll * RAD, ext = 1.27 * Math.hypot(9.0 * Math.sin(t), 10.2 * Math.cos(t)) + 0.8, lim = 126.2 - ext; if (hd.C[1] > lim) hd.C = [hd.C[0], lim, hd.C[2]]; }  // dahi/hidung menyentuh sajadah, tidak menembus lantai
  buildHead(hd, out);   // kepala sedikit naik: leher terlihat
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
  return { H: lz(F.H, 0), S: lz(F.S, 0), legs, arms, br: F.br, torus, shoe: o.shoe, v2: o.v2 !== false, head: { C: lz(F.C, 0), roll, yaw: F.turn * 70 + (o.yaw ?? 42), blink: Math.max(o.blink || 0, F.ec || 0), gaze: o.gaze, smile: o.smile ?? 0.6, brow: -0.15 * (F.ec || 0) } };
}
