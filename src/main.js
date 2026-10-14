/** main.js — gerbang masuk: belum login → layar login; sudah login/tamu → jalankan aplikasi (app.js). Sesi akun Firebase divalidasi ulang di latar belakang. */
import { $, session, gstore } from './util.js';
const s = session();
if (s) {
  import('./app.js');
  if (s.id !== 'guest' && import.meta.env.VITE_FIREBASE_API_KEY) // sesi cloud: bila server bilang sudah keluar/kedaluwarsa → kembali ke layar login
    import('./firebase.js').then((m) => m.watch((u) => { if (!u) { gstore.del('rs.session'); location.reload(); } }));
} else { document.body.classList.add('locked'); import('./auth.js').then((m) => m.initAuth()); }
setTimeout(() => $('splash').classList.add('off'), 1300);
