<div align="center">

<img src="public/icon-512.png" width="120" alt="Logo RakaatSense" />

# RakaatSense

**Asisten salat berbasis AI** — hitung rakaat otomatis lewat sensor HP, koreksi gerakan lewat kamera, jadwal salat, dzikir, dan kiblat.

`Vite` · `JavaScript murni` · `Firebase Auth + Firestore` · `MediaPipe Pose` · `Capacitor (APK)` · `4 bahasa: ID / EN / AR / MS`

</div>

---

## Daftar Isi
1. [Fitur](#fitur)
2. [Akun Admin](#akun-admin)
3. [Mulai Cepat](#mulai-cepat)
4. [Mengaktifkan Login Sungguhan (Firebase)](#mengaktifkan-login-sungguhan-firebase)
5. [Panel Admin](#panel-admin)
6. [Membuat APK (Capacitor)](#membuat-apk-capacitor)
7. [Cara Kerja Metode](#cara-kerja-metode)
8. [Logo & Ikon](#logo--ikon)
9. [Struktur Proyek](#struktur-proyek)
10. [Riwayat Versi](#riwayat-versi)
11. [Catatan Penting](#catatan-penting)

---

## Fitur

| Fitur | Keterangan |
|---|---|
| **Jadwal salat 5 waktu** | Berdasarkan GPS, metode Kemenag RI, plus pelacak salat & streak harian. Nama lokasi tampil asli (mis. *Genuksari, Genuk, Semarang*). |
| **Kalibrasi & penghitung rakaat** | Akselerometer HP menghitung **rukuk / sujud / rakaat** otomatis. Mode **Saku Baju** dan **Saku Celana**. Kalibrasi 3 detik. |
| **Koreksi gerakan kamera AI** | MediaPipe Pose menilai sudut punggung, lutut, posisi siku, pinggul, dan kepala (tampak samping) + skor gerakan. |
| **Dzikir** | 6 preset, paket dzikir setelah salat, ringkasan harian / mingguan / bulanan / tahunan. |
| **Kompas kiblat** | 4 mata angin tegak terbaca, skala derajat, penanda Ka'bah, petunjuk "putar kanan/kiri N°", getar saat tepat. |
| **Login & akun** | Google + Email/Kata sandi, lupa kata sandi, atau lanjut tanpa akun. Data ibadah dipisah per akun. |
| **Panel Admin** | Kelola pengguna, lihat data ibadah, ubah peran, tambah akun. |
| **Tanggal ganda** | Masehi lengkap + Hijriyah di beranda. |
| **4 bahasa** | Indonesia, English, العربية (RTL), Melayu. |

---

## Akun Admin

> **Admin utama bawaan**

| | |
|---|---|
| **Email** | `syahrurbaja@gmail.com` |
| **Nama tampilan** | Admin |
| **Peran** | Admin (akses penuh Panel Admin) |
| **Kata sandi** | Ditentukan pemilik proyek (lihat catatan di bawah) |

**Cara masuk:** buka aplikasi → tab **Masuk** → isi email di atas + kata sandi admin → ikon perisai 🛡️ muncul di beranda.

**Kata sandi admin** sengaja **tidak ditulis di repositori** (repo ini publik di GitHub, sehingga siapa pun bisa membacanya). Cara menentukannya:

- **Mode online (Firebase):** buat sekali dengan
  ```bash
  ADMIN_PASSWORD='sandi-kuat-kamu' npm run create-admin
  ```
  atau lewat Firebase Console → Authentication → Users → **Add user**. Lakukan ini **sebelum** aplikasi dibagikan, karena siapa pun yang mendaftar dengan email admin otomatis menjadi admin.
- **Mode lokal (tanpa Firebase):** akun admin sudah tertanam sebagai *salt + hash* PBKDF2-SHA256 di `src/config.js` (`LOCAL_ADMIN`). Untuk mengganti kata sandinya, buat hash baru lalu ganti `salt` dan `hash` di file itu.

**Mengganti / menambah email admin:** ubah di tiga tempat agar konsisten
1. `VITE_ADMIN_EMAILS` (`.env` / Vercel), bisa lebih dari satu, pisahkan koma
2. `src/config.js` → `LOCAL_ADMIN.email`
3. `firestore.rules`

> Disarankan segera mengganti kata sandi admin jika pernah dibagikan lewat chat atau tempat lain.

---

## Mulai Cepat

```bash
git clone https://github.com/syahrur10/rakaatsense-apk.git
cd rakaatsense-apk
npm install
npm run dev        # server pengembangan (--host, bisa dibuka dari HP satu jaringan)
npm run build      # hasil produksi ke folder dist/ (deploy Vercel)
```

- Sensor gerak dan kamera **wajib HTTPS** dan **HP asli** (tidak jalan di emulator desktop).
- **Tanpa kunci Firebase**, aplikasi otomatis jalan di **mode lokal** (akun tersimpan di perangkat). Tombol Google menampilkan pesan "belum disambungkan".

### Variabel lingkungan (`.env`)

Salin `.env.example` menjadi `.env`:

| Variabel | Fungsi |
|---|---|
| `VITE_FIREBASE_API_KEY` | Kunci API Firebase |
| `VITE_FIREBASE_AUTH_DOMAIN` | Domain auth Firebase |
| `VITE_FIREBASE_PROJECT_ID` | ID proyek Firebase |
| `VITE_FIREBASE_APP_ID` | ID aplikasi web Firebase |
| `VITE_ADMIN_EMAILS` | (opsional) daftar email admin, pisah koma. Bawaan: `syahrurbaja@gmail.com` |

Keempat variabel Firebase harus terisi semua agar mode online aktif.

---

## Mengaktifkan Login Sungguhan (Firebase)

Gratis, sekitar 10 menit.

1. [console.firebase.google.com](https://console.firebase.google.com) → **Add project** (Analytics boleh dimatikan).
2. **Build → Authentication → Get started → Sign-in method**: aktifkan **Email/Password** dan **Google** (isi support email → Save).
3. **Authentication → Settings → Authorized domains** → tambahkan domain Vercel, mis. `rakaatsense-apk.vercel.app` (tanpa `https://`).
4. **Project settings (ikon gerigi) → Your apps → ikon Web `</>`** → daftarkan app → salin `apiKey`, `authDomain`, `projectId`, `appId`.
5. **Vercel → Project → Settings → Environment Variables** → isi 4 variabel `VITE_FIREBASE_*` → **Redeploy**.
6. **Build → Firestore Database → Create database** (production mode) → tab **Rules** → tempel isi `firestore.rules` → **Publish**.
7. Buat akun admin (lihat [Akun Admin](#akun-admin)).

> Akun mode lokal tidak ikut pindah ke Firebase.
> **APK (Capacitor):** popup Google tidak jalan di WebView. Pasang `@capacitor-firebase/authentication`, atau pakai versi web/PWA. Login email + kata sandi tetap jalan di APK.

---

## Panel Admin

Ikon perisai di beranda (hanya tampil untuk admin):

- Daftar pengguna + pencarian + statistik
- Ketuk pengguna → lihat data ibadah (streak, salat, dzikir 7 hari)
- **Jadikan admin / pengguna biasa**
- **+ Tambah akun** (Pengguna atau Admin, dengan email & kata sandi)
- Mode lokal: bisa juga menghapus akun

---

## Membuat APK (Capacitor)

```bash
npm i @capacitor/core @capacitor/cli @capacitor/android
npx cap init RakaatSense com.contoh.rakaatsense --web-dir=dist
npm run build && npx cap add android && npx cap sync

# pasang ikon siap pakai
cp -r android-assets/res/* android/app/src/main/res/
npx cap sync && npx cap open android
```

Alternatif ikon otomatis: `npm i -D @capacitor/assets`, taruh isi `android-assets/assets/` ke folder `assets/`, lalu `npx capacitor-assets generate --android`.

**Izin di `AndroidManifest.xml`:** `CAMERA`, `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `INTERNET`, `HIGH_SAMPLING_RATE_SENSORS`.

---

## Cara Kerja Metode

**Penghitung rakaat** (`src/counter.js`): sudut gravitasi dengan kalibrasi 3 detik. Ambang ada di konstanta `TH`.
- *Saku Baju*: episode miring >50° selama ≥0,5 dtk. Episode ke-1 = rukuk, ke-2/3 = sujud. 3 episode = 1 rakaat.
- *Saku Celana*: episode paha >25° selama ≥2,5 dtk = 1 rakaat (rasio rukuk:sujud diestimasi 1:2).

**Koreksi kamera** (`src/pose.js`, fungsi `judge()`): sudut punggung/lutut + posisi siku/pinggul/kepala, posisi kamera tampak samping.

**Kiblat** (`src/qibla.js`): bearing great-circle ke Ka'bah + sensor orientasi.

**Lokasi** (`src/util.js`): reverse geocoding OpenStreetMap Nominatim, cadangan BigDataCloud, di-cache per ~100 m. Ketuk nama lokasi untuk memperbarui (butuh internet).

---

## Logo & Ikon

**v7:** siluet orang **sujud** tampak samping dengan proporsi lebih halus, di bawah **lengkung mihrab** bercahaya, bulan sabit + bintang di puncaknya, di atas sajadah emas berpola. Tiga titik emas di bahu, pinggul, dan lutut melambangkan pembacaan gerakan oleh sensor/AI; di splash dan layar masuk titik-titik itu berdenyut pelan.

- Sumber tunggal: `tools/logo.py`. Jalankan `python3 tools/logo.py` (butuh `pip install playwright && playwright install chromium`) untuk membuat ulang `public/*` dan seluruh `android-assets/*` (launcher, adaptif, bulat, monokrom Android 13+, splash).
- Logo di dalam aplikasi: fungsi `logo()` di `src/icons.js` (gradien didefinisikan di `index.html`). Jika desain di `tools/logo.py` diubah, sinkronkan juga `logo()`.

---

## Struktur Proyek

```
├─ index.html              # kerangka halaman + definisi gradien logo
├─ src/
│  ├─ main.js              # gerbang login
│  ├─ app.js               # aplikasi utama (beranda, tab)
│  ├─ auth.js              # login (Firebase / mode lokal)
│  ├─ admin.js             # panel admin
│  ├─ config.js            # mode online, daftar admin, LOCAL_ADMIN
│  ├─ firebase.js          # inisialisasi Firebase & Firestore
│  ├─ counter.js           # penghitung rakaat (sensor)
│  ├─ pose.js              # koreksi gerakan kamera (MediaPipe)
│  ├─ qibla.js · dzikir.js # kompas kiblat · dzikir
│  ├─ i18n.js              # teks 4 bahasa
│  ├─ icons.js             # ikon SVG kustom + logo
│  ├─ pwhash.js · util.js  # hash PBKDF2 · helper
│  └─ style.css            # tema putih + hijau zamrud
├─ public/                 # ikon PWA, manifest
├─ android-assets/         # ikon & splash siap pakai untuk Android
├─ scripts/create-admin.mjs# buat akun admin di Firebase
├─ tools/logo.py           # generator logo
├─ firestore.rules         # aturan keamanan Firestore
└─ vercel.json
```

---

## Riwayat Versi

| Versi | Perubahan utama |
|---|---|
| **v7** | Logo sujud didesain ulang (mihrab, sajadah berpola, titik sensor berdenyut), README dirombak + info akun admin |
| v6 | Beranda fokus *Kalibrasi & Kamera AI*, skor gerakan kamera, navigasi bawah baru |
| v5 | Login Firebase (Email, Google), tanggal Masehi + Hijriyah rapi |
| v4 | Login lokal, sapaan beranda, kompas kiblat baru |
| v3 | Tema terang putih + hijau zamrud, nama lokasi asli |
| v2 | Ikon SVG kustom, 4 bahasa |

---

## Catatan Penting

- Koreksi gerakan adalah **alat bantu**, bukan pengganti guru. Validasikan kriteria gerakan dengan ustadz / guru fikih.
- Jangan commit file `.env` (sudah ada di `.gitignore`).
- Kunci Firebase web memang tampil di sisi klien; keamanan data dijaga oleh `firestore.rules`, jadi pastikan rules sudah di-publish.
