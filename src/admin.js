/** admin.js — panel admin: daftar pengguna, pencarian, statistik. Mode lokal: akun di perangkat (bisa dihapus). Mode online: koleksi Firestore "users". */
import { $, gstore, toast } from './util.js';
import { t, lang, hooks } from './i18n.js';
import { ic, mount } from './icons.js';
import { ONLINE, LOCAL_ADMIN } from './config.js';

let rows = [];
const WEEK = 7 * 864e5;
const fmt = (ms) => (ms ? new Date(ms).toLocaleDateString(lang(), { day: 'numeric', month: 'short', year: 'numeric' }) : t('adm.never'));
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }; // textContent → aman dari XSS (nama/email diisi pengguna)

async function load() {
  if (!ONLINE) {
    const S = gstore.get('rs.users', {});
    rows = [{ id: LOCAL_ADMIN.email, name: LOCAL_ADMIN.name, email: LOCAL_ADMIN.email, role: 'admin', created: 0, last: 0, locked: true },
      ...Object.entries(S).map(([mail, u]) => ({ id: mail, name: u.name, email: mail, role: u.role || 'user', created: u.at, last: u.last || u.at }))];
    $('aInfo').textContent = t('adm.local'); $('aInfo').className = 'au-ok';
    return;
  }
  try {
    const fb = await import('./firebase.js'), { isAdminMail } = await import('./config.js');
    rows = (await fb.listUsers()).map((u) => ({ id: u.id, name: u.name, email: u.email, role: isAdminMail(u.email) ? 'admin' : 'user', created: u.created, last: u.lastLogin, locked: true }));
    $('aInfo').textContent = t('adm.cloud'); $('aInfo').className = 'au-ok';
  } catch { rows = []; $('aInfo').textContent = t('adm.nofs'); $('aInfo').className = 'au-err'; }
}

function remove(u) {
  if (u.locked || !confirm(t('adm.delq', { n: u.email }))) return;
  const S = gstore.get('rs.users', {}); delete S[u.email]; gstore.set('rs.users', S);
  Object.keys(localStorage).filter((k) => k.startsWith(`u.${u.email}.`)).forEach((k) => localStorage.removeItem(k));
  toast(t('adm.del') + ': ' + u.email, true); render();
}

function paint() {
  const q = $('aSearch').value.trim().toLowerCase(), now = Date.now();
  const list = rows.filter((u) => !q || `${u.name} ${u.email}`.toLowerCase().includes(q));
  $('aTot').textContent = rows.length; $('aAdm').textContent = rows.filter((u) => u.role === 'admin').length; $('aNew').textContent = rows.filter((u) => u.created && now - u.created < WEEK).length;
  const box = $('aList'); box.replaceChildren();
  if (!list.length) { box.append(el('p', 'mute small', t('adm.empty'))); return; }
  list.forEach((u) => {
    const r = el('div', 'urow'), av = el('div', 'uav', (u.name || u.email || '?').trim().charAt(0)), info = el('div', 'uin'), nm = el('b', '', u.name || u.email);
    nm.append(el('span', 'ubadge' + (u.role === 'admin' ? ' adm' : ''), t(u.role === 'admin' ? 'au.r.admin' : 'au.r.user')));
    info.append(nm, el('small', '', u.email), el('small', '', `${t('adm.last')}: ${fmt(u.last)}${u.created ? ` · ${t('adm.joined')}: ${fmt(u.created)}` : ''}`));
    r.append(av, info);
    if (!u.locked) { const d = el('button', 'icon udel'); d.type = 'button'; d.setAttribute('aria-label', t('adm.del')); d.innerHTML = ic('trash', 18); d.onclick = () => remove(u); r.append(d); }
    box.append(r);
  });
}

export async function render() { $('aInfo').textContent = '…'; await load(); paint(); }
$('aSearch').oninput = paint; $('admRefresh').onclick = render;
hooks.push(() => $('adm').classList.contains('on') && paint());
mount($('adm'));
