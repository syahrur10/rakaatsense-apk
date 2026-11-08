#!/usr/bin/env python3
"""synth.py — pembuat data SINTETIS hanya untuk menguji pipeline (rekam → fitur → latih → ekspor → aplikasi).
JANGAN dipakai sebagai data penelitian dan JANGAN menyebarkan model hasilnya: gerakan dibuat dari rumus, bukan dari orang shalat."""
import argparse, csv, os
import numpy as np
ap = argparse.ArgumentParser(); ap.add_argument('out'); ap.add_argument('--subjects', type=int, default=4); ap.add_argument('--sessions', type=int, default=3); ap.add_argument('--seed', type=int, default=1)
a = ap.parse_args(); rng = np.random.default_rng(a.seed); os.makedirs(a.out, exist_ok=True)
ANG = {'berdiri': 4, 'rukuk': 70, 'itidal': 8, 'sujud': 105, 'duduk': 55, 'tahiyat': 50}
def plan(n):
    p = [('kalibrasi', 3)]
    for i in range(1, n + 1):
        p += [('berdiri', 4 if i == 1 else 3), ('rukuk', 3), ('itidal', 2.5), ('sujud', 3), ('duduk', 2), ('sujud', 3)]
        if i == 2 and n > 2: p.append(('tahiyat', 3))
    return p + [('tahiyat', 4)]
for s in range(a.subjects):
    up = rng.normal(size=3); up /= np.linalg.norm(up)                  # arah HP di saku berbeda tiap orang
    ax_ = np.cross(up, rng.normal(size=3)); ax_ /= np.linalg.norm(ax_)  # sumbu putar badan
    scale = rng.uniform(0.85, 1.15)
    for k in range(a.sessions):
        t, rows, ang_prev = 0.0, [], 0.0
        for lab, dur in plan(int(rng.integers(2, 5))):
            dur *= rng.uniform(0.8, 1.3); target = ANG.get(lab, 0) * scale + rng.normal(0, 4)
            for _ in range(int(dur * 60)):
                ang_prev += (target - ang_prev) * 0.08; th = np.radians(ang_prev)
                g = 9.81 * (up * np.cos(th) + np.cross(ax_, up) * np.sin(th) + ax_ * (ax_ @ up) * (1 - np.cos(th)))
                mov = abs(target - ang_prev) / 30; acc = g + rng.normal(0, 0.05 + 0.4 * mov, 3); rot = rng.normal(0, 2 + 40 * mov, 3)
                rows.append([f'{t:.1f}', *[f'{v:.3f}' for v in acc], *[f'{v:.3f}' for v in rot], lab, 'shirt', f'S{s:02d}', f'{s}_{k}']); t += 1000 / 60 * rng.uniform(0.9, 1.1)
        with open(os.path.join(a.out, f'S{s:02d}_{k}.csv'), 'w', newline='') as f:
            w = csv.writer(f); w.writerow(['t_ms', 'ax', 'ay', 'az', 'rx', 'ry', 'rz', 'label', 'pos', 'subject', 'session']); w.writerows(rows)
print('CSV sintetis ->', a.out)
