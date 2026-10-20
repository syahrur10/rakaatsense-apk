/** alarm.js — ALARM SHALAT. Wajib (5 waktu): ikut jadwal shalat harian, pilihan tepat waktu / 5-10-15-30 menit sebelum. Sunnah: Tahajud, Dhuha, Witir + alarm buatan sendiri (nama & jam diketik).
 *  Dua lapis: (1) di dalam aplikasi: layar alarm + bunyi + getar saat aplikasi terbuka; (2) di APK (Capacitor): dijadwalkan lewat @capacitor/local-notifications
 *  sehingga tetap berbunyi walau aplikasi ditutup (7 hari ke depan, dijadwal ulang tiap aplikasi dibuka / jadwal berubah). Logika hitungan ada di alarmcalc.js. */
import { $, store, dayKey, toast } from './util.js';
import { t, hooks, LANGS } from './i18n.js';
import { ic } from './icons.js';
import { esc, nameOf } from './prayers.js';
import { WAJIB, OFFSETS, MAXS, ALL_DAYS, norm, flat, fireTime, upcoming, parse, hhmm, cleanName } from './alarmcalc.js';

/* ---------- teks 4 bahasa ---------- */
const D = {
  id: {
    'f.al.t': 'Alarm Shalat', 'f.al.d': 'Pengingat shalat wajib, Tahajud, Dhuha, dan sunnah buatan sendiri.',
    'al.title': 'Alarm Shalat', 'al.fard': 'Shalat Wajib', 'al.sunnah': 'Shalat Sunnah', 'al.add': '+ Alarm sunnah baru',
    'al.adzan': 'Waktu shalat {p}', 'al.opt': 'Berbunyi', 'al.ontime': 'Tepat waktu', 'al.before': '{n} menit sebelum', 'al.waiting': 'Menunggu jadwal shalat…',
    'al.sound': 'Bunyi alarm', 'al.snd': 'Suara + getar', 'al.vib': 'Getar saja', 'al.test': 'Coba alarm sekarang',
    'al.p.ok': 'Notifikasi aktif.', 'al.p.no': 'Izin notifikasi ditolak. Aktifkan lewat pengaturan HP agar alarm muncul.', 'al.p.ask': 'Izin notifikasi diminta saat alarm pertama dinyalakan.',
    'al.web': 'Di browser, alarm hanya berbunyi saat aplikasi terbuka. Pasang APK agar tetap berbunyi walau aplikasi ditutup.', 'al.native': 'Alarm dijadwalkan di HP dan tetap berbunyi walau aplikasi ditutup.',
    'al.stop': 'Matikan', 'al.snooze': 'Tunda 5 menit', 'al.ring': 'Waktunya {n}', 'al.ring.b': 'Saatnya {n} ({t})', 'al.ring.t': 'Tes alarm',
    'al.name': 'Nama alarm', 'al.ph': 'mis. Istikharah, Hajat', 'al.time': 'Jam', 'al.days': 'Hari', 'al.save': 'Simpan', 'al.cancel': 'Batal', 'al.del': 'Hapus', 'al.edit': 'Ubah',
    'al.delq': 'Hapus alarm "{n}"?', 'al.edit.t': 'Ubah alarm', 'al.new.t': 'Alarm sunnah baru',
    'al.e.name': 'Isi nama alarm.', 'al.e.time': 'Isi jam alarm.', 'al.e.days': 'Pilih minimal satu hari.', 'al.e.max': 'Maksimal {n} alarm buatan sendiri.', 'al.e.dup': 'Nama itu sudah dipakai.',
    'al.daily': 'Setiap hari', 'al.next': 'Alarm berikutnya: {n}, {t}', 'al.none': 'Belum ada alarm yang menyala.', 'al.snoozed': 'Ditunda 5 menit.', 'al.today': 'hari ini', 'al.tmr': 'besok',
    'al.d0': 'Min', 'al.d1': 'Sen', 'al.d2': 'Sel', 'al.d3': 'Rab', 'al.d4': 'Kam', 'al.d5': 'Jum', 'al.d6': 'Sab',
  },
  en: {
    'f.al.t': 'Prayer Alarm', 'f.al.d': 'Reminders for the five prayers, Tahajjud, Duha and your own sunnah prayers.',
    'al.title': 'Prayer Alarm', 'al.fard': 'Obligatory Prayers', 'al.sunnah': 'Sunnah Prayers', 'al.add': '+ New sunnah alarm',
    'al.adzan': 'Prayer time {p}', 'al.opt': 'Rings', 'al.ontime': 'On time', 'al.before': '{n} min before', 'al.waiting': 'Waiting for prayer times…',
    'al.sound': 'Alarm sound', 'al.snd': 'Sound + vibration', 'al.vib': 'Vibration only', 'al.test': 'Test alarm now',
    'al.p.ok': 'Notifications enabled.', 'al.p.no': 'Notification permission denied. Enable it in phone settings so alarms can appear.', 'al.p.ask': 'Notification permission is requested when you turn on the first alarm.',
    'al.web': 'In a browser, alarms only ring while the app is open. Install the APK so they ring even when the app is closed.', 'al.native': 'Alarms are scheduled on your phone and ring even when the app is closed.',
    'al.stop': 'Stop', 'al.snooze': 'Snooze 5 min', 'al.ring': 'Time for {n}', 'al.ring.b': 'It is time for {n} ({t})', 'al.ring.t': 'Alarm test',
    'al.name': 'Alarm name', 'al.ph': 'e.g. Istikhara, Hajat', 'al.time': 'Time', 'al.days': 'Days', 'al.save': 'Save', 'al.cancel': 'Cancel', 'al.del': 'Delete', 'al.edit': 'Edit',
    'al.delq': 'Delete alarm "{n}"?', 'al.edit.t': 'Edit alarm', 'al.new.t': 'New sunnah alarm',
    'al.e.name': 'Enter an alarm name.', 'al.e.time': 'Enter the alarm time.', 'al.e.days': 'Pick at least one day.', 'al.e.max': 'Up to {n} custom alarms.', 'al.e.dup': 'That name is already used.',
    'al.daily': 'Every day', 'al.next': 'Next alarm: {n}, {t}', 'al.none': 'No alarm is turned on.', 'al.snoozed': 'Snoozed for 5 minutes.', 'al.today': 'today', 'al.tmr': 'tomorrow',
    'al.d0': 'Sun', 'al.d1': 'Mon', 'al.d2': 'Tue', 'al.d3': 'Wed', 'al.d4': 'Thu', 'al.d5': 'Fri', 'al.d6': 'Sat',
  },
  ar: {
    'f.al.t': 'منبّه الصلاة', 'f.al.d': 'تذكير بالصلوات الخمس والتهجد والضحى وصلواتك النافلة.',
    'al.title': 'منبّه الصلاة', 'al.fard': 'الصلوات المفروضة', 'al.sunnah': 'صلوات السنة', 'al.add': '+ منبّه سنة جديد',
    'al.adzan': 'وقت الصلاة {p}', 'al.opt': 'يرنّ', 'al.ontime': 'في الوقت', 'al.before': 'قبل {n} دقائق', 'al.waiting': 'بانتظار مواقيت الصلاة…',
    'al.sound': 'صوت المنبّه', 'al.snd': 'صوت + اهتزاز', 'al.vib': 'اهتزاز فقط', 'al.test': 'جرّب المنبّه الآن',
    'al.p.ok': 'الإشعارات مفعّلة.', 'al.p.no': 'تم رفض إذن الإشعارات. فعّله من إعدادات الهاتف.', 'al.p.ask': 'يُطلب إذن الإشعارات عند تشغيل أول منبّه.',
    'al.web': 'في المتصفح يرنّ المنبّه فقط أثناء فتح التطبيق. ثبّت تطبيق APK ليرنّ حتى عند إغلاقه.', 'al.native': 'تُجدول المنبّهات على الهاتف وترنّ حتى عند إغلاق التطبيق.',
    'al.stop': 'إيقاف', 'al.snooze': 'غفوة 5 دقائق', 'al.ring': 'حان وقت {n}', 'al.ring.b': 'حان وقت {n} ({t})', 'al.ring.t': 'تجربة المنبّه',
    'al.name': 'اسم المنبّه', 'al.ph': 'مثال: الاستخارة، الحاجة', 'al.time': 'الوقت', 'al.days': 'الأيام', 'al.save': 'حفظ', 'al.cancel': 'إلغاء', 'al.del': 'حذف', 'al.edit': 'تعديل',
    'al.delq': 'حذف المنبّه "{n}"؟', 'al.edit.t': 'تعديل المنبّه', 'al.new.t': 'منبّه سنة جديد',
    'al.e.name': 'أدخل اسم المنبّه.', 'al.e.time': 'أدخل وقت المنبّه.', 'al.e.days': 'اختر يومًا واحدًا على الأقل.', 'al.e.max': 'حتى {n} منبّهات مخصصة.', 'al.e.dup': 'هذا الاسم مستخدم.',
    'al.daily': 'كل يوم', 'al.next': 'المنبّه التالي: {n}، {t}', 'al.none': 'لا يوجد منبّه مفعّل.', 'al.snoozed': 'تم التأجيل 5 دقائق.', 'al.today': 'اليوم', 'al.tmr': 'غدًا',
    'al.d0': 'الأحد', 'al.d1': 'الاثنين', 'al.d2': 'الثلاثاء', 'al.d3': 'الأربعاء', 'al.d4': 'الخميس', 'al.d5': 'الجمعة', 'al.d6': 'السبت',
  },
  ms: {
    'f.al.t': 'Penggera Solat', 'f.al.d': 'Peringatan solat fardu, Tahajud, Dhuha dan solat sunat buatan sendiri.',
    'al.title': 'Penggera Solat', 'al.fard': 'Solat Fardu', 'al.sunnah': 'Solat Sunat', 'al.add': '+ Penggera sunat baharu',
    'al.adzan': 'Waktu solat {p}', 'al.opt': 'Berbunyi', 'al.ontime': 'Tepat waktu', 'al.before': '{n} minit sebelum', 'al.waiting': 'Menunggu jadual solat…',
    'al.sound': 'Bunyi penggera', 'al.snd': 'Bunyi + getar', 'al.vib': 'Getar sahaja', 'al.test': 'Cuba penggera sekarang',
    'al.p.ok': 'Pemberitahuan aktif.', 'al.p.no': 'Kebenaran pemberitahuan ditolak. Aktifkan di tetapan telefon supaya penggera muncul.', 'al.p.ask': 'Kebenaran pemberitahuan diminta apabila penggera pertama dihidupkan.',
    'al.web': 'Dalam pelayar, penggera hanya berbunyi semasa aplikasi dibuka. Pasang APK supaya terus berbunyi walaupun aplikasi ditutup.', 'al.native': 'Penggera dijadualkan pada telefon dan terus berbunyi walaupun aplikasi ditutup.',
    'al.stop': 'Matikan', 'al.snooze': 'Tunda 5 minit', 'al.ring': 'Masanya {n}', 'al.ring.b': 'Tiba masa {n} ({t})', 'al.ring.t': 'Ujian penggera',
    'al.name': 'Nama penggera', 'al.ph': 'cth. Istikharah, Hajat', 'al.time': 'Jam', 'al.days': 'Hari', 'al.save': 'Simpan', 'al.cancel': 'Batal', 'al.del': 'Padam', 'al.edit': 'Ubah',
    'al.delq': 'Padam penggera "{n}"?', 'al.edit.t': 'Ubah penggera', 'al.new.t': 'Penggera sunat baharu',
    'al.e.name': 'Isi nama penggera.', 'al.e.time': 'Isi jam penggera.', 'al.e.days': 'Pilih sekurang-kurangnya satu hari.', 'al.e.max': 'Maksimum {n} penggera buatan sendiri.', 'al.e.dup': 'Nama itu sudah digunakan.',
    'al.daily': 'Setiap hari', 'al.next': 'Penggera seterusnya: {n}, {t}', 'al.none': 'Tiada penggera dihidupkan.', 'al.snoozed': 'Ditunda 5 minit.', 'al.today': 'hari ini', 'al.tmr': 'esok',
    'al.d0': 'Ahd', 'al.d1': 'Isn', 'al.d2': 'Sel', 'al.d3': 'Rab', 'al.d4': 'Kha', 'al.d5': 'Jum', 'al.d6': 'Sab',
  },
};
Object.entries(D).forEach(([l, o]) => Object.assign(LANGS[l][1], o));

/* ---------- data ---------- */
let cfg = norm(store.get('rs.al', null)), sched = store.get('rs.al.t', {}) || {}, edit = null; // edit = id alarm sunnah yang sedang diubah, 'new' = baru
const IC = { subuh: 'sunrise', dzuhur: 'sun', ashar: 'afternoon', maghrib: 'sunset', isya: 'moon', tahajud: 'moon', dhuha: 'sun', witir: 'moon' };
const label = (a) => (a.kind === 'w' || a.preset ? nameOf(a.id) : a.name);
const find = (key) => flat(cfg).find((a) => a.key === key);
const save = () => { store.set('rs.al', cfg); render(); syncNative(); };

/** dipanggil app.js setiap jadwal shalat hari ini selesai dimuat: { subuh: Date, ... } */
export function setTimes(tm) {
  const s = {}; WAJIB.forEach((id) => { if (tm?.[id]) s[id] = hhmm(tm[id]); });
  if (!Object.keys(s).length) return; sched = s; store.set('rs.al.t', s); render(); syncNative();
}

/* ---------- izin & platform ---------- */
const NL = () => window.Capacitor?.Plugins?.LocalNotifications || null;
const native = () => !!(window.Capacitor?.isNativePlatform?.() && NL());
let perm = 'default';
async function readPerm() {
  try { if (native()) perm = (await NL().checkPermissions()).display === 'granted' ? 'granted' : perm === 'denied' ? 'denied' : 'default'; else if ('Notification' in window) perm = Notification.permission; } catch {}
}
async function ensurePerm() {
  try {
    if (native()) { const r = await NL().requestPermissions(); perm = r.display === 'granted' ? 'granted' : 'denied'; }
    else if ('Notification' in window) perm = await Notification.requestPermission();
  } catch {}
  render();
}

/* ---------- bunyi & layar alarm ---------- */
let ac = null, ringTm = 0, ringEl = null, vibTm = 0;
function chime() {
  try {
    ac ||= new AudioContext(); if (ac.state === 'suspended') ac.resume();
    [[660, 0], [880, 0.22], [990, 0.44], [880, 0.9], [990, 1.12], [1320, 1.34]].forEach(([f, at]) => {
      const s = ac.currentTime + at, o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, s); g.gain.linearRampToValueAtTime(0.22, s + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, s + 0.5);
      o.connect(g); g.connect(ac.destination); o.start(s); o.stop(s + 0.55);
    });
  } catch {}
}
function stopRing() {
  clearInterval(ringTm); clearInterval(vibTm); ringTm = vibTm = 0; navigator.vibrate?.(0);
  ringEl?.remove(); ringEl = null;
}
let snoozes = []; // [{ at: ms, title, body }]
function ring(title, body, snoozeable = true) {
  stopRing();
  const el = document.createElement('div'); el.className = 'al-ring'; el.setAttribute('role', 'alertdialog'); el.setAttribute('aria-modal', 'true');
  el.innerHTML = `<div class="al-ring-in"><span class="al-ring-ic">${ic('bell', 46)}</span><h2>${esc(title)}</h2><p>${esc(body)}</p>`
    + `<button class="btn" data-r="stop">${esc(t('al.stop'))}</button>${snoozeable ? `<button class="btn ghost" data-r="snz">${esc(t('al.snooze'))}</button>` : ''}</div>`;
  el.onclick = (e) => {
    const b = e.target.closest('[data-r]'); if (!b) return;
    if (b.dataset.r === 'snz') { snoozes.push({ at: Date.now() + 5 * 60000, title, body }); nativeSnooze(title, body); toast(t('al.snoozed'), true); }
    stopRing();
  };
  document.body.append(el); ringEl = el;
  const go = () => { chime(); }, vib = () => navigator.vibrate?.([400, 200, 400, 200, 400]);
  if (cfg.snd === 'snd') { go(); ringTm = setInterval(go, 3000); }
  vib(); vibTm = setInterval(vib, 3000);
  setTimeout(() => { if (ringEl === el) stopRing(); }, 2 * 60000); // berhenti sendiri setelah 2 menit
  if (!native() && perm === 'granted') { try { new Notification(title, { body, tag: 'rs-alarm', requireInteraction: true }); } catch {} }
}

/* ---------- pemeriksa waktu (aplikasi terbuka) ---------- */
const fired = new Set();
function tick() {
  const now = new Date(), nowMs = +now;
  flat(cfg).filter((a) => a.on).forEach((a) => {
    const at = fireTime(a, now, sched); if (!at) return;
    const id = dayKey(now) + a.key + hhmm(at);
    if (nowMs >= +at && nowMs - +at < 90000 && !fired.has(id)) { fired.add(id); ring(t('al.ring', { n: label(a) }), t('al.ring.b', { n: label(a), t: hhmm(at) })); }
  });
  snoozes = snoozes.filter((s) => { if (Date.now() < s.at) return true; ring(s.title, s.body); return false; });
}
setInterval(tick, 1000); document.addEventListener('visibilitychange', () => { if (!document.hidden) { tick(); readPerm().then(render); syncNative(); } });

/* ---------- penjadwalan native (APK, tetap berbunyi saat aplikasi ditutup) ---------- */
const CH = 'alarm-solat', SNZ_ID = 99999;
let syncT = 0, chMade = false;
function syncNative() {
  if (!native()) return; clearTimeout(syncT);
  syncT = setTimeout(async () => {
    const P = NL();
    try {
      if (!chMade) { await P.createChannel?.({ id: CH, name: t('al.title'), description: t('al.title'), importance: 5, visibility: 1, vibration: true }); chMade = true; }
      const pend = (await P.getPending()).notifications || []; if (pend.length) await P.cancel({ notifications: pend.map((n) => ({ id: n.id })) });
      if ((await P.checkPermissions()).display !== 'granted') return;
      const list = flat(cfg), notifications = [];
      upcoming(cfg, sched, new Date(), 7).forEach(({ a, at, day }) => {
        const idx = list.findIndex((x) => x.key === a.key), nm = label(a);
        notifications.push({ id: 100000 + day * 1000 + idx, title: t('al.ring', { n: nm }), body: t('al.ring.b', { n: nm, t: hhmm(at) }), channelId: CH, schedule: { at, allowWhileIdle: true }, extra: { key: a.key } });
      });
      if (notifications.length) await P.schedule({ notifications });
    } catch (e) { console.warn('alarm native', e); }
  }, 600);
}
async function nativeSnooze(title, body) {
  if (!native()) return;
  try { await NL().schedule({ notifications: [{ id: SNZ_ID, title, body, channelId: CH, schedule: { at: new Date(Date.now() + 5 * 60000), allowWhileIdle: true } }] }); } catch {}
}

/* ---------- tampilan ---------- */
const daysTxt = (d) => (d.length === 7 ? t('al.daily') : d.map((x) => t('al.d' + x)).join(', '));
function row(a) {
  const nm = label(a), icon = IC[a.id] || 'bell'; let big, sub, opt;
  if (a.kind === 'w') {
    const at = fireTime(a, new Date(), sched); big = at ? hhmm(at) : '--:--'; sub = sched[a.id] ? t('al.adzan', { p: sched[a.id] }) : t('al.waiting');
    opt = `<label class="al-opt"><span>${esc(t('al.opt'))}</span><select data-act="off" aria-label="${esc(nm)}">${OFFSETS.map((o) => `<option value="${o}" ${o === a.off ? 'selected' : ''}>${esc(o ? t('al.before', { n: o }) : t('al.ontime'))}</option>`).join('')}</select></label>`;
  } else {
    big = a.time; sub = daysTxt(a.days); opt = `<button type="button" class="pill al-edit" data-act="edit">${esc(t('al.edit'))}</button>`;
  }
  return `<div class="al-row ${a.on ? 'on' : ''}" data-k="${esc(a.key)}"><div class="al-top"><span class="al-ico ${a.kind === 'w' ? '' : 'x'}">${ic(icon, 22)}</span>`
    + `<div class="al-main"><b>${esc(nm)}</b><small>${esc(sub)}</small></div><span class="al-time">${big}</span>`
    + `<label class="al-sw"><input type="checkbox" data-act="tog" ${a.on ? 'checked' : ''} aria-label="${esc(nm)}"><i></i></label></div><div class="al-bot">${opt}</div></div>`;
}
function render() {
  const el = $('al'); if (!el) return;
  const all = flat(cfg), nx = upcoming(cfg, sched)[0];
  const info = native() ? t('al.native') : t('al.web'), pt = perm === 'granted' ? t('al.p.ok') : perm === 'denied' ? t('al.p.no') : t('al.p.ask');
  const nxTxt = nx ? t('al.next', { n: label(nx.a), t: `${nx.day === 0 ? t('al.today') : nx.day === 1 ? t('al.tmr') : t('al.d' + nx.at.getDay())} ${hhmm(nx.at)}` }) : t('al.none');
  el.innerHTML = `<h2 class="ttl">${esc(t('al.title'))}</h2>`
    + `<div class="card al-sum"><span class="al-ico big">${ic('bell', 26)}</span><div><b>${esc(nxTxt)}</b><small class="${perm === 'denied' ? 'bad' : ''}">${esc(pt)}</small><small>${esc(info)}</small></div></div>`
    + `<h3 class="rp-sec">${esc(t('al.fard'))}</h3><div class="al-list">${all.filter((a) => a.kind === 'w').map(row).join('')}</div>`
    + `<h3 class="rp-sec">${esc(t('al.sunnah'))}</h3><div class="al-list">${all.filter((a) => a.kind === 's').map(row).join('')}</div>`
    + `<button type="button" class="pill add al-add" data-act="add">${esc(t('al.add'))}</button>`
    + `<h3 class="rp-sec">${esc(t('al.sound'))}</h3><div class="seg" id="alSnd"><button type="button" data-snd="snd" class="${cfg.snd === 'snd' ? 'on' : ''}">${esc(t('al.snd'))}</button><button type="button" data-snd="vib" class="${cfg.snd === 'vib' ? 'on' : ''}">${esc(t('al.vib'))}</button></div>`
    + `<button type="button" class="btn ghost al-test" data-act="test">${esc(t('al.test'))}</button>`;
}

/* ---------- lembar tambah / ubah alarm sunnah ---------- */
const sheet = document.createElement('div'); sheet.className = 'sheet'; sheet.id = 'alSheet'; sheet.hidden = true;
sheet.innerHTML = `<form class="sheet-card" id="alForm" novalidate role="dialog" aria-modal="true"><h3 id="alT"></h3>`
  + `<label class="fld plain" id="alNameBox"><span id="alNameL"></span><div class="box"><input id="alName" type="text" maxlength="30" autocomplete="off"></div></label>`
  + `<label class="fld plain"><span id="alTimeL"></span><div class="box"><input id="alTime" type="time" required></div></label>`
  + `<span class="glbl" id="alDaysL"></span><div class="pills wrap al-days" id="alDays"></div>`
  + `<p class="au-err" id="alErr" role="alert" hidden></p>`
  + `<div class="row"><button type="button" class="btn ghost" id="alCancel"></button><button type="submit" class="btn" id="alSave"></button></div>`
  + `<button type="button" class="pill del al-del" id="alDel" hidden></button></form>`;
document.body.append(sheet);
let sel = [];
const hide = () => { sheet.hidden = true; edit = null; };
function paintDays() { $('alDays').innerHTML = ALL_DAYS.map((d) => `<button type="button" class="pill ${sel.includes(d) ? 'on' : ''}" data-d="${d}">${esc(t('al.d' + d))}</button>`).join(''); }
function openSheet(id) {
  edit = id; const a = id === 'new' ? null : cfg.s.find((x) => x.id === id), custom = !a?.preset;
  $('alT').textContent = t(a ? 'al.edit.t' : 'al.new.t'); $('alNameL').textContent = t('al.name'); $('alName').placeholder = t('al.ph'); $('alTimeL').textContent = t('al.time'); $('alDaysL').textContent = t('al.days');
  $('alCancel').textContent = t('al.cancel'); $('alSave').textContent = t('al.save'); $('alDel').textContent = t('al.del');
  $('alNameBox').hidden = !custom; $('alName').value = a?.name || ''; $('alTime').value = a?.time || '04:00'; sel = [...(a?.days || ALL_DAYS)]; paintDays();
  $('alDel').hidden = !a || !!a.preset; $('alErr').hidden = true; sheet.hidden = false; if (custom && !a) setTimeout(() => $('alName').focus(), 60);
}
sheet.addEventListener('pointerdown', (e) => { if (e.target === sheet) hide(); });
$('alCancel').onclick = hide;
$('alDays').onclick = (e) => { const b = e.target.closest('[data-d]'); if (!b) return; const d = +b.dataset.d; sel = sel.includes(d) ? sel.filter((x) => x !== d) : [...sel, d].sort(); paintDays(); };
$('alDel').onclick = () => { const a = cfg.s.find((x) => x.id === edit); if (a && confirm(t('al.delq', { n: a.name }))) { cfg.s = cfg.s.filter((x) => x.id !== edit); hide(); save(); } };
$('alForm').onsubmit = (e) => {
  e.preventDefault(); const a = cfg.s.find((x) => x.id === edit), custom = !a?.preset, nm = cleanName($('alName').value), tm = $('alTime').value;
  const err = (k, v) => { $('alErr').textContent = t('al.e.' + k, v); $('alErr').hidden = false; };
  if (custom && !nm) return err('name'); if (!parse(tm)) return err('time'); if (!sel.length) return err('days');
  if (custom && cfg.s.some((x) => x.id !== edit && nameOf(x.id, x.name).toLowerCase() === nm.toLowerCase())) return err('dup');
  if (!a && cfg.s.filter((x) => !x.preset).length >= MAXS) return err('max', { n: MAXS });
  if (a) { a.time = tm; a.days = [...sel]; if (custom) a.name = nm; }
  else cfg.s.push({ id: 'a_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name: nm, time: tm, days: [...sel], on: true });
  const turnedOn = !a; hide(); save(); if (turnedOn) ensurePerm().then(syncNative);
};

/* ---------- aksi di halaman ---------- */
$('al').addEventListener('change', async (e) => {
  const r = e.target.closest('[data-k]'); if (!r) return; const a = find(r.dataset.k); if (!a) return;
  if (e.target.dataset.act === 'tog') {
    const on = e.target.checked; if (a.kind === 'w') cfg.w[a.id].on = on; else cfg.s.find((x) => x.id === a.id).on = on;
    save(); if (on && perm !== 'granted') { await ensurePerm(); syncNative(); }
  } else if (e.target.dataset.act === 'off' && a.kind === 'w') { cfg.w[a.id].off = +e.target.value; save(); }
});
$('al').addEventListener('click', (e) => {
  const s = e.target.closest('[data-snd]'); if (s) { cfg.snd = s.dataset.snd === 'vib' ? 'vib' : 'snd'; save(); return; }
  const b = e.target.closest('[data-act]'); if (!b) return;
  if (b.dataset.act === 'add') openSheet('new');
  else if (b.dataset.act === 'edit') openSheet(find(b.closest('[data-k]').dataset.k).id);
  else if (b.dataset.act === 'test') { ensurePerm(); ring(t('al.ring.t'), t('al.ring.b', { n: t('al.title'), t: hhmm(new Date()) }), false); }
});
hooks.push(() => { render(); if (!sheet.hidden) openSheet(edit); syncNative(); });
readPerm().then(() => { render(); syncNative(); });
render();
