/** qibla.js — kompas kiblat: bearing great-circle ke Ka'bah + arah HP dari sensor. Dial memuat 4 mata angin, derajat, dan penanda Ka'bah di bingkai. */
import { $, toast, place } from './util.js';
import { t, hooks } from './i18n.js';
const C = 140;
let bearing = null, on = false, hdg = null, wasOk = false, raf = 0;
const norm = (d) => ((d % 360) + 360) % 360;
const pt = (a, r) => { const x = a * Math.PI / 180; return [+(C + r * Math.sin(x)).toFixed(1), +(C - r * Math.cos(x)).toFixed(1)]; };
const dirName = (d) => t('dir.' + (Math.round(norm(d) / 45) % 8));
const calc = (lat, lon) => { const r = Math.PI / 180, p1 = lat * r, p2 = 21.4225 * r, dl = (39.8262 - lon) * r;
  return (Math.atan2(Math.sin(dl) * Math.cos(p2), Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl)) * 180 / Math.PI + 360) % 360; };

function build() {
  let s = '';
  for (let a = 0; a < 360; a += 5) {
    const big = a % 90 === 0, mid = a % 30 === 0, [x1, y1] = pt(a, 112), [x2, y2] = pt(a, big ? 96 : mid ? 101 : 107);
    s += `<line class="tk${big ? ' k4' : mid ? ' k3' : ''}${a === 0 ? ' kn' : ''}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-linecap="round"/>`;
  }
  for (let a = 30; a < 360; a += 30) if (a % 90) { const [x, y] = pt(a, 86); s += `<text class="dg" data-x="${x}" data-y="${y}" x="${x}" y="${y}">${a}</text>`; }
  [0, 90, 180, 270].forEach((a, i) => { const [x, y] = pt(a, 62); s += `<text class="cd${a === 0 ? ' n' : ''}" id="cd${i}" data-x="${x}" data-y="${y}" x="${x}" y="${y}"></text>`; });
  s += `<g id="kaaba" style="display:none"><path d="M135.5 132L140 90L144.5 132Z" fill="#C9A23F"/><g class="bd"><circle cx="140" cy="16" r="12" fill="#15382B" stroke="#C9A23F" stroke-width="2"/><rect x="134" y="10" width="12" height="12" rx="1.5" fill="#0B241B" stroke="#C9A23F" stroke-width="1.4"/><path d="M134 14.5h12" stroke="#C9A23F" stroke-width="1.4"/></g></g>`;
  $('dial').innerHTML = s;
}
function draw() {
  raf = 0; if (hdg == null || bearing == null) return;
  const h = hdg.toFixed(1), diff = ((bearing - hdg + 540) % 360) - 180, ok = Math.abs(diff) <= 5;
  $('dial').setAttribute('transform', `rotate(${-h} ${C} ${C})`);
  $('dial').querySelectorAll('[data-x]').forEach((e) => e.setAttribute('transform', `rotate(${h} ${e.dataset.x} ${e.dataset.y})`));
  $('qYou').textContent = (Math.round(hdg) % 360) + '°'; $('qYouN').textContent = dirName(hdg);
  $('compass').classList.toggle('ok', ok); $('qTxt').classList.toggle('ok', ok);
  delete $('qTxt').dataset.i;
  $('qTxt').textContent = ok ? t('qb.ok') + ' ✓' : t(diff > 0 ? 'qb.right' : 'qb.left', { d: Math.round(Math.abs(diff)) });
  if (ok && !wasOk) navigator.vibrate?.(40);
  wasOk = ok;
}
function onOri(e) {
  const h = e.webkitCompassHeading ?? (e.alpha != null ? 360 - e.alpha : null); if (h == null || bearing == null) return;
  hdg = hdg == null ? norm(h) : norm(hdg + (((h - hdg + 540) % 360) - 180) * 0.25); // haluskan getaran sensor
  raf ||= requestAnimationFrame(draw);
}
function names() {
  [0, 2, 4, 6].forEach((d, i) => ($('cd' + i).textContent = t('dir.' + d)));
  if (bearing != null) { $('qKib').textContent = Math.round(bearing) + '°'; $('qKibN').textContent = dirName(bearing); }
  draw();
}
function reset() {
  hdg = null; wasOk = false; $('dial').removeAttribute('transform'); $('dial').querySelectorAll('[data-x]').forEach((e) => e.removeAttribute('transform'));
  $('compass').classList.remove('ok'); $('qTxt').classList.remove('ok'); $('qTxt').dataset.i = 'qb.intro'; $('qTxt').textContent = t('qb.intro');
  $('qYou').textContent = '--°'; $('qYouN').textContent = '—';
}
const setBtn = (k) => { $('qBtn').dataset.i = k; $('qBtn').textContent = t(k); };
$('qBtn').onclick = async () => {
  const ev = 'ondeviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation';
  if (on) { window.removeEventListener('deviceorientationabsolute', onOri, true); window.removeEventListener('deviceorientation', onOri, true); on = false; reset(); setBtn('qb.start'); return; }
  try {
    if (typeof DeviceOrientationEvent !== 'undefined' && DeviceOrientationEvent.requestPermission && (await DeviceOrientationEvent.requestPermission()) !== 'granted') throw 0;
    const p = await place(); bearing = calc(p.lat, p.lon); on = true; setBtn('rk.stop');
    $('kaaba').style.display = ''; $('kaaba').setAttribute('transform', `rotate(${bearing.toFixed(1)} ${C} ${C})`); names();
    window.addEventListener(ev, onOri, true);
  } catch { toast(t('qb.err')); }
};
build(); names(); hooks.push(names);
