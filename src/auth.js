/** auth.js — login sungguhan. Mode online (Firebase Auth): Email+Sandi dan Google, lupa sandi; akun tersimpan di server.
 *  Mode cadangan (jika kunci Firebase belum diisi di .env): akun lokal di perangkat (PBKDF2), tombol Google menampilkan pesan "belum diaktifkan". */
import { $, gstore } from './util.js';
import { t, LANGS, lang, setLang, apply } from './i18n.js';
import { mount, beads } from './icons.js';
import { ONLINE, isAdminMail, LOCAL_ADMIN } from './config.js';
import { b64, unb64, hash } from './pwhash.js';

let mode = 'in', fb = null;
const getFb = async () => (fb ||= await import('./firebase.js'));

/* ---- mode lokal (cadangan) ---- */
/** Akun lokal. Admin bawaan selalu ada dan tidak bisa ditimpa/dihapus dari penyimpanan. */
const stored = () => gstore.get('rs.users', {});
const users = () => ({ ...stored(), [LOCAL_ADMIN.email]: LOCAL_ADMIN });

const enter = (id, name, r = 'user') => { gstore.set('rs.session', { id, name, role: r }); location.reload(); };
const msg = (id, k) => { const e = $(id); if (!k) { e.hidden = true; delete e.dataset.i; return; } e.dataset.i = k; e.textContent = t(k); e.hidden = false; };
const err = (k) => { msg('auOk'); msg('auErr', k); };
const busy = (b) => document.querySelectorAll('#auth button').forEach((x) => (x.disabled = b));
const CODES = {
  'auth/invalid-credential': 'au.e.bad', 'auth/user-not-found': 'au.e.bad', 'auth/wrong-password': 'au.e.bad', 'auth/invalid-login-credentials': 'au.e.bad',
  'auth/email-already-in-use': 'au.e.exist', 'auth/weak-password': 'au.e.short', 'auth/invalid-email': 'au.e.mail', 'auth/network-request-failed': 'au.e.net',
  'auth/too-many-requests': 'au.e.many', 'auth/account-exists-with-different-credential': 'au.e.diff',
  'auth/operation-not-allowed': 'au.e.cfg', 'auth/unauthorized-domain': 'au.e.cfg', 'auth/popup-closed-by-user': '', 'auth/cancelled-popup-request': '',
};
const fail = (e) => err(e?.code in CODES ? CODES[e.code] : 'au.e.gen');

function setMode(m) {
  mode = m; err();
  $('tIn').classList.toggle('on', m === 'in'); $('tUp').classList.toggle('on', m === 'up');
  $('tIn').setAttribute('aria-selected', m === 'in'); $('tUp').setAttribute('aria-selected', m === 'up');
  $('fName').hidden = m === 'in'; $('auForgot').hidden = m === 'up';
  $('aPass').autocomplete = m === 'in' ? 'current-password' : 'new-password';
  $('auGo').dataset.i = m === 'in' ? 'au.go.in' : 'au.go.up'; $('auGo').textContent = t($('auGo').dataset.i);
}
async function submit(ev) {
  ev.preventDefault(); err();
  const mail = $('aMail').value.trim().toLowerCase(), pw = $('aPass').value, name = $('aName').value.trim().replace(/\s+/g, ' ');
  if (mode === 'up' && name.length < 2) return err('au.e.name');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) return err('au.e.mail');
  if (pw.length < 6) return err(mode === 'up' ? 'au.e.short' : 'au.e.bad');
  busy(true);
  try {
    if (ONLINE) {
      const m = await getFb(), u = mode === 'up' ? await m.signUp(name, mail, pw) : await m.signIn(mail, pw);
      return enter(u.id, u.name, await roleAfter(m, u)); // peran ditentukan akun (admin/pengguna), bukan pilihan di layar
    }
    if (!globalThis.crypto?.subtle) return err('au.e.crypto');
    const U = users();
    if (mode === 'up') {
      if (U[mail] || isAdminMail(mail)) return err('au.e.exist');
      const salt = crypto.getRandomValues(new Uint8Array(16)), S = stored();
      S[mail] = { name, role: 'user', salt: b64(salt), hash: await hash(pw, salt), at: Date.now(), last: Date.now() };
      gstore.set('rs.users', S); enter(mail, name, 'user');
    } else {
      const u = U[mail];
      if (!u || (await hash(pw, unb64(u.salt))) !== u.hash) return err('au.e.bad');
      { const S = stored(); if (S[mail]) { S[mail].last = Date.now(); gstore.set('rs.users', S); } }
      enter(mail, u.name, u.role === 'admin' ? 'admin' : 'user');
    }
  } catch (e) { fail(e); } finally { busy(false); }
}
/** Catat ke daftar pengguna (Firestore) dan ambil peran terbaru dari server; admin utama (VITE_ADMIN_EMAILS) selalu admin. */
async function roleAfter(m, u) {
  const r = await Promise.race([m.register(u).catch(() => null), new Promise((x) => setTimeout(() => x(null), 3000))]);
  return u.admin || r === 'admin' ? 'admin' : 'user';
}
async function social(p) {
  err(); if (!ONLINE) return err('au.e.nogoogle');
  busy(true);
  try { const m = await getFb(), u = await m.social(p); if (u) enter(u.id, u.name, await roleAfter(m, u)); } catch (e) { fail(e); } finally { busy(false); }
}
async function forgot() {
  err(); const mail = $('aMail').value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) return err('au.e.resetmail');
  if (!ONLINE) return err('au.e.noreset');
  busy(true);
  try { await (await getFb()).resetPassword(mail); msg('auOk', 'au.reset.ok'); } // sengaja selalu sukses: tidak membocorkan email mana yang terdaftar
  catch (e) { if (e?.code === 'auth/user-not-found') msg('auOk', 'au.reset.ok'); else fail(e); } finally { busy(false); }
}
export function initAuth() {
  $('authLang').innerHTML = Object.entries(LANGS).map(([k, [n]]) => `<option value="${k}" ${k === lang() ? 'selected' : ''}>${n}</option>`).join('');
  $('authLang').onchange = (e) => { setLang(e.target.value); $('lang') && ($('lang').value = e.target.value); };
  $('authDeco').innerHTML = beads();
  $('tIn').onclick = () => setMode('in'); $('tUp').onclick = () => setMode('up');
  $('auForm').onsubmit = submit; $('auForgot').onclick = forgot;
  document.querySelectorAll('.sbtn').forEach((b) => (b.onclick = () => social(b.dataset.p)));
  $('auGuest').onclick = () => enter('guest', '');
  $('aEye').onclick = () => {
    const show = $('aPass').type === 'password'; $('aPass').type = show ? 'text' : 'password';
    $('aEye').dataset.ia = show ? 'au.hide' : 'au.show'; $('aEye').dataset.ic = show ? 'eyeoff' : 'eye'; mount($('auth')); apply();
  };
  document.querySelector('.au-note').dataset.i = ONLINE ? 'au.note.cloud' : 'au.note';
  mount(); apply(); setMode('in');
  if (ONLINE) getFb().then((m) => m.redirectResult()).then(async (u) => u && enter(u.id, u.name, await roleAfter(await getFb(), u))).catch(fail); // hasil login sosial via redirect
}
