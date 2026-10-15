/** pwhash.js — hash kata sandi untuk MODE LOKAL (PBKDF2-SHA256, 150rb iterasi + salt acak). Dipakai auth.js & admin.js. */
const enc = new TextEncoder();
export const b64 = (u8) => btoa(String.fromCharCode(...u8));
export const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
export async function hash(pw, salt) {
  const key = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
  return b64(new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 150000, hash: 'SHA-256' }, key, 256)));
}
