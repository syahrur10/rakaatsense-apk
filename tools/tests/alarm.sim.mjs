import { defaults, norm, flat, fireTime, upcoming, parse, hhmm } from '../../src/alarmcalc.js';
let bad = 0; const ok = (n, c) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + n); if (!c) { bad++; process.exitCode = 1; } };
const sched = { subuh: '04:35', dzuhur: '11:58', ashar: '15:12', maghrib: '17:55', isya: '19:05' };
const c = defaults(); c.w.subuh = { on: true, off: 10 }; c.w.isya.on = true; c.s[0].on = true; // tahajud 03:00
c.s.push({ id: 'c_1', name: 'Hajat', time: '20:30', days: [1, 3], on: true });
const day = new Date(2026, 9, 20, 0, 0); // Selasa 20 Okt 2026
const f = (k) => flat(c).find((a) => a.key === k);
ok('subuh 10 menit sebelum = 04:25', fireTime(f('w:subuh'), day, sched).toTimeString().slice(0, 5) === '04:25');
ok('isya tepat waktu = 19:05', fireTime(f('w:isya'), day, sched).toTimeString().slice(0, 5) === '19:05');
ok('wajib tanpa jadwal = null', fireTime(f('w:subuh'), day, {}) === null);
ok('offset melewati tengah malam tetap benar', (() => { const d = fireTime({ kind: 'w', id: 'subuh', off: 30 }, day, { subuh: '00:10' }); return d.getDate() === 19 && d.toTimeString().slice(0, 5) === '23:40'; })());
ok('sunnah hari terbatas: Selasa(2) tidak ada Hajat', fireTime(f('s:c_1'), day, sched) === null);
const rabu = new Date(2026, 9, 21); ok('Hajat berbunyi Rabu(3) 20:30', fireTime(f('s:c_1'), rabu, sched)?.toTimeString().slice(0, 5) === '20:30');
const now = new Date(2026, 9, 20, 4, 30);
const up = upcoming(c, sched, now, 2);
ok('alarm pertama setelah 04:30 adalah Isya 19:05', up[0].a.key === 'w:isya' && hhmm(up[0].at) === '19:05');
ok('semua hasil > sekarang & terurut', up.every((x, i) => x.at > now && (!i || up[i - 1].at <= x.at)));
ok('subuh hari ini (04:25) tidak ikut karena sudah lewat', !up.some((x) => x.a.key === 'w:subuh' && x.day === 0));
ok('subuh besok ikut', up.some((x) => x.a.key === 'w:subuh' && x.day === 1));
ok('norm: data rusak → default', norm('x').s.length === 3 && norm(null).w.subuh.off === 0);
ok('norm: nama kosong / jam salah dibuang', norm({ s: [{ id: 'c_9', name: ' ', time: '10:00' }, { id: 'c_8', name: 'A', time: '99:99' }] }).s.length === 3);
ok('norm: offset aneh → 0', norm({ w: { subuh: { on: true, off: 7 } } }).w.subuh.off === 0);
ok('parse jam', parse('3:05')?.[0] === 3 && parse('24:00') === null);
console.log(bad ? 'GAGAL' : 'semua lolos');
