/** flat.js — MODE DATAR: HP rebah di sejadah (layar ke atas), kamera depan menghadap langit-langit. Tanpa AI/MediaPipe.
 *  Sujud = kamera tertutup kepala/badan → bingkai menggelap dibanding baseline. 2 sujud (dipisah duduk) = 1 rakaat.
 *  Murni dan ringan; bingkai hanya dikecilkan jadi 32×24 untuk menghitung rata-rata kecerahan, tidak direkam/dikirim. */
let g = null; // kanvas kecil dibuat saat pertama dipakai (modul tetap bisa diuji di Node)

/** kecerahan rata-rata 0–255; undefined bila bingkai belum siap */
export function readLuma(video) {
  if (video.readyState < 2) return undefined;
  if (!g) { const cv = document.createElement('canvas'); cv.width = 32; cv.height = 24; g = cv.getContext('2d', { willReadFrequently: true }); }
  g.drawImage(video, 0, 0, 32, 24); const d = g.getImageData(0, 0, 32, 24).data; let s = 0;
  for (let i = 0; i < d.length; i += 4) s += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
  return s / (d.length / 4);
}

export const TH = {
  enter: 0.35, exit: 0.2,        // turunnya kecerahan relatif untuk masuk / keluar "tertutup" (histeresis)
  minBase: 20,                   // baseline minimum agar ruangan gelap tidak membagi dengan angka kecil
  hold: { sujud: 350, stand: 600 }, // lama minimal (ms); 600 ms untuk bangkit agar kedipan bayangan tidak memecah satu sujud
  shortSit: 45000,               // tidak ada sujud selama ini padahal belum target → peringatan
};

/** Kalibrasi baseline: ±1,5 detik kecerahan stabil (kamera tidak tertutup) */
export function createLumaCalibrator(ms = 1500) {
  let S = [], t0 = 0; const reset = () => { S = []; t0 = 0; };
  return { reset, add(now, L) {
    if (!(L > 8)) { reset(); return { progress: 0, base: null }; } // terlalu gelap / tertutup
    if (!t0) t0 = now; S.push(L); const p = Math.min(1, (now - t0) / ms); if (p < 1) return { progress: p, base: null };
    const m = S.reduce((a, b) => a + b, 0) / S.length;
    if (Math.max(...S) - Math.min(...S) > m * 0.15 + 4) { reset(); return { progress: 0, base: null }; } // masih bergerak/berubah
    return { progress: 1, base: m };
  } };
}

/** Mesin keadaan: event sama dengan createTracker (sujud, rakaat, extra, short) supaya watch.js bisa dipakai ulang. */
export function createFlatTracker({ target, base, onEvent = () => {}, th = TH }) {
  let b = base, state = 'stand', cand = 'stand', candT = 0, started = false, sujudN = 0, rakaat = 0, lastRakaatT = 0, lastEnd = 0, extraFlag = false, shortFlag = false;
  const emit = (type, extra = {}) => onEvent({ type, ...extra });
  function commit(next, now) {
    const prev = state; state = next;
    if (next === 'sujud') {
      sujudN++; emit('sujud', { n: sujudN });
      if (sujudN > target * 2 && !extraFlag) { extraFlag = true; emit('extra', { n: rakaat, target, why: 'sujud' }); }
    } else if (prev === 'sujud') {
      lastEnd = now;
      if (sujudN % 2 === 0) { rakaat = sujudN / 2; lastRakaatT = now; shortFlag = false; emit('rakaat', { n: rakaat, target, final: rakaat === target, over: rakaat > target }); }
    }
  }
  return {
    /** @param {number} now ms @param {number} L kecerahan rata-rata bingkai */
    feed(now, L) {
      if (!started) { started = true; candT = lastEnd = now; }
      const c = (b - L) / Math.max(b, th.minBase), r = c > (state === 'sujud' ? th.exit : th.enter) ? 'sujud' : 'stand';
      if (r === 'stand' && state === 'stand' && c < 0.12) b += (L - b) * 0.02; // ikuti perubahan eksposur/cahaya pelan-pelan
      if (r !== cand) { cand = r; candT = now; }
      if (cand !== state && now - candT >= th.hold[cand]) commit(cand, now);
      if (state === 'stand' && sujudN % 2 === 0 && rakaat >= 1 && rakaat < target && !shortFlag && now - lastEnd > th.shortSit) { shortFlag = true; emit('short', { n: rakaat, target }); }
    },
    get state() { return state; }, get rakaat() { return rakaat; }, get ruku() { return 0; }, get sujud() { return sujudN; },
    get lastRakaatT() { return lastRakaatT; }, unseenFor: () => 0,
    snapshot: () => ({ rakaat, ruku: 0, sujud: sujudN, state, target }),
  };
}
