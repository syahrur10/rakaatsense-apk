import { createTracker } from '../../src/rakaat.js';
// y koordinat sendi (tampak samping = tinggi vertikal, sama dengan yang dilihat kamera depan): C kepala, S bahu, H pinggul
const P = { q:{C:12,S:24,H:63}, r:{C:62,S:66,H:66}, k:{C:44,S:56,H:93}, s:{C:119,S:101,H:91}, d:{C:56,S:68,H:106} };
const ease = (x) => x*x*x*(x*(6*x-15)+10);
const L = (a,b,k)=>a+(b-a)*k;
const unit = P.q.H - P.q.C, tor0 = P.q.H - P.q.S;
function run(steps, {target, noise=0, hideWhen=()=>false, seed=1}={}) {
  let rnd = seed; const R = () => (rnd = (rnd*16807)%2147483647)/2147483647-0.5;
  const ev = []; const tr = createTracker({ target, onEvent: (e)=>ev.push({...e, t:Math.round(t)}) });
  let t = 0, prev = P[steps[steps.length-1].p];
  const total = steps.reduce((s,x)=>s+x.move+x.hold,0);
  for (t=0; t<total; t+=90) {
    let u=t, i=0; for(;i<steps.length-1;i++){const d=steps[i].move+steps[i].hold; if(u<d)break; u-=d;}
    const st=steps[i], pv=steps[(i+steps.length-1)%steps.length].p, k=st.move?ease(Math.min(1,u/st.move)):1;
    const a=P[pv], b=P[st.p]; const S=L(a.S,b.S,k)+noise*R()*unit, H=L(a.H,b.H,k), C=L(a.C,b.C,k);
    const f = hideWhen(t,st.p,k) ? null : { d:(S-P.q.S)/unit, tr:Math.abs(S-H)/tor0 };
    tr.feed(t, f);
  }
  return { ev, snap: tr.snapshot() };
}
const rak = (end='stand') => [
  {p:'r',move:900,hold:800},{p:'q',move:800,hold:400},{p:'k',move:800,hold:0},{p:'s',move:700,hold:800},
  {p:'d',move:750,hold:700},{p:'s',move:650,hold:800},{p:'k',move:650,hold:0},
  end==='sit' ? {p:'d',move:750,hold:2600} : {p:'q',move:850,hold:800},
];
const seq = (...parts) => [{p:'q',move:0,hold:1500}, ...parts.flat()];
const show = (name, r) => console.log(name.padEnd(34), JSON.stringify(r.snap), r.ev.filter(e=>!['sujud','ruku'].includes(e.type)).map(e=>e.type+(e.n?e.n:'')+(e.why?'('+e.why+')':'')+'@'+e.t).join(' '));
// 1. subuh 2 rakaat normal (rakaat 2 diakhiri duduk)
show('2 rakaat normal (target 2)', run(seq(rak(), rak('sit')), {target:2}));
// 2. 4 rakaat normal
show('4 rakaat normal (target 4)', run(seq(rak(), rak('sit'), rak(), rak('sit')), {target:4}));
// 3. lupa: sudah 2 rakaat (target 2) lalu berdiri
show('lupa: berdiri lagi stlh target', run(seq(rak(), rak('sit'), [{p:'q',move:900,hold:1500}]), {target:2}));
// 4. rakaat tambahan sampai rukuk
show('rakaat tambahan + rukuk', run(seq(rak(), rak('sit'), [{p:'q',move:900,hold:600}], rak('sit')), {target:2}));
// 5. berhenti setelah 3 dari 4 (duduk lama)
show('baru 3 dari 4, duduk lama', run(seq(rak(), rak('sit'), rak('sit'), [{p:'d',move:100,hold:50000}]), {target:4}));
// 6. derau pada bahu 4% unit
show('2 rakaat + derau 4%', run(seq(rak(), rak('sit')), {target:2, noise:0.04}));
// 7. badan hilang saat turun (sujud di luar bingkai)
show('hilang saat sujud (infer)', run(seq(rak(), rak('sit')), {target:2, hideWhen:(t,p)=>p==='s'}));
// 8. hilang saat rukuk->sujud saja
show('hilang hanya saat sujud #2', run(seq(rak(), rak('sit')), {target:2, hideWhen:(t,p,k)=>p==='s'&&k>0.5}));
