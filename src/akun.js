/** akun.js — halaman AKUN: ganti foto profil (PP), perbaiki nama, isi biodata (bio, tanggal lahir, jenis kelamin, kota).
 *  Data tersimpan per akun di perangkat ('rs.profile'). Mode online: ikut disinkronkan ke Firestore (koleksi "profiles", lihat firestore.rules)
 *  dan nama tampilan Firebase ikut diperbarui. Tamu boleh mengisi, tetapi hanya tersimpan di perangkat ini. */
import { $, store, gstore, session, toast, isAdmin, logout } from './util.js';
import { t, lang, hooks, LANGS } from './i18n.js';
import { ic } from './icons.js';
import { esc } from './prayers.js';
import { ONLINE } from './config.js';

/* ---------- teks antarmuka ---------- */
const U = {
  id: {
    'nav.ac': 'Akun', 'nav.gd': 'Panduan', 'ac.title': 'Akun Saya', 'ac.role.user': 'Pengguna', 'ac.role.guest': 'Tamu',
    'ac.photo': 'Ganti foto profil', 'ac.photo.del': 'Hapus foto', 'ac.photo.ok': 'Foto profil diperbarui.', 'ac.photo.gone': 'Foto profil dihapus.',
    'ac.bio.h': 'Biodata', 'ac.name': 'Nama lengkap', 'ac.bio': 'Bio singkat', 'ac.bio.ph': 'Ceritakan sedikit tentang dirimu', 'ac.birth': 'Tanggal lahir',
    'ac.gender': 'Jenis kelamin', 'ac.g.none': 'Tidak diisi', 'ac.g.m': 'Laki-laki', 'ac.g.f': 'Perempuan', 'ac.city': 'Kota / domisili', 'ac.city.ph': 'Contoh: Semarang',
    'ac.save': 'Simpan perubahan', 'ac.saved': 'Perubahan tersimpan.', 'ac.saved.local': 'Tersimpan di perangkat ini. Sinkron ke akun belum berhasil, coba lagi nanti.',
    'ac.e.name': 'Nama minimal 2 huruf.', 'ac.e.date': 'Tanggal lahir tidak valid.', 'ac.e.photo': 'Foto tidak bisa dibaca. Coba pilih gambar lain (JPG atau PNG).',
    'ac.guest.t': 'Kamu masuk sebagai tamu', 'ac.guest.d': 'Biodata hanya tersimpan di perangkat ini. Masuk atau daftar supaya datamu aman di akun.', 'ac.guest.btn': 'Masuk / Daftar',
    'ac.admin': 'Buka Panel Admin', 'ac.noname': 'Belum ada nama',
  },
  en: {
    'nav.ac': 'Account', 'nav.gd': 'Guide', 'ac.title': 'My Account', 'ac.role.user': 'User', 'ac.role.guest': 'Guest',
    'ac.photo': 'Change profile photo', 'ac.photo.del': 'Remove photo', 'ac.photo.ok': 'Profile photo updated.', 'ac.photo.gone': 'Profile photo removed.',
    'ac.bio.h': 'Profile', 'ac.name': 'Full name', 'ac.bio': 'Short bio', 'ac.bio.ph': 'Tell us a little about yourself', 'ac.birth': 'Date of birth',
    'ac.gender': 'Gender', 'ac.g.none': 'Not set', 'ac.g.m': 'Male', 'ac.g.f': 'Female', 'ac.city': 'City', 'ac.city.ph': 'e.g. Semarang',
    'ac.save': 'Save changes', 'ac.saved': 'Changes saved.', 'ac.saved.local': 'Saved on this device. Syncing to your account failed, please try again later.',
    'ac.e.name': 'Name must be at least 2 characters.', 'ac.e.date': 'Invalid date of birth.', 'ac.e.photo': 'This photo cannot be read. Please pick another image (JPG or PNG).',
    'ac.guest.t': 'You are signed in as a guest', 'ac.guest.d': 'Your profile is only stored on this device. Sign in or sign up to keep it safe in your account.', 'ac.guest.btn': 'Sign in / Sign up',
    'ac.admin': 'Open Admin Panel', 'ac.noname': 'No name yet',
  },
  ar: {
    'nav.ac': 'حسابي', 'nav.gd': 'الدليل', 'ac.title': 'حسابي', 'ac.role.user': 'مستخدم', 'ac.role.guest': 'ضيف',
    'ac.photo': 'تغيير صورة الملف الشخصي', 'ac.photo.del': 'حذف الصورة', 'ac.photo.ok': 'تم تحديث الصورة.', 'ac.photo.gone': 'تم حذف الصورة.',
    'ac.bio.h': 'البيانات الشخصية', 'ac.name': 'الاسم الكامل', 'ac.bio': 'نبذة قصيرة', 'ac.bio.ph': 'اكتب نبذة قصيرة عن نفسك', 'ac.birth': 'تاريخ الميلاد',
    'ac.gender': 'الجنس', 'ac.g.none': 'غير محدد', 'ac.g.m': 'ذكر', 'ac.g.f': 'أنثى', 'ac.city': 'المدينة', 'ac.city.ph': 'مثال: سمارانغ',
    'ac.save': 'حفظ التغييرات', 'ac.saved': 'تم حفظ التغييرات.', 'ac.saved.local': 'تم الحفظ على هذا الجهاز. تعذّرت المزامنة مع حسابك، حاول لاحقًا.',
    'ac.e.name': 'يجب ألا يقل الاسم عن حرفين.', 'ac.e.date': 'تاريخ الميلاد غير صالح.', 'ac.e.photo': 'تعذّرت قراءة الصورة. اختر صورة أخرى (JPG أو PNG).',
    'ac.guest.t': 'أنت داخل كضيف', 'ac.guest.d': 'تُحفظ بياناتك على هذا الجهاز فقط. سجّل الدخول أو أنشئ حسابًا لحفظها بأمان.', 'ac.guest.btn': 'دخول / حساب جديد',
    'ac.admin': 'فتح لوحة المشرف', 'ac.noname': 'لا يوجد اسم بعد',
  },
};
U.ms = {
  ...U.id, 'nav.ac': 'Akaun', 'ac.title': 'Akaun Saya', 'ac.role.user': 'Pengguna', 'ac.photo': 'Tukar gambar profil', 'ac.photo.del': 'Padam gambar', 'ac.photo.ok': 'Gambar profil dikemas kini.', 'ac.photo.gone': 'Gambar profil dipadam.',
  'ac.name': 'Nama penuh', 'ac.bio.ph': 'Ceritakan sedikit tentang diri anda', 'ac.g.m': 'Lelaki', 'ac.city': 'Bandar / kediaman', 'ac.save': 'Simpan perubahan', 'ac.saved': 'Perubahan disimpan.',
  'ac.saved.local': 'Disimpan pada peranti ini. Segerak ke akaun belum berjaya, cuba lagi nanti.', 'ac.e.name': 'Nama sekurang-kurangnya 2 huruf.', 'ac.e.date': 'Tarikh lahir tidak sah.',
  'ac.e.photo': 'Gambar tidak dapat dibaca. Cuba pilih gambar lain (JPG atau PNG).', 'ac.guest.t': 'Anda masuk sebagai tetamu', 'ac.guest.d': 'Biodata hanya disimpan pada peranti ini. Log masuk atau daftar supaya data anda selamat dalam akaun.',
  'ac.guest.btn': 'Log masuk / Daftar', 'ac.admin': 'Buka Panel Admin', 'ac.noname': 'Belum ada nama',
};
Object.entries(U).forEach(([l, o]) => Object.assign(LANGS[l][1], o));

/* ---------- data profil ---------- */
const BIO_MAX = 140, CITY_MAX = 60, PHOTO_PX = 256;
const prof = () => store.get('rs.profile', {}) || {};
const okPhoto = (s) => typeof s === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(s) && s.length < 180000;
const cleanName = (s) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, 60);
const initials = (n) => { const w = cleanName(n).split(' ').filter(Boolean); return (w.length ? [...w[0]][0] + (w[1] ? [...w[1]][0] : '') : '').toUpperCase(); };

/** Nama di profil jadi sumber nama tampilan (juga untuk akun admin lokal bawaan & tamu, yang namanya di-reset saat masuk). */
function applyName(n) { const s = session(); n = cleanName(n); if (s && n && n !== s.name) gstore.set('rs.session', { ...s, name: n }); }
{ const s = session(); if (s) applyName(prof().name); }

function renameLocalUser(n) { // mode lokal: nama ikut tersimpan di daftar akun supaya tidak kembali ke nama lama saat masuk lagi
  const s = session(); if (!s || s.id === 'guest' || ONLINE) return;
  const all = gstore.get('rs.users', {}); if (all[s.id]) { all[s.id].name = n; gstore.set('rs.users', all); }
}
const notify = () => window.dispatchEvent(new Event('rs:profile'));

async function pushCloud(p) { // true = berhasil / tidak perlu; false = gagal (data tetap aman di perangkat)
  const s = session(); if (!ONLINE || !s || s.id === 'guest') return true;
  try { await (await import('./firebase.js')).pushProfile(s.id, p); return true; } catch { return false; }
}

/** Foto dipotong persegi dari tengah, diperkecil, lalu dijadikan JPEG kecil (±10–20 KB) supaya ringan disimpan & disinkronkan. */
function shrink(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      try {
        const m = Math.min(img.naturalWidth, img.naturalHeight); if (!m) throw 0;
        const c = document.createElement('canvas'); c.width = c.height = PHOTO_PX;
        const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, PHOTO_PX, PHOTO_PX);
        g.drawImage(img, (img.naturalWidth - m) / 2, (img.naturalHeight - m) / 2, m, m, 0, 0, PHOTO_PX, PHOTO_PX);
        const out = c.toDataURL('image/jpeg', 0.82); okPhoto(out) ? res(out) : rej(new Error('size'));
      } catch (e) { rej(e); } finally { URL.revokeObjectURL(url); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('decode')); };
    img.src = url;
  });
}

/* ---------- tampilan ---------- */
const root = () => $('ac');
let email = '', pulled = false, busy = false;

function avatar(p, name) {
  const cam = `<button type="button" class="ac-cam" data-ac="pick" aria-label="${esc(t('ac.photo'))}">${ic('camera', 18)}</button>`;
  return `<div class="ac-av">${okPhoto(p.photo) ? `<img class="pp" src="${p.photo}" alt="">` : `<span class="ini" aria-hidden="true">${esc(initials(name)) || ic('user', 40)}</span>`}${cam}</div>`;
}
function render() {
  const el = root(); if (!el) return;
  const s = session() || {}, guest = s.id === 'guest', p = prof(), name = cleanName(s.name);
  const role = guest ? t('ac.role.guest') : isAdmin() ? t('au.r.admin') : t('ac.role.user');
  const mail = guest ? '' : email || (!ONLINE && /@/.test(s.id || '') ? s.id : '');
  const today = new Date().toISOString().slice(0, 10), g = p.gender || '';
  el.innerHTML = `<h2 class="ttl">${esc(t('ac.title'))}</h2>
<div class="card ac-hero">${avatar(p, name)}<div class="ac-id"><b>${esc(name || t('ac.noname'))}</b>${mail ? `<small>${esc(mail)}</small>` : ''}<span class="ac-role ${isAdmin() ? 'admin' : ''}">${esc(role)}</span>${p.bio ? `<p class="ac-bio">${esc(p.bio)}</p>` : ''}</div></div>
<input type="file" id="acFile" accept="image/*" hidden>
${okPhoto(p.photo) ? `<div class="ac-pact"><button type="button" class="pill del" data-ac="rmphoto">${esc(t('ac.photo.del'))}</button></div>` : ''}
${guest ? `<div class="card ac-guest"><b>${esc(t('ac.guest.t'))}</b><p>${esc(t('ac.guest.d'))}</p><button type="button" class="btn" data-ac="signin">${esc(t('ac.guest.btn'))}</button></div>` : ''}
<form class="card ac-form" id="acForm" novalidate><h3>${esc(t('ac.bio.h'))}</h3>
  <label class="fld plain"><span>${esc(t('ac.name'))}</span><div class="box"><input id="acName" type="text" maxlength="60" autocomplete="name" value="${esc(name)}"></div></label>
  <label class="fld plain"><span>${esc(t('ac.bio'))} <em id="acBioN" class="ac-n"></em></span><div class="box"><textarea id="acBio" rows="3" maxlength="${BIO_MAX}" placeholder="${esc(t('ac.bio.ph'))}">${esc(p.bio || '')}</textarea></div></label>
  <label class="fld plain"><span>${esc(t('ac.birth'))}</span><div class="box"><input id="acBirth" type="date" max="${today}" min="1900-01-01" value="${esc(p.birth || '')}"></div></label>
  <label class="fld plain"><span>${esc(t('ac.gender'))}</span><div class="box"><select id="acGender"><option value="">${esc(t('ac.g.none'))}</option><option value="m" ${g === 'm' ? 'selected' : ''}>${esc(t('ac.g.m'))}</option><option value="f" ${g === 'f' ? 'selected' : ''}>${esc(t('ac.g.f'))}</option></select></div></label>
  <label class="fld plain"><span>${esc(t('ac.city'))}</span><div class="box"><input id="acCity" type="text" maxlength="${CITY_MAX}" autocomplete="address-level2" placeholder="${esc(t('ac.city.ph'))}" value="${esc(p.city || '')}"></div></label>
  <p class="au-err" id="acErr" role="alert" hidden></p>
  <button class="btn" type="submit">${esc(t('ac.save'))}</button></form>
${isAdmin() ? `<button type="button" class="btn ghost ac-wide" data-go="adm">${esc(t('ac.admin'))}</button>` : ''}
<button type="button" class="btn ghost del ac-wide" data-ac="out">${ic('logout', 18)}<span>${esc(t(guest ? 'au.in' : 'au.out'))}</span></button>`;
  bioCount();
}
const bioCount = () => { const a = $('acBio'), n = $('acBioN'); if (a && n) n.textContent = `${[...a.value].length}/${BIO_MAX}`; };
const showErr = (k) => { const e = $('acErr'); if (!e) return; e.hidden = !k; if (k) e.textContent = t(k); };

async function savePhoto(file) {
  if (busy || !file) return; busy = true;
  try {
    const photo = await shrink(file), p = { ...prof(), name: cleanName(session()?.name), photo, at: Date.now() };
    store.set('rs.profile', p); render(); notify();
    toast(t((await pushCloud(p)) ? 'ac.photo.ok' : 'ac.saved.local'), true);
  } catch { toast(t('ac.e.photo')); } finally { busy = false; const f = $('acFile'); if (f) f.value = ''; }
}
async function removePhoto() {
  const p = { ...prof(), photo: '', at: Date.now() }; store.set('rs.profile', p); render(); notify();
  toast(t((await pushCloud(p)) ? 'ac.photo.gone' : 'ac.saved.local'), true);
}
async function saveForm(ev) {
  ev.preventDefault(); showErr();
  const name = cleanName($('acName').value), birth = $('acBirth').value, today = new Date().toISOString().slice(0, 10);
  if ([...name].length < 2) return showErr('ac.e.name');
  if (birth && (birth > today || birth < '1900-01-01' || Number.isNaN(Date.parse(birth)))) return showErr('ac.e.date');
  const p = { ...prof(), name, bio: [...$('acBio').value.trim()].slice(0, BIO_MAX).join(''), birth, gender: ['m', 'f'].includes($('acGender').value) ? $('acGender').value : '', city: $('acCity').value.trim().replace(/\s+/g, ' ').slice(0, CITY_MAX), at: Date.now() };
  store.set('rs.profile', p); applyName(name); renameLocalUser(name); render(); notify();
  const ok = await pushCloud(p); toast(t(ok ? 'ac.saved' : 'ac.saved.local'), true);
}

/** Mode online: ambil email dari Firebase, dan ambil profil dari server sekali per sesi (mis. dari HP lain) bila lebih baru daripada yang di perangkat ini. */
function loadCloud() {
  const s = session(); if (pulled || !ONLINE || !s || s.id === 'guest') return; pulled = true;
  import('./firebase.js').then((m) => {
    m.watch((u) => { if (u?.email && u.email.toLowerCase() !== email) { email = u.email.toLowerCase(); if (root()?.classList.contains('on') && !busy) render(); } });
    return m.pullProfile(s.id);
  }).then((c) => {
    if (!c || (c.at || 0) <= (prof().at || 0)) return;
    store.set('rs.profile', { name: cleanName(c.name), bio: c.bio || '', birth: c.birth || '', gender: c.gender || '', city: c.city || '', photo: okPhoto(c.photo) ? c.photo : '', at: c.at });
    applyName(c.name); notify(); if (root()?.classList.contains('on')) render();
  }).catch(() => {});
}

root().addEventListener('click', (e) => {
  const b = e.target.closest('[data-ac]'); if (!b) return;
  const a = b.dataset.ac;
  if (a === 'pick') $('acFile').click();
  else if (a === 'rmphoto') removePhoto();
  else if (a === 'signin') logout();
  else if (a === 'out') { if (session()?.id === 'guest' || confirm(t('au.outq'))) logout(); }
});
root().addEventListener('change', (e) => { if (e.target.id === 'acFile') savePhoto(e.target.files?.[0]); });
root().addEventListener('input', (e) => { if (e.target.id === 'acBio') bioCount(); });
root().addEventListener('submit', (e) => { if (e.target.id === 'acForm') saveForm(e); });
hooks.push(() => { if (root().classList.contains('on')) render(); });

export function enter() { render(); loadCloud(); }
