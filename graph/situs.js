/* Navigasi atas bersama untuk / (landing) dan halaman di /graph/.
   Pakai: <link rel="stylesheet" href=".../graph/situs.css"> lalu <script src=".../graph/situs.js" defer></script>.
   Menu aktif ditebak dari alamat halaman, bisa diganti lewat window.Situs.aktif('tim'). */
(() => {
  'use strict';
  const MENU = [
    { k: 'cerita', t: 'Cerita', sub: [['01', 'Max Flow', '/#mulai'], ['02', 'Masalah', '/#masalah'], ['03', 'Tim', '/#tim'], ['04', 'Graf', '/#graf'], ['05', 'Rute', '/#rute'], ['06', 'Data lapangan', '/#data'], ['07', 'Aliran', '/#aliran'], ['08', 'Akhir', '/#akhir']] },
    { k: 'dashboard', t: 'Dashboard Peta', href: '/graph/' },
    { k: 'cctv', t: 'CCTV dan Video', sub: [['', 'CCTV', '/graph/cctv.html#cctv'], ['', 'Rekaman HP', '/graph/cctv.html#hp'], ['', 'Deteksi kendaraan', '/graph/cctv.html#deteksi'], ['', 'Program hitung kendaraan', '/graph/cctv.html#program']] },
    { k: 'visualisasi', t: 'Visualisasi', sub: [['', 'Ford-Fulkerson', '/graph/visualisasi.html#ford-fulkerson'], ['', 'Iterative Ford-Fulkerson', '/graph/visualisasi.html#iterative']] },
    { k: 'tim', t: 'Tim', href: '/#tim' }
  ];
  // warna 8 rute (urutan GRAPH_DATA.paths), dipakai bersama landing dan dashboard supaya sama
  const WARNA_RUTE = ['#e0492f', '#2e9184', '#6d4bb3', '#d9862c', '#232a78', '#d6537a', '#3d8fb8', '#7a9a2e'];

  const caret = '<svg class="snav-caret" viewBox="0 0 10 10" aria-hidden="true"><path d="M1.5 3.5 5 7l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const spiral = (() => { let d = ''; for (let i = 0; i <= 70; i++) { const u = i / 70, a = u * 2.2 * Math.PI * 2, r = 0.6 + (10.5 - 0.6) * u; d += (i ? 'L' : 'M') + (Math.cos(a) * r).toFixed(2) + ' ' + (Math.sin(a) * r).toFixed(2); } return d; })();
  const isi = s => s.map(([n, t, h]) => `<li><a href="${h}">${n ? `<span>${n}</span>` : ''}${t}</a></li>`).join('');

  const desk = MENU.map(m => m.sub
    ? `<li class="snav-item" data-k="${m.k}"><button class="snav-link" type="button" aria-expanded="false">${m.t}${caret}</button><ul class="snav-drop">${isi(m.sub)}</ul></li>`
    : `<li class="snav-item" data-k="${m.k}"><a class="snav-link" href="${m.href}">${m.t}</a></li>`).join('');
  const hp = MENU.map(m => m.sub
    ? `<details data-k="${m.k}"><summary>${m.t}${caret}</summary><ul>${isi(m.sub)}</ul></details>`
    : `<a data-k="${m.k}" href="${m.href}">${m.t}</a>`).join('');

  const nav = document.createElement('nav');
  nav.className = 'snav'; nav.setAttribute('aria-label', 'Navigasi utama');
  nav.innerHTML = `<a class="snav-logo" href="/#mulai" aria-label="GASIBU, kembali ke awal"><svg viewBox="-12 -12 24 24" aria-hidden="true"><path d="${spiral}"/></svg><span>GASIBU</span></a>
<ul class="snav-menu">${desk}</ul>
<button class="snav-btn" type="button" aria-expanded="false" aria-controls="snavPanel"><span>Menu</span><span class="snav-ico" aria-hidden="true"></span></button>
<div class="snav-panel" id="snavPanel">${hp}</div>`;
  document.body.prepend(nav);
  // filter tinta untuk cap/stempel (kit label kertas di situs.css): tepi garis jadi kasar dan ada bintik tinta yang tidak kena
  nav.insertAdjacentHTML('beforeend', '<svg width="0" height="0" style="position:absolute;width:0;height:0" aria-hidden="true" focusable="false"><filter id="tinta" x="-15%" y="-25%" width="130%" height="150%"><feTurbulence type="fractalNoise" baseFrequency=".75" numOctaves="2" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="2.4" xChannelSelector="R" yChannelSelector="G" result="d"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -3.4 0 0 0 2.75" result="m"/><feComposite in="d" in2="m" operator="in"/></filter></svg>');

  const items = [...nav.querySelectorAll('.snav-item')];
  const tutupSemua = kecuali => items.forEach(it => { if (it !== kecuali && it.classList.contains('buka')) { it.classList.remove('buka'); const b = it.querySelector('button'); if (b) b.setAttribute('aria-expanded', 'false'); } });
  const setBuka = (it, on) => { if (on) tutupSemua(it); it.classList.toggle('buka', on); it.querySelector('button').setAttribute('aria-expanded', String(on)); };
  const hover = matchMedia('(hover: hover)').matches;
  items.forEach(it => {
    const b = it.querySelector('button'); if (!b) return;
    // klik sesaat setelah dropdown terbuka karena hover tidak menutupnya lagi
    let tHover = 0;
    b.addEventListener('click', () => setBuka(it, performance.now() - tHover < 600 ? true : !it.classList.contains('buka')));
    if (hover) { let tm = 0; it.addEventListener('mouseenter', () => { clearTimeout(tm); if (!it.classList.contains('buka')) tHover = performance.now(); setBuka(it, true); }); it.addEventListener('mouseleave', () => { tm = setTimeout(() => setBuka(it, false), 140); }); }
    it.addEventListener('focusout', e => { if (!it.contains(e.relatedTarget)) setBuka(it, false); });
  });

  const btn = nav.querySelector('.snav-btn'), panel = nav.querySelector('.snav-panel');
  const setPanel = on => { nav.classList.toggle('panel-buka', on); btn.setAttribute('aria-expanded', String(on)); btn.firstElementChild.textContent = on ? 'Tutup' : 'Menu'; btn.setAttribute('aria-label', on ? 'Tutup menu' : 'Buka menu'); document.documentElement.classList.toggle('snav-kunci', on); [...document.body.children].forEach(el => { if (el !== nav && el.tagName !== 'SCRIPT') el.inert = on; }); };
  btn.setAttribute('aria-label', 'Buka menu');
  btn.addEventListener('click', () => setPanel(!nav.classList.contains('panel-buka')));
  nav.addEventListener('click', e => { const a = e.target.closest('a'); if (!a) return; tutupSemua(null); if (nav.classList.contains('panel-buka')) setPanel(false); });
  document.addEventListener('keydown', e => { if (e.key !== 'Escape') return; if (nav.classList.contains('panel-buka')) { setPanel(false); btn.focus(); } tutupSemua(null); });
  document.addEventListener('click', e => { if (!nav.contains(e.target)) tutupSemua(null); });

  const aktif = k => {
    items.forEach(it => it.classList.toggle('aktif', it.dataset.k === k));
    panel.querySelectorAll('[data-k]').forEach(el => el.classList.toggle('aktif', el.dataset.k === k));
  };
  const p = location.pathname.replace(/index\.html$/, '');
  aktif(/\/graph\/cctv/.test(p) ? 'cctv' : /\/graph\/visualisasi/.test(p) ? 'visualisasi' : /\/graph\/?$/.test(p) ? 'dashboard' : 'cerita');
  window.Situs = { aktif, WARNA_RUTE, tutup: () => { tutupSemua(null); setPanel(false); } };
})();
