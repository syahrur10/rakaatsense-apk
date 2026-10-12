# RakaatSense — Asisten Salat Berbasis AI
Vite + HTML/CSS/JS murni. `npm install && npm run dev` · `npm run build` (deploy Vercel). Sensor & kamera butuh **HTTPS** dan HP asli.

## Fitur (v2: ikon SVG kustom, logo baru, 4 bahasa ID/EN/AR/MS)
Jadwal 5 waktu (GPS, Kemenag RI) + pelacak & streak · Penghitung **Rukuk/Sujud/Rakaat** (akselerometer, mode Saku Baju & Saku Celana) ·
Koreksi gerakan kamera (MediaPipe Pose) · **Dzikir** (6 preset, paket setelah shalat, ringkasan hari/minggu/bulan/tahun) · Kompas kiblat.

## Metode
- Rakaat: sudut gravitasi (kalibrasi 3 dtk). Saku Baju: episode miring >50° ≥0,5 dtk; ke-1 = rukuk, ke-2/3 = sujud; 3 episode = 1 rakaat. Saku Celana: episode paha >25° ≥2,5 dtk = 1 rakaat (rukuk:sujud diestimasi 1:2). Ambang di `TH` (`src/counter.js`).
- Koreksi: sudut punggung/lutut + posisi siku/pinggul/kepala (`judge()` di `src/pose.js`), tampak samping. Validasi dengan ustadz/guru fikih.
- Kiblat: bearing great-circle ke Ka'bah + sensor orientasi.
## v3: tampilan terang + logo baru + nama lokasi
- Tema putih + hijau zamrud (token warna di `:root` pada `src/style.css`).
- Logo: mihrab (lengkung masjid) + bulan sabit + sajadah. Sumber di `tools/logo.py` (`python3 tools/logo.py` membuat ulang semua PNG/SVG).
- Lokasi tampil sebagai nama asli, mis. **Genuksari, Genuk, Semarang** (kelurahan, kecamatan, kota), lewat reverse geocoding OpenStreetMap Nominatim, cadangan BigDataCloud. Hasil di-cache per ~100 m. Ketuk nama lokasi untuk memperbarui. Butuh internet.

## APK (Capacitor)
```
npm i @capacitor/core @capacitor/cli @capacitor/android
npx cap init RakaatSense com.contoh.rakaatsense --web-dir=dist
npm run build && npx cap add android && npx cap sync
# ikon: salin ikon siap pakai ke project Android
cp -r android-assets/res/* android/app/src/main/res/
npx cap sync && npx cap open android
```
Alternatif ikon otomatis: `npm i -D @capacitor/assets`, taruh isi `android-assets/assets/` ke folder `assets/`, lalu `npx capacitor-assets generate --android`.
Izin di AndroidManifest: CAMERA, ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION, INTERNET, HIGH_SAMPLING_RATE_SENSORS.
