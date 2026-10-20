/** watch.js — alur Pemantau Rakaat (kamera): pratinjau → hitung mundur → kalibrasi → LAYAR HITAM memantau → ringkasan.
 *  Kamera hanya dipakai untuk menghitung rakaat supaya tidak terlupa, bukan menilai gerakan. Pengingat berupa getar / bunyi lembut,
 *  dan hanya berbunyi saat rakaat selesai atau ada yang janggal (rakaat berlebih, terlalu lama duduk sebelum target, badan tidak terlihat). */
import { $, toast, speak, store } from './util.js';
import { t, lang, hooks } from './i18n.js';
import { openCamera, openRaw, closeCamera, read, parts, full, createCalibrator, feature, draw } from './pose.js';
import { createTracker, finishReason } from './rakaat.js';
import { readLuma, createLumaCalibrator, createFlatTracker } from './flat.js';

const COUNTDOWN = 10, STEP = 90, HOLD_EXIT = 1800, DARK_AFTER = 6000;

/* ---- bunyi lembut & getar ---- */
let ac = null;
const unlock = () => { try { ac ||= new AudioContext(); if (ac.state === 'suspended') ac.resume(); } catch {} };
function tone(f, dur = 0.16, vol = 0.05, at = 0) {
  try { unlock(); const s = ac.currentTime + at, o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, s); g.gain.linearRampToValueAtTime(vol, s + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, s + dur); o.connect(g); g.connect(ac.destination); o.start(s); o.stop(s + dur + 0.05); } catch {}
}
const pulses = (n, on = 90, off = 160) => Array.from({ length: n * 2 - 1 }, (_, i) => (i % 2 ? off : on));
const mode = () => store.get('rs.cn', 'vib'); // vib = getar, snd = getar + suara, off = senyap (tetap ada tanda "siap" di awal)
/** kind: ready | tick | rakaat | final | extra | short | lost */
function cue(kind, e = {}) {
  const m = kind === 'ready' || kind === 'tick' ? 'vib' : mode(); if (m === 'off') return;
  const P = { ready: [60, 70, 60], tick: [30], rakaat: pulses(e.n || 1), final: [500], extra: [250, 120, 250, 120, 250], short: [200, 150, 200], lost: [100, 100, 100] }[kind];
  const buzzed = navigator.vibrate ? navigator.vibrate(P) : false;
  const sound = m === 'snd' || !buzzed || kind === 'ready'; if (!sound) return;
  if (kind === 'tick') tone(520, 0.08, 0.03);
  if (kind === 'ready') { tone(660, 0.18, 0.05); tone(880, 0.22, 0.05, 0.2); }
  if (kind === 'rakaat') for (let i = 0; i < (e.n || 1); i++) tone(520, 0.14, 0.05, i * 0.26);
  if (kind === 'final') { tone(660, 0.2, 0.06); tone(880, 0.3, 0.06, 0.24); }
  if (kind === 'extra') for (let i = 0; i < 3; i++) tone(330, 0.2, 0.08, i * 0.3);
  if (kind === 'short') { tone(440, 0.2, 0.06); tone(440, 0.2, 0.06, 0.3); }
  if (kind === 'lost') tone(400, 0.2, 0.05);
  if (m === 'snd' && ['final', 'extra', 'short', 'lost'].includes(kind)) speak(t('w.say.' + kind, { n: e.n, m: e.target }), lang());
}

/** @param {{target:()=>number, label:()=>string, busy:()=>boolean, awake:()=>void, sleep:()=>void, lock:()=>void, saved:(r:object)=>void, mark:()=>void}} cx */
export function initWatch(cx) {
  const V = $('video'), CV = $('ov'), G = CV.getContext('2d'), OV = $('watch');
  let flat = store.get('rs.cm', 'tegak') === 'datar', lcal = createLumaCalibrator(), phase = 'idle', raf = 0, last = 0, cal = createCalibrator(), pvBase = null, pvTr = null, pvGone = 0, tr = null, base = null, target = 1;
  let lastChangeT = 0, lastSt = '', lastSj = -1, doneAt = 0;
  let cdEnd = 0, lastSec = 0, calT = 0, calWarn = 0, startT = 0, darkT = 0, holdTm = 0, log = [], lastExtra = -1e9, res = null;
  const texts = new Set();
  const say = (el, key, v) => { el._k = [key, v]; texts.add(el); el.textContent = t(key, v); };
  hooks.push(() => { texts.forEach((e) => e._k && (e.textContent = t(...e._k))); if (phase === 'sum') renderSum(); seg(); segM(); });

  /* ---- pilihan pengingat ---- */
  const seg = () => document.querySelectorAll('#cNotif button').forEach((b) => b.classList.toggle('on', b.dataset.n === mode()));
  $('cNotif').onclick = (e) => { const b = e.target.closest('[data-n]'); if (!b || cx.busy()) return; store.set('rs.cn', b.dataset.n); seg(); if (b.dataset.n !== 'off') { cue('rakaat', { n: 1 }); if (b.dataset.n === 'snd') tone(520, 0.14, 0.05); } };
  seg();

  /* ---- pilihan mode: Tegak (HP berdiri miring di depan, AI badan) / Datar (HP rebah di sejadah, kamera menghadap atas) ---- */
  const segM = () => { document.querySelectorAll('#cMode button').forEach((b) => b.classList.toggle('on', (b.dataset.m === 'datar') === flat)); say($('cModeHint'), flat ? 'cam.m.h.datar' : 'cam.m.h.tegak'); };
  $('cMode').onclick = (e) => { const b = e.target.closest('[data-m]'); if (!b || cx.busy()) return; flat = b.dataset.m === 'datar'; store.set('rs.cm', b.dataset.m); segM(); };
  segM();

  /* ---- tampilan ---- */
  const show = (setup, box, prev, sum) => { $('camSetup').hidden = !setup; $('camBox').hidden = !box; $('camPrev').hidden = !prev; $('camSum').hidden = !sum; };
  const chips = (p) => { $('chHead').classList.toggle('ok', p.head); $('chSh').classList.toggle('ok', p.sh); $('chHip').classList.toggle('ok', p.hip); };
  const setPosture = (name, bad) => { say($('posture'), 'po.' + name); $('posture').classList.toggle('bad', !!bad); };
  const btn = (key, cancel) => { say($('camBtn'), key); $('camCancel').hidden = !cancel; };

  function loop() {
    raf = requestAnimationFrame(loop); const now = performance.now(); if (now - last < STEP) return; last = now;
    const r = flat ? readLuma(V) : read(V); if (r === undefined) return; // bingkai belum siap
    if (phase === 'preview') preview(now, r); else if (phase === 'count') count(now); else if (phase === 'calib') calib(now, r); else if (phase === 'watch') watching(now, r);
  }

  /* 1. Pratinjau: cek penempatan HP + uji gerakan (dry-run, hasilnya tidak disimpan) */
  function previewFlat(now, L) { // Mode Datar: kalibrasi kecerahan lalu uji sujud (tutup kamera dengan kepala/tangan)
    if (!pvBase) {
      const c = lcal.add(now, L); say($('camMsg'), 'cam.f.find'); $('posture').classList.remove('bad'); say($('posture'), 'cam.p.measb', { n: Math.round(c.progress * 100) });
      if (c.base) { pvBase = c.base; pvTr = createFlatTracker({ target: 99, base: c.base }); cue('ready'); } return;
    }
    pvTr.feed(now, L); setPosture(pvTr.state === 'sujud' ? 'sujud' : 'stand'); say($('camMsg'), 'cam.f.test'); say($('camCnt'), 'cam.p.cnt', { s: pvTr.sujud });
  }
  function preview(now, r) {
    if (flat) return previewFlat(now, r);
    if (CV.width !== V.videoWidth) { CV.width = V.videoWidth; CV.height = V.videoHeight; }
    draw(G, r); const p = parts(r); chips(p);
    if (!pvBase) {
      const c = cal.add(now, r);
      if (!full(r)) { say($('camMsg'), 'cam.p.find'); setPosture('none', true); } else { say($('camMsg'), 'cam.p.meas'); $('posture').classList.remove('bad'); say($('posture'), 'cam.p.measb', { n: Math.round(c.progress * 100) }); }
      if (c.base) { pvBase = c.base; pvTr = createTracker({ target: 99 }); cue('ready'); }
      return;
    }
    if (!full(r)) { pvGone = pvGone || now; if (now - pvGone > 6000) { pvBase = null; pvTr = null; pvGone = 0; cal.reset(); return; } } else pvGone = 0;
    const f = feature(r, pvBase); pvTr.feed(now, f);
    setPosture(f ? pvTr.state : 'none', !f); say($('camMsg'), 'cam.p.test'); say($('camCnt'), 'cam.p.cnt', { s: pvTr.sujud });
  }

  /* 2. Hitung mundur di layar hitam: orang bergerak ke tempat shalat dan berdiri tegak */
  function count(now) {
    const s = Math.max(0, Math.ceil((cdEnd - now) / 1000)); if (s !== lastSec) { lastSec = s; $('wBig').textContent = s; if (s > 0 && s <= 3) cue('tick'); }
    if (now >= cdEnd) { phase = 'calib'; cal.reset(); lcal.reset(); calT = now; calWarn = now; say($('wTxt'), flat ? 'cam.f.cal' : 'w.cal'); $('wBig').textContent = ''; }
  }
  /* 3. Kalibrasi posisi berdiri 2,5 detik */
  function calib(now, r) {
    if (flat) { const c = lcal.add(now, r); $('wBig').textContent = c.progress ? Math.max(1, Math.ceil((1 - c.progress) * 2)) : ''; if (c.base != null) { base = c.base; startMonitor(now); } return; }
    const c = cal.add(now, r); $('wBig').textContent = c.progress ? Math.max(1, Math.ceil((1 - c.progress) * 3)) : '';
    if (c.base) { base = c.base; startMonitor(now); return; }
    if (!full(r) && now - calWarn > 8000 && now - calT > 8000) { calWarn = now; cue('lost'); say($('wTxt'), 'w.nobody'); }
  }
  /* 4. Memantau: layar hitam penuh */
  function startMonitor(now) {
    phase = 'watch'; startT = now; darkT = now + DARK_AFTER; log = [{ at: 0, k: 'start' }]; lastExtra = -1e9; lastChangeT = now; lastSt = ''; lastSj = -1; doneAt = 0;
    const onEvent = (e) => onEv(e, performance.now()); tr = flat ? createFlatTracker({ target, base, onEvent }) : createTracker({ target, onEvent });
    say($('wTxt'), 'w.ready'); $('wBig').textContent = ''; cue('ready');
  }
  function watching(now, r) {
    if (now > darkT) OV.classList.add('dark');
    tr.feed(now, flat ? r : r ? feature(r, base) : null);
    if (tr.state !== lastSt || tr.sujud !== lastSj) { lastSt = tr.state; lastSj = tr.sujud; lastChangeT = now; }
    const rAt = tr.lastRakaatT - startT; // peringatan "rakaat tambahan" sejak rakaat terakhir = bukan selesai biasa
    const why = finishReason({ now, startT, rakaat: tr.rakaat, target, lastRakaatT: tr.lastRakaatT, state: tr.state, unseen: tr.unseenFor(now), sujud: tr.sujud, lastChangeT, extraSince: log.some((x) => (x.k === 'extra' || x.k === 'over') && x.at >= rAt) });
    if (why) finish(why);
  }
  function onEv(e, now) {
    const at = now - startT;
    if (e.type === 'rakaat') {
      const k = e.over ? 'over' : e.final ? 'final' : 'rakaat'; log.push({ at, k, n: e.n, m: e.target });
      if (k === 'over') { if (now - lastExtra > 15000) { lastExtra = now; cue('extra', e); } } else cue(e.final ? 'final' : 'rakaat', e);
    } else if (e.type === 'extra') { lastExtra = now; log.push({ at, k: 'extra', n: e.n, m: e.target }); cue('extra', e); }
    else if (e.type === 'short') { log.push({ at, k: 'short', n: e.n, m: e.target }); cue('short', e); }
    else if (e.type === 'lost') { log.push({ at, k: 'lost' }); cue('lost', e); }
    else if (e.type === 'found') log.push({ at, k: 'found' });
  }

  /* ---- alur tombol ---- */
  async function toPreview() {
    if (cx.busy()) return;
    $('camBtn').disabled = true; say($('camBtn'), 'cam.load');
    try { await (flat ? openRaw(V) : openCamera(V)); } catch { $('camBtn').disabled = false; btn('cam.start'); toast(t('cam.err')); return; }
    $('camBtn').disabled = false; phase = 'preview'; $('camBox').classList.toggle('flat', flat); lcal.reset(); pvBase = null; pvTr = null; pvGone = 0; cal.reset(); cx.awake(); cx.lock();
    show(false, true, true, false); chips({}); setPosture('none', true); say($('camMsg'), flat ? 'cam.f.find' : 'cam.p.find'); say($('camCnt'), 'cam.p.cnt', { s: 0 }); btn('cam.go', true);
    last = 0; raf = requestAnimationFrame(loop);
  }
  function toCount() {
    unlock(); target = cx.target(); phase = 'count'; lastSec = 0; cdEnd = performance.now() + COUNTDOWN * 1000; OV.classList.remove('dark'); OV.hidden = false; document.body.classList.add('watching');
    say($('wTxt'), 'w.cd'); say($('wHold'), 'w.hold'); $('wBig').textContent = COUNTDOWN; cue('tick');
  }
  function stopAll() { cancelAnimationFrame(raf); clearTimeout(holdTm); closeCamera(V); G.clearRect(0, 0, CV.width, CV.height); OV.hidden = true; OV.classList.remove('dark'); document.body.classList.remove('watching'); cx.sleep(); cx.lock(); }
  function toIdle() { stopAll(); phase = 'idle'; show(true, false, false, false); btn('cam.start'); }
  function finish(reason) {
    if (phase === 'count' || phase === 'calib') return toIdle(); // ditahan saat hitung mundur/kalibrasi = batal
    const snap = tr.snapshot(); res = { det: snap.rakaat, tgt: target, sujud: snap.sujud, reason, log, label: cx.label() };
    if (reason === 'done') cue('ready'); stopAll(); phase = 'sum'; store.set('rs.cam', { det: res.det, tgt: res.tgt, at: Date.now() }); cx.saved(res);
    show(true, false, false, true); btn('w.again'); renderSum(); scrollTo(0, 0);
  }
  const mmss = (ms) => { const s = Math.round(ms / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  function renderSum() {
    if (!res) return; const { det, tgt, sujud, log: lg } = res, ok = det === tgt, more = det > tgt;
    $('wSumBig').innerHTML = `<b>${det}</b><span>/ ${tgt}</span>`; $('wSumBig').className = 'w-big ' + (ok ? 'ok' : more ? 'bad' : 'warn');
    $('wSumLbl').textContent = res.label;
    $('wSumMsg').textContent = ok ? t('w.s.ok') : more ? t('w.s.more', { n: det, m: tgt }) : t('w.s.less', { n: det, m: tgt });
    $('wSumSj').textContent = t('w.s.sj', { n: sujud });
    $('wLog').innerHTML = lg.map((x) => `<li class="${x.k}"><time>${mmss(x.at)}</time><span>${t('w.ev.' + x.k, { n: x.n, m: x.m })}</span></li>`).join('');
    $('wMark').hidden = !ok;
  }

  $('camBtn').onclick = () => { if (phase === 'idle' || phase === 'sum') toPreview(); else if (phase === 'preview') toCount(); };
  $('camCancel').onclick = () => { if (phase === 'preview') toIdle(); };
  $('wMark').onclick = () => { cx.mark(); $('wMark').hidden = true; toast(t('w.marked'), true); };
  /* sentuh & tahan 2 detik di layar hitam untuk berhenti (cegah tersentuh tak sengaja) */
  OV.addEventListener('pointerdown', () => { clearTimeout(holdTm); holdTm = setTimeout(() => finish('manual'), HOLD_EXIT); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => OV.addEventListener(ev, () => clearTimeout(holdTm)));
  document.addEventListener('visibilitychange', () => { if (!document.hidden && (phase === 'watch' || phase === 'preview' || phase === 'count' || phase === 'calib')) V.play?.().catch(() => {}); });

  return { get on() { return phase !== 'idle' && phase !== 'sum'; } };
}
