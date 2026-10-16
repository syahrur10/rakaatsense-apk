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
- Logo (v3, sudah diganti di v6): sumber di `tools/logo.py` (`python3 tools/logo.py` membuat ulang semua PNG/SVG).
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

## v4: login, sapaan, kompas baru
- **Login** (`src/auth.js`): daftar/masuk dengan email + kata sandi, atau **Lanjut tanpa akun**. Akun disimpan **di perangkat** (localStorage); kata sandi di-hash PBKDF2-SHA256 + salt. Data ibadah (jadwal ditandai, streak, dzikir) dipisah per akun. Karena tanpa server, akun tidak ikut berpindah antar-HP. Untuk sinkron antar-perangkat, ganti `auth.js` dengan backend (mis. Supabase/Firebase).
- **Sapaan beranda**: "Assalamu'alaikum, {nama}" + salam sesuai waktu (pagi/siang/sore/malam) dalam 4 bahasa.
- **Kompas kiblat**: 4 mata angin (Utara/Timur/Selatan/Barat) yang selalu tegak terbaca, skala derajat, penanda Ka'bah di bingkai, arah HP & arah kiblat (mis. 295° Barat Laut), petunjuk "Putar ke kanan/kiri N°", getar saat tepat.
- Struktur: `main.js` = gerbang login, `app.js` = aplikasi utama.

## v5: tanggal rapi + login sungguhan
- **Tanggal beranda**: baris 1 Masehi lengkap dengan tahun (mis. *Rabu, 14 Oktober 2026*), baris 2 Hijriyah di bawahnya (mis. *4 Jumadil Awal 1448 H*).
- **Login sungguhan (Firebase Authentication)**: Email + kata sandi, **Google**, **Facebook**, **GitHub**, plus **Lupa kata sandi** (email reset). Akun ada di server → bisa dipakai di HP/browser lain. Data ibadah tetap dipisah per akun (uid).
- Tanpa kunci Firebase, aplikasi otomatis memakai **mode lokal** (akun di perangkat) dan tombol sosial menampilkan pesan "belum diaktifkan".

### Cara mengaktifkan login (±10 menit, gratis)
1. https://console.firebase.google.com → **Add project** → **Build → Authentication → Get started**.
2. Tab **Sign-in method**, aktifkan **Email/Password** dan **Google** (cukup pilih email dukungan).
   - **Facebook**: buat app di developers.facebook.com → salin *App ID* & *App Secret* ke Firebase, lalu salin **OAuth redirect URI** dari Firebase ke pengaturan Facebook Login.
   - **GitHub**: github.com/settings/developers → New OAuth App → *Authorization callback URL* = URI dari Firebase; salin Client ID & Secret ke Firebase.
3. **Authentication → Settings → Authorized domains**: tambahkan domain Vercel kamu (mis. `rakaatsense-apk.vercel.app`).
4. **Project settings → Your apps → Web (</>)** → salin config. Isi 4 variabel di `.env.example` (lokal: salin jadi `.env`; Vercel: Settings → Environment Variables) lalu **redeploy**.
5. `npm install` lalu `npm run dev` / `npm run build`.

> **APK (Capacitor)**: popup login Google/Facebook tidak jalan di WebView. Untuk APK pasang `@capacitor-firebase/authentication` (atau pakai versi web/PWA). Login email+sandi tetap jalan di APK.

## Login Google + Email, Admin & Pengguna
Login hanya **Google** dan **Email+Kata sandi** (Facebook/GitHub dihapus). Tanpa kunci Firebase, aplikasi jalan di **mode lokal** (akun di perangkat; tombol Google menampilkan pesan "belum disambungkan"). Admin utama bawaan: `syahrurbaja@gmail.com`.

### Panel Admin (ikon perisai di beranda)
Daftar pengguna + pencarian + statistik · ketuk pengguna → data ibadahnya (streak, shalat, dzikir 7 hari) · **Jadikan admin / pengguna biasa** · **+ Tambah akun** (buat akun Pengguna atau Admin dengan email & kata sandi) · mode lokal juga bisa hapus akun.

### Mengaktifkan login sungguhan (Firebase, gratis)
1. console.firebase.google.com → **Add project** (Analytics boleh dimatikan).
2. **Build → Authentication → Get started → Sign-in method**: aktifkan **Email/Password** dan **Google** (isi support email → Save).
3. **Authentication → Settings → Authorized domains** → Add domain: `rakaatsense-apk.vercel.app` (tanpa https://).
4. **Project settings (ikon gerigi) → Your apps → ikon Web `</>`** → daftarkan app → salin `apiKey`, `authDomain`, `projectId`, `appId`.
5. **Vercel → Project → Settings → Environment Variables**, tambah 4 variabel: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID` → **Redeploy**.
6. **Build → Firestore Database → Create database** (production mode) → tab **Rules** → tempel isi `firestore.rules` → **Publish**.
7. Buat akun admin: Authentication → Users → **Add user** (email admin + sandi), atau `ADMIN_PASSWORD='sandi' npm run create-admin`. Lakukan **sebelum** aplikasi dibagikan.
Akun mode lokal tidak ikut pindah ke Firebase.

Jika mengganti email admin utama, ubah juga di `VITE_ADMIN_EMAILS`, `src/config.js` (`LOCAL_ADMIN`) dan `firestore.rules`.

## v6: logo orang sujud + beranda fokus Kalibrasi & Kamera AI
- **Logo/ikon APK baru**: siluet orang sedang **sujud** (tampak samping) di atas sajadah emas + bulan sabit, latar hijau zamrud. Sumber: `tools/logo.py` (`python3 tools/logo.py` membuat ulang `public/*` dan seluruh `android-assets/*`: ikon launcher, adaptif, bulat, monokrom, splash). Logo di dalam aplikasi ada di `src/icons.js` (`logo()`).
- **Beranda** (`index.html`, `src/app.js`, `src/style.css`, `src/i18n.js`):
  - Banner utama kini **“Kalibrasi & Koreksi Kamera”** dengan 2 tombol: *Kalibrasi sensor* dan *Buka kamera AI* (dekorasi kerangka sendi + garis pemindai).
  - 2 kartu fitur besar: **Kalibrasi Sensor** dan **Koreksi Kamera AI**, plus strip 3 langkah (Kalibrasi 3 detik → Hitung otomatis → Koreksi kamera).
  - **Dzikir** dan **Kiblat** menjadi pintasan sekunder di bawahnya (fitur dzikir tetap utuh).
  - Ringkasan hari ini: statistik "dzikir hari ini" diganti **skor gerakan kamera terakhir** (disimpan di `rs.cam`, tampil sebagai `87%`).
  - Navigasi bawah: Beranda · Kalibrasi · Koreksi (kamera) · Kiblat · Dzikir.
  - Semua teks baru tersedia di 4 bahasa (ID/EN/AR/MS).
- **Pasang ikon baru ke APK** (setelah `npx cap add android`): `cp -r android-assets/res/* android/app/src/main/res/ && npx cap sync`.

