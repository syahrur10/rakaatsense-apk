/** rakaat.js — mesin keadaan penghitung rakaat dari kamera (HP di lantai DEPAN orang shalat, tampak depan).
 *  Murni (tanpa DOM) supaya bisa diuji. Masukan tiap bingkai: { d, tr } atau null bila badan tidak terlihat.
 *    d  = seberapa jauh bahu turun dari posisi berdiri saat kalibrasi, dalam satuan "jarak hidung→pinggul" (berdiri ≈ 0, rukuk ≈ 0,8, duduk ≈ 0,85, sujud ≈ 1,5)
 *    tr = panjang vertikal bahu→pinggul dibanding saat berdiri (berdiri 1, duduk ≈ 1, rukuk ≈ 0 karena badan condong ke kamera)
 *  Rakaat dihitung dari SUJUD: dua sujud (dipisah duduk) = 1 rakaat, dihitung saat orang bangkit dari sujud ke-2.
 *  Tujuannya bukan menilai gerakan, hanya mencegah lupa jumlah rakaat. Ambang ada di TH dan bisa disetel. */
export const TH = {
  lo: [0.22, 0.3],   // [masuk "berdiri", keluar dari "berdiri"]
  hi: [1.05, 0.9],   // [masuk "sujud", bertahan di "sujud"]
  rukuTorso: 0.55,   // tr di bawah ini = rukuk, di atas = duduk
  hold: { stand: 350, ruku: 500, sit: 600, sujud: 350 }, // lama minimal (ms) sebelum perubahan posisi dianggap sah
  gone: 400,         // badan hilang selama ini (ms) → disimpulkan sedang turun (sujud) bila masuk akal
  extraWin: 30000,   // berdiri dalam jangka ini setelah rakaat target selesai = peringatan "rakaat tambahan"
  shortSit: 45000,   // duduk selama ini sebelum target tercapai = peringatan "baru N dari M"
  lostAfter: 20000,  // badan tidak terlihat selama ini = peringatan
};

/** @param {{target:number, onEvent?:(e:{type:string,[k:string]:any})=>void, th?:object}} o */
export function createTracker({ target, onEvent = () => {}, th = TH }) {
  let state = 'stand', stateT = 0, cand = 'stand', candT = 0, started = false;
  let sujudN = 0, rukuN = 0, rakaat = 0, lastRakaatT = 0, extraFlag = false, shortFlag = false;
  let goneT = null, lostFlag = false, lastSeenT = 0;
  const emit = (type, extra = {}) => onEvent({ type, ...extra });

  /** posisi mentah dari satu bingkai, dengan histeresis supaya tidak bolak-balik di dekat ambang */
  function raw(f) {
    const lo = state === 'stand' ? th.lo[1] : th.lo[0], hi = state === 'sujud' ? th.hi[1] : th.hi[0];
    if (f.d < lo) return 'stand';
    if (f.d >= hi) return 'sujud';
    return f.tr < th.rukuTorso + (state === 'ruku' ? 0.08 : 0) ? 'ruku' : 'sit';
  }
  /** badan hilang dari bingkai: kemungkinan besar sedang turun ke sujud bila sebelumnya rukuk (sujud ke-1) atau duduk di antara dua sujud (sujud ke-2) */
  const inferLow = () => (state === 'ruku' && sujudN % 2 === 0) || (state === 'sit' && sujudN % 2 === 1);

  function commit(next, now) {
    const prev = state; state = next; stateT = now;
    if (next === 'sujud') { sujudN++; emit('sujud', { n: sujudN }); }
    if (prev === 'sujud' && next !== 'sujud' && sujudN % 2 === 0) { // bangkit dari sujud ke-2 = rakaat selesai
      rakaat = sujudN / 2; lastRakaatT = now; extraFlag = false; shortFlag = false;
      emit('rakaat', { n: rakaat, target, final: rakaat === target, over: rakaat > target });
    }
    if (next === 'ruku' && prev === 'stand') {
      rukuN++; emit('ruku', { n: rukuN });
      if (rakaat >= target && rakaat > 0 && !extraFlag) { extraFlag = true; emit('extra', { n: rakaat, target, why: 'ruku' }); }
    }
    if (next === 'stand' && prev !== 'stand' && rakaat >= target && rakaat > 0 && now - lastRakaatT <= th.extraWin && !extraFlag) {
      extraFlag = true; emit('extra', { n: rakaat, target, why: 'stand' });
    }
  }

  return {
    /** @param {number} now ms (monoton) @param {{d:number,tr:number}|null} f */
    feed(now, f) {
      if (!started) { started = true; stateT = candT = now; lastSeenT = now; }
      let r = cand;
      if (f) {
        lastSeenT = now; goneT = null;
        if (lostFlag) { lostFlag = false; emit('found'); }
        r = raw(f);
      } else {
        goneT ??= now;
        if (now - goneT >= th.gone && inferLow()) r = 'sujud'; // selain itu: tahan posisi terakhir
        if (state !== 'sujud' && now - goneT >= th.lostAfter && !lostFlag) { lostFlag = true; emit('lost'); }
      }
      if (r !== cand) { cand = r; candT = now; }
      if (cand !== state && now - candT >= th.hold[cand]) commit(cand, now);
      if (state === 'sit' && rakaat >= 1 && rakaat < target && !shortFlag && now - stateT > th.shortSit) { shortFlag = true; emit('short', { n: rakaat, target }); }
    },
    get state() { return state; },
    get rakaat() { return rakaat; },
    get ruku() { return rukuN; },
    get sujud() { return sujudN; },
    get lastRakaatT() { return lastRakaatT; },
    unseenFor: (now) => (goneT == null ? 0 : now - goneT),
    snapshot: () => ({ rakaat, ruku: rukuN, sujud: sujudN, state, target }),
  };
}

/** Kapan pemantauan dianggap selesai (murni, bisa diuji). Mengembalikan 'done' | 'away' | 'idle' | 'max' | null.
 *  - done : target rakaat tercapai, lalu orang berdiri/pergi (setelah jendela peringatan "rakaat tambahan") atau lewat DONE.after
 *  - away : badan tidak terlihat lama (HP diambil / orang pergi)
 *  - idle : tidak ada perubahan gerakan sama sekali selama DONE.idle padahal sudah ada sujud (mis. selesai tapi hitungan kurang)
 *  - max  : batas waktu keseluruhan */
export const DONE = { quick: 30000, after: 45000, away: 120000, idle: 150000, max: 90 * 60000, awayAfterDone: 5000 };
export function finishReason({ now, startT, rakaat, target, lastRakaatT, state, unseen, sujud, lastChangeT, extraSince }, d = DONE) {
  if (rakaat >= target && rakaat > 0) {
    const since = now - lastRakaatT;
    if (since > d.after) return 'done';
    if (since > d.quick && !extraSince && (state === 'stand' || unseen > d.awayAfterDone)) return 'done';
  }
  if (unseen > d.away) return 'away';
  if (sujud > 0 && now - lastChangeT > d.idle) return 'idle';
  if (now - startT > d.max) return 'max';
  return null;
}
