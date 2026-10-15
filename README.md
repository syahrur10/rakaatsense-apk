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

## v6: peran Admin & Pengguna + Panel Admin
**Kenapa pesan "Metode masuk ini belum diaktifkan" muncul?** Tombol Google/Facebook/GitHub butuh Firebase. Kalau 4 kunci `VITE_FIREBASE_*` belum diisi (atau penyedia belum di-*Enable*), tombolnya menampilkan pesan itu. Sekarang tombol sosial **disembunyikan otomatis** bila belum aktif; hanya penyedia di `VITE_SOCIAL_PROVIDERS` yang tampil.

**Login satu layar**: semua orang masuk lewat form yang sama. Peran (admin/pengguna) ditentukan oleh akunnya. Admin melihat ikon perisai di beranda → **Panel Admin**:
- daftar semua pengguna (nama, email, tanggal daftar, terakhir masuk) + pencarian + statistik;
- ketuk pengguna → **data ibadahnya** (streak, shalat hari ini, total dzikir, tabel 7 hari);
- tombol **Jadikan admin / Jadikan pengguna biasa**. Admin utama dan akun sendiri tidak bisa diubah. Mode lokal juga bisa **hapus akun**.

**Akun admin utama**: `syahrurbaja@gmail.com`.
- *Mode lokal* (tanpa Firebase): sudah tertanam (hanya hash PBKDF2) → langsung bisa masuk.
- *Mode online* (Firebase): buat sekali dengan `ADMIN_PASSWORD='sandi-admin' npm run create-admin`, atau Firebase Console → Authentication → Users → Add user. Buat akun ini **sebelum** aplikasi dipublikasikan.
- Panel Admin online butuh **Firestore Database** (Build → Firestore Database → Create database) lalu tempel isi `firestore.rules` di tab **Rules** → Publish. Peran admin tambahan disimpan di dokumen `users/{uid}.role` dan hanya admin yang boleh mengubahnya (dijaga aturan server). Data ibadah pengguna dikirim berupa ringkasan 30 hari; tamu tidak dikirim.
- Jika mengganti email admin utama, ubah juga di `VITE_ADMIN_EMAILS`, `src/config.js` (`LOCAL_ADMIN`), dan `firestore.rules`.

> Mode lokal: akun & data hanya ada di perangkat itu, jadi Panel Admin hanya melihat pengguna di perangkat yang sedang dipakai. Untuk data lintas perangkat, pakai mode online.
