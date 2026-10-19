Data Al-Qur'an RakaatSense (offline, dimuat per surah oleh src/quran.js)

  sNNN.json     teks Utsmani Hafs 'an 'Asim + aturan tajwid per potongan teks: {n, a:[ayat][[teks,[indeks aturan]]]}
  sNNN.id.json  terjemahan Indonesia per ayat (Al-Qur'an dan Terjemahnya, Kemenag RI, via Tanzil.net)
  sNNN.en.json  terjemahan Inggris per ayat (Saheeh International, via quranenc.com)
  meta.json     daftar 114 surah: nama Arab/Latin/arti, Makkiyah/Madaniyah, jumlah ayat

Sumber & lisensi
  Teks + tajwid : Quran.com (field text_uthmani_tajweed), diproses paket npm `react-native-quran-tajweed` (MIT)
  Terjemahan ID : Tanzil.net (id.indonesian) - syarat: teks tidak boleh diubah, sebutkan sumber
  Terjemahan EN : paket npm `quran-cloud` (CC-BY-4.0), sumber quranenc.com
  Font          : Amiri Quran (SIL OFL 1.1) - lihat public/fonts/AmiriQuran-OFL.txt

Bangun ulang: python3 tools/build-quran.py
