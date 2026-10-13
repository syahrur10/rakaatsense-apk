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
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 20c1-4 4.5-6 8-6s7 2 8 6"/>',
};
export const ic = (n, s = 24) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n]}</svg>`;
export const logo = () => `<svg class="logo" viewBox="0 0 100 100" aria-hidden="true"><rect width="100" height="100" rx="24" fill="url(#lgBg)"/><path d="M26 80V52C26 38 38 30 50 13C62 30 74 38 74 52V80Z" fill="#fff"/><path d="M32 80V53C32 43 41 36.5 50 23C59 36.5 68 43 68 53V80Z" fill="#DDF4E6"/><path d="M49.31 43.5A13.5 13.5 0 1 0 61.73 61.49A11 11 0 1 1 49.31 43.5Z" fill="#0E7C4A"/><path d="M60.5,41.9L61.38,44.29L63.92,44.39L61.93,45.96L62.62,48.41L60.5,47L58.38,48.41L59.07,45.96L57.08,44.39L59.62,44.29Z" fill="#E0A81E"/><rect x="21" y="80" width="58" height="6" rx="3" fill="#F2CD6B"/></svg>`;
export function beads() { // cincin tasbih 18 manik, berputar pelan & berpendar bergantian
  let s = '<svg viewBox="0 0 200 200" aria-hidden="true"><g class="ring">';
  for (let i = 0; i < 18; i++) { const a = (i * 20 - 90) * Math.PI / 180; s += `<circle cx="${(100 + 74 * Math.cos(a)).toFixed(1)}" cy="${(100 + 74 * Math.sin(a)).toFixed(1)}" r="${i === 0 ? 10 : 6.5}" style="animation-delay:${(i * 0.17).toFixed(2)}s"/>`; }
  return s + '</g></svg>';
}
export function mount(root = document) {
  root.querySelectorAll('[data-ic]').forEach((e) => (e.innerHTML = ic(e.dataset.ic, +e.dataset.s || 24)));
  root.querySelectorAll('[data-logo]').forEach((e) => (e.innerHTML = logo()));
}
