/** alarmcalc.js — hitungan murni (tanpa DOM) untuk Alarm Shalat, supaya bisa diuji.
 *  Data tersimpan di 'rs.al' = { snd: 'snd'|'vib', w: { subuh: {on, off}, ... }, s: [ { id, preset?, name?, time:'HH:MM', days:[0..6], on } ] }
 *   - w  = 5 shalat wajib: waktunya IKUT jadwal shalat harian; off = berbunyi N menit SEBELUM waktu shalat (0 = tepat waktu)
 *   - s  = sunnah: jam diatur sendiri. preset (tahajud/dhuha/witir) tidak bisa dihapus; sisanya buatan sendiri (nama diketik pengguna). */
export const WAJIB = ['subuh', 'dzuhur', 'ashar', 'maghrib', 'isya'];
export const OFFSETS = [0, 5, 10, 15, 30];
export const MAXS = 10;   // jumlah maksimum alarm sunnah buatan sendiri
export const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const PRESET = { tahajud: '03:00', dhuha: '08:00', witir: '21:00' };

export const defaults = () => ({
  snd: 'snd',
  w: Object.fromEntries(WAJIB.map((id) => [id, { on: false, off: 0 }])),
  s: Object.entries(PRESET).map(([id, time]) => ({ id, preset: id, time, days: [...ALL_DAYS], on: false })),
});

export const parse = (hm) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hm || '')); if (!m) return null;
  const h = +m[1], mi = +m[2]; return h > 23 || mi > 59 ? null : [h, mi];
};
export const pad = (n) => String(n).padStart(2, '0');
export const hhmm = (d) => pad(d.getHours()) + ':' + pad(d.getMinutes());
export const cleanName = (s) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, 30);

/** rapikan data tersimpan (aman terhadap data rusak/lama) */
export function norm(c) {
  const d = defaults(); if (!c || typeof c !== 'object') return d;
  const out = { snd: c.snd === 'vib' ? 'vib' : 'snd', w: {}, s: [] };
  WAJIB.forEach((id) => { const x = c.w?.[id]; out.w[id] = { on: !!x?.on, off: OFFSETS.includes(+x?.off) ? +x.off : 0 }; });
  const list = Array.isArray(c.s) ? c.s : [];
  const okDays = (a) => { const v = Array.isArray(a) ? [...new Set(a.map(Number).filter((n) => n >= 0 && n <= 6))].sort() : []; return v.length ? v : [...ALL_DAYS]; };
  d.s.forEach((p) => { const x = list.find((y) => y && y.id === p.id); out.s.push({ ...p, time: parse(x?.time) ? x.time : p.time, days: okDays(x?.days), on: !!x?.on }); });
  list.filter((x) => x && typeof x.id === 'string' && !PRESET[x.id] && !x.preset && cleanName(x.name) && parse(x.time)).slice(0, MAXS)
    .forEach((x) => out.s.push({ id: x.id, name: cleanName(x.name), time: x.time, days: okDays(x.days), on: !!x.on }));
  return out;
}

/** semua alarm dalam satu daftar datar: { key, kind:'w'|'s', id, name?, on, off, time, days } */
export const flat = (c) => [
  ...WAJIB.map((id) => ({ key: 'w:' + id, kind: 'w', id, on: c.w[id].on, off: c.w[id].off })),
  ...c.s.map((x) => ({ key: 's:' + x.id, kind: 's', id: x.id, name: x.name, preset: x.preset, on: x.on, time: x.time, days: x.days })),
];

/** kapan alarm ini berbunyi pada tanggal `day`; sched = { subuh:'04:35', ... } (jadwal shalat). null bila tidak berbunyi hari itu / jadwal belum ada */
export function fireTime(a, day, sched) {
  const hm = parse(a.kind === 'w' ? sched?.[a.id] : a.time); if (!hm) return null;
  if (a.kind === 's' && !a.days.includes(day.getDay())) return null;
  const d = new Date(day); d.setHours(hm[0], hm[1] - (a.kind === 'w' ? a.off : 0), 0, 0); return d;
}

/** alarm aktif yang akan berbunyi dalam `n` hari ke depan (terurut): [{ a, at }] */
export function upcoming(c, sched, now = new Date(), n = 7) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const day = new Date(now); day.setDate(day.getDate() + i);
    flat(c).filter((a) => a.on).forEach((a) => { const at = fireTime(a, day, sched); if (at && at > now) out.push({ a, at, day: i }); });
  }
  return out.sort((x, y) => x.at - y.at);
}
