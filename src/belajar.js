/** belajar.js — BELAJAR SHALAT untuk mualaf & pemula: 4 tab → Ikuti (urutan shalat langkah demi langkah dengan gambar gerakan animasi + bacaan Arab/latin/arti),
 *  Gerakan (demo 1 rakaat + galeri gerakan), Bacaan (semua bacaan), Persiapan (syarat, wudhu, rukun, dll.).
 *  Gambar orang memakai mesin gerak di guide.js (sideFigure/blend/POSE). Isi ada di belajar-data.js (id/ms → Indonesia, en/ar → Inggris). */
import { $, store } from './util.js';
import { t, lang, hooks, LANGS } from './i18n.js';
import { esc, nameOf } from './prayers.js';
import { ic } from './icons.js';
import { sideFigure, blend, POSE } from './guide.js';
import { REC, SURAH, STEP, MOVES, PREP, PRAYERS, prayer, flow } from './belajar-data.js';

/* ---------- teks antarmuka ---------- */
const U = {
  id: {
    'nav.bs': 'Belajar', 'f.bs.t': 'Belajar Shalat', 'f.bs.d': 'Gerakan & bacaan shalat langkah demi langkah, lengkap dengan arti. Cocok untuk mualaf dan pemula.',
    'bs.title': 'Belajar Shalat', 'bs.sub': 'Gerakan dan bacaan, lengkap dengan latin dan arti.',
    'bs.t.follow': 'Ikuti', 'bs.t.moves': 'Gerakan', 'bs.t.recs': 'Bacaan', 'bs.t.prep': 'Persiapan',
    'bs.pick': 'Pilih shalat yang ingin dipelajari', 'bs.p.sunnah': 'Sunnah 2 rakaat', 'bs.sum': '{n} rakaat · {s} langkah', 'bs.start': 'Mulai belajar',
    'bs.hero': 'Ikuti dari takbir sampai salam. Gambar menunjukkan gerakannya, di bawahnya ada bacaan Arab, latin, dan artinya.',
    'bs.exit': 'Keluar', 'bs.prev': 'Kembali', 'bs.next': 'Lanjut', 'bs.step': 'Langkah {n} dari {m}', 'bs.rk': 'Rakaat {n} dari {m}', 'bs.again': 'Ulangi dari awal',
    'bs.latin': 'Latin', 'bs.arti': 'Arti', 'bs.opt': 'Sunnah', 'bs.jahr': 'Imam membaca keras', 'bs.sirr': 'Dibaca pelan', 'bs.times': '{n} kali', 'bs.tip': 'Tips', 'bs.choose': 'Pilih surah',
    'bs.qibla': 'Buka tab Kiblat', 'bs.dz': 'Buka Dzikir', 'bs.done.t': 'Selesai', 'bs.demo': 'Satu rakaat dalam gerakan', 'bs.demo.h': 'Perhatikan urutannya. Gambar bergerak otomatis dan berulang.', 'bs.gal': 'Semua gerakan',
    'bs.g.wajib': 'Bacaan wajib', 'bs.g.gerak': 'Bacaan gerakan', 'bs.g.sunnah': 'Bacaan sunnah & surah pendek', 'bs.g.niat': 'Niat shalat', 'bs.g.wudhu': 'Wudhu & syahadat',
    'bs.recs.h': 'Ketuk sebuah bacaan untuk membukanya.',
  },
  en: {
    'nav.bs': 'Learn', 'f.bs.t': 'Learn to Pray', 'f.bs.d': 'Prayer movements and recitations step by step, with meanings. Great for new Muslims and beginners.',
    'bs.title': 'Learn to Pray', 'bs.sub': 'Movements and recitations, with transliteration and meaning.',
    'bs.t.follow': 'Follow', 'bs.t.moves': 'Moves', 'bs.t.recs': 'Recitations', 'bs.t.prep': 'Basics',
    'bs.pick': 'Choose a prayer to learn', 'bs.p.sunnah': 'Sunnah, 2 rak\'ahs', 'bs.sum': '{n} rak\'ahs · {s} steps', 'bs.start': 'Start learning',
    'bs.hero': 'Follow from the opening takbir to the salam. The figure shows the movement, with Arabic, transliteration and meaning below it.',
    'bs.exit': 'Exit', 'bs.prev': 'Back', 'bs.next': 'Next', 'bs.step': 'Step {n} of {m}', 'bs.rk': 'Rak\'ah {n} of {m}', 'bs.again': 'Start over',
    'bs.latin': 'Latin', 'bs.arti': 'Meaning', 'bs.opt': 'Sunnah', 'bs.jahr': 'Imam recites aloud', 'bs.sirr': 'Recited quietly', 'bs.times': '{n} times', 'bs.tip': 'Tip', 'bs.choose': 'Choose a surah',
    'bs.qibla': 'Open Qibla tab', 'bs.dz': 'Open Dhikr', 'bs.done.t': 'Done', 'bs.demo': 'One rak\'ah in motion', 'bs.demo.h': 'Watch the order. The figure moves and repeats on its own.', 'bs.gal': 'All movements',
    'bs.g.wajib': 'Required recitations', 'bs.g.gerak': 'Recitations for movements', 'bs.g.sunnah': 'Sunnah & short surahs', 'bs.g.niat': 'Intentions', 'bs.g.wudhu': 'Wudu & shahada',
    'bs.recs.h': 'Tap a recitation to open it.',
  },
  ar: {
    'nav.bs': 'تعلّم', 'f.bs.t': 'تعلّم الصلاة', 'f.bs.d': 'حركات الصلاة وأذكارها خطوة بخطوة مع المعاني. مناسب للمسلمين الجدد والمبتدئين.',
    'bs.title': 'تعلّم الصلاة', 'bs.sub': 'الحركات والأذكار مع النطق والمعنى.',
    'bs.t.follow': 'تابع', 'bs.t.moves': 'الحركات', 'bs.t.recs': 'الأذكار', 'bs.t.prep': 'الأساسيات',
    'bs.pick': 'اختر الصلاة التي تريد تعلّمها', 'bs.p.sunnah': 'سنة ركعتان', 'bs.sum': '{n} ركعات · {s} خطوة', 'bs.start': 'ابدأ التعلّم',
    'bs.hero': 'تابع من تكبيرة الإحرام إلى السلام. الرسم يوضح الحركة وتحته النص العربي والنطق والمعنى.',
    'bs.exit': 'خروج', 'bs.prev': 'السابق', 'bs.next': 'التالي', 'bs.step': 'الخطوة {n} من {m}', 'bs.rk': 'الركعة {n} من {m}', 'bs.again': 'ابدأ من جديد',
    'bs.latin': 'النطق', 'bs.arti': 'المعنى', 'bs.opt': 'سنة', 'bs.jahr': 'يجهر الإمام', 'bs.sirr': 'تُقرأ سرًّا', 'bs.times': '{n} مرات', 'bs.tip': 'نصيحة', 'bs.choose': 'اختر سورة',
    'bs.qibla': 'افتح القبلة', 'bs.dz': 'افتح الأذكار', 'bs.done.t': 'تم', 'bs.demo': 'ركعة واحدة بالحركة', 'bs.demo.h': 'لاحظ الترتيب. الرسم يتحرك ويتكرر تلقائيًا.', 'bs.gal': 'كل الحركات',
    'bs.g.wajib': 'الأذكار الواجبة', 'bs.g.gerak': 'أذكار الحركات', 'bs.g.sunnah': 'السنن والسور القصيرة', 'bs.g.niat': 'النيّات', 'bs.g.wudhu': 'الوضوء والشهادة',
    'bs.recs.h': 'اضغط على ذكر لفتحه.',
  },
};
U.ms = U.id;
Object.entries(U).forEach(([l, o]) => Object.assign(LANGS[l][1], o));

/* ---------- pembantu ---------- */
const loc = (b) => (b == null || typeof b === 'string' ? b : lang() === 'id' || lang() === 'ms' ? b.id : b.en ?? b.id);
const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const S = Object.assign({ tab: 'follow', latin: true, arti: true, pid: 'dzuhur' }, store.get('rs.bs', {}));
const keep = () => store.set('rs.bs', { tab: S.tab, latin: S.latin, arti: S.arti, pid: S.pid });
const pname = (id) => (id === 'sunnah' ? t('bs.p.sunnah') : nameOf(id));
let idx = -1, steps = [], sur = { 1: 's_ikhlas', 2: 's_kautsar' }, stage = null, demoTm = 0;

function recHTML(id, over = {}) {
  const r = REC[id], ar = r.ar.split('|'), la = r.lat.split('|'), tr = String(loc(r.tr)).split('|'), paired = tr.length === ar.length, n = over.times ?? r.times;
  return `<div class="bs-rec"><div class="bs-rec-h"><b>${esc(loc(r.name))}</b>${n ? `<em>${esc(t('bs.times', { n }))}</em>` : ''}</div>`
    + ar.map((a, i) => `<div class="bs-ln"><p class="bs-ar" dir="rtl" lang="ar">${esc(a)}</p>${S.latin ? `<p class="bs-lat">${esc(la[i] || '')}</p>` : ''}${S.arti && paired ? `<p class="bs-tr">${esc(tr[i])}</p>` : ''}</div>`).join('')
    + (S.arti && !paired ? `<p class="bs-tr">${esc(tr.join(' '))}</p>` : '') + (r.note ? `<p class="bs-note">${esc(loc(r.note))}</p>` : '') + '</div>';
}
const toggles = () => `<div class="bs-tg"><button type="button" class="pill sm ${S.latin ? 'on' : ''}" data-a="latin" aria-pressed="${S.latin}">${esc(t('bs.latin'))}</button><button type="button" class="pill sm ${S.arti ? 'on' : ''}" data-a="arti" aria-pressed="${S.arti}">${esc(t('bs.arti'))}</button></div>`;

/* ---------- gambar gerak ---------- */
function createStage(svg, first) {
  const draw = sideFigure(svg, 'plain'); let from = POSE[first], to = from, cur = from, t0 = 0, dur = 0, raf = 0;
  const frame = (now) => { raf = requestAnimationFrame(frame); const k = dur ? Math.min(1, (now - t0) / dur) : 1; cur = k >= 1 ? to : blend(from, to, k); draw(cur, now); };
  draw(cur, 0);
  return {
    to(name, ms = 950) { from = cur; to = POSE[name]; t0 = performance.now(); dur = ms; if (reduce()) { cur = to; dur = 0; draw(cur, 0); } },
    start() { if (!reduce() && !raf) raf = requestAnimationFrame(frame); },
    stop() { cancelAnimationFrame(raf); raf = 0; },
  };
}
const newSvg = (cls) => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('class', cls); s.setAttribute('role', 'img'); return s; };
function halt() { stage?.stop(); stage = null; clearTimeout(demoTm); demoTm = 0; }

/* ---------- tab: Ikuti ---------- */
function followPick() {
  const P = prayer(S.pid), n = flow(P.id).length;
  $('bsBody').innerHTML = `<div class="card bs-hero"><span class="al-ico big">${ic('sajadah', 26)}</span><p>${esc(t('bs.hero'))}</p></div>`
    + `<span class="glbl">${esc(t('bs.pick'))}</span><div class="pills wrap" id="bsPills">${PRAYERS.map((p) => `<button type="button" class="pill ${p.id === S.pid ? 'on' : ''}" data-pid="${p.id}">${esc(pname(p.id))}</button>`).join('')}</div>`
    + `<div class="card bs-sumc"><b>${esc(pname(P.id))}</b><small>${esc(t('bs.sum', { n: P.r, s: n }))}</small></div>`
    + `<button type="button" class="btn" data-a="start">${esc(t('bs.start'))}</button>`;
}
function followShell() {
  halt(); steps = flow(S.pid);
  $('bsBody').innerHTML = `<div class="bs-bar"><button type="button" class="pill" data-a="exit">${esc(t('bs.exit'))}</button><span id="bsToggles"></span></div>`
    + `<div class="bs-prog"><i id="bsProg"></i></div><div class="bs-meta"><span id="bsStep"></span><span class="bs-chip" id="bsRk"></span></div>`
    + `<div class="card bs-stage"><div id="bsFig"></div></div><div id="bsCard"></div>`
    + `<div class="bs-nav"><button type="button" class="btn ghost" data-a="prev" id="bsPrev"></button><button type="button" class="btn" data-a="next" id="bsNext"></button></div>`;
  const svg = newSvg('bs-fig'); $('bsFig').append(svg); stage = createStage(svg, STEP[steps[0].k].pose); stage.start();
}
function followStep(move = true) {
  const s = steps[idx], d = STEP[s.k], P = prayer(S.pid), last = idx === steps.length - 1;
  $('bsToggles').innerHTML = toggles();
  $('bsProg').style.width = ((idx + 1) / steps.length * 100).toFixed(1) + '%';
  $('bsStep').textContent = t('bs.step', { n: idx + 1, m: steps.length });
  $('bsRk').textContent = s.rk ? t('bs.rk', { n: s.rk, m: s.of }) : pname(P.id); $('bsRk').hidden = false;
  let recs = [...(d.recs || [])];
  if (s.niat) recs = [s.niat]; if (s.k === 'fatihah') recs = [...(s.taawudz ? ['taawudz'] : []), 'fatihah']; if (d.pick) recs = [sur[s.rk] || SURAH[0]];
  const chips = [d.opt ? `<span class="bs-chip gold">${esc(t('bs.opt'))}</span>` : '', s.read ? `<span class="bs-chip ${s.read}">${esc(t('bs.' + s.read))}</span>` : ''].join('');
  const pick = d.pick ? `<span class="glbl">${esc(t('bs.choose'))}</span><div class="pills wrap bs-sur">${SURAH.map((id) => `<button type="button" class="pill sm ${sur[s.rk] === id ? 'on' : ''}" data-sur="${id}">${esc(loc(REC[id].name))}</button>`).join('')}</div>` : '';
  const act = d.link ? `<button type="button" class="pill" data-go="${d.link}">${esc(t('bs.qibla'))}</button>` : d.done ? `<button type="button" class="btn" data-go="dz">${esc(t('bs.dz'))}</button>` : '';
  $('bsCard').innerHTML = `<h3 class="bs-h">${esc(loc(d.title))}</h3><div class="bs-chips">${chips}</div><p class="bs-how">${esc(loc(d.how))}</p>${pick}${recs.map((id) => recHTML(id)).join('')}`
    + (d.tip ? `<div class="bs-tip"><b>${esc(t('bs.tip'))}</b> ${esc(loc(d.tip))}</div>` : '') + (act ? `<div class="bs-act">${act}</div>` : '');
  $('bsPrev').textContent = '‹ ' + t('bs.prev'); $('bsPrev').disabled = idx === 0;
  $('bsNext').textContent = last ? t('bs.again') : t('bs.next') + ' ›';
  if (move) { stage.to(d.pose); scrollTo(0, 0); }
}
function step(delta) { const n = idx + delta; if (n < 0) return; if (n >= steps.length) { idx = 0; } else idx = n; followStep(); }

/* ---------- tab: Gerakan ---------- */
const DEMO = [['i', 900, 1100, B2('Berdiri', 'Stand')], ['u', 900, 1100, B2('Takbiratul ihram', 'Opening takbir')], ['q', 800, 1500, B2('Sedekap, baca Al-Fatihah', 'Hands folded, recite Al-Fatihah')], ['r', 900, 1600, B2('Rukuk', 'Ruku')], ['i', 800, 1200, B2("I'tidal", "I'tidal")],
  ['k', 800, 0, B2('Turun untuk sujud', 'Going down')], ['s', 700, 1800, B2('Sujud', 'Prostration')], ['d', 750, 1400, B2('Duduk di antara dua sujud', 'Sitting between prostrations')], ['s', 650, 1800, B2('Sujud kedua', 'Second prostration')], ['d', 800, 1300, B2('Tahiyat awal', 'First tashahhud')], ['w', 900, 1700, B2('Tahiyat akhir', 'Final tashahhud')]];
function B2(id, en) { return { id, en }; }
function moves() {
  $('bsBody').innerHTML = `<div class="card bs-stage"><div id="bsFig"></div><p class="bs-cap" id="bsCap"></p></div><h3 class="rp-sec">${esc(t('bs.demo'))}</h3><p class="bs-hint">${esc(t('bs.demo.h'))}</p>`
    + `<h3 class="rp-sec">${esc(t('bs.gal'))}</h3><div class="bs-gal">${MOVES.map((m, i) => `<div class="card bs-mv"><div class="bs-mvf" data-i="${i}"></div><b>${esc(loc(m.name))}</b><ul>${loc(m.pts).map((p) => `<li>${esc(p)}</li>`).join('')}</ul></div>`).join('')}</div>`;
  const svg = newSvg('bs-fig'); $('bsFig').append(svg); stage = createStage(svg, 'i'); stage.start();
  document.querySelectorAll('.bs-mvf').forEach((box) => { const s = newSvg('bs-fig sm'); box.append(s); sideFigure(s, 'plain')(POSE[MOVES[+box.dataset.i].pose], 0); });
  let i = -1; const run = () => { i = (i + 1) % DEMO.length; const [p, mv, hold, lb] = DEMO[i]; stage.to(p, mv); $('bsCap').textContent = loc(lb); if (!reduce() || true) demoTm = setTimeout(run, (reduce() ? 0 : mv) + hold + (reduce() ? 1200 : 0)); }; run();
}

/* ---------- tab: Bacaan ---------- */
const GROUPS = [['bs.g.wajib', ['fatihah', 'tahiyat', 'shalawat', 'salam']], ['bs.g.gerak', ['takbir', 'ruku', 'sami', 'itidal', 'sujud', 'duduk']],
  ['bs.g.sunnah', ['taawudz', 'iftitah', 's_ikhlas', 's_kautsar', 's_ashr', 's_falaq', 's_nas', 'doa_akhir', 'qunut']], ['bs.g.niat', ['niat_subuh', 'niat_dzuhur', 'niat_ashar', 'niat_maghrib', 'niat_isya', 'niat_sunnah']], ['bs.g.wudhu', ['wudhu_niat', 'wudhu_doa', 'syahadat']]];
function recs() {
  $('bsBody').innerHTML = `<div class="bs-bar"><p class="bs-hint">${esc(t('bs.recs.h'))}</p><span>${toggles()}</span></div>`
    + GROUPS.map(([g, ids]) => `<h3 class="rp-sec">${esc(t(g))}</h3>` + ids.map((id) => `<details class="bs-acc"><summary><span>${esc(loc(REC[id].name))}</span></summary>${recHTML(id)}</details>`).join('')).join('');
}

/* ---------- tab: Persiapan ---------- */
function prep() {
  $('bsBody').innerHTML = `<div class="bs-bar"><span></span><span>${toggles()}</span></div>` + PREP.map((p) => {
    const body = (p.p ? loc(p.p).map((x) => `<p class="bs-p">${esc(x)}</p>`).join('') : '') + (p.ul ? `<ul class="bs-ul">${loc(p.ul).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '') + (p.ol ? `<ol class="bs-ol">${loc(p.ol).map((x) => `<li>${esc(x)}</li>`).join('')}</ol>` : '') + (p.recs || []).map((id) => recHTML(id)).join('');
    return `<details class="bs-acc" ${p.open ? 'open' : ''}><summary><span class="al-ico">${ic(p.icon, 20)}</span><span>${esc(loc(p.title))}</span></summary>${body}</details>`;
  }).join('');
}

/* ---------- render & aksi ---------- */
function render() {
  const el = $('bs'); if (!el) return; halt();
  el.innerHTML = `<h2 class="ttl">${esc(t('bs.title'))}</h2><p class="bs-hint">${esc(t('bs.sub'))}</p>`
    + `<div class="seg quad" id="bsTabs">${['follow', 'moves', 'recs', 'prep'].map((k) => `<button type="button" data-tab="${k}" class="${S.tab === k ? 'on' : ''}">${esc(t('bs.t.' + k))}</button>`).join('')}</div><div id="bsBody"></div>`;
  if (S.tab === 'follow') { if (idx >= 0) { followShell(); followStep(false); stage.to(STEP[steps[idx].k].pose, 0); } else followPick(); }
  else if (S.tab === 'moves') moves(); else if (S.tab === 'recs') recs(); else prep();
}
$('bs').addEventListener('click', (e) => {
  const tab = e.target.closest('[data-tab]'); if (tab) { S.tab = tab.dataset.tab; idx = -1; keep(); render(); return; }
  const pid = e.target.closest('[data-pid]'); if (pid) { S.pid = pid.dataset.pid; keep(); render(); return; }
  const sr = e.target.closest('[data-sur]'); if (sr) { sur[steps[idx].rk] = sr.dataset.sur; followStep(false); return; }
  const a = e.target.closest('[data-a]'); if (!a) return;
  if (a.dataset.a === 'start') { idx = 0; render(); scrollTo(0, 0); }
  else if (a.dataset.a === 'exit') { idx = -1; render(); }
  else if (a.dataset.a === 'next') step(1); else if (a.dataset.a === 'prev') step(-1);
  else if (a.dataset.a === 'latin' || a.dataset.a === 'arti') { S[a.dataset.a] = !S[a.dataset.a]; keep(); if (S.tab === 'follow' && idx >= 0) followStep(false); else render(); }
});
document.addEventListener('keydown', (e) => { if ($('bs').classList.contains('on') && S.tab === 'follow' && idx >= 0 && !/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) { if (e.key === 'ArrowRight') step(1); else if (e.key === 'ArrowLeft') step(-1); } });
let wasOn = false;
new MutationObserver(() => { const on = $('bs').classList.contains('on'); if (on && !wasOn) render(); if (!on && wasOn) halt(); wasOn = on; }).observe($('bs'), { attributes: true, attributeFilter: ['class'] });
document.addEventListener('visibilitychange', () => { if (!$('bs').classList.contains('on')) return; if (document.hidden) stage?.stop(); else stage?.start(); });
hooks.push(() => { if ($('bs').classList.contains('on')) render(); });
