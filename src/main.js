/** main.js — gerbang masuk: belum login → tampilkan layar login; sudah login/tamu → jalankan aplikasi (app.js). */
import { $, session } from './util.js';
if (session()) import('./app.js');
else { document.body.classList.add('locked'); import('./auth.js').then((m) => m.initAuth()); }
setTimeout(() => $('splash').classList.add('off'), 1300);
