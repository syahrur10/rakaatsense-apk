/** ml.js — pengenal gerakan shalat berbasis Machine Learning (MLP kecil, jalan di HP, tanpa server).
 *  Alur: sensor (±60 Hz) → dirata-ratakan ke 20 Hz → fitur jendela 2 dtk (tiap 0,5 dtk) → MLP → fase gerakan → urutan sujud dihitung jadi rakaat.
 *  Fitur tidak bergantung arah HP di saku (hanya sudut/jarak terhadap pose berdiri hasil kalibrasi 3 dtk) dan SAMA PERSIS dengan tools/ml/features.py.
 *  Model dilatih dari data (tools/ml/train.py) dan dimuat dari public/model/gerakan[-shirt|-pants].json. Bila model tidak ada / rusak,
 *  createSmartCounter otomatis memakai penghitung ambang lama (counter.js), jadi aplikasi tetap jalan.
 *  Modul ini murni (tanpa DOM) sehingga bisa diuji di Node: tools/tests/ml.sim.mjs. */
import { createCounter } from './counter.js';

export const HZ = 20, BIN = 1000 / HZ, WIN = 40, HOP = 10, CAL_BINS = 60, ALPHA = 0.3, G = 9.81;
export const FEATURES = ['ang_mean', 'ang_std', 'ang_min', 'ang_max', 'ang_last', 'ang_slope', 'dpar_mean', 'dpar_std', 'dperp_mean', 'dperp_std', 'dyn_mean', 'dyn_std', 'dyn_max', 'gyro_mean', 'gyro_std', 'gyro_max'];
export const SEQ = { smooth: 3, hold: 2 }; // rata-rata 3 prediksi terakhir; perubahan fase sah setelah 2 prediksi berturut-turut

const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
const std = (a) => { const m = mean(a); return Math.sqrt(mean(a.map((v) => (v - m) ** 2))); };
const dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
const norm = (v) => Math.hypot(v[0], v[1], v[2]);

/** Fitur satu jendela dari deret per-bin {ang, dpar, dperp, dyn, gy} (panjang WIN). */
export function windowFeatures(s) {
  const a = s.ang, five = (x) => mean(x.slice(0, 5)), last5 = (x) => mean(x.slice(-5));
  return [mean(a), std(a), Math.min(...a), Math.max(...a), a[a.length - 1], last5(a) - five(a),
    mean(s.dpar), std(s.dpar), mean(s.dperp), std(s.dperp), mean(s.dyn), std(s.dyn), Math.max(...s.dyn), mean(s.gy), std(s.gy), Math.max(...s.gy)];
}

/** Aliran fitur: masukkan sampel mentah (t ms, percepatan+gravitasi, besar rotasi °/dtk); keluar vektor fitur tiap jendela yang selesai.
 *  Bin 50 ms; bin kosong mengulang bin sebelumnya; 3 dtk pertama (60 bin) = kalibrasi pose berdiri. */
export function createFeatureStream() {
  let t0 = null, cur = 0, n = 0, sa = [0, 0, 0], sr = 0, prev = null, base = null, bh = null, g = null;
  const raw = [], gs = [], S = { ang: [], dpar: [], dperp: [], dyn: [], gy: [] };
  const state = { ready: false, last: null };
  function series(i) {
    const gi = gs[i], a = raw[i].a, d = [gi[0] - base[0], gi[1] - base[1], gi[2] - base[2]], p = dot(d, bh), q = Math.max(0, dot(d, d) - p * p);
    const c = Math.max(-1, Math.min(1, dot(gi, base) / ((norm(gi) * norm(base)) || 1)));
    S.ang[i] = Math.acos(c) * 180 / Math.PI; S.dpar[i] = p / G; S.dperp[i] = Math.sqrt(q) / G;
    S.dyn[i] = norm([a[0] - gi[0], a[1] - gi[1], a[2] - gi[2]]); S.gy[i] = raw[i].r;
  }
  function close(out) {
    const b = n ? { a: sa.map((v) => v / n), r: sr / n } : prev; prev = b; const i = raw.length; raw.push(b);
    g = g ? g.map((v, k) => v * (1 - ALPHA) + b.a[k] * ALPHA) : [...b.a]; gs.push([...g]);
    n = 0; sa = [0, 0, 0]; sr = 0;
    if (i === CAL_BINS - 1) {
      base = [0, 1, 2].map((k) => mean(raw.slice(0, CAL_BINS).map((x) => x.a[k]))); bh = base.map((v) => v / (norm(base) || 1));
      for (let j = 0; j < CAL_BINS; j++) series(j); state.ready = true;
    } else if (i >= CAL_BINS) series(i);
    if (!state.ready) return;
    state.last = { ang: S.ang[i], t: i };
    if (i >= WIN - 1 && (i + 1 - WIN) % HOP === 0) {
      const s = i - WIN + 1, w = {}; for (const k of Object.keys(S)) w[k] = S[k].slice(s, i + 1);
      out.push(windowFeatures(w));
    }
  }
  return {
    state,
    /** @returns {number[][]} vektor fitur untuk jendela yang selesai karena sampel ini (biasanya 0 atau 1) */
    push(t, ax, ay, az, r = 0) {
      const out = []; if (t0 == null) t0 = t; const k = Math.floor((t - t0) / BIN); if (k < cur) return out;
      while (cur < k) { close(out); cur++; }
      n++; sa[0] += ax; sa[1] += ay; sa[2] += az; sr += r; return out;
    },
  };
}

/* ---------- model ---------- */
export function validModel(m) {
  try {
    if (!m || !Array.isArray(m.classes) || m.classes.length < 3 || !m.classes.includes('sujud')) return false;
    if (m.features !== FEATURES.length || m.mean?.length !== FEATURES.length || m.std?.length !== FEATURES.length || !m.layers?.length) return false;
    let w = FEATURES.length;
    for (const [i, L] of m.layers.entries()) { if (L.W.length !== w || L.b.length !== L.W[0].length) return false; w = L.b.length; if (i < m.layers.length - 1 && L.act !== 'relu') return false; }
    return w === m.classes.length;
  } catch { return false; }
}
/** Probabilitas tiap kelas untuk satu vektor fitur. */
export function predict(m, x) {
  let h = x.map((v, i) => (v - m.mean[i]) / (m.std[i] || 1));
  m.layers.forEach((L, li) => {
    const o = L.b.map((b, j) => { let s = b; for (let i = 0; i < h.length; i++) s += h[i] * L.W[i][j]; return s; });
    h = li < m.layers.length - 1 ? o.map((v) => Math.max(0, v)) : o;
  });
  const mx = Math.max(...h), e = h.map((v) => Math.exp(v - mx)), z = e.reduce((s, v) => s + v, 0); return e.map((v) => v / z);
}
const cache = {};
export async function loadModel(mode = 'shirt') {
  for (const f of [`/model/gerakan-${mode}.json`, '/model/gerakan.json']) {
    if (cache[f] === undefined) { try { const r = await fetch(f); const m = r.ok ? await r.json() : null; cache[f] = validModel(m) ? m : null; } catch { cache[f] = null; } }
    if (cache[f]) return cache[f];
  }
  return null;
}

/** Dari probabilitas tiap jendela → fase gerakan → hitungan. Sujud dihitung tiap MASUK ke fase sujud; 2 sujud = 1 rakaat. */
export function createSequencer(classes, onEvent = () => {}) {
  const recent = []; let cur = classes.includes('berdiri') ? 'berdiri' : classes[0], cand = null, candN = 0, sujudN = 0, rukuN = 0;
  return {
    feed(p) {
      recent.push(p); if (recent.length > SEQ.smooth) recent.shift();
      const avg = p.map((_, i) => mean(recent.map((r) => r[i]))), conf = Math.max(...avg), lab = classes[avg.indexOf(conf)];
      if (lab === cur) { cand = null; candN = 0; return; }
      if (lab === cand) candN++; else { cand = lab; candN = 1; }
      if (candN < SEQ.hold) return;
      const prev = cur; cur = lab; cand = null; candN = 0;
      if (lab === 'sujud' && prev !== 'sujud') { sujudN++; onEvent({ type: 'sujud', n: sujudN, conf }); }
      if (lab === 'rukuk' && prev !== 'rukuk') { rukuN++; onEvent({ type: 'ruku', n: rukuN, conf }); }
    },
    get phase() { return cur; }, get sujud() { return sujudN; }, get ruku() { return rukuN; }, get rakaat() { return Math.floor(sujudN / 2); },
    adjust(dRakaat) { sujudN = Math.max(0, sujudN + dRakaat * 2); rukuN = Math.max(0, rukuN + dRakaat); },
  };
}

/** Penghitung dengan antarmuka SAMA seperti createCounter: pakai model ML bila ada, kalau tidak pakai penghitung ambang lama. */
export function createSmartCounter(cb) {
  const rule = createCounter(cb); let using = 'rule', on = false, stream = null, seq = null, model = null, t0 = 0, readyFired = false;
  function onMotion(e) {
    const a = e.accelerationIncludingGravity; if (!a || a.x == null) return;
    const rr = e.rotationRate, now = performance.now(), r = rr ? Math.hypot(rr.alpha || 0, rr.beta || 0, rr.gamma || 0) : 0;
    if (!stream.state.ready) cb.onCal?.(Math.max(0, Math.ceil((CAL_BINS * BIN - (now - t0)) / 1000)));
    for (const f of stream.push(now, a.x, a.y, a.z, r)) seq.feed(predict(model, f));
    if (stream.state.ready && !readyFired) { readyFired = true; cb.onReady?.(); }
    if (stream.state.last) cb.onAngle?.(stream.state.last.ang, seq.phase !== 'berdiri');
  }
  return {
    async start(mode) {
      model = await loadModel(mode); if (!model) { using = 'rule'; cb.onMode?.('rule'); return rule.start(mode); }
      if (typeof DeviceMotionEvent !== 'undefined' && DeviceMotionEvent.requestPermission && (await DeviceMotionEvent.requestPermission()) !== 'granted') throw new Error('denied');
      if (!('DeviceMotionEvent' in window)) throw new Error('nosensor');
      using = 'ml'; stream = createFeatureStream(); readyFired = false; t0 = performance.now();
      seq = createSequencer(model.classes, (ev) => { if (ev.type === 'sujud' || ev.type === 'ruku') cb.onStep?.(); });
      on = true; window.addEventListener('devicemotion', onMotion); cb.onMode?.('ml');
    },
    stop() { if (using === 'ml') { on = false; window.removeEventListener('devicemotion', onMotion); } else rule.stop(); },
    adjust(d) { using === 'ml' ? seq?.adjust(d) : rule.adjust(d); },
    rakaat: () => (using === 'ml' ? seq?.rakaat ?? 0 : rule.rakaat()),
    ruku: () => (using === 'ml' ? seq?.ruku ?? 0 : rule.ruku()),
    sujud: () => (using === 'ml' ? seq?.sujud ?? 0 : rule.sujud()),
    phase() { if (using !== 'ml') return rule.phase(); const p = seq?.phase; return p === 'berdiri' ? 'ph.stand' : p === 'rukuk' ? 'ph.ruku' : p === 'sujud' ? 'ph.sujud1' : 'ph.down'; },
    get on() { return using === 'ml' ? on : rule.on; },
    get engine() { return using; },
  };
}
