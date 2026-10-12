/** pose.js — koreksi gerakan shalat dari kamera (tampak samping) memakai MediaPipe Pose + aturan sudut sendi. */
import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
let lm, stream, run = false;
const ang = (a, b, c) => { const v1 = [a.x - b.x, a.y - b.y], v2 = [c.x - b.x, c.y - b.y]; return Math.acos(Math.max(-1, Math.min(1, (v1[0] * v2[0] + v1[1] * v2[1]) / (Math.hypot(...v1) * Math.hypot(...v2) || 1)))) * 180 / Math.PI; };
const SIDE = { L: [0, 11, 13, 23, 25, 27], R: [0, 12, 14, 24, 26, 28] }; // hidung, bahu, siku, pinggul, lutut, tumit

/** Klasifikasi gerakan + daftar kesalahan (ambang bisa disetel; normalisasi koordinat 0–1) */
export function judge(P) {
  const { nose, sh, el, hip, kn, an } = P, knee = ang(hip, kn, an), th = Math.atan2(Math.abs(sh.x - hip.x), hip.y - sh.y) * 180 / Math.PI, e = [];
  let name = 'trans';
  if (th < 25 && knee > 150) { name = 'stand'; if (knee < 165) e.push('knee'); if (th > 12) e.push('upright'); }
  else if (th >= 65 && th <= 115 && knee > 140) { name = 'ruku'; if (th < 75) e.push('rlow'); if (th > 105) e.push('rhigh'); if (nose.y - sh.y > 0.1) e.push('head'); if (knee < 150) e.push('rknee'); }
  else if (knee < 100 && nose.y > hip.y) { name = 'sujud'; if (el.y > an.y - 0.06) e.push('elbow'); if (hip.y > sh.y + 0.04) e.push('hip'); }
  else if (knee < 100 && th < 35 && hip.y > kn.y - 0.04) { name = 'sit'; if (th > 30) e.push('sitback'); }
  return { name, e };
}

export async function startPose(video, cv, ui) {
  if (!lm) { const fs = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm');
    lm = await PoseLandmarker.createFromOptions(fs, { runningMode: 'VIDEO', numPoses: 1, baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task' } }); }
  stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 }, audio: false });
  video.srcObject = stream; await video.play(); run = true;
  const ctx = cv.getContext('2d'); let cur = '', since = 0, lastWarn = {}, ok = 0, total = 0;
  const loop = () => {
    if (!run) return;
    if (video.readyState >= 2) {
      const now = performance.now(), res = lm.detectForVideo(video, now), p = res.landmarks[0]; cv.width = video.videoWidth; cv.height = video.videoHeight; ctx.clearRect(0, 0, cv.width, cv.height);
      if (p) {
        const vis = (s) => s.reduce((a, i) => a + (p[i].visibility || 0), 0), s = SIDE[vis(SIDE.L) >= vis(SIDE.R) ? 'L' : 'R'], q = (i) => p[s[i]];
        const r = judge({ nose: q(0), sh: q(1), el: q(2), hip: q(3), kn: q(4), an: q(5) });
        if (r.name !== cur) { cur = r.name; since = now; }
        const stable = now - since > 700 && r.name !== 'trans', bad = stable && r.e.length > 0;
        ctx.strokeStyle = bad ? '#ff5a5f' : '#4ade80'; ctx.lineWidth = 5; ctx.beginPath(); [1, 3, 4, 5].forEach((i, k) => ctx[k ? 'lineTo' : 'moveTo'](q(i).x * cv.width, q(i).y * cv.height)); ctx.stroke();
        ui.posture(r.name, bad);
        if (stable) { total++; if (!bad) ok++; ui.score(Math.round(ok / total * 100));
          if (bad && now - (lastWarn[r.e[0]] || 0) > 7000) { lastWarn[r.e[0]] = now; ui.error(r.e[0]); } }
      } else ui.posture('none', false);
    }
    requestAnimationFrame(loop);
  };
  loop();
}
export function stopPose(video) { run = false; stream?.getTracks().forEach((t) => t.stop()); video.srcObject = null; }
