/** report.js — LAPORAN SHALAT & DZIKIR dalam satu halaman, dua tab: Shalat | Dzikir. Rentang waktu (hari ini / 7 / 30 hari) dipakai bersama.
 *  TAB SHALAT: riwayat tiap sesi (kamera / sensor) + tanda manual dari Beranda, per tanggal: shalat apa, tanggal & jam, rakaat vs target (sesuai / kurang / lebih).
 *  Yang dicatat hanya JUMLAH RAKAAT yang terhitung dibanding targetnya. Aplikasi tidak menilai sah atau tidaknya shalat.
 *  Disimpan per akun di 'rs.rp' = [{ sid, at, key, nm, src: 'cam'|'sensor', det, tgt, sujud, ev: {x, s, l} }], maks. CAP entri terakhir.
 *  TAB DZIKIR: total, set selesai, grafik, rincian per dzikir, dan riwayat harian (data dari dzikir.js, 'rs.dz'). */
import { $, store, dayKey, toast } from './util.js';
import { t, lang, hooks } from './i18n.js';
import { ic } from './icons.js';
import { PRID, esc, keyLabel, nameOf, isFard } from './prayers.js';
import { DZIKIR, dzData, dzClear } from './dzikir.js';

const CAP = 500;
let tab = 'pr', rg = 'week', pf = 'all', hl = null; // hl = sid sesi yang baru selesai (disorot di bagian atas laporan)
const DAYS = { day: 1, week: 7, month: 30 };
/** sorot sesi tertentu di atas laporan (dipakai setelah pemantauan kamera selesai) */
export const focus = (sid) => { hl = sid; if (sid) { rg = 'day'; tab = 'pr'; } };
export const setTab = (x) => { tab = x === 'dz' ? 'dz' : 'pr'; };
export const verdict = (r) => (r.det === r.tgt ? 'ok' : r.det < r.tgt ? 'less' : 'more');

/** Tambah sesi, atau perbarui bila sid sama (penghitung sensor memperbarui hasil tiap kali hitungan berubah). */
export function addSession(r) {
  const L = store.get('rs.rp', []), i = r.sid ? L.findIndex((x) => x.sid === r.sid) : -1;
  if (!(r.det > 0 || r.sujud > 0)) { if (i >= 0) { L.splice(i, 1); store.set('rs.rp', L); } return; } // tidak ada hitungan = tidak dicatat
  const rec = { ...r, at: i >= 0 ? L[i].at : Date.now() };
  if (i >= 0) L[i] = rec; else L.push(rec);
  store.set('rs.rp', L.slice(-CAP));
}

/* ---------- pembantu umum ---------- */
const L10 = () => lang();
const tm = (at) => new Date(at).toLocaleTimeString(L10(), { hour: '2-digit', minute: '2-digit' });
const dlabel = (d) => d.toLocaleDateString(L10(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const dfull = (d) => d.toLocaleDateString(L10(), { day: 'numeric', month: 'long', year: 'numeric' });
const dshort = (d) => d.toLocaleDateString(L10(), { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const days = () => Array.from({ length: DAYS[rg] }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - i); return d; }); // terbaru dulu
const rel = (d) => {
  const k = dayKey(d), y = new Date(); y.setDate(y.getDate() - 1);
  return k === dayKey() ? t('rp.today') : k === dayKey(y) ? t('rp.yday') : d.toLocaleDateString(L10(), { weekday: 'long' });
};
/** kepala tanggal: lencana tanggal + hari + tanggal lengkap (+ baris tambahan dan sisi kanan) */
const dayHead = (d, extra = '', side = '') => {
  const relative = dayKey(d) === dayKey() || rel(d) !== d.toLocaleDateString(L10(), { weekday: 'long' });
  return `<div class="rp-dayhd"><div class="rp-date"><b>${d.getDate()}</b><small>${esc(d.toLocaleDateString(L10(), { month: 'short' }))}</small></div>`
    + `<div class="rp-dt"><b>${esc(rel(d))}</b><small>${esc(relative ? dlabel(d) : dfull(d))}</small>${extra}</div>${side}</div>`;
};
const empty = (icon, key) => `<div class="rp-empty"><span class="rp-empty-i">${ic(icon, 34)}</span><p>${esc(t(key))}</p></div>`;

/** grafik batang (bisa bertumpuk). stacks[i] = [nilai seri 1, nilai seri 2…], urut dari terlama ke terbaru */
function chart(stacks, labels, minMax = 4) {
  const n = labels.length, w = 320 / n, bw = Math.min(26, w * 0.62), H = 100, base = 118;
  const mx = Math.max(minMax, ...stacks.map((s) => s.reduce((a, b) => a + b, 0)));
  let g = [0.5, 1].map((f) => `<line class="gl" x1="0" x2="320" y1="${base - H * f}" y2="${base - H * f}"/>`).join('');
  stacks.forEach((s, i) => {
    const x = i * w + (w - bw) / 2, tot = s.reduce((a, b) => a + b, 0); let y = base;
    if (!tot) g += `<rect class="trk" x="${x}" y="${base - 4}" width="${bw}" height="4" rx="2"/>`;
    s.forEach((v, j) => { if (!v) return; const h = v / mx * H; y -= h; g += `<rect class="s${j + 1}" x="${x}" y="${y}" width="${bw}" height="${Math.max(h, 3)}" rx="${Math.min(bw / 2.6, 5)}"/>`; });
    if (tot && n <= 12) g += `<text class="v" x="${i * w + w / 2}" y="${y - 4}">${tot}</text>`;
    const show = n <= 12 || (n - 1 - i) % 5 === 0;
    if (show) g += `<text x="${i * w + w / 2}" y="138">${esc(labels[i])}</text>`;
  });
  return `<svg class="rp-svg" viewBox="0 0 320 146" role="img" aria-label="${esc(t('rp.ch.aria'))}">${g}</svg>`;
}

/* =====================  TAB SHALAT  ===================== */
const PI = { subuh: 'sunrise', dzuhur: 'sun', ashar: 'afternoon', maghrib: 'sunset', isya: 'moon', dhuha: 'sun', tahajud: 'moon', witir: 'moon' };
const icoOf = (key) => PI[key.split(':')[0]] || 'calib';
const kindOf = (key) => key.split(':')[1] || 'f';

/** data laporan untuk rentang terpilih: [{ k, date, l, sessions, manual, fard, sn }] (hari tanpa catatan dilewati) */
function collect() {
  const L = store.get('rs.rp', []), log = store.get('rs.log', {}), keep = (key) => pf === 'all' || (pf === 'f') === isFard(key), out = [];
  days().forEach((d) => {
    const k = dayKey(d), l = log[k] || {};
    const sessions = L.filter((x) => dayKey(new Date(x.at)) === k && keep(x.key)).sort((a, b) => a.at - b.at);
    const manual = Object.keys(l).filter((x) => l[x] && keep(x) && !sessions.some((s) => s.key === x));
    if (!sessions.length && !manual.length) return;
    out.push({ k, date: d, l, sessions, manual, fard: PRID.filter((p) => l[p]).length, sn: Object.keys(l).filter((x) => l[x] && x.includes(':')).length });
  });
  return out;
}
const vtext = (r) => { const v = verdict(r); return v === 'ok' ? t('rp.v.ok') : t('rp.v.' + v, { n: Math.abs(r.det - r.tgt) }); };
const notes = (r) => [r.ev?.x && t('rp.n.x', { n: r.ev.x }), r.ev?.s && t('rp.n.s', { n: r.ev.s }), r.ev?.l && t('rp.n.l', { n: r.ev.l })].filter(Boolean);
/** nama cadangan untuk tanda manual shalat buatan sendiri yang sudah dihapus: ambil dari sesi lama bila ada */
const nmSnap = (key) => store.get('rs.rp', []).find((x) => x.key === key)?.nm;

const mmss = (ms) => { const x = Math.round(ms / 1000); return Math.floor(x / 60) + ':' + String(x % 60).padStart(2, '0'); };
/** kartu hasil sesi terbaru: rakaat terdeteksi vs target, pesan sesuai/salah, dan kronologi kejadian */
function renderLast() {
  const r = hl && store.get('rs.rp', []).find((x) => x.sid === hl), el = $('rpLast');
  if (!r) { el.hidden = true; el.innerHTML = ''; return; }
  const v = verdict(r), cls = v === 'ok' ? 'ok' : v === 'more' ? 'bad' : 'warn', msg = t('w.s.' + v, { n: r.det, m: r.tgt });
  const lg = (r.log || []).filter((x) => x.k !== 'found');
  el.hidden = false;
  el.innerHTML = `<div class="w-sum rp-last"><small>${t('rp.last.t')}</small><b class="w-lbl">${esc(keyLabel(r.key, r.nm))}</b>`
    + `<div class="w-big ${cls}"><b>${r.det}</b><span>/ ${r.tgt}</span></div><span class="rp-chip ${v}">${vtext(r)}</span><p class="w-msg">${esc(msg)}</p>`
    + `<small>${esc(t('w.s.sj', { n: r.sujud }))}</small>`
    + (lg.length ? `<ul class="w-log">${lg.map((x) => `<li class="${x.k}"><time>${mmss(x.at)}</time><span>${esc(t('w.ev.' + x.k, { n: x.n, m: x.m }))}</span></li>`).join('')}</ul>` : '') + '</div>';
}

/** total shalat tertandai di rentang terpilih (tidak terpengaruh filter) + data grafik per hari (terlama → terbaru) */
function marks() {
  const log = store.get('rs.log', {}), ds = days().reverse(); let f = 0, s = 0;
  const stacks = ds.map((d) => {
    const l = log[dayKey(d)] || {}, a = PRID.filter((p) => l[p]).length, b = Object.keys(l).filter((x) => l[x] && x.includes(':')).length;
    f += a; s += b; return [a, b];
  });
  const labels = ds.map((d, i) => (rg === 'week' ? d.toLocaleDateString(L10(), { weekday: 'short' }) : String(d.getDate())));
  return { f, s, m: DAYS[rg] * 5, stacks, labels };
}

function heroHTML(all, c) {
  const n = all.length, pct = n ? Math.round(c.ok / n * 100) : 0, C = 2 * Math.PI * 34, M = marks();
  const st = (k, v, lbl) => `<div class="rp-st ${k}"><b>${v}</b><small>${t(lbl)}</small></div>`;
  return `<div class="rp-ringw"><svg class="rp-ring" viewBox="0 0 80 80" aria-hidden="true"><circle class="bg" cx="40" cy="40" r="34"/><circle class="fg" cx="40" cy="40" r="34" stroke-dasharray="${(C * pct / 100).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 40 40)"/></svg>`
    + `<div class="rp-ring-t"><b>${n ? pct + '%' : '–'}</b><small>${t('rp.s.ok')}</small></div></div>`
    + `<div class="rp-stats">${st('all', n, 'rp.s.sess')}${st('ok', c.ok, 'rp.s.ok')}${st('less', c.less, 'rp.s.less')}${st('more', c.more, 'rp.s.more')}</div>`
    + `<div class="rp-strip"><div><b>${M.f}<em>/${M.m}</em></b><small>${t('rp.fard.s')}</small></div><div><b>${M.s}</b><small>${t('rp.sn.s')}</small></div></div>`;
}

function rowHTML(r) {
  const v = verdict(r), pct = Math.min(100, r.tgt ? r.det / r.tgt * 100 : 0), k = kindOf(r.key), id = r.key.split(':')[0], nt = notes(r), d = new Date(r.at);
  return `<li class="rp-row ${v}"><span class="rp-ico ${k === 'f' ? 'f' : 's'}">${ic(icoOf(r.key), 22)}</span><div class="rp-body">`
    + `<div class="rp-l1"><b>${esc(nameOf(id, r.nm))}</b><span class="rp-tag ${k === 'f' ? 'f' : ''}">${esc(t('rk.k.' + k))}</span><span class="rp-chip ${v}">${esc(vtext(r))}</span></div>`
    + `<div class="rp-when"><time>${esc(dshort(d))} · ${esc(tm(r.at))}</time></div>`
    + `<div class="rp-bar"><i style="width:${pct}%"></i></div>`
    + `<div class="rp-l3"><span>${esc(t('rp.cnt', { n: r.det, m: r.tgt }))}${r.sujud ? ' · ' + esc(t('rp.sujud', { n: r.sujud })) : ''}</span><em>${esc(t('rp.src.' + r.src))}</em><span class="rp-gap"></span>`
    + `<button type="button" class="rp-x" data-del="${esc(r.sid || r.at)}" aria-label="${esc(t('rp.del'))}">${ic('trash', 16)}</button></div>`
    + (nt.length ? `<div class="rp-n">${nt.map(esc).join(' · ')}</div>` : '') + '</div></li>';
}
function manualHTML(key, date) {
  const id = key.split(':')[0], k = kindOf(key);
  return `<li class="rp-row man"><span class="rp-ico ${k === 'f' ? 'f' : 's'}">${ic(icoOf(key), 22)}</span><div class="rp-body">`
    + `<div class="rp-l1"><b>${esc(nameOf(id, nmSnap(key)))}</b><span class="rp-tag ${k === 'f' ? 'f' : ''}">${esc(t('rk.k.' + k))}</span><span class="rp-chip man">${esc(t('rp.v.manual'))}</span></div>`
    + `<div class="rp-when"><time>${esc(dshort(date))}</time></div><div class="rp-l3"><em>${esc(t('rp.src.manual'))}</em></div></div></li>`;
}

function renderPr() {
  renderLast();
  const data = collect(), all = data.flatMap((d) => d.sessions), c = { ok: 0, less: 0, more: 0 };
  all.forEach((r) => c[verdict(r)]++);
  document.querySelectorAll('#rpFilter button').forEach((b) => b.classList.toggle('on', b.dataset.f === pf));
  $('rpHero').innerHTML = heroHTML(all, c);
  const M = marks(), box = $('rpChart');
  box.hidden = rg === 'day';
  if (!box.hidden) box.innerHTML = `<h4>${esc(t('rp.ch.pr'))}</h4>${chart(M.stacks, M.labels)}<div class="rp-leg"><span class="s1">${esc(t('rp.f.fard'))}</span><span class="s2">${esc(t('rp.f.sn'))}</span></div>`;
  $('rpList').innerHTML = data.length ? data.map((d) => dayHead(d.date, `<small class="rp-sub">${esc(t('rp.d.fard', { n: d.fard }))} · ${esc(t('rp.d.sn', { n: d.sn }))}</small>`,
    `<div class="rp-dots" role="img" aria-label="${esc(t('rp.d.fard', { n: d.fard }))}">${PRID.map((p) => `<i class="${d.l[p] ? 'on' : ''}" title="${esc(nameOf(p))}"></i>`).join('')}</div>`)
    + `<ul class="rp-list">${d.sessions.map(rowHTML).join('')}${d.manual.map((x) => manualHTML(x, d.date)).join('')}</ul>`).join('')
    : empty('chart', 'rp.empty');
  $('rpTools').hidden = !data.length;
}

function textPr() {
  const lines = [t('rp.head'), t('rp.r.' + rg)];
  collect().forEach((d) => {
    lines.push('', dlabel(d.date) + ` (${t('rp.d.fard', { n: d.fard })} · ${t('rp.d.sn', { n: d.sn })})`);
    d.sessions.forEach((r) => lines.push(`- ${tm(r.at)} ${keyLabel(r.key, r.nm)}: ${t('rp.cnt', { n: r.det, m: r.tgt })} → ${vtext(r)} (${t('rp.src.' + r.src)})`));
    d.manual.forEach((x) => lines.push(`- ${keyLabel(x, nmSnap(x))}: ${t('rp.v.manual')}`));
  });
  return lines.join('\n');
}

/* =====================  TAB DZIKIR  ===================== */
const dzName = (id) => t('dz.' + id);
const dzRows = () => { const D = dzData(); return days().map((d) => ({ d, v: D[dayKey(d)] })).filter((x) => x.v && x.v.total > 0); };
const setsOf = (v) => Object.values(v.sets || {}).reduce((a, b) => a + b, 0);

function renderDz() {
  const D = dzData(), rows = dzRows(), total = rows.reduce((a, x) => a + x.v.total, 0), sets = rows.reduce((a, x) => a + setsOf(x.v), 0), today = D[dayKey()]?.total || 0;
  const st = (v, k) => `<div><b>${v}</b><small>${t(k)}</small></div>`;
  $('rpDzHero').innerHTML = `<small>${t('rp.dz.total')}</small><div class="rp-big">${total}</div>`
    + `<div class="rp-strip">${st(today, 'rp.dz.today')}${st(sets, 'rp.dz.sets')}${st(rows.length, 'rp.dz.days')}</div>`;

  /* grafik: hari ini → per 3 jam; 7 / 30 hari → per hari */
  let stacks, labels;
  if (rg === 'day') {
    const h = D[dayKey()]?.hours || [];
    stacks = Array.from({ length: 8 }, (_, i) => [h.slice(i * 3, i * 3 + 3).reduce((a, b) => a + (b || 0), 0)]);
    labels = stacks.map((_, i) => String(i * 3).padStart(2, '0'));
  } else {
    const ds = days().reverse();
    stacks = ds.map((d) => [D[dayKey(d)]?.total || 0]);
    labels = ds.map((d) => (rg === 'week' ? d.toLocaleDateString(L10(), { weekday: 'short' }) : String(d.getDate())));
  }
  $('rpDzChart').innerHTML = `<h4>${esc(t(rg === 'day' ? 'rp.dz.ch.h' : 'rp.dz.ch.d'))}</h4>${chart(stacks, labels, 10)}`;

  /* rincian per dzikir */
  const agg = {}, sg = {};
  rows.forEach((x) => { Object.entries(x.v.items || {}).forEach(([id, n]) => (agg[id] = (agg[id] || 0) + n)); Object.entries(x.v.sets || {}).forEach(([id, n]) => (sg[id] = (sg[id] || 0) + n)); });
  const items = DZIKIR.filter((d) => agg[d.id] > 0).sort((a, b) => agg[b.id] - agg[a.id]), mx = Math.max(1, ...items.map((d) => agg[d.id]));
  $('rpDzBy').innerHTML = items.length
    ? `<h3 class="rp-sec">${esc(t('rp.dz.by'))}</h3><div class="card rp-by">${items.map((d) => `<div class="rp-bk"><div class="rp-bk-h"><span class="rp-ico s">${ic('beads', 20)}</span>`
      + `<span class="rp-bk-t"><b>${esc(dzName(d.id))}</b><small>${esc(t('dm.' + d.id))}</small></span><span class="rp-bk-n"><b>${agg[d.id]}×</b>${sg[d.id] ? `<small>${esc(t('rp.dz.setn', { n: sg[d.id] }))}</small>` : ''}</span></div>`
      + `<div class="rp-bar"><i style="width:${(agg[d.id] / mx * 100).toFixed(1)}%"></i></div></div>`).join('')}</div>` : '';

  /* riwayat harian */
  $('rpDzList').innerHTML = rows.length
    ? `<h3 class="rp-sec">${esc(t('rp.dz.hist'))}</h3>` + rows.map((x) => {
      const its = DZIKIR.filter((d) => x.v.items?.[d.id] > 0), ex = [setsOf(x.v) ? t('rp.dz.setn', { n: setsOf(x.v) }) : '', x.v.last ? t('rp.dz.last', { n: tm(x.v.last) }) : ''].filter(Boolean).join(' · ');
      return dayHead(x.d, ex ? `<small class="rp-sub">${esc(ex)}</small>` : '', `<div class="rp-tot"><b>${x.v.total}×</b></div>`)
        + `<div class="rp-dch">${its.map((d) => `<span class="rp-dc"><b>${esc(dzName(d.id))}</b> ${x.v.items[d.id]}×</span>`).join('')}</div>`;
    }).join('') : empty('beads', 'rp.dz.empty');
  $('rpTools').hidden = !rows.length;
}

function textDz() {
  const lines = [t('rp.dz.head'), t('rp.r.' + rg)];
  dzRows().forEach((x) => {
    lines.push('', `${dlabel(x.d)} (${x.v.total}×)`);
    DZIKIR.filter((d) => x.v.items?.[d.id] > 0).forEach((d) => lines.push(`- ${dzName(d.id)}: ${x.v.items[d.id]}×`));
  });
  return lines.join('\n');
}

/* =====================  RENDER & EVENT  ===================== */
export function render() {
  document.querySelectorAll('#rpTab button').forEach((b) => { const on = b.dataset.t === tab; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
  document.querySelectorAll('#rpRng button').forEach((b) => b.classList.toggle('on', b.dataset.r === rg));
  $('rpPrayer').hidden = tab !== 'pr'; $('rpDzikir').hidden = tab !== 'dz';
  const clr = tab === 'pr' ? 'rp.clear' : 'rp.dz.clear', note = tab === 'pr' ? 'rp.note' : 'rp.dz.note';
  $('rpClear').dataset.i = clr; $('rpClear').textContent = t(clr); $('rpNote').dataset.i = note; $('rpNote').textContent = t(note);
  if (tab === 'pr') renderPr(); else renderDz();
}

/* tombol dengan data-rptab (Beranda, Dzikir, dll.) menentukan tab sebelum halaman dibuka (listener ini terpasang lebih dulu daripada navigasi di app.js) */
document.addEventListener('click', (e) => { const b = e.target.closest('[data-rptab]'); if (b) { setTab(b.dataset.rptab); if (b.dataset.rptab === 'dz') hl = null; } });
$('rpTab').onclick = (e) => { const b = e.target.closest('[data-t]'); if (b) { setTab(b.dataset.t); render(); } };
$('rpRng').onclick = (e) => { const b = e.target.closest('[data-r]'); if (b) { rg = b.dataset.r; render(); } };
$('rpFilter').onclick = (e) => { const b = e.target.closest('[data-f]'); if (b) { pf = b.dataset.f; render(); } };
$('rpList').onclick = (e) => {
  const b = e.target.closest('[data-del]'); if (!b || !confirm(t('rp.delq'))) return;
  store.set('rs.rp', store.get('rs.rp', []).filter((x) => String(x.sid || x.at) !== b.dataset.del)); render();
};
$('rpCopy').onclick = async () => {
  const s = tab === 'pr' ? textPr() : textDz();
  try { await navigator.clipboard.writeText(s); toast(t('rp.copied'), true); }
  catch { const a = document.createElement('textarea'); a.value = s; document.body.append(a); a.select(); try { document.execCommand('copy'); toast(t('rp.copied'), true); } catch {} a.remove(); }
};
$('rpClear').onclick = () => {
  if (tab === 'pr') { if (confirm(t('rp.clearq'))) { store.set('rs.rp', []); render(); } }
  else if (confirm(t('rp.dz.clearq'))) { dzClear(); render(); }
};
hooks.push(() => { if ($('rp').classList.contains('on')) render(); });
