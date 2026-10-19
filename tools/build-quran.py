#!/usr/bin/env python3
"""Bangun ulang data Al-Qur'an di public/quran/ dari paket npm sumbernya (butuh node/npm + internet).
   Pakai:  python3 tools/build-quran.py
   Sumber: react-native-quran-tajweed (teks + tajwid, MIT) · quran-cloud (nama surah, terjemahan EN, CC-BY-4.0) · tanzil (terjemahan ID, Kemenag RI)."""
import json, os, subprocess, tarfile, tempfile, collections, glob

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'quran') + os.sep
os.makedirs(OUT, exist_ok=True)
tmp = tempfile.mkdtemp()
for pkg in ('react-native-quran-tajweed@0.1.3', 'quran-cloud@1.0.0', 'tanzil@0.0.18'):
    subprocess.run(['npm', 'pack', pkg, '--silent'], cwd=tmp, check=True)
for f in glob.glob(tmp + '/*.tgz'):
    with tarfile.open(f) as t: t.extractall(tmp + '/' + os.path.basename(f)[:-4])
TJ = glob.glob(tmp + '/react-native-quran-tajweed*/package/src/data/')[0]
QC = glob.glob(tmp + '/quran-cloud*/package/dist/chapters/')[0]
TZ = glob.glob(tmp + '/tanzil*/package/public/trans-id.txt')[0]

tz = collections.defaultdict(dict)
for l in open(TZ, encoding='utf-8'):
    if '|' in l:
        s, a, t = l.rstrip('\n').split('|', 2); tz[int(s)][int(a)] = t.strip()

def j(path, obj): json.dump(obj, open(path, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
meta = []
for n in range(1, 115):
    t = json.load(open(f'{TJ}surah_{n:03d}.json', encoding='utf-8'))
    qi = json.load(open(f'{QC}id/{n}.json', encoding='utf-8')); qe = json.load(open(f'{QC}en/{n}.json', encoding='utf-8'))
    c = len(t['ayahs']); assert c == len(tz[n]) == len(qe['verses']) == qi['total_verses'], n
    ar = [a['s'] for a in t['ayahs']]
    if n == 32:  # perbaikan data sumber: QS 32:3 memuat karakter '>' nyasar; pulihkan ىٰ + mad thabi'i
        a = ar[2]; i = next(k for k, s in enumerate(a) if s[0].startswith('>')); a[i:i + 1] = [['ٮٰ', [3]], [a[i][0][3:], []]]
    j(f'{OUT}s{n:03d}.json', {'n': n, 'a': ar})
    j(f'{OUT}s{n:03d}.id.json', [tz[n][i + 1] for i in range(c)])
    j(f'{OUT}s{n:03d}.en.json', [v['translation'].strip() for v in qe['verses']])
    meta.append({'n': n, 'ar': qi['name'], 'tr': qi['transliteration'], 'id': qi['translation'], 'en': qe['translation'], 't': 'M' if qi['type'] == 'meccan' else 'D', 'c': c})
j(OUT + 'meta.json', meta)
print('selesai:', sum(m['c'] for m in meta), 'ayat,', len(meta), 'surah')
