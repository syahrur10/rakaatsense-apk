/** dzikir.js — penghitung dzikir + paket setelah shalat. Riwayat & grafik ada di Laporan (report.js, tab Dzikir).
 *  Disimpan per akun di 'rs.dz' = { 'YYYY-MM-DD': { total, items: {id: n}, hours: [24], sets: {id: n}, last: ms } }. */
import { $, store, dayKey, toast, beep } from './util.js';
import { t, lang, hooks } from './i18n.js';
const LIST = [
  { id: 'sub', ar: 'سُبْحَانَ اللّٰهِ', t: 33 }, { id: 'alh', ar: 'اَلْحَمْدُ لِلّٰهِ', t: 33 }, { id: 'akb', ar: 'اَللّٰهُ أَكْبَرُ', t: 34 },
  { id: 'ist', ar: 'أَسْتَغْفِرُ اللّٰهَ', t: 100 }, { id: 'tah', ar: 'لَا إِلٰهَ إِلَّا اللّٰهُ', t: 100 }, { id: 'sal', ar: 'اَللّٰهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ', t: 100 },
];
const PACK = [['ist', 3], ['sub', 33], ['alh', 33], ['akb', 34]], nm = (id) => t('dz.' + id);
let cur = LIST[0], tgt = 33, count = 0, set = 1, t0 = 0, pk = -1, D = store.get('rs.dz', {});
export const DZIKIR = LIST, dzData = () => D;
/** hapus seluruh riwayat dzikir (dipakai tombol Hapus di Laporan) */
export function dzClear() { Object.keys(D).forEach((k) => delete D[k]); store.set('rs.dz', D); }

function chips() { $('chips').innerHTML = LIST.map((d) => `<button class="pill ${d.id === cur.id ? 'on' : ''}" data-id="${d.id}">${nm(d.id)}</button>`).join(''); }
function show() { $('arab').textContent = cur.ar; $('tr').textContent = `${nm(cur.id)} · ${t('dm.' + cur.id)}`; $('dTgt').textContent = tgt; $('dSet').textContent = set; $('dNum').textContent = String(count).padStart(3, '0'); chips(); }
function pick(id, n, fromPack) { cur = LIST.find((d) => d.id === id); tgt = n ?? cur.t; count = 0; set = 1; t0 = 0; if (!fromPack) pk = -1; show(); }
$('chips').onclick = (e) => e.target.dataset.id && pick(e.target.dataset.id);
$('pack').onclick = () => { pk = 0; pick(PACK[0][0], PACK[0][1], true); toast(t('dz.packOn'), true); };

function save(setDone) { const d = (D[dayKey()] ||= { total: 0, items: {}, hours: Array(24).fill(0) }); d.total++; d.items[cur.id] = (d.items[cur.id] || 0) + 1; d.hours[new Date().getHours()]++; d.last = Date.now(); if (setDone) { d.sets ||= {}; d.sets[cur.id] = (d.sets[cur.id] || 0) + 1; } store.set('rs.dz', D); }
$('tap').onclick = () => {
  if (!t0) t0 = performance.now(); count++; save(count >= tgt); navigator.vibrate?.(25);
  $('tap').classList.remove('hit'); void $('tap').offsetWidth; $('tap').classList.add('hit');
  if (count >= tgt) { beep(880); navigator.vibrate?.([120, 60, 120]);
    if (pk >= 0) { pk++; if (pk < PACK.length) { toast(t('dz.next', { n: nm(PACK[pk][0]), c: PACK[pk][1] }), true); pick(PACK[pk][0], PACK[pk][1], true); return; } pk = -1; toast(t('dz.packDone'), true); }
    count = 0; set++; }
  show();
};
$('dReset').onclick = () => { count = 0; set = 1; t0 = 0; show(); };
$('dUndo').onclick = () => { if (count > 0) { count--; const d = D[dayKey()], h = new Date().getHours(); if (d) { d.total--; d.items[cur.id]--; d.hours[h] = Math.max(0, d.hours[h] - 1); store.set('rs.dz', D); } show(); } };
setInterval(() => { const s = t0 ? Math.floor((performance.now() - t0) / 1000) : 0; $('dTime').textContent = `${Math.floor(s / 3600)}:${String(Math.floor(s % 3600 / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }, 1000);

hooks.push(show); show();
export const dzToday = () => D[dayKey()]?.total || 0;
