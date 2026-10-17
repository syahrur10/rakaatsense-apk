/** pose.js — kamera + MediaPipe Pose. HP diletakkan di lantai DI DEPAN orang shalat (miring, kamera depan menghadap orang),
 *  jadi orang terlihat dari depan. Modul ini hanya mengubah gambar menjadi dua ukuran sederhana yang dipakai rakaat.js.
 *  Bingkai kamera diproses di HP: tidak direkam dan tidak dikirim ke mana pun. */
import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
let lm = null, stream = null;
const MIN = { sh: 0.5, nose: 0.5, hip: 0.35 }; // ambang "visibility" MediaPipe

export async function loadModel() {
  if (lm) return;
  const fs = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm');
  lm = await PoseLandmarker.createFromOptions(fs, { runningMode: 'VIDEO', numPoses: 1, baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task' } });
}
export async function openCamera(video) {
  await loadModel();
  stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
  video.srcObject = stream; await video.play();
}
export function closeCamera(video) { stream?.getTracks().forEach((t) => t.stop()); stream = null; video.srcObject = null; }

/** Satu bingkai → titik penting dalam piksel (hidung, bahu, pinggul) atau null bila tidak ada orang. */
export function read(video) {
  if (!lm || video.readyState < 2) return undefined; // undefined = bingkai belum siap (bukan "orang tidak ada")
  const p = lm.detectForVideo(video, performance.now()).landmarks[0]; if (!p) return null;
  const W = video.videoWidth, H = video.videoHeight, g = (i) => ({ x: p[i].x * W, y: p[i].y * H, v: p[i].visibility ?? 0 });
  return { W, H, nose: g(0), ls: g(11), rs: g(12), lh: g(23), rh: g(24) };
}

/** Bagian badan yang terlihat (untuk petunjuk penempatan HP) */
export const parts = (r) => ({ head: !!r && r.nose.v > MIN.nose, sh: !!r && r.ls.v > MIN.sh && r.rs.v > MIN.sh, hip: !!r && r.lh.v > MIN.hip && r.rh.v > MIN.hip });
export const full = (r) => { const p = parts(r); return p.head && p.sh && p.hip; };

const avg = (a, b) => (a + b) / 2, med = (a) => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const measure = (r) => ({ shY: avg(r.ls.y, r.rs.y), hipY: avg(r.lh.y, r.rh.y), noseY: r.nose.y });

/** Kalibrasi posisi berdiri: butuh ±2,5 detik berturut-turut dengan kepala, bahu, dan pinggul terlihat dan badan relatif diam. */
export function createCalibrator(ms = 2500) {
  let S = [], t0 = 0;
  const reset = () => { S = []; t0 = 0; };
  return {
    reset,
    /** @returns {{progress:number, base:null|{shY:number,hipY:number,noseY:number,unit:number,tor:number}}} */
    add(now, r) {
      if (!full(r)) { reset(); return { progress: 0, base: null }; }
      if (!t0) t0 = now; S.push(measure(r));
      const progress = Math.min(1, (now - t0) / ms); if (progress < 1) return { progress, base: null };
      const b = { shY: med(S.map((s) => s.shY)), hipY: med(S.map((s) => s.hipY)), noseY: med(S.map((s) => s.noseY)) }, unit = b.hipY - b.noseY, tor = b.hipY - b.shY;
      const range = Math.max(...S.map((s) => s.shY)) - Math.min(...S.map((s) => s.shY));
      if (unit < r.H * 0.06 || tor <= 0 || range > unit * 0.25) { reset(); return { progress: 0, base: null }; } // terlalu kecil / terbalik / orang bergerak
      return { progress: 1, base: { ...b, unit, tor } };
    },
  };
}

/** Ukuran per bingkai relatif terhadap posisi berdiri. null bila bahu & hidung sama-sama tidak terlihat. */
export function feature(r, base) {
  if (!r) return null;
  const p = parts(r);
  let d;
  if (p.sh) d = (avg(r.ls.y, r.rs.y) - base.shY) / base.unit;
  else if (p.head) d = ((r.nose.y - base.noseY) / base.unit) * 0.64; // kepala turun ≈ 1,5× turun bahu
  else return null;
  const tr = Math.abs(avg(r.lh.y, r.rh.y) - avg(r.ls.y, r.rs.y)) / base.tor;
  return { d, tr };
}

/** Gambar titik & garis badan di kanvas (hanya saat pratinjau; saat memantau layar hitam). */
export function draw(ctx, r) {
  const { width: w, height: h } = ctx.canvas; ctx.clearRect(0, 0, w, h); if (!r) return;
  const ok = (a) => a.v > 0.35, pts = [r.nose, r.ls, r.rs, r.lh, r.rh];
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(74,222,128,.9)'; ctx.beginPath();
  [[r.ls, r.rs], [r.ls, r.lh], [r.rs, r.rh], [r.lh, r.rh]].forEach(([a, b]) => { if (ok(a) && ok(b)) { ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); } }); ctx.stroke();
  pts.forEach((a) => { ctx.beginPath(); ctx.arc(a.x, a.y, 7, 0, 7); ctx.fillStyle = ok(a) ? '#4ade80' : '#ff5a5f'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke(); });
}

/** Kamera ringan tanpa model AI (dipakai Mode Datar: HP rebah di sejadah, kamera menghadap atas). */
export async function openRaw(video) {
  stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 160 }, height: { ideal: 120 } }, audio: false });
  video.srcObject = stream; await video.play();
}
