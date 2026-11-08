Folder model Machine Learning RakaatSense
=========================================
Aplikasi mencari berkas ini (urutan): model/gerakan-shirt.json | model/gerakan-pants.json (sesuai posisi HP), lalu model/gerakan.json.
Bila tidak ada / tidak valid, aplikasi memakai penghitung ambang lama (counter.js). Jadi folder ini boleh kosong.

Cara membuat berkas model dari data rekaman (CSV dari halaman Akun > Kontribusi Data Penelitian):
  pip install numpy scikit-learn
  python3 tools/ml/train.py data/ --pos shirt --out public/model/gerakan-shirt.json
  python3 tools/ml/train.py data/ --pos pants --out public/model/gerakan-pants.json
Skrip mencetak evaluasi lintas-orang (Leave-One-Subject-Out) dan menulis *.report.json di sebelah model.
JANGAN menaruh model yang dilatih dari data sintetis (tools/ml/synth.py) di sini untuk pengguna sungguhan.
