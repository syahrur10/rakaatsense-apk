/** auth.js — daftar & masuk. Akun disimpan di perangkat (localStorage); kata sandi di-hash PBKDF2-SHA256 + salt, tidak disimpan polos. */
import { $, gstore } from './util.js';
import { t, LANGS, lang, setLang, apply } from './i18n.js';
import { mount, beads } from './icons.js';

let mode = 'in';
const enc = new TextEncoder();
const b64 = (u8) => btoa(String.fromCharCode(...u8));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
async function hash(pw, salt) {
  const key = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
  return b64(new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 150000, hash: 'SHA-256' }, key, 256)));
}
const users = () => gstore.get('rs.users', {});
const enter = (id, name) => { gstore.set('rs.session', { id, name }); location.reload(); };

function err(k) {
  const e = $('auErr');
  if (!k) { e.hidden = true; delete e.dataset.i; return; }
  e.dataset.i = k; e.textContent = t(k); e.hidden = false;
}
function setMode(m) {
  mode = m; err();
  $('tIn').classList.toggle('on', m === 'in'); $('tUp').classList.toggle('on', m === 'up');
  $('tIn').setAttribute('aria-selected', m === 'in'); $('tUp').setAttribute('aria-selected', m === 'up');
  $('fName').hidden = m === 'in';
  $('aPass').autocomplete = m === 'in' ? 'current-password' : 'new-password';
  $('auGo').dataset.i = m === 'in' ? 'au.go.in' : 'au.go.up'; $('auGo').textContent = t($('auGo').dataset.i);
}
async function submit(ev) {
  ev.preventDefault(); err();
  const mail = $('aMail').value.trim().toLowerCase(), pw = $('aPass').value, name = $('aName').value.trim().replace(/\s+/g, ' ');
  if (mode === 'up' && name.length < 2) return err('au.e.name');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) return err('au.e.mail');
  if (pw.length < 6) return err(mode === 'up' ? 'au.e.short' : 'au.e.bad');
  if (!globalThis.crypto?.subtle) return err('au.e.crypto');
  $('auGo').disabled = true;
  try {
    const U = users();
    if (mode === 'up') {
      if (U[mail]) return err('au.e.exist');
      const salt = crypto.getRandomValues(new Uint8Array(16));
      U[mail] = { name, salt: b64(salt), hash: await hash(pw, salt), at: Date.now() };
      gstore.set('rs.users', U); enter(mail, name);
    } else {
      const u = U[mail];
      if (!u || (await hash(pw, unb64(u.salt))) !== u.hash) return err('au.e.bad');
      enter(mail, u.name);
    }
  } finally { $('auGo').disabled = false; }
}
export function initAuth() {
  $('authLang').innerHTML = Object.entries(LANGS).map(([k, [n]]) => `<option value="${k}" ${k === lang() ? 'selected' : ''}>${n}</option>`).join('');
  $('authLang').onchange = (e) => { setLang(e.target.value); $('lang') && ($('lang').value = e.target.value); };
  $('authDeco').innerHTML = beads();
  $('tIn').onclick = () => setMode('in'); $('tUp').onclick = () => setMode('up');
  $('auForm').onsubmit = submit;
  $('auGuest').onclick = () => enter('guest', '');
  $('aEye').onclick = () => {
    const show = $('aPass').type === 'password'; $('aPass').type = show ? 'text' : 'password';
    $('aEye').dataset.ia = show ? 'au.hide' : 'au.show'; $('aEye').dataset.ic = show ? 'eyeoff' : 'eye'; mount($('auth')); apply();
  };
  mount(); apply(); setMode('in');
}
