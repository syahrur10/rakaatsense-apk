/** firebase.js — login sungguhan (Firebase Authentication): Email+Sandi, Google, Facebook, GitHub. Akun tersimpan di server, bisa dipakai di HP/browser mana pun. */
import { initializeApp } from 'firebase/app';
import {
  getAuth, GoogleAuthProvider, FacebookAuthProvider, GithubAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, sendPasswordResetEmail, signOut as fbSignOut, onAuthStateChanged,
} from 'firebase/auth';

const e = import.meta.env;
const cfg = { apiKey: e.VITE_FIREBASE_API_KEY, authDomain: e.VITE_FIREBASE_AUTH_DOMAIN, projectId: e.VITE_FIREBASE_PROJECT_ID, appId: e.VITE_FIREBASE_APP_ID };
export const configured = !!(cfg.apiKey && cfg.authDomain && cfg.projectId && cfg.appId);
const auth = configured ? getAuth(initializeApp(cfg)) : null;
const PROV = { google: () => new GoogleAuthProvider(), facebook: () => new FacebookAuthProvider(), github: () => new GithubAuthProvider() };
const who = (u) => ({ id: u.uid, name: u.displayName || (u.email || '').split('@')[0] || '' });

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
