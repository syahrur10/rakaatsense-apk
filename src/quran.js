/** quran.js — Al-Qur'an: daftar 114 surah, pembaca dengan tajwid berwarna, terjemahan (Indonesia / English), penanda & terakhir dibaca.
 *  Semua data offline di public/quran/ (lihat README.txt di sana), dimuat per surah saat dibuka.
 *  Pengaturan & penanda disimpan per akun di 'rs.qr' = { fs, tr, tj, tf, last:{s,a}, bm:[{s,a,at}] }. */
import { $, store, toast } from './util.js';
import { t, lang, hooks } from './i18n.js';
import { ic } from './icons.js';
import { esc } from './prayers.js';

const Q = '/quran/', root = $('qr');
const pad = (n) => String(n).padStart(3, '0'), ad = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);

/* ---- Aturan tajwid. Indeks mengikuti legenda data: 0 ham_wasl, 1 laam_shamsiyah, 2 slnt, 3 madda_normal, 4 madda_permissible, 5 madda_obligatory,
 *      6 madda_necessary, 7 qalaqah, 8 ghunnah, 9 ikhafa, 10 ikhafa_shafawi, 11 idgham_ghunnah, 12 idgham_wo_ghunnah, 13 idgham_shafawi, 14 iqlab,
 *      15 idgham_mutajanisayn, 16 idgham_mutaqaribayn, 17 tafkhim, 18 tarqiq. Keluarga warna: madd oranye→merah, ikhfa ungu, idgham biru, ghunnah hijau. ---- */
const COL = { 0: '#A5ADA8', 1: '#A5ADA8', 2: '#A5ADA8', 3: '#E58A00', 4: '#E8590C', 5: '#D9341F', 6: '#B71C1C', 7: '#D81B60', 8: '#3AA33A', 9: '#7B3FC4', 10: '#A55BD6', 11: '#2F6FE0', 12: '#7A8CA8', 13: '#4F9CF0', 14: '#00A3A3', 15: '#9C6B3C', 16: '#9C6B3C', 17: '#0D47A1' };
const PRI = [6, 5, 4, 3, 7, 17, 14, 11, 13, 12, 15, 16, 9, 10, 8, 0, 1, 2]; // bila satu potongan memuat beberapa aturan, yang paling depan yang ditampilkan
const LEG = [ // [kunci grup, [[id, indeks aturan]]]
  ['qr.g.mad', [['mad1', [3]], ['mad2', [4]], ['mad3', [5]], ['mad4', [6]]]],
  ['qr.g.nun', [['ikh', [9]], ['idg', [11]], ['idl', [12]], ['iql', [14]]]],
  ['qr.g.mim', [['ikm', [10]], ['idm', [13]]]],
  ['qr.g.etc', [['qlq', [7]], ['ghn', [8]], ['mtj', [15, 16]], ['sil', [0, 1, 2]], ['tfk', [17]]]],
];
const ITEMS = LEG.flatMap(([, it]) => it);
document.head.appendChild(Object.assign(document.createElement('style'), {
  textContent: Object.entries(COL).map(([k, c]) => `.qr .r${k}{color:${c}}`).join('')
    + ITEMS.map(([id, rs]) => `.qr[data-f="${id}"] .tj:not(${rs.map((r) => '.r' + r).join('):not(')}){color:inherit}`).join(''),
}));

/* ---- Data & pengaturan ---- */
let META = null, view = 'list', tab = 's', query = '', cur = null, legOpen = false, chipsOpen = false, stale = false, pushed = false, io = null;
const cache = new Map();
const load = (f) => { if (!cache.has(f)) cache.set(f, fetch(Q + f).then((r) => { if (!r.ok) throw new Error(f); return r.json(); }).catch((e) => { cache.delete(f); throw e; })); return cache.get(f); };
const S = () => ({ fs: 36, tj: true, tf: false, ...store.get('rs.qr', {}) });
const save = (p) => store.set('rs.qr', { ...store.get('rs.qr', {}), ...p });
const trLang = () => S().tr || (lang() === 'en' ? 'en' : 'id'); // bahasa terjemahan: pilihan pengguna, atau ikut bahasa aplikasi (Arab/Melayu → Indonesia)
const mean = (m) => (lang() === 'en' ? m.en : lang() === 'ar' ? '' : m.id), kind = (m) => t(m.t === 'M' ? 'qr.mk' : 'qr.md');
const sub = (m) => [mean(m), kind(m), `${m.c} ${t('qr.ay')}`].filter(Boolean).join(' · ');
const bms = () => S().bm || [], isBm = (s, a) => bms().some((b) => b.s === s && b.a === a);
const norm = (x) => String(x).toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]/g, '');
/** Teks Arab polos untuk disalin: buang tatweel pembawa tanda & kembalikan ى (data tajwid memakai ٮ + tatweel agar bisa diwarnai). */
const plain = (i) => cur.ar[i].map((x) => x[0]).join('').replace(/\u0640/g, '').replace(/\u066E/g, '\u0649').trim();

/** Ubah potongan [teks, [aturan]] jadi HTML berwarna; potongan bersebelahan dengan warna sama digabung supaya sambungan huruf Arab tidak terputus. */
function seg(a, tf) {
  let out = '', cls = null, buf = '';
  const flush = () => { if (buf) out += cls == null ? esc(buf) : `<span class="tj r${cls}">${esc(buf)}</span>`; buf = ''; };
  a.forEach(([tx, rs], i) => {
    let p = null; for (const r of PRI) if (rs.includes(r) && (r !== 17 || tf)) { p = r; break; }
    if (p !== cls) { flush(); cls = p; } buf += i === a.length - 1 ? tx.trimEnd() : tx;
  });
  flush(); return out;
}

/* ---- Daftar surah ---- */
function legendHTML() {
  return `<div class="card qr-leg"><b>${t('qr.leg')}</b><small>${t('qr.leg.hint2')}</small>` + LEG.map(([g, it]) => `<span class="glbl">${t(g)}</span>` + it.map(([id, rs]) => `<div class="qr-li"><i class="sw" style="background:${COL[rs[0]]}"></i><span><b>${t(`qr.l.${id}.n`)}</b><small>${t(`qr.l.${id}.d`)}</small></span></div>`).join('')).join('') + '</div>';
}
function drawList() {
  view = 'list'; cur = null; io?.disconnect();
  root.removeAttribute('data-f'); root.classList.remove('qr-off');
  root.innerHTML = `<div class="dz-head"><h2 class="ttl">${t('qr.title')}</h2><button class="icon" data-qr="leg" aria-label="${t('qr.leg.tog')}">${ic('palette', 20)}</button></div>
  <label class="qr-search">${ic('search', 20)}<input id="qrQ" type="search" autocomplete="off" placeholder="${esc(t('qr.search'))}" value="${esc(query)}"></label>
  <div class="seg" role="tablist"><button type="button" data-qr="tab" data-t="s" class="${tab === 's' ? 'on' : ''}" role="tab">${t('qr.tab.s')}</button><button type="button" data-qr="tab" data-t="m" class="${tab === 'm' ? 'on' : ''}" role="tab">${t('qr.tab.m')} (${bms().length})</button></div>
  <div id="qrLeg">${legOpen ? legendHTML() : ''}</div><div id="qrRows"></div><p class="mute small qr-src">${t('qr.src')}</p>`;
  $('qrQ').oninput = (e) => { query = e.target.value; drawRows(); };
  drawRows();
}
function drawRows() {
  const box = $('qrRows'); if (!box) return;
  if (tab === 'm') {
    const l = [...bms()].sort((a, b) => b.at - a.at);
    box.innerHTML = l.length ? `<div class="qr-list">${l.map((b) => { const m = META[b.s - 1]; return `<div class="qr-row" data-qr="open" data-n="${b.s}" data-a="${b.a}" role="button" tabindex="0"><span class="qr-n"><b>${b.s}</b></span><span class="qr-nm"><b>${m.tr} : ${b.a}</b><small>${t('qr.ayat', { n: b.a })} · ${esc(mean(m))}</small></span><button class="qr-x" data-qr="del" data-n="${b.s}" data-a="${b.a}" aria-label="${t('qr.del')}">${ic('trash', 18)}</button></div>`; }).join('')}</div>`
      : `<div class="rp-empty"><span class="rp-empty-i">${ic('bookmark', 30)}</span><p>${t('qr.empty.m')}</p></div>`;
    return;
  }
  const q = norm(query), rows = META.filter((m) => !q || String(m.n) === q || norm(m.tr).includes(q) || norm(m.id).includes(q) || norm(m.en).includes(q) || m.ar.includes(query.trim()));
  const last = S().last, lm = last && META[last.s - 1];
  const resume = lm && !q ? `<button class="qr-resume" data-qr="open" data-n="${last.s}" data-a="${last.a}"><span class="fi">${ic('book', 26)}</span><span class="qr-nm"><small>${t('qr.cont')}</small><b>${lm.tr} · ${t('qr.ayat', { n: last.a })}</b></span><span class="fa">${ic('arrow', 20)}</span></button>` : '';
  box.innerHTML = resume + (rows.length ? `<div class="qr-list">${rows.map((m) => `<button class="qr-row" data-qr="open" data-n="${m.n}"><span class="qr-n"><b>${m.n}</b></span><span class="qr-nm"><b>${m.tr}</b><small>${esc(sub(m))}</small></span><span class="qr-ara" lang="ar">${m.ar}</span></button>`).join('')}</div>` : `<p class="rp-empty">${t('qr.none')}</p>`);
}

/* ---- Pembaca ---- */
const trFile = async (n) => { const l = trLang(); if (l === 'off') return null; try { return await load(`s${pad(n)}.${l}.json`); } catch { toast(t('qr.err')); return null; } };
async function openSurah(n, a, noPush) {
  root.innerHTML = `<p class="mute qr-load">${t('qr.loading')}</p>`; scrollTo(0, 0);
  try {
    const [d, tr, bsm] = await Promise.all([load(`s${pad(n)}.json`), trFile(n), n === 1 || n === 9 ? null : load('s001.json')]);
    cur = { n, ar: d.a, tr, shown: 0, bsm: bsm && bsm.a[0] };
  } catch { toast(t('qr.err')); view = 'list'; drawList(); return; }
  view = 'read'; if (!noPush && !pushed) { history.pushState({ qr: 1 }, ''); pushed = true; }
  drawRead(); if (a) scrollToAyah(a, false);
}
function drawRead() {
  const m = META[cur.n - 1], s = S();
  root.classList.toggle('qr-off', !s.tj); root.style.setProperty('--qfs', s.fs + 'px'); root.removeAttribute('data-f');
  root.innerHTML = `<div class="qr-bar" id="qrBar"><div class="qr-bar-r">
      <button class="icon flip" data-qr="back" aria-label="${t('qr.back')}">${ic('back', 20)}</button>
      <div class="qr-bt"><b>${m.n}. ${m.tr}</b><small>${esc(sub(m))}</small></div>
      <button class="icon ${chipsOpen ? 'on' : ''}" data-qr="chips" aria-label="${t('qr.leg.tog')}">${ic('palette', 20)}</button>
      <button class="icon" data-qr="go" aria-label="${t('qr.go')}">${ic('jump', 20)}</button>
      <button class="icon" data-qr="set" aria-label="${t('qr.set')}">${ic('text', 20)}</button></div>
    <div id="qrChips" ${chipsOpen ? '' : 'hidden'}><div class="qr-chips">${chipsInner()}</div><p class="qr-legd" id="qrLegD">${t('qr.leg.hint')}</p></div></div>
    <div class="qr-hero"><small>${t('qr.hero', { n: m.n })}</small><div class="ar" lang="ar">${m.ar}</div><b>${m.tr}</b><small>${esc(sub(m))}</small></div>
    ${cur.bsm ? `<div class="qr-bsm qr-ar" lang="ar" dir="rtl">${seg(cur.bsm, s.tf)}</div>` : ''}
    <div id="qrAy"></div><div id="qrMore"></div>`;
  fitBar(); appendAyahs(30); watchMore();
}
function watchMore() {
  io?.disconnect(); if (!cur || cur.shown >= cur.ar.length) return;
  io = new IntersectionObserver((es) => { if (es[0].isIntersecting) appendAyahs(cur.shown + 30); }, { rootMargin: '700px' }); io.observe($('qrMore'));
}
const fitBar = () => { const b = $('qrBar'); if (b) root.style.setProperty('--qbar', b.offsetHeight + 'px'); };
function ayahHTML(i) {
  const n = i + 1, b = isBm(cur.n, n), tr = cur.tr?.[i];
  return `<article class="qr-ay ${b ? 'bm' : ''}" id="qa${n}" data-a="${n}"><div class="qr-ah"><span class="qr-no">${n}</span><span class="qr-acts">
    <button data-qr="bm" class="${b ? 'on' : ''}" aria-label="${t('qr.mark')}" aria-pressed="${b}">${ic('bookmark', 19)}</button><button data-qr="cp" aria-label="${t('qr.copy')}">${ic('copy', 19)}</button></span></div>
    <p class="qr-ar" lang="ar" dir="rtl">${seg(cur.ar[i], S().tf)}<span class="qr-end">${ad(n)}</span></p>${tr ? `<p class="qr-tr">${esc(tr)}</p>` : ''}</article>`;
}
function appendAyahs(upto) {
  const box = $('qrAy'); if (!box || !cur) return;
  const end = Math.min(cur.ar.length, upto); let h = '';
  for (let i = cur.shown; i < end; i++) h += ayahHTML(i);
  box.insertAdjacentHTML('beforeend', h); cur.shown = end;
  if (end >= cur.ar.length && !$('qrFoot')) {
    io?.disconnect(); const n = cur.n;
    $('qrMore').innerHTML = `<div class="qr-fin" id="qrFoot"><b>${t('qr.fin', { n: META[n - 1].tr })}</b><div class="qr-foot">${n > 1 ? `<button class="qr-fb" data-qr="open" data-n="${n - 1}">${ic('arrow', 18)}<span>${t('qr.prev')}<b>${META[n - 2].tr}</b></span></button>` : '<span></span>'}${n < 114 ? `<button class="qr-fb nx" data-qr="open" data-n="${n + 1}"><span>${t('qr.next')}<b>${META[n].tr}</b></span>${ic('arrow', 18)}</button>` : ''}</div></div>`;
  }
}
function scrollToAyah(a, smooth = true) {
  if (!cur) return; a = Math.min(Math.max(1, a), cur.ar.length); if (a > cur.shown) appendAyahs(a + 10);
  const el = $('qa' + a); if (!el) return;
  requestAnimationFrame(() => { el.scrollIntoView({ block: 'start', behavior: smooth ? 'smooth' : 'auto' }); el.classList.remove('hl'); void el.offsetWidth; el.classList.add('hl'); });
}
const topAyah = () => { for (const el of root.querySelectorAll('.qr-ay')) if (el.getBoundingClientRect().bottom > (parseInt(getComputedStyle(root).getPropertyValue('--qbar')) || 100) + 10) return +el.dataset.a; return 1; };
/** Gambar ulang ayat (setelah ganti terjemahan / tafkhim) tanpa kehilangan posisi baca. */
function redraw() {
  const a = topAyah(), n = cur.shown; $('qrAy').innerHTML = ''; $('qrMore').innerHTML = ''; cur.shown = 0;
  if (cur.bsm) { const b = root.querySelector('.qr-bsm'); if (b) b.innerHTML = seg(cur.bsm, S().tf); }
  appendAyahs(Math.max(n, a + 5)); watchMore(); scrollToAyah(a, false);
}
let sc; addEventListener('scroll', () => { if (view !== 'read' || !cur || !root.classList.contains('on')) return; clearTimeout(sc); sc = setTimeout(() => { if (view === 'read' && cur) save({ last: { s: cur.n, a: topAyah() } }); }, 500); }, { passive: true });

function closeRead(fromPop) {
  if (view !== 'read') return;
  if (pushed && !fromPop) { history.back(); return; } // popstate memanggil closeRead lagi
  pushed = false; drawList(); scrollTo(0, 0);
}
addEventListener('popstate', () => { if (view === 'read') { pushed = false; closeRead(true); } });

/* ---- Lembar pengaturan & lompat ke ayat ---- */
const sheet = $('qrSheet');
const hideSheet = () => { sheet.hidden = true; sheet.innerHTML = ''; };
sheet.addEventListener('pointerdown', (e) => { if (e.target === sheet) hideSheet(); });
function showSheet(mode) {
  const s = S();
  if (mode === 'go') {
    sheet.innerHTML = `<form class="sheet-card" id="qrGoF" novalidate role="dialog" aria-modal="true"><h3>${t('qr.go')}</h3>
      <label class="fld plain"><span>${t('qr.go.l', { n: cur.ar.length })}</span><div class="box"><input id="qrGoN" type="number" inputmode="numeric" min="1" max="${cur.ar.length}" value="${topAyah()}"></div></label>
      <div class="row"><button type="button" class="btn ghost" data-qr="sx">${t('cp.cancel')}</button><button type="submit" class="btn">${t('qr.go.b')}</button></div></form>`;
    $('qrGoF').onsubmit = (e) => { e.preventDefault(); const v = +$('qrGoN').value; hideSheet(); if (v >= 1) scrollToAyah(v); };
    sheet.hidden = false; setTimeout(() => { $('qrGoN')?.focus(); $('qrGoN')?.select(); }, 60); return;
  }
  const tl = trLang();
  sheet.innerHTML = `<div class="sheet-card" role="dialog" aria-modal="true"><h3>${t('qr.set')}</h3>
    <span class="glbl">${t('qr.fs')}</span><div class="qr-fs"><button type="button" class="icon" data-qr="fs" data-d="-2" aria-label="−">${ic('minus', 18)}</button><input id="qrFs" type="range" min="26" max="56" step="2" value="${s.fs}" aria-label="${t('qr.fs')}"><button type="button" class="icon" data-qr="fs" data-d="2" aria-label="+">${ic('plus', 18)}</button></div>
    <div class="qr-pv" id="qrPv" lang="ar" dir="rtl" style="font-size:${s.fs}px">${cur.bsm ? seg(cur.bsm, s.tf) : seg(cur.ar[0], s.tf)}</div>
    <span class="glbl">${t('qr.trl')}</span><div class="seg tri" id="qrTr"><button type="button" data-l="id" class="${tl === 'id' ? 'on' : ''}">${t('qr.tr.id')}</button><button type="button" data-l="en" class="${tl === 'en' ? 'on' : ''}">${t('qr.tr.en')}</button><button type="button" data-l="off" class="${tl === 'off' ? 'on' : ''}">${t('qr.tr.off')}</button></div>
    <label class="qr-sw"><span>${t('qr.tj')}</span><input type="checkbox" id="qrTj" ${s.tj ? 'checked' : ''}><i></i></label>
    <label class="qr-sw"><span>${t('qr.tf')}</span><input type="checkbox" id="qrTf" ${s.tf ? 'checked' : ''}><i></i></label>
    <button type="button" class="btn" data-qr="sx" style="margin-top:.9rem">${t('qr.done')}</button></div>`;
  const setFs = (v) => { v = Math.min(56, Math.max(26, v)); $('qrFs').value = v; $('qrPv').style.fontSize = v + 'px'; root.style.setProperty('--qfs', v + 'px'); save({ fs: v }); fitBar(); };
  $('qrFs').oninput = (e) => setFs(+e.target.value);
  sheet.querySelectorAll('[data-qr="fs"]').forEach((b) => (b.onclick = () => setFs(+$('qrFs').value + +b.dataset.d)));
  $('qrTj').onchange = (e) => { save({ tj: e.target.checked }); root.classList.toggle('qr-off', !e.target.checked); };
  $('qrTf').onchange = (e) => { save({ tf: e.target.checked }); $('qrPv').innerHTML = cur.bsm ? seg(cur.bsm, e.target.checked) : seg(cur.ar[0], e.target.checked); const n = $('qrChips'); n.querySelector('.qr-chips').innerHTML = chipsInner(); redraw(); };
  $('qrTr').onclick = async (e) => {
    const b = e.target.closest('[data-l]'); if (!b) return; save({ tr: b.dataset.l });
    sheet.querySelectorAll('#qrTr button').forEach((x) => x.classList.toggle('on', x === b));
    cur.tr = await trFile(cur.n); redraw();
  };
  sheet.hidden = false;
}
const chipsInner = () => ITEMS.filter(([id]) => id !== 'tfk' || S().tf).map(([id, rs]) => `<button type="button" class="qr-chip" data-qr="fz" data-id="${id}"><i style="background:${COL[rs[0]]}"></i>${t(`qr.l.${id}.n`)}</button>`).join('');

/* ---- Penanda & salin ---- */
function toggleBm(n, a) {
  const l = bms(), i = l.findIndex((b) => b.s === n && b.a === a);
  if (i >= 0) l.splice(i, 1); else l.push({ s: n, a, at: Date.now() });
  save({ bm: l }); return i < 0;
}
async function copy(txt) {
  try { await navigator.clipboard.writeText(txt); return true; } catch {
    const ta = Object.assign(document.createElement('textarea'), { value: txt }); ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch {} ta.remove(); return ok;
  }
}

/* ---- Satu penangan klik untuk seluruh layar ---- */
root.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-qr]'); if (!el) return;
  const act = el.dataset.qr, n = +el.dataset.n, a = +el.dataset.a || 0;
  if (act === 'open') { if (e.target.closest('[data-qr="del"]')) return; if (view === 'read') { history.replaceState({ qr: 1 }, ''); } openSurah(n, a, view === 'read'); }
  else if (act === 'tab') { tab = el.dataset.t; root.querySelectorAll('[data-qr="tab"]').forEach((b) => b.classList.toggle('on', b === el)); drawRows(); }
  else if (act === 'leg') { legOpen = !legOpen; $('qrLeg').innerHTML = legOpen ? legendHTML() : ''; }
  else if (act === 'del') { e.stopPropagation(); toggleBm(n, a); toast(t('qr.unmarked'), true); drawList(); }
  else if (act === 'back') closeRead();
  else if (act === 'set' || act === 'go') showSheet(act);
  else if (act === 'chips') { chipsOpen = !chipsOpen; $('qrChips').hidden = !chipsOpen; el.classList.toggle('on', chipsOpen); if (!chipsOpen) { root.removeAttribute('data-f'); root.querySelectorAll('.qr-chip.on').forEach((c) => c.classList.remove('on')); } fitBar(); }
  else if (act === 'fz') { const on = root.dataset.f !== el.dataset.id; root.querySelectorAll('.qr-chip').forEach((c) => c.classList.toggle('on', on && c === el)); if (on) root.dataset.f = el.dataset.id; else root.removeAttribute('data-f'); $('qrLegD').textContent = on ? `${t(`qr.l.${el.dataset.id}.n`)} — ${t(`qr.l.${el.dataset.id}.d`)}` : t('qr.leg.hint'); fitBar(); }
  else if (act === 'bm' || act === 'cp') {
    const art = el.closest('.qr-ay'), i = +art.dataset.a - 1, m = META[cur.n - 1];
    if (act === 'bm') { const on = toggleBm(cur.n, i + 1); el.classList.toggle('on', on); art.classList.toggle('bm', on); el.setAttribute('aria-pressed', on); toast(t(on ? 'qr.marked' : 'qr.unmarked'), true); }
    else { const ok = await copy(`${plain(i)} ۝${ad(i + 1)}${cur.tr?.[i] ? '\n\n' + cur.tr[i] : ''}\n\n— ${m.tr} : ${i + 1}`); toast(t(ok ? 'qr.copied' : 'qr.err'), ok); }
  } else if (act === 'sx') hideSheet();
});

/** Dipanggil app.js tiap tab Al-Qur'an dibuka. */
export function enter() {
  if (!META) { root.innerHTML = `<p class="mute qr-load">${t('qr.loading')}</p>`; load('meta.json').then((m) => { META = m; enter(); }).catch(() => toast(t('qr.err'))); return; }
  if (stale) { stale = false; if (view === 'read' && cur) openSurah(cur.n, S().last?.a, true); else drawList(); return; }
  if (view === 'read' && cur) { const l = S().last; requestAnimationFrame(() => l && l.s === cur.n && scrollToAyah(l.a, false)); return; }
  drawList();
}
hooks.push(() => { stale = true; });
