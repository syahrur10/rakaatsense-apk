// Uji ml.js: paritas fitur/prediksi dengan Python (fixture ml.golden.json), pelacak urutan, validasi model.  Jalankan: node tools/tests/ml.sim.mjs
import { readFileSync } from 'node:fs';
import { createFeatureStream, predict, validModel, createSequencer, FEATURES } from '../../src/ml.js';
const G = JSON.parse(readFileSync(new URL('./ml.golden.json', import.meta.url)));
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('GAGAL:', m); } else console.log('ok   ', m); };

// 1. fitur dari aliran sampel mentah == fitur Python
const st = createFeatureStream(), feats = [];
for (const [t, x, y, z, r] of G.samples) feats.push(...st.push(t, x, y, z, r));
ok(feats.length === G.features.length, `jumlah jendela sama (${feats.length} vs ${G.features.length})`);
let maxd = 0; feats.forEach((f, i) => f.forEach((v, k) => { maxd = Math.max(maxd, Math.abs(v - G.features[i][k])); }));
ok(maxd < 1e-6, `fitur identik dengan Python (selisih maks ${maxd.toExponential(1)})`);

// 2. probabilitas model == numpy
ok(validModel(G.model), 'model fixture valid');
let maxp = 0; G.features.forEach((f, i) => predict(G.model, f).forEach((v, k) => { maxp = Math.max(maxp, Math.abs(v - G.probs[i][k])); }));
ok(maxp < 1e-6, `probabilitas identik dengan Python (selisih maks ${maxp.toExponential(1)})`);

// 3. pelacak urutan == Python
const sq = createSequencer(G.model.classes); G.probs.forEach((p) => sq.feed(p));
ok(sq.sujud === G.sujud && sq.ruku === G.ruku, `hitungan sama dengan Python (sujud ${sq.sujud}/${G.sujud}, rukuk ${sq.ruku}/${G.ruku})`);

// 4. pelacak pada urutan buatan: 2 rakaat penuh → 4 sujud → 2 rakaat; kedipan 1 jendela tidak dihitung
const C = ['berdiri', 'rukuk', 'itidal', 'sujud', 'duduk', 'tahiyat'], oh = (c) => C.map((x) => (x === c ? 0.9 : 0.02));
const run = (seq) => { const s = createSequencer(C); seq.forEach((c) => s.feed(oh(c))); return s; };
const rk = ['rukuk', 'itidal', 'sujud', 'sujud', 'duduk', 'duduk', 'sujud', 'sujud', 'berdiri', 'berdiri'].flatMap((c) => [c, c, c, c]);
const a = run([...Array(6).fill('berdiri'), ...rk, ...rk, ...Array(4).fill('tahiyat')]);
ok(a.sujud === 4 && a.rakaat === 2, `2 rakaat → 4 sujud (dapat ${a.sujud}, rakaat ${a.rakaat})`);
const b = run([...Array(8).fill('berdiri'), 'sujud', ...Array(8).fill('berdiri')]);
ok(b.sujud === 0, 'satu jendela nyasar tidak dihitung sujud');
const c = createSequencer(C); c.adjust(1); ok(c.rakaat === 1 && c.sujud === 2, 'adjust(+1) = +1 rakaat');

// 5. model rusak ditolak
ok(!validModel(null) && !validModel({}) && !validModel({ ...G.model, features: 3 }) && !validModel({ ...G.model, classes: ['a', 'b', 'c'] }), 'model rusak ditolak');
ok(FEATURES.length === G.model.features, 'jumlah fitur sama');
console.log(fails ? `\n${fails} gagal` : '\nSemua lulus'); process.exit(fails ? 1 : 0);
