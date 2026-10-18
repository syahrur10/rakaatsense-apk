/** report.js — LAPORAN SHALAT: riwayat tiap sesi (kamera / sensor) + tanda manual dari Beranda, per hari.
 *  Yang dicatat hanya JUMLAH RAKAAT yang terhitung dibanding targetnya (sesuai / kurang / lebih). Aplikasi tidak menilai sah atau tidaknya shalat.
 *  Disimpan per akun di 'rs.rp' = [{ sid, at, key, nm, src: 'cam'|'sensor', det, tgt, sujud, ev: {x, s, l} }], maks. CAP entri terakhir. */
import { $, store, dayKey, toast } from './util.js';
import { t, lang, hooks } from './i18n.js';
import { PRID, esc, keyLabel } from './prayers.js';

const CAP = 500;
let rg = 'week';
const DAYS = { day: 1, week: 7, month: 30 };
export const verdict = (r) => (r.det === r.tgt ? 'ok' : r.det < r.tgt ? 'less' : 'more');

/** Tambah sesi, atau perbarui bila sid sama (penghitung sensor memperbarui hasil tiap kali hitungan berubah). */
export function addSession(r) {
  const L = store.get('rs.rp', []), i = r.sid ? L.findIndex((x) => x.sid === r.sid) : -1;
  if (!(r.det > 0 || r.sujud > 0)) { if (i >= 0) { L.splice(i, 1); store.set('rs.rp', L); } return; } // tidak ada hitungan = tidak dicatat
  const rec = { ...r, at: i >= 0 ? L[i].at : Date.now() };
  if (i >= 0) L[i] = rec; else L.push(rec);
  store.set('rs.rp', L.slice(-CAP));
}

const tm = (at) => new Date(at).toLocaleTimeString(lang(), { hour: '2-digit', minute: '2-digit' });

/** data laporan untuk rentang terpilih: [{ key, date, sessions, manual, fard, sn }] (hari tanpa catatan dilewati) */
function collect() {
  const L = store.get('rs.rp', []), log = store.get('rs.log', {}), out = [];
  for (let i = 0; i < DAYS[rg]; i++) {
    const d = new Date(); d.setDate(d.getDate() - i); const k = dayKey(d), l = log[k] || {};
    const sessions = L.filter((x) => dayKey(new Date(x.at)) === k).sort((a, b) => a.at - b.at);
    const manual = Object.keys(l).filter((x) => l[x] && !sessions.some((s) => s.key === x));
    if (!sessions.length && !manual.length) continue;
    out.push({ k, date: d, sessions, manual, fard: PRID.filter((p) => l[p]).length, sn: Object.keys(l).filter((x) => l[x] && x.includes(':')).length });
  }
  return out;
}
const dlabel = (d) => d.toLocaleDateString(lang(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const vtext = (r) => { const v = verdict(r); return v === 'ok' ? t('rp.v.ok') : t('rp.v.' + v, { n: Math.abs(r.det - r.tgt) }); };
const notes = (r) => [r.ev?.x && t('rp.n.x', { n: r.ev.x }), r.ev?.s && t('rp.n.s', { n: r.ev.s }), r.ev?.l && t('rp.n.l', { n: r.ev.l })].filter(Boolean);

export function render() {
  const data = collect(), all = data.flatMap((d) => d.sessions), c = { ok: 0, less: 0, more: 0 };
  all.forEach((r) => c[verdict(r)]++);
  document.querySelectorAll('#rpRng button').forEach((b) => b.classList.toggle('on', b.dataset.r === rg));
  $('rpSum').innerHTML = [[all.length, 'sess'], [c.ok, 'ok'], [c.less, 'less'], [c.more, 'more']].map(([n, k]) => `<div><b>${n}</b><small>${t('rp.s.' + k)}</small></div>`).join('');
  $('rpList').innerHTML = data.length ? data.map((d) => `<div class="rp-day">${esc(dlabel(d.date))}<small>${t('rp.d.fard', { n: d.fard })} · ${t('rp.d.sn', { n: d.sn })}</small></div><ul class="rp-list">`
    + d.sessions.map((r) => `<li class="rp-row"><span class="rp-t">${tm(r.at)}</span><span class="rp-m"><b>${esc(keyLabel(r.key, r.nm))}</b><small>${t('rp.cnt', { n: r.det, m: r.tgt })}${r.sujud ? ' · ' + t('rp.sujud', { n: r.sujud }) : ''} · ${t('rp.src.' + r.src)}</small></span><span class="rp-chip ${verdict(r)}">${vtext(r)}</span>`
      + (notes(r).length ? `<span class="rp-n">${notes(r).map(esc).join(' · ')}</span>` : '') + `<button type="button" class="rp-x" data-del="${esc(r.sid || r.at)}" aria-label="${t('rp.del')}">×</button></li>`).join('')
    + d.manual.map((x) => `<li class="rp-row man"><span class="rp-t">—</span><span class="rp-m"><b>${esc(keyLabel(x, nmSnap(x)))}</b><small>${t('rp.src.manual')}</small></span><span class="rp-chip man">${t('rp.v.manual')}</span></li>`).join('')
    + '</ul>').join('') : `<p class="mute small rp-empty">${t('rp.empty')}</p>`;
  $('rpTools').hidden = !data.length;
}
/** nama cadangan untuk tanda manual shalat buatan sendiri yang sudah dihapus: ambil dari sesi lama bila ada */
const nmSnap = (key) => store.get('rs.rp', []).find((x) => x.key === key)?.nm;

function text() {
  const lines = [t('rp.head'), t('rp.r.' + rg)];
  collect().forEach((d) => {
    lines.push('', dlabel(d.date) + ` (${t('rp.d.fard', { n: d.fard })} · ${t('rp.d.sn', { n: d.sn })})`);
    d.sessions.forEach((r) => lines.push(`- ${tm(r.at)} ${keyLabel(r.key, r.nm)}: ${t('rp.cnt', { n: r.det, m: r.tgt })} → ${vtext(r)} (${t('rp.src.' + r.src)})`));
    d.manual.forEach((x) => lines.push(`- ${keyLabel(x, nmSnap(x))}: ${t('rp.v.manual')}`));
  });
  return lines.join('\n');
}

$('rpRng').onclick = (e) => { const b = e.target.closest('[data-r]'); if (b) { rg = b.dataset.r; render(); } };
$('rpList').onclick = (e) => {
  const b = e.target.closest('[data-del]'); if (!b || !confirm(t('rp.delq'))) return;
  store.set('rs.rp', store.get('rs.rp', []).filter((x) => String(x.sid || x.at) !== b.dataset.del)); render();
};
$('rpCopy').onclick = async () => {
  const s = text();
  try { await navigator.clipboard.writeText(s); toast(t('rp.copied'), true); }
  catch { const a = document.createElement('textarea'); a.value = s; document.body.append(a); a.select(); try { document.execCommand('copy'); toast(t('rp.copied'), true); } catch {} a.remove(); }
};
$('rpClear').onclick = () => { if (confirm(t('rp.clearq'))) { store.set('rs.rp', []); render(); } };
hooks.push(() => { if ($('rp').classList.contains('on')) render(); });
