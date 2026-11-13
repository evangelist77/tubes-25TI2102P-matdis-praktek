/* Cerita landing GASIBU (/).
   Mesin gulir, kanvas, kartu 3D, pita, HUD, kursor, dan timing disalin dari pusaran.html buatan Ghaisan, lalu isinya
   diganti untuk tubes Kasus 4 pasar tumpah Gasibu. Angka di layar dihitung saat runtime dari graph/data/graf.json
   (salinan GRAPH_DATA, dibuat graph/ekstrak_graf.mjs), window.MEDIA_DATA (graph/media/media.js), dan
   graph/data/contoh_graf.json. API kecil: window.Cerita = { mulai(), jeda(), goTo(k) }. */
(() => {
'use strict';

/* =====================================================================
   0. UTILITAS (salinan pusaran)
   ===================================================================== */
const doc = document.documentElement;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const inv = (a, b, v) => clamp((v - a) / (b - a));
const sstep = (a, b, v) => { const t = inv(a, b, v); return t * t * (3 - 2 * t); };
const fract = v => v - Math.floor(v);
const TAU = Math.PI * 2;
const E = {
  inOut: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: t => 1 - Math.pow(1 - t, 3),
  out5: t => 1 - Math.pow(1 - t, 5),
  in: t => t * t * t,
  back: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }
};
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
const DPR = Math.min(window.devicePixelRatio || 1, 2);
let QUALITY = (navigator.hardwareConcurrency || 4) <= 2 ? 0.65 : 1;

const setT = (el, v) => { if (el._t !== v) { el.style.transform = v; el._t = v; } };
const setO = (el, v) => { v = Math.round(v * 1000) / 1000; if (el._o !== v) { el.style.opacity = v; el._o = v; } };
const setA = (el, k, v) => { const c = '_a' + k; if (el[c] !== v) { el.setAttribute(k, v); el[c] = v; } };
const setTx = (el, v) => { if (el._x !== v) { el.textContent = v; el._x = v; } };
const bulat = n => String(Math.max(0, Math.round(n)));   // penghitung HUD tanpa nol di depan (lebar dijaga tabular-nums)
const fmtID = n => n.toLocaleString('id-ID');

/* PRNG + noise Perlin 3D (implementasi sendiri) */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function makeNoise(rand) {
  const perm = new Uint8Array(512), base = new Uint8Array(256);
  for (let i = 0; i < 256; i++) base[i] = i;
  for (let i = 255; i > 0; i--) { const j = (rand() * (i + 1)) | 0; const t = base[i]; base[i] = base[j]; base[j] = t; }
  for (let i = 0; i < 512; i++) perm[i] = base[i & 255];
  const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
  const grad = (h, x, y, z) => { h &= 15; const u = h < 8 ? x : y; const v = h < 4 ? y : (h === 12 || h === 14 ? x : z); return ((h & 1) ? -u : u) + ((h & 2) ? -v : v); };
  return (x, y, z = 0) => {
    const fx = Math.floor(x), fy = Math.floor(y), fz = Math.floor(z);
    const X = fx & 255, Y = fy & 255, Z = fz & 255;
    x -= fx; y -= fy; z -= fz;
    const u = fade(x), v = fade(y), w = fade(z);
    const A = perm[X] + Y, AA = perm[A] + Z, AB = perm[A + 1] + Z, B = perm[X + 1] + Y, BA = perm[B] + Z, BB = perm[B + 1] + Z;
    return lerp(
      lerp(lerp(grad(perm[AA], x, y, z), grad(perm[BA], x - 1, y, z), u), lerp(grad(perm[AB], x, y - 1, z), grad(perm[BB], x - 1, y - 1, z), u), v),
      lerp(lerp(grad(perm[AA + 1], x, y, z - 1), grad(perm[BA + 1], x - 1, y, z - 1), u), lerp(grad(perm[AB + 1], x, y - 1, z - 1), grad(perm[BB + 1], x - 1, y - 1, z - 1), u), v),
      w);
  };
}
/* medan pusaran: sudut tangensial + spiral ke dalam + noise */
const vortexField = (noise, ns, amp, spiral, z) => (x, y) => Math.atan2(y, x) + 1.5707963 + spiral + noise(x * ns, y * ns, z) * amp;

/* palet */
const HEX = { ink: '#151a4f', navy: '#232a78', cream: '#fbf3e4', vermilion: '#e0492f', orange: '#f08a3c', gold: '#f2b84b', butter: '#f6d98c', rose: '#e8737a', pink: '#f2a7b8', lavender: '#b9a2e6', peri: '#8c95e3', sky: '#86c8e3', mint: '#a3d9bb', teal: '#2e9184', forest: '#1d5f55', violet: '#6d4bb3', wine: '#7a1f2e' };
const hex2rgb = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const C = {}; for (const k in HEX) C[k] = hex2rgb(HEX[k]);
const rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const shade = (c, k) => [clamp(c[0] * k, 0, 255), clamp(c[1] * k, 0, 255), clamp(c[2] * k, 0, 255)];
const mixc = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const pickW = (arr, w, r) => { let s = 0; for (const x of w) s += x; let t = r * s; for (let i = 0; i < arr.length; i++) { t -= w[i]; if (t <= 0) return arr[i]; } return arr[arr.length - 1]; };

function pickVortexColor(r01, cn, rand) {
  if ((cn > 0.26 && rand() < 0.62) || rand() < 0.035) return pickW([C.teal, C.forest, C.violet, C.peri, C.navy, C.mint], [3, 2, 2.4, 1.2, 1, 0.8], rand());
  if (r01 < 0.16) return pickW([C.cream, C.butter, C.gold, C.orange], [1.2, 2, 2, 1], rand());
  if (r01 < 0.42) return pickW([C.gold, C.orange, C.butter, C.vermilion, C.rose], [3, 3, 1.2, 2, 0.8], rand());
  return pickW([C.vermilion, C.orange, C.wine, C.rose, C.gold, C.violet], [3, 2.2, 1.6, 1, 1, 0.5], rand());
}
function pickPaintColor(r01, rand) {
  if (rand() < 0.14) return pickW([C.teal, C.violet, C.peri, C.forest, C.mint], [3, 2.5, 1.2, 1.5, 1], rand());
  if (r01 < 0.25) return pickW([C.cream, C.butter, C.gold], [1, 2, 2], rand());
  return pickW([C.gold, C.orange, C.vermilion, C.butter, C.rose, C.cream], [3, 3, 2.2, 1.4, 1.2, 0.6], rand());
}

/* primitif gambar */
function star4(ctx, x, y, r) {
  const k = r * 0.14;
  ctx.beginPath(); ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x + k, y - k, x + r, y); ctx.quadraticCurveTo(x + k, y + k, x, y + r);
  ctx.quadraticCurveTo(x - k, y + k, x - r, y); ctx.quadraticCurveTo(x - k, y - k, x, y - r);
  ctx.closePath(); ctx.fill();
}
function strokePoly(ctx, p, m) {
  ctx.beginPath(); ctx.moveTo(p[0], p[1]);
  for (let i = 1; i < m; i++) ctx.lineTo(p[i * 2], p[i * 2 + 1]);
  ctx.stroke();
}
/* telusuri satu goresan mengikuti medan */
function trace(x, y, n, step, field) {
  const pts = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    pts[i * 2] = x; pts[i * 2 + 1] = y;
    const a = field(x, y);
    x += Math.cos(a) * step; y += Math.sin(a) * step;
  }
  return pts;
}
/* pecah goresan jadi beberapa "bulu kuas" yang menguncup di ujung */
function bristles(pts, width, nb, rand, col, alpha) {
  const n = pts.length / 2, out = [];
  const nx = new Float32Array(n), ny = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const i0 = Math.max(0, i - 1), i1 = Math.min(n - 1, i + 1);
    const dx = pts[i1 * 2] - pts[i0 * 2], dy = pts[i1 * 2 + 1] - pts[i0 * 2 + 1];
    const l = Math.hypot(dx, dy) || 1; nx[i] = -dy / l; ny[i] = dx / l;
  }
  for (let b = 0; b < nb; b++) {
    const off = nb === 1 ? 0 : ((b + 0.5) / nb - 0.5) * width * 0.95 + (rand() - 0.5) * width * 0.12;
    const end = nb === 1 ? n : Math.max(3, Math.floor(n * (0.72 + rand() * 0.28)));
    const start = nb === 1 ? 0 : Math.floor(rand() * n * 0.08);
    const len = Math.max(2, end - start);
    const p = new Float32Array(len * 2);
    for (let i = start, j = 0; j < len; i++, j++) {
      const u = i / Math.max(1, n - 1);
      const tp = (0.55 + 0.45 * Math.min(1, u * 4)) * (1 - u * u * u);
      p[j * 2] = pts[i * 2] + nx[i] * off * tp; p[j * 2 + 1] = pts[i * 2 + 1] + ny[i] * off * tp;
    }
    out.push({ p, col: rgba(shade(col, 0.86 + rand() * 0.28), (alpha * (0.8 + rand() * 0.2)).toFixed(3)), lw: nb === 1 ? width : (width / nb) * 1.75 });
  }
  return out;
}
/* spline Catmull-Rom → Bézier kubik */
function catmull(pts) {
  let d = '';
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}
function meltPath(W, H, seed, amp, base = 0) {
  const r = mulberry32(seed);
  const n = Math.max(5, Math.round(W / 120)), pts = [];
  for (let i = 0; i <= n; i++) {
    const x = (i / n) * W + (i > 0 && i < n ? (r() - 0.5) * (W / n) * 0.5 : 0);
    let y = base + (0.3 + 0.7 * r()) * amp;
    if (i > 0 && i < n && r() < 0.28) y = base + amp * (0.02 + r() * 0.12);
    pts.push([x, y]);
  }
  return `M0 ${H} L0 ${pts[0][1].toFixed(1)}` + catmull(pts) + ` L${W} ${H} Z`;
}
function starsPath(list) {
  return list.map(([x, y, r]) => { const k = r * 0.14, f = v => v.toFixed(1); return `M${f(x)} ${f(y - r)}Q${f(x + k)} ${f(y - k)} ${f(x + r)} ${f(y)}Q${f(x + k)} ${f(y + k)} ${f(x)} ${f(y + r)}Q${f(x - k)} ${f(y + k)} ${f(x - r)} ${f(y)}Q${f(x - k)} ${f(y - k)} ${f(x)} ${f(y - r)}Z`; }).join('');
}
function spiralPath(turns, r0, r1, steps) {
  let d = '';
  for (let i = 0; i <= steps; i++) { const u = i / steps, a = u * turns * TAU, r = lerp(r0, r1, u); d += (i ? 'L' : 'M') + (Math.cos(a) * r).toFixed(2) + ' ' + (Math.sin(a) * r).toFixed(2); }
  return d;
}
/* pecah teks jadi kata bermasker */
function splitWords(el) {
  const nodes = Array.from(el.childNodes); el.textContent = '';
  const mk = content => { const o = document.createElement('span'); o.className = 'w'; const i = document.createElement('span'); i.className = 'wi'; i.appendChild(content); o.appendChild(i); return o; };
  nodes.forEach(n => {
    const isEl = n.nodeType === 1;
    n.textContent.split(/(\s+)/).forEach(part => {
      if (!part) return;
      if (/^\s+$/.test(part)) { el.appendChild(document.createTextNode(' ')); return; }
      if (isEl) { const e = document.createElement(n.tagName.toLowerCase()); e.className = n.className; e.textContent = part; el.appendChild(mk(e)); }
      else el.appendChild(mk(document.createTextNode(part)));
    });
  });
  return $$('.wi', el);
}
/* reveal kata berbasis progres scroll */
function rev(words, p, a, dur = 0.08, outA = null, outB = null) {
  const n = words.length;
  for (let i = 0; i < n; i++) {
    const s = a + (n > 1 ? (i / (n - 1)) * dur * 0.35 : 0);
    const e = E.out5(inv(s, s + dur * 0.65, p));
    let y = (1 - e) * 140; const r = (1 - e) * 7;
    if (outA != null) y -= E.in(inv(outA + i * 0.003, outB + i * 0.003, p)) * 140;
    setT(words[i], `translate3d(0,${y.toFixed(2)}%,0) rotate(${r.toFixed(2)}deg)`);
  }
}

/* masukan pemilik 7: 0 selama caption di kiri, 1 selama caption di kanan (data-pos), berpindah halus di sela dua caption.
   d menggeser jendelanya sedikit supaya benda yang ikut pindah tidak bergerak serempak */
function sisiCap(caps, p, d = 0) {
  let m = caps[0].kanan;
  for (let i = 1; i < caps.length; i++) { const a = caps[i - 1], b = caps[i]; if (a.kanan !== b.kanan) m += (b.kanan - a.kanan) * E.inOut(inv(a.b - 0.01 + d, b.a + 0.01 + d, p)); }
  return m;
}
const kapsi = sel => $$(sel).map(el => ({ a: +el.dataset.a, b: +el.dataset.b, h: el.querySelector('.split'), sub: el.querySelector('.sub'), kanan: (el.dataset.pos || 'lb')[0] === 'r' ? 1 : 0 }));

/* =====================================================================
   0b. DATA TUBES (dihitung saat runtime)
   ===================================================================== */
const BASE = 'graph/';
const RAD = Math.PI / 180;
const MONO = 'ui-monospace,"SF Mono",SFMono-Regular,Menlo,Consolas,monospace';
const MD = window.MEDIA_DATA || {};
const WARNA = (window.Situs && window.Situs.WARNA_RUTE) || ['#e0492f', '#2e9184', '#6d4bb3', '#d9862c', '#232a78', '#d6537a', '#3d8fb8', '#7a9a2e'];
const TERBILANG = ['nol', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas', 'dua belas'];
const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
/* label GRAPH_DATA memakai en dash, datanya tidak diubah, jadi dibersihkan saat ditampilkan */
const bersih = s => String(s == null ? '' : s).replace(/\s*[\u2013\u2014]\s*/g, ' - ');
const pendek = id => (id === 'V_AriaJipang' ? 'Aria Jipang' : id.replace(/^V_/, '').replace(/_/g, ' '));
const simpulTxt = id => (/^[ST]\d$/.test(id) ? id : 'V ' + pendek(id));
const kapital = s => s.charAt(0).toUpperCase() + s.slice(1);
const kata = n => TERBILANG[n] || String(n);
const fmtWaktu = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(iso || ''); return m ? `${+m[3]} ${BULAN[+m[2] - 1]} ${m[1]}${m[4] ? ` pukul ${m[4]}.${m[5]}` : ''}` : ''; };
const jarak = (a, b) => { const dl = (b[0] - a[0]) * RAD, dg = (b[1] - a[1]) * RAD; const s = Math.sin(dl / 2) ** 2 + Math.cos(a[0] * RAD) * Math.cos(b[0] * RAD) * Math.sin(dg / 2) ** 2; return 2 * 6371008.8 * Math.asin(Math.sqrt(s)); };
const merc = (lat, lng) => [6378137 * lng * RAD, 6378137 * Math.log(Math.tan(Math.PI / 4 + (lat * RAD) / 2))];
let D = null, CONTOH = null, PETA = null;

function olahData(g) {
  const ids = Object.keys(g.nodes);
  ids.sort((a, b) => (a === 'S1' ? -1 : b === 'S1' ? 1 : 0));   // S1 di indeks 0, BFS adegan Graf mulai dari sini
  const idx = {}; ids.forEach((id, i) => { idx[id] = i; });
  const ekey = new Map(), edges = [];
  g.paths.forEach(p => {
    for (let i = 0; i + 1 < p.nodeIds.length; i++) {
      const a = p.nodeIds[i], b = p.nodeIds[i + 1], key = a + '>' + b;
      let e = ekey.get(key);
      if (!e) { e = { a, b, ia: idx[a], ib: idx[b], rute: [] }; ekey.set(key, e); edges.push(e); }
      if (!e.rute.includes(p.id)) e.rute.push(p.id);
    }
  });
  const lewat = {}; g.paths.forEach(p => new Set(p.nodeIds).forEach(n => { (lewat[n] = lewat[n] || []).push(p.id); }));
  const gasibu = g.paths.filter(p => p.nodeIds.includes('V_Gasibu_Barat'));
  const cc = MD.cctv || {};
  const st = (g.cctvPoints || []).map(c => (cc[c.id] ? cc[c.id].status : ''));
  const n = {
    rute: g.paths.length, simpul: ids.length, simpang: ids.filter(i => g.nodes[i].type === 'junction').length, ruas: edges.length,
    cctv: (g.cctvPoints || []).length, hp: (g.manualSurveyPoints || []).length,
    aman: st.filter(s => s === 'aman').length, mati: st.filter(s => s === 'tidak bisa dibuka').length, baru: st.filter(s => s.startsWith('baru')).length,
    luar: g.paths.length - gasibu.length, gasibu: gasibu.length
  };
  n.pantau = n.cctv + n.hp; n.ruteKata = kapital(kata(n.rute));
  return { g, ids, idx, edges, ekey, lewat, gasibu, n };
}

/* =====================================================================
   1. STATE & GEOMETRI SCROLL
   ===================================================================== */
const S = { vw: 0, vh: 0, scrollY: 0, smoothY: 0, vel: 0, t: 0, last: performance.now(), ready: false, slowAcc: 1, degraded: false,
  mouse: { x: 0, y: 0, nx: 0, ny: 0, sx: 0, sy: 0, last: -1e9 } };
const stage = $('#stage');
function readViewport() { const r = stage.getBoundingClientRect(); S.vw = Math.round(r.width) || innerWidth; S.vh = Math.round(r.height) || innerHeight; }
const small = () => S.vw < 760;
const navH = () => { const n = $('.snav'); return n ? n.offsetHeight : 0; };
const ORDER = ['hero', 'lorong', 'kartu', 'rasi', 'goresan', 'data', 'aliran', 'akhir'];
const NAMES = ['Max Flow', 'Masalah', 'Tim', 'Graf', 'Rute', 'Data', 'Aliran', 'Akhir'];
const HASH = { mulai: 'hero', masalah: 'lorong', tim: 'kartu', graf: 'rasi', rute: 'goresan', data: 'data', aliran: 'aliran', akhir: 'akhir' };
const G = {};
function measure() {
  for (const k of ORDER) { const el = $('#s-' + k); const r = el.getBoundingClientRect(); G[k] = { top: r.top + window.scrollY, h: el.offsetHeight }; }
  G.docH = doc.scrollHeight;
}
const prog = k => clamp((S.smoothY - G[k].top) / G[k].h);
const LAYERS = { hero: $('#L-hero'), lorong: $('#L-lorong'), kartu: $('#L-kartu'), rasi: $('#L-rasi'), goresan: $('#L-goresan'), data: $('#L-data'), aliran: $('#L-aliran') };
function setLayer(k, on) { const el = LAYERS[k]; if (el._on !== on) { el._on = on; el.classList.toggle('on', on); } }
const GO_OFF = { hero: 0, lorong: 0.06, kartu: 0.2, rasi: 0.3, goresan: 0.14, data: 0.12, aliran: 0.04 };
function goTo(k, instan) {
  const g = G[k]; if (!g) return;
  const y = k === 'akhir' ? g.top + S.vh * 0.9 : g.top + g.h * (GO_OFF[k] || 0) + 2;
  window.scrollTo({ top: y, behavior: REDUCED || instan ? 'auto' : 'smooth' });
  if (instan) S.scrollY = S.smoothY = window.scrollY;   // lompat langsung, jangan melintasi semua adegan
}

/* =====================================================================
   2. PUSARAN: lukisan generatif + aliran partikel + naga pita (salinan pusaran)
   ===================================================================== */
const V = {
  el: $('#vortex'), wrap: $('#vxPaint'), cvs: [$('#paintA'), $('#paintB')], front: 0,
  seed: 7, size: 0, unit: 1, paintW: 0, noise: null, cnoise: null, field: null, ns: 0, amp: 1.75, spiral: 0.22, nz: 0.37,
  rot: 0, strokes: 0, sparkles: [], busy: false,
  wantSize() { return Math.ceil(Math.hypot(S.vw, S.vh) * 1.12); },
  paint(cv, seed, onProg, onDone) {
    const size = this.wantSize(), unit = size / 1600;
    const pd = Math.min(small() ? 2 : 1.3, DPR, 2800 / size);
    cv.width = Math.round(size * pd); cv.height = Math.round(size * pd);
    cv.style.width = size + 'px'; cv.style.height = size + 'px';
    const ctx = cv.getContext('2d');
    ctx.setTransform(pd, 0, 0, pd, (size * pd) / 2, (size * pd) / 2);
    const R = size / 2;
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
    g.addColorStop(0, '#f8d27a'); g.addColorStop(0.16, '#f3a446'); g.addColorStop(0.42, '#df5a31'); g.addColorStop(0.7, '#a92f2b'); g.addColorStop(1, '#4d1330');
    ctx.fillStyle = g; ctx.fillRect(-R, -R, size, size);
    this.size = size; this.unit = unit; this.seed = seed; this.paintW = S.vw;
    this.noise = makeNoise(mulberry32(seed * 7919 + 13));
    this.cnoise = makeNoise(mulberry32(seed * 104729 + 3));
    this.nz = 0.37 + (seed % 10) / 10;
    this.ns = 1 / (380 * unit);
    this.field = vortexField(this.noise, this.ns, this.amp, this.spiral, this.nz);
    const field = this.field, rand = mulberry32(seed * 31337 + 5);
    const count = Math.round(clamp((size * size) / 2400, 300, 2600) * QUALITY);
    this.strokes = count;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    let i = 0;
    const step = () => {
      const t0 = performance.now();
      while (i < count && performance.now() - t0 < 12) { this.stroke(ctx, rand, field, R, unit); i++; }
      if (onProg) onProg(i / count);
      if (i < count) requestAnimationFrame(step);
      else { this.specks(ctx, rand, R, unit); if (onDone) onDone(); }
    };
    step();
  },
  stroke(ctx, rand, field, R, unit) {
    const x = (rand() * 2 - 1) * R, y = (rand() * 2 - 1) * R;
    const r01 = Math.hypot(x, y) / R;
    const hair = rand() < 0.07;
    const n = hair ? 60 + ((rand() * 70) | 0) : 16 + ((rand() * 58) | 0);
    const stepLen = (2.2 + rand() * 2.6) * unit;
    if (r01 < 0.035) return;
    const pts = trace(x, y, n, stepLen, field);
    const cn = this.cnoise((x * 0.0018) / unit, (y * 0.0018) / unit, 1.7);
    const col = hair ? (rand() < 0.6 ? C.cream : C.butter) : pickVortexColor(r01, cn, rand);
    const w = hair ? 0.9 * unit : (1.4 + Math.pow(rand(), 2.4) * 12.5) * unit * (1.1 - r01 * 0.35);
    const nb = hair ? 1 : w < 3 * unit ? 1 : w < 7 * unit ? 3 : 4 + ((rand() * 2) | 0);
    const br = bristles(pts, w, nb, rand, col, hair ? 0.7 : 0.93);
    for (const b of br) { ctx.strokeStyle = b.col; ctx.lineWidth = b.lw; strokePoly(ctx, b.p, b.p.length / 2); }
  },
  specks(ctx, rand, R, unit) {
    const area = Math.pow((R * 2) / 2000, 2);
    const n = Math.round(260 * area);
    for (let i = 0; i < n; i++) {
      const x = (rand() * 2 - 1) * R, y = (rand() * 2 - 1) * R, r = (0.5 + Math.pow(rand(), 3) * 2.2) * unit;
      ctx.fillStyle = rand() < 0.5 ? 'rgba(255,246,220,.85)' : 'rgba(246,217,140,.8)';
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = '#fff4d6';
    const m = Math.round(46 * area);
    for (let i = 0; i < m; i++) star4(ctx, (rand() * 2 - 1) * R, (rand() * 2 - 1) * R, (3 + rand() * 8) * unit);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.16);
    g.addColorStop(0, 'rgba(255,240,200,.55)'); g.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = g; ctx.fillRect(-R * 0.2, -R * 0.2, R * 0.4, R * 0.4);
    this.sparkles = [];
    const ns = small() ? 26 : 46;
    for (let i = 0; i < ns; i++) { const a = rand() * TAU, rr = Math.sqrt(rand()) * R * 0.95; this.sparkles.push({ x: Math.cos(a) * rr, y: Math.sin(a) * rr, s: (2.5 + rand() * 6) * unit * 1.2, ph: rand() * TAU, sp: 0.8 + rand() * 2.2 }); }
  },
  repaint(seed, quiet) {
    if (this.busy) return; this.busy = true;
    const back = this.cvs[1 - this.front];
    if (!quiet) Toast.show('ganti warna 0%', 60000);
    this.paint(back, seed, p => { if (!quiet) Toast.show(`ganti warna ${Math.round(p * 100)}%`, 60000); }, () => {
      back.style.opacity = '1'; this.cvs[this.front].style.opacity = '0'; this.front = 1 - this.front; this.busy = false;
      if (!quiet) Toast.show('warna baru siap', 1400);
    });
  },
  update(dt, t, heroP, endK) {
    if (!this.field) return;
    const dive = E.in(inv(0.12, 1, heroP));
    if (!REDUCED) this.rot += 0.0011 * dt * (1 + dive * 5);
    const rot = this.rot + heroP * 1.3;
    let sc = 1.04 + dive * 1.9;
    if (endK > 0) sc = 1.04 + (1 - E.out(endK)) * 0.75;
    setT(this.wrap, `rotate(${rot.toFixed(4)}rad) scale(${sc.toFixed(4)})`);
    if (!REDUCED) Flow.step(dt, rot, sc, dive * 2.5);
    const c = Cre.ctx;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, c.canvas.width, c.canvas.height);
    c.setTransform(Cre.d, 0, 0, Cre.d, 0, 0);
    drawSparkles(c, t, rot, sc);
    if (!REDUCED) { const mouseOn = FINE && performance.now() - S.mouse.last < 2600; Cre.update(dt, t, dive, mouseOn); Cre.draw(t, 1 - dive * 0.6); }
  }
};
function drawSparkles(ctx, t, rot, sc) {
  const c = Math.cos(rot), s = Math.sin(rot), hw = S.vw / 2, hh = S.vh / 2;
  ctx.fillStyle = '#fff4d6';
  for (const p of V.sparkles) {
    const x = (p.x * c - p.y * s) * sc + hw, y = (p.x * s + p.y * c) * sc + hh;
    if (x < -30 || y < -30 || x > S.vw + 30 || y > S.vh + 30) continue;
    const tw = 0.5 + 0.5 * Math.sin(t * p.sp + p.ph);
    if (tw < 0.12) continue;
    ctx.globalAlpha = tw; star4(ctx, x, y, p.s * tw * Math.min(sc, 1.6));
  }
  ctx.globalAlpha = 1;
}

/* aliran partikel: jejak disimpan di ring buffer, digambar ulang tiap frame */
const Flow = {
  T: 10, ps: [], ctx: null, d: 1,
  cols: ['rgba(255,244,214,.6)', 'rgba(246,217,140,.55)', 'rgba(255,255,255,.42)', 'rgba(120,210,190,.5)'],
  lws: [1.2, 1.7, 0.8, 1.3],
  resize(resetPs) { const c = $('#flow'); this.d = Math.min(DPR, 1.5); c.width = (S.vw * this.d) | 0; c.height = (S.vh * this.d) | 0; this.ctx = c.getContext('2d'); if (resetPs || !this.ps.length) this.reset(); },
  reset() { const n = Math.round((small() ? 180 : 460) * QUALITY); this.ps = []; for (let i = 0; i < n; i++) { const p = { h: new Float32Array(this.T * 2) }; this.spawn(p); p.life *= Math.random(); this.ps.push(p); } },
  spawn(p) {
    const a = Math.random() * TAU, R = Math.hypot(S.vw, S.vh) * 0.55, r = Math.sqrt(Math.random()) * R;
    p.x = Math.cos(a) * r; p.y = Math.sin(a) * r; p.life = 50 + Math.random() * 170; p.sp = 0.8 + Math.random() * 1.7;
    const q = Math.random(); p.c = q < 0.07 ? 3 : q < 0.2 ? 2 : q < 0.6 ? 0 : 1; p.n = 0; p.i = 0;
  },
  step(dt, rot, sc, boost) {
    const ctx = this.ctx, d = this.d, field = V.field, T = this.T;
    if (!ctx || !field) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.setTransform(d, 0, 0, d, (S.vw * d) / 2, (S.vh * d) / 2);
    const c = Math.cos(-rot), s = Math.sin(-rot), R2 = Math.pow(Math.hypot(S.vw, S.vh) * 0.58, 2);
    for (const p of this.ps) {
      const qx = (p.x * c - p.y * s) / sc, qy = (p.x * s + p.y * c) / sc;
      const a = field(qx, qy) + rot, v = p.sp * dt * (1 + boost);
      p.x += Math.cos(a) * v; p.y += Math.sin(a) * v;
      p.h[p.i * 2] = p.x; p.h[p.i * 2 + 1] = p.y; p.i = (p.i + 1) % T; if (p.n < T) p.n++;
      p.life -= dt;
      if (p.life < 0 || p.x * p.x + p.y * p.y > R2) this.spawn(p);
    }
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let k = 0; k < 4; k++) {
      ctx.strokeStyle = this.cols[k]; ctx.lineWidth = this.lws[k]; ctx.beginPath();
      for (const p of this.ps) {
        if (p.c !== k || p.n < 2) continue;
        let j = (p.i - p.n + T) % T; ctx.moveTo(p.h[j * 2], p.h[j * 2 + 1]);
        for (let m = 1; m < p.n; m++) { j = (j + 1) % T; ctx.lineTo(p.h[j * 2], p.h[j * 2 + 1]); }
      }
      ctx.stroke();
    }
  }
};

/* naga pita: rantai follow-the-leader + 7 pita yang saling menganyam */
const Cre = {
  N: 60, seg: [], hx: 0, hy: 0, vx: 2, vy: -1, flip: 1, ctx: null, d: 1, segLen: 8, W: 30,
  cols: ['#e0492f', '#f2b84b', '#2e9184', '#6d4bb3', '#fbf3e4', '#f08a3c', '#1d5f55'],
  resize() {
    const c = $('#creature'); this.d = Math.min(DPR, 1.75); c.width = (S.vw * this.d) | 0; c.height = (S.vh * this.d) | 0; this.ctx = c.getContext('2d');
    const m = Math.min(S.vw, S.vh); this.segLen = m * 0.0118; this.W = m * 0.05;
    if (!this.seg.length) this.init();
  },
  init() { this.hx = S.vw * 0.22; this.hy = S.vh * 0.7; this.seg = []; for (let i = 0; i < this.N; i++) this.seg.push({ x: this.hx - i * this.segLen, y: this.hy + i * this.segLen * 0.3 }); },
  ph: 0,
  update(dt, t, dive, mouseOn) {
    const w = S.vw, h = S.vh, cx = w / 2, cy = h / 2, mn = Math.min(w, h);
    /* target berjalan di kurva Lissajous; kalau kepala sudah dekat, target "kabur" ke depan supaya naga tidak melingkar */
    const ph = this.ph;
    let tx = cx + Math.cos(ph * 0.31) * w * 0.34 + Math.cos(ph * 0.77 + 1.3) * w * 0.07;
    let ty = cy + Math.sin(ph * 0.43) * h * 0.28 + Math.sin(ph * 1.05 + 0.4) * h * 0.06;
    if (mouseOn) { tx = S.mouse.x; ty = S.mouse.y; }
    if (dive > 0) { tx = lerp(tx, cx, dive); ty = lerp(ty, cy, dive); }
    const speed = mn * 0.0058 * (1 + dive * 0.8);
    const dx = tx - this.hx, dy = ty - this.hy, dl = Math.hypot(dx, dy) || 1;
    this.ph += (dt / 60) * (1 + (dl < mn * 0.32 ? 3.2 : 0));
    const k = 1 - Math.pow(1 - (mouseOn ? 0.05 : 0.036), dt);
    this.vx += ((dx / dl) * speed - this.vx) * k; this.vy += ((dy / dl) * speed - this.vy) * k;
    const sp = Math.hypot(this.vx, this.vy) || 1, minS = speed * 0.55;
    if (sp < minS) { this.vx *= minS / sp; this.vy *= minS / sp; }
    this.hx += this.vx * dt; this.hy += this.vy * dt;
    const L = this.segLen * (1 - dive * 0.5);
    this.seg[0].x = this.hx; this.seg[0].y = this.hy;
    for (let i = 1; i < this.N; i++) {
      const a = this.seg[i - 1], b = this.seg[i];
      const ex = b.x - a.x, ey = b.y - a.y, el = Math.hypot(ex, ey) || 1;
      b.x = a.x + (ex / el) * L; b.y = a.y + (ey / el) * L;
    }
    this.flip = lerp(this.flip, this.vx < 0 ? -1 : 1, 1 - Math.pow(1 - 0.06, dt));
  },
  draw(t, k) {
    const ctx = this.ctx, N = this.N, seg = this.seg;
    const nx = this._nx || (this._nx = new Float32Array(N)), ny = this._ny || (this._ny = new Float32Array(N));
    for (let i = 0; i < N; i++) {
      const a = seg[Math.max(0, i - 1)], b = seg[Math.min(N - 1, i + 1)];
      const dx = a.x - b.x, dy = a.y - b.y, l = Math.hypot(dx, dy) || 1; nx[i] = -dy / l; ny[i] = dx / l;
    }
    const W = this.W * k, prof = u => sstep(0, 0.09, u) * Math.pow(1 - u, 0.85);
    ctx.lineCap = 'round';
    /* bayangan */
    ctx.strokeStyle = 'rgba(45,6,22,.26)';
    for (let i = 0; i < N - 1; i++) { const lw = W * prof(i / (N - 1)) * 1.25; if (lw < 0.4) continue; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(seg[i].x + 5, seg[i].y + 8); ctx.lineTo(seg[i + 1].x + 5, seg[i + 1].y + 8); ctx.stroke(); }
    /* pita yang menganyam (heliks 2D) */
    const K = this.cols.length;
    for (let r = 0; r < K; r++) {
      ctx.strokeStyle = this.cols[r]; const ph = (r * TAU) / K;
      let px = 0, py = 0;
      for (let i = 0; i < N; i++) {
        const u = i / (N - 1), w = W * prof(u);
        const arg = i * 0.21 - t * 2.4 + ph;
        const off = Math.sin(arg) * w * 0.62 + Math.sin(i * 0.26 - t * 4.2) * W * 0.35 * u;
        const x = seg[i].x + nx[i] * off, y = seg[i].y + ny[i] * off;
        if (i > 0) { const lw = w * 0.3 * (0.7 + 0.3 * Math.cos(arg)); if (lw > 0.25) { ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, y); ctx.stroke(); } }
        px = x; py = y;
      }
    }
    /* kepala (ruang lokal: +x = arah renang) */
    const h0 = seg[0], h3 = seg[3], ang = Math.atan2(h0.y - h3.y, h0.x - h3.x), s = W * 0.95;
    const fy = Math.abs(this.flip) < 0.02 ? 0.02 : this.flip;   /* balik vertikal halus saat berenang ke kiri, jambul tetap di atas */
    ctx.save(); ctx.translate(h0.x, h0.y); ctx.rotate(ang); ctx.scale(1, fy);
    /* kumis: dua kurva terbatas yang mengalir ke belakang */
    ctx.strokeStyle = 'rgba(251,243,228,.88)'; ctx.lineWidth = Math.max(0.8, s * 0.06);
    for (const sg of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(s * 1.0, sg * s * 0.22);
      for (let k2 = 1; k2 <= 14; k2++) { const u = k2 / 14; ctx.lineTo(s * 1.0 - u * s * 3.4, sg * (s * 0.22 + u * s * 0.85) + Math.sin(u * 6 - t * 5 + sg) * s * 0.38 * u); }
      ctx.stroke();
    }
    const pc = ['#f2b84b', '#e0492f', '#2e9184', '#6d4bb3'];
    for (let j = 0; j < 4; j++) {
      const wob = Math.sin(t * 3.1 + j * 1.3) * s * 0.35;
      ctx.strokeStyle = pc[j]; ctx.lineWidth = s * (0.2 - j * 0.035);
      ctx.beginPath(); ctx.moveTo(-s * 0.1, -s * 0.35);
      ctx.quadraticCurveTo(-s * (1.1 + j * 0.25), -s * (1.1 + j * 0.32) + wob, -s * (2.1 + j * 0.55), -s * (0.5 + j * 0.42) + wob * 1.6); ctx.stroke();
    }
    for (let j = 0; j < 2; j++) {
      const wob = Math.sin(t * 2.6 + j) * s * 0.3;
      ctx.strokeStyle = j ? '#f08a3c' : '#fbf3e4'; ctx.lineWidth = s * 0.12;
      ctx.beginPath(); ctx.moveTo(s * 0.2, s * 0.35); ctx.quadraticCurveTo(-s * 0.6, s * (1.0 + j * 0.3) + wob, -s * (1.5 + j * 0.4), s * (0.9 + j * 0.5) + wob); ctx.stroke();
    }
    ctx.fillStyle = '#e0492f'; ctx.beginPath(); ctx.moveTo(s * 1.35, 0);
    ctx.bezierCurveTo(s * 1.0, -s * 0.78, -s * 0.45, -s * 0.86, -s * 0.75, -s * 0.05);
    ctx.bezierCurveTo(-s * 0.5, s * 0.8, s * 1.0, s * 0.72, s * 1.35, 0); ctx.fill();
    ctx.strokeStyle = '#f2b84b'; ctx.lineWidth = s * 0.1; ctx.beginPath(); ctx.arc(-s * 0.05, s * 0.12, s * 0.32, -0.4, 2.6); ctx.stroke();
    ctx.fillStyle = '#f6d98c'; ctx.beginPath(); ctx.moveTo(s * 1.35, 0); ctx.lineTo(s * 0.92, -s * 0.13); ctx.lineTo(s * 0.98, s * 0.15); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fbf3e4'; ctx.beginPath(); ctx.ellipse(s * 0.45, -s * 0.22, s * 0.22, s * 0.19, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#151a4f'; ctx.beginPath(); ctx.arc(s * 0.5, -s * 0.22, s * 0.1, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(s * 0.54, -s * 0.27, s * 0.035, 0, TAU); ctx.fill();
    ctx.restore();
  }
};

/* =====================================================================
   3. HERO: judul MAX FLOW, pita navigasi, lapisan cat meleleh (koreografi asli pusaran.html)
   ===================================================================== */
/* masukan pemilik 11: hero kembali murni seperti pusaran.html, tanpa peta dan graf. Transisi peta ke graf pindah ke adegan Rute */
const Hero = {
  chars: [],
  build() {
    const h = $('#title'), txt = h.textContent.trim(); h.textContent = '';
    let i = 0;
    txt.split(/\s+/).forEach(word => {
      const w = document.createElement('span'); w.className = 'tw'; w.setAttribute('aria-hidden', 'true');
      [...word].forEach(ch => {
        const a = document.createElement('span'); a.className = 'ch'; a.style.setProperty('--i', i);
        const r0 = (((i * 37) % 7) - 3) * 0.8;
        a.innerHTML = `<span class="cw" style="--r0:${r0}deg;--r1:${(-r0 * 0.7).toFixed(2)}deg"><span class="ci">${ch}</span></span>`;
        w.appendChild(a); i++;
      });
      h.appendChild(w);
    });
    this.title = h; this.top = $('.hc-top'); this.bot = $('.hc-bot'); this.meta = $('#heroMeta'); this.hint = $('#heroHint'); this.rib = $('#ribbon');
    this.melts = [$('#melt0'), $('#melt1'), $('#melt2')];
    /* pusaran memakai (i-3)/3 untuk 7 huruf, di sini rumus umum supaya pecahnya simetris untuk jumlah huruf berapa pun */
    const mid = Math.max(1, (i - 1) / 2);
    this.chars = $$('.ci', h).map((ci, k) => { const r = mulberry32(k * 97 + 3); const side = (k - mid) / mid; return { ci, vx: side * 42 + (r() - 0.5) * 30, vy: (r() - 0.5) * 80 - 18, rz: (r() - 0.5) * 170, s: 0.3 + r() * 1.3 }; });
    $('#hintTxt').textContent = FINE ? 'gulir untuk mulai · klik untuk ganti warna' : 'gulir untuk mulai · ketuk untuk ganti warna';
  },
  layoutMelts() {
    const W = S.vw, H = Math.round(S.vh * 1.2), amp = H * 0.14;
    this.melts.forEach((svg, i) => { svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.firstElementChild.setAttribute('d', meltPath(W, H, 101 + i * 17, amp)); });
    const r = mulberry32(5150), st = [];
    for (let i = 0; i < 9; i++) st.push([r() * W, amp * 1.6 + r() * H * 0.35, 6 + r() * 14]);
    $('#melt2 .mstars').setAttribute('d', starsPath(st));
  },
  update(p) {
    /* reduced motion: huruf cukup memudar di tempat, pita memudar */
    const e = REDUCED ? 0 : E.inOut(inv(0.03, 0.5, p)), o = 1 - inv(0.2, 0.48, p);
    this.title.classList.toggle('free', e > 0.002);
    for (const c of this.chars) {
      setT(c.ci, e > 0.002 ? `translate3d(${(c.vx * e).toFixed(2)}vw,${(c.vy * e).toFixed(2)}vh,0) rotate(${(c.rz * e).toFixed(1)}deg) scale(${(1 + c.s * e).toFixed(3)})` : 'none');
      setO(c.ci, o);
    }
    const f = inv(0, 0.16, p), m = REDUCED ? 0 : 1;
    setT(this.top, `translate3d(0,${(-f * 40 * m).toFixed(1)}px,0)`); setO(this.top, 1 - f);
    setT(this.bot, `translate3d(0,${(f * 40 * m).toFixed(1)}px,0)`); setO(this.bot, 1 - f);
    setO(this.meta, 1 - f); setO(this.hint, 1 - f);
    if (REDUCED) setO(this.rib, 1 - inv(0, 0.22, p)); else setT(this.rib, `translate3d(0,${(-E.in(inv(0, 0.22, p)) * 170).toFixed(1)}px,0)`);
    const win = [[0.38, 0.82], [0.5, 0.9], [0.6, 0.995]];
    this.melts.forEach((m, i) => { const k = E.inOut(inv(win[i][0], win[i][1], p)); setT(m, `translate3d(0,${((1 - k) * 100).toFixed(2)}%,0)`); });
  }
};

const NAV = [['Max Flow', 'hero'], ['Masalah', 'lorong'], ['Tim', 'kartu'], ['Graf', 'rasi'], ['Rute', 'goresan'], ['Data', 'data'], ['Aliran', 'aliran'], ['Akhir', 'akhir']];
function tailPath(P, Q, th) {
  let tx = P[0] - Q[0], ty = P[1] - Q[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
  const nx = -ty, ny = tx, h = th * 0.5, L = th * 1.15;
  const bx = P[0] - tx * th * 0.9, by = P[1] - ty * th * 0.9 + th * 0.42;
  const pt = (x, y) => x.toFixed(1) + ' ' + y.toFixed(1);
  return `M${pt(bx + nx * h, by + ny * h)} L${pt(bx + nx * h + tx * L * 1.6, by + ny * h + ty * L * 1.6)} L${pt(bx + tx * L * 1.15, by + ty * L * 1.15)} L${pt(bx - nx * h + tx * L * 1.6, by - ny * h + ty * L * 1.6)} L${pt(bx - nx * h, by - ny * h)}Z`;
}
const Ribbon = {
  build() {
    this.nav = NAV.map(([n, k], i) => (i ? '<tspan class="sep"> ✶ </tspan>' : '') + `<tspan class="go" data-go="${k}">${n.toUpperCase()}</tspan>`).join('');
    this.ids = ['rbPath', 'rbBody', 'rbShadow', 'rbStA', 'rbStB', 'rbTailL', 'rbTailR', 'rbText'].reduce((o, id) => (o[id] = $('#' + id), o), {});
  },
  layout() {
    const s = small(); this.w = S.vw; this.th = s ? 30 : 42; this.base = s ? 66 : 76; this.amp = s ? 7 : 11;
    const rb = $('#ribbon'); rb.setAttribute('viewBox', `0 0 ${S.vw} 150`);
    /* di HP delapan tautan adegan terlalu kecil untuk dibaca dan diketuk, jadi pita jadi hiasan dan navigasi lewat MENU */
    const isi = s ? '<tspan>GASIBU</tspan><tspan class="sep"> ✶ </tspan><tspan>MAX FLOW</tspan>' : this.nav;
    if (this._isi !== isi) { this._isi = isi; $('#rbTP').innerHTML = isi; }
    if (s) { rb.setAttribute('aria-hidden', 'true'); rb.removeAttribute('aria-label'); } else { rb.removeAttribute('aria-hidden'); rb.setAttribute('aria-label', 'Navigasi adegan'); }
    this.ids.rbBody.setAttribute('stroke-width', this.th); this.ids.rbShadow.setAttribute('stroke-width', this.th);
    this.update(0);
    const txt = this.ids.rbText; let fs = s ? 13 : 17; txt.setAttribute('font-size', fs);
    try { const len = this.ids.rbPath.getTotalLength(), tl = txt.getComputedTextLength(); if (tl > len * 0.86) txt.setAttribute('font-size', (fs * (len * 0.86) / tl).toFixed(2)); } catch (e) {}
  },
  update(t) {
    const n = 44, x0 = this.w * 0.05, x1 = this.w * 0.95, pts = [];
    for (let i = 0; i <= n; i++) { const u = i / n; pts.push([lerp(x0, x1, u), this.base + Math.sin(u * TAU * 1.2 + t * 1.3) * this.amp + Math.sin(u * TAU * 0.45 - t * 0.7) * this.amp * 0.7]); }
    const d = 'M' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L');
    const off = o => { let s = ''; for (let i = 0; i < pts.length; i++) { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)]; const tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1; s += (i ? 'L' : 'M') + (pts[i][0] - (ty / l) * o).toFixed(1) + ' ' + (pts[i][1] + (tx / l) * o).toFixed(1); } return s; };
    const I = this.ids;
    I.rbPath.setAttribute('d', d); I.rbBody.setAttribute('d', d); I.rbShadow.setAttribute('d', d);
    I.rbStA.setAttribute('d', off(this.th / 2 - 5)); I.rbStB.setAttribute('d', off(-(this.th / 2 - 5)));
    I.rbTailL.setAttribute('d', tailPath(pts[0], pts[1], this.th)); I.rbTailR.setAttribute('d', tailPath(pts[n], pts[n - 1], this.th));
  }
};

/* =====================================================================
   4. MASALAH (lorong pusaran): cincin cat, benda melayang tubes, kliping berita
   ===================================================================== */
/* kliping dari daftar pustaka laporan kelompok; cap = caption lorong yang ditemani (berita 2011 dan 2022 ikut caption riwayat) */
const KLIPING = [
  { f: 'kliping-01-ulasbandung-2026-04-26.webp', media: 'UlasBandung', tgl: '26 April 2026', judul: 'Penataan Monju Bandung belum hentikan pasar tumpah Gasibu', url: 'https://www.ulasbandung.com/bewara/1442589042/penataan-monju-bandung-belum-hentikan-pasar-tumpah-gasibu-minggu-pagi-tetap-dipadati-pedagang-dan-ribuan-pengunjung', cap: 0 },
  { f: 'kliping-05-detiknews-2011-04-17.webp', media: 'detikNews', tgl: '17 April 2011', judul: 'Gasibu kembali macet, badan jalan dipakai parkir', url: 'https://news.detik.com/berita-jawa-barat/d-1619088/gasibu-kembali-macet-badan-jalan-dipakai-parkir', cap: 1 },
  { f: 'kliping-06-dprd-kota-bandung-2011-01-10.webp', media: 'DPRD Kota Bandung', tgl: '10 Januari 2011', judul: 'Dilema pasar tumpah Gasibo Bandung', url: 'https://dprd.bandung.go.id/warta/dilema-pasar-tumpah-gasibo-bandung', cap: 2 },
  { f: 'kliping-04-kumparan-2022-09-04.webp', media: 'kumparan', tgl: '4 September 2022', judul: 'Pasar Minggu di kawasan Gasibu Bandung kini lebih tertata', url: 'https://kumparan.com/ciremaitoday/pasar-minggu-di-kawasan-gasibu-bandung-kini-lebih-tertata-1ynJM7MGARA', cap: 2 },
  { f: 'kliping-02-detikjabar-2026-07-10.webp', media: 'detikJabar', tgl: '10 Juli 2026', judul: 'Jalan Diponegoro ditutup permanen', url: 'https://www.detik.com/jabar/berita/d-8568802/jalan-diponegoro-ditutup-permanen', cap: 2 },
  { f: 'kliping-03-detikjabar-2026-09-01.webp', media: 'detikJabar', tgl: '1 September 2026', judul: 'Alasan Gasibu ditutup hingga awal 2027', url: 'https://www.detik.com/jabar/berita/d-8643356/alasan-gasibu-ditutup-hingga-awal-2027', cap: 0 }
];
const Tun = {
  cv: $('#tunnel'), ctx: null, d: 1, N: 18, M: 140, rings: [], fl: [], vpX: null, vpY: null, caps: [], kl: [], dimuat: false,
  build() {
    const rand = mulberry32(2026);
    const cols = ['#b9a2e6', '#86c8e3', '#a3d9bb', '#f6d98c', '#f2a7b8', '#8c95e3', '#e8737a', '#f4a261', '#9fd3e6'];
    for (let i = 0; i < this.N; i++) {
      const drips = [], nd = rand() < 0.75 ? 2 + ((rand() * 4) | 0) : 0;
      for (let j = 0; j < nd; j++) drips.push({ a: Math.PI / 2 + (rand() * 2 - 1) * 0.95, w: 0.08 + rand() * 0.12, len: 0.07 + rand() * 0.2, ph: rand() * TAU });
      const stars = [], ns = rand() < 0.6 ? 1 + ((rand() * 3) | 0) : 0;
      for (let j = 0; j < ns; j++) stars.push({ a: rand() * TAU, r: 0.8 + rand() * 0.12, s: 0.018 + rand() * 0.02 });
      this.rings.push({ c: hex2rgb(cols[i % cols.length]), a1: 0.02 + rand() * 0.035, a2: 0.01 + rand() * 0.025, a3: 0.004 + rand() * 0.01, p1: rand() * TAU, p2: rand() * TAU, p3: rand() * TAU, tw: rand() * TAU, dir: rand() < 0.5 ? -1 : 1, drips, stars });
    }
    const kinds = ['f-lapak', 'f-gerobak', 'f-motor', 'f-mobil', 'f-angkot', 'f-cctv', 'f-lampu', 'f-gedungsate', 'f-pohon', 'f-pin'];
    const wrap = $('#floaters');
    kinds.forEach((k, i) => {
      const el = document.createElement('div'); el.className = 'floater';
      el.innerHTML = `<svg viewBox="0 0 200 200"><use href="#${k}"/></svg>`; wrap.appendChild(el);
      if (REDUCED) { const s = el.firstElementChild; if (s.pauseAnimations) s.pauseAnimations(); }
      this.fl.push({ el, seed: i / kinds.length + rand() * 0.05, ang: rand() * TAU, spin: (rand() < 0.5 ? -1 : 1) * (120 + rand() * 260), rot0: rand() * 360, dist: 0.42 + rand() * 0.25 });
    });
    this.caps = $$('#L-lorong .cap').map(el => ({ el, a: +el.dataset.a, b: +el.dataset.b, h: el.querySelector('.split'), sub: el.querySelector('.sub') }));
    this.flash = $('#flash'); this.depth = $('#depthNum');
    /* kliping: kartu kertas yang melayang keluar dari lorong lalu berhenti di samping caption */
    const kw = $('#klips'), per = {};
    this.kl = KLIPING.map(k => {
      const j = per[k.cap] = (per[k.cap] || 0) + 1;
      const a = document.createElement('a');
      a.className = 'klip'; a.href = k.url; a.target = '_blank'; a.rel = 'noopener';
      a.setAttribute('aria-label', `Berita ${k.media} ${k.tgl}: ${k.judul}. Buka di tab baru`);
      a.innerHTML = `<img class="kimg" alt="" decoding="async" data-src="${BASE}assets/${k.f}"><span class="km">${esc(k.media)} · ${esc(k.tgl)}</span><span class="kj">${esc(k.judul)}</span><span class="kb">Buka berita</span>`;
      kw.appendChild(a);
      return { el: a, k, j: j - 1, spin: (rand() - 0.5) * 70 };
    });
    this.kl.forEach(o => { o.n = per[o.k.cap]; });
    /* jarak lurus ke Gasibu Atas (tengah V_Gasibu_Barat dan V_Gasibu_Timur) sambil berjalan di rute S1 lewat Gasibu Atas */
    const g = D.g, gb = g.nodes.V_Gasibu_Barat, gt = g.nodes.V_Gasibu_Timur, r = D.gasibu.find(p => p.nodeIds[0] === 'S1');
    if (gb && gt && r) {
      const mid = [(gb.lat + gt.lat) / 2, (gb.lng + gt.lng) / 2];
      let bi = 0, bd = Infinity; r.coords.forEach((c, i) => { const dd = jarak(c, [gb.lat, gb.lng]); if (dd < bd) { bd = dd; bi = i; } });
      const pts = r.coords.slice(0, bi + 1).concat([mid]), cum = [0];
      for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + jarak(pts[i - 1], pts[i]));
      this.jalur = { pts, cum, L: cum[cum.length - 1], mid };
    }
  },
  muat() { if (this.dimuat) return; this.dimuat = true; this.kl.forEach(o => { const im = o.el.firstElementChild; im.src = im.dataset.src; }); },
  jarakPada(p) {
    const J = this.jalur; if (!J) return 0;
    const s = p * J.L; let i = 1; while (i < J.cum.length - 1 && J.cum[i] < s) i++;
    const u = clamp((s - J.cum[i - 1]) / ((J.cum[i] - J.cum[i - 1]) || 1)), a = J.pts[i - 1], b = J.pts[i];
    return jarak([lerp(a[0], b[0], u), lerp(a[1], b[1], u)], J.mid);
  },
  /* masukan pemilik 7: tiap caption punya komposisi sendiri (data-pos di HTML), kliping selalu di sisi seberang teks.
     Desktop: teks kiri bawah, kliping kanan atas, lalu teks kanan atas, kliping kiri bawah, dan seterusnya. HP: teks bergantian
     atas dan bawah, kliping di ruang sisanya. Kliping disusun dalam grid tanpa tumpang tindih, di luar zona HUD (label adegan,
     penghitung jarak, dial) dan di luar caption. Lebar kartu dihitung dari ruang yang ada. */
  layoutKlip() {
    const vw = S.vw, vh = S.vh, sm = small(), pad = clamp(vw * 0.026, 16, 38), gap = sm ? 14 : 32;   // jarak cukup supaya kartu yang sedikit miring tidak bersentuhan
    const kotak = el => { const r = el.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom]; };
    this.caps.forEach(c => { const a = kotak(c.h), b = kotak(c.sub); c.kotak = [Math.min(a[0], b[0]), a[1], Math.max(a[2], b[2]), b[3]]; c.pos = c.el.dataset.pos || 'lb'; });
    const dep = $('#L-lorong .depth'), depB = kotak(dep)[3], tagB = kotak($('#L-lorong .tag-row'))[3];
    const dial = $('.hud-dial'), dialT = dial ? kotak(dial)[1] : vh - pad - 46;
    const tinggi = el => el.offsetHeight || el.offsetWidth * 1.05;
    const per = {}; this.kl.forEach(o => { (per[o.k.cap] = per[o.k.cap] || []).push(o); });
    for (const k in per) {
      const L = per[k], n = L.length, c = this.caps[k], K = c.kotak, kanan = c.pos[0] === 'r', atas = c.pos[1] === 't';
      /* wilayah kliping: sisi seberang teks. Kliping di kanan menghindari penghitung jarak dan dial, di kiri menghindari label adegan */
      const reg = sm
        ? (atas ? [pad, K[3] + 18, vw - pad, dialT - 16] : [pad, depB + 14, vw - pad, K[1] - 14])
        : kanan ? [pad, tagB + 26, Math.min(vw * 0.5, K[0] - 40), vh - pad - 6] : [Math.max(vw * 0.5, K[2] + 40), depB + 26, vw - pad, dialT - 22];
      const RW = reg[2] - reg[0], RH = reg[3] - reg[1];
      const ax = sm ? 0.5 : kanan ? 0.22 : 0.78, ay = sm ? 0.5 : atas ? 0.88 : 0.12;   // condong ke pojok seberang teks, pusat lorong tetap terlihat
      const pas = cols => {   // lebar kartu terbesar yang muat untuk jumlah kolom ini
        const rows = Math.ceil(n / cols);
        let w = Math.min(sm ? 190 : 290, (RW - gap * (cols - 1)) / cols);
        L.forEach(o => { o.el.style.width = w.toFixed(1) + 'px'; });
        let h = Math.max(...L.map(o => tinggi(o.el)));
        for (let q = 0; q < 4 && rows * h + gap * (rows - 1) > RH - 8; q++) {   // terlalu tinggi: perkecil lalu ukur ulang (teks bisa jadi lebih banyak baris)
          w *= Math.max(0.6, (RH - 8 - gap * (rows - 1)) / (rows * h) * 0.98);
          L.forEach(o => { o.el.style.width = w.toFixed(1) + 'px'; });
          h = Math.max(...L.map(o => tinggi(o.el)));
        }
        return { cols, rows, w, h };
      };
      const opsi = n === 1 ? [pas(1)] : [pas(2), ...(n > 2 ? [pas(n)] : [])];
      const { cols, rows, w, h } = opsi.reduce((a, b) => (b.w > a.w ? b : a));
      L.forEach(o => { o.el.style.width = w.toFixed(1) + 'px'; });
      const gw = cols * w + gap * (cols - 1), gh = rows * h + gap * (rows - 1);
      const x0 = reg[0] + Math.max(0, RW - gw) * ax, y0 = reg[1] + Math.max(0, RH - gh) * ay;
      L.forEach((o, i) => {
        const r = Math.floor(i / cols), cc = i % cols, rowN = Math.min(cols, n - r * cols), off = (cols - rowN) * (w + gap) / 2;
        o.w = w; o.x = x0 + off + cc * (w + gap) + w / 2; o.y = y0 + r * (h + gap) + w * 0.62;   // update() memakai y - w*0,62 sebagai tepi atas
        o.r = [-3, 2.5, -1.5][i % 3] * (kanan ? -1 : 1);   // kemiringan ikut komposisi: kliping di kiri condong ke arah sebaliknya
      });
    }
    /* zona teks: benda melayang dipudarkan kalau lewat di sini */
    this.zona = [kotak($('#L-lorong .tag-row')), kotak(dep)];
  },
  resize() { this.d = Math.min(DPR, 1.5); this.cv.width = (S.vw * this.d) | 0; this.cv.height = (S.vh * this.d) | 0; this.ctx = this.cv.getContext('2d'); this.M = small() ? 96 : (S.degraded ? 90 : 140); },
  R(z, half) { return half * Math.exp((z - 0.86) * 6.6); },
  blob(ctx, cx, cy, R, r, t, rot) {
    const M = this.M; ctx.beginPath();
    for (let j = 0; j <= M; j++) {
      const th = (j / M) * TAU;
      let k = 1 + r.a1 * Math.sin(3 * th + r.p1 + rot) + r.a2 * Math.sin(5 * th + r.p2 - rot * 1.3 + t * 0.5) + r.a3 * Math.sin(9 * th + r.p3 + t * 0.3);
      for (const dr of r.drips) {
        let da = th - dr.a; da = Math.atan2(Math.sin(da), Math.cos(da));
        const u = da / dr.w;
        if (u > -1 && u < 1) { const q = 1 - u * u; k += dr.len * q * Math.sqrt(q) * (0.88 + 0.12 * Math.sin(t * 1.4 + dr.ph)); }
      }
      const x = cx + Math.cos(th) * R * k, y = cy + Math.sin(th) * R * k;
      j ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
  },
  update(p, t, dt) {
    this.muat();
    const ctx = this.ctx, w = S.vw, h = S.vh, cx = w / 2, cy = h / 2, half = Math.hypot(w, h) / 2;
    const mx = FINE ? S.mouse.sx : Math.sin(t * 0.5) * 0.6, my = FINE ? S.mouse.sy : Math.cos(t * 0.37) * 0.4;
    const tvx = cx + mx * w * 0.16 + Math.sin(t * 0.4) * w * 0.03, tvy = cy + my * h * 0.14 + Math.cos(t * 0.33) * h * 0.03;
    if (this.vpX === null) { this.vpX = tvx; this.vpY = tvy; }
    const kk = 1 - Math.pow(1 - 0.06, dt); this.vpX = lerp(this.vpX, tvx, kk); this.vpY = lerp(this.vpY, tvy, kk);
    ctx.setTransform(this.d, 0, 0, this.d, 0, 0); ctx.clearRect(0, 0, w, h);
    const shift = p * 2.8 + t * 0.012;
    const list = this.rings.map((r, i) => ({ r, z: fract(i / this.N + shift) })).sort((a, b) => b.z - a.z);
    const CREAM = C.cream;
    ctx.lineJoin = 'round';
    for (const { r, z } of list) {
      const R = this.R(z, half); if (R < 1) continue;
      const k = Math.pow(z, 1.6), ccx = lerp(this.vpX, cx, k), ccy = lerp(this.vpY, cy, k);
      const fog = Math.pow(1 - z, 2.2) * 0.75;
      const rot = r.tw + z * 1.6 + t * 0.06 * r.dir;
      this.blob(ctx, ccx, ccy + R * 0.02, R, r, t, rot);
      ctx.fillStyle = `rgba(35,42,120,${(0.1 + 0.12 * (1 - fog)).toFixed(3)})`; ctx.fill();
      this.blob(ctx, ccx, ccy, R, r, t, rot);
      ctx.fillStyle = rgba(mixc(r.c, CREAM, fog)); ctx.fill();
      ctx.lineWidth = Math.max(0.6, R * 0.006); ctx.strokeStyle = 'rgba(35,42,120,.22)'; ctx.stroke();
      if (r.stars.length && R > 30) {
        ctx.fillStyle = 'rgba(255,250,240,.92)';
        for (const s of r.stars) { const a = s.a + rot * 0.5; star4(ctx, ccx + Math.cos(a) * R * s.r, ccy + Math.sin(a) * R * s.r, R * s.s); }
      }
    }
    const fl = E.in(inv(0.84, 0.985, p)), LR = half * (0.12 + fl * 2.2);
    const g = ctx.createRadialGradient(this.vpX, this.vpY, 0, this.vpX, this.vpY, LR);
    g.addColorStop(0, 'rgba(255,250,236,1)'); g.addColorStop(0.35, 'rgba(251,243,228,.75)'); g.addColorStop(1, 'rgba(251,243,228,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    setO(this.cv, inv(0, 0.04, p));
    /* benda melayang */
    const fs = small() ? 0.72 : 1, gate = inv(0.01, 0.06, p) * (1 - inv(0.9, 0.98, p));
    for (const f of this.fl) {
      const z = fract(f.seed + p * 2.3 + t * 0.006), R = this.R(z, half), k = Math.pow(z, 1.6);
      const bx = lerp(this.vpX, cx, k), by = lerp(this.vpY, cy, k), a = f.ang + z * 1.4;
      const x = bx + Math.cos(a) * R * f.dist, y = by + Math.sin(a) * R * f.dist;
      const sc = clamp((R / half) * 1.25, 0, 2.6) * fs;
      const hr = 90 * sc, kena = this.zona && [...this.zona, ...this.caps.filter(c => p > c.a && p < c.b).map(c => c.kotak)].some(q => x + hr > q[0] && x - hr < q[2] && y + hr > q[1] && y - hr < q[3]);
      f.k = lerp(f.k == null ? 1 : f.k, kena ? 0 : 1, 1 - Math.pow(1 - 0.2, dt));   // teks tetap kontras: benda yang lewat di atasnya memudar
      const op = sstep(0.08, 0.24, z) * (1 - sstep(0.9, 0.99, z)) * gate * f.k;
      setO(f.el, op);
      if (op > 0.001) setT(f.el, `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) rotate(${(f.rot0 + f.spin * z).toFixed(1)}deg) scale(${sc.toFixed(3)})`);
    }
    /* kliping: keluar dari titik hilang, berhenti di slot, lalu terbang melewati kamera saat caption berganti */
    for (const o of this.kl) {
      const c = this.caps[o.k.cap]; if (!c) continue;
      const ea = c.a + 0.012 + o.j * 0.028, e = E.out5(inv(ea, ea + 0.085, p));
      const xo = E.in(inv(c.b - 0.055 + o.j * 0.006, c.b + o.j * 0.006, p));
      const dx = o.x - this.vpX, dy = o.y - this.vpY;
      const x = lerp(this.vpX, o.x, e) + dx * xo * 1.3, y = lerp(this.vpY, o.y, e) + dy * xo * 1.3;
      const sc = lerp(0.08, 1, e) * (1 + xo * 1.6), op = clamp(e * 1.6) * (1 - xo);
      setO(o.el, op);
      const live = op > 0.6; if (o.el._live !== live) { o.el._live = live; o.el.classList.toggle('hidup', live); o.el.tabIndex = live ? 0 : -1; }
      if (op > 0.001) setT(o.el, `translate3d(${(x - o.w / 2).toFixed(1)}px,${(y - o.w * 0.62).toFixed(1)}px,0) rotate(${(lerp(o.spin, o.r, e) + xo * 10).toFixed(2)}deg) scale(${sc.toFixed(3)})`);
    }
    /* teks */
    for (const c of this.caps) {
      c.words = c.words || c.h._w;
      rev(c.words, p, c.a, 0.07, c.b - 0.05, c.b);
      const so = inv(c.a + 0.04, c.a + 0.09, p) * (1 - inv(c.b - 0.05, c.b - 0.01, p));
      setO(c.sub, so); setT(c.sub, `translate3d(0,${((1 - so) * 14).toFixed(1)}px,0)`);
    }
    setTx(this.depth, bulat(this.jarakPada(p)));
    setO(this.flash, E.inOut(inv(0.9, 0.995, p)));
  }
};

/* =====================================================================
   5. TIM: lima kartu identitas 3D + matriks 4x4 live
   ===================================================================== */
/* satu-satunya tempat data anggota: foto (graph/assets/tim/), tugas, tautan portofolio */
const TIM = [
  { num: 'I', panggilan: 'Alifah', nama: 'Alifah Zachra Syifatunnajwa', foto: 'alifah.webp', peran: 'Visualisasi Ford-Fulkerson', url: 'https://portfolio-alifah.pages.dev/', suit: 's-titik', acc: '#e0492f', accL: '#f8d3c6',
    tugas: 'Membuat visualisasi Ford-Fulkerson di atas peta dari augmenting path dan residual sampai min cut, lalu ikut mengecek ulang CCTV yang bermasalah pada 1 November.' },
  { num: 'II', panggilan: 'Elang', nama: 'Elang Permadi Lau', foto: 'elang.webp', peran: 'Ford-Fulkerson', url: 'https://portfolio-blond-mu-7zngw837ue.vercel.app/', suit: 's-garis', acc: '#2e9184', accL: '#cdebe0',
    tugas: 'Mengerjakan algoritma Ford-Fulkerson untuk tiap pasangan source dan sink sambil mengubah faktor penyempitan di ruas pasar.' },
  { num: 'III', panggilan: 'Ganesh', nama: 'Ganesh Diyan Khansa Khairunnisa', foto: 'ganesh.webp', peran: 'Visualisasi Iterative', url: null, suit: 's-kurva', acc: '#6d4bb3', accL: '#ddd2f3',
    tugas: 'Membuat visualisasi Iterative Ford-Fulkerson dan ikut mengecek arah serta kondisi CCTV pada 31 Oktober.' },
  { num: 'IV', panggilan: 'Ghaisan', nama: 'Ghaisan Khoirul Badruzaman', foto: 'ghaisan.webp', peran: 'Data CCTV dan YOLO', url: 'https://ghaisan.vercel.app', suit: 's-bidang', acc: '#d6537a', accL: '#fad7da',
    tugas: 'Mengurus data CCTV dan rekaman HP lalu membuat program hitung kendaraan dengan YOLO, sekaligus menyusun situs ini dan bahan presentasi.' },
  { num: 'V', panggilan: 'Hafiz', nama: 'Hafiz Fauzan Syafrudin', foto: 'hafiz.webp', peran: 'Iterative Ford-Fulkerson', url: 'https://hafizfs.my.id/', suit: 's-cahaya', acc: '#c98a1f', accL: '#f8e6b8',
    tugas: 'Mengerjakan algoritma Iterative Ford-Fulkerson dan menyusun graf {rute} rute beserta spesifikasi jalannya, sekaligus mengelola repositori kelompok.' }
];
const tugasTxt = c => c.tugas.replace('{rute}', D ? D.n.rute : '');
const domain = u => { try { return new URL(u).host; } catch (e) { return u; } };
const FS = 'Iowan Old Style,Palatino Linotype,Palatino,Book Antiqua,Georgia,serif';
function cardFront(c, i) {
  const corner = `<text x="24" y="38" font-size="19" text-anchor="middle" font-family="${FS}" font-weight="700" fill="#232a78">${c.num}</text><use href="#${c.suit}" x="15" y="44" width="18" height="18" fill="${c.acc}" stroke="${c.acc}"/>`;
  const foto = `<image href="${BASE}assets/tim/${c.foto}" x="36" y="38" width="128" height="160" preserveAspectRatio="xMidYMid slice" clip-path="url(#cf${i})"/>`;
  return `<svg viewBox="0 0 200 290" aria-hidden="true">
  <defs><clipPath id="cf${i}"><rect x="36" y="38" width="128" height="160" rx="9"/></clipPath></defs>
  <rect width="200" height="290" rx="14" fill="#fffaf0"/>
  <rect x="8" y="8" width="184" height="274" rx="10" fill="none" stroke="#232a78" stroke-width="1.4"/>
  <rect x="13" y="13" width="174" height="264" rx="7" fill="none" stroke="${c.acc}" stroke-width=".9" stroke-dasharray="1.5 3"/>
  ${corner}<g transform="rotate(180 100 145)">${corner}</g>
  <rect x="36" y="38" width="128" height="160" rx="9" fill="${c.accL}"/>${foto}
  <rect x="36" y="38" width="128" height="160" rx="9" fill="none" stroke="#232a78" stroke-width="1.3"/>
  <text x="100" y="231" font-size="20" font-family="${FS}" font-weight="700" text-anchor="middle" fill="#232a78">${c.panggilan}</text>
  <text x="100" y="250" font-size="9.5" font-family="${FS}" font-weight="600" text-anchor="middle" fill="${c.acc}">${c.peran}</text>
</svg>`;
}
const M4 = {
  mul(a, b) { const r = new Array(16); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += a[i * 4 + k] * b[k * 4 + j]; r[i * 4 + j] = s; } return r; },
  T: (x, y, z) => [1, 0, 0, x, 0, 1, 0, y, 0, 0, 1, z, 0, 0, 0, 1],
  S: (s, t = s) => [s, 0, 0, 0, 0, t, 0, 0, 0, 0, s, 0, 0, 0, 0, 1],
  Rx: a => { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, 0, c, -s, 0, 0, s, c, 0, 0, 0, 0, 1]; },
  Ry: a => { const c = Math.cos(a), s = Math.sin(a); return [c, 0, s, 0, 0, 1, 0, 0, -s, 0, c, 0, 0, 0, 0, 1]; },
  Rz: a => { const c = Math.cos(a), s = Math.sin(a); return [c, -s, 0, 0, s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; }
};
/* pegas teredam dengan kecepatan awal nol (z = rasio redaman, makin kecil makin memantul), dipaksa berakhir tepat di 1
   supaya pose akhir kartu landscape tajam tanpa transform sisa */
const per = (t, z = 0.55) => {
  if (t <= 0) return 0; if (t >= 1) return 1;
  const w = 4.6 / z, wd = w * Math.sqrt(1 - z * z), x = 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + (z * w / wd) * Math.sin(wd * t));
  return lerp(x, 1, sstep(0.8, 1, t));
};
const PANAH = '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M4 10 10 4M5 4h5v5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
/* angkatan kartu saat disorot: kecil, supaya kartu tetap dekat posisi diamnya dan kartu di bawah kursor tetap yang terlihat */
const ANGKAT = { putar: 0.25, naik: 14 };
const Cards = {
  els: [], cw: 220, ch: 319, spread: 120, hover: -1, foc: -1, mh: -1, calon: -1, calonT: 0, hi: -1, hk: 0, pos: [], raw: [],
  /* detail landscape: cur = kartu yang sedang dimorf, m = progres morf 0 (portrait di kipas) sampai 1 (landscape terbuka).
     pin = kartu yang dibuka dengan klik, tutupS = kartu gulir yang baru ditutup pengguna (tidak dibuka lagi sampai ganti kartu) */
  cur: -1, m: 0, pin: -1, tutupS: -1, sI: -1, h0: 0, isiI: -1, from: null, fokus: false, geo: null,
  build() {
    const deck = $('#deck'); this.deck = deck;
    deck.innerHTML = TIM.map((c, i) => `<div class="card" style="--acc:${c.acc}" role="button" tabindex="0" aria-label="Buka kartu ${esc(c.nama)}"><div class="card-in"><div class="face front">${cardFront(c, i)}</div></div></div>`).join('');
    this.els = $$('.card', deck).map((el, i) => {
      el.addEventListener('focus', () => { this.foc = i; });
      el.addEventListener('blur', () => { if (this.foc === i) this.foc = -1; });
      /* dengan mouse, yang dibuka kartu yang tersorot di bawah kursor (bukan elemen yang kebetulan menutupi karena sedang terangkat) */
      el.addEventListener('click', e => { const j = FINE && e.detail ? this.hit(e.clientX, e.clientY) : -1; this.buka(j >= 0 ? j : i); });
      el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.buka(i); } });
      return { el, inn: el.firstElementChild };
    });
    const tl = $('#tl'); this.tl = tl;
    this.tk = { kertas: $('.tl-kertas', tl), muka: $('#tlMuka'), foto: $('.tl-foto', tl), img: $('#tlImg'), isi: $('.tl-isi', tl), sh: $('.tl-sh', tl), x: $('.tl-x', tl),
      teks: [$('#tlK'), $('#tlNama'), $('#tlPeran'), $('#tlTugas'), $('#tlAksi')] };
    this.tk.x.addEventListener('click', () => this.tutup());
    const nama = TIM.map(c => c.panggilan.toUpperCase()).join(' ✶ ') + ' ✶ ';
    $('#mqA').textContent = nama.repeat(8); $('#mqB').textContent = 'KELOMPOK 1 ✶ KELAS 2B ✶ D4 TEKNIK INFORMATIKA ✶ POLBAN ✶ '.repeat(8);
    const g = $('#mxG'); this.cells = []; for (let i = 0; i < 16; i++) { const s = document.createElement('span'); g.appendChild(s); this.cells.push(s); }
    this.pips = $$('#kPips span'); this.mx = $('#mx'); this.iris = $('#iris'); this.mqA = $('#mqA'); this.mqB = $('#mqB');
    this.mxCard = $('#mxCard'); this.mxTh = $('#mxTh'); this.sub = $('#kSub'); this.pipsBox = $('#kPips'); this.title = $('#kTitle'); this.tap = $('#kTap'); this.copy = $('.k-copy');
    this.tap.textContent = FINE ? 'Klik kartu untuk membuka' : 'Ketuk kartu untuk membuka';
    this.sub.textContent = `Kelompok kami ada ${kata(TIM.length)} orang yang masing-masing pegang satu bagian, jadi ` + (FINE ? 'arahkan kursor ke kartu lalu klik untuk melihat tugasnya.' : 'ketuk kartu untuk melihat tugasnya.');
  },
  layout() {
    const vw = S.vw, vh = S.vh, sm = small();
    this.small = sm;
    let cw = clamp(Math.min(vw * 0.165, vh * 0.28), 128, 250);
    if (sm) cw = clamp(Math.min(vw * 0.36, vh * 0.22), 110, 190);
    this.cw = cw; this.ch = cw * 1.45;
    for (const e of [this.deck, this.tl]) { e.style.setProperty('--cw', cw.toFixed(1) + 'px'); e.style.setProperty('--ch', this.ch.toFixed(1) + 'px'); }
    this.spread = sm ? Math.min(cw * 0.3, vw * 0.11) : Math.min(cw * 0.52, vw * 0.1);
    this.angK = sm ? 6 : 7;
    this.deckX = vw * (sm ? 0.5 : 0.59); this.deckY = vh * (sm ? 0.6 : 0.56);   // sama dengan left/top .deck di CSS
    this.mqW = Math.max(1, this.mqA.scrollWidth / 2); this.mqWB = Math.max(1, this.mqB.scrollWidth / 2);
    if (this.cur >= 0) this.tempat();
  },
  /* isi kartu landscape dari TIM (sekali per kartu), lalu ukur dan tempatkan */
  isi(i) {
    const c = TIM[i], k = this.tk;
    this.tl.style.setProperty('--acc-l', c.accL);
    k.muka.innerHTML = cardFront(c, 't');
    k.img.src = BASE + 'assets/tim/' + c.foto; k.img.alt = 'Foto ' + c.nama;
    k.teks[0].textContent = `Kartu ${c.num} · Kelompok 1`; k.teks[1].textContent = c.nama; k.teks[2].textContent = c.peran; k.teks[3].textContent = tugasTxt(c);
    k.teks[4].innerHTML = c.url ? `<a class="btn pri" href="${esc(c.url)}" target="_blank" rel="noopener" aria-label="Portofolio ${esc(c.panggilan)}, buka di tab baru">Lihat portofolio ${PANAH}</a>` : '';
    this.tl.setAttribute('aria-label', 'Detail ' + c.nama);
    this.tempat();
  },
  /* desktop: landscape di kanan kolom teks, di bawah navigasi dan di atas dial HUD. HP: tegak dengan foto di atas, di bawah judul.
     Huruf diperkecil sampai isinya muat, jadi tidak ada teks yang terpotong */
  tempat() {
    const vw = S.vw, vh = S.vh, tl = this.tl, st = tl.style, pad = clamp(vw * 0.026, 16, 38), nav = $('.snav') ? $('.snav').getBoundingClientRect().bottom : 64;
    const bawah = vh - pad - 46 - 14, kol = this.small;
    tl.classList.toggle('kol', kol);
    let W, H, cx, cy, u, g;
    if (!kol) {
      const kiri = this.copy.getBoundingClientRect().right + 28, kanan = vw - pad, atas = nav + 14;
      W = Math.min(kanan - kiri, 840); H = Math.min(bawah - atas, W * 0.56); W = Math.min(W, H * 1.95);
      const fw = Math.min(H * 0.8, W * 0.45);
      st.setProperty('--tw', W.toFixed(1) + 'px'); st.setProperty('--th', H.toFixed(1) + 'px'); st.setProperty('--fw', fw.toFixed(1) + 'px');
      u = clamp(H / 470, 0.78, 1.06); st.setProperty('--u', u.toFixed(3));
      /* isi dipusatkan vertikal, jadi kalau tidak muat baris pertamanya naik melewati padding atas (offsetTop tidak terpengaruh transform) */
      const pt = parseFloat(getComputedStyle(this.tk.isi).paddingTop), muat = () => this.tk.teks[0].offsetTop >= pt - 1;
      while (!muat() && u > 0.66) { u -= 0.03; st.setProperty('--u', u.toFixed(3)); }
      cx = (kiri + kanan) / 2; cy = (atas + bawah) / 2;
      g = { pw: fw, ph: H, fx: -W / 2 + fw / 2, fy: 0, ox: -W / 2 + fw, oy: 0 };
    } else {
      const atas = this.title.getBoundingClientRect().bottom + 12;
      W = Math.min(vw - pad * 2, 460);
      let ph = W * 0.62; u = 0.94;
      st.setProperty('--tw', W.toFixed(1) + 'px'); st.setProperty('--ph', ph.toFixed(1) + 'px'); st.setProperty('--u', u.toFixed(3));
      H = tl.offsetHeight;
      while (H > bawah - atas && (ph > W * 0.42 || u > 0.8)) {
        if (ph > W * 0.42) { ph -= W * 0.04; st.setProperty('--ph', ph.toFixed(1) + 'px'); } else { u -= 0.03; st.setProperty('--u', u.toFixed(3)); }
        H = tl.offsetHeight;
      }
      cx = vw / 2; cy = Math.max(atas + H / 2, (atas + bawah) / 2);
      g = { pw: W, ph, fx: 0, fy: -H / 2 + ph / 2, ox: 0, oy: -H / 2 + ph };
    }
    st.left = (cx - W / 2).toFixed(1) + 'px'; st.top = (cy - H / 2).toFixed(1) + 'px';
    this.geo = Object.assign(g, { W, H, cx, cy, kol });
  },
  /* pose layar kartu portrait i (proyeksi perspektif .k-stage 1500px, origin 50% 42%), termasuk angkatan sorot saat diklik */
  proj(i) { return this.pose(i, this.h0); },
  /* pose layar kartu i dengan angkatan sorot h (0 = diam di kipas, 1 = terangkat penuh) */
  pose(i, h) {
    const q = this.raw[i];
    const rz = lerp(q.rz, 0, ANGKAT.putar * h), z = q.z + 90 * h, s = 1 + 0.07 * h;
    const cx = this.deckX + q.x + this.ch * Math.sin(rz * RAD), cy = this.deckY + q.y - ANGKAT.naik * h + this.ch * (1 - Math.cos(rz * RAD));
    const k = 1500 / (1500 - z), ox = S.vw * 0.5, oy = S.vh * 0.42;
    return { x: ox + (cx - ox) * k, y: oy + (cy - oy) * k, w: this.cw * s * k, h: this.ch * s * k, r: rz };
  },
  /* kartu di bawah titik layar (mx, my) menurut bentuk DIAM tiap kartu di kipas: bagian kartu yang terlihat saat tidak ada yang
     terangkat. Kartu yang sedang terangkat tidak ikut memperluas daerahnya, jadi tiap kartu tetap kebagian giliran saat kursor
     digeser dan daerah sentuh tidak berubah-ubah (sorot tidak bolak-balik). Di daerah tumpang, kartu paling atas (indeks terbesar) menang */
  hit(mx, my) {
    if (this.raw.length < this.els.length) return -1;
    for (let i = this.els.length - 1; i >= 0; i--) {
      const P = this.pose(i, 0), dx = mx - P.x, dy = my - P.y, c = Math.cos(P.r * RAD), s = Math.sin(P.r * RAD);
      if (Math.abs(dx * c + dy * s) <= P.w / 2 && Math.abs(-dx * s + dy * c) <= P.h / 2) return i;
    }
    return -1;
  },
  mulai(i) {
    this.cur = i; this.m = 0;
    this.h0 = this.pin === i && this.hi === i ? this.hk : 0;
    if (this.isiI !== i) { this.isiI = i; this.isi(i); }
    this.tl.classList.add('on');
  },
  selesai() {
    const i = this.cur;
    if (this.h0 > 0) { this.hi = i; this.hk = this.h0; }   // kartu kembali tepat di pose sorotnya lalu turun pelan
    this.cur = -1; this.m = 0; this.h0 = 0;
    this.tl.classList.remove('on');
    const el = this.els[i].el; el._h = false; el.style.visibility = '';
    if (this.from === el) { this.from = null; el.focus({ preventScroll: true }); }
  },
  buka(i) {
    if (this.pin === i) return;
    this.pin = i; this.tutupS = -1; this.fokus = true; this.from = null;
  },
  tutup() {
    if (this.pin >= 0 && this.tl.contains(document.activeElement)) this.from = this.els[this.pin].el;   // fokus kembali ke kartunya setelah mendarat
    this.pin = -1; this.tutupS = this.sI;
  },
  reset() { this.pin = -1; this.from = null; if (this.cur >= 0) this.selesai(); },
  /* percikan bintang dari kanvas sparkle saat kartu landscape mendarat */
  percik() {
    const g = this.geo;
    for (let j = 0; j < 26; j++) {
      const a = (j / 26) * TAU + Math.random() * 0.2, ex = Math.cos(a), ey = Math.sin(a), d = Math.min(g.W / 2 / Math.max(Math.abs(ex), 1e-3), g.H / 2 / Math.max(Math.abs(ey), 1e-3));
      Cur.spawn(g.cx + ex * d, g.cy + ey * d, ex * 45, ey * 45);
    }
  },
  /* morf portrait ke landscape sebagai fungsi m saja, jadi gulir dan klik memakai gerakan yang persis sama:
     angkat dan goyang, terbang sambil memutar dan melebar (pegas, squash and stretch), foto meluncur ke kiri,
     panel teks terbuka seperti lipatan kertas, teks muncul berurutan, tombol tutup meletup */
  render() {
    const g = this.geo, m = this.m, k = this.tk, tl = this.tl, aktif = m > 0.9;
    if (tl._akt !== aktif) {
      tl._akt = aktif; tl.classList.toggle('aktif', aktif); tl.inert = !aktif; tl.setAttribute('aria-hidden', String(!aktif));
      if (aktif && this.fokus && this.pin === this.cur) { this.fokus = false; k.x.focus({ preventScroll: true }); }
    }
    if (REDUCED) { setO(tl, m); return null; }
    const P = this.proj(this.cur);
    const a = inv(0, 0.24, m), angkat = E.out(a) * (1 - inv(0.3, 0.62, m)), goy = Math.sin(a * Math.PI * 4) * Math.sin(a * Math.PI) * 6;
    const b = inv(0.14, 0.7, m), pb = per(b, 0.72), lift = 1 + 0.07 * angkat, land = Math.sin(Math.PI * inv(0.5, 0.8, m));
    const sx = lerp(P.w * lift / g.W, 1, per(inv(0.2, 0.74, m), 0.62)) * (1 + 0.04 * land), sy = lerp(P.h * lift / g.H, 1, per(inv(0.24, 0.8, m), 0.5)) * (1 - 0.07 * land);
    const tx = lerp(P.x - g.cx, 0, pb), ty = lerp(P.y - g.cy, 0, pb) - 20 * angkat;
    const r = lerp(P.r + goy, 0, pb) - 10 * Math.sin(Math.PI * b), co = Math.cos(r * RAD), si = Math.sin(r * RAD);
    const peta = (qx, qy) => [tx + qx * co - qy * si, ty + qx * si + qy * co];   // titik lokal lembar (sudah diskala) relatif pusat akhir
    const f = n => n.toFixed(2), rot = ` rotate(${f(r)}deg)`;
    setT(k.kertas, `translate(${f(tx)}px,${f(ty)}px)${rot} scale(${sx.toFixed(4)},${sy.toFixed(4)})`); setO(k.kertas, inv(0.1, 0.2, m));
    const ps = sy * g.H / this.ch, mw = this.cw * ps, mh = this.ch * ps;   // ukuran muka portrait (proporsional, mengikuti tinggi lembar)
    setT(k.muka, `translate(${f(tx)}px,${f(ty)}px)${rot} scale(${ps.toFixed(4)})`); setO(k.muka, 1 - inv(0.2, 0.32, m));
    /* foto: mulai di bidang foto kartu portrait, meluncur ke sisi kiri (HP: ke atas). Wadah diskala, gambar diskala balik supaya tidak penyok */
    const c = per(inv(0.3, 0.8, m), 0.62);
    const [fx, fy] = peta(lerp(0, g.fx * sx, c), lerp(-0.093 * mh, g.fy * sy, c));
    const fsx = lerp(0.64 * mw, g.pw, c) / g.pw, fsy = lerp(0.552 * mh, g.ph, c) / g.ph, cs = Math.max(fsx, fsy);
    setT(k.foto, `translate(${f(fx - g.fx)}px,${f(fy - g.fy)}px)${rot} scale(${fsx.toFixed(4)},${fsy.toFixed(4)})`); setO(k.foto, inv(0.12, 0.2, m));
    setT(k.img, `scale(${(cs / fsx).toFixed(4)},${(cs / fsy).toFixed(4)})`);
    /* panel teks: engsel di tepi foto, terbuka dari tegak lurus ke datar dengan sedikit pantulan */
    const ang = (1 - per(inv(0.42, 0.9, m), 0.5)) * 90, [ox, oy] = peta(g.ox * sx, g.oy * sy);
    setT(k.isi, `translate(${f(ox - g.ox)}px,${f(oy - g.oy)}px)${rot} perspective(${Math.round(g.W * 1.4)}px) ${g.kol ? `rotateX(${f(-ang)}deg)` : `rotateY(${f(ang)}deg)`}`);
    setO(k.isi, inv(0.42, 0.47, m)); setO(k.sh, Math.abs(Math.sin(ang * RAD)) * 0.2);
    k.teks.forEach((e, j) => { const o = inv(0.6 + j * 0.055, 0.76 + j * 0.055, m); setO(e, o); setT(e, `translate3d(0,${((1 - E.out(o)) * 12).toFixed(1)}px,0)`); });
    const xq = g.W / 2 - 36, yq = -g.H / 2 + 36, pop = per(inv(0.66, 1, m), 0.45), [xx, xy] = peta(xq * sx, yq * sy);
    setT(k.x, `translate(${f(xx - xq)}px,${f(xy - yq)}px) rotate(${f(r - (1 - pop) * 120)}deg) scale(${Math.max(0.001, pop).toFixed(3)})`); setO(k.x, inv(0.66, 0.72, m));
    return { i: this.cur, x: tx, y: ty, z: 0, rz: r, s: sx, sy, rx: 0, ry: 0 };
  },
  update(p, t, dt) {
    /* target morf dari gulir: tiap kartu punya jendela sendiri, terbuka lalu menutup lagi sebelum kartu berikutnya */
    let sI = -1, sM = 0;
    for (let i = 0; i < 5; i++) { const a = 0.24 + i * 0.134, lt = inv(a, a + 0.134, p), v = Math.min(inv(0.04, 0.34, lt), 1 - inv(0.7, 0.96, lt)); if (v > sM) { sM = v; sI = i; } }
    if (sI !== this.tutupS) this.tutupS = -1;
    this.sI = sI;
    const tc = this.pin >= 0 ? this.pin : sI === this.tutupS ? -1 : sI, tm = this.pin >= 0 ? 1 : sM;
    if (this.cur < 0 && tc >= 0 && tm > 0) this.mulai(tc);
    /* m mengejar target dengan kecepatan terbatas: klik jadi animasi waktu 850 ms (tutup 600 ms), gulir tetap mengikuti gulir */
    const goal = this.cur === tc ? tm : 0, naik = goal > this.m, v = dt / 60 / (REDUCED ? 0.22 : naik ? 0.85 : 0.6), m0 = this.m;
    this.m = naik ? Math.min(goal, this.m + v) : Math.max(goal, this.m - v);
    if (this.cur >= 0 && this.m <= 0) this.selesai();
    if (!REDUCED && m0 < 0.62 && this.m >= 0.62) this.percik();
    const buka = this.cur >= 0;
    /* sorot hover/fokus: dianimasikan waktu (bukan gulir), kartu terangkat di tempat dan kartu lain meredup. Mati selama detail terbuka.
       Dengan mouse, yang disorot hanya kartu yang benar-benar di bawah kursor (hit). Pindah dari satu kartu ke kartu lain baru terjadi
       setelah kursor sekitar 90 ms di kartu baru, dan sorot hilang 140 ms setelah kursor keluar, jadi menyenggol batas tidak berkedip */
    const now = performance.now();
    const tunjuk = FINE && !buka && S.mouse.last > 0 ? this.hit(S.mouse.x, S.mouse.y) : -1;
    if (tunjuk !== this.calon) { this.calon = tunjuk; this.calonT = now; }
    if (tunjuk !== this.mh && (this.mh < 0 || now - this.calonT > (tunjuk < 0 ? 140 : 90))) this.mh = tunjuk;
    if (buka) this.mh = -1;
    this.hover = buka ? -1 : this.mh >= 0 ? this.mh : this.foc;
    if (this.hover >= 0) this.hi = this.hover;
    this.hk = lerp(this.hk, this.hover >= 0 ? 1 : 0, 1 - Math.pow(1 - (REDUCED ? 1 : 0.16), dt));
    if (this.hover < 0 && this.hk < 0.003) { this.hk = 0; this.hi = -1; }
    const hi = this.hi, hk = hi >= 0 ? this.hk : 0;
    const fanE = E.inOut(inv(0.1, 0.22, p)), angK = this.angK, geser = buka ? E.inOut(clamp(this.m * 1.5)) * 22 : 0;
    let mxData = null;
    for (let i = 0; i < 5; i++) {
      const { el, inn } = this.els[i], off = i - 2;
      const enter = E.out5(inv(i * 0.018, 0.1 + i * 0.018, p));
      let x = off * this.spread * fanE + (1 - fanE) * off * 3;
      let y = (1 - enter) * S.vh * 0.95 + off * off * 6 * fanE + (i !== this.cur ? geser : 0);   // kartu lain bergeser sedikit memberi ruang
      let rz = lerp(off * 2.5 + (i % 2 ? 3 : -2), off * angK, fanE), z = i * 2, s = 1, ry = 0, rx = 0;
      this.raw[i] = { x, y, z, rz };
      this.pos[i] = [x + this.ch * Math.sin(rz * RAD), y + this.ch * (1 - Math.cos(rz * RAD))];   // pusat kartu sebelum disorot, sudah diputar di transform-origin 50% 150%
      if (i === hi && hk > 0) {
        y -= ANGKAT.naik * hk; z += 90 * hk; s *= 1 + 0.07 * hk; rz = lerp(rz, 0, hk * ANGKAT.putar);
        rx = -S.mouse.sy * 7 * hk; ry = S.mouse.sx * 10 * hk;
      }
      setT(el, `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,${z.toFixed(1)}px) rotate(${rz.toFixed(2)}deg)`);
      setT(inn, `scale(${s.toFixed(4)}) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`);
      const dim = (hi >= 0 && i !== hi ? hk * 0.42 : 0).toFixed(2);
      if (el._dim !== dim) { el._dim = dim; el.style.setProperty('--dim', dim); }
      const hl = i === hi && hk > 0.5; if (el._hl !== hl) { el._hl = hl; el.classList.toggle('hl', hl); }
      const tiada = i === this.cur && this.m > 0 && !REDUCED; if (el._h !== tiada) { el._h = tiada; el.style.visibility = tiada ? 'hidden' : ''; }   // diganti salinannya di kartu landscape
      if (REDUCED) setO(el, i === this.cur ? 1 - this.m : 1);   // gerak dikurangi: crossfade kartu portrait ke landscape
      if (!buka && ((hk > 0.5 && i === hi) || (!(hk > 0.5) && i === 2))) mxData = { i, x, y, z, rz, s, sy: s, rx, ry };
    }
    if (buka) mxData = this.render() || mxData;
    /* matriks live (saat morf: matriks lembar landscape, skala x dan y terpisah karena squash and stretch) */
    if (mxData) {
      const r = Math.PI / 180, d = mxData;
      const mm = M4.mul(M4.mul(M4.mul(M4.mul(M4.T(d.x, d.y, d.z), M4.Rz(d.rz * r)), M4.S(d.s, d.sy)), M4.Rx(d.rx * r)), M4.Ry(d.ry * r));
      for (let k = 0; k < 16; k++) {
        const v = mm[k], str = (Math.abs(v) < 0.005 ? '0.00' : Math.abs(v) >= 10 ? v.toFixed(0) : v.toFixed(2)).replace('-', '−');
        const c = this.cells[k]; if (c._x !== str) { c.classList.toggle('hot', c._x !== undefined); c._x = str; c.textContent = str; }
      }
      setTx(this.mxCard, TIM[d.i].num + ' · ' + TIM[d.i].panggilan); setTx(this.mxTh, Math.round(((d.ry % 360) + 360) % 360) + '°');
    }
    const on = buka && this.m > 0.5 ? this.cur : hk > 0.5 ? hi : -1;
    this.pips.forEach((pp, k) => pp.classList.toggle('on', k === on));
    const sh = p * 1600 + t * 28;
    setT(this.mqA, `translate3d(${(-(sh % this.mqW)).toFixed(1)}px,0,0)`);
    setT(this.mqB, `translate3d(${(-this.mqWB + (sh % this.mqWB)).toFixed(1)}px,0,0)`);
    this.title._w && rev(this.title._w, p, 0.015, 0.08);
    const hp = this.small && buka ? 1 - clamp(this.m * 3) : 1;   // HP: pip, petunjuk ketuk, dan matriks memberi tempat untuk kartu landscape
    setO(this.sub, inv(0.05, 0.1, p)); setO(this.pipsBox, inv(0.08, 0.14, p) * hp); setO(this.tap, inv(0.08, 0.14, p) * hp); setO(this.mx, inv(0.2, 0.26, p) * hp);
    const ir = E.inOut(inv(0.9, 0.995, p)) * Math.hypot(S.vw, S.vh) * 0.56;
    const cp = `circle(${ir.toFixed(1)}px at 50% 50%)`; if (this.iris._cp !== cp) { this.iris._cp = cp; this.iris.style.clipPath = cp; this.iris.style.webkitClipPath = cp; }
  }
};

/* =====================================================================
   6. GRAF: graf asli GRAPH_DATA + BFS dari S1 + langit berbintang
   ===================================================================== */
const Rasi = {
  lastP: -1,
  build() {
    const NS = 'http://www.w3.org/2000/svg', g = D.g;
    const mk = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
    /* proyeksi ekuirektangular ke viewBox 1000 x 640, padding 70 (sama dengan storyboard-angka.txt bagian 5) */
    const lats = D.ids.map(id => g.nodes[id].lat), lngs = D.ids.map(id => g.nodes[id].lng);
    const lat0 = (Math.min(...lats) + Math.max(...lats)) / 2, lng0 = (Math.min(...lngs) + Math.max(...lngs)) / 2;
    const XS = D.ids.map(id => (g.nodes[id].lng - lng0) * 111320 * Math.cos(lat0 * RAD)), YS = D.ids.map(id => -(g.nodes[id].lat - lat0) * 110574);
    const x0 = Math.min(...XS), y0 = Math.min(...YS), sx = Math.max(...XS) - x0, sy = Math.max(...YS) - y0, sc = Math.min(860 / sx, 500 / sy);
    const ox = (1000 - sx * sc) / 2, oy = (640 - sy * sc) / 2;
    this.NODES = D.ids.map((id, i) => [+(ox + (XS[i] - x0) * sc).toFixed(1), +(oy + (YS[i] - y0) * sc).toFixed(1)]);
    this.EDGES = D.edges.map(e => [e.ia, e.ib]);
    const n = this.NODES.length, adj = Array.from({ length: n }, () => []);
    this.EDGES.forEach(([a, b], i) => { adj[a].push([b, i]); });   // berarah, mengikuti arah ruas
    const level = new Array(n).fill(-1), parent = new Array(n).fill(-1), order = [];
    level[0] = 0; const q = [0];
    while (q.length) { const v = q.shift(); order.push(v); for (const [u] of adj[v].slice().sort((x, y) => (D.ids[x[0]] < D.ids[y[0]] ? -1 : 1))) if (level[u] < 0) { level[u] = level[v] + 1; parent[u] = v; q.push(u); } }
    this.level = level; this.order = order; this.maxL = Math.max(...level); this.lw = 0.3 / (this.maxL + 1);
    const lvE = v => (level[v] < 0 ? this.maxL + 1 : level[v]);
    const gG = $('#gGhost'), gE = $('#gEdges'), gT = $('#gTree'), gN = $('#gNodes');
    const dE = ([a, b]) => `M${this.NODES[a][0]} ${this.NODES[a][1]} L${this.NODES[b][0]} ${this.NODES[b][1]}`;
    this.EDGES.forEach(e => mk('path', { d: dE(e), fill: 'none', stroke: 'rgba(240,138,60,.14)', 'stroke-width': 30, 'stroke-linecap': 'round' }, gG));
    this.NODES.forEach(([x, y]) => mk('circle', { cx: x, cy: y, r: 62, fill: 'url(#ghostG)' }, gG));
    const lv = i => [Math.min(lvE(this.EDGES[i][0]), lvE(this.EDGES[i][1])), Math.max(lvE(this.EDGES[i][0]), lvE(this.EDGES[i][1]))];
    const eorder = this.EDGES.map((e, i) => i).sort((i, j) => (lv(i)[0] - lv(j)[0]) || (lv(i)[1] - lv(j)[1]) || (i - j));
    this.edgeEls = eorder.map((ei, rank) => {
      const d = dE(this.EDGES[ei]), e = D.edges[ei], o = { rank };
      if (e.a === 'V_Gasibu_Barat' && e.b === 'V_Gasibu_Timur') o.pz = mk('path', { d, class: 'e-pasar', pathLength: 1, 'stroke-dasharray': '1 1', 'stroke-dashoffset': 1 }, gE);
      o.g = mk('path', { d, class: 'e-glow', pathLength: 1, 'stroke-dashoffset': 1 }, gE); o.s = mk('path', { d, class: 'e-base', pathLength: 1, 'stroke-dashoffset': 1 }, gE);
      return o;
    });
    this.treeEls = [];
    for (let v = 1; v < n; v++) { const pa = parent[v]; if (pa < 0) continue; const d = dE([pa, v]); this.treeEls.push({ g: mk('path', { d, class: 't-glow', pathLength: 1, 'stroke-dashoffset': 1 }, gT), s: mk('path', { d, class: 't-line', pathLength: 1, 'stroke-dashoffset': 1 }, gT), lv: level[v] }); }
    const xorder = [...Array(n).keys()].sort((a, b) => this.NODES[a][0] - this.NODES[b][0]);
    const tip = $('#nTip'), layer = LAYERS.rasi;
    const tunjuk = v => {
      if (v < 0) { tip.classList.remove('on'); this.tipV = -1; return; }
      const id = D.ids[v], nd = g.nodes[id], r = this.nodeEls[v].g.getBoundingClientRect(), L = layer.getBoundingClientRect();
      tip.innerHTML = `<b>${esc(simpulTxt(id))}</b>${esc(bersih(nd.label))}<br>${nd.lat.toFixed(5)}, ${nd.lng.toFixed(5)}<br>dilewati ${(D.lewat[id] || []).length} rute · ${level[v] < 0 ? 'tidak terjangkau dari S1' : 'level ' + level[v]}`;
      tip.classList.add('on'); this.tipV = v;
      const tw = tip.offsetWidth, th = tip.offsetHeight, cx = r.left + r.width / 2 - L.left, cy = r.top - L.top;
      tip.style.transform = ''; tip.style.left = clamp(cx - tw / 2, 12, S.vw - tw - 12) + 'px'; tip.style.top = (cy - th - 12 < navH() + 8 ? r.bottom - L.top + 12 : cy - th - 12) + 'px';
    };
    this.tunjuk = tunjuk;
    this.nodeEls = this.NODES.map(([x, y], v) => {
      const id = D.ids[v], st = g.nodes[id].type !== 'junction';
      const gg = mk('g', { transform: `translate(${x} ${y}) scale(0)` }, gN);
      mk('circle', { r: 16, fill: 'transparent' }, gg);
      const ring = mk('circle', { r: 10, class: 'n-ring', opacity: 0 }, gg);
      const halo = mk('circle', { r: st ? 15 : 12, class: 'n-halo' }, gg); halo.style.animationDelay = (-v * 0.37).toFixed(2) + 's';
      const core = mk('circle', { r: st ? 6 : 4.4, class: 'n-core', fill: '#fbf3e4' }, gg);
      if (st) { const lbl = mk('text', { x: 11, y: -11, class: 'n-lbl st' }, gg); lbl.textContent = id; }
      gg.addEventListener('pointerenter', e => { if (e.pointerType !== 'touch') tunjuk(v); });
      gg.addEventListener('pointerleave', e => { if (e.pointerType !== 'touch' && this.tipV === v) tunjuk(-1); });
      gg.addEventListener('click', () => tunjuk(this.tipV === v ? -1 : v));
      return { g: gg, ring, core, x, y, rank: xorder.indexOf(v), lv: level[v] };
    });
    const seq = $('#rpSeq');
    this.chips = order.map(v => { const s = document.createElement('span'); s.textContent = /^[ST]\d$/.test(D.ids[v]) ? D.ids[v] : pendek(D.ids[v]); seq.appendChild(s); return { s, v }; });
    const tak = D.ids.filter((id, i) => level[i] < 0).map(id => (/^[ST]\d$/.test(id) ? id : pendek(id)));
    this.el = { wrap: $('#graphWrap'), ghost: gG, flood: $('#flood'), sub: $('#rasiSub'), rp: $('#rp'), V: $('#rpV'), E: $('#rpE'), X: $('#rpX'), L: $('#rpL'), title: $('#rasiTitle'), foot: $('#rpFoot') };
    this.el.foot.textContent = tak.length ? `tidak terjangkau dari S1: ${tak.join(', ')}` : '';
    this.seq = seq;
  },
  /* masukan pemilik 8: di layar pendek daftar simpul di panel BFS dipotong rapi lalu digulir otomatis ke simpul terakhir
     yang dikunjungi, jadi panel tetap di bawah kalimat tanpa menimpanya */
  layout() {
    const seq = this.seq; seq.scrollTop = 0; this._st = -1;
    this.luber = !small() && seq.scrollHeight > seq.clientHeight + 2;
    seq.classList.toggle('luber', this.luber);
    this.lastP = -1;
    Malam.posRasi(this);
    Stars.zona = ['#L-rasi .tag-row', '.rasi-copy', '#rp'].map(q => { const r = $(q).getBoundingClientRect(); return [r.left - 12, r.top - 10, r.right + 12, r.bottom + 10]; });
  },
  update(p) {
    const el = this.el;
    el.title._w && rev(el.title._w, p, 0.01, 0.08, 0.86, 0.92);
    setO(el.sub, inv(0.04, 0.1, p) * (1 - inv(0.86, 0.91, p)));
    setO(el.rp, inv(0.16, 0.22, p) * (1 - inv(0.88, 0.93, p)));
    if (this.tipV >= 0 && p > 0.88) this.tunjuk(-1);
    if (Math.abs(p - this.lastP) < 0.0001) return; this.lastP = p;
    const n = this.NODES.length, Ec = this.EDGES.length, lw = this.lw;
    let vis = 0, visited = 0;
    const vstate = new Array(n);
    for (let v = 0; v < n; v++) {
      const nd = this.nodeEls[v], a = 0.03 + (nd.rank / n) * 0.15, sc = E.back(inv(a, a + 0.05, p));
      if (sc > 0.01) vis++;
      const a2 = 0.55 + nd.lv * lw, vs = nd.lv < 0 ? 0 : nd.lv === 0 ? inv(0.55, 0.55 + lw * 0.6, p) : inv(a2 + lw * 0.55, a2 + lw, p);
      vstate[v] = vs; if (vs > 0.5) visited++;
      setA(nd.g, 'transform', `translate(${nd.x} ${nd.y}) scale(${(Math.max(0, sc) * (1 + vs * 0.35)).toFixed(3)})`);
      setA(nd.core, 'fill', vs > 0.5 ? '#f6d98c' : nd.lv < 0 && p > 0.86 ? '#8c95e3' : '#fbf3e4');
      const rp = nd.lv < 0 ? 0 : inv(a2 + lw * 0.4, a2 + lw * 1.6, p);
      setA(nd.ring, 'r', (8 + rp * 26).toFixed(1)); setA(nd.ring, 'opacity', (rp > 0 && rp < 1 ? (1 - rp) * 0.9 : 0).toFixed(2));
    }
    let drawn = 0;
    for (const e of this.edgeEls) { const a = 0.2 + (e.rank / Ec) * 0.3, k = E.inOut(inv(a, a + 0.05, p)); if (k > 0.99) drawn++; const off = (1 - k).toFixed(4); setA(e.s, 'stroke-dashoffset', off); setA(e.g, 'stroke-dashoffset', off); if (e.pz) setA(e.pz, 'stroke-dashoffset', off); }
    for (const te of this.treeEls) { const a2 = 0.55 + te.lv * lw, k = E.inOut(inv(a2, a2 + lw * 0.8, p)); const off = (1 - k).toFixed(4); setA(te.s, 'stroke-dashoffset', off); setA(te.g, 'stroke-dashoffset', off); }
    let akhir = null;
    for (const c of this.chips) { const on = vstate[c.v] > 0.5; if (c.s._on !== on) { c.s._on = on; c.s.classList.toggle('on', on); } if (on) akhir = c.s; }
    if (this.luber) {
      const seq = this.seq, maks = seq.scrollHeight - seq.clientHeight;
      const top = akhir ? clamp(akhir.offsetTop - seq.offsetTop + akhir.offsetHeight - seq.clientHeight + 8, 0, maks) : 0;
      if (Math.abs(top - this._st) > 1) { this._st = top; seq.scrollTo({ top, behavior: REDUCED ? 'auto' : 'smooth' }); }
    }
    setTx(el.V, String(vis)); setTx(el.E, String(drawn)); setTx(el.X, String(visited));
    setTx(el.L, p < 0.55 ? '-' : String(Math.min(this.maxL, Math.floor((p - 0.55) / lw))));
    const done = p > 0.55 + (this.maxL + 1) * lw; if (el.foot._on !== done) { el.foot._on = done; el.foot.classList.toggle('on', done); }
    setO(el.ghost, inv(0.8, 0.88, p) * 0.6 * (1 - inv(0.9, 0.96, p)));
    const warp = E.in(inv(0.9, 1, p));
    setT(el.wrap, `translate(-50%,-50%) scale(${(1 + warp * 2.4).toFixed(3)})`); setO(el.wrap, 1 - inv(0.9, 0.97, p));
    const fl = E.inOut(inv(0.93, 1, p)) * Math.hypot(S.vw, S.vh) * 0.56, cp = `circle(${fl.toFixed(1)}px at 50% 50%)`;
    if (el.flood._cp !== cp) { el.flood._cp = cp; el.flood.style.clipPath = cp; el.flood.style.webkitClipPath = cp; }
  }
};
const Stars = {
  cv: $('#stars'), list: [], shoot: null, nextShoot: 2, d: 1,
  resize() {
    this.d = Math.min(DPR, 1.5); const c = this.cv; c.width = (S.vw * this.d) | 0; c.height = (S.vh * this.d) | 0; this.ctx = c.getContext('2d');
    const r = mulberry32(404), n = Math.round((small() ? 120 : 220) * QUALITY);
    this.list = [];
    for (let i = 0; i < n; i++) { const q = r(); this.list.push({ x: r(), y: r(), r: 0.35 + Math.pow(r(), 4) * 1.9, ph: r() * TAU, sp: 0.5 + r() * 2.6, z: 0.2 + r() * 0.8, c: q < 0.2 ? '#f6d98c' : q < 0.3 ? '#c9b8f0' : '#fbf3e4' }); }
    /* masukan pemilik 8: nebula gradasi ungu-biru dibuang, langitnya bidang datar paper-cut (lihat Malam) */
  },
  draw(p, t, dt) {
    const ctx = this.ctx, w = S.vw, h = S.vh, cx = w / 2, cy = h / 2, mx = S.mouse.sx, my = S.mouse.sy;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, this.cv.width, this.cv.height); ctx.setTransform(this.d, 0, 0, this.d, 0, 0);
    const warp = E.in(inv(0.88, 1, p));
    for (const s of this.list) {
      const x = s.x * w - mx * 16 * s.z, y = s.y * h - my * 16 * s.z, tw = 0.55 + 0.45 * Math.sin(t * s.sp + s.ph);
      if (warp <= 0.001 && this.zona && this.zona.some(q => x > q[0] && x < q[2] && y > q[1] && y < q[3])) continue;   // bintang tidak berkedip di belakang teks
      if (warp > 0.001) {
        const dx = x - cx, dy = y - cy, w2 = warp * warp;
        ctx.strokeStyle = s.c; ctx.globalAlpha = Math.min(1, tw + warp); ctx.lineWidth = s.r * 1.4;
        ctx.beginPath(); ctx.moveTo(cx + dx * (1 + w2 * 0.9 * s.z), cy + dy * (1 + w2 * 0.9 * s.z)); ctx.lineTo(cx + dx * (1 + w2 * 2.2 * s.z), cy + dy * (1 + w2 * 2.2 * s.z)); ctx.stroke();
      } else {
        ctx.globalAlpha = tw; ctx.fillStyle = s.c;
        if (s.r < 1) ctx.fillRect(x, y, s.r * 1.6, s.r * 1.6);
        else { ctx.beginPath(); ctx.arc(x, y, s.r, 0, TAU); ctx.fill(); if (s.r > 1.6) { ctx.globalAlpha = tw * 0.5; star4(ctx, x, y, s.r * 4); } }
      }
    }
    ctx.globalAlpha = 1;
    if (!REDUCED) {
      if (!this.shoot && t > this.nextShoot) this.shoot = { x: w * (0.3 + Math.random() * 0.7), y: -20, vx: -(6 + Math.random() * 5), vy: 4 + Math.random() * 3, life: 1 };
      const s = this.shoot;
      if (s) {
        s.x += s.vx * dt; s.y += s.vy * dt; s.life -= 0.012 * dt;
        const g = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 14, s.y - s.vy * 14);
        g.addColorStop(0, `rgba(255,248,230,${Math.max(0, s.life).toFixed(3)})`); g.addColorStop(1, 'rgba(255,248,230,0)');
        ctx.strokeStyle = g; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * 14, s.y - s.vy * 14); ctx.stroke();
        if (s.life <= 0 || s.y > h + 40) { this.shoot = null; this.nextShoot = t + 4 + Math.random() * 6; }
      }
    }
    setO(this.cv, inv(0, 0.03, p));
  }
};
/* langit kedua untuk adegan Aliran (objek Stars yang sama, kanvas lain) */
const Stars2 = Object.assign(Object.create(Stars), { cv: $('#stars2'), list: [], shoot: null, nextShoot: 3, zona: null });

/* langit malam paper-cut (masukan pemilik 8 dan 9): bukit kertas berlapis yang bergeser parallax, awan kertas, gantungan
   bulan dan bintang di pojok kanan atas yang bergoyang mengikuti gulir dan kursor, rasi hiasan yang tergambar sendiri.
   Adegan Graf memakai semuanya, Aliran cukup bukit dan tekstur. Hanya digerakkan dari frame() saat adegannya aktif,
   jadi berhenti sendiri saat tidak terlihat. Semua hiasan di belakang graf dan teks. */
const Malam = {
  BINTANG: [[8, 20], [44, 28], [76, 40], [104, 54], [170, 50], [164, 86], [112, 84]],   // rasi Biduk, hiasan saja
  build() {
    this.L = ['#malam', '#malam2'].map(q => { const el = $(q); return { bukit: $$('.m-bukit', el), awan: $$('.m-awan', el) }; });
    this.tali = $$('#mGantung .tali').map((el, i) => ({ el, ikon: el.lastElementChild, a: 0, v: 0, ph: i * 2.1, om: 0.7 + i * 0.23, amp: [2.6, 4.2, 5.6][i] }));
    const NS = 'http://www.w3.org/2000/svg', svg = $('#mRasi'), B = this.BINTANG;
    const garis = document.createElementNS(NS, 'path');
    garis.setAttribute('d', 'M' + B.map(q => q.join(' ')).join(' L') + ` L${B[3].join(' ')}`); garis.setAttribute('class', 'rl'); garis.setAttribute('pathLength', 1); garis.setAttribute('stroke-dashoffset', 1);
    svg.appendChild(garis);
    this.rasi = { svg, garis, bt: B.map(([x, y], i) => { const e = document.createElementNS(NS, 'path'); e.setAttribute('d', starsPath([[0, 0, i === 4 ? 7 : 5]])); e.setAttribute('class', 'rs' + (i % 3 ? '' : ' k')); e.setAttribute('transform', `translate(${x} ${y}) scale(0)`); svg.appendChild(e); return { e, x, y, ph: i * 1.7 }; }) };
  },
  /* bukit: titik utama tiap sekitar 300 px lalu dirapatkan dengan getaran kecil, jadi tepinya seperti digunting tangan */
  bukitPath(W, H, top, amp, seed, pohon) {
    const r = mulberry32(seed), n = Math.max(3, Math.round(W / 300)), utama = [];
    for (let i = 0; i <= n; i++) utama.push([(i / n) * W, top + r() * amp]);
    const pts = [];
    for (let i = 0; i < n; i++) { const [x0, y0] = utama[i], [x1, y1] = utama[i + 1]; for (let k = 0; k < 6; k++) { const u = k / 6, e = u * u * (3 - 2 * u); pts.push([lerp(x0, x1, u), lerp(y0, y1, e) + (k ? (r() - 0.5) * 3.2 : 0)]); } }
    pts.push(utama[n]);
    let d = `M0 ${H} L0 ${pts[0][1].toFixed(1)}` + catmull(pts) + ` L${W} ${H} Z`;
    /* pohon kertas kecil berdiri di punggung bukit, warnanya sama jadi menyatu dengan siluet */
    const yDi = x => { const i = Math.min(pts.length - 2, Math.max(0, Math.floor((x / W) * (pts.length - 1)))); return lerp(pts[i][1], pts[i + 1][1], clamp((x - pts[i][0]) / ((pts[i + 1][0] - pts[i][0]) || 1))); };
    for (let k = 0; k < pohon; k++) {
      const x = W * (0.08 + r() * 0.84), y = yDi(x) + 3, s = 9 + r() * 9, f = v => v.toFixed(1);
      d += ` M${f(x - s * 0.13)} ${f(y)} L${f(x - s * 0.13)} ${f(y - s * 1.1)} L${f(x + s * 0.13)} ${f(y - s * 1.1)} L${f(x + s * 0.13)} ${f(y)}Z`;
      d += ` M${f(x - s * 0.55)} ${f(y - s * 1.25)} a${f(s * 0.55)} ${f(s * 0.55)} 0 1 1 ${f(s * 1.1)} 0 a${f(s * 0.55)} ${f(s * 0.55)} 0 1 1 ${f(-s * 1.1)} 0Z`;
    }
    return d;
  },
  layout() {
    this.L.forEach((L, j) => L.bukit.forEach((svg, i) => {
      const W = Math.round(S.vw * 1.08), H = Math.max(40, svg.getBoundingClientRect().height | 0), amp = H * [0.42, 0.38, 0.4][i];
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      svg.firstElementChild.setAttribute('d', this.bukitPath(W, H, H * 0.06, amp, 900 + j * 50 + i * 7, i === 1 ? Math.round(W / 170) : i === 0 ? Math.round(W / 320) : 0));
      L.H = L.H || []; L.H[i] = H;
    }));
  },
  /* rasi hiasan ditaruh di pita atas antara label adegan dan graf, di tempat pertama yang tidak dekat simpul mana pun */
  posRasi(R) {
    const sv = this.rasi.svg, ok = !small();
    sv.classList.toggle('on', ok); if (!ok) return;
    const tag = $('#L-rasi .tag-row').getBoundingClientRect(), wr = $('#graphWrap').getBoundingClientRect(), g = $('#mGantung').getBoundingClientRect();
    const W = clamp(S.vw * 0.14, 150, 220), H = W * 96 / 220, y = navH() + 16;
    const simpul = R.NODES.map(([x, yy]) => [wr.left + (x / 1000) * wr.width, wr.top + (yy / 640) * wr.height]);
    let ada = false;
    for (let x = tag.right + 44; x + W < g.left - 24; x += 16) {
      if (simpul.some(([sx, sy]) => sx > x - 40 && sx < x + W + 40 && sy < y + H + 44)) continue;
      Object.assign(sv.style, { left: x.toFixed(0) + 'px', top: y + 'px', width: W.toFixed(0) + 'px' }); ada = true; break;
    }
    if (!ada) sv.classList.remove('on');
  },
  update(j, p, t, dt) {
    const L = this.L[j], mx = FINE && !REDUCED ? S.mouse.sx : 0;
    /* bukit naik dari bawah saat adegan masuk, lalu bergeser beda kecepatan mengikuti gulir dan sedikit mengikuti kursor */
    const naik = REDUCED ? 1 : E.out(inv(0, 0.07, p)), turun = REDUCED ? 0 : E.in(inv(0.88, 1, p));
    L.bukit.forEach((b, i) => {
      const k = [1, 2.1, 3.6][i], H = (L.H && L.H[i]) || 100;
      const y = (1 - naik) * H * (0.5 + i * 0.25) + (REDUCED ? 0 : p * 16 * k) + turun * H * 0.5 * k;
      setT(b, `translate3d(${(-mx * 5 * k).toFixed(1)}px,${y.toFixed(1)}px,0)`);
    });
    L.awan.forEach((a, i) => setT(a, REDUCED ? 'none' : `translate3d(${(Math.sin(t * 0.09 + i * 2) * 22 + (i ? -1 : 1) * p * 70 - mx * 10).toFixed(1)}px,${(Math.sin(t * 0.13 + i) * 5).toFixed(1)}px,0)`));
    if (j !== 0) return;
    /* gantungan: turun memantul saat adegan masuk, lalu berayun seperti bandul. Gulir memberi dorongan, kursor sedikit memiringkan */
    const jatuh = REDUCED ? 0 : 1 - E.back(inv(0.01, 0.09, p));
    for (const g of this.tali) {
      if (REDUCED) { setT(g.el, 'none'); continue; }
      const target = Math.sin(t * g.om + g.ph) * g.amp + mx * 7;
      g.v = (g.v + ((target - g.a) * 0.04 - clamp(S.vel, -40, 40) * 0.025 * (g.amp / 4)) * dt) * Math.pow(0.9, dt);
      g.a = clamp(g.a + g.v * dt, -24, 24);
      setT(g.el, `translate3d(0,${(-jatuh * 240).toFixed(1)}px,0) rotate(${g.a.toFixed(2)}deg)`);
      setT(g.ikon, `rotate(${(-g.a * 0.4).toFixed(2)}deg) scale(${(1 + Math.sin(t * 1.3 + g.ph) * 0.04).toFixed(3)})`);
    }
    /* rasi hiasan tergambar sendiri saat adegan masuk, bintangnya berkedip pelan */
    const R = this.rasi, k = REDUCED ? 1 : E.inOut(inv(0.02, 0.15, p));
    setA(R.garis, 'stroke-dashoffset', (1 - k).toFixed(3));
    R.bt.forEach((b, i) => {
      const s = REDUCED ? 1 : E.back(inv(0.02 + i * 0.017, 0.05 + i * 0.017, p)), tw = REDUCED ? 1 : 0.8 + Math.sin(t * 1.1 + b.ph) * 0.2;
      setA(b.e, 'transform', `translate(${b.x} ${b.y}) scale(${(Math.max(0, s) * tw).toFixed(3)})`);
    });
    setO(R.svg, 1 - inv(0.86, 0.92, p));
  }
};

/* =====================================================================
   7. RUTE: goresan kuas pusaran + delapan rute asli digambar sebagai sapuan kuas
   ===================================================================== */
function resample(pts, step) {
  const out = [pts[0]]; let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]); let s = step - carry;
    while (s <= L) { const u = s / L; out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]); s += step; }
    carry = L - (s - step);
  }
  out.push(pts[pts.length - 1]);
  const f = new Float32Array(out.length * 2); out.forEach((q, i) => { f[i * 2] = q[0]; f[i * 2 + 1] = q[1]; }); return f;
}
/* masukan pemilik 11 (menggantikan masukan 5): transisi peta ke graf saran Hafiz ada di sini, bukan di hero.
   Linimasa progres adegan: lembar peta masuk, 8 rute tergambar satu per satu di peta, lalu pembagi bergeser dari kanan ke kiri
   sampai seluruh lembar jadi graf bergaya sapuan kuas, lalu lapisan cat meleleh ke adegan Data. */
const RT = { masuk: [0.01, 0.08], rute: [0.08, 0.42], geser: [0.5, 0.78] };
const Paint = {
  back: { cv: $('#gBack') }, front: { cv: $('#gFront') }, lastP: -1,
  resize(rebuild) {
    const d = Math.min(DPR, small() ? 1.5 : 1);
    for (const L of [this.back, this.front]) {
      L.d = d; L.cv.width = (S.vw * d) | 0; L.cv.height = (S.vh * d) | 0; L.ctx = L.cv.getContext('2d');
      L.cache = document.createElement('canvas'); L.cache.width = L.cv.width; L.cache.height = L.cv.height; L.cctx = L.cache.getContext('2d');
      L.bi = 0; L.bp = 0;
    }
    if (rebuild || !this.back.list) this.build();
    this.lastP = -1;
  },
  build() {
    const w = S.vw, h = S.vh, cx = w * 0.5, cy = h * 0.5, m = Math.min(w, h);
    /* goresan hiasan pusaran di sekeliling lembar peta */
    const rand = mulberry32(1865), noise = makeNoise(mulberry32(77)), ns = 1 / (m * 0.42);
    const field = (x, y) => Math.atan2(y - cy, x - cx) + 1.5707963 + 0.2 + noise(x * ns, y * ns, 0.5) * 1.9;
    const count = Math.round(clamp((w * h) / 1500, 260, 680) * QUALITY * 0.62), unit = Math.max(m / 900, 0.62), half = Math.hypot(w, h) / 2;
    const list = [];
    /* kotak teks kedua tahap, label adegan, dan penghitung ruas diberi jarak 28 px: goresan hiasan tidak digambar di sana supaya teks tetap kontras.
       Goresan depan juga tidak boleh lewat di atas lembar peta */
    const box = (q, m2) => { const r = $(q).getBoundingClientRect(); return [r.left - m2, r.top - m2, r.right + m2, r.bottom + m2]; };
    const tks = ['#L-goresan .g-big', '#L-goresan .g-info', '#gCopyB .g-big', '#gSubB', '#L-goresan .tag-row', '#gCount'].map(q => box(q, 28));
    const fr = box('#rt', 24);
    const kena = (pts, bs) => { for (let k = 0; k < pts.length; k += 2) for (const q of bs) if (pts[k] > q[0] && pts[k] < q[2] && pts[k + 1] > q[1] && pts[k + 1] < q[3]) return true; return false; };
    for (let i = 0; i < count; i++) {
      const x = -0.08 * w + rand() * 1.16 * w, y = -0.08 * h + rand() * 1.16 * h;
      const r01 = Math.hypot(x - cx, y - cy) / half;
      const pts = trace(x, y, 20 + ((rand() * 55) | 0), (3 + rand() * 3.5) * unit, field);
      const col = pickPaintColor(r01, rand), wd = (2 + Math.pow(rand(), 2) * 15) * unit;
      const nb = wd < 4 * unit ? 2 : 3 + ((rand() * 3) | 0);
      const br = bristles(pts, wd, nb, rand, col, 0.95);
      for (const b of br) { const path = new Path2D(); path.moveTo(b.p[0], b.p[1]); for (let k = 1; k < b.p.length / 2; k++) path.lineTo(b.p[k * 2], b.p[k * 2 + 1]); b.path = path; }
      const ang = (Math.atan2(y - cy, x - cx) / TAU + 1) % 1, key = fract(ang + r01 * 0.85 + rand() * 0.04);
      const start = 0.02 + key * 0.5, dur = 0.08 + rand() * 0.1;
      const front = rand() < 0.12 && !kena(pts, [fr]);
      if (!kena(pts, tks)) list.push({ br, start, end: start + dur, front });
    }
    this.back.list = list.filter(s => !s.front).sort((a, b) => a.end - b.end);
    this.front.list = list.filter(s => s.front).sort((a, b) => a.end - b.end);
    for (const L of [this.back, this.front]) { L.bi = 0; L.bp = 0; if (L.cctx) { L.cctx.setTransform(1, 0, 0, 1, 0, 0); L.cctx.clearRect(0, 0, L.cache.width, L.cache.height); } }
  },
  layoutMelts() {
    const W = S.vw, H = Math.round(S.vh * 1.2), amp = H * 0.14;
    ['#gm0', '#gm1', '#gm2'].forEach((sel, i) => { const svg = $(sel); svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.firstElementChild.setAttribute('d', meltPath(W, H, 211 + i * 13, amp)); });
  },
  drawStroke(ctx, s, f) {
    for (const b of s.br) {
      ctx.strokeStyle = b.col; ctx.lineWidth = b.lw;
      if (f >= 1) ctx.stroke(b.path); else strokePoly(ctx, b.p, Math.max(2, Math.floor((b.p.length / 2) * f)));
    }
  },
  layer(L, p) {
    const c = L.cctx;
    if (p < L.bp) { c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, L.cache.width, L.cache.height); L.bi = 0; }
    c.setTransform(L.d, 0, 0, L.d, 0, 0); c.lineCap = 'round'; c.lineJoin = 'round';
    while (L.bi < L.list.length && L.list[L.bi].end <= p) { this.drawStroke(c, L.list[L.bi], 1); L.bi++; }
    L.bp = p;
    const ctx = L.ctx; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, L.cv.width, L.cv.height); ctx.drawImage(L.cache, 0, 0);
    ctx.setTransform(L.d, 0, 0, L.d, 0, 0); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let j = L.bi; j < L.list.length; j++) { const s = L.list[j]; if (s.start < p) this.drawStroke(ctx, s, (p - s.start) / (s.end - s.start)); }
  },
  update(p) {
    if (!this.melts) { this.copy = [$('#gCopyA'), $('#gCopyB')]; this.melts = [$('#gm0'), $('#gm1'), $('#gm2')]; }
    Data.muat();
    /* parallax lapisan: kanvas belakang, lembar peta, teks, kanvas depan bergeser beda kecepatan */
    const mx = FINE ? S.mouse.sx : 0, my = FINE ? S.mouse.sy : 0;
    setT(this.back.cv, `translate3d(${(-mx * 9).toFixed(1)}px,${(-my * 7).toFixed(1)}px,0) scale(1.03)`);
    for (const c of this.copy) setT(c, `translate3d(${(mx * 5).toFixed(1)}px,${(my * 4).toFixed(1)}px,0)`);
    setT(this.front.cv, `translate3d(${(mx * 18).toFixed(1)}px,${(my * 13).toFixed(1)}px,0) scale(1.05)`);
    const win = [[0.85, 0.95], [0.88, 0.975], [0.9, 0.995]];
    this.melts.forEach((m, i) => { const k = E.inOut(inv(win[i][0], win[i][1], p)); setT(m, `translate3d(0,${((1 - k) * 100).toFixed(2)}%,0)`); });
    if (Math.abs(p - this.lastP) < 0.0002) return; this.lastP = p;
    this.layer(this.back, p); this.layer(this.front, p);
  }
};

/* lembar peta dan graf. Satu proyeksi Web Mercator (sama dengan bbox hero-peta.json) ke koordinat lokal lembar, jadi gambar peta,
   garis rute, simpul, dan edge graf semuanya berimpit */
const Rute = {
  _x: -1, dimuat: false,
  build() {
    this.el = $('#rt'); this.peta = $('#rtPeta'); this.img = $('#rtImg'); this.svg = $('#rtSvg'); this.cv = $('#rtCv'); this.garis = $('#rtGaris');
    this.lL = $('#rtLl'); this.lR = $('#rtLr'); this.cache = document.createElement('canvas');
    this.eq = $('#gEq'); this.leg = $('#gLeg'); this.subB = $('#gSubB'); this.cnt = $('#gCount'); this.num = $('#gNum');
    const g = D.g, M = c => merc(c[0], c[1]);
    this.m = {}; for (const id of D.ids) this.m[id] = merc(g.nodes[id].lat, g.nodes[id].lng);
    const xs = D.ids.map(id => this.m[id][0]), ys = D.ids.map(id => this.m[id][1]);
    this.bb = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
    this.routes = g.paths.map(p => p.coords.map(M));
    /* kapan tiap ruas dan simpul selesai tergambar di peta: posisi simpul di sepanjang coords tiap rute */
    const n = g.paths.length, [r0, r1] = RT.rute, step = (r1 - r0) / n, ev = [], muncul = {};
    this.info = []; this.geom = new Map();
    g.paths.forEach((p, k) => {
      const ws = r0 + k * step, we = ws + step, raw = this.routes[k];
      const cum = [0]; for (let i = 1; i < raw.length; i++) cum.push(cum[i - 1] + Math.hypot(raw[i][0] - raw[i - 1][0], raw[i][1] - raw[i - 1][1]));
      const Lt = cum[cum.length - 1] || 1; let from = 0;
      const ix = p.nodeIds.map(id => { const nd = g.nodes[id]; let bi = from, bd = Infinity; for (let i = from; i < p.coords.length; i++) { const dd = (p.coords[i][0] - nd.lat) ** 2 + (p.coords[i][1] - nd.lng) ** 2; if (dd < bd) { bd = dd; bi = i; } } from = bi; return bi; });
      let baru = 0;
      p.nodeIds.forEach((id, i) => { const tt = ws + (we - ws) * (cum[ix[i]] / Lt); if (!(id in muncul) || muncul[id] > tt) muncul[id] = tt; });
      for (let i = 0; i + 1 < p.nodeIds.length; i++) {
        const a = p.nodeIds[i], b = p.nodeIds[i + 1], key = a + '>' + b;
        if (!ev.some(e => e.key === key)) baru++;
        ev.push({ key, t: ws + (we - ws) * (cum[ix[i + 1]] / Lt) });
        /* geometri edge graf = potongan jalan asli di antara dua simpang, ujungnya tepat di simpul */
        if (!this.geom.has(key)) this.geom.set(key, [this.m[a], ...raw.slice(ix[i] + 1, ix[i + 1]), this.m[b]]);
      }
      this.info.push({ id: p.id, ruas: p.nodeIds.length - 1, baru, ws, we });
    });
    const first = new Map(); for (const e of ev) if (!first.has(e.key) || first.get(e.key) > e.t) first.set(e.key, e.t);
    this.ruasT = [...first.values()].sort((a, b) => a - b);
    this.muncul = muncul;
    $('#gTot').textContent = bulat(D.n.ruas);
    /* ruas yang dipakai paling banyak rute, namanya dari GRAPH_DATA.segments */
    const maks = Math.max(...D.edges.map(e => e.rute.length));
    const nama = [...new Set(D.edges.filter(e => e.rute.length === maks).map(e => { const s = (g.segments || []).find(q => q.fromNode === e.a && q.toNode === e.b); return s ? bersih(s.name).replace(/\s*\(.*\)\s*$/, '').replace(/^Jalan /, 'Jl. ') : `${pendek(e.a)} ke ${pendek(e.b)}`; }))];
    this.ringkas = `${nama.join(' dan ')} dipakai ${maks} rute sekaligus`;
    const r = mulberry32(31); this.parts = [];
    D.edges.forEach((e, i) => { for (let j = 0; j < Math.min(3, e.rute.length); j++) this.parts.push({ e: i, u: r(), sp: 0.0016 + r() * 0.0014 }); });
    if (!PETA) this.img.remove();
  },
  muat() { if (this.dimuat || !this.img.isConnected) return; this.dimuat = true; this.img.src = this.img.dataset.src; },
  /* ukuran lembar: kolom kiri di desktop (di bawah label adegan, kiri dari kolom teks), pita atas di HP (di bawah label adegan dan
     penghitung ruas). Lembar dikecilkan mengikuti rasio jaringan supaya tidak ada ruang kosong besar */
  layout() {
    const vw = S.vw, vh = S.vh, sm = small(), pad = clamp(vw * 0.026, 16, 38);
    const tagB = $('#L-goresan .tag-row').getBoundingClientRect().bottom, cntB = $('#gCount').getBoundingClientRect().bottom;
    const col = sm ? [pad, Math.max(tagB, cntB) + 14, vw - pad, Math.max(Math.max(tagB, cntB) + 220, vh * 0.54)]
      : [pad, tagB + 22, vw * 0.6 - 40, vh - pad - 8];
    const [x0, y0, x1, y1] = this.bb, bw = x1 - x0, bh = y1 - y0;
    const ix = 0.06, it = 0.07, ib = sm ? 0.13 : 0.11;   // ruang dalam lembar, bawah lebih lega untuk label Peta dan Graf
    const sc = Math.min(((col[2] - col[0]) * (1 - 2 * ix)) / bw, ((col[3] - col[1]) * (1 - it - ib)) / bh);
    const W = Math.round((bw * sc) / (1 - 2 * ix)), H = Math.round((bh * sc) / (1 - it - ib));
    const L = Math.round(col[0] + (col[2] - col[0] - W) / 2), T = Math.round(sm ? col[1] : col[1] + (col[3] - col[1] - H) / 2);
    Object.assign(this.el.style, { left: L + 'px', top: T + 'px', width: W + 'px', height: H + 'px' });
    doc.style.setProperty('--rt-b', T + H + 'px');
    this.W = W; this.H = H; this.sm = sm;
    const ox = W * ix, oy = H * it;
    const P = (x, y) => [ox + (x - x0) * sc, oy + (y1 - y) * sc];
    this.P = P;
    if (PETA && this.img.isConnected) {
      const [a, b] = P(PETA.bbox[0], PETA.bbox[3]), [c, d] = P(PETA.bbox[2], PETA.bbox[1]);
      Object.assign(this.img.style, { left: a.toFixed(1) + 'px', top: b.toFixed(1) + 'px', width: (c - a).toFixed(1) + 'px', height: (d - b).toFixed(1) + 'px' });
    }
    this.tagPos = this.letakLabel();
    this.layoutPeta(); this.paintGraf();
    this._x = -1; this.lastP = -1;
  },
  /* sisi peta: 8 rute mengikuti coords asli (casing krem lalu garis warna), digambar sendiri lewat stroke-dashoffset */
  layoutPeta() {
    const W = this.W, H = this.H, P = this.P, f = v => v.toFixed(1), lw = this.sm ? 2.6 : 3.6, g = D.g;
    const ds = this.routes.map(pts => 'M' + pts.map(q => P(q[0], q[1]).map(f).join(' ')).join('L'));
    let h = ds.map(d => `<path class="rt-c" d="${d}" stroke-width="${lw + 3.6}" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1"/>`).join('')
      + ds.map((d, k) => `<path class="rt-l" d="${d}" stroke="${WARNA[k % WARNA.length]}" stroke-width="${lw}" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1"/>`).join('');
    const lab = [];
    for (const id of D.ids) {
      const [x, y] = P(...this.m[id]), st = g.nodes[id].type !== 'junction';
      h += `<circle class="rt-n${st ? ' st' : ''}" data-id="${id}" cx="${f(x)}" cy="${f(y)}" r="${st ? 5.5 : 3.2}" opacity="0"/>`;
      if (st) { const [vx, vy] = this.tagPos[id]; lab.push(`<g class="rt-tag"><rect x="${f(vx - 17)}" y="${f(vy - 11.5)}" width="34" height="23" rx="3"/><text x="${f(vx)}" y="${f(vy + 4.6)}" text-anchor="middle">${id}</text></g>`); }
    }
    this.svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    this.svg.innerHTML = h + `<g class="rt-tags">${lab.join('')}</g>`;
    this.cas = $$('.rt-c', this.svg); this.gar = $$('.rt-l', this.svg); this.nod = $$('.rt-n', this.svg).map(el => ({ el, t: this.muncul[el.dataset.id] }));
    this.tags = $('.rt-tags', this.svg);
  },
  /* posisi label S/T (sama untuk peta dan graf): utamakan arah menjauhi pusat jaringan, kalau keluar lembar, menimpa simpul, atau
     menimpa label lain, coba sisi kanan, kiri, bawah, atas simpul */
  letakLabel() {
    const W = this.W, H = this.H, hw = 17, hh = 11.5, cx = W / 2, cy = H * 0.45, out = {}, sudah = [];
    const titik = D.ids.map(id => this.P(...this.m[id]));
    const muat = ([vx, vy]) => vx - hw >= 6 && vx + hw <= W - 6 && vy - hh >= 6 && vy + hh <= H * 0.9
      && !titik.some(([nx, ny]) => Math.abs(nx - vx) < hw + 6 && Math.abs(ny - vy) < hh + 6)
      && !sudah.some(([px, py]) => Math.abs(px - vx) < hw * 2 + 6 && Math.abs(py - vy) < hh * 2 + 4);
    for (const id of D.ids) {
      if (D.g.nodes[id].type === 'junction') continue;
      const [x, y] = this.P(...this.m[id]);
      let dx = x - cx, dy = y - cy; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
      const c = [[x + dx * 30, y + dy * 26], [x + hw + 12, y], [x - hw - 12, y], [x, y + hh + 13], [x, y - hh - 13], [x + hw + 9, y - hh - 9], [x - hw - 9, y - hh - 9], [x + hw + 9, y + hh + 9], [x - hw - 9, y + hh + 9]];
      const v = c.find(muat) || [clamp(c[0][0], 6 + hw, W - 6 - hw), clamp(c[0][1], 6 + hh, H * 0.9 - hh)];
      sudah.push(v); out[id] = v;
    }
    return out;
  },
  /* sisi graf: edge = sapuan kuas pusaran di sepanjang ruas asli (tebal sesuai jumlah rute), panah arah, simpul, label S dan T */
  paintGraf() {
    const W = this.W, H = this.H, d = Math.min(DPR, 1.75), g = D.g;
    this.d = d; this.cv.width = Math.round(W * d); this.cv.height = Math.round(H * d); this.ctx = this.cv.getContext('2d');
    const c = this.cache; c.width = this.cv.width; c.height = this.cv.height;
    const x = c.getContext('2d'); x.setTransform(d, 0, 0, d, 0, 0); x.lineCap = 'round'; x.lineJoin = 'round';
    const rand = mulberry32(2611), unit = clamp(Math.min(W, H) / 520, 0.6, 1.25);
    this.unit = unit; this.segs = [];
    D.edges.forEach(e => {
      const raw = this.geom.get(e.a + '>' + e.b).map(q => this.P(q[0], q[1])), pts = resample(raw, 3), n = pts.length / 2;
      const cum = new Float32Array(n); for (let i = 1; i < n; i++) cum[i] = cum[i - 1] + Math.hypot(pts[i * 2] - pts[i * 2 - 2], pts[i * 2 + 1] - pts[i * 2 - 1]);
      this.segs.push({ pts, cum, L: cum[n - 1] || 1 });
      const w = (2.2 + e.rute.length * 1.35) * unit, pasar = e.a === 'V_Gasibu_Barat' && e.b === 'V_Gasibu_Timur';
      x.strokeStyle = 'rgba(28,4,16,.6)'; x.lineWidth = w * 2.3; strokePoly(x, pts, n);
      const col = pasar ? C.sky : pickW([C.cream, C.butter, C.gold], [3, 2, 1.2], rand());
      for (const b of bristles(pts, w, 3, rand, col, 0.96)) { x.strokeStyle = b.col; x.lineWidth = b.lw; strokePoly(x, b.p, b.p.length / 2); }
      x.strokeStyle = rgba(col, 0.95); x.lineWidth = w * 0.42; strokePoly(x, pts, n);
    });
    /* panah di 58% panjang edge, searah urutan rute (digambar setelah semua sapuan supaya tidak tertimpa) */
    this.segs.forEach((s, i) => {
      const e = D.edges[i], a = this.titik(s, 0.56), b = this.titik(s, 0.62), ang = Math.atan2(b[1] - a[1], b[0] - a[0]), z = (5 + e.rute.length * 0.9) * unit;
      if (s.L < z * 5) return;   // ruas yang terlalu pendek tidak diberi panah, nanti menutupi simpul
      x.save(); x.translate(a[0], a[1]); x.rotate(ang);
      x.beginPath(); x.moveTo(z * 1.3, 0); x.lineTo(-z * 0.8, z * 0.95); x.lineTo(-z * 0.35, 0); x.lineTo(-z * 0.8, -z * 0.95); x.closePath();
      x.fillStyle = HEX.ink; x.fill(); x.lineWidth = 1.5 * unit; x.strokeStyle = HEX.cream; x.stroke(); x.restore();
    });
    for (const id of D.ids) {
      const [px, py] = this.P(...this.m[id]), t = g.nodes[id].type, r = (t === 'junction' ? 4.2 : 8) * unit;
      x.fillStyle = 'rgba(28,4,16,.5)'; x.beginPath(); x.arc(px + 1.5, py + 2.5, r + 2.2, 0, TAU); x.fill();
      x.fillStyle = t === 'source' ? HEX.teal : t === 'sink' ? HEX.vermilion : HEX.cream;   // sama dengan Dashboard: source teal, sink vermilion
      x.beginPath(); x.arc(px, py, r, 0, TAU); x.fill();
      x.lineWidth = 2 * unit; x.strokeStyle = t === 'junction' ? HEX.ink : HEX.cream; x.stroke();
    }
    x.font = `700 ${Math.round(14 * Math.max(0.9, unit))}px ${FS}`; x.textAlign = 'center'; x.textBaseline = 'middle';
    for (const id of D.ids) {
      if (g.nodes[id].type === 'junction') continue;
      const w = 34, hh = 23, [vx, vy] = this.tagPos[id];
      x.save(); x.translate(vx, vy); x.rotate((id.charCodeAt(1) % 2 ? -2.5 : 2) * RAD);
      x.fillStyle = 'rgba(28,4,16,.55)'; x.fillRect(-w / 2 + 2, -hh / 2 + 3, w, hh);
      x.fillStyle = HEX.cream; x.fillRect(-w / 2, -hh / 2, w, hh);
      x.fillStyle = HEX.ink; x.fillText(id, 0, 1); x.restore();
    }
  },
  titik(s, u) {
    const t = u * s.L, c = s.cum, p = s.pts; let i = 1; while (i < c.length - 1 && c[i] < t) i++;
    const k = clamp((t - c[i - 1]) / ((c[i] - c[i - 1]) || 1)); return [lerp(p[i * 2 - 2], p[i * 2], k), lerp(p[i * 2 - 1], p[i * 2 + 1], k)];
  },
  update(p, t, dt) {
    this.muat();
    if (!this.lines) this.lines = $$('#L-goresan .gl').map(el => ({ w: el._w, a: +el.dataset.a, b: el.closest('#gCopyA') ? 0.47 : null }));
    const W = this.W, mx = FINE && !REDUCED ? S.mouse.sx : 0, my = FINE && !REDUCED ? S.mouse.sy : 0;
    /* lembar masuk seperti kertas yang ditempel: naik, berputar sedikit, memantul (reduced motion: cukup memudar) */
    const mk = inv(RT.masuk[0], RT.masuk[1], p), sp = REDUCED ? 1 : E.back(mk), rot = this.sm ? 0 : -1.1;
    setO(this.el, clamp(mk * 2.2));
    setT(this.el, REDUCED ? 'none' : `translate3d(${(-mx * 4).toFixed(1)}px,${((1 - sp) * 60 - my * 3).toFixed(1)}px,0) rotate(${lerp(rot + 4, rot, sp).toFixed(2)}deg) scale(${lerp(0.9, 1, sp).toFixed(3)})`);
    /* teks: tahap peta lalu tahap graf */
    for (const l of this.lines) rev(l.w, p, l.a, 0.1, l.b, l.b == null ? null : l.b + 0.05);
    const ia = 1 - inv(0.46, 0.5, p);
    setO(this.eq, inv(0.12, 0.17, p) * ia); setO(this.leg, inv(0.08, 0.12, p) * ia); setO(this.cnt, inv(0.03, 0.08, p));
    const sb = inv(0.58, 0.63, p); setO(this.subB, sb); setT(this.subB, `translate3d(0,${((1 - sb) * 14).toFixed(1)}px,0)`);
    /* pembagi: dari kanan ke kiri mengikuti gulir. Reduced motion: crossfade peta ke graf tanpa pembagi */
    const k = inv(RT.geser[0], RT.geser[1], p), X = REDUCED ? W : W * (1 - E.inOut(k)), xr = Math.round(X * 10) / 10;
    if (this._x !== xr) {
      this._x = xr; const cp = `inset(0px ${Math.max(0, W - xr).toFixed(1)}px 0px 0px)`;
      this.peta.style.clipPath = cp; this.peta.style.webkitClipPath = cp;
      setT(this.garis, `translate3d(${xr.toFixed(1)}px,0,0)`);
    }
    if (REDUCED) setO(this.peta, 1 - k);
    setO(this.garis, !REDUCED && xr > 0.5 && xr < W - 0.5 ? 1 : 0);
    const lebar = REDUCED ? (1 - k) * W : X, a = this.sm ? 50 : 90, b = this.sm ? 60 : 90;
    setO(this.lL, clamp((lebar - a) / b) * inv(0.06, 0.1, p)); setO(this.lR, clamp((W - lebar - a) / b));
    const go = k > 0 ? 1 : 0; setO(this.cv, go);
    /* rute di peta tergambar satu per satu, simpul muncul saat dilewati rute pertama */
    if (Math.abs(p - this.lastP) > 0.0001) {
      this.lastP = p;
      this.info.forEach((r, i) => { const off = (1 - E.inOut(inv(r.ws, r.we, p))).toFixed(4); setA(this.cas[i], 'stroke-dashoffset', off); setA(this.gar[i], 'stroke-dashoffset', off); });
      for (const n of this.nod) setA(n.el, 'opacity', p >= n.t - 0.002 ? '1' : '0');
      setA(this.tags, 'opacity', inv(0.06, 0.1, p).toFixed(3));
      let lo = 0, hi = this.ruasT.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (this.ruasT[mid] <= p) lo = mid + 1; else hi = mid; }
      setTx(this.num, bulat(lo));
      const last = this.info[this.info.length - 1], cur = this.info.find(r => p >= r.ws && p < r.we);
      setTx(this.leg, cur ? `${cur.id} · ${cur.ruas} ruas · ${cur.baru} baru` : last && p >= last.we ? this.ringkas : '');
    }
    /* graf: gambar tetap dari cache, partikel aliran berjalan searah edge di sisi yang sudah jadi graf */
    if (!go || !this.ctx || (REDUCED && this._g)) return;
    const ctx = this.ctx, d = this.d;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, this.cv.width, this.cv.height); ctx.drawImage(this.cache, 0, 0);
    this._g = true;
    if (REDUCED) return;
    ctx.setTransform(d, 0, 0, d, 0, 0); ctx.fillStyle = '#fff4d6';
    for (const q of this.parts) {
      q.u = (q.u + q.sp * dt) % 1;
      const s = this.segs[q.e], pt = this.titik(s, q.u), al = Math.sin(q.u * Math.PI);
      if (pt[0] < X - 4) continue;
      ctx.globalAlpha = al; star4(ctx, pt[0], pt[1], (2 + al * 2.4) * this.unit);
    }
    ctx.globalAlpha = 1;
  }
};

/* =====================================================================
   8. DATA LAPANGAN: foto CCTV dan rekaman HP jatuh ke meja
   ===================================================================== */
const Data = {
  items: [], dimuat: false,
  build() {
    const g = D.g, cc = MD.cctv || {}, mm = MD.manual || {};
    const kamera = s => bersih(s).replace(/^CCTV\s+/i, '').replace(/\s*\(.*\)\s*$/, '');
    const src = k => (k ? BASE + k.src : null), poster = k => (k ? BASE + k.poster : null);
    /* catatan deteksi memakai ID simpul dan panah ASCII, jadi diganti nama simpang yang bisa dibaca */
    const nama = id => (/^[ST]\d$/.test(id) ? id : g.nodes[id] ? bersih(g.nodes[id].label).replace(/^[ST]\d:\s*/, '') : pendek(id));
    const ruasBaca = s => String(s || '').replace(/edge\s+(V_\w+|[ST]\d)\s*->\s*(V_\w+|[ST]\d)/g, (m, a, b) => `ruas dari ${nama(a)} ke ${nama(b)}`).replace(/\s->\s/g, ' ke ');
    (g.cctvPoints || []).forEach(c => {
      const m = cc[c.id] || {}, k = m.klip;
      this.items.push({ jenis: 'cctv', judul: kamera(m.kamera || c.name), simpul: simpulTxt(c.nodeId), src: src(k), poster: poster(k), catatan: m.catatan || '', status: m.status || '', ket: k ? `Cuplikan ${fmtWaktu(k.direkam)} · ${Math.round(k.durasi_detik)} detik · sudah diproses program hitung` : '' });
    });
    (g.manualSurveyPoints || []).forEach(s => {
      const m = mm[s.id] || {}, k = m.klip;
      this.items.push({ jenis: 'hp', judul: bersih(s.name).replace(/^Survei Manual \d+:\s*(Simpang\s+)?/i, ''), simpul: simpulTxt(s.nodeId), jam: k && k.jam, src: src(k), poster: poster(k), catatan: m.catatan || '', status: 'arus sudah dihitung, angka sementara', ket: k ? `Minggu 1 Nov 2026 sekitar ${k.jam} · cuplikan ${k.durasi_detik} detik dari menit ke-${k.dari_menit} · sudah diproses program hitung` : '' });
    });
    (MD.deteksi || []).forEach(d => this.items.push({ jenis: 'det', judul: 'Deteksi YOLO · ' + kamera(d.judul), simpul: simpulTxt((/\((V_[A-Za-z_]+|[ST]\d)\)/.exec(d.judul) || [])[1] || ''), src: d.src ? BASE + d.src : null, poster: d.poster ? BASE + d.poster : null, catatan: ruasBaca(d.catatan), status: 'hasil uji, belum dipakai sebagai kapasitas', ket: 'Cuplikan uji 29 Okt 2026 · sudah diproses program hitung' }));
    const wrap = $('#pols'), nC = this.items.filter(i => i.jenis === 'cctv').length, nH = this.items.filter(i => i.jenis === 'hp').length;
    let c = 0, hh = 0, dd = 0;
    this.items.forEach((it, i) => {
      it.a = it.jenis === 'cctv' ? 0.05 + (c++ * 0.25) / Math.max(1, nC) : it.jenis === 'hp' ? 0.36 + (hh++ * 0.24) / Math.max(1, nH) : 0.68 + dd++ * 0.03;
      const el = document.createElement('div');
      el.className = 'pol' + (it.jenis === 'det' ? ' det' : ''); el.setAttribute('role', 'button'); el.tabIndex = -1;
      el.setAttribute('aria-label', (it.src ? 'Perbesar cuplikan ' : 'Detail ') + it.judul);
      /* label pendek supaya tidak terpotong, nama lengkap di title */
      const cap = it.judul.replace(/^Deteksi YOLO · /, 'YOLO · ');
      el.title = it.jenis === 'hp' ? `${it.judul} · ${it.simpul} · sekitar ${it.jam || '-'}` : `${it.judul} · ${it.simpul}`;
      /* kartu bercuplikan memakai video muted loop yang langsung berputar begitu kartunya mendarat (lihat vid) */
      el.innerHTML = (it.src ? `<video muted loop playsinline preload="none" data-poster="${esc(it.poster || '')}" data-src="${esc(it.src)}"></video>` : it.poster ? `<img alt="" decoding="async" data-src="${esc(it.poster)}">` : '<div class="kosong"><b>Tidak bisa dibuka</b></div>') + `<span>${esc(cap)}</span>`;
      const im = el.querySelector('img,video');
      if (im) im.addEventListener('error', () => { const k = document.createElement('div'); k.className = 'kosong'; k.innerHTML = '<b>Gambar gagal dimuat</b>'; im.replaceWith(k); }, { once: true });
      el.addEventListener('click', () => Dlg.media(it, el));
      el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); Dlg.media(it, el); } });
      wrap.appendChild(el); it.el = el; it.r0 = (i % 2 ? 1 : -1) * (18 + (i * 7) % 14);
    });
    this.caps = kapsi('#L-data .cap');
    this.num = $('#dNum'); this.pill = $('#dPill'); this.hint = $('#dHint'); this.cnt = $('#dCount'); this.iris = $('#iris2');
    this.hint.textContent = FINE ? 'Klik video untuk memperbesar' : 'Ketuk video untuk memperbesar';
  },
  muat() {
    if (this.dimuat) return; this.dimuat = true;
    this.items.forEach(it => { const im = it.el.querySelector('img'), v = it.el.querySelector('video'); if (im) im.src = im.dataset.src; if (v && v.dataset.poster) v.poster = v.dataset.poster; });
  },
  /* src video baru dipasang saat kartunya mendarat, lalu diputar muted berulang. Dijeda saat kartunya pergi atau adegan ditinggal */
  vid(it, on) {
    const v = it.el.querySelector('video'); if (!v) return;
    if (!on) { v.pause(); return; }
    if (v.dataset.src) { v.src = v.dataset.src; delete v.dataset.src; }
    v.muted = true; const pr = v.play(); if (pr && pr.catch) pr.catch(() => {});
  },
  henti() { this.aktif = false; for (const it of this.items) { it.el._main = null; this.vid(it, false); } },
  /* foto CCTV dan HP disusun dalam grid tanpa saling menimpa: lebar kartu dihitung dari ruang yang ada dan tinggi kartu diukur
     langsung. Desktop punya dua tempat (masukan pemilik 7): grid di kanan selama caption di kiri, di luar penghitung titik pantau
     (termasuk pil kapasitas), petunjuk klik, dan dial, lalu grid pindah ke kiri di bawah label adegan selama caption di kanan.
     Ukuran kartu dan jumlah kolom sama di dua tempat supaya kartu cuma bergeser. HP: satu tempat di atas caption */
  layout() {
    const vw = S.vw, vh = S.vh, top = navH(), sm = small(), pad = clamp(vw * 0.026, 16, 38), gap = sm ? 8 : 14;
    const grid = this.items.filter(i => i.jenis !== 'det'), det = this.items.filter(i => i.jenis === 'det');
    const R = el => el.getBoundingClientRect();
    const kata = q => $$('#L-data .cap' + q + ' .w, #L-data .cap' + q + ' .sub').map(R);
    const kiri = kata(':not([data-pos^="r"])'), kanan = sm ? [] : kata('[data-pos^="r"]');
    const capR = Math.max(0, ...kiri.map(r => r.right)), capT = Math.min(vh, ...kata('').map(r => r.top));
    const cntB = R(this.cnt).bottom, hintT = sm ? vh : R(this.hint).top, dialT = R($('.hud-dial')).top;
    const reg = sm ? [pad, Math.max(top + 74, cntB + 12), vw - pad, capT - 14] : [Math.max(vw * 0.46, capR + 36), Math.max(top + 24, cntB + 18), vw - pad, Math.min(hintT, dialT) - 16];
    const regB = kanan.length ? [pad, R($('#L-data .tag-row')).bottom + 22, Math.min(vw * 0.54, Math.min(...kanan.map(r => r.left)) - 36), vh - pad - 8] : null;
    const regs = regB ? [reg, regB] : [reg];
    const lebar = w => grid.forEach(it => { it.w = w; it.el.style.width = w.toFixed(1) + 'px'; });
    const tinggi = () => Math.max(...grid.map(it => it.el.offsetHeight || it.w * 0.9));
    /* lebar kartu terbesar yang muat di wilayah g dengan sekian kolom */
    const pas = (g, cols) => {
      const RW = g[2] - g[0], RH = g[3] - g[1], rows = Math.max(1, Math.ceil(grid.length / cols));
      let w = Math.min(RW / cols - gap, 200);
      for (let q = 0; q < 5; q++) {
        lebar(w);
        const h = tinggi(); if (rows * h + (rows - 1) * gap <= RH || w < 60) break;
        w *= Math.max(0.6, ((RH - (rows - 1) * gap) / rows / h) * 0.97);
      }
      return w;
    };
    /* jumlah kolom dipilih yang menghasilkan kartu paling lebar tanpa melewati tinggi wilayah, di semua tempat */
    const { cols, w } = (sm ? [4, 5] : [5, 6, 7]).map(cols => ({ cols, w: Math.min(...regs.map(g => pas(g, cols))) })).reduce((a, b) => (b.w > a.w + 2 ? b : a));
    lebar(w);
    const h = tinggi(), rows = Math.max(1, Math.ceil(grid.length / cols));
    const r = mulberry32(606), acak = grid.map(() => [r() - 0.5, r() - 0.5, (r() - 0.5) * 8]);
    const tempat = (g, k) => {
      const RW = g[2] - g[0], RH = g[3] - g[1], cw = RW / cols, rh = Math.max(h + gap, RH / rows), y0 = g[1] + Math.max(0, (RH - rows * rh + gap) / 2);
      const col = k % cols, row = Math.floor(k / cols), jx = (cw - w - gap) * 0.45, j = acak[k];
      return [g[0] + (col + 0.5) * cw + j[0] * 2 * jx, y0 + row * rh + w * 0.33 + j[1] * Math.min(6, rh - h - gap)];   // update() memakai y - w*0,33 sebagai tepi atas
    };
    grid.forEach((it, k) => { [it.x, it.y] = tempat(reg, k); [it.xB, it.yB] = regB ? tempat(regB, k) : [it.x, it.y]; it.r = acak[k][2]; });
    const RW = reg[2] - reg[0], dw = sm ? vw * 0.45 : Math.min(RW * 0.46, 400), my = (reg[1] + reg[3]) / 2;
    det.forEach((it, k) => { it.w = dw; it.x = it.xB = sm ? vw * (k ? 0.74 : 0.26) : reg[0] + RW * (k ? 0.73 : 0.27); it.y = it.yB = my + (k ? 18 : -18); it.r = k ? 3.5 : -3; it.el.style.width = dw.toFixed(1) + 'px'; });
  },
  update(p, t) {
    this.muat(); this.aktif = true;
    for (const c of this.caps) {
      c.words = c.words || c.h._w;
      rev(c.words, p, c.a, 0.07, c.b - 0.05, c.b);
      const so = inv(c.a + 0.04, c.a + 0.09, p) * (1 - inv(c.b - 0.05, c.b - 0.01, p));
      setO(c.sub, so); setT(c.sub, `translate3d(0,${((1 - so) * 14).toFixed(1)}px,0)`);
    }
    const detK = E.inOut(inv(0.66, 0.72, p)), vh = S.vh;
    let landed = 0, k = 0;
    for (const it of this.items) {
      /* grid ikut pindah sisi bersama caption: kartu berangkat bergiliran dan sedikit oleng selama pindah */
      const m = it.xB === it.x && it.yB === it.y ? 0 : sisiCap(this.caps, p, k++ * 0.0012);
      let x = lerp(it.x, it.xB, m), y = lerp(it.y, it.yB, m), rot = it.r + Math.sin(Math.PI * clamp(m)) * (k % 2 ? 6 : -6), sc = 1, op, tampil;
      if (it.jenis === 'det') {
        const e = E.out5(inv(it.a, it.a + 0.07, p));
        y += (1 - e) * vh * 0.7; rot = lerp(it.r + it.r0, it.r, e); sc = lerp(0.7, 1, e); op = clamp(e * 1.5); tampil = op > 0.6;
      } else {
        const e = inv(it.a, it.a + 0.06, p), k = E.out5(e);
        y = lerp(it.y - vh * 0.8, it.y, k); rot = lerp(it.r + it.r0, it.r, k); sc = lerp(1.4, 1, k); tampil = e * 3 > 0.6; op = clamp(e * 3) * (1 - detK * 0.6);
        if (e >= 1) landed++;
      }
      setO(it.el, op);
      const live = op > 0.6; if (it.el._live !== live) { it.el._live = live; it.el.classList.toggle('hidup', live); it.el.tabIndex = live ? 0 : -1; }
      /* video tetap berputar walau kartunya diredupkan saat contoh deteksi masuk */
      if (it.el._main !== tampil) { it.el._main = tampil; this.vid(it, tampil); }
      if (op > 0.001) setT(it.el, `translate3d(${(x - it.w / 2).toFixed(1)}px,${(y - it.w * 0.33).toFixed(1)}px,0) rotate(${rot.toFixed(2)}deg) scale(${sc.toFixed(3)})`);
    }
    setTx(this.num, bulat(landed));
    setO(this.cnt, inv(0.02, 0.06, p)); setO(this.pill, inv(0.66, 0.7, p)); setO(this.hint, inv(0.08, 0.12, p) * (1 - inv(0.9, 0.93, p)));
    const ir = E.inOut(inv(0.92, 0.995, p)) * Math.hypot(S.vw, S.vh) * 0.56;
    const cp = `circle(${ir.toFixed(1)}px at 50% 50%)`; if (this.iris._cp !== cp) { this.iris._cp = cp; this.iris.style.clipPath = cp; this.iris.style.webkitClipPath = cp; }
  }
};

/* =====================================================================
   9. ALIRAN: contoh Ford-Fulkerson langkah demi langkah (graf mainan, bukan hasil graf asli)
   ===================================================================== */
const Aliran = {
  build() {
    const c = CONTOH, NS = 'http://www.w3.org/2000/svg', svg = $('#alSvg');
    const mk = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
    svg.setAttribute('viewBox', c.viewBox);
    const N = {}; c.nodes.forEach(n => { N[n.id] = n; });
    const defs = mk('defs', {}, svg);
    const mar = mk('marker', { id: 'alA', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' }, defs);
    mk('path', { d: 'M0 1 L9 5 L0 9z', fill: 'rgba(251,243,228,.85)' }, mar);
    const R = 19, gE = mk('g', {}, svg), gH = mk('g', {}, svg), gL = mk('g', {}, svg), gN = mk('g', {}, svg);
    const seg = (A, B, a0, b0) => { const dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L; return `M${(A.x + ux * a0).toFixed(1)} ${(A.y + uy * a0).toFixed(1)} L${(B.x - ux * b0).toFixed(1)} ${(B.y - uy * b0).toFixed(1)}`; };
    this.E = {};
    c.edges.forEach(e => {
      const A = N[e.from], B = N[e.to], d = seg(A, B, R + 2, R + 5);
      const o = { e };
      mk('path', { d, class: 'al-g' }, gE); o.base = mk('path', { d, class: 'al-e', 'marker-end': 'url(#alA)' }, gE);
      o.hg = mk('path', { d, class: 'al-hg', pathLength: 1, 'stroke-dashoffset': 1 }, gH); o.h = mk('path', { d, class: 'al-h', pathLength: 1, 'stroke-dashoffset': 1 }, gH);
      const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2, L = Math.hypot(B.x - A.x, B.y - A.y) || 1; let nx = -(B.y - A.y) / L, ny = (B.x - A.x) / L; if (ny > 0) { nx = -nx; ny = -ny; }
      o.lb = mk('g', { class: 'al-lb', transform: `translate(${(mx + nx * 15).toFixed(1)} ${(my + ny * 15).toFixed(1)})` }, gL);
      o.rect = mk('rect', { x: -21, y: -11, width: 42, height: 22, rx: 2.5 }, o.lb); o.txt = mk('text', {}, o.lb);
      if (e.pasar) { const t = mk('text', { class: 'al-lapak', x: (mx - nx * 22).toFixed(1), y: (my - ny * 22 + 4).toFixed(1) }, gL); t.textContent = 'ruas pasar'; o.ilus = mk('text', { class: 'al-lapak', x: (mx - nx * 22).toFixed(1), y: (my - ny * 22 + 18).toFixed(1), opacity: 0 }, gL); o.ilus.textContent = 'ilustrasi'; }
      this.E[e.id] = o;
    });
    /* edge mundur dipakai langkah yang punya hop "mundur" */
    this.back = {};
    c.steps.forEach(s => s.hops.filter(h => h.direction === 'mundur').forEach(h => {
      const A = N[h.from], B = N[h.to], mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2, L = Math.hypot(B.x - A.x, B.y - A.y), nx = -(B.y - A.y) / L, ny = (B.x - A.x) / L;
      this.back[h.from + '-' + h.to] = mk('path', { d: `M${A.x} ${A.y} Q${(mx + nx * 46).toFixed(1)} ${(my + ny * 46).toFixed(1)} ${B.x} ${B.y}`, class: 'al-back', opacity: 0 }, gH);
    }));
    /* garis min cut lewat titik tengah edge yang terpotong */
    const mids = c.minCut.edges.map(id => { const e = c.edges.find(q => q.id === id); return [(N[e.from].x + N[e.to].x) / 2, (N[e.from].y + N[e.to].y) / 2]; });
    if (mids.length >= 2) { const a = mids[0], b = mids[mids.length - 1], dx = b[0] - a[0], dy = b[1] - a[1]; this.cut = mk('path', { d: `M${(a[0] - dx * 0.75).toFixed(1)} ${(a[1] - dy * 0.75).toFixed(1)} L${(b[0] + dx * 1.3).toFixed(1)} ${(b[1] + dy * 1.3).toFixed(1)}`, class: 'al-cut', opacity: 0 }, gH); }
    this.nodes = {};
    c.nodes.forEach(n => { const g = mk('g', { class: 'al-n' + (n.role === 'source' ? ' s' : n.role === 'sink' ? ' t' : ''), transform: `translate(${n.x} ${n.y})` }, gN); mk('circle', { r: R }, g); mk('text', {}, g).textContent = n.id; this.nodes[n.id] = g; });
    /* teks caption dari data contoh */
    const ar = (a, b) => `${a} → ${b}`, path = p => p.join(' → ');
    const minHop = s => s.hops.reduce((m, h) => (h.residual < m.residual ? h : m), s.hops[0]);
    const sub = $$('#L-aliran .cap .sub');
    c.steps.forEach((s, i) => {
      const h = minHop(s), mund = s.hops.find(q => q.direction === 'mundur');
      sub[i + 1].textContent = mund
        ? `Jalur terakhir ${path(s.path)} memakai edge mundur ${ar(mund.from, mund.to)} untuk memindahkan sebagian aliran, jadi total flow naik ${s.bottleneck} lagi sampai ${s.totalFlow}.`
        : i === 0 ? `Jalur pertama ${path(s.path)} punya sisa terkecil ${s.bottleneck} di ${ar(h.from, h.to)}, jadi total flow sekarang ${s.totalFlow}.`
          : `Berikutnya jalur ${path(s.path)} dengan sisa terkecil ${s.bottleneck} di ${ar(h.from, h.to)}, jadi total flow naik ke ${s.totalFlow}.`;
    });
    const ce = c.minCut.edges.map(id => c.edges.find(q => q.id === id));
    sub[c.steps.length + 1].textContent = `Karena sudah tidak ada jalur tersisa, max flow contoh ini ${c.maxFlow} dan min cut-nya ${ce.map(e => ar(e.from, e.to)).join(' dan ')} dengan kapasitas ${ce.map(e => e.capacity).join(' + ')} = ${c.minCut.capacity}, sama dengan max flow.`;
    const pe = c.edges.find(e => e.pasar), av = c.alphaVariation.filter(v => v.edge === (pe ? pe.id : '')), vMax = av[av.length - 1];
    this.av = av; this.pe = pe;
    if (pe && vMax) sub[c.steps.length + 2].textContent = `Lapak kami modelkan sebagai kapasitas efektif = (1 - α) × kapasitas, jadi kalau ${ar(pe.from, pe.to)} ruas pasar dan α = ${String(vMax.alpha).replace('.', ',')} kapasitasnya tinggal ${vMax.capacityEffective} dan max flow turun ke ${vMax.maxFlow}.`;
    this.caps = kapsi('#L-aliran .cap');
    this.el = { wrap: $('#alWrap'), note: $('#alWrap .al-note'), k: $('#alK'), num: $('#alNum'), s: $('#alS'), rp: $('#alRp'), step: $('#alStep'), bn: $('#alBn'), tf: $('#alTf'), mf: $('#alMf'), seq: $('#alSeq'), cnt: $('#alCount') };
    this.last = ''; this.dx = this.rpX = this.noteX = 0;
  },
  /* masukan pemilik 7, desktop: selama caption di kanan, graf contoh bergeser ke kiri sampai tepi kanannya berjarak dari caption
     kanan yang paling lebar, panel Edmonds-Karp pindah ke kiri bawah, dan catatan kapasitas mainan rata kanan di bawah graf supaya
     tidak bertemu panel itu. HP: caption selalu di bawah graf, jadi tidak ada yang bergeser */
  layout() {
    const el = this.el, vw = S.vw, pad = clamp(vw * 0.026, 16, 38);
    const kanan = small() ? [] : $$('#L-aliran .cap[data-pos^="r"] .w, #L-aliran .cap[data-pos^="r"] .sub').map(e => e.getBoundingClientRect().left);
    if (!kanan.length) { this.dx = this.rpX = this.noteX = 0; return; }
    const W = el.wrap.offsetWidth, x = Math.max(pad + W / 2, Math.min(vw * 0.38, Math.min(...kanan) - 28 - W / 2));
    this.dx = x - el.wrap.offsetLeft;   // offsetLeft = titik tengah, karena geser -50% memakai transform
    this.rpX = pad - el.rp.offsetLeft;
    this.noteX = W - el.note.offsetWidth;
  },
  update(p) {
    const c = CONTOH, el = this.el, caps = this.caps, ns = c.steps.length;
    for (const cp of caps) {
      cp.words = cp.words || cp.h._w;
      /* jendela caption di sini cuma sekitar 0,09, jadi kalimatnya masuk lebih cepat dan keluar lebih lambat.
         Dengan angka lama (masuk a+0,03..0,06, keluar b-0,035) kalimat langkah tidak pernah tampil penuh */
      rev(cp.words, p, cp.a, 0.045, cp.b - 0.024, cp.b);
      const so = inv(cp.a + 0.012, cp.a + 0.032, p) * (1 - inv(cp.b - 0.02, cp.b - 0.004, p));
      setO(cp.sub, so); setT(cp.sub, `translate3d(0,${((1 - so) * 14).toFixed(1)}px,0)`);
    }
    /* langkah ke-s memakai caption ke-(s+1); aliran diperbarui sedikit setelah jendelanya dimulai */
    let done = 0, act = -1;
    for (let s = 0; s < ns; s++) { const cp = caps[s + 1]; if (p >= cp.a + 0.035) done = s + 1; if (p >= cp.a && p < cp.b) act = s; }
    const cutA = caps[ns + 1].a, alA = caps[ns + 2].a, alB = caps[ns + 2].b;
    const flow = done ? c.steps[done - 1].flowAfter : {};
    const inAlpha = p >= alA && p < alB && this.av.length;
    const vi = inAlpha ? Math.min(this.av.length - 1, Math.floor(inv(alA, alB - 0.01, p) * this.av.length)) : -1;
    const hop = act >= 0 ? c.steps[act].hops : [];
    for (const id in this.E) {
      const o = this.E[id], e = o.e;
      const j = hop.findIndex(h => h.direction === 'maju' && h.from === e.from && h.to === e.to);
      const k = j < 0 ? 0 : E.inOut(inv(caps[act + 1].a + j * 0.008, caps[act + 1].a + 0.022 + j * 0.008, p));
      setA(o.h, 'stroke-dashoffset', (1 - k).toFixed(3)); setA(o.hg, 'stroke-dashoffset', (1 - k).toFixed(3));
      const isCut = p >= cutA && c.minCut.edges.includes(id);
      let cap = e.capacity, txt;
      if (vi >= 0 && this.pe && id === this.pe.id) { cap = this.av[vi].capacityEffective; txt = `kap ${String(cap).replace('.', ',')}`; }
      else txt = `${flow[id] || 0}/${e.capacity}`;
      setTx(o.txt, txt);
      const w = 2.4 * (this.pe && id === this.pe.id && vi >= 0 ? Math.max(0.3, cap / e.capacity) : 1);
      setA(o.base, 'stroke-width', w.toFixed(2));
      const cls = 'al-lb' + (isCut ? ' cut' : j >= 0 && k > 0.5 ? ' on' : '');
      if (o.lb._c !== cls) { o.lb._c = cls; o.lb.setAttribute('class', cls); }
      const sm = small(), rw = Math.max(sm ? 56 : 42, txt.length * (sm ? 11.2 : 8.6) + 16), rh = sm ? 28 : 22;   // di HP label lebih besar (CSS .al-lb text 18px)
      setA(o.rect, 'width', rw); setA(o.rect, 'x', -rw / 2); setA(o.rect, 'height', rh); setA(o.rect, 'y', -rh / 2); setA(o.rect, 'rx', 2.5);
      if (o.ilus) setA(o.ilus, 'opacity', vi >= 0 ? 1 : 0);
    }
    for (const key in this.back) { const [f, t] = key.split('-'); const on = act >= 0 && hop.some(h => h.direction === 'mundur' && h.from === f && h.to === t); setA(this.back[key], 'opacity', on ? E.inOut(inv(caps[act + 1].a + 0.01, caps[act + 1].a + 0.03, p)).toFixed(2) : 0); }
    const cutOn = p >= cutA && !inAlpha;
    if (this.cut) setA(this.cut, 'opacity', cutOn ? E.inOut(inv(cutA, cutA + 0.025, p)).toFixed(2) : 0);
    for (const id in this.nodes) { const s = cutOn && c.minCut.sourceSide.includes(id); const g = this.nodes[id]; if (g._s !== s) { g._s = s; g.classList.toggle('sisi-s', s); } }
    /* penghitung kanan atas dan panel */
    const fmt = v => String(v).replace('.', ',');
    if (vi >= 0) { setTx(el.k, 'Max flow'); setTx(el.num, fmt(this.av[vi].maxFlow)); setTx(el.s, `contoh · α ${fmt(this.av[vi].alpha)}`); }
    else if (p >= cutA) { setTx(el.k, 'Max flow'); setTx(el.num, fmt(c.maxFlow)); setTx(el.s, 'contoh'); }
    else { setTx(el.k, 'Total flow'); setTx(el.num, String(done ? c.steps[done - 1].totalFlow : 0)); setTx(el.s, 'contoh'); }
    const sh = act >= 0 ? act : done - 1;
    setTx(el.step, `${Math.max(0, sh + 1)}/${ns}`);
    setTx(el.bn, sh >= 0 ? String(c.steps[sh].bottleneck) : '-'); setTx(el.tf, String(done ? c.steps[done - 1].totalFlow : 0)); setTx(el.mf, done >= ns ? String(c.maxFlow) : '-');
    const key = sh >= 0 ? c.steps[sh].path.join(' ') : '';
    if (key !== this.last) { this.last = key; el.seq.innerHTML = key ? c.steps[sh].path.map(n => `<span class="on">${n}</span>`).join('') : ''; }
    /* graf, catatan, dan panel ikut pindah sisi bersama caption. Panel tidak melintasi layar, cukup pudar lalu muncul di sisi lain */
    const m = this.dx ? sisiCap(caps, p) : 0;
    setT(el.wrap, `translate(-50%,-50%) translate3d(${(m * this.dx).toFixed(1)}px,0,0) rotate(${(Math.sin(Math.PI * clamp(m)) * -1.6).toFixed(2)}deg)`);
    setT(el.note, `translate3d(${(m * this.noteX).toFixed(1)}px,0,0)`);
    setT(el.rp, `translate3d(${m > 0.5 ? this.rpX.toFixed(1) : 0}px,0,0)`);
    setO(el.wrap, inv(0, 0.04, p)); setO(el.cnt, inv(0.01, 0.05, p)); setO(el.rp, inv(0.12, 0.16, p) * (1 - inv(0.84, 0.88, p)) * clamp(Math.abs(2 * m - 1) * 2));
    setO(LAYERS.aliran, 1 - E.inOut(inv(0.88, 0.99, p)));
  }
};

/* =====================================================================
   10. AKHIR, HUD, KURSOR, TOAST, DIALOG
   ===================================================================== */
const End = {
  build() {
    let i = 0;
    $$('#endTitle .ln').forEach(ln => {
      const txt = ln.textContent; ln.textContent = '';
      [...txt].forEach(ch => { const s = document.createElement('span'); s.className = 'c'; s.style.setProperty('--i', i++); s.textContent = ch; ln.appendChild(s); });
    });
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) e.target.classList.add('in'); }), { threshold: 0.2 });
    $$('#s-akhir .reveal, #endTitle').forEach(el => io.observe(el));
  },
  layout() {
    const W = Math.round(S.vw * 1.08), H = Math.max(10, Math.round(S.vh * 0.46));
    [['#em0', 11, 0.3, 0.02], ['#em1', 23, 0.25, 0.3], ['#em2', 37, 0.2, 0.55]].forEach(([sel, seed, a, b]) => { const svg = $(sel); svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.firstElementChild.setAttribute('d', meltPath(W, H, seed, H * a, H * b)); });
    const r = mulberry32(99), st = []; for (let k = 0; k < 7; k++) st.push([r() * W, H * (0.82 + r() * 0.12), 4 + r() * 8]);
    $('#em2 .mstars').setAttribute('d', starsPath(st));
  }
};
const Hud = {
  arc: $('#dialArc'), num: $('#hudNum'), name: $('#hudName'), idx: -1,
  update() {
    const total = clamp(S.smoothY / Math.max(1, G.docH - S.vh));
    setA(this.arc, 'stroke-dashoffset', (125.66 * (1 - total)).toFixed(2));
    let idx = 0;
    for (let i = 0; i < ORDER.length; i++) { const k = ORDER[i], top = G[k].top + (k === 'akhir' ? S.vh * 0.4 : 0); if (S.smoothY >= top - 1) idx = i; }
    if (idx !== this.idx) {
      this.idx = idx; this.num.textContent = String(idx + 1).padStart(2, '0'); this.name.textContent = NAMES[idx];
      doc.classList.toggle('di-akhir', ORDER[idx] === 'akhir');   // HP: dial disembunyikan di penutup supaya tidak menimpa tiket
      if (window.Situs) window.Situs.aktif(ORDER[idx] === 'kartu' ? 'tim' : 'cerita');
    }
  }
};
const Cur = {
  el: $('#cursor'), cv: $('#sparkle'), parts: [], rx: 0, ry: 0, off: false, dirty: false,
  init() {
    if (REDUCED) { this.off = true; this.el.remove(); this.cv.remove(); return; }
    if (!FINE) { this.tanpaKursor = true; this.el.remove(); return; }
    doc.classList.add('has-cursor'); this.dot = $('.c-dot', this.el); this.ring = $('.c-ring', this.el);
    document.addEventListener('mouseover', e => { const h = e.target.closest && e.target.closest('a,button,.go,.card,.ticket,.klip,.pol,[role=button],summary,#gNodes g'); this.el.classList.toggle('hover', !!h); });
    document.addEventListener('mouseleave', () => this.el.classList.add('gone'));
    document.addEventListener('mouseenter', () => this.el.classList.remove('gone'));
  },
  resize() { if (this.off) return; this.d = Math.min(DPR, 1.5); this.cv.width = (S.vw * this.d) | 0; this.cv.height = (S.vh * this.d) | 0; this.ctx = this.cv.getContext('2d'); },
  spawn(x, y, dx, dy) {
    if (this.off || this.parts.length > 90) return;
    const cols = ['#f2b84b', '#e8737a', '#86c8e3', '#a3d9bb', '#b9a2e6', '#fbf3e4'];
    this.parts.push({ x, y, vx: dx * 0.08 + (Math.random() - 0.5) * 1.4, vy: dy * 0.08 + (Math.random() - 0.5) * 1.4 - 0.4, life: 1, s: 3 + Math.random() * 6, rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 0.2, c: cols[(Math.random() * cols.length) | 0] });
  },
  update(dt) {
    if (this.off) return;
    if (!this.tanpaKursor) {
      const m = S.mouse, k = 1 - Math.pow(1 - 0.2, dt);
      this.rx = lerp(this.rx, m.x, k); this.ry = lerp(this.ry, m.y, k);
      setT(this.dot, `translate3d(${m.x}px,${m.y}px,0)`); setT(this.ring, `translate3d(${this.rx.toFixed(1)}px,${this.ry.toFixed(1)}px,0)`);
    }
    if (!this.parts.length && !this.dirty) return;
    const ctx = this.ctx; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, this.cv.width, this.cv.height);
    this.dirty = this.parts.length > 0; ctx.setTransform(this.d, 0, 0, this.d, 0, 0);
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i]; p.life -= 0.022 * dt;
      if (p.life <= 0) { this.parts.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 0.03 * dt; p.rot += p.vr * dt;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.globalAlpha = p.life; ctx.fillStyle = p.c; star4(ctx, 0, 0, p.s * (0.4 + 0.6 * p.life)); ctx.restore();
    }
  }
};
const Toast = { el: $('#toast'), tm: 0, show(msg, ms = 1800) { this.el.textContent = msg; this.el.classList.add('show'); clearTimeout(this.tm); this.tm = setTimeout(() => this.el.classList.remove('show'), ms); } };
function ripple(x, y) { const r = document.createElement('div'); r.className = 'ripple'; r.style.left = x + 'px'; r.style.top = y + 'px'; document.body.appendChild(r); setTimeout(() => r.remove(), 1100); }
const Dlg = {
  el: $('#dlg'), box: $('#dlgBox'), on: false, from: null,
  /* fokus terkunci di dialog: semua di belakangnya inert selama dialog terbuka */
  kunci(on) { ['#stage', '.snav', '#main', '.hud-wrap'].forEach(q => { const e = $(q); if (e) e.inert = on; }); if (!on) akhirInert = null; },
  open(html, label, cls, from) {
    this.from = from || document.activeElement;
    this.box.className = 'dlg-box' + (cls ? ' ' + cls : '');
    this.box.innerHTML = `<button class="dlg-x" type="button" data-tutup aria-label="Tutup"><svg viewBox="0 0 14 14" aria-hidden="true"><path d="M2 2l10 10M12 2 2 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>` + html;
    this.el.setAttribute('aria-label', label); this.el.setAttribute('aria-hidden', 'false'); this.el.classList.add('open'); this.on = true;
    this.kunci(true);
    setTimeout(() => { const x = $('.dlg-x', this.box); if (x && this.on) x.focus({ preventScroll: true }); }, 40);
  },
  close() {
    if (!this.on) return; this.on = false;
    const v = $('video', this.box); if (v) v.pause();
    this.el.classList.remove('open'); this.el.setAttribute('aria-hidden', 'true');
    this.kunci(false);
    if (this.from && this.from.focus) this.from.focus({ preventScroll: true });
    setTimeout(() => { if (!this.on) this.box.innerHTML = ''; }, 420);
  },
  media(it, from) {
    const lbl = { cctv: 'CCTV Pelindung Bandung', hp: 'Rekaman HP', det: 'Uji program YOLO' }[it.jenis];
    const vid = it.src ? `<video class="dlg-vid" src="${esc(it.src)}" poster="${esc(it.poster || '')}" controls playsinline muted loop autoplay aria-label="Cuplikan ${esc(it.judul)}"></video>` : '<div class="dlg-kosong">Tidak ada cuplikan. Kamera tidak bisa dibuka dan titik ini belum direkam manual.</div>';
    this.open(`${vid}<div class="dlg-isi"><p class="dlg-k">${lbl}</p><h3>${esc(it.judul)}</h3><p class="dlg-peran">${esc(it.simpul)}${it.status ? ' · ' + esc(it.status) : ''}</p><p>${esc(it.catatan)}</p>${it.ket ? `<p class="mono">${esc(it.ket)}</p>` : ''}<div class="dlg-aksi"><button class="btn" type="button" data-tutup>Tutup</button></div></div>`, it.judul, 'media', from);
    const v = $('video', this.box);
    if (v) v.addEventListener('error', () => { const k = document.createElement('div'); k.className = 'dlg-kosong'; k.textContent = 'Video tidak bisa dimuat.'; v.replaceWith(k); });
  }
};
Dlg.el.addEventListener('click', e => { if (e.target === Dlg.el) Dlg.close(); });

/* =====================================================================
   11. RESIZE, INPUT, LOOP (bisa dijeda lewat window.Cerita.jeda)
   ===================================================================== */
const AKHIR = $('#s-akhir'); let akhirInert = null;
let lastW = 0, lastH = 0, running = false, rafId = 0, booted = false, needResize = false;
function onResize(force) {
  readViewport();
  const w = S.vw, h = S.vh, dw = Math.abs(w - lastW) > 2, dh = Math.abs(h - lastH) > 2;
  if (!force && !dw && !dh) return;
  const bigH = Math.abs(h - lastH) > 140;
  lastW = w; lastH = h;
  Flow.resize(force || dw); Cre.resize(); Tun.resize(); Stars.resize(); Stars2.resize(); Cur.resize();
  Rute.layout(); Paint.resize(force || dw || bigH); Malam.layout(); Rasi.layout();
  Ribbon.layout(); Hero.layoutMelts(); Paint.layoutMelts(); Cards.layout(); End.layout(); Tun.layoutKlip(); Data.layout(); Aliran.layout();
  measure();
  if (S.ready && !V.busy && (Math.hypot(w, h) * 1.12 > V.size * 1.04 || Math.abs(w - V.paintW) > 160)) V.repaint(V.seed, true);
}
let rT = 0;
addEventListener('resize', () => { if (!booted) return; if (!running) { needResize = true; return; } clearTimeout(rT); rT = setTimeout(() => onResize(false), 160); });
addEventListener('mousemove', e => {
  const m = S.mouse, dx = e.clientX - m.x, dy = e.clientY - m.y;
  m.x = e.clientX; m.y = e.clientY; m.nx = (m.x / (S.vw || 1)) * 2 - 1; m.ny = (m.y / (S.vh || 1)) * 2 - 1; m.last = performance.now();
  if (running && FINE && dx * dx + dy * dy > 36) Cur.spawn(m.x, m.y, dx, dy);
}, { passive: true });
document.addEventListener('click', e => {
  if (!S.ready || !running) return;
  const tg = e.target.closest ? e.target : e.target.parentElement;
  if (!tg) return;
  if (Cards.pin >= 0 && !tg.closest('.tl,.card')) Cards.tutup();
  if (tg.closest('[data-tutup]')) { Dlg.close(); return; }
  /* tautan ke adegan di halaman ini (/#tim dan seterusnya), dari navigasi atas atau tombol */
  const a = tg.closest('a[href]');
  if (a) {
    const u = new URL(a.href, location.href), k = HASH[u.hash.slice(1)];
    if (u.origin === location.origin && u.pathname === location.pathname && k) { e.preventDefault(); if (location.hash !== u.hash) history.replaceState(null, '', u.hash); goTo(k); }
    return;
  }
  const go = tg.closest('[data-go]');
  if (go) { e.preventDefault(); goTo(go.getAttribute('data-go')); return; }
  if (tg.closest('button,.card,.ticket,.pol,.klip,[role=button],.snav,.dlg,#gNodes')) return;
  if (Rasi.tipV >= 0) Rasi.tunjuk(-1);
  if (S.smoothY < G.hero.h * 0.3) { ripple(e.clientX, e.clientY); V.repaint(1 + ((V.seed * 48271 + 11) % 9973), false); }
});
addEventListener('keydown', e => {
  if (e.key === 'Escape' && Dlg.on) { Dlg.close(); return; }
  if (e.key === 'Escape' && Cards.cur >= 0) { Cards.tutup(); return; }
  if (!running || !S.ready || Dlg.on) return;
  const tg = e.target;
  if (tg && (tg.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName))) return;
  if ((e.key === 'r' || e.key === 'R') && S.smoothY < G.hero.h * 0.3 && !e.metaKey && !e.ctrlKey && !e.altKey) V.repaint(1 + ((V.seed * 48271 + 11) % 9973), false);
});
addEventListener('hashchange', () => { const k = HASH[location.hash.slice(1)]; if (k && S.ready && running) goTo(k); });
$('#toTop').addEventListener('click', () => { history.replaceState(null, '', location.pathname); window.scrollTo({ top: 0, behavior: REDUCED ? 'auto' : 'smooth' }); });

const boilEl = $('#boilT'); let boilT = 0, boilSeed = 1;
function frame(now) {
  if (!running) { rafId = 0; return; }
  rafId = requestAnimationFrame(frame);
  let dt = (now - S.last) / 16.6667; S.last = now;
  if (!(dt > 0)) dt = 1; if (dt > 4) dt = 4;
  S.t += dt / 60; const t = S.t, tt = REDUCED ? 0 : t;
  S.scrollY = window.scrollY;
  const prev = S.smoothY;
  if (REDUCED) S.smoothY = S.scrollY;
  else { S.smoothY += (S.scrollY - S.smoothY) * (1 - Math.pow(1 - 0.11, dt)); if (Math.abs(S.scrollY - S.smoothY) < 0.3) S.smoothY = S.scrollY; }
  S.vel = (S.smoothY - prev) / dt;
  const m = S.mouse, mk = 1 - Math.pow(1 - 0.06, dt); m.sx = lerp(m.sx, m.nx, mk); m.sy = lerp(m.sy, m.ny, mk);
  if (!S.ready) return;
  S.slowAcc = lerp(S.slowAcc, dt, 0.03);
  if (!S.degraded && S.t > 6 && S.slowAcc > 1.75) { S.degraded = true; QUALITY = 0.6; Flow.reset(); Tun.M = small() ? 72 : 90; }

  const y = S.smoothY;
  const inHero = y < G.lorong.top, inLor = !inHero && y < G.kartu.top, inKar = y >= G.kartu.top && y < G.rasi.top;
  const inRas = y >= G.rasi.top && y < G.goresan.top, inGor = y >= G.goresan.top && y < G.data.top;
  const inDat = y >= G.data.top && y < G.aliran.top, inAli = y >= G.aliran.top && y < G.akhir.top;
  const endK = clamp((y - (G.aliran.top + G.aliran.h * 0.8)) / (G.aliran.h * 0.2 + S.vh * 0.6));
  /* penutup baru bisa difokus keyboard setelah mulai tampil, jadi Tab dari navigasi tidak melompati seluruh cerita */
  const akhirMati = endK <= 0; if (akhirInert !== akhirMati && !Dlg.on) { akhirInert = akhirMati; AKHIR.inert = akhirMati; }
  setLayer('hero', inHero); setLayer('lorong', inLor); setLayer('kartu', inKar); setLayer('rasi', inRas); setLayer('goresan', inGor); setLayer('data', inDat); setLayer('aliran', inAli);
  const vxOn = inHero || endK > 0;
  V.el.classList.toggle('off', !vxOn);
  if (inHero) {
    Hero.update(prog('hero')); Ribbon.update(tt);
    if (!REDUCED) { boilT += dt; if (boilT > 7) { boilT = 0; boilSeed = (boilSeed % 5) + 1; boilEl.setAttribute('seed', boilSeed); } }
  }
  if (vxOn) V.update(dt, t, inHero ? prog('hero') : 0, inHero ? 0 : endK);
  if (inLor) Tun.update(prog('lorong'), tt, dt);
  if (inKar) Cards.update(prog('kartu'), tt, dt);
  else if (Cards.cur >= 0 || Cards.pin >= 0) Cards.reset();
  if (inRas) { const p = prog('rasi'); Rasi.update(p); Stars.draw(p, t, dt); Malam.update(0, p, tt, dt); }
  if (inRas || inGor) Rute.muat();
  if (inGor) { const p = prog('goresan'); Paint.update(p); Rute.update(p, tt, dt); }
  if (inDat) Data.update(prog('data'), tt); else if (Data.aktif) Data.henti();
  if (inAli) { const p = prog('aliran'); Aliran.update(p); Stars2.draw(p, t, dt); Malam.update(1, p, tt, dt); }
  Hud.update(); Cur.update(dt);
}

/* =====================================================================
   12. BOOT (tanpa loader: halaman langsung tampil, lukisan dipudarkan masuk saat selesai)
   ===================================================================== */
function isiAngka() {
  const n = D.n;
  $$('[data-n]').forEach(el => { const v = n[el.dataset.n]; if (v != null) el.textContent = String(v); });
  $$('[data-anggota]').forEach(el => { el.textContent = TIM.map(c => c.panggilan).join(' · '); });
}
function boot() {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  readViewport(); S.mouse.x = S.vw / 2; S.mouse.y = S.vh / 2;
  isiAngka();
  Hero.build(); Ribbon.build(); Tun.build(); Cards.build(); Rasi.build(); Malam.build(); Rute.build(); Data.build(); Aliran.build(); End.build();
  $$('.split').forEach(el => { el._w = splitWords(el); });
  Cur.init();
  booted = true;
  onResize(true);
  V.cvs[0].style.opacity = '0';
  V.paint(V.cvs[0], V.seed, null, () => { V.cvs[0].style.opacity = '1'; });
  finish();
}
function finish() {
  onResize(false); measure();
  S.ready = true;
  const k = HASH[location.hash.slice(1)];
  if (k && k !== 'hero') goTo(k, true); else { window.scrollTo(0, 0); S.scrollY = S.smoothY = 0; }
  requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add('ready')));
  mulai();
}
function mulai() {
  if (!booted || running || document.hidden) return;
  if (needResize) { needResize = false; onResize(false); }
  S.last = performance.now();
  S.scrollY = S.smoothY = window.scrollY;   // wajib disamakan, kalau tidak penghalusan akan melintasi semua adegan
  if (!Cur.off && !Cur.tanpaKursor) doc.classList.add('has-cursor');
  running = true; if (!rafId) rafId = requestAnimationFrame(frame);
}
function jeda() {
  if (!running) return;
  running = false; if (rafId) cancelAnimationFrame(rafId); rafId = 0;
  doc.classList.remove('has-cursor'); Toast.el.classList.remove('show');
}
window.Cerita = { mulai, jeda, goTo: k => goTo(HASH[k] || k) };
document.addEventListener('visibilitychange', () => (document.hidden ? jeda() : mulai()));

const ambil = u => fetch(u).then(r => { if (!r.ok) throw new Error(u + ' ' + r.status); return r.json(); });
Promise.all([ambil(BASE + 'data/graf.json'), ambil(BASE + 'data/contoh_graf.json'), ambil(BASE + 'landing/hero-peta.json').catch(() => null)])
  .then(([g, c, m]) => { D = olahData(g); CONTOH = c; PETA = m; boot(); })
  .catch(() => { $('#heroMeta').textContent = 'Data graf gagal dimuat. Coba muat ulang halaman.'; document.body.classList.add('ready'); });
})();
