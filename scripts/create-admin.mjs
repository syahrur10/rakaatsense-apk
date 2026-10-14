// Membuat akun admin di Firebase Authentication (mode online). Tanpa dependensi tambahan, butuh Node 18+.
// Pemakaian (sekali saja, dari folder proyek):
//   ADMIN_PASSWORD='kata-sandi-admin' node scripts/create-admin.mjs
// Opsional: ADMIN_EMAIL=... (bawaan syahrurbaja@gmail.com), ADMIN_NAME=... (bawaan Admin)
// Prasyarat: file .env sudah berisi VITE_FIREBASE_API_KEY dan Email/Password sudah diaktifkan di Firebase Console.
import { readFileSync } from 'node:fs';

try { for (const l of readFileSync(new URL('../.env', import.meta.url), 'utf8').split(/\r?\n/)) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); } } catch {}

const key = process.env.VITE_FIREBASE_API_KEY, email = (process.env.ADMIN_EMAIL || 'syahrurbaja@gmail.com').toLowerCase(), password = process.env.ADMIN_PASSWORD, name = process.env.ADMIN_NAME || 'Admin';
if (!key) { console.error('VITE_FIREBASE_API_KEY belum ada. Isi dulu file .env (lihat .env.example).'); process.exit(1); }
if (!password || password.length < 6) { console.error("Isi ADMIN_PASSWORD (min. 6 karakter), mis.: ADMIN_PASSWORD='xxxx' node scripts/create-admin.mjs"); process.exit(1); }

const call = async (path, body) => { const r = await fetch(`https://identitytoolkit.googleapis.com/v1/${path}?key=${key}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return { ok: r.ok, data: await r.json() }; };

let res = await call('accounts:signUp', { email, password, returnSecureToken: true });
if (!res.ok) {
  const msg = res.data?.error?.message || '';
  if (msg.startsWith('EMAIL_EXISTS')) { console.log(`Akun ${email} sudah ada. Tidak ada yang diubah. (Lupa sandi? Pakai "Lupa kata sandi?" di aplikasi atau reset di Firebase Console.)`); process.exit(0); }
  if (msg.startsWith('OPERATION_NOT_ALLOWED')) console.error('Email/Password belum diaktifkan: Firebase Console → Authentication → Sign-in method → Email/Password → Enable.');
  else console.error('Gagal membuat akun:', msg || JSON.stringify(res.data));
  process.exit(1);
}
await call('accounts:update', { idToken: res.data.idToken, displayName: name, returnSecureToken: false });
console.log(`Akun admin dibuat: ${email}. Masuk di aplikasi → pilih "Admin".`);
