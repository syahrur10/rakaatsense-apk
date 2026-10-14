/** firebase.js — login sungguhan (Firebase Authentication): Email+Sandi, Google, Facebook, GitHub. Akun tersimpan di server, bisa dipakai di HP/browser mana pun.
 *  Firestore dipakai untuk daftar pengguna yang dilihat admin (koleksi "users"). */
import { initializeApp } from 'firebase/app';
import {
  getAuth, GoogleAuthProvider, FacebookAuthProvider, GithubAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, sendPasswordResetEmail, signOut as fbSignOut, onAuthStateChanged,
} from 'firebase/auth';
import { ONLINE, isAdminMail } from './config.js';

const e = import.meta.env;
const cfg = { apiKey: e.VITE_FIREBASE_API_KEY, authDomain: e.VITE_FIREBASE_AUTH_DOMAIN, projectId: e.VITE_FIREBASE_PROJECT_ID, appId: e.VITE_FIREBASE_APP_ID };
export const configured = ONLINE;
const app = configured ? initializeApp(cfg) : null;
const auth = app ? getAuth(app) : null;
const PROV = { google: () => new GoogleAuthProvider(), facebook: () => new FacebookAuthProvider(), github: () => new GithubAuthProvider() };
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

/* ---- Daftar pengguna (Firestore) ---- */
const fs = async () => { const m = await import('firebase/firestore'); return { m, db: m.getFirestore(app) }; };
/** Catat pengguna yang baru masuk agar muncul di panel admin. Gagal diam-diam bila Firestore belum aktif. */
export async function register(u) {
  const { m, db } = await fs();
  await m.setDoc(m.doc(db, 'users', u.id), { name: u.name, email: u.email, created: u.created, lastLogin: Date.now() }, { merge: true });
}
/** Hanya admin yang boleh membaca (diatur di firestore.rules). */
export async function listUsers() {
  const { m, db } = await fs();
  const snap = await m.getDocs(m.query(m.collection(db, 'users'), m.orderBy('lastLogin', 'desc'), m.limit(300)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
