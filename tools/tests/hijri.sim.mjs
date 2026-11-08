import { hijriDate } from '../../src/hijri.js';
let bad = 0;
const T = (name, y, m, d, want) => { const h = hijriDate(new Date(y, m - 1, d, 12)), got = `${h.d}/${h.m}/${h.y}`; const ok = got === want; if (!ok) bad++; console.log((ok ? 'OK  ' : 'FAIL') + ' ' + name.padEnd(44) + got + (ok ? '' : '  (harus ' + want + ')')); };
// titik acuan resmi Kalender Hijriah Indonesia (Kemenag)
T('8 Nov 2026 = 28 Jumadil Awal 1448', 2026, 11, 8, '28/5/1448');
T('12 Okt 2026 = 1 Jumadil Awal 1448', 2026, 10, 12, '1/5/1448');
T('11 Nov 2026 = 1 Jumadil Akhir 1448', 2026, 11, 11, '1/6/1448');
T('10 Nov 2026 = 30 Jumadil Awal 1448', 2026, 11, 10, '30/5/1448');
T('16 Jun 2026 = 1 Muharram 1448', 2026, 6, 16, '1/1/1448');
T('19 Feb 2026 = 1 Ramadan 1447', 2026, 2, 19, '1/9/1447');
T('21 Mar 2026 = 1 Syawal 1447', 2026, 3, 21, '1/10/1447');
T('27 Mei 2026 = 10 Dzulhijjah 1447 (Idul Adha)', 2026, 5, 27, '10/12/1447');
T('25 Ags 2026 = 12 Rabiul Awal 1448 (Maulid)', 2026, 8, 25, '12/3/1448');
T('16 Jan 2026 = 27 Rajab 1447 (Isra Mikraj)', 2026, 1, 16, '27/7/1447');
T('31 Des 2026 = 22 Rajab 1448', 2026, 12, 31, '22/7/1448');
// seluruh rentang tabel & perkiraan di luar tabel: urut, panjang bulan 29/30, nomor valid
let prev = null, run = 0;
for (let n = Date.UTC(2020, 0, 1) / 864e5; n <= Date.UTC(2035, 11, 31) / 864e5; n++) {
  const dt = new Date(n * 864e5 + 12 * 36e5), h = hijriDate(new Date(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate(), 12));
  if (h.d < 1 || h.d > 30 || h.m < 1 || h.m > 12) { bad++; console.log('FAIL nilai di luar batas', dt.toISOString().slice(0, 10), h); break; }
  if (prev) {
    const okStep = (h.d === prev.d + 1 && h.m === prev.m && h.y === prev.y) || (h.d === 1 && prev.d >= 29 && ((h.m === prev.m % 12 + 1) && (h.y === prev.y + (prev.m === 12 ? 1 : 0))));
    if (!okStep) { bad++; console.log('FAIL urutan tidak mulus', dt.toISOString().slice(0, 10), JSON.stringify(prev), JSON.stringify(h)); break; }
  }
  prev = h; run++;
}
console.log((bad ? 'FAIL' : 'OK  ') + ' urutan harian 2020–2035 mulus (' + run + ' hari)');
process.exitCode = bad ? 1 : 0;
