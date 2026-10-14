/** config.js — pengaturan login & peran (admin/pengguna). */
const e = import.meta.env;

/** true bila 4 kunci Firebase terisi (mode online). Jika tidak, aplikasi memakai mode lokal (akun di perangkat). */
export const ONLINE = !!(e.VITE_FIREBASE_API_KEY && e.VITE_FIREBASE_AUTH_DOMAIN && e.VITE_FIREBASE_PROJECT_ID && e.VITE_FIREBASE_APP_ID);

/** Daftar email admin (pisahkan koma di VITE_ADMIN_EMAILS). Bawaan: akun admin RakaatSense. */
export const ADMIN_EMAILS = (e.VITE_ADMIN_EMAILS || 'syahrurbaja@gmail.com').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
export const isAdminMail = (m) => ADMIN_EMAILS.includes((m || '').trim().toLowerCase());

/** Tombol login sosial yang ditampilkan (hanya mode online). Isi VITE_SOCIAL_PROVIDERS, mis. "google,github". Bawaan: google. */
export const SOCIAL = ONLINE ? (e.VITE_SOCIAL_PROVIDERS || 'google').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean) : [];

/** Akun admin bawaan untuk MODE LOKAL. Yang disimpan hanya salt + hash PBKDF2-SHA256 (bukan kata sandi asli). */
export const LOCAL_ADMIN = {
  email: 'syahrurbaja@gmail.com',
  name: 'Admin',
  role: 'admin',
  salt: '6fLoZ4zMpvo5MgyUUZjhmA==',
  hash: 's1n0rF475fD6j2xbZM0qzQE2xWmWKcaWxiezQ7bPTps=',
};
