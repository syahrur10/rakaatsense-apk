/** config.js — pengaturan login & peran (admin/pengguna). */
const e = import.meta.env;

/** true bila 4 kunci Firebase terisi (mode online). Jika tidak, aplikasi memakai mode lokal (akun di perangkat). */
export const ONLINE = !!(e.VITE_FIREBASE_API_KEY && e.VITE_FIREBASE_AUTH_DOMAIN && e.VITE_FIREBASE_PROJECT_ID && e.VITE_FIREBASE_APP_ID);

/** Daftar email admin (pisahkan koma di VITE_ADMIN_EMAILS). Bawaan: akun admin RakaatSense. */
export const ADMIN_EMAILS = (e.VITE_ADMIN_EMAILS || 'syahrurbaja@gmail.com').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
export const isAdminMail = (m) => ADMIN_EMAILS.includes((m || '').trim().toLowerCase());


/** Akun admin bawaan untuk MODE LOKAL. Yang disimpan hanya salt + hash PBKDF2-SHA256 (bukan kata sandi asli). */
export const LOCAL_ADMIN = {
  email: 'syahrurbaja@gmail.com',
  name: 'Admin',
  role: 'admin',
  salt: '7B6Vap2HmyQDJC8K7+RK3w==',
  hash: 'uzilaWNpbY7FBDgR9c2xGanfX2rhnexDabc7oh6h4Ss=',
};
