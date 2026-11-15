VIDEO OPSIONAL PANDUAN (Mode Datar & Mode Tegak)
================================================
Taruh file di folder ini. Bila ada, panduan memakai video (seperti Saku Baju/Celana); bila tidak, memakai animasi 3D.

  datar.mp4  (+ datar.jpg = poster, bingkai pertama)  -> tab "Mode Datar"
  tegak.mp4  (+ tegak.jpg = poster, bingkai pertama)  -> tab "Mode Tegak"

Format: MP4 H.264, tanpa audio, potret (mis. 368x496), 8-10 detik. Rasio dibaca otomatis dari video.
Kompres: ffmpeg -i in.mp4 -an -vf scale=368:-2 -c:v libx264 -crf 26 -pix_fmt yuv420p -movflags +faststart datar.mp4
Poster:  ffmpeg -i datar.mp4 -frames:v 1 datar.jpg

PROMPT (pakai gambar karakter dari video Saku Baju sebagai referensi karakter)

[Mode Datar]
Animasi 3D gaya Pixar, karakter yang sama: pria berbaju koko hijau berkerah, saku dada, peci hitam berpita perak, celana jeans navy tergulung, kaki telanjang. Interior masjid hangat, cahaya jendela di kiri, mihrab kayu berukir di belakang, lantai kayu. Kamera diam, tampak samping setinggi badan. Ia berjongkok, merebahkan HP di sajadah dengan layar menghadap ke atas, menaruhnya sejajar dada (sedikit di depan lutut), lalu berdiri tegak dan mengangguk puas. Gerakan halus, tanpa teks, tanpa suara.

[Mode Tegak]
Animasi 3D gaya Pixar, karakter, pakaian, dan ruangan yang sama seperti di atas. Ia menaruh HP bersandar miring di lantai depan sajadah (jarak sekitar 1-1,5 meter di depannya), layar menghadap ke dirinya, lalu mundur ke sajadah, berdiri tegak menghadap kiblat dengan kepala sampai pinggul terlihat jelas, dan menunjukkan jempol. Kamera diam, tanpa teks, tanpa suara.
