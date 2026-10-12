/** i18n.js — Indonesia, English, Arab (RTL), Melayu. t('kunci', {n:1}). Tambah bahasa baru = tambah satu objek. */
const ID = {
  hello: "Assalamu'alaikum!", 'ban.s': 'Ingat Allah', 'ban.h': 'Mulai Dzikir\nHari Ini', 'ban.b': 'Mulai sekarang',
  'm.rk': 'Rakaat', 'm.dz': 'Dzikir', 'm.cam': 'Koreksi AI', 'm.qb': 'Kiblat', 'nav.home': 'Beranda', 'nav.cam': 'Koreksi',
  bell: 'Aktifkan notifikasi', 'n.on': 'Notifikasi aktif', 'n.off': 'Notifikasi tidak diizinkan',
  'tm.title': 'Jadwal Shalat', 'tm.load': 'Memuat lokasi…', 'tm.left': 'lagi', 'tm.fail': 'Gagal memuat jadwal. Periksa internet.', 'tm.me': 'Lokasimu', 'tm.find': 'Mencari nama lokasi…', 'tm.noname': 'Lokasi terdeteksi (nama belum tersedia)', 'tm.tap': 'Ketuk untuk memperbarui lokasi', 'tm.def': 'Jakarta (izinkan lokasi agar akurat)', 'tm.now': 'Waktu shalat {n} telah tiba',
  's.streak': 'hari beruntun', 's.dz': 'dzikir hari ini', 's.pr': 'shalat hari ini', mark: 'tandai sudah shalat',
  'p.subuh': 'Subuh', 'p.dzuhur': 'Dzuhur', 'p.ashar': 'Ashar', 'p.maghrib': 'Maghrib', 'p.isya': 'Isya',
  'rk.title': 'Penghitung Rakaat', 'rk.shirt': 'Saku Baju', 'rk.pants': 'Saku Celana', 'rk.ruku': 'Rukuk', 'rk.sujud': 'Sujud', 'rk.rakaat': 'Rakaat', 'rk.tilt': 'Kemiringan HP',
  'rk.start': 'Kalibrasi & mulai', 'rk.stop': 'Berhenti', 'rk.intro': 'Berdiri tegak 3 detik untuk kalibrasi, lalu mulai shalat.', 'rk.hint': 'Saku Baju membaca gerak badan, Saku Celana membaca gerak paha. Berdiri tegak saat kalibrasi.',
  'rk.cal': 'Kalibrasi… berdiri tegak ({n})', 'rk.ready': 'Siap. Silakan mulai shalat', 'rk.done': 'Alhamdulillah, {n} rakaat selesai. Lanjut dzikir?', 'rk.over': 'Rakaat melebihi {n}. Mungkin salah hitung, koreksi dengan tombol −1.', 'rk.err': 'Sensor gerak tidak tersedia atau izin ditolak. Gunakan HP dan buka lewat HTTPS.',
  'ph.new': 'Siap rakaat baru', 'ph.ruku': 'Rukuk terdeteksi', 'ph.sujud1': 'Sujud ke-1 terdeteksi', 'ph.down': 'Sujud / duduk…', 'ph.stand': 'Berdiri',
  'dz.title': 'Penghitung Dzikir', 'dz.sum': 'Ringkasan Dzikir', 'dz.set': 'Set', 'dz.tgt': 'Target', 'dz.pack': 'Paket dzikir setelah shalat', 'dz.packOn': 'Paket dzikir dimulai: 4 tahap', 'dz.next': 'Lanjut: {n} {c}x', 'dz.packDone': 'Alhamdulillah, paket dzikir selesai',
  'dz.day': 'Hari', 'dz.week': 'Minggu', 'dz.month': 'Bulan', 'dz.year': 'Tahun', 'dz.total': 'total', 'dz.today': 'hari ini', 'dz.empty': 'Belum ada data pada rentang ini.', 'dz.back': 'Kembali', 'dz.tap': 'Tambah hitungan', 'dz.reset': 'Reset', 'dz.undo': 'Kurangi satu',
  'dz.sub': 'Subhanallah', 'dz.alh': 'Alhamdulillah', 'dz.akb': 'Allahu Akbar', 'dz.ist': 'Astaghfirullah', 'dz.tah': 'Tahlil', 'dz.sal': 'Salawat',
  'dm.sub': 'Maha Suci Allah', 'dm.alh': 'Segala puji bagi Allah', 'dm.akb': 'Allah Maha Besar', 'dm.ist': 'Aku mohon ampun kepada Allah', 'dm.tah': 'Tiada tuhan selain Allah', 'dm.sal': 'Salawat kepada Nabi Muhammad ﷺ',
  'cam.title': 'Koreksi Gerakan', 'cam.hint': 'Letakkan HP ±2 meter di samping badan (tampak samping, seluruh badan terlihat).', 'cam.ready': 'Siap', 'cam.score': 'skor gerakan', 'cam.fix': 'koreksi', 'cam.start': 'Mulai kamera', 'cam.load': 'Memuat AI…',
  'cam.note': 'Bantuan awal berbasis sudut sendi, bukan pengganti guru/ustadz.', 'cam.err': 'Kamera tidak bisa dibuka. Izinkan akses kamera.', 'cam.warn': 'Subhanallah, {m}. Perbaiki gerakannya ya.',
  'po.stand': 'Berdiri', 'po.ruku': 'Rukuk', 'po.sujud': 'Sujud', 'po.sit': 'Duduk', 'po.trans': 'Transisi', 'po.none': 'Badan tidak terlihat',
  'e.knee': 'lutut belum lurus', 'e.upright': 'badan belum tegak', 'e.rlow': 'rukuk belum sempurna, punggung belum rata', 'e.rhigh': 'rukuk terlalu membungkuk', 'e.head': 'kepala jangan lebih rendah dari punggung', 'e.rknee': 'lutut jangan ditekuk saat rukuk', 'e.elbow': 'siku jangan menempel lantai', 'e.hip': 'pinggul belum terangkat saat sujud', 'e.sitback': 'punggung belum tegak saat duduk',
  'qb.title': 'Arah Kiblat', 'qb.intro': "Tekan mulai lalu putar HP hingga ikon Ka'bah di atas.", 'qb.start': 'Mulai kompas', 'qb.ok': 'Arah kiblat tepat', 'qb.deg': "Kiblat {d}° dari utara. Putar HP ke arah ikon Ka'bah.", 'qb.err': 'Sensor kompas tidak tersedia atau izin ditolak.', 'qb.n': 'U',
};
const EN = {
  hello: 'Assalamu alaikum!', 'ban.s': 'Remember Allah', 'ban.h': 'Start Dhikr\nToday', 'ban.b': 'Start now',
  'm.rk': 'Rakat', 'm.dz': 'Dhikr', 'm.cam': 'AI Check', 'm.qb': 'Qibla', 'nav.home': 'Home', 'nav.cam': 'Check',
  bell: 'Enable notifications', 'n.on': 'Notifications enabled', 'n.off': 'Notifications not allowed',
  'tm.title': 'Prayer Times', 'tm.load': 'Loading location…', 'tm.left': 'left', 'tm.fail': 'Failed to load times. Check your internet.', 'tm.me': 'Your location', 'tm.find': 'Finding place name…', 'tm.noname': 'Location found (name unavailable)', 'tm.tap': 'Tap to refresh location', 'tm.def': 'Jakarta (allow location for accuracy)', 'tm.now': 'It is time for {n} prayer',
  's.streak': 'day streak', 's.dz': 'dhikr today', 's.pr': 'prayers today', mark: 'mark as prayed',
  'p.subuh': 'Fajr', 'p.dzuhur': 'Dhuhr', 'p.ashar': 'Asr', 'p.maghrib': 'Maghrib', 'p.isya': 'Isha',
  'rk.title': 'Rakat Counter', 'rk.shirt': 'Shirt pocket', 'rk.pants': 'Pants pocket', 'rk.ruku': 'Ruku', 'rk.sujud': 'Sujud', 'rk.rakaat': 'Rakat', 'rk.tilt': 'Phone tilt',
  'rk.start': 'Calibrate & start', 'rk.stop': 'Stop', 'rk.intro': 'Stand upright for 3 seconds to calibrate, then start praying.', 'rk.hint': 'Shirt pocket tracks your torso, pants pocket tracks your thigh. Stand upright while calibrating.',
  'rk.cal': 'Calibrating… stand upright ({n})', 'rk.ready': 'Ready. You may begin your prayer', 'rk.done': 'Alhamdulillah, {n} rakats completed. Continue with dhikr?', 'rk.over': 'Count exceeds {n}. It may be a miscount, fix it with the −1 button.', 'rk.err': 'Motion sensor unavailable or permission denied. Use a phone over HTTPS.',
  'ph.new': 'Ready for a new rakat', 'ph.ruku': 'Ruku detected', 'ph.sujud1': 'First sujud detected', 'ph.down': 'Sujud / sitting…', 'ph.stand': 'Standing',
  'dz.title': 'Dhikr Counter', 'dz.sum': 'Dhikr Summary', 'dz.set': 'Set', 'dz.tgt': 'Target', 'dz.pack': 'Post-prayer dhikr set', 'dz.packOn': 'Post-prayer dhikr started: 4 steps', 'dz.next': 'Next: {n} {c}x', 'dz.packDone': 'Alhamdulillah, dhikr set completed',
  'dz.day': 'Day', 'dz.week': 'Week', 'dz.month': 'Month', 'dz.year': 'Year', 'dz.total': 'total', 'dz.today': 'today', 'dz.empty': 'No data in this range yet.', 'dz.back': 'Back', 'dz.tap': 'Add count', 'dz.reset': 'Reset', 'dz.undo': 'Remove one',
  'dz.sub': 'Subhanallah', 'dz.alh': 'Alhamdulillah', 'dz.akb': 'Allahu Akbar', 'dz.ist': 'Astaghfirullah', 'dz.tah': 'Tahlil', 'dz.sal': 'Salawat',
  'dm.sub': 'Glory be to Allah', 'dm.alh': 'All praise is due to Allah', 'dm.akb': 'Allah is the Greatest', 'dm.ist': 'I seek forgiveness from Allah', 'dm.tah': 'There is no god but Allah', 'dm.sal': 'Blessings upon Prophet Muhammad ﷺ',
  'cam.title': 'Movement Check', 'cam.hint': 'Place the phone about 2 m to your side (side view, full body visible).', 'cam.ready': 'Ready', 'cam.score': 'movement score', 'cam.fix': 'corrections', 'cam.start': 'Start camera', 'cam.load': 'Loading AI…',
  'cam.note': 'An initial aid based on joint angles, not a replacement for a teacher.', 'cam.err': 'Cannot open the camera. Please allow camera access.', 'cam.warn': 'SubhanAllah, {m}. Please correct your movement.',
  'po.stand': 'Standing', 'po.ruku': 'Ruku', 'po.sujud': 'Sujud', 'po.sit': 'Sitting', 'po.trans': 'Transition', 'po.none': 'Body not visible',
  'e.knee': 'knees are not straight', 'e.upright': 'body is not upright', 'e.rlow': 'ruku is incomplete, back is not flat', 'e.rhigh': 'bowing too low in ruku', 'e.head': 'head should not be lower than your back', 'e.rknee': 'do not bend your knees in ruku', 'e.elbow': 'elbows should not rest on the floor', 'e.hip': 'hips are not raised in sujud', 'e.sitback': 'back is not upright while sitting',
  'qb.title': 'Qibla Direction', 'qb.intro': 'Tap start, then turn your phone until the Kaaba icon is at the top.', 'qb.start': 'Start compass', 'qb.ok': 'Facing the Qibla', 'qb.deg': 'Qibla is {d}° from north. Turn toward the Kaaba icon.', 'qb.err': 'Compass sensor unavailable or permission denied.', 'qb.n': 'N',
};
const AR = {
  hello: 'السلام عليكم!', 'ban.s': 'اذكر الله', 'ban.h': 'ابدأ الذكر\nاليوم', 'ban.b': 'ابدأ الآن',
  'm.rk': 'الركعات', 'm.dz': 'الأذكار', 'm.cam': 'فحص الحركة', 'm.qb': 'القبلة', 'nav.home': 'الرئيسية', 'nav.cam': 'فحص',
  bell: 'تفعيل الإشعارات', 'n.on': 'تم تفعيل الإشعارات', 'n.off': 'الإشعارات غير مسموحة',
  'tm.title': 'مواقيت الصلاة', 'tm.load': 'جارٍ تحديد الموقع…', 'tm.left': 'متبقٍ', 'tm.fail': 'تعذر تحميل المواقيت. تحقق من الإنترنت.', 'tm.me': 'موقعك', 'tm.find': 'جارٍ تحديد اسم المكان…', 'tm.noname': 'تم تحديد الموقع (الاسم غير متاح)', 'tm.tap': 'اضغط لتحديث الموقع', 'tm.def': 'جاكرتا (اسمح بالموقع لمزيد من الدقة)', 'tm.now': 'حان وقت صلاة {n}',
  's.streak': 'أيام متتالية', 's.dz': 'ذكر اليوم', 's.pr': 'صلوات اليوم', mark: 'تحديد كمصلّاة',
  'p.subuh': 'الفجر', 'p.dzuhur': 'الظهر', 'p.ashar': 'العصر', 'p.maghrib': 'المغرب', 'p.isya': 'العشاء',
  'rk.title': 'عدّاد الركعات', 'rk.shirt': 'جيب القميص', 'rk.pants': 'جيب البنطال', 'rk.ruku': 'الركوع', 'rk.sujud': 'السجود', 'rk.rakaat': 'الركعات', 'rk.tilt': 'ميلان الهاتف',
  'rk.start': 'معايرة وبدء', 'rk.stop': 'إيقاف', 'rk.intro': 'قف منتصبًا 3 ثوانٍ للمعايرة ثم ابدأ الصلاة.', 'rk.hint': 'جيب القميص يتتبع الجذع وجيب البنطال يتتبع الفخذ. قف منتصبًا أثناء المعايرة.',
  'rk.cal': 'جارٍ المعايرة… قف منتصبًا ({n})', 'rk.ready': 'جاهز. يمكنك بدء الصلاة', 'rk.done': 'الحمد لله، اكتملت {n} ركعات. هل تتابع بالذكر؟', 'rk.over': 'العدد تجاوز {n}. قد يكون خطأ، صحّحه بزر −1.', 'rk.err': 'حساس الحركة غير متاح أو تم رفض الإذن. استخدم هاتفًا عبر HTTPS.',
  'ph.new': 'جاهز لركعة جديدة', 'ph.ruku': 'تم رصد الركوع', 'ph.sujud1': 'تم رصد السجدة الأولى', 'ph.down': 'سجود / جلوس…', 'ph.stand': 'قيام',
  'dz.title': 'عدّاد الأذكار', 'dz.sum': 'ملخص الأذكار', 'dz.set': 'المجموعة', 'dz.tgt': 'الهدف', 'dz.pack': 'أذكار بعد الصلاة', 'dz.packOn': 'بدأت أذكار بعد الصلاة: 4 مراحل', 'dz.next': 'التالي: {n} {c} مرة', 'dz.packDone': 'الحمد لله، اكتملت الأذكار',
  'dz.day': 'يوم', 'dz.week': 'أسبوع', 'dz.month': 'شهر', 'dz.year': 'سنة', 'dz.total': 'الإجمالي', 'dz.today': 'اليوم', 'dz.empty': 'لا توجد بيانات في هذه الفترة.', 'dz.back': 'رجوع', 'dz.tap': 'زيادة العدّ', 'dz.reset': 'إعادة', 'dz.undo': 'إنقاص واحد',
  'dz.sub': 'سبحان الله', 'dz.alh': 'الحمد لله', 'dz.akb': 'الله أكبر', 'dz.ist': 'أستغفر الله', 'dz.tah': 'التهليل', 'dz.sal': 'الصلاة على النبي',
  'dm.sub': 'تنزيه الله عن كل نقص', 'dm.alh': 'الثناء لله', 'dm.akb': 'الله أعظم من كل شيء', 'dm.ist': 'طلب المغفرة من الله', 'dm.tah': 'لا معبود بحق إلا الله', 'dm.sal': 'الصلاة على النبي محمد ﷺ',
  'cam.title': 'فحص حركات الصلاة', 'cam.hint': 'ضع الهاتف على بُعد مترين تقريبًا من جانبك (منظر جانبي والجسم كاملًا ظاهر).', 'cam.ready': 'جاهز', 'cam.score': 'درجة الحركة', 'cam.fix': 'تصحيحات', 'cam.start': 'تشغيل الكاميرا', 'cam.load': 'جارٍ تحميل الذكاء الاصطناعي…',
  'cam.note': 'مساعدة أولية تعتمد على زوايا المفاصل وليست بديلًا عن المعلّم.', 'cam.err': 'تعذر فتح الكاميرا. يرجى السماح بالوصول.', 'cam.warn': 'سبحان الله، {m}. يرجى تصحيح الحركة.',
  'po.stand': 'قيام', 'po.ruku': 'ركوع', 'po.sujud': 'سجود', 'po.sit': 'جلوس', 'po.trans': 'انتقال', 'po.none': 'الجسم غير ظاهر',
  'e.knee': 'الركبتان غير مستقيمتين', 'e.upright': 'الجسم غير منتصب', 'e.rlow': 'الركوع غير مكتمل والظهر غير مستوٍ', 'e.rhigh': 'الانحناء في الركوع زائد', 'e.head': 'لا ينبغي أن يكون الرأس أخفض من الظهر', 'e.rknee': 'لا تثنِ ركبتيك في الركوع', 'e.elbow': 'لا تُلصق المرفقين بالأرض', 'e.hip': 'الحوض غير مرفوع في السجود', 'e.sitback': 'الظهر غير منتصب أثناء الجلوس',
  'qb.title': 'اتجاه القبلة', 'qb.intro': 'اضغط ابدأ ثم أدر هاتفك حتى تكون أيقونة الكعبة في الأعلى.', 'qb.start': 'تشغيل البوصلة', 'qb.ok': 'أنت في اتجاه القبلة', 'qb.deg': 'القبلة {d}° من الشمال. أدر الهاتف نحو أيقونة الكعبة.', 'qb.err': 'حساس البوصلة غير متاح أو تم رفض الإذن.', 'qb.n': 'ش',
};
const MS = { ...ID, 'ban.h': 'Mula Zikir\nHari Ini', 'ban.b': 'Mula sekarang', 'rk.shirt': 'Poket Baju', 'rk.pants': 'Poket Seluar', 'rk.tilt': 'Kecondongan telefon', 'p.dzuhur': 'Zohor', 'p.ashar': 'Asar', 'p.isya': 'Isyak',
  'tm.title': 'Waktu Solat', 'tm.load': 'Memuatkan lokasi…', 'tm.left': 'lagi', 'tm.fail': 'Gagal memuat waktu. Semak internet.', 'tm.me': 'Lokasi anda', 'tm.find': 'Mencari nama lokasi…', 'tm.noname': 'Lokasi dikesan (nama tidak tersedia)', 'tm.tap': 'Ketik untuk kemas kini lokasi', 'tm.def': 'Jakarta (benarkan lokasi untuk ketepatan)', 'tm.now': 'Masuk waktu solat {n}',
  's.streak': 'hari berturut', 's.dz': 'zikir hari ini', 's.pr': 'solat hari ini', mark: 'tandakan sudah solat', 'm.dz': 'Zikir', 'm.cam': 'Semakan AI', 'nav.cam': 'Semak', bell: 'Aktifkan notifikasi',
  'rk.title': 'Pengira Rakaat', 'rk.start': 'Tentukur & mula', 'rk.stop': 'Henti', 'rk.intro': 'Berdiri tegak 3 saat untuk penentukuran, kemudian mula solat.', 'rk.hint': 'Poket Baju mengesan gerakan badan, Poket Seluar mengesan gerakan paha. Berdiri tegak semasa penentukuran.',
  'rk.cal': 'Penentukuran… berdiri tegak ({n})', 'rk.ready': 'Sedia. Sila mulakan solat', 'rk.done': 'Alhamdulillah, {n} rakaat selesai. Teruskan zikir?', 'rk.over': 'Rakaat melebihi {n}. Mungkin silap kira, betulkan dengan butang −1.', 'rk.err': 'Penderia gerakan tiada atau kebenaran ditolak. Guna telefon melalui HTTPS.',
  'ph.new': 'Sedia rakaat baharu', 'ph.ruku': 'Rukuk dikesan', 'ph.sujud1': 'Sujud pertama dikesan', 'ph.down': 'Sujud / duduk…', 'dz.title': 'Pengira Zikir', 'dz.sum': 'Ringkasan Zikir', 'dz.pack': 'Zikir selepas solat', 'dz.packOn': 'Zikir selepas solat bermula: 4 peringkat', 'dz.next': 'Seterusnya: {n} {c}x', 'dz.packDone': 'Alhamdulillah, zikir selesai',
  'dz.day': 'Hari', 'dz.week': 'Minggu', 'dz.month': 'Bulan', 'dz.year': 'Tahun', 'dz.today': 'hari ini', 'dz.empty': 'Tiada data dalam julat ini.', 'dz.back': 'Kembali', 'dz.tap': 'Tambah kiraan', 'dz.undo': 'Kurangkan satu',
  'dm.sub': 'Maha Suci Allah', 'dm.alh': 'Segala puji bagi Allah', 'dm.ist': 'Aku mohon ampun kepada Allah', 'dm.tah': 'Tiada tuhan selain Allah', 'dm.sal': 'Selawat ke atas Nabi Muhammad ﷺ',
  'cam.title': 'Semakan Gerakan', 'cam.hint': 'Letakkan telefon ±2 meter di sisi anda (pandangan sisi, seluruh badan kelihatan).', 'cam.score': 'skor gerakan', 'cam.fix': 'pembetulan', 'cam.start': 'Mula kamera', 'cam.load': 'Memuatkan AI…',
  'cam.note': 'Bantuan awal berdasarkan sudut sendi, bukan pengganti guru/ustaz.', 'cam.err': 'Kamera tidak dapat dibuka. Benarkan akses kamera.', 'cam.warn': 'Subhanallah, {m}. Sila betulkan gerakan.',
  'po.stand': 'Berdiri', 'po.sit': 'Duduk', 'po.trans': 'Peralihan', 'po.none': 'Badan tidak kelihatan',
  'e.knee': 'lutut belum lurus', 'e.upright': 'badan belum tegak', 'e.rlow': 'rukuk belum sempurna, belakang belum rata', 'e.rhigh': 'rukuk terlalu membongkok', 'e.head': 'kepala jangan lebih rendah daripada belakang', 'e.rknee': 'jangan bengkokkan lutut semasa rukuk', 'e.elbow': 'siku jangan melekat pada lantai', 'e.hip': 'punggung belum diangkat semasa sujud', 'e.sitback': 'belakang belum tegak semasa duduk',
  'qb.title': 'Arah Kiblat', 'qb.intro': "Tekan mula, kemudian pusing telefon sehingga ikon Kaabah di atas.", 'qb.start': 'Mula kompas', 'qb.ok': 'Arah kiblat tepat', 'qb.deg': 'Kiblat {d}° dari utara. Pusing ke arah ikon Kaabah.', 'qb.err': 'Penderia kompas tiada atau kebenaran ditolak.' };
export const LANGS = { id: ['Bahasa Indonesia', ID], en: ['English', EN], ar: ['العربية', AR], ms: ['Bahasa Melayu', MS] };
const saved = (() => { try { return localStorage.getItem('rs.lang'); } catch { return null; } })();
let cur = LANGS[saved] ? saved : ({ id: 'id', ms: 'ms', ar: 'ar' }[(navigator.language || 'en').slice(0, 2)] || 'en');
export const hooks = [];
export const lang = () => cur;
export const t = (k, v = {}) => (LANGS[cur][1][k] ?? ID[k] ?? k).replace(/\{(\w+)\}/g, (_, x) => v[x] ?? '');
export function apply() {
  const h = document.documentElement; h.lang = cur; h.dir = cur === 'ar' ? 'rtl' : 'ltr'; document.title = 'RakaatSense';
  document.querySelectorAll('[data-i]:not([data-i=""])').forEach((e) => (e.textContent = t(e.dataset.i)));
  document.querySelectorAll('[data-ia]').forEach((e) => e.setAttribute('aria-label', t(e.dataset.ia)));
}
export function setLang(l) { cur = l; try { localStorage.setItem('rs.lang', l); } catch {} apply(); hooks.forEach((f) => f()); }
