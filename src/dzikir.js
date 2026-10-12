/** dzikir.js — penghitung dzikir, paket setelah shalat, ringkasan grafik hari/minggu/bulan/tahun. */
import { $, store, dayKey, toast, beep } from './util.js';
import { t, lang, hooks } from './i18n.js';
const LIST = [
  { id: 'sub', ar: 'سُبْحَانَ اللّٰهِ', t: 33 }, { id: 'alh', ar: 'اَلْحَمْدُ لِلّٰهِ', t: 33 }, { id: 'akb', ar: 'اَللّٰهُ أَكْبَرُ', t: 34 },
  { id: 'ist', ar: 'أَسْتَغْفِرُ اللّٰهَ', t: 100 }, { id: 'tah', ar: 'لَا إِلٰهَ إِلَّا اللّٰهُ', t: 100 }, { id: 'sal', ar: 'اَللّٰهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ', t: 100 },
];
const PACK = [['ist', 3], ['sub', 33], ['alh', 33], ['akb', 34]], nm = (id) => t('dz.' + id);
let cur = LIST[0], tgt = 33, count = 0, set = 1, t0 = 0, pk = -1, rng = 'day', inSum = false, D = store.get('rs.dz', {});

function chips() { $('chips').innerHTML = LIST.map((d) => `<button class="pill ${d.id === cur.id ? 'on' : ''}" data-id="${d.id}">${nm(d.id)}</button>`).join(''); }
function show() { $('arab').textContent = cur.ar; $('tr').textContent = `${nm(cur.id)} · ${t('dm.' + cur.id)}`; $('dTgt').textContent = tgt; $('dSet').textContent = set; $('dNum').textContent = String(count).padStart(3, '0'); chips(); }
function pick(id, n, fromPack) { cur = LIST.find((d) => d.id === id); tgt = n ?? cur.t; count = 0; set = 1; t0 = 0; if (!fromPack) pk = -1; show(); }
$('chips').onclick = (e) => e.target.dataset.id && pick(e.target.dataset.id);
$('pack').onclick = () => { pk = 0; pick(PACK[0][0], PACK[0][1], true); toast(t('dz.packOn'), true); };

function save() { const d = (D[dayKey()] ||= { total: 0, items: {}, hours: Array(24).fill(0) }); d.total++; d.items[cur.id] = (d.items[cur.id] || 0) + 1; d.hours[new Date().getHours()]++; store.set('rs.dz', D); }
$('tap').onclick = () => {
  if (!t0) t0 = performance.now(); count++; save(); navigator.vibrate?.(25);
  $('tap').classList.remove('hit'); void $('tap').offsetWidth; $('tap').classList.add('hit');
  if (count >= tgt) { beep(880); navigator.vibrate?.([120, 60, 120]);
    if (pk >= 0) { pk++; if (pk < PACK.length) { toast(t('dz.next', { n: nm(PACK[pk][0]), c: PACK[pk][1] }), true); pick(PACK[pk][0], PACK[pk][1], true); return; } pk = -1; toast(t('dz.packDone'), true); }
    count = 0; set++; }
  show();
};
$('dReset').onclick = () => { count = 0; set = 1; t0 = 0; show(); };
$('dUndo').onclick = () => { if (count > 0) { count--; const d = D[dayKey()], h = new Date().getHours(); if (d) { d.total--; d.items[cur.id]--; d.hours[h] = Math.max(0, d.hours[h] - 1); store.set('rs.dz', D); } show(); } };
setInterval(() => { const s = t0 ? Math.floor((performance.now() - t0) / 1000) : 0; $('dTime').textContent = `${Math.floor(s / 3600)}:${String(Math.floor(s % 3600 / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }, 1000);

/* ---- Ringkasan ---- */
const back = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
function series() {
  const T = D[dayKey()]; let labels = [], vals = [], keys = [];
  if (rng === 'day') { for (let i = 0; i < 8; i++) { labels.push(String(i * 3).padStart(2, '0')); vals.push(T ? T.hours.slice(i * 3, i * 3 + 3).reduce((a, b) => a + b, 0) : 0); } keys = [dayKey()]; }
  else if (rng === 'week' || rng === 'month') { const n = rng === 'week' ? 7 : 30; for (let i = n - 1; i >= 0; i--) { const d = back(i), k = dayKey(d); keys.push(k); vals.push(D[k]?.total || 0); labels.push(rng === 'week' ? d.toLocaleDateString(lang(), { weekday: 'short' }) : (i % 5 === 0 ? d.getDate() : '')); } }
  else { const y = new Date().getFullYear(); for (let m = 0; m < 12; m++) { const ks = Object.keys(D).filter((k) => k.startsWith(`${y}-${String(m + 1).padStart(2, '0')}`)); keys.push(...ks); vals.push(ks.reduce((a, k) => a + D[k].total, 0)); labels.push(new Date(y, m, 1).toLocaleDateString(lang(), { month: 'narrow' })); } }
  return { labels, vals, keys };
}
function renderSum() {
  const { labels, vals, keys } = series(), mx = Math.max(10, ...vals), w = 320 / vals.length;
  $('bars').innerHTML = vals.map((v, i) => { const h = v / mx * 110, bw = Math.min(26, w * 0.6); return `<rect x="${i * w + (w - bw) / 2}" y="${120 - h}" width="${bw}" height="${Math.max(h, 3)}" rx="${bw / 2.5}" fill="${v ? '#0E8F55' : '#0e7c4a22'}"/><text x="${i * w + w / 2}" y="140">${labels[i]}</text>`; }).join('');
  $('sTot').textContent = Object.values(D).reduce((a, d) => a + d.total, 0); $('sDay').textContent = D[dayKey()]?.total || 0;
  const agg = {}; keys.forEach((k) => D[k] && Object.entries(D[k].items).forEach(([id, n]) => (agg[id] = (agg[id] || 0) + n)));
  $('sList').innerHTML = Object.entries(agg).filter(([, n]) => n > 0).map(([id, n]) => `<div class="li"><span>${nm(id)}</span><b>${n}x</b></div>`).join('') || `<p class="mute small">${t('dz.empty')}</p>`;
}
$('rng').onclick = (e) => { if (e.target.dataset.r) { rng = e.target.dataset.r; document.querySelectorAll('#rng .pill').forEach((p) => p.classList.toggle('on', p === e.target)); renderSum(); } };
function view(s) { inSum = s; $('dzMain').hidden = s; $('dzSum').hidden = !s; $('back').hidden = !s; $('sumBtn').hidden = s; $('dzTitle').dataset.i = s ? 'dz.sum' : 'dz.title'; $('dzTitle').textContent = t(s ? 'dz.sum' : 'dz.title'); if (s) renderSum(); }
$('sumBtn').onclick = () => view(true); $('back').onclick = () => view(false);
hooks.push(() => { show(); if (inSum) renderSum(); }); show();
export const dzToday = () => D[dayKey()]?.total || 0;
