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
};
export const ic = (n, s = 24) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n]}</svg>`;
export const logo = () => `<svg class="logo" viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="rsBg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#22C57A"/><stop offset=".55" stop-color="#0F8A52"/><stop offset="1" stop-color="#075A35"/></linearGradient><radialGradient id="rsGl" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".30"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient><linearGradient id="rsAr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".20"/><stop offset="1" stop-color="#fff" stop-opacity=".03"/></linearGradient><linearGradient id="rsAu" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFE9A3"/><stop offset=".5" stop-color="#F2CD6B"/><stop offset="1" stop-color="#D9A93A"/></linearGradient><linearGradient id="rsRo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#CFEFDD"/></linearGradient><linearGradient id="rsSl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#E3F6EB"/><stop offset="1" stop-color="#B9E3CC"/></linearGradient><pattern id="rsPt" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M6 1.5L7.6 4.4L10.5 6L7.6 7.6L6 10.5L4.4 7.6L1.5 6L4.4 4.4Z" fill="none" stroke="#fff" stroke-width=".35"/></pattern><radialGradient id="rsFd" cx=".5" cy=".5" r=".6"><stop offset=".25" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient><mask id="rsMk"><rect width="100" height="100" fill="url(#rsFd)"/></mask></defs><rect width="100" height="100" rx="24" fill="url(#rsBg)"/><g >
<rect width="100" height="100" fill="url(#rsPt)" opacity=".10" mask="url(#rsMk)"/>
<circle cx="50" cy="50" r="42" fill="url(#rsGl)"/>
<path d="M18 82V54C18 37 35 29 50 9C65 29 82 37 82 54V82Z" fill="url(#rsAr)" stroke="#F2CD6B" stroke-opacity=".55" stroke-width="1.1" stroke-linejoin="round"/>
<path d="M22.5 82V55C22.5 40.5 37 33 50 16C63 33 77.5 40.5 77.5 55V82Z" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width=".8" stroke-linejoin="round"/>
<g class="moon" transform="translate(50 24) scale(.74)"><path d="M49.31 43.50A13.5 13.5 0 1 0 61.73 61.49A11 11 0 1 1 49.31 43.50Z" fill="url(#rsAu)" transform="translate(-49 -43)"/><path d="M60.50,41.90 L61.38,44.29 L63.92,44.39 L61.93,45.96 L62.62,48.41 L60.50,47.00 L58.38,48.41 L59.07,45.96 L57.08,44.39 L59.62,44.29Z" fill="#fff" transform="translate(-49 -43)"/></g>
<ellipse cx="55" cy="79" rx="38" ry="2.6" fill="#043d23" opacity=".28"/>
<rect x="8" y="77.5" width="84" height="7" rx="3.5" fill="url(#rsAu)"/>
<rect x="8" y="77.5" width="84" height="1.6" rx=".8" fill="#fff" opacity=".35"/>
<path d="M14 81h72" stroke="#9A6F14" stroke-opacity=".35" stroke-width=".7" stroke-dasharray="1.6 1.6"/>
<path d="M50 78.7l2 2.2-2 2.2-2-2.2z" fill="#9A6F14" fill-opacity=".45"/>
<ellipse cx="14" cy="74.2" rx="3.2" ry="3.3" fill="#D8F0E2"/>
<path d="M18 77.5C14 77.5 14 70.6 18.2 70.6L26 70.2C27 64 24 56 25 49C26.5 42 34 40 39 43C47 47 55 52 62.5 57C66.5 59.5 68.5 62.3 66.3 65L38.5 77.5Z" fill="url(#rsRo)"/>
<path d="M60.5 60C62 65 64 70 69.5 74" fill="none" stroke="#0A6B40" stroke-opacity=".22" stroke-width="8.4" stroke-linecap="round"/>
<path d="M60 59C61.5 64 63.5 70 69 74.2" fill="none" stroke="url(#rsSl)" stroke-width="6.6" stroke-linecap="round"/>
<path d="M61 63C62.4 66 64 68.5 66 70.5" fill="none" stroke="#0A6B40" stroke-opacity=".2" stroke-width=".9" stroke-linecap="round"/>
<path d="M65.6 71.6l4.2 3.2" stroke="url(#rsAu)" stroke-width="2.2" stroke-linecap="round"/>
<ellipse cx="73.5" cy="75.6" rx="4.6" ry="2" fill="#fff"/>
<g fill="none" stroke="#0A6B40" stroke-opacity=".22" stroke-width=".9" stroke-linecap="round"><path d="M29 46C28 54 30 62 29 70"/><path d="M34 45C33.5 53 35.5 61 34.5 69"/><path d="M43 49C49 53 54 56 59 59.5"/><path d="M40 55C44 57 48 59 52 61"/></g>
<path d="M21.5 70.4V77.5" stroke="url(#rsAu)" stroke-width="1.6" stroke-linecap="round"/>
<circle cx="80.5" cy="70" r="7.3" fill="#BFE6D0"/>
<path d="M73.6 69C72.8 63.4 78.4 60.8 83.2 62.4C86.8 63.6 88 66.8 87.5 69.4C85.6 67.6 83.6 66.8 81.6 66.6C78.6 66.4 75.8 67.4 73.6 69Z" fill="#fff"/>
<path d="M73.8 68.6C76.6 66.8 80.2 66.4 83 67C85 67.4 86.4 68.4 87.3 69.6" fill="none" stroke="url(#rsAu)" stroke-width="1.7" stroke-linecap="round"/>
<path d="M77 62.8C79 64.6 80 66 80.6 67.2M81 62.2C83 63.8 84.2 65.6 84.6 67.4" fill="none" stroke="#0A6B40" stroke-opacity=".22" stroke-width=".8" stroke-linecap="round"/>
</g></svg>`;
export function beads() { // cincin tasbih 18 manik, berputar pelan & berpendar bergantian
  let s = '<svg viewBox="0 0 200 200" aria-hidden="true"><g class="ring">';
  for (let i = 0; i < 18; i++) { const a = (i * 20 - 90) * Math.PI / 180; s += `<circle cx="${(100 + 74 * Math.cos(a)).toFixed(1)}" cy="${(100 + 74 * Math.sin(a)).toFixed(1)}" r="${i === 0 ? 10 : 6.5}" style="animation-delay:${(i * 0.17).toFixed(2)}s"/>`; }
  return s + '</g></svg>';
}
export function mount(root = document) {
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
