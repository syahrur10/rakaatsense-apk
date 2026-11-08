/** hijri.js — tanggal Hijriah sesuai Kalender Hijriah Indonesia (Ditjen Bimas Islam, Kemenag RI).
 *  Kenapa bukan Intl `islamic`? Kalender bawaan peramban (astronomis / Umm al-Qura) sering selisih 1 hari dari ketetapan Kemenag
 *  (mis. 8 Nov 2026: Intl "islamic" = 29, Kemenag = 28 Jumadil Awal 1448). Maka awal bulan diambil dari kalender resmi Kemenag.
 *
 *  PERAWATAN: setiap Kemenag menerbitkan Kalender Hijriah Indonesia tahun berikutnya (biasanya Okt–Des), tambahkan awal bulan barunya
 *  ke KEMENAG di bawah (format: [tahun Hijriah, nomor bulan 1–12, tanggal Masehi 1 hari bulan itu]). Di luar rentang tabel, tanggal
 *  DIPERKIRAKAN dari rata-rata bulan sinodis berjangkar pada data Kemenag (galat ≤ 1 hari), tetap lebih akurat daripada Intl. */
const KEMENAG = [
  // 1447 H
  [1447, 7, '2025-12-21'], [1447, 8, '2026-01-20'], [1447, 9, '2026-02-19'], [1447, 10, '2026-03-21'], [1447, 11, '2026-04-19'], [1447, 12, '2026-05-18'],
  // 1448 H
  [1448, 1, '2026-06-16'], [1448, 2, '2026-07-16'], [1448, 3, '2026-08-14'], [1448, 4, '2026-09-13'], [1448, 5, '2026-10-12'], [1448, 6, '2026-11-11'], [1448, 7, '2026-12-10'],
];
const LUNATION = 29.530588; // rata-rata bulan sinodis (hari)
const dayNum = (s) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d) / 864e5; };
const TABLE = KEMENAG.map(([y, m, s]) => ({ idx: y * 12 + (m - 1), n: dayNum(s) }));
const FIRST = TABLE[0], LAST = TABLE[TABLE.length - 1];
const exact = new Map(TABLE.map((r) => [r.idx, r.n]));
/** hari-ke (nomor hari) awal bulan ke-idx: resmi bila ada di tabel, selain itu proyeksi dari tepi tabel terdekat */
function startOf(idx) {
  if (exact.has(idx)) return exact.get(idx);
  const a = idx < FIRST.idx ? FIRST : LAST;
  return a.n + Math.round((idx - a.idx) * LUNATION);
}
/** @param {Date} d tanggal (hari menurut zona waktu perangkat)  @returns {{d:number,m:number,y:number,official:boolean}} */
export function hijriDate(d = new Date()) {
  const n = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5;
  let idx = FIRST.idx + Math.floor((n - FIRST.n) / LUNATION);
  while (startOf(idx) > n) idx--;
  while (startOf(idx + 1) <= n) idx++;
  const inTable = exact.has(idx) && exact.has(idx + 1) || (idx === LAST.idx && n - LAST.n < 30);
  return { d: n - startOf(idx) + 1, m: (idx % 12) + 1, y: Math.floor(idx / 12), official: !!inTable };
}
