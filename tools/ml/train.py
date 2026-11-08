#!/usr/bin/env python3
"""train.py — latih pengenal gerakan shalat dari rekaman CSV, evaluasi lintas-orang (Leave-One-Subject-Out), ekspor model untuk aplikasi.

  pip install numpy scikit-learn
  python3 tools/ml/train.py data/ --pos shirt --out public/model/gerakan-shirt.json

Evaluasi yang dilaporkan (untuk laporan/proposal):
  1. Tingkat jendela : akurasi & macro-F1 MLP vs pembanding "ambang sudut" (pohon keputusan kecil hanya dari sudut).
  2. Tingkat hitungan: selisih jumlah sujud (MAE) hasil pelacak vs jumlah sebenarnya dari label, per sesi yang tidak ikut dilatih.
Pembanding ini adalah pendekatan satu-fitur yang dilatih dari data yang sama, BUKAN counter.js; untuk membandingkan dengan counter.js
rekam sesi nyata dan catat hitungan counter.js secara manual."""
import argparse, json, sys, os, datetime
import numpy as np
from sklearn.neural_network import MLPClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import f1_score, accuracy_score, confusion_matrix
sys.path.insert(0, os.path.dirname(__file__))
import features as F

ap = argparse.ArgumentParser()
ap.add_argument('data'); ap.add_argument('--pos', default='all', choices=['all', 'shirt', 'pants'])
ap.add_argument('--out', default='public/model/gerakan.json'); ap.add_argument('--hidden', default='32,16'); ap.add_argument('--seed', type=int, default=7)
a = ap.parse_args()
H = tuple(int(x) for x in a.hidden.split(','))

S = [s for s in F.load_dir(a.data) if len(s['X']) and (a.pos == 'all' or s['pos'] == a.pos)]
if not S: sys.exit('Tidak ada sesi CSV yang cocok di ' + a.data)
for s in S:  # buang jendela tanpa label kelas (kalibrasi / campuran)
    k = [i for i, l in enumerate(s['y']) if l in F.CLASSES]
    s['X'], s['y'] = s['X'][k], [s['y'][i] for i in k]
subjects = sorted({s['subject'] for s in S})
classes = [c for c in F.CLASSES if any(c in s['y'] for s in S)]
print(f'{len(S)} sesi, {len(subjects)} relawan, kelas: {classes}')
AI = [F.FEATURES.index('ang_mean')]

def fit_mlp(X, y):
    sc = StandardScaler().fit(X); m = MLPClassifier(H, max_iter=800, random_state=a.seed, early_stopping=len(X) > 200).fit(sc.transform(X), y); return sc, m
def probs(sc, m, X):
    P = m.predict_proba(sc.transform(X)); out = np.zeros((len(X), len(classes)))
    for j, c in enumerate(m.classes_): out[:, classes.index(c)] = P[:, j]
    return out

rep = {'sessions': len(S), 'subjects': len(subjects), 'classes': classes, 'loso': None}
if len(subjects) >= 2:
    yt, ym, yb, cnt = [], [], [], []
    for sub in subjects:
        tr = [s for s in S if s['subject'] != sub]; te = [s for s in S if s['subject'] == sub]
        Xtr = np.vstack([s['X'] for s in tr]); ytr = sum((s['y'] for s in tr), [])
        sc, m = fit_mlp(Xtr, ytr); bt = DecisionTreeClassifier(max_depth=3, random_state=a.seed).fit(Xtr[:, AI], ytr)
        for s in te:
            Pm = probs(sc, m, s['X']); yt += s['y']; ym += [classes[i] for i in Pm.argmax(1)]
            Pb = np.zeros_like(Pm)
            for j, c in enumerate(bt.classes_): Pb[:, classes.index(c)] = bt.predict_proba(s['X'][:, AI])[:, j]
            yb += [classes[i] for i in Pb.argmax(1)]
            cnt.append((s['true_sujud'], F.sequence_count(Pm, classes)[0], F.sequence_count(Pb, classes)[0]))
    cnt = np.array(cnt); rep['loso'] = {
        'windows': len(yt),
        'mlp': {'acc': accuracy_score(yt, ym), 'macro_f1': f1_score(yt, ym, average='macro')},
        'ambang_sudut': {'acc': accuracy_score(yt, yb), 'macro_f1': f1_score(yt, yb, average='macro')},
        'sujud_mae': {'mlp': float(np.abs(cnt[:, 0] - cnt[:, 1]).mean()), 'ambang_sudut': float(np.abs(cnt[:, 0] - cnt[:, 2]).mean())},
        'rakaat_mae_approx': {'mlp': float(np.abs(cnt[:, 0] - cnt[:, 1]).mean() / 2), 'ambang_sudut': float(np.abs(cnt[:, 0] - cnt[:, 2]).mean() / 2)},
        'confusion_mlp': {'labels': classes, 'matrix': confusion_matrix(yt, ym, labels=classes).tolist()}}
    L = rep['loso']; print(f"LOSO ({L['windows']} jendela)  MLP: acc {L['mlp']['acc']:.3f} F1 {L['mlp']['macro_f1']:.3f} | ambang-sudut: acc {L['ambang_sudut']['acc']:.3f} F1 {L['ambang_sudut']['macro_f1']:.3f}")
    print(f"MAE sujud/sesi  MLP {L['sujud_mae']['mlp']:.2f} | ambang-sudut {L['sujud_mae']['ambang_sudut']:.2f}   (rakaat ≈ setengahnya)")
    print('Confusion MLP', L['confusion_mlp']['labels']); [print('  ', r) for r in L['confusion_mlp']['matrix']]
else:
    print('PERINGATAN: hanya 1 relawan, evaluasi lintas-orang dilewati. Kumpulkan data dari lebih banyak orang.')

X = np.vstack([s['X'] for s in S]); y = sum((s['y'] for s in S), [])
sc, m = fit_mlp(X, y)
order = [list(m.classes_).index(c) for c in classes]  # urutan keluaran model = urutan `classes`
layers = []
for i, (W, b) in enumerate(zip(m.coefs_, m.intercepts_)):
    if i == len(m.coefs_) - 1:
        W, b = W[:, order], b[order]
        if len(classes) == 2: raise SystemExit('Butuh >= 3 kelas')
    layers.append({'W': np.round(W, 6).tolist(), 'b': np.round(b, 6).tolist(), 'act': 'relu' if i < len(m.coefs_) - 1 else 'softmax'})
model = {'version': 1, 'classes': classes, 'features': len(F.FEATURES), 'feature_names': F.FEATURES, 'mean': np.round(sc.mean_, 6).tolist(), 'std': np.round(sc.scale_, 6).tolist(), 'layers': layers,
         'meta': {'pos': a.pos, 'windows': int(len(X)), 'subjects': len(subjects), 'trained': datetime.date.today().isoformat(), 'loso': rep['loso'] and {'macro_f1': rep['loso']['mlp']['macro_f1']}}}
os.makedirs(os.path.dirname(a.out) or '.', exist_ok=True)
json.dump(model, open(a.out, 'w'), separators=(',', ':'))
json.dump(rep, open(os.path.splitext(a.out)[0] + '.report.json', 'w'), indent=1)
print('Model ->', a.out, f'({os.path.getsize(a.out) // 1024} KB)')
