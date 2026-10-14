/** auth.js — login sungguhan. Mode online (Firebase Auth): Email+Sandi, Google, Facebook, GitHub, lupa sandi; akun tersimpan di server.
 *  Mode cadangan (jika kunci Firebase belum diisi di .env): akun lokal di perangkat (PBKDF2), tombol sosial menampilkan pesan "belum diaktifkan". */
import { $, gstore } from './util.js';
import { t, LANGS, lang, setLang, apply } from './i18n.js';
import { mount, beads } from './icons.js';
import { ONLINE, SOCIAL, isAdminMail, LOCAL_ADMIN } from './config.js';

let mode = 'in', role = 'user', fb = null;
const getFb = async () => (fb ||= await import('./firebase.js'));

/* ---- mode lokal (cadangan) ---- */
const enc = new TextEncoder();
const b64 = (u8) => btoa(String.fromCharCode(...u8));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
async function hash(pw, salt) {
  const key = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
  return b64(new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 150000, hash: 'SHA-256' }, key, 256)));
}
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

function setRole(r) {
  role = r; const admin = r === 'admin';
  $('rUser').classList.toggle('on', !admin); $('rAdmin').classList.toggle('on', admin);
  $('rUser').setAttribute('aria-selected', !admin); $('rAdmin').setAttribute('aria-selected', admin);
  $('auSeg').hidden = admin; $('auAdminHint').hidden = !admin; $('auGuest').hidden = admin;
  $('socBox').hidden = admin || !SOCIAL.length;
  document.querySelector('.au-note').hidden = admin;
  setMode('in');
}
function setMode(m) {
  mode = role === 'admin' ? 'in' : m; m = mode; err();
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
      if (role === 'admin' && !u.admin) { await m.signOut(); return err('au.e.notadmin'); }
      await Promise.race([m.register(u).catch(() => {}), new Promise((r) => setTimeout(r, 2500))]); // catat ke daftar pengguna (panel admin)
      return enter(u.id, u.name, role === 'admin' ? 'admin' : 'user');
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
      if (role === 'admin' && u.role !== 'admin') return err('au.e.notadmin');
      if (u.role !== 'admin') { const S = stored(); if (S[mail]) { S[mail].last = Date.now(); gstore.set('rs.users', S); } }
      enter(mail, u.name, role === 'admin' ? 'admin' : 'user');
    }
  } catch (e) { fail(e); } finally { busy(false); }
}
async function social(p) {
  err(); if (!ONLINE) return err('au.e.cfg');
  busy(true);
  try { const m = await getFb(), u = await m.social(p); if (u) { await Promise.race([m.register(u).catch(() => {}), new Promise((r) => setTimeout(r, 2500))]); enter(u.id, u.name, 'user'); } } catch (e) { fail(e); } finally { busy(false); }
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
  $('rUser').onclick = () => setRole('user'); $('rAdmin').onclick = () => setRole('admin');
  document.querySelectorAll('.sbtn').forEach((b) => (b.hidden = !SOCIAL.includes(b.dataset.p))); // tombol sosial hanya muncul bila memang aktif
  $('auForm').onsubmit = submit; $('auForgot').onclick = forgot;
  document.querySelectorAll('.sbtn').forEach((b) => (b.onclick = () => social(b.dataset.p)));
  $('auGuest').onclick = () => enter('guest', '');
  $('aEye').onclick = () => {
    const show = $('aPass').type === 'password'; $('aPass').type = show ? 'text' : 'password';
    $('aEye').dataset.ia = show ? 'au.hide' : 'au.show'; $('aEye').dataset.ic = show ? 'eyeoff' : 'eye'; mount($('auth')); apply();
  };
  document.querySelector('.au-note').dataset.i = ONLINE ? 'au.note.cloud' : 'au.note';
  mount(); apply(); setRole('user');
  if (ONLINE) getFb().then((m) => m.redirectResult()).then((u) => u && enter(u.id, u.name, 'user')).catch(fail); // hasil login sosial via redirect
}
