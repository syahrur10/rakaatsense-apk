/** qibla.js — kompas kiblat: bearing great-circle ke Ka'bah + arah HP dari sensor orientasi. */
import { $, toast, place } from './util.js';
import { t, hooks } from './i18n.js';
let bearing = null, on = false;
const calc = (lat, lon) => { const r = Math.PI / 180, p1 = lat * r, p2 = 21.4225 * r, dl = (39.8262 - lon) * r;
  return (Math.atan2(Math.sin(dl) * Math.cos(p2), Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl)) * 180 / Math.PI + 360) % 360; };
function onOri(e) {
  const h = e.webkitCompassHeading ?? (e.alpha != null ? 360 - e.alpha : null); if (h == null || bearing == null) return;
  $('dial').style.transform = `rotate(${-h}deg)`; $('kaaba').setAttribute('transform', `rotate(${bearing} 100 100)`);
  const ok = Math.abs(((bearing - h + 540) % 360) - 180) > 175; $('compass').classList.toggle('ok', ok);
  delete $('qTxt').dataset.i; $('qTxt').textContent = ok ? t('qb.ok') + ' ✓' : t('qb.deg', { d: Math.round(bearing) });
}
const setBtn = (k) => { $('qBtn').dataset.i = k; $('qBtn').textContent = t(k); };
$('qBtn').onclick = async () => {
  if (on) { window.removeEventListener('deviceorientationabsolute', onOri, true); window.removeEventListener('deviceorientation', onOri, true); on = false; setBtn('qb.start'); return; }
  try {
    if (typeof DeviceOrientationEvent !== 'undefined' && DeviceOrientationEvent.requestPermission && (await DeviceOrientationEvent.requestPermission()) !== 'granted') throw 0;
    const p = await place(); bearing = calc(p.lat, p.lon); on = true; setBtn('rk.stop');
    window.addEventListener('ondeviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation', onOri, true);
  } catch { toast(t('qb.err')); }
};
hooks.push(() => ($('qN').textContent = t('qb.n'))); $('qN').textContent = t('qb.n');
