/** app.js — navigasi, bahasa, jadwal shalat, beranda, penghitung rakaat (sensor), koreksi gerakan (kamera). */
import { $, z, dayKey, store, toast, speak, beep, place, placeName, session, logout, isAdmin, syncStats } from './util.js';
import { t, lang, setLang, apply, hooks, LANGS } from './i18n.js';
import { ic, mount, scanDeco } from './icons.js';
import { createCounter } from './counter.js';
import { startPose, stopPose } from './pose.js';
import { openGuide } from './guide.js';
import './qibla.js';

const PR = [{ id: 'subuh', k: 'Fajr', r: 2, i: 'sunrise' }, { id: 'dzuhur', k: 'Dhuhr', r: 4, i: 'sun' }, { id: 'ashar', k: 'Asr', r: 4, i: 'afternoon' }, { id: 'maghrib', k: 'Maghrib', r: 3, i: 'sunset' }, { id: 'isya', k: 'Isha', r: 4, i: 'moon' }];
const setBtn = (el, k) => { el.dataset.i = k; el.textContent = t(k); }, pName = (id) => t('p.' + id);

/* ---- Bahasa, ikon, splash ---- */
$('lang').innerHTML = Object.entries(LANGS).map(([k, [n]]) => `<option value="${k}" title="${n}" ${k === lang() ? 'selected' : ''}>${k.toUpperCase()}</option>`).join('');
$('lang').onchange = (e) => setLang(e.target.value);
mount(); apply(); $('deco').innerHTML = scanDeco();
function setGreet() {
  const s = session() || {}, h = new Date().getHours(), guest = s.id === 'guest';
  const part = h < 4 ? 'night' : h < 10 ? 'morning' : h < 15 ? 'noon' : h < 18 ? 'afternoon' : 'night';
  $('greet').textContent = t('g.salam', { n: (s.name || '').split(' ')[0] || t('g.guest') });
  $('greet2').textContent = (isAdmin() ? t('au.r.admin') + ' · ' : '') + t('g.' + part);
  $('logout').setAttribute('aria-label', t(guest ? 'au.in' : 'au.out'));
}
$('logout').onclick = () => { if (session()?.id === 'guest' || confirm(t('au.outq'))) logout(); };
const HJ = {
  id: ['Muharram', 'Safar', 'Rabiul Awal', 'Rabiul Akhir', 'Jumadil Awal', 'Jumadil Akhir', 'Rajab', 'Syakban', 'Ramadan', 'Syawal', 'Zulkaidah', 'Zulhijah'],
  ms: ['Muharram', 'Safar', 'Rabiulawal', 'Rabiulakhir', 'Jamadilawal', 'Jamadilakhir', 'Rejab', 'Syaaban', 'Ramadan', 'Syawal', 'Zulkaedah', 'Zulhijjah'],
};
function hijri(d, L) {
  try {
    const f = new Intl.DateTimeFormat(L + '-u-ca-islamic', { day: 'numeric', month: 'numeric', year: 'numeric' }), P = Object.fromEntries(f.formatToParts(d).map((x) => [x.type, x.value]));
    if (HJ[L] && +P.month >= 1 && +P.month <= 12) return `${P.day} ${HJ[L][+P.month - 1]} ${P.year} H`;
    return new Intl.DateTimeFormat(L + '-u-ca-islamic', { dateStyle: 'long' }).format(d);
  } catch { return ''; }
}
function setDates() {
  const L = lang(), d = new Date(), el = $('dates'), line = (txt, cls) => { const s = document.createElement('span'); if (cls) s.className = cls; s.textContent = txt; return s; };
  el.replaceChildren(line(d.toLocaleDateString(L, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })), line(hijri(d, L), 'hj'));
  setGreet();
}

/* ---- Navigasi ---- */
let adm = null; // panel admin dimuat hanya untuk admin
if (isAdmin()) { $('admBtn').hidden = false; import('./admin.js').then((m) => (adm = m)); }
function go(id) { if (id === 'adm' && !isAdmin()) id = 'home'; document.querySelectorAll('.tab').forEach((x) => x.classList.toggle('on', x.id === id)); document.querySelectorAll('#nav button').forEach((b) => b.classList.toggle('on', b.dataset.go === id)); scrollTo(0, 0); if (id === 'home') renderHome(); if (id === 'adm') adm?.render(); }
document.addEventListener('click', (e) => { const b = e.target.closest('[data-go]'); if (b) go(b.dataset.go); });
$('bell').onclick = async () => toast(t(('Notification' in window && (await Notification.requestPermission()) === 'granted') ? 'n.on' : 'n.off'), true);

/* ---- Jadwal shalat (Aladhan, metode Kemenag RI) ---- */
let times = {}, fired = new Set(), locInfo = null;
async function loadTimes() {
  const { lat, lon, ok } = await place(), key = 'rs.t.' + dayKey() + lat.toFixed(1) + lon.toFixed(1); let tm = store.get(key); locInfo = { lat, lon, ok, name: '', failed: false };
  if (ok) { const my = locInfo; placeName(lat, lon).then((n) => { my.name = n; my.failed = !n; renderHome(); }); }
  if (!tm) { try { const d = new Date(), r = await (await fetch(`https://api.aladhan.com/v1/timings/${z(d.getDate())}-${z(d.getMonth() + 1)}-${d.getFullYear()}?latitude=${lat}&longitude=${lon}&method=20`)).json(); tm = r.data.timings; store.set(key, tm); } catch { delete $('locTxt').dataset.i; $('locTxt').textContent = t('tm.fail'); return; } }
  PR.forEach((p) => { const [h, m] = tm[p.k].split(':'); const d = new Date(); d.setHours(+h, +m, 0, 0); times[p.id] = d; });
  renderHome(); selectCurrent();
}
$('loc').onclick = () => { locInfo = null; $('locTxt').dataset.i = 'tm.load'; $('locTxt').textContent = t('tm.load'); loadTimes(); };
const nextPrayer = () => PR.find((p) => times[p.id] && times[p.id] > new Date()) || { ...PR[0], tomorrow: true };
const hm = (d) => z(d.getHours()) + ':' + z(d.getMinutes());
function renderHome() {
  const log = store.get('rs.log', {}), today = log[dayKey()] || {}, nx = times.subuh ? nextPrayer() : {};
  if (locInfo) { delete $('locTxt').dataset.i; $('locTxt').textContent = !locInfo.ok ? t('tm.def') : locInfo.name || (locInfo.failed ? t('tm.noname') : t('tm.find')); }
  $('tgrid').innerHTML = PR.map((p) => `<button class="tc ${nx.id === p.id ? 'next' : ''} ${today[p.id] ? 'done' : ''}" data-id="${p.id}" aria-pressed="${!!today[p.id]}" aria-label="${pName(p.id)}, ${t('mark')}"><span>${times[p.id] ? hm(times[p.id]) : '--:--'}</span>${ic(p.i, 26)}${pName(p.id)}</button>`).join('');
  let s = 0; for (let d = new Date(); ; d.setDate(d.getDate() - 1)) { const l = log[dayKey(d)]; if (l && PR.every((p) => l[p.id])) s++; else if (dayKey(d) === dayKey()) continue; else break; }
  $('hStreak').textContent = s; { const c = store.get('rs.cam', null); $('hCam').textContent = c && c.score != null ? c.score + '%' : '–'; } $('hDone').textContent = PR.filter((p) => today[p.id]).length + '/5';
  setDates(); if (times.subuh) $('nextName').textContent = pName(nextPrayer().id);
}
$('tgrid').onclick = (e) => { const b = e.target.closest('.tc'); if (b) mark(b.dataset.id, !(store.get('rs.log', {})[dayKey()] || {})[b.dataset.id]); };
function mark(id, v) { const log = store.get('rs.log', {}); (log[dayKey()] ||= {})[id] = v; store.set('rs.log', log); renderHome(); }
setInterval(() => {
  if (!times.subuh) return; const now = new Date(), n = nextPrayer(); let tt = times[n.id]; if (n.tomorrow) tt = new Date(tt.getTime() + 864e5);
  const s = Math.max(0, Math.floor((tt - now) / 1000)); $('nextName').textContent = pName(n.id); $('nextTime').textContent = hm(tt);
  $('countdown').textContent = `${z(Math.floor(s / 3600))}:${z(Math.floor(s % 3600 / 60))}:${z(s % 60)} ${t('tm.left')}`;
  PR.forEach((p) => { const d = times[p.id]; if (d && Math.abs(now - d) < 1000 && !fired.has(dayKey() + p.id)) { fired.add(dayKey() + p.id); beep(520); toast(t('tm.now', { n: pName(p.id) }), true); if (Notification.permission === 'granted') new Notification(pName(p.id), { body: t('tm.now', { n: pName(p.id) }) }); renderHome(); } });
}, 1000);

/* ---- Penghitung rakaat (wajib + sunnah dengan rakaat yang bisa diatur) ---- */
/** Bawaan rakaat sunnah per shalat (q = qabliyah, b = ba'diyah, x = sunnah lain). Bisa diubah pengguna 1..MAXS dan disimpan per akun ('rs.sn'). */
const SN = { subuh: { q: 2 }, dzuhur: { q: 4, b: 2 }, ashar: { q: 4 }, maghrib: { q: 2, b: 2 }, isya: { q: 2, b: 2 }, dhuha: { x: 2 }, tahajud: { x: 2 }, witir: { x: 3 } };
const EXTRA = ['dhuha', 'tahajud', 'witir'], MAXS = 4;
let mode = store.get('rs.pk', 'shirt'), pid = 'subuh', kind = 'f', finished = false;
if (mode !== 'shirt' && mode !== 'pants') mode = 'shirt';
const sGet = () => store.get('rs.sn', {});
const sTgt = (id, k) => Math.min(MAXS, Math.max(1, sGet()[id + '.' + k] ?? SN[id][k]));
const tgt = () => (kind === 'f' ? PR.find((p) => p.id === pid).r : sTgt(pid, kind));
const lk = (id = pid, k = kind) => (k === 'f' ? id : id + ':' + k); // kunci catatan harian; wajib memakai id biasa agar streak & panel admin tetap sama
const doneToday = (key) => !!(store.get('rs.log', {})[dayKey()] || {})[key];
function pills() {
  const ex = EXTRA.includes(pid), n = ex || kind !== 'f' ? sTgt(pid, kind === 'f' ? 'x' : kind) : 0;
  $('pPills').innerHTML = PR.map((p) => `<button class="pill ${p.id === pid ? 'on' : ''}" data-id="${p.id}">${pName(p.id)}</button>`).join('');
  $('xPills').innerHTML = EXTRA.map((id) => `<button class="pill x ${id === pid ? 'on' : ''} ${doneToday(id + ':x') ? 'dn' : ''}" data-id="${id}">${pName(id)}</button>`).join('');
  $('kindBox').hidden = ex;
  document.querySelectorAll('#kinds button').forEach((b) => { const k = b.dataset.k; b.disabled = k !== 'f' && !SN[pid]?.[k]; b.classList.toggle('on', k === kind); b.classList.toggle('dn', !b.disabled && doneToday(lk(pid, k))); b.setAttribute('aria-selected', k === kind); });
  $('nob').hidden = ex || !!SN[pid]?.b;
  $('stepBox').hidden = kind === 'f'; if (kind !== 'f') { $('stepTxt').textContent = t('rk.sn.t', { m: MAXS }); $('snN').textContent = n; $('snDn').disabled = counter.on || n <= 1; $('snUp').disabled = counter.on || n >= MAXS; }
  $('rkSel').textContent = [pName(pid), t('rk.k.' + kind), t('rk.sn.n', { n: tgt() })].join(' · ');
  document.querySelectorAll('#pockets .pk-c').forEach((x) => x.classList.toggle('on', x.dataset.m === mode));
}
function setPrayer(id, k) {
  if (counter.on) return; pid = id;
  if (EXTRA.includes(id)) kind = 'x'; else { if (k) kind = k; if (kind === 'x' || (kind !== 'f' && !SN[id][kind])) kind = 'f'; }
  finished = false; pills(); refresh();
}
const selectCurrent = () => setPrayer((PR.filter((p) => times[p.id] && times[p.id] <= new Date()).pop() || PR[0]).id);
const pickPrayer = (e) => { const b = e.target.closest('[data-id]'); if (b) setPrayer(b.dataset.id); };
$('pPills').onclick = pickPrayer; $('xPills').onclick = pickPrayer;
$('kinds').onclick = (e) => { const b = e.target.closest('[data-k]'); if (!b || b.disabled || counter.on) return; kind = b.dataset.k; finished = false; pills(); refresh(); };
function snStep(d) { if (counter.on || kind === 'f') return; const c = sGet(); c[pid + '.' + kind] = Math.min(MAXS, Math.max(1, sTgt(pid, kind) + d)); store.set('rs.sn', c); finished = false; pills(); refresh(); }
$('snUp').onclick = () => snStep(1); $('snDn').onclick = () => snStep(-1);
$('pockets').onclick = (e) => { const b = e.target.closest('[data-m]'); if (!b || counter.on) return; mode = b.dataset.m; store.set('rs.pk', mode); pills(); };
const setPhase = (k, v) => { $('phase').dataset.i = k; $('phase').textContent = t(k, v); };
const counter = createCounter({
  onCal: (s) => { delete $('phase').dataset.i; $('phase').textContent = t('rk.cal', { n: s }); },
  onReady: () => { beep(880); setPhase('rk.ready'); },
  onAngle: (a) => { $('ang').style.width = Math.min(100, a / 90 * 100) + '%'; $('angTxt').textContent = Math.round(a); setPhase(counter.phase()); },
  onStep: () => { navigator.vibrate?.(120); refresh(true); },
});
function refresh(step) {
  const r = counter.rakaat(), tg = tgt(); $('ruku').textContent = counter.ruku(); $('rukuT').textContent = '/ ' + tg; $('sujud').textContent = counter.sujud(); $('sujudT').textContent = '/ ' + tg * 2; $('rakaat').textContent = r;
  if (!step) return; ['cBig', 'cSm'].forEach((id) => { $(id).classList.remove('pop'); void $(id).offsetWidth; $(id).classList.add('pop'); });
  if (r >= tg && !finished) { finished = true; beep(990); navigator.vibrate?.([200, 100, 200]); toast(t('rk.done', { n: tg }), true); mark(lk(), true); pills(); }
  else if (r > tg) toast(t('rk.over', { n: tg }));
}
/* Layar dijaga tetap menyala selama penghitungan (sensor gerak berhenti bila layar mati). */
let wl = null;
const keepAwake = async () => { try { wl = (await navigator.wakeLock?.request('screen')) || null; } catch { wl = null; } };
const letSleep = () => { try { wl?.release(); } catch {} wl = null; };
document.addEventListener('visibilitychange', () => { if (!document.hidden && counter.on) keepAwake(); });
$('cStart').onclick = async () => {
  if (counter.on) { counter.stop(); letSleep(); setBtn($('cStart'), 'rk.start'); pills(); return; }
  try { finished = false; await counter.start(mode); keepAwake(); pills(); refresh(); setBtn($('cStart'), 'rk.stop'); } catch { toast(t('rk.err')); }
};
$('plus').onclick = () => { counter.adjust(1); refresh(true); }; $('minus').onclick = () => { counter.adjust(-1); finished = false; refresh(); };

/* ---- Panduan animasi (cara menaruh HP di saku & cara memakai aplikasi) ---- */
if (!store.get('rs.gd', 0)) $('guideBtn').classList.add('new');
$('guideBtn').onclick = () => openGuide(mode); $('homeGuide').onclick = () => openGuide(mode);

/* ---- Koreksi gerakan (kamera) ---- */
let camOn = false, errs = 0, lastScore = null, camSave = 0;
const saveCam = () => { if (lastScore == null) return; store.set('rs.cam', { score: lastScore, at: Date.now() }); renderHome(); };
$('camBtn').onclick = async () => {
  if (camOn) { stopPose($('video')); camOn = false; clearInterval(camSave); saveCam(); setBtn($('camBtn'), 'cam.start'); return; }
  setBtn($('camBtn'), 'cam.load'); errs = 0; lastScore = null; $('errs').textContent = 0;
  try {
    await startPose($('video'), $('ov'), {
      posture: (n, bad) => { $('posture').dataset.i = 'po.' + n; $('posture').textContent = t('po.' + n); $('posture').classList.toggle('bad', bad); },
      score: (s) => { lastScore = s; $('score').textContent = s + '%'; },
      error: (code) => { errs++; $('errs').textContent = errs; const s = t('cam.warn', { m: t('e.' + code) }); toast(s); speak(s, lang()); navigator.vibrate?.(200); },
    }); camOn = true; camSave = setInterval(saveCam, 8000); setBtn($('camBtn'), 'rk.stop');
  } catch { setBtn($('camBtn'), 'cam.start'); toast(t('cam.err')); }
};

hooks.push(() => { setDates(); renderHome(); pills(); refresh(); });
setPrayer('subuh'); renderHome(); loadTimes(); syncStats(1500);
