/** fig3d.js — mesin 3D mini (WebGL2) untuk animasi Panduan & Belajar.
 *  Satu konteks WebGL dipakai bersama; tiap adegan punya <canvas> 2D sendiri dan hasil render disalin ke sana (hemat konteks, aman di WebView).
 *  Dunia: x = ke depan (kiblat), y = KE BAWAH (seperti SVG), z = ke arah penonton (sisi dekat). Kamera ortografis dengan sedikit "miring" (shear) supaya
 *  bidang z = 0 persis sama dengan koordinat SVG lama: lapisan SVG (label, panah, kotak AI) tetap sejajar dengan gambar 3D.
 *  Bila WebGL tidak ada, engine() mengembalikan null dan guide.js memakai gambar SVG lama. */

export const v3 = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], mul: (a, k) => [a[0] * k, a[1] * k, a[2] * k],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: (a) => Math.hypot(a[0], a[1], a[2]), nrm: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  mix: (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k],
};
const { sub, mul, dot, cross, nrm } = v3;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

/* ===== bahan: [spekular, kekerasan, rim, subsurface] ===== */
export const MAT = { skin: [0.22, 26, 0.5, 1], cloth: [0.08, 12, 0.34, 0], shirt: [0.12, 16, 0.4, 0], hair: [0.4, 24, 0.45, 0], gloss: [0.7, 44, 0.5, 0], eye: [0.95, 70, 0.08, 0], gold: [0.95, 34, 0.55, 0], lip: [0.3, 20, 0.2, 0.5], matte: [0, 8, 0.2, 0], glass: [1, 80, 0.7, 0] };

/** Primitif "kapsul meruncing / elipsoid": dua bola (P0, r0) dan (P1, r1) yang dibungkus; k = skala [lebar e1, lebar e2, memanjang sumbu]. P0 = P1 → elipsoid. */
export function pill(P0, P1, r0, r1, col, o = {}) {
  const d = sub(P1, P0), L = Math.hypot(d[0], d[1], d[2]), ax = L > 1e-4 ? mul(d, 1 / L) : (o.ax || [0, -1, 0]);
  let ref = o.ref || [0, 0, 1], e1 = sub(ref, mul(ax, dot(ref, ax)));
  if (Math.hypot(e1[0], e1[1], e1[2]) < 1e-3) { ref = [1, 0, 0]; e1 = sub(ref, mul(ax, dot(ref, ax))); }
  e1 = nrm(e1);
  return { t: 'p', P0, P1, r0, r1, ax, e1, e2: cross(ax, e1), k: o.k || [1, 1, 1], s: L > 1e-4 ? clamp((r0 - r1) / L, -0.97, 0.97) : 0, col, mat: o.mat || MAT.cloth, sh: o.sh !== false, ao: o.ao ?? 1, a: o.a ?? 1 };
}
/** Elipsoid dengan sumbu bebas: radii [a, b, c] sepanjang axes [ex, ey, ez]. */
export function ell(c, radii, axes, col, o = {}) {
  return { t: 'p', P0: c, P1: c, r0: 1, r1: 1, ax: axes[2], e1: axes[0], e2: axes[1], k: radii, s: 0, col, mat: o.mat || MAT.cloth, sh: o.sh !== false, ao: o.ao ?? 1, a: o.a ?? 1 };
}

/* ===== matriks ===== */
const MUL = (a, b) => { const o = new Array(16).fill(0); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k]; return o; };
const norm2 = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };

/** Kamera. ortho: { yaw°, k (shear), s (skala), tx, ty } → koordinat layar "satuan SVG": sx = s*x' + tx, sy = s*(y + k*z') + ty.
 *  persp: { eye, at, fov° } (dunia y-bawah). vb = [x, y, w, h] kotak pandang SVG (sudah disesuaikan dengan rasio kanvas). */
export function viewMatrix(cam, vb) {
  if (cam.persp) {
    const e = [cam.eye[0], -cam.eye[1], cam.eye[2]], a = [cam.at[0], -cam.at[1], cam.at[2]], f = norm2(sub(a, e)), r = norm2(cross(f, [0, 1, 0])), u = cross(r, f);
    const V = [r[0], u[0], -f[0], 0, r[1], u[1], -f[1], 0, r[2], u[2], -f[2], 0, -dot(r, e), -dot(u, e), dot(f, e), 1];
    const t = 1 / Math.tan(cam.fov * Math.PI / 360), asp = vb[2] / vb[3], n = 2, fa = 900;
    const P = [t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (fa + n) / (n - fa), -1, 0, 0, 2 * fa * n / (n - fa), 0];
    const F = [1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; // y-bawah → y-atas
    return MUL(P, MUL(V, F));
  }
  const ph = (cam.yaw || 0) * Math.PI / 180, c = Math.cos(ph), s = Math.sin(ph), S = cam.s || 1, k = cam.k ?? 0.21, tx = cam.tx || 0, ty = cam.ty || 0;
  // x' = x c + z s ; z' = -x s + z c ; sx = S x' + tx ; sy = S (y + k z') + ty ; depth = -z'/300
  const sx = [S * c, 0, S * s], sy = [-S * k * s, S, S * k * c], dz = [s / 300, 0, -c / 300];
  const X = (v, i) => 2 / vb[2] * v[i], Y = (v, i) => -2 / vb[3] * v[i];
  return [X(sx, 0), Y(sy, 0), dz[0], 0, X(sx, 1), Y(sy, 1), dz[1], 0, X(sx, 2), Y(sy, 2), dz[2], 0, 2 * (tx - vb[0]) / vb[2] - 1, 1 - 2 * (ty - vb[1]) / vb[3], 0, 1];
}
/** titik dunia → koordinat satuan-SVG (dipakai untuk menaruh titik/label SVG tepat di atas sendi 3D) */
export function project(M, vb, p) {
  const x = M[0] * p[0] + M[4] * p[1] + M[8] * p[2] + M[12], y = M[1] * p[0] + M[5] * p[1] + M[9] * p[2] + M[13], w = M[3] * p[0] + M[7] * p[1] + M[11] * p[2] + M[15];
  return [vb[0] + (x / w + 1) / 2 * vb[2], vb[1] + (1 - y / w) / 2 * vb[3]];
}

/* ===== mesh ===== */
function rbox(w, h, d, r, n = 6) { // kotak membulat (HP), halus
  const P = [], N = [], I = [], hx = w / 2 - r, hy = h / 2 - r, hz = d / 2 - r;
  const faces = [[0, 1, 2, 1], [0, 1, 2, -1], [1, 2, 0, 1], [1, 2, 0, -1], [2, 0, 1, 1], [2, 0, 1, -1]];
  for (const [a, b, c, sg] of faces) {
    const base = P.length / 3;
    for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) {
      const p = [0, 0, 0]; p[a] = (i / n * 2 - 1); p[b] = (j / n * 2 - 1); p[c] = sg;
      const q = [p[0] * (w / 2), p[1] * (h / 2), p[2] * (d / 2)], inn = [clamp(q[0], -hx, hx), clamp(q[1], -hy, hy), clamp(q[2], -hz, hz)], nn = norm2(sub(q, inn));
      P.push(inn[0] + nn[0] * r, inn[1] + nn[1] * r, inn[2] + nn[2] * r); N.push(nn[0], nn[1], nn[2]);
    }
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const q = base + i * (n + 1) + j; I.push(q, q + 1, q + n + 1, q + 1, q + n + 2, q + n + 1); }
  }
  return { P, N, I, U: new Array(P.length / 3 * 2).fill(0) };
}
function torusMesh(R = 1, r = 0.12, a = 40, b = 12) {
  const P = [], N = [], I = [], U = [];
  for (let i = 0; i <= a; i++) for (let j = 0; j <= b; j++) {
    const u = i / a * Math.PI * 2, v = j / b * Math.PI * 2, cu = Math.cos(u), su = Math.sin(u), cv = Math.cos(v), sv = Math.sin(v);
    P.push((R + r * cv) * cu, r * sv, (R + r * cv) * su); N.push(cv * cu, sv, cv * su); U.push(i / a, j / b);
  }
  for (let i = 0; i < a; i++) for (let j = 0; j < b; j++) { const q = i * (b + 1) + j; I.push(q, q + 1, q + b + 1, q + 1, q + b + 2, q + b + 1); }
  return { P, N, I, U };
}
function quadMesh() { return { P: [-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], N: [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1], I: [0, 1, 2, 0, 2, 3], U: [0, 1, 1, 1, 1, 0, 0, 0] }; }
/** balok datar dengan UV di sisi atas (-y): untuk sajadah. Sumbu: x panjang, y tebal (ke bawah), z lebar. */
function slabMesh() {
  const P = [], N = [], I = [], U = []; const F = [[[0, -1, 0], [-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]], [[0, 1, 0], [-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1]], [[0, 0, 1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]], [[0, 0, -1], [1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]], [[1, 0, 0], [1, -1, 1], [1, -1, -1], [1, 1, -1], [1, 1, 1]], [[-1, 0, 0], [-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]]];
  const uv = [[0, 0], [1, 0], [1, 1], [0, 1]];
  F.forEach((f, fi) => { const b = P.length / 3; for (let i = 1; i <= 4; i++) { P.push(...f[i]); N.push(...f[0]); U.push(...(fi === 0 ? uv[i - 1] : [0.5, 0.5])); } I.push(b, b + 1, b + 2, b, b + 2, b + 3); });
  return { P, N, I, U };
}
/** prisma dari poligon 2D (bidang x-y) setebal d di sumbu z (dasar segitiga penyangga HP). Normal rata per sisi. */
export function prismMesh(pts, d) {
  const P = [], N = [], I = [], U = [], n = pts.length, h = d / 2; let cx = 0, cy = 0; pts.forEach((p) => { cx += p[0] / n; cy += p[1] / n; });
  const tri = (a, b, c, nn) => { const q = P.length / 3; P.push(...a, ...b, ...c); for (let i = 0; i < 3; i++) { N.push(...nn); U.push(0, 0); } I.push(q, q + 1, q + 2); };
  for (let i = 1; i < n - 1; i++) { tri([pts[0][0], pts[0][1], h], [pts[i][0], pts[i][1], h], [pts[i + 1][0], pts[i + 1][1], h], [0, 0, 1]); tri([pts[0][0], pts[0][1], -h], [pts[i + 1][0], pts[i + 1][1], -h], [pts[i][0], pts[i][1], -h], [0, 0, -1]); }
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n], e = [b[0] - a[0], b[1] - a[1]], l = Math.hypot(...e) || 1, nn = [e[1] / l, -e[0] / l, 0]; if ((a[0] + b[0]) / 2 * nn[0] + (a[1] + b[1]) / 2 * nn[1] < cx * nn[0] + cy * nn[1]) { nn[0] *= -1; nn[1] *= -1; }
    tri([a[0], a[1], h], [b[0], b[1], h], [b[0], b[1], -h], nn); tri([a[0], a[1], h], [b[0], b[1], -h], [a[0], a[1], -h], nn);
  }
  return { P, N, I, U };
}
export function rotM(R, t, S) { // model: kolom basis R (3 vektor) * skala S + translasi t
  return [R[0][0] * S[0], R[0][1] * S[0], R[0][2] * S[0], 0, R[1][0] * S[1], R[1][1] * S[1], R[1][2] * S[1], 0, R[2][0] * S[2], R[2][1] * S[2], R[2][2] * S[2], 0, t[0], t[1], t[2], 1];
}
const nmOf = (R, S) => [R[0][0] / S[0], R[0][1] / S[0], R[0][2] / S[0], R[1][0] / S[1], R[1][1] / S[1], R[1][2] / S[1], R[2][0] / S[2], R[2][1] / S[2], R[2][2] / S[2]];

/** Perintah gambar mesh: basis R (tiga vektor satuan), skala S, posisi t. */
export const meshCmd = (mesh, R, S, t, col, o = {}) => ({ t: 'm', mesh, M: rotM(R, t, S), NM: nmOf(R, S), col, mat: o.mat || MAT.cloth, sh: o.sh !== false, ao: o.ao ?? 1, a: o.a ?? 1, tex: o.tex || null, mode: o.mode || 0, ground: !!o.ground });
export const IDENT = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
/** basis dari sumbu x lokal (ax) dan petunjuk atas (up) */
export function basis(xa, hint = [0, -1, 0]) { const x = nrm(xa); let y = sub(hint, mul(x, dot(hint, x))); if (Math.hypot(...y) < 1e-3) y = sub([0, 0, 1], mul(x, x[2])); y = nrm(y); return [x, y, cross(x, y)]; }

/* ===== shader ===== */
const VS_P = `#version 300 es
in vec4 aP; uniform mat4 uVP; uniform vec3 uP0,uP1,uAx,uE1,uE2,uK; uniform vec2 uR; uniform float uS; uniform float uShadow; uniform vec3 uSL; uniform float uFloor;
out vec3 vN; out vec3 vW; out vec2 vUV;
void main(){ float u=aP.z; float en=aP.w; float a=en<0.5?mix(-1.0,uS,u+1.0):mix(uS,1.0,u);
 float sq=sqrt(max(0.0,1.0-a*a)); vec3 dl=vec3(aP.x*sq*uK.x,aP.y*sq*uK.y,a*uK.z); vec3 nl=vec3(aP.x*sq/uK.x,aP.y*sq/uK.y,a/uK.z);
 float r=en<0.5?uR.x:uR.y; vec3 b=en<0.5?uP0:uP1; vec3 p=b+(uE1*dl.x+uE2*dl.y+uAx*dl.z)*r; vec3 n=normalize(uE1*nl.x+uE2*nl.y+uAx*nl.z);
 vN=n; vW=p; vUV=vec2(0.0); if(uShadow>0.5){ p+=uSL*((uFloor-p.y)/uSL.y); p.y=uFloor-0.04; }
 gl_Position=uVP*vec4(p,1.0); }`;
const VS_M = `#version 300 es
in vec3 aPos; in vec3 aNor; in vec2 aUV; uniform mat4 uVP,uM; uniform mat3 uNM; uniform float uShadow; uniform vec3 uSL; uniform float uFloor;
out vec3 vN; out vec3 vW; out vec2 vUV;
void main(){ vec3 p=(uM*vec4(aPos,1.0)).xyz; vN=normalize(uNM*aNor); vW=p; vUV=aUV; if(uShadow>0.5){ p+=uSL*((uFloor-p.y)/uSL.y); p.y=uFloor-0.04; } gl_Position=uVP*vec4(p,1.0); }`;
const FS = `#version 300 es
precision highp float; in vec3 vN; in vec3 vW; in vec2 vUV; out vec4 o;
uniform vec3 uCol; uniform vec4 uMat; uniform float uMode, uAlpha, uAO, uFloor; uniform sampler2D uTex; uniform vec3 uL,uL2,uV,uLr; uniform vec3 uShCol;
void main(){
 if(uMode>3.5){ o=vec4(uShCol*uAlpha,uAlpha); return; }
 vec3 N=normalize(vN); vec3 col=uCol;
 if(uMode>1.5){ vec4 t=texture(uTex,vUV); if(uMode>2.5){ o=vec4(t.rgb*uCol*uAlpha*t.a,t.a*uAlpha); return; } col=t.rgb; }
 float h=dot(N,uL)*0.5+0.5; float lit=smoothstep(0.1,0.92,h);
 vec3 sh=col*vec3(0.50,0.58,0.74); vec3 base=mix(sh,col*1.07,lit);
 base+=col*max(dot(N,uL2),0.0)*0.16*vec3(0.95,1.0,1.1);
 float hemi=clamp(-N.y*0.5+0.5,0.0,1.0); base*=0.84+0.2*hemi;
 float ao=mix(0.68,1.0,smoothstep(0.0,18.0,uFloor-vW.y)); base*=mix(1.0,ao,uAO);
 float ss=uMat.w*smoothstep(0.22,0.5,h)*(1.0-smoothstep(0.5,0.78,h)); base+=vec3(0.24,0.05,0.0)*ss;
 vec3 H=normalize(uL+uV); float sp=pow(max(dot(N,H),0.0),uMat.y)*uMat.x*smoothstep(0.25,0.8,h); base+=vec3(1.0,0.97,0.9)*sp;
 float rim=pow(1.0-max(dot(N,uV),0.0),2.4)*uMat.z; base+=vec3(1.0,0.93,0.78)*rim*(0.25+0.75*clamp(dot(N,uLr)*0.5+0.5,0.0,1.0));
 o=vec4(base*uAlpha,uAlpha); }`;

/* ===== mesin ===== */
let ENG = null, tried = false;
export function engine() { if (ENG || tried) return ENG; tried = true; try { ENG = makeEngine(); } catch (e) { ENG = null; } return ENG; }

function makeEngine() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 16;
  const gl = cv.getContext('webgl2', { alpha: true, antialias: true, premultipliedAlpha: true, stencil: true, depth: true, powerPreference: 'low-power' });
  if (!gl) throw new Error('no webgl2');
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const prog = (vs, fs, locs) => { const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); locs.forEach((n, i) => gl.bindAttribLocation(p, i, n)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); for (let i = 0; i < n; i++) { const a = gl.getActiveUniform(p, i); u[a.name] = gl.getUniformLocation(p, a.name); } return { p, u }; };
  const PP = prog(VS_P, FS, ['aP']), PM = prog(VS_M, FS, ['aPos', 'aNor', 'aUV']);
  // mesh pill: (cos, sin, u, end)
  const SEG = 22, RING = 9, PV = [], PI = [];
  const pushRing = (u, en) => { for (let i = 0; i <= SEG; i++) { const t = i / SEG * Math.PI * 2; PV.push(Math.cos(t), Math.sin(t), u, en); } };
  const rings = [];
  for (let i = 0; i <= RING; i++) { rings.push(PV.length / 4); pushRing(-1 + i / RING, 0); }  // dasar: u -1..0
  for (let i = 0; i <= RING; i++) { rings.push(PV.length / 4); pushRing(i / RING, 1); }       // atas: u 0..1
  for (let r = 0; r < rings.length - 1; r++) for (let i = 0; i < SEG; i++) { const a = rings[r] + i, b = rings[r + 1] + i; PI.push(a, a + 1, b, a + 1, b + 1, b); }
  const mk = (m) => {
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao); const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    const data = new Float32Array(m.P.length / 3 * 8); for (let i = 0; i < m.P.length / 3; i++) { data.set(m.P.slice(i * 3, i * 3 + 3), i * 8); data.set(m.N.slice(i * 3, i * 3 + 3), i * 8 + 3); data.set([m.U[i * 2] || 0, m.U[i * 2 + 1] || 0], i * 8 + 6); }
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 32, 0); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 32, 12); gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 32, 24);
    const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(m.I), gl.STATIC_DRAW); gl.bindVertexArray(null); return { vao, n: m.I.length };
  };
  const pillVao = gl.createVertexArray(); gl.bindVertexArray(pillVao); { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(PV), gl.STATIC_DRAW); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 16, 0); const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(PI), gl.STATIC_DRAW); } gl.bindVertexArray(null);
  const cache = new Map(), built = new WeakMap();
  const glMesh = (m) => { let g = built.get(m); if (!g) { g = mk(m); built.set(m, g); } return g; };
  const meshes = { torus: torusMesh(), quad: quadMesh(), slab: slabMesh(), box: (w, h, d, r) => { const k = [w, h, d, r].join(); if (!cache.has(k)) cache.set(k, rbox(w, h, d, r)); return cache.get(k); } };
  const textures = new Map();
  const texOf = (src) => { // src: HTMLCanvasElement (dibuat sekali, dipakai ulang)
    let t = textures.get(src); if (t) return t; t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src); gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); textures.set(src, t); return t;
  };
  const U = (P, n, fn, ...a) => { const l = P.u[n]; if (l != null) gl[fn](l, ...a); };
  let gw = 16, gh = 16;
  const ensure = (w, h) => { if (w > gw || h > gh) { gw = Math.max(gw, w); gh = Math.max(gh, h); cv.width = gw; cv.height = gh; } };

  /** Gambar satu tampilan ke sub-kotak (x0,y0,w,h) kanvas GL. cmds = daftar perintah; cfg = { M, L, L2, Lr, V, floor, shadow } */
  function drawView(rect, cmds, cfg) {
    const [x0, y0, w, h] = rect; ensure(x0 + w, y0 + h);
    gl.viewport(x0, y0, w, h); gl.enable(gl.SCISSOR_TEST); gl.scissor(x0, y0, w, h); gl.clearColor(0, 0, 0, 0); gl.clearStencil(0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.disable(gl.CULL_FACE); gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.depthMask(true);
    const sl = norm2(cfg.shadowDir || [0.38, 1, -0.2]);
    const setCommon = (P, mode, alpha) => { gl.useProgram(P.p); U(P, 'uVP', 'uniformMatrix4fv', false, cfg.M); U(P, 'uL', 'uniform3fv', cfg.L); U(P, 'uL2', 'uniform3fv', cfg.L2); U(P, 'uLr', 'uniform3fv', cfg.Lr); U(P, 'uV', 'uniform3fv', cfg.V); U(P, 'uFloor', 'uniform1f', cfg.floor); U(P, 'uSL', 'uniform3fv', sl); U(P, 'uShadow', 'uniform1f', mode > 3.5 ? 1 : 0); U(P, 'uMode', 'uniform1f', mode); U(P, 'uAlpha', 'uniform1f', alpha); U(P, 'uShCol', 'uniform3f', 0.03, 0.09, 0.05); };
    const drawCmd = (c, shadow) => {
      const mode = shadow ? 4 : (c.t === 'm' ? c.mode : 0), alpha = shadow ? (cfg.shadowA ?? 0.3) * c.a : c.a;
      if (c.t === 'p') {
        setCommon(PP, mode, alpha); gl.bindVertexArray(pillVao);
        U(PP, 'uP0', 'uniform3fv', c.P0); U(PP, 'uP1', 'uniform3fv', c.P1); U(PP, 'uAx', 'uniform3fv', c.ax); U(PP, 'uE1', 'uniform3fv', c.e1); U(PP, 'uE2', 'uniform3fv', c.e2); U(PP, 'uK', 'uniform3fv', c.k); U(PP, 'uR', 'uniform2f', c.r0, c.r1); U(PP, 'uS', 'uniform1f', c.s);
        U(PP, 'uCol', 'uniform3fv', c.col); U(PP, 'uMat', 'uniform4fv', c.mat); U(PP, 'uAO', 'uniform1f', c.ao); gl.drawElements(gl.TRIANGLES, PI.length, gl.UNSIGNED_SHORT, 0);
      } else {
        setCommon(PM, mode, alpha); const g = glMesh(c.mesh); gl.bindVertexArray(g.vao); U(PM, 'uM', 'uniformMatrix4fv', false, c.M); U(PM, 'uNM', 'uniformMatrix3fv', false, c.NM);
        U(PM, 'uCol', 'uniform3fv', c.col); U(PM, 'uMat', 'uniform4fv', c.mat); U(PM, 'uAO', 'uniform1f', c.ao);
        if (c.tex) { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texOf(c.tex)); U(PM, 'uTex', 'uniform1i', 0); } gl.drawElements(gl.TRIANGLES, g.n, gl.UNSIGNED_SHORT, 0);
      }
    };
    const ground = cmds.filter((c) => c.ground), solid = cmds.filter((c) => !c.ground && c.a >= 0.999 && !c.fx), trans = cmds.filter((c) => !c.ground && (c.a < 0.999 || c.fx));
    for (const c of ground) drawCmd(c, false);
    if (cfg.shadow !== false) { // bayangan datar di lantai, tiap piksel sekali (stensil)
      gl.disable(gl.DEPTH_TEST); gl.enable(gl.STENCIL_TEST); gl.stencilFunc(gl.EQUAL, 0, 255); gl.stencilOp(gl.KEEP, gl.KEEP, gl.INCR);
      for (const c of cmds) if (c.sh && !c.fx && !c.ground) drawCmd(c, true);
      gl.disable(gl.STENCIL_TEST); gl.enable(gl.DEPTH_TEST);
    }
    for (const c of solid) drawCmd(c, false);
    gl.depthMask(false); for (const c of trans) drawCmd(c, false); gl.depthMask(true);
    gl.bindVertexArray(null); gl.disable(gl.SCISSOR_TEST);
  }
  return { gl, canvas: cv, drawView, meshes, glMesh };
}

/* ===== lapisan adegan: kanvas 2D di bawah <svg> utama + <svg> latar ===== */
const SVGNS = 'http://www.w3.org/2000/svg';
const FLOOR_Y = 126.5;
export const FLOOR = FLOOR_Y;
const dirs = (yaw, L = [-0.42, -0.78, 0.5], L2 = [0.7, -0.2, 0.55], Lr = [0.55, -0.35, -0.75]) => {
  const ph = -yaw * Math.PI / 180, c = Math.cos(ph), s = Math.sin(ph), R = (v) => norm2([v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c]); // rotasi balik: arah cahaya relatif terhadap kamera
  return { L: R(L), L2: R(L2), Lr: R(Lr), V: R([0, 0, 1]) };
};
export { dirs };

/** Membuat lapisan 3D di dalam kotak `.sv`: [svg latar] [kanvas] [svg depan = `svg` yang diberikan scene]. Mengembalikan { back, canvas, render(views) }.
 *  views: [{ cam, cmds, rect?:[x,y,w,h] dalam satuan vb (kosong = seluruh), clip?:radius, light? }]. */
export function makeLayer(svg, vbArr) {
  const box = svg.parentElement, eng = engine(); if (!eng) return null;
  const vb = vbArr || svg.getAttribute('viewBox').split(/[ ,]+/).map(Number);
  box.classList.add('s3d');
  const back = document.createElementNS(SVGNS, 'svg'); back.setAttribute('viewBox', vb.join(' ')); back.setAttribute('aria-hidden', 'true'); back.setAttribute('class', 's3d-back'); back.style.overflow = 'visible';
  const canvas = document.createElement('canvas'); canvas.className = 's3d-cv'; canvas.setAttribute('aria-hidden', 'true');
  box.insertBefore(back, svg); box.insertBefore(canvas, svg); svg.classList.add('s3d-front');
  const ctx = canvas.getContext('2d'); let W = 0, H = 0, dpr = 1;
  const fitCanvas = () => { // ikuti ukuran tampilan; batasi kepadatan piksel supaya hemat memori di HP
    const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return false; dpr = Math.min(window.devicePixelRatio || 1, 2, 1100 / Math.max(w, h));
    const nw = Math.round(w * dpr), nh = Math.round(h * dpr); if (nw !== W || nh !== H) { W = nw; H = nh; canvas.width = W; canvas.height = H; } return true;
  };
  /** kotak vb yang dipakai kanvas: sama dengan pemetaan "meet" milik <svg> */
  const fullVb = () => { const sc = Math.min(W / vb[2], H / vb[3]), w = W / sc, h = H / sc; return [vb[0] + vb[2] / 2 - w / 2, vb[1] + vb[3] / 2 - h / 2, w, h, sc]; };
  let last = null, vis = true;
  const api = {
    back, canvas, vb, eng, get ok() { return W > 0; },
    /** menggambar semua tampilan lalu menyalin ke kanvas 2D */
    render(views) {
      last = views; if (!vis || document.hidden || !fitCanvas()) return; ctx.clearRect(0, 0, W, H); const fv = fullVb();
      for (const v of views) {
        let rx = 0, ry = 0, rw = W, rh = H, vv = [fv[0], fv[1], fv[2], fv[3]];
        if (v.rect) { const sc = fv[4]; rx = Math.round((v.rect[0] - fv[0]) * sc); ry = Math.round((v.rect[1] - fv[1]) * sc); rw = Math.round(v.rect[2] * sc); rh = Math.round(v.rect[3] * sc); vv = v.vb || [v.rect[0], v.rect[1], v.rect[2], v.rect[3]]; }
        if (rw < 2 || rh < 2) continue; const M = viewMatrix(v.cam, vv), dd = v.cam.persp ? null : dirs(v.cam.yaw || 0, v.light?.L, v.light?.L2, v.light?.Lr);
        const worldDirs = dd || { L: norm2(v.light?.L || [-0.3, -0.8, 0.5]), L2: [0.6, -0.2, 0.5], Lr: [0, -0.3, -0.9], V: norm2(sub(v.cam.eye, v.cam.at)) };
        eng.drawView([0, 0, rw, rh], v.cmds, { M, ...worldDirs, floor: v.floor ?? FLOOR_Y, shadow: v.shadow, shadowA: v.shadowA, shadowDir: v.shadowDir });
        v.M = M; v.vbUsed = vv;
        if ((v.alpha ?? 1) <= 0.01) continue;
        ctx.save(); ctx.globalAlpha = v.alpha ?? 1; if (v.clip) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(rx, ry, rw, rh, v.clip * fv[4]); else ctx.rect(rx, ry, rw, rh); ctx.clip(); }
        ctx.drawImage(eng.canvas, 0, eng.canvas.height - rh, rw, rh, rx, ry, rw, rh); ctx.restore();
      }
    },
    /** gambar ulang tampilan terakhir (dipakai saat kanvas baru punya ukuran / kembali terlihat) */
    redraw() { if (last) api.render(last); },
  };
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => api.redraw()).observe(canvas);
  if (typeof IntersectionObserver !== 'undefined') new IntersectionObserver((es) => { vis = es[es.length - 1].isIntersecting; if (vis) api.redraw(); }).observe(box);
  return api;
}
export const SV = (n, a = {}, p) => { const e = document.createElementNS(SVGNS, n); for (const k in a) e.setAttribute(k, a[k]); p?.append(e); return e; };
