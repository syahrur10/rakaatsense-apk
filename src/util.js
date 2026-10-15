import { ONLINE, LOCAL_ADMIN } from './config.js';
export const $ = (id) => document.getElementById(id), z = (n) => String(n).padStart(2, '0');
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
/* Penyimpanan. Kunci global (bahasa, daftar akun, sesi) dipakai bersama; data ibadah dipisah per akun. Tamu memakai kunci lama (tanpa awalan). */
const GLOBAL = ['rs.lang', 'rs.users', 'rs.session'];
const raw = {
  get: (k, f) => { try { return JSON.parse(localStorage.getItem(k)) ?? f; } catch { return f; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del: (k) => { try { localStorage.removeItem(k); } catch {} },
};
export const gstore = raw;
export const session = () => raw.get('rs.session', null);
export const logout = () => { raw.del('rs.session'); const done = () => location.reload(); if (ONLINE) import('./firebase.js').then((m) => m.signOut()).catch(() => {}).finally(done); else done(); };
/** Admin sah: mode online → peran dari sesi (diverifikasi ulang di main.js); mode lokal → akun admin bawaan atau akun yang dijadikan admin (peran tersimpan). */
export const isAdmin = () => { const s = session(); return !!s && s.role === 'admin' && (ONLINE || s.id === LOCAL_ADMIN.email || raw.get('rs.users', {})[s.id]?.role === 'admin'); };
const ns = (k) => { const s = session(); return GLOBAL.includes(k) || !s || s.id === 'guest' ? k : `u.${s.id}.${k}`; };
export const store = { get: (k, f) => raw.get(ns(k), f), set: (k, v) => { raw.set(ns(k), v); if (k === 'rs.log' || k === 'rs.dz') syncStats(); } };
/* Mode online: ringkasan data ibadah (30 hari) dikirim ke server agar bisa dilihat admin. Tamu tidak dikirim. */
const last30 = (o) => { const r = {}; for (let i = 0; i < 30; i++) { const d = new Date(); d.setDate(d.getDate() - i); const k = dayKey(d); if (o[k]) r[k] = o[k]; } return r; };
let syncT;
export function syncStats(delay = 4000) {
  const s = session(); if (!ONLINE || !s || s.id === 'guest') return;
  clearTimeout(syncT);
  syncT = setTimeout(() => {
    const log = store.get('rs.log', {}), dz = store.get('rs.dz', {}), d30 = {};
    Object.entries(last30(dz)).forEach(([k, v]) => (d30[k] = { total: v.total, items: v.items }));
    import('./firebase.js').then((m) => m.pushStats(s.id, { log: last30(log), dz: d30, dzTotal: Object.values(dz).reduce((a, d) => a + (d.total || 0), 0), at: Date.now() })).catch(() => {});
  }, delay);
}
let tt, ac;
export function toast(msg, ok) { const t = $('toast'); t.textContent = msg; t.className = 'toast' + (ok ? ' ok' : ''); t.hidden = false; clearTimeout(tt); tt = setTimeout(() => (t.hidden = true), 5000); }
export function speak(s, l = 'id') { if ('speechSynthesis' in window) { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(s); u.lang = { id: 'id-ID', en: 'en-US', ar: 'ar-SA', ms: 'ms-MY' }[l] || 'en-US'; speechSynthesis.speak(u); } }
export function beep(f = 660) { ac ||= new AudioContext(); const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = f; g.gain.value = 0.2; o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + 0.3); }
export const place = () => new Promise((res) => navigator.geolocation ? navigator.geolocation.getCurrentPosition((p) => res({ lat: p.coords.latitude, lon: p.coords.longitude, ok: true }), () => res({ lat: -6.2088, lon: 106.8456 }), { timeout: 12000, enableHighAccuracy: true, maximumAge: 60000 }) : res({ lat: -6.2088, lon: 106.8456 }));

/* ---- Nama lokasi asli (kelurahan, kecamatan, kota) lewat reverse geocoding ---- */
const clean = (s) => (s || '').replace(/^(Kelurahan|Kecamatan|Desa|Kota Administrasi|Kota)\s+/i, '').replace(/^Kabupaten\s+/i, 'Kab. ').trim();
const junk = (s) => !s || /^(RT|RW|Dusun|Dukuh)\b/i.test(s) || /^[\d\s./-]+$/.test(s);
const uniq = (a) => a.filter((x, i) => x && a.findIndex((y) => y.toLowerCase() === x.toLowerCase()) === i);
function fromNominatim(a = {}) {
  const small = uniq([a.village, a.hamlet, a.neighbourhood, a.quarter, a.suburb, a.city_district, a.district, a.subdistrict].map(clean).filter((x) => !junk(x))).slice(0, 2);
  const city = clean(a.city || a.town || a.municipality || a.county || a.regency || a.state_district || a.state);
  return uniq([...small, city]).join(', ');
}
async function getJSON(url) { const c = new AbortController(), id = setTimeout(() => c.abort(), 7000); try { const r = await fetch(url, { signal: c.signal }); if (!r.ok) throw 0; return await r.json(); } finally { clearTimeout(id); } }
export async function placeName(lat, lon) {
  const key = 'rs.pn.' + lat.toFixed(3) + ',' + lon.toFixed(3), hit = store.get(key); if (hit) return hit;
  let name = '';
  try { name = fromNominatim((await getJSON(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=16&accept-language=id&lat=${lat}&lon=${lon}`)).address); } catch {}
  if (!name) try { const d = await getJSON(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=id`); name = uniq([clean(d.locality), clean(d.city || d.principalSubdivision)]).join(', '); } catch {}
  if (name) store.set(key, name); return name;
}
