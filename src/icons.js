/** icons.js — set ikon garis kustom (24x24, stroke konsisten), logo, dan cincin tasbih animasi. */
const P = {
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21a2 2 0 0 0 4 0"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  chart: '<path d="M5 20V10M12 20V4M19 20v-7"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  reset: '<path d="M4 12a8 8 0 1 0 3-6.2"/><path d="M4 4v5h5"/>',
  minus: '<path d="M5 12h14"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
  beads: '<circle cx="19" cy="12" r="1.7"/><circle cx="16.95" cy="16.95" r="1.7"/><circle cx="12" cy="19" r="1.7"/><circle cx="7.05" cy="16.95" r="1.7"/><circle cx="5" cy="12" r="1.7"/><circle cx="7.05" cy="7.05" r="1.7"/><circle cx="12" cy="5" r="1.7"/><circle cx="16.95" cy="7.05" r="1.7"/>',
  ruku: '<circle cx="6" cy="8" r="2"/><path d="M8.5 9.5H17M17 9.5V20M10 10l6 5.5"/>',
  scan: '<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><circle cx="12" cy="8.5" r="1.7"/><path d="M12 11v5M9.5 12.5L12 11l2.5 1.5M12 16l-2 3M12 16l2 3"/>',
  calib: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  sunrise: '<path d="M3 18h18M7 18a5 5 0 0 1 10 0M12 4v6M9.5 6.5L12 4l2.5 2.5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>',
  afternoon: '<circle cx="9" cy="9" r="3"/><path d="M9 2.5V4M2.5 9H4M4.5 4.5l1 1M13.5 4.5l-1 1"/><path d="M8 20a4 4 0 0 1 .5-8 5 5 0 0 1 9.5 1.5A3.3 3.3 0 0 1 17.5 20z"/>',
  sunset: '<path d="M3 18h18M7 18a5 5 0 0 1 10 0M12 4v6M9.5 7.5L12 10l2.5-2.5"/>',
  pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5z"/><path d="M17 3.5v3M15.5 5h3"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeoff: '<path d="M3 3l18 18"/><path d="M6.6 6.6A17 17 0 0 0 2 12s3.6 7 10 7a9.6 9.6 0 0 0 4.2-1M10.6 5.1A9.8 9.8 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  logout: '<path d="M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h5"/><path d="M15 8l4 4-4 4M19 12H9"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3 8l9 6 9-6"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  shield: '<path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
  arrow: '<path d="M9 5l7 7-7 7"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 20c1-4 4.5-6 8-6s7 2 8 6"/>',
  shirt: '<path d="M8.5 4L3 7l2 4.5 2.5-1V20h9V10.5l2.5 1L21 7l-5.5-3c-.6 1.6-1.9 2.4-3.5 2.4S9.1 5.6 8.5 4z"/><rect x="13" y="12" width="3.2" height="3.4" rx=".6"/>',
  pants: '<path d="M7 3h10l1.5 18h-5l-1.5-10-1.5 10h-5z"/><path d="M7.4 7.5c2 .3 3.4 1.2 4 2.8"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.3c-.7.4-1 .9-1 1.7M12 17h.01"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  book: '<path d="M12 6.5C10 5 7 4.6 4 5v13c3-.4 6 .1 8 1.6 2-1.5 5-2 8-1.6V5c-3-.4-6 0-8 1.5z"/><path d="M12 6.5v13"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18c1.5 0 2.1-.9 2.1-1.9 0-1.3-1-1.6-1-2.8 0-1 .8-1.6 1.9-1.6H17a4 4 0 0 0 4-4C21 6.7 17 3 12 3z"/><circle cx="7.6" cy="11.2" r="1"/><circle cx="10" cy="7.4" r="1"/><circle cx="14.4" cy="7.4" r="1"/>',
  bookmark: '<path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1z"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>',
  text: '<path d="M3 19l5-13 5 13M5 14.2h6"/><path d="M15 19l3-8 3 8M16 16.6h4"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  sajadah: '<rect x="5" y="2.5" width="14" height="19" rx="2.2"/><path d="M8.6 16.5V11.6a3.4 3.4 0 0 1 6.8 0v4.9z"/><path d="M12 6.2v1.6M8 19h8"/>',
  quran: '<path d="M12 7C10.1 5.7 7.4 5.4 4.8 5.8v8.4c2.6-.4 5.3-.1 7.2 1.2 1.9-1.3 4.6-1.6 7.2-1.2V5.8c-2.6-.4-5.3-.1-7.2 1.2z"/><path d="M12 7v8.4"/><path d="M8 21l4-5.6 4 5.6"/><path d="M18.2 2.6a2.2 2.2 0 1 0 1.9 3.1 1.7 1.7 0 1 1-1.9-3.1z"/>',
  camera: '<path d="M4 8.5A1.5 1.5 0 0 1 5.5 7H8l1.4-2h5.2L16 7h2.5A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z"/><circle cx="12" cy="12.8" r="3.3"/>',
  edit: '<path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17z"/><path d="M14.5 7.5l3 3"/>',
  jump: '<path d="M9.5 4L8 20M16 4l-1.5 16M4.5 9h16M3.5 15h16"/>',
};
export const ic = (n, s = 24) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n]}</svg>`;
/*LOGO-START*/export const logo = () => '<img class="logo" src="/logo.png" alt="" aria-hidden="true" decoding="async" draggable="false">';/*LOGO-END*/
export function beads() { // cincin tasbih 18 manik, berputar pelan & berpendar bergantian
  let s = '<svg viewBox="0 0 200 200" aria-hidden="true"><g class="ring">';
  for (let i = 0; i < 18; i++) { const a = (i * 20 - 90) * Math.PI / 180; s += `<circle cx="${(100 + 74 * Math.cos(a)).toFixed(1)}" cy="${(100 + 74 * Math.sin(a)).toFixed(1)}" r="${i === 0 ? 10 : 6.5}" style="animation-delay:${(i * 0.17).toFixed(2)}s"/>`; }
  return s + '</g></svg>';
}
/** Ilustrasi kartu posisi HP (Saku Baju = baju hijau, Saku Celana = celana biru tua) supaya beda dari pil nama shalat. */
export function art(k) {
  const phone = (x, y, r = 0) => `<g transform="rotate(${r} ${x + 3.5} ${y + 7})"><rect x="${x}" y="${y}" width="7" height="14" rx="1.8" fill="#1B2A35"/><rect x="${x + 1}" y="${y + 1.2}" width="5" height="9.5" rx=".9" fill="#F2CD6B"/></g>`;
  if (k === 'shirt') return `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M21 7L5 15l5 13 8-3v32h28V25l8 3 5-13-16-8c-2 4-6 6-11 6s-9-2-11-6z" fill="#1DB86E" stroke="#0A6B40" stroke-width="1.6" stroke-linejoin="round"/><path d="M26 7l6 8 6-8" fill="#fff" stroke="#0A6B40" stroke-width="1.2" stroke-linejoin="round"/>${phone(38.5, 21)}<path d="M36 28h14v13a2 2 0 0 1-2 2H38a2 2 0 0 1-2-2z" fill="#0E8F55" stroke="#0A6B40" stroke-width="1.4"/><path d="M36 28h14" stroke="#fff" stroke-opacity=".6" stroke-width="1.2"/></svg>`;
  return `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M16 6h32l4 52H36l-4-30-4 30H12z" fill="#2C4468" stroke="#1B2A3F" stroke-width="1.6" stroke-linejoin="round"/><rect x="16" y="6" width="32" height="6" fill="#223552" stroke="#1B2A3F" stroke-width="1.2"/>${phone(20, 9, -14)}<path d="M15.5 12.5c8 .5 12.5 5 14.5 14.5H14z" fill="#2C4468"/><path d="M15.5 12.5c7.5.8 11.8 5 13.8 13" fill="none" stroke="#9DB7DD" stroke-width="1.6" stroke-linecap="round"/><path d="M32 28v28" stroke="#1B2A3F" stroke-opacity=".5" stroke-width="1"/></svg>`;
}
export function mount(root = document) {
  root.querySelectorAll('[data-art]').forEach((e) => (e.innerHTML = art(e.dataset.art)));
  root.querySelectorAll('[data-ic]').forEach((e) => (e.innerHTML = ic(e.dataset.ic, +e.dataset.s || 24)));
  root.querySelectorAll('[data-logo]').forEach((e) => (e.innerHTML = logo()));
}
/** Dekorasi banner beranda: bingkai pemindai + kerangka sendi (kesan "AI membaca gerakan"). */
export function scanDeco() {
  const j = [[62, 58], [86, 74], [110, 70], [130, 92], [132, 124]]; // kepala/bahu → pinggul → lutut (ilustrasi)
  const lines = j.slice(1).map((p, i) => `<line x1="${j[i][0]}" y1="${j[i][1]}" x2="${p[0]}" y2="${p[1]}"/>`).join('');
  const dots = j.map((p, i) => `<circle class="jt" cx="${p[0]}" cy="${p[1]}" r="${i === 0 ? 9 : 5.5}" style="animation-delay:${(i * 0.25).toFixed(2)}s"/>`).join('');
  return `<svg viewBox="0 0 200 200" aria-hidden="true"><g class="frm"><path d="M30 62V40a10 10 0 0 1 10-10h22M138 30h22a10 10 0 0 1 10 10v22M170 138v22a10 10 0 0 1-10 10h-22M62 170H40a10 10 0 0 1-10-10v-22"/></g><g class="skel">${lines}${dots}</g><line class="scanln" x1="38" y1="0" x2="162" y2="0"/></svg>`;
}
