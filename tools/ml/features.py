"""features.py — pembuat fitur jendela dari CSV rekaman. HARUS identik dengan src/ml.js (diuji lewat tools/tests/ml.sim.mjs).
CSV: t_ms,ax,ay,az,rx,ry,rz,label,pos,subject,session   (dibuat oleh halaman "Rekam Data" di aplikasi)"""
import csv, glob, os
import numpy as np

HZ, BIN, WIN, HOP, CAL, ALPHA, G = 20, 50.0, 40, 10, 60, 0.3, 9.81
CLASSES = ['berdiri', 'rukuk', 'itidal', 'sujud', 'duduk', 'tahiyat']
FEATURES = ['ang_mean', 'ang_std', 'ang_min', 'ang_max', 'ang_last', 'ang_slope', 'dpar_mean', 'dpar_std', 'dperp_mean', 'dperp_std',
            'dyn_mean', 'dyn_std', 'dyn_max', 'gyro_mean', 'gyro_std', 'gyro_max']
SEQ_SMOOTH, SEQ_HOLD = 3, 2


def load_csv(path):
    with open(path, newline='') as f:
        rd = csv.DictReader(f)
        rows = [r for r in rd]
    t = np.array([float(r['t_ms']) for r in rows])
    a = np.array([[float(r['ax']), float(r['ay']), float(r['az'])] for r in rows])
    rot = np.array([np.sqrt(float(r['rx']) ** 2 + float(r['ry']) ** 2 + float(r['rz']) ** 2) for r in rows])
    lab = [r['label'] for r in rows]
    meta = {k: rows[0].get(k, '') for k in ('pos', 'subject', 'session')}
    return t, a, rot, lab, meta


def to_bins(t, a, rot, lab):
    """Rata-rata per bin 50 ms; bin kosong mengulang bin sebelumnya; bin terakhir (belum tertutup) dibuang — sama seperti aliran di JS."""
    k = np.floor((t - t[0]) / BIN).astype(int)
    kmax = k[-1]
    A, R, L = [], [], []
    for j in range(kmax):
        m = k == j
        if m.any():
            A.append(a[m].mean(axis=0)); R.append(rot[m].mean()); L.append(np.array(lab, dtype=object)[m][-1])
        else:
            A.append(A[-1]); R.append(R[-1]); L.append(L[-1])
    return np.array(A), np.array(R), L


def series(A, R):
    base = A[:CAL].mean(axis=0)
    bh = base / (np.linalg.norm(base) or 1)
    g = np.zeros_like(A); g[0] = A[0]
    for i in range(1, len(A)):
        g[i] = g[i - 1] * (1 - ALPHA) + A[i] * ALPHA
    d = g - base
    p = d @ bh
    q = np.maximum(0, (d * d).sum(axis=1) - p * p)
    den = np.linalg.norm(g, axis=1) * np.linalg.norm(base)
    den[den == 0] = 1
    ang = np.degrees(np.arccos(np.clip((g @ base) / den, -1, 1)))
    dyn = np.linalg.norm(A - g, axis=1)
    return dict(ang=ang, dpar=p / G, dperp=np.sqrt(q) / G, dyn=dyn, gy=R)


def window_features(s):
    a = s['ang']
    return [a.mean(), a.std(), a.min(), a.max(), a[-1], a[-5:].mean() - a[:5].mean(),
            s['dpar'].mean(), s['dpar'].std(), s['dperp'].mean(), s['dperp'].std(),
            s['dyn'].mean(), s['dyn'].std(), s['dyn'].max(), s['gy'].mean(), s['gy'].std(), s['gy'].max()]


def session_windows(t, a, rot, lab, min_purity=0.6):
    """-> X (n,16), y (label mayoritas atau None), idx_end. Jendela berakhir di bin e dengan (e+1-WIN)%HOP==0 dan e>=CAL-1."""
    A, R, L = to_bins(t, a, rot, lab)
    if len(A) < CAL:
        return np.zeros((0, len(FEATURES))), [], []
    S = series(A, R)
    X, y, ends = [], [], []
    for e in range(CAL - 1, len(A)):
        if e < WIN - 1 or (e + 1 - WIN) % HOP:
            continue
        s = e - WIN + 1
        X.append(window_features({k: v[s:e + 1] for k, v in S.items()}))
        ls = L[s:e + 1]
        top = max(set(ls), key=ls.count)
        y.append(top if ls.count(top) / WIN >= min_purity else None)
        ends.append(e)
    return np.array(X), y, ends


def bin_labels(lab_bins):
    return lab_bins


def count_sujud_true(t, lab):
    """Jumlah segmen 'sujud' pada label asli (acuan hitungan)."""
    n, prev = 0, None
    for l in lab:
        if l == 'sujud' and prev != 'sujud':
            n += 1
        prev = l
    return n


def sequence_count(probs, classes):
    """Cermin createSequencer di ml.js → (sujud, ruku)."""
    recent, cur = [], 'berdiri' if 'berdiri' in classes else classes[0]
    cand, cn, sujud, ruku = None, 0, 0, 0
    for p in probs:
        recent.append(p)
        if len(recent) > SEQ_SMOOTH: recent.pop(0)
        avg = np.mean(recent, axis=0)
        lab = classes[int(np.argmax(avg))]
        if lab == cur:
            cand, cn = None, 0; continue
        if lab == cand: cn += 1
        else: cand, cn = lab, 1
        if cn < SEQ_HOLD: continue
        prev, cur, cand, cn = cur, lab, None, 0
        if lab == 'sujud' and prev != 'sujud': sujud += 1
        if lab == 'rukuk' and prev != 'rukuk': ruku += 1
    return sujud, ruku


def load_dir(d):
    """-> daftar sesi: dict(X,y,subject,session,pos,true_sujud)"""
    out = []
    for p in sorted(glob.glob(os.path.join(d, '*.csv'))):
        t, a, rot, lab, meta = load_csv(p)
        X, y, _ = session_windows(t, a, rot, lab)
        out.append(dict(X=X, y=y, file=os.path.basename(p), true_sujud=count_sujud_true(t, lab), **meta))
    return out
