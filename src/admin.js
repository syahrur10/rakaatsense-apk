/** admin.js — panel admin: daftar pengguna, detail data ibadah per pengguna, ubah peran (pengguna ⇄ admin).
 *  Mode lokal: akun & data di perangkat ini. Mode online: koleksi Firestore "users" (ringkasan data ibadah dikirim tiap pengguna). */
import { $, dayKey, gstore, session, toast } from './util.js';
import { t, lang, hooks } from './i18n.js';
import { ic, mount } from './icons.js';
import { ONLINE, LOCAL_ADMIN, isAdminMail } from './config.js';

const PR = ['subuh', 'dzuhur', 'ashar', 'maghrib', 'isya'], WEEK = 7 * 864e5;
let rows = [], openId = null;
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }; // textContent → aman dari XSS (nama/email diisi pengguna)
const fmt = (ms) => (ms ? new Date(ms).toLocaleDateString(lang(), { day: 'numeric', month: 'short', year: 'numeric' }) : t('adm.never'));
const badge = (r) => el('span', 'ubadge' + (r === 'admin' ? ' adm' : ''), t(r === 'admin' ? 'au.r.admin' : 'au.r.user'));
const msg = (txt, bad) => { $('aInfo').textContent = txt; $('aInfo').className = bad ? 'au-err' : 'au-ok'; };
const mainAdmin = (u) => (ONLINE ? isAdminMail(u.email) : u.email === LOCAL_ADMIN.email);

async function load() {
  if (!ONLINE) {
    const S = gstore.get('rs.users', {}), mk = (id, u) => ({ id, name: u.name, email: id, role: u.role || 'user', created: u.at || 0, last: u.last || u.at || 0, data: { log: gstore.get(`u.${id}.rs.log`, {}), dz: gstore.get(`u.${id}.rs.dz`, {}) } });
    rows = [mk(LOCAL_ADMIN.email, { name: LOCAL_ADMIN.name, role: 'admin' }), ...Object.entries(S).map(([id, u]) => mk(id, u))];
    return msg(t('adm.local'));
  }
  try {
    rows = (await (await import('./firebase.js')).listUsers()).map((u) => ({ id: u.id, name: u.name, email: u.email, role: isAdminMail(u.email) ? 'admin' : u.role || 'user', created: u.created, last: u.lastLogin, data: u.stats ? { log: u.stats.log || {}, dz: u.stats.dz || {} } : null }));
    msg(t('adm.cloud'));
  } catch { rows = []; msg(t('adm.nofs'), true); }
}

/* ---- ubah peran / hapus ---- */
async function setRole(u, role) {
  if (!confirm(t(role === 'admin' ? 'adm.promq' : 'adm.demq', { n: u.email }))) return;
  try {
    if (ONLINE) await (await import('./firebase.js')).setRole(u.id, role);
    else { const S = gstore.get('rs.users', {}); if (!S[u.id]) throw 0; S[u.id].role = role; gstore.set('rs.users', S); }
    u.role = role; toast(t('adm.done'), true); paint(); detail(u);
  } catch { toast(t('adm.fail')); }
}
function remove(u) {
  if (!confirm(t('adm.delq', { n: u.email }))) return;
  const S = gstore.get('rs.users', {}); delete S[u.id]; gstore.set('rs.users', S);
  Object.keys(localStorage).filter((k) => k.startsWith(`u.${u.id}.`)).forEach((k) => localStorage.removeItem(k));
  toast(t('adm.del') + ': ' + u.email, true); render();
}

/* ---- daftar ---- */
function paint() {
  const q = $('aSearch').value.trim().toLowerCase(), now = Date.now(), list = rows.filter((u) => !q || `${u.name} ${u.email}`.toLowerCase().includes(q));
  $('aTot').textContent = rows.length; $('aAdm').textContent = rows.filter((u) => u.role === 'admin').length; $('aNew').textContent = rows.filter((u) => u.created && now - u.created < WEEK).length;
  const box = $('aList'); box.replaceChildren();
  if (!list.length) return box.append(el('p', 'mute small', t('adm.empty')));
  list.forEach((u) => {
    const r = el('div', 'urow clk'), info = el('div', 'uin'), nm = el('b', '', u.name || u.email), chev = el('span', 'uchev'); chev.innerHTML = ic('back', 18); chev.style.transform = 'scaleX(-1)';
    nm.append(badge(u.role)); info.append(nm, el('small', '', u.email), el('small', '', `${t('adm.last')}: ${fmt(u.last)}`));
    r.append(el('div', 'uav', (u.name || u.email || '?').trim().charAt(0)), info, chev); r.onclick = () => detail(u); box.append(r);
  });
}

/* ---- detail pengguna: data ibadah + kontrol peran ---- */
function detail(u) {
  openId = u.id; $('aMain').hidden = true; $('aDetail').hidden = false; $('admTitle').textContent = u.name || u.email; scrollTo(0, 0);
  const { log = {}, dz = {} } = u.data || {}, box = $('aDetail'); box.replaceChildren();
  const head = el('div', 'udet-head'), who = el('div'); const h = el('h3', '', u.name || u.email); h.append(badge(u.role));
  who.append(h, el('small', 'mute', u.email), el('small', 'mute', `${t('adm.joined')}: ${fmt(u.created)} · ${t('adm.last')}: ${fmt(u.last)}`));
  head.append(el('div', 'uav', (u.name || u.email || '?').trim().charAt(0)), who); box.append(head);

  const day = (i) => { const d = new Date(); d.setDate(d.getDate() - i); return d; }, full = (l) => PR.every((p) => l?.[p]);
  let streak = 0; for (let i = 0; i < 400; i++) { const k = dayKey(day(i)); if (full(log[k])) streak++; else if (i === 0) continue; else break; }
  const today = PR.filter((p) => log[dayKey()]?.[p]).length, dzTotal = Object.values(dz).reduce((a, d) => a + (d.total || 0), 0);
  const st = el('div', 'adm-stats'); [[streak, 's.streak'], [`${today}/5`, 's.pr'], [dzTotal, 'adm.dzt']].forEach(([v, k]) => { const c = el('div'); c.append(el('b', '', v), el('small', '', t(k))); st.append(c); }); box.append(st);

  const card = el('div', 'card'); card.append(el('h3', '', t('adm.week')));
  const hasData = u.data && (Object.keys(log).length || Object.keys(dz).length);
  if (!hasData) card.append(el('p', 'mute small', t('adm.nodata')));
  else for (let i = 0; i < 7; i++) {
    const d = day(i), k = dayKey(d), r = el('div', 'dr'), dots = el('div', 'dots'); PR.forEach((p) => dots.append(el('i', log[k]?.[p] ? 'on' : '')));
    r.append(el('span', '', d.toLocaleDateString(lang(), { weekday: 'short', day: 'numeric', month: 'short' })), dots, el('b', '', `${dz[k]?.total || 0}x`)); card.append(r);
  }
  box.append(card);

  const me = session()?.id === u.id, locked = mainAdmin(u) || me;
  if (!locked) { const b = el('button', 'btn abtn', t(u.role === 'admin' ? 'adm.unmake' : 'adm.make')); b.type = 'button'; b.onclick = () => setRole(u, u.role === 'admin' ? 'user' : 'admin'); box.append(b); }
  else box.append(el('p', 'mute small', t(mainAdmin(u) ? 'adm.main' : 'adm.self')));
  if (!ONLINE && !locked) { const b = el('button', 'btn abtn ghost danger', t('adm.del')); b.type = 'button'; b.onclick = () => remove(u); box.append(b); }
}
function closeDetail() { openId = null; $('aDetail').hidden = true; $('aMain').hidden = false; $('admTitle').textContent = t('adm.title'); }

export async function render() { closeDetail(); msg('…'); await load(); paint(); }
$('aSearch').oninput = paint; $('admRefresh').onclick = render;
$('admBack').onclick = () => (openId ? closeDetail() : document.querySelector('#nav [data-go="home"]').click());
hooks.push(() => { if ($('adm').classList.contains('on')) { paint(); const u = rows.find((x) => x.id === openId); u ? detail(u) : closeDetail(); } });
mount($('adm'));
