/** main.js — gerbang masuk: belum login → layar login; sudah login/tamu → jalankan aplikasi (app.js). Sesi akun Firebase divalidasi ulang di latar belakang. */
import { $, session, gstore } from './util.js';
import { ONLINE, isAdminMail } from './config.js';
const s = session();
if (s) {
  import('./app.js');
  if (s.id !== 'guest' && ONLINE) // sesi cloud: bila server bilang sudah keluar/kedaluwarsa → kembali ke layar login; peran admin dicek ulang
    import('./firebase.js').then((m) => m.watch((u) => {
      if (!u) { gstore.del('rs.session'); location.reload(); }
      else if (s.role === 'admin' && !isAdminMail(u.email)) { gstore.set('rs.session', { ...s, role: 'user' }); location.reload(); }
    }));
} else { document.body.classList.add('locked'); import('./auth.js').then((m) => m.initAuth()); }
setTimeout(() => $('splash').classList.add('off'), 1300);
