/** prayers.js — daftar shalat: 5 waktu, sunnah bawaan (Dhuha, Tahajud, Witir) dan SUNNAH BUATAN SENDIRI (nama diketik pengguna).
 *  Shalat buatan sendiri disimpan per akun di 'rs.cp' = [{ id, name, r, del? }]. Bila dihapus, entri hanya ditandai del:true
 *  supaya nama di Laporan lama tetap terbaca. Kunci catatan harian ('rs.log') & laporan memakai bentuk "<id>:x". */
import { store } from './util.js';
import { t } from './i18n.js';

export const PRID = ['subuh', 'dzuhur', 'ashar', 'maghrib', 'isya'];
export const EXTRA = ['dhuha', 'tahajud', 'witir'];
export const MAXC = 20;      // rakaat maksimum untuk shalat buatan sendiri
export const MAXN = 30;      // jumlah maksimum shalat buatan sendiri
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const cleanName = (s) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, 30);

const all = () => { const l = store.get('rs.cp', []); return Array.isArray(l) ? l : []; };
export const customs = () => all().filter((c) => !c.del);
export const isCustom = (id) => customs().some((c) => c.id === id);
export const isX = (id) => EXTRA.includes(id) || isCustom(id);

/** nama untuk ditampilkan; snap = nama yang disimpan di laporan (cadangan bila shalat buatan sendiri sudah dihapus) */
export const nameOf = (id, snap) => (PRID.includes(id) || EXTRA.includes(id) ? t('p.' + id) : all().find((c) => c.id === id)?.name || snap || id);

const dup = (nm, except) => {
  const l = nm.toLowerCase();
  return [...PRID, ...EXTRA].some((id) => t('p.' + id).toLowerCase() === l) || customs().some((c) => c.id !== except && c.name.toLowerCase() === l);
};

/** @returns {{id:string}|{err:'name'|'dup'|'max'}} */
export function addCustom(name, r) {
  const nm = cleanName(name); if (!nm) return { err: 'name' };
  if (customs().length >= MAXN) return { err: 'max' };
  if (dup(nm)) return { err: 'dup' };
  const c = { id: 'c_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name: nm, r: Math.min(MAXC, Math.max(1, Math.round(+r) || 2)) };
  const l = all(); l.push(c); store.set('rs.cp', l); return { id: c.id };
}
export function renameCustom(id, name) {
  const nm = cleanName(name); if (!nm) return { err: 'name' };
  if (dup(nm, id)) return { err: 'dup' };
  const l = all(), c = l.find((x) => x.id === id); if (!c) return { err: 'name' };
  c.name = nm; store.set('rs.cp', l); return { id };
}
export function removeCustom(id) { const l = all(), c = l.find((x) => x.id === id); if (c) { c.del = true; store.set('rs.cp', l); } }

/** kunci catatan ("dzuhur", "dzuhur:q", "dhuha:x", "c_ab12:x") → teks, mis. "Dzuhur · Qabliyah" */
export function keyLabel(key, snap) {
  const [id, k = 'f'] = key.split(':');
  return `${nameOf(id, snap)} · ${t('rk.k.' + k)}`;
}
export const isFard = (key) => !key.includes(':');
