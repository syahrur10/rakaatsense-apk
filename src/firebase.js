/** firebase.js — login sungguhan (Firebase Authentication): Email+Sandi dan Google. Akun tersimpan di server, bisa dipakai di HP/browser mana pun.
 *  Firestore dipakai untuk daftar pengguna yang dilihat admin (koleksi "users"). */
import { initializeApp, deleteApp } from 'firebase/app';
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, sendPasswordResetEmail, signOut as fbSignOut, onAuthStateChanged,
} from 'firebase/auth';
import { ONLINE, isAdminMail } from './config.js';

const e = import.meta.env;
const cfg = { apiKey: e.VITE_FIREBASE_API_KEY, authDomain: e.VITE_FIREBASE_AUTH_DOMAIN, projectId: e.VITE_FIREBASE_PROJECT_ID, appId: e.VITE_FIREBASE_APP_ID };
export const configured = ONLINE;
const app = configured ? initializeApp(cfg) : null;
const auth = app ? getAuth(app) : null;
const PROV = { google: () => new GoogleAuthProvider() };
const who = (u) => ({
  id: u.uid, email: (u.email || '').toLowerCase(), name: u.displayName || (u.email || '').split('@')[0] || '',
  admin: isAdminMail(u.email), created: u.metadata?.creationTime ? Date.parse(u.metadata.creationTime) : Date.now(),
});

export async function signUp(name, mail, pw) {
  const { user } = await createUserWithEmailAndPassword(auth, mail, pw);
  await updateProfile(user, { displayName: name });
  return who(user);
}
export const signIn = async (mail, pw) => who((await signInWithEmailAndPassword(auth, mail, pw)).user);
export const resetPassword = (mail) => sendPasswordResetEmail(auth, mail);
export async function social(name) {
  const p = PROV[name]();
  try { return who((await signInWithPopup(auth, p)).user); }
  catch (err) { if (err.code === 'auth/popup-blocked') { await signInWithRedirect(auth, p); return null; } throw err; }
}
export async function redirectResult() { const r = await getRedirectResult(auth); return r ? who(r.user) : null; }
export const signOut = () => (auth ? fbSignOut(auth) : Promise.resolve());
/** Dipanggil saat status login berubah (null = sudah keluar / sesi habis). */
export const watch = (cb) => onAuthStateChanged(auth, cb);

/* ---- Daftar pengguna & peran (Firestore, koleksi "users") ---- */
const fs = async () => { const m = await import('firebase/firestore'); return { m, db: m.getFirestore(app) }; };
/** Catat pengguna yang baru masuk, lalu kembalikan perannya ('admin' | 'user'). Peran hanya bisa diubah admin (lihat firestore.rules). */
export async function register(u) {
  const { m, db } = await fs(), ref = m.doc(db, 'users', u.id);
  let role = 'user';
  try { const d = await m.getDoc(ref); if (d.exists()) role = d.data().role || 'user'; } catch {}
  await m.setDoc(ref, { name: u.name, email: u.email, created: u.created, lastLogin: Date.now() }, { merge: true });
  return u.admin ? 'admin' : role;
}
export async function getRole(uid) { const { m, db } = await fs(); const d = await m.getDoc(m.doc(db, 'users', uid)); return d.exists() ? d.data().role || 'user' : 'user'; }
/** Ringkasan data ibadah milik sendiri (dibaca admin di panel). */
export async function pushStats(uid, stats) { const { m, db } = await fs(); await m.setDoc(m.doc(db, 'users', uid), { stats }, { merge: true }); }
/** Hanya admin yang boleh membaca semua & mengubah peran (diatur di firestore.rules). */
export async function listUsers() {
  const { m, db } = await fs();
  const snap = await m.getDocs(m.query(m.collection(db, 'users'), m.limit(500)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.lastLogin || 0) - (a.lastLogin || 0));
}
export async function setRole(uid, role) { const { m, db } = await fs(); await m.updateDoc(m.doc(db, 'users', uid), { role }); }
/** Admin membuat akun baru (pengguna/admin) TANPA keluar dari sesi admin: akun dibuat lewat instance Firebase kedua, lalu perannya dicatat di Firestore. */
export async function createUser(name, mail, pw, role) {
  const sec = initializeApp(cfg, 'create-' + Date.now()), a = getAuth(sec);
  try {
    const { user } = await createUserWithEmailAndPassword(a, mail, pw);
    await updateProfile(user, { displayName: name });
    const { m, db } = await fs();
    await m.setDoc(m.doc(db, 'users', user.uid), { name, email: mail.toLowerCase(), created: Date.now(), lastLogin: 0, role });
    return user.uid;
  } finally { await fbSignOut(a).catch(() => {}); await deleteApp(sec).catch(() => {}); }
}
