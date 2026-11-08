#!/usr/bin/env python3
"""make_golden.py — buat fixture uji paritas JS↔Python: cuplikan sesi mentah + fitur/probabilitas/hitungan versi Python + model.
  python3 tools/ml/make_golden.py sesi.csv model.json tools/tests/ml.golden.json [--rows 1500]
Fixture bawaan di repo dibuat dari data SINTETIS (tools/ml/synth.py) dan hanya untuk menguji kode, bukan untuk menilai akurasi."""
import json, sys, os
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
import features as F
csv_p, model_p, out_p = sys.argv[1:4]; rows = int(sys.argv[sys.argv.index('--rows') + 1]) if '--rows' in sys.argv else 1500
t, a, rot, lab, meta = F.load_csv(csv_p); t, a, rot, lab = t[:rows], a[:rows], rot[:rows], lab[:rows]
X, y, ends = F.session_windows(t, a, rot, lab)
m = json.load(open(model_p))
def fwd(x):
    h = (np.array(x) - np.array(m['mean'])) / np.array(m['std'])
    for i, L in enumerate(m['layers']):
        h = h @ np.array(L['W']) + np.array(L['b'])
        if i < len(m['layers']) - 1: h = np.maximum(0, h)
    e = np.exp(h - h.max()); return e / e.sum()
P = [fwd(x) for x in X]
sj, rk = F.sequence_count(P, m['classes'])
json.dump({'samples': [[float(t[i]), *map(float, a[i]), float(rot[i])] for i in range(len(t))], 'features': X.tolist(), 'probs': [p.tolist() for p in P],
           'sujud': sj, 'ruku': rk, 'model': m}, open(out_p, 'w'), separators=(',', ':'))
print('windows', len(X), 'sujud', sj, 'ruku', rk, '->', out_p)
