/** counter.js — hitung rakaat dari akselerometer. Sudut antara vektor gravitasi saat berdiri (kalibrasi) dan saat ini,
 *  jadi tidak bergantung arah HP di saku. Saku Baju (ikut badan): episode miring ke-1 = rukuk, ke-2 & ke-3 = sujud; 3 episode = 1 rakaat.
 *  Saku Celana (ikut paha): turun ke sujud-duduk-sujud sampai bangun = 1 episode panjang = 1 rakaat (rukuk/sujud diestimasi 1:2). */
export function createCounter(cb) {
  let g = [0, 0, 9.8], base = null, mode = 'shirt', t0 = 0, sum = [0, 0, 0], N = 0, on = false, bent = false, since = 0, counted = false, n = 0;
  const norm = (v) => Math.hypot(...v), TH = { shirt: { on: 50, off: 30, hold: 500 }, pants: { on: 25, off: 15, hold: 2500 } };
  const rakaat = () => (mode === 'shirt' ? Math.floor(n / 3) : n);
  function onMotion(e) {
    const a = e.accelerationIncludingGravity; if (!a || a.x == null) return;
    g = [g[0] * 0.85 + a.x * 0.15, g[1] * 0.85 + a.y * 0.15, g[2] * 0.85 + a.z * 0.15];
    const now = performance.now();
    if (!base) { sum = sum.map((s, i) => s + g[i]); N++; cb.onCal?.(Math.max(0, Math.ceil((3000 - (now - t0)) / 1000)));
      if (now - t0 > 3000 && N > 20) { base = sum.map((s) => s / N); cb.onReady?.(); } return; }
    const ang = Math.acos(Math.max(-1, Math.min(1, g.reduce((s, v, i) => s + v * base[i], 0) / (norm(g) * norm(base))))) * 180 / Math.PI, T = TH[mode];
    if (!bent && ang > T.on) { bent = true; since = now; counted = false; }
    else if (bent) { if (ang < T.off) bent = false; else if (!counted && now - since > T.hold) { counted = true; n++; cb.onStep?.(); } }
    cb.onAngle?.(ang, bent);
  }
  return {
    async start(m) {
      mode = m; base = null; sum = [0, 0, 0]; N = 0; n = 0; bent = false; t0 = performance.now();
      if (typeof DeviceMotionEvent !== 'undefined' && DeviceMotionEvent.requestPermission && (await DeviceMotionEvent.requestPermission()) !== 'granted') throw new Error('denied');
      if (!('DeviceMotionEvent' in window)) throw new Error('nosensor');
      on = true; window.addEventListener('devicemotion', onMotion);
    },
    stop() { on = false; window.removeEventListener('devicemotion', onMotion); },
    adjust(d) { n = Math.max(0, n + d * (mode === 'shirt' ? 3 : 1)); },
    rakaat,
    ruku() { return mode === 'shirt' ? Math.ceil(n / 3) : n; },
    sujud() { return mode === 'shirt' ? n - Math.ceil(n / 3) : n * 2; },
    phase() { return mode === 'shirt' ? ['ph.new', 'ph.ruku', 'ph.sujud1'][n % 3] : bent ? 'ph.down' : 'ph.stand'; },
    get on() { return on; },
  };
}
