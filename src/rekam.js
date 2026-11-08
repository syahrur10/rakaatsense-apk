/** rekam.js — halaman REKAM DATA (kontribusi data penelitian ML). Merekam sensor gerak HP (accelerometer + gyroscope) dengan label gerakan shalat,
 *  lalu pengguna mengekspor CSV (bagikan / unduh / salin). Tidak ada kamera, mikrofon, lokasi, atau nama; kode relawan acak. Data TIDAK dikirim otomatis.
 *  Format CSV = masukan tools/ml/train.py:  t_ms,ax,ay,az,rx,ry,rz,label,pos,subject,session
 *  Dua cara memberi label: DIPANDU (aplikasi memberi aba-aba getar tiap ganti gerakan; durasi diacak ±) dan MANUAL (pendamping menekan tombol gerakan). */
import { $, store, toast, beep } from './util.js';
import { t, hooks, LANGS } from './i18n.js';
import { esc } from './prayers.js';

const LABELS = ['berdiri', 'rukuk', 'itidal', 'sujud', 'duduk', 'tahiyat'];
const U = {
  id: {
    'rc.entry.t': 'Kontribusi Data Penelitian (ML)', 'rc.entry.d': 'Rekam gerakan shalat dari sensor HP untuk melatih model Machine Learning.',
    'rc.title': 'Rekam Data Gerakan', 'rc.back': 'Kembali',
    'rc.intro': 'Rekaman ini dipakai untuk melatih model pengenal gerakan shalat. Yang direkam hanya sensor gerak HP dan label gerakan. Tidak ada kamera, suara, lokasi, atau nama.',
    'rc.consent': 'Saya setuju datanya dipakai untuk penelitian (tanpa identitas) dan saya sendiri yang mengirim berkasnya.', 'rc.consent.need': 'Centang persetujuan dulu.',
    'rc.id': 'Kode relawan', 'rc.pos': 'Posisi HP', 'rc.pos.shirt': 'Saku baju', 'rc.pos.pants': 'Saku celana',
    'rc.mode': 'Cara pelabelan', 'rc.mode.g': 'Dipandu', 'rc.mode.m': 'Manual (ada pendamping)', 'rc.n': 'Jumlah rakaat latihan',
    'rc.tip.g': 'Ikuti aba-aba layar: berdiri tegak 3 detik dulu, lalu ikuti gerakan tiap HP bergetar. Gerakan bisa dilakukan tanpa niat shalat (latihan gerak).',
    'rc.tip.m': 'Letakkan HP di saku, berdiri tegak 3 detik, lalu pendamping menekan tombol gerakan yang SEDANG dilakukan, saat gerakan berganti.',
    'rc.start': 'Mulai merekam', 'rc.stop': 'Selesai & simpan', 'rc.cal': 'Berdiri tegak, diam…', 'rc.now': 'Sekarang', 'rc.next': 'Berikutnya',
    'rc.l.kalibrasi': 'Kalibrasi (diam)', 'rc.l.berdiri': 'Berdiri', 'rc.l.rukuk': 'Rukuk', 'rc.l.itidal': "I'tidal", 'rc.l.sujud': 'Sujud', 'rc.l.duduk': 'Duduk antara dua sujud', 'rc.l.tahiyat': 'Tahiyat',
    'rc.done': 'Rekaman selesai', 'rc.sum': '{n} baris · {s} detik · ±{hz} Hz', 'rc.share': 'Bagikan berkas', 'rc.dl': 'Unduh CSV', 'rc.copy': 'Salin teks', 'rc.copied': 'Tersalin.',
    'rc.warn.hz': 'Laju sensor rendah (<20 Hz). Data kurang baik untuk dilatih.', 'rc.warn.short': 'Rekaman terlalu pendek (<15 detik).', 'rc.err': 'Sensor gerak tidak tersedia atau izin ditolak. Gunakan HP asli dan HTTPS.',
    'rc.help': 'Kirim berkas CSV ke peneliti. Satu berkas = satu sesi. Target minimal: 10+ relawan × 2 posisi × 3 sesi.', 'ml.on': 'Mode pengenal gerakan ML aktif',
  },
  en: {
    'rc.entry.t': 'Research Data Contribution (ML)', 'rc.entry.d': 'Record prayer movements from the phone sensors to train a Machine Learning model.',
    'rc.title': 'Record Movement Data', 'rc.back': 'Back',
    'rc.intro': 'These recordings train a prayer-movement recognition model. Only phone motion sensors and movement labels are recorded. No camera, audio, location or name.',
    'rc.consent': 'I agree my data may be used for research (no identity) and I will send the file myself.', 'rc.consent.need': 'Please tick the consent first.',
    'rc.id': 'Volunteer code', 'rc.pos': 'Phone position', 'rc.pos.shirt': 'Shirt pocket', 'rc.pos.pants': 'Trouser pocket',
    'rc.mode': 'Labelling method', 'rc.mode.g': 'Guided', 'rc.mode.m': 'Manual (with a helper)', 'rc.n': 'Practice rakats',
    'rc.tip.g': 'Follow the on-screen cues: stand still for 3 seconds, then change movement each time the phone vibrates. You can do the movements as practice, without praying.',
    'rc.tip.m': 'Put the phone in your pocket, stand still for 3 seconds, then a helper taps the movement you are doing NOW whenever it changes.',
    'rc.start': 'Start recording', 'rc.stop': 'Finish & save', 'rc.cal': 'Stand still…', 'rc.now': 'Now', 'rc.next': 'Next',
    'rc.l.kalibrasi': 'Calibration (still)', 'rc.l.berdiri': 'Standing', 'rc.l.rukuk': 'Ruku', 'rc.l.itidal': "I'tidal", 'rc.l.sujud': 'Sujud', 'rc.l.duduk': 'Sitting between sujud', 'rc.l.tahiyat': 'Tashahhud',
    'rc.done': 'Recording finished', 'rc.sum': '{n} rows · {s} s · ~{hz} Hz', 'rc.share': 'Share file', 'rc.dl': 'Download CSV', 'rc.copy': 'Copy text', 'rc.copied': 'Copied.',
    'rc.warn.hz': 'Low sensor rate (<20 Hz). Not good enough for training.', 'rc.warn.short': 'Recording too short (<15 s).', 'rc.err': 'Motion sensor unavailable or permission denied. Use a real phone over HTTPS.',
    'rc.help': 'Send the CSV file to the researcher. One file = one session. Minimum target: 10+ volunteers × 2 positions × 3 sessions.', 'ml.on': 'ML movement recognition is on',
  },
};
U.ar = U.en; U.ms = { ...U.id, 'rc.pos.pants': 'Poket seluar', 'rc.pos.shirt': 'Poket baju' };
Object.entries(U).forEach(([l, o]) => Object.assign(LANGS[l][1], o));

/* ---------- rencana dipandu ---------- */
/** Urutan (gerakan, detik) untuk n rakaat; durasi diacak 0,8–1,3× supaya model tidak belajar "ketukan waktu". */
export function plan(n, rnd = Math.random) {
  const p = [['kalibrasi', 3]];
  for (let i = 1; i <= n; i++) {
    p.push(['berdiri', i === 1 ? 4 : 3], ['rukuk', 3], ['itidal', 2.5], ['sujud', 3], ['duduk', 2], ['sujud', 3]);
    if (i === 2 && n > 2) p.push(['tahiyat', 3]);
  }
  p.push(['tahiyat', 4]); return p.map(([l, d]) => [l, l === 'kalibrasi' ? d : +(d * (0.8 + 0.5 * rnd())).toFixed(2)]);
}
export const csvOf = (rows, meta) => 't_ms,ax,ay,az,rx,ry,rz,label,pos,subject,session\n' + rows.map((r) => `${r.join(',')},${meta.pos},${meta.subject},${meta.session}`).join('\n') + '\n';

/* ---------- keadaan ---------- */
const root = () => $('rc');
const S = { pos: store.get('rs.rc.pos', 'shirt'), mode: store.get('rs.rc.mode', 'g'), n: store.get('rs.rc.n', 2), ok: store.get('rs.rc.ok', false) };
let id = store.get('rs.rc.id', '') || (() => { const v = 'R' + Math.random().toString(36).slice(2, 7).toUpperCase(); store.set('rs.rc.id', v); return v; })();
let rec = null, last = null, wl = null, seq = 0;

function render() {
  const el = root(); if (!el) return;
  const recording = !!rec, dis = recording ? 'disabled' : '';
  const pill = (k, cur, v, lab) => `<button type="button" class="pill ${cur === v ? 'on' : ''}" data-rc="${k}" data-v="${v}" ${dis}>${esc(t(lab))}</button>`;
  el.innerHTML = `<button type="button" class="pill rc-back" data-go="ac">← ${esc(t('rc.back'))}</button><h2 class="ttl">${esc(t('rc.title'))}</h2>
<div class="card rc-card"><p>${esc(t('rc.intro'))}</p>
<label class="rc-ck"><input type="checkbox" id="rcOk" ${S.ok ? 'checked' : ''} ${dis}> <span>${esc(t('rc.consent'))}</span></label></div>
<div class="card rc-card"><div class="rc-row"><b>${esc(t('rc.id'))}</b><code>${esc(id)}</code></div>
<div class="rc-row"><b>${esc(t('rc.pos'))}</b><span class="rc-pills">${pill('pos', S.pos, 'shirt', 'rc.pos.shirt')}${pill('pos', S.pos, 'pants', 'rc.pos.pants')}</span></div>
<div class="rc-row"><b>${esc(t('rc.mode'))}</b><span class="rc-pills">${pill('mode', S.mode, 'g', 'rc.mode.g')}${pill('mode', S.mode, 'm', 'rc.mode.m')}</span></div>
${S.mode === 'g' ? `<div class="rc-row"><b>${esc(t('rc.n'))}</b><span class="rc-pills">${[1, 2, 3, 4].map((n) => `<button type="button" class="pill ${S.n === n ? 'on' : ''}" data-rc="n" data-v="${n}" ${dis}>${n}</button>`).join('')}</span></div>` : ''}
<p class="rc-tip">${esc(t(S.mode === 'g' ? 'rc.tip.g' : 'rc.tip.m'))}</p></div>
<div class="card rc-live" id="rcLive" ${recording ? '' : 'hidden'}><small>${esc(t('rc.now'))}</small><div class="rc-big" id="rcNow"></div><small id="rcNext"></small>
${S.mode === 'm' ? `<div class="rc-labs">${LABELS.map((l) => `<button type="button" class="pill" data-rc="lab" data-v="${l}">${esc(t('rc.l.' + l))}</button>`).join('')}</div>` : ''}</div>
<button type="button" class="btn" data-rc="${recording ? 'stop' : 'start'}">${esc(t(recording ? 'rc.stop' : 'rc.start'))}</button>
<div id="rcRes">${last ? result() : ''}</div><p class="rc-tip">${esc(t('rc.help'))}</p>`;
  if (recording) paintLive();
}
function result() {
  const w = [last.hz < 20 && 'rc.warn.hz', last.s < 15 && 'rc.warn.short'].filter(Boolean).map((k) => `<p class="au-err">${esc(t(k))}</p>`).join('');
  return `<div class="card rc-card"><h3>${esc(t('rc.done'))}</h3><p>${esc(t('rc.sum', { n: last.rows, s: last.s, hz: last.hz }))}</p><code class="rc-file">${esc(last.name)}</code>${w}
<div class="rc-act"><button type="button" class="btn" data-rc="share">${esc(t('rc.share'))}</button><button type="button" class="btn ghost" data-rc="dl">${esc(t('rc.dl'))}</button><button type="button" class="btn ghost" data-rc="copy">${esc(t('rc.copy'))}</button></div></div>`;
}
function paintLive() {
  if (!rec) return; const now = $('rcNow'), nx = $('rcNext'); if (!now) return;
  const l = rec.label; now.textContent = t('rc.l.' + l); now.dataset.l = l;
  const i = rec.plan ? rec.step + 1 : -1; nx.textContent = rec.plan && rec.plan[i] ? `${t('rc.next')}: ${t('rc.l.' + rec.plan[i][0])}` : '';
  document.querySelectorAll('#rcLive [data-rc="lab"]').forEach((b) => b.classList.toggle('on', b.dataset.v === l));
}

/* ---------- merekam ---------- */
function setLabel(l, cue) { if (!rec) return; rec.label = l; if (cue) { navigator.vibrate?.(l === 'sujud' ? [60, 40, 60] : 60); beep(l === 'sujud' ? 520 : 760); } paintLive(); }
function advance() {
  if (!rec?.plan) return; rec.step++; const s = rec.plan[rec.step];
  if (!s) return stop(); setLabel(s[0], rec.step > 0); rec.timer = setTimeout(advance, s[1] * 1000);
}
async function start() {
  if (!S.ok) return toast(t('rc.consent.need'));
  try {
    if (typeof DeviceMotionEvent !== 'undefined' && DeviceMotionEvent.requestPermission && (await DeviceMotionEvent.requestPermission()) !== 'granted') throw 0;
    if (!('DeviceMotionEvent' in window)) throw 0;
  } catch { return toast(t('rc.err')); }
  navigator.wakeLock?.request('screen').then((x) => { wl = x; if (!rec) { try { x.release(); } catch {} } }).catch(() => {}); // jangan menunggu: sensor harus mulai segera
  const rows = [], r1 = (v) => (v == null ? 0 : +v);
  const h = (e) => { const a = e.accelerationIncludingGravity; if (!a || a.x == null) return; const g = e.rotationRate || {}; rows.push([performance.now().toFixed(1), a.x.toFixed(3), a.y.toFixed(3), a.z.toFixed(3), r1(g.alpha).toFixed(3), r1(g.beta).toFixed(3), r1(g.gamma).toFixed(3), rec.label]); };
  last = null; rec = { rows, h, label: 'kalibrasi', plan: S.mode === 'g' ? plan(S.n) : null, step: 0, timer: 0, t0: performance.now() };
  window.addEventListener('devicemotion', h); render(); paintLive();
  if (rec.plan) rec.timer = setTimeout(advance, rec.plan[0][1] * 1000); else rec.timer = setTimeout(() => setLabel('berdiri', true), 3000);
}
function stop(silent) {
  if (!rec) return; const r = rec; rec = null; clearTimeout(r.timer); window.removeEventListener('devicemotion', r.h);
  try { wl?.release(); } catch {} wl = null;
  if (silent) return;
  const n = r.rows.length, secs = n > 1 ? (r.rows[n - 1][0] - r.rows[0][0]) / 1000 : 0, session = `${id}_${Date.now().toString(36)}_${++seq}`;
  last = { rows: n, s: Math.round(secs), hz: secs ? Math.round(n / secs) : 0, name: `rakaatsense_${S.pos}_${session}.csv`, csv: csvOf(r.rows, { pos: S.pos, subject: id, session }) };
  if (!n) { last = null; toast(t('rc.err')); } render();
}
async function share() {
  if (!last) return; const file = new File([last.csv], last.name, { type: 'text/csv' });
  try { if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: last.name }); return; } } catch (e) { if (e?.name === 'AbortError') return; }
  download();
}
function download() {
  if (!last) return; const u = URL.createObjectURL(new Blob([last.csv], { type: 'text/csv' })), a = document.createElement('a');
  a.href = u; a.download = last.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000);
}
async function copy() { try { await navigator.clipboard.writeText(last.csv); toast(t('rc.copied'), true); } catch { download(); } }

const save = () => { store.set('rs.rc.pos', S.pos); store.set('rs.rc.mode', S.mode); store.set('rs.rc.n', S.n); store.set('rs.rc.ok', S.ok); };
root().addEventListener('click', (e) => {
  const b = e.target.closest('[data-rc]'); if (!b || b.disabled) return; const a = b.dataset.rc, v = b.dataset.v;
  if (a === 'pos') { S.pos = v; save(); render(); } else if (a === 'mode') { S.mode = v; save(); render(); } else if (a === 'n') { S.n = +v; save(); render(); }
  else if (a === 'lab') setLabel(v, false); else if (a === 'start') start(); else if (a === 'stop') stop();
  else if (a === 'share') share(); else if (a === 'dl') download(); else if (a === 'copy') copy();
});
root().addEventListener('change', (e) => { if (e.target.id === 'rcOk') { S.ok = e.target.checked; save(); } });
hooks.push(() => { if (root().classList.contains('on')) render(); });
export const enter = () => render();
export const leave = () => stop(true);
