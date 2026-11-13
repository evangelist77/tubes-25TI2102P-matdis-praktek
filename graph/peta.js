/*
 * Tambahan Dashboard Peta (graph/index.html), dimuat setelah app-script.
 * Memakai nama global dari app-script: GRAPH_DATA, map, pathLayers, nodeMarkers, surveyMarkers, formatNodeHtml, bersih,
 * warnaRute. Isinya: angka dari data, pin dan popup CCTV / rekaman HP (video dari MEDIA_DATA), ruas pasar, fitBounds,
 * dan lembar bawah untuk HP.
 */
(() => {
  'use strict';
  const M = window.MEDIA_DATA || {};
  const D = GRAPH_DATA;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const hp = window.matchMedia('(max-width: 900px)');
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  // path media di media.js relatif ke /graph/, jadi tetap benar walau halaman dibuka lewat /graph tanpa garis miring
  const aset = (s) => (s ? '/graph/' + String(s).replace(/^\.?\//, '') : '');
  const koma = (n) => String(n).replace('.', ',');

  const IKON_KAMERA = '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="1.5" y="4.5" width="9" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M10.5 7.3 14.5 5v6l-4-2.3z" fill="currentColor"/></svg>';
  const IKON_HP = '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="4.25" y="1.5" width="7.5" height="13" rx="1.8" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M7 11.8h2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';

  // jarak aman popup dari tombol zoom dan legenda di bagian atas peta
  const pegH = () => (hp.matches ? ($('#lembar-pegangan') || {}).offsetHeight || 76 : 0);
  const OPSI_POPUP = {
    maxWidth: 320, minWidth: 250, className: 'pop-wrap', autoPanPaddingTopLeft: [16, 100],
    maxHeight: Math.round(window.innerHeight * (hp.matches ? 0.55 : 0.8)), autoPanPaddingBottomRight: [16, pegH() + 16]
  };
  const status = (s) => {
    if (s === 'aman') return { k: 'aman', t: 'Aman' };
    if (s === 'tidak bisa dibuka') return { k: 'mati', t: 'Tidak bisa dibuka' };
    if (s && s.startsWith('baru')) return { k: 'baru', t: 'Baru, belum dicek' };
    return { k: 'belum', t: s || 'Belum ada data' };
  };
  const waktu = (iso) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(iso || '');
    return m ? `${+m[3]} ${BULAN[+m[2] - 1]} ${m[1]}${m[4] ? ` pukul ${m[4]}.${m[5]}` : ''}` : '';
  };
  const durasi = (dtk) => {
    const m = Math.floor(dtk / 60), d = Math.round(dtk % 60);
    return m ? `${m} menit${d ? ` ${d} detik` : ''}` : `${d} detik`;
  };
  const lewat = (nodeId) => D.paths.filter((p) => p.nodeIds.includes(nodeId)).map((p) => p.id);
  const video = (klip, lebar) =>
    `<video class="${lebar ? 'lebar' : ''}" muted loop playsinline autoplay preload="auto" poster="${esc(aset(klip.poster))}" src="${esc(aset(klip.src))}"></video>`;

  // ---------- angka dari data ----------
  const stCctv = D.cctvPoints.map((c) => status(((M.cctv || {})[c.id] || {}).status).k);
  const N = {
    rute: D.paths.length,
    titik: D.cctvPoints.length + D.manualSurveyPoints.length,
    simpang: Object.values(D.nodes).filter((n) => n.type === 'junction').length,
    aman: stCctv.filter((k) => k === 'aman').length,
    mati: stCctv.filter((k) => k === 'mati').length,
    baru: stCctv.filter((k) => k === 'baru').length,
    hp: D.manualSurveyPoints.length
  };
  $$('[data-n]').forEach((el) => { el.textContent = N[el.dataset.n] == null ? '' : N[el.dataset.n]; });
  $$('[data-n="baru"]').forEach((el) => { if (!N.baru) el.closest('.legend-item').hidden = true; });
  const cocok = {
    all: () => true,
    gasibu: (p) => p.id.endsWith('-Gasibu'),
    S1: (p) => p.source === 'S1', S2: (p) => p.source === 'S2',
    T1: (p) => p.sink === 'T1', T2: (p) => p.sink === 'T2'
  };
  $$('#path-filters .filter-tab').forEach((b) => {
    const f = cocok[b.dataset.filter];
    if (f) b.insertAdjacentHTML('beforeend', `<span class="n">${D.paths.filter(f).length}</span>`);
  });

  // ---------- pin dan popup CCTV / rekaman HP ----------
  const nC = D.cctvPoints.length;
  D.cctvPoints.forEach((pt, i) => {
    const m = surveyMarkers[i];
    const info = (M.cctv || {})[pt.id] || {};
    const st = status(info.status);
    m.setIcon(L.divIcon({
      className: '',
      html: `<div class="cctv-circle-pin st-${st.k}">${IKON_KAMERA}</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -12]
    }));
    m.getElement().setAttribute('aria-label', `CCTV ${bersih(info.kamera || pt.name).replace(/^CCTV\s+/i, '')}, ${st.t}`);
    m.unbindTooltip().bindTooltip(
      `<div class="segment-tooltip"><div class="seg-name">${esc(bersih(info.kamera || pt.name))}</div><div class="seg-nodes">${formatNodeHtml(pt.nodeId)} · ${st.t}</div></div>`,
      { direction: 'top', className: 'segment-tooltip-container', offset: [0, -12] }
    );
    m.bindPopup(() => {
      const k = info.klip;
      return `<div class="pop">
        <div class="pop-k"><span class="pill st-${st.k}">${st.t}</span><span class="pop-mono">${formatNodeHtml(pt.nodeId)} · ${esc(pt.dinas)}</span></div>
        <h3 class="pop-h">${esc(bersih(info.kamera || pt.name))}</h3>
        ${k && k.src
          ? `${video(k, false)}<p class="pop-ket">Cuplikan ${waktu(k.direkam)} · ${koma(Math.round(k.durasi_detik))} detik · sudah diproses program hitung</p>${info.catatan ? `<p class="pop-cat">${esc(info.catatan)}</p>` : ''}`
          : `<p class="pop-kosong">Tidak ada cuplikan. ${esc(info.catatan || '')}</p>`}
        <p class="pop-lewat">Dilewati ${lewat(pt.nodeId).join(', ')}</p>
      </div>`;
    }, OPSI_POPUP);
  });

  D.manualSurveyPoints.forEach((pt, j) => {
    const m = surveyMarkers[nC + j];
    const info = (M.manual || {})[pt.id] || {};
    const k = info.klip;
    const judul = info.judul || bersih(pt.name.replace(/^.+?:\s*/, ''));
    m.setIcon(L.divIcon({
      className: '',
      html: `<div class="manual-circle-pin">${IKON_HP}</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -12]
    }));
    m.getElement().setAttribute('aria-label', `Titik rekam HP ${judul}`);
    m.unbindTooltip().bindTooltip(
      `<div class="segment-tooltip"><div class="seg-name">Rekaman HP · ${esc(judul)}</div><div class="seg-nodes">${formatNodeHtml(pt.nodeId)}${k && k.jam ? ` · sekitar ${k.jam}` : ''}</div></div>`,
      { direction: 'top', className: 'segment-tooltip-container', offset: [0, -12] }
    );
    m.bindPopup(() => `<div class="pop">
        <div class="pop-k"><span class="pill st-hp">Rekaman HP</span><span class="pop-mono">${formatNodeHtml(pt.nodeId)}</span></div>
        <h3 class="pop-h">${esc(judul)}</h3>
        ${k && k.src
          ? `<p class="pop-mono">Minggu 1 Nov 2026 sekitar ${esc(k.jam)} · rekaman asli ${durasi(k.durasi_asli_detik)}</p>${video(k, true)}<p class="pop-ket">Cuplikan ${k.durasi_detik} detik dari menit ke-${k.dari_menit} · sudah diproses program hitung</p>`
          : '<p class="pop-kosong">Video belum tersedia.</p>'}
        <p class="pop-cat">${esc(info.alasan || bersih(pt.reason))}</p>
        <p class="pop-lewat">Dilewati ${lewat(pt.nodeId).join(', ')} · arus sudah dihitung program, angka sementara</p>
      </div>`, OPSI_POPUP);
  });

  // video punya aspect-ratio tetap di CSS, jadi ukuran popup tidak berubah saat video dimuat
  // legenda dilipat saat popup dibuka supaya tidak menutupi popup (legenda ada di atas lapisan popup Leaflet)
  let pinAsal = null, popupBuka = false;
  map.on('popupopen', (e) => {
    $('#map-legend').open = false; pinAsal = e.popup._source || null; popupBuka = true;
    // video popup langsung berputar tanpa tombol play, dan dijeda lagi di popupclose (juga saat titik lain dibuka)
    e.popup.getElement().querySelectorAll('video').forEach((v) => { v.muted = true; const p = v.play(); if (p && p.catch) p.catch(() => {}); });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !popupBuka) return;
    map.closePopup();
    const el = pinAsal && pinAsal.getElement && pinAsal.getElement();
    if (el) el.focus({ preventScroll: true });
  });
  map.on('popupclose', (e) => {
    popupBuka = false;
    const el = e.popup.getElement();
    if (el) el.querySelectorAll('video').forEach((v) => v.pause());
  });

  // Tooltip simpul: label bersih, koordinat asli, dan berapa rute yang lewat
  Object.entries(nodeMarkers).forEach(([id, mk]) => {
    const n = D.nodes[id];
    mk.unbindTooltip().bindTooltip(
      `<div class="segment-tooltip"><div class="seg-name">${formatNodeHtml(id)}</div><div class="seg-detail">${esc(bersih(n.label.replace(/^[ST]\d:\s*/, '')))}</div><div class="seg-nodes">${n.lat.toFixed(5)}, ${n.lng.toFixed(5)} · dilewati ${lewat(id).length} rute</div></div>`,
      { direction: 'top', className: 'segment-tooltip-container', offset: [0, -8] }
    );
  });

  // Tombol lapisan CCTV: teks ikut keadaan, pin yang disembunyikan tidak bisa diklik
  const btnLapis = $('#btn-toggle-cctv');
  const sinkronLapis = () => {
    const mati = btnLapis.classList.contains('inactive');
    btnLapis.querySelector('.btn-teks').textContent = mati ? 'Tampilkan CCTV dan titik rekam HP' : 'Sembunyikan CCTV dan titik rekam HP';
    btnLapis.setAttribute('aria-pressed', String(!mati));
    map.getContainer().classList.toggle('peta-sembunyi', mati);
    if (mati) { map.closePopup(); surveyMarkers.forEach((m) => m.closeTooltip()); }
  };
  btnLapis.addEventListener('click', sinkronLapis);

  // Rute terpilih yang tidak lolos saringan dilepas, supaya rute hasil saringan tampil penuh
  const tandaiChip = () => $$('#path-filters .filter-tab').forEach((b) => b.setAttribute('aria-pressed', String(b.classList.contains('active'))));
  $$('#path-filters .filter-tab').forEach((b) => b.addEventListener('click', () => {
    const f = cocok[b.dataset.filter];
    const aktif = D.paths.find((p) => p.id === window.getActivePathId());
    if (f && aktif && (b.dataset.filter === 'all' || !f(aktif))) { window.selectPath(null); window.setPathFilter(b.dataset.filter); }
    tandaiChip();
  }));
  tandaiChip();
  $('#btn-show-all').addEventListener('click', tandaiChip);

  // Kartu rute bisa dipilih dengan keyboard
  $('#path-list').addEventListener('keydown', (e) => {
    const c = e.target.closest('.path-card');
    if (c && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); c.click(); }
  });

  // Ruas pasar (Jl. Gasibu Atas) diberi sapuan merah lembut di bawah garis rute
  const pasar = D.segments.find((s) => s.id === 'seg_gasibu_atas');
  if (pasar) L.polyline(pasar.coords, { color: '#e0492f', weight: 20, opacity: 0.32, lineCap: 'round', interactive: false }).addTo(map).bringToBack();

  // ---------- ukuran peta ----------
  const batas = L.latLngBounds(D.paths.flatMap((p) => p.coords));
  const pas = () => {
    map.invalidateSize();
    // di HP sisakan ruang untuk label S1 di kiri dan tombol legenda di atas
    map.fitBounds(batas, hp.matches ? { paddingTopLeft: [44, 64], paddingBottomRight: [12, 12] } : { paddingTopLeft: [40, 40], paddingBottomRight: [40, 40] });
  };
  map.options.zoomSnap = 0.25;
  pas();
  let tRes = 0;
  window.addEventListener('resize', () => { clearTimeout(tRes); tRes = setTimeout(() => map.invalidateSize(), 150); });

  // ---------- lembar bawah (HP) ----------
  const lembar = $('#sidebar'), peg = $('#lembar-pegangan'), ringkas = $('#lembar-ringkas');
  const setLembar = (buka) => { lembar.classList.toggle('buka', buka); peg.setAttribute('aria-expanded', String(buka)); };
  const legenda = $('#map-legend');
  const ikutLayar = () => {
    if (!hp.matches) setLembar(false);
    legenda.open = !hp.matches;
  };
  ikutLayar();
  hp.addEventListener('change', () => { ikutLayar(); setTimeout(pas, 50); });

  let tarik = null;
  peg.addEventListener('pointerdown', (e) => {
    if (!hp.matches) return;
    tarik = { y: e.clientY, buka: lembar.classList.contains('buka'), tutup: lembar.offsetHeight - peg.offsetHeight, gerak: false };
    try { peg.setPointerCapture(e.pointerId); } catch (err) { /* pointer sintetis */ }
  });
  peg.addEventListener('pointermove', (e) => {
    if (!tarik) return;
    const dy = e.clientY - tarik.y;
    if (!tarik.gerak && Math.abs(dy) < 6) return;
    tarik.gerak = true;
    const y = Math.max(0, Math.min(tarik.tutup, (tarik.buka ? 0 : tarik.tutup) + dy));
    lembar.style.transition = 'none';
    lembar.style.transform = `translate3d(0,${y}px,0)`;
  });
  const lepas = (e, batal) => {
    if (!tarik) return;
    const t = tarik;
    tarik = null;
    lembar.style.transition = '';
    lembar.style.transform = '';
    if (batal) return;
    if (!t.gerak) { setLembar(!t.buka); return; }
    const dy = e.clientY - t.y;
    setLembar(Math.abs(dy) < 40 ? t.buka : dy < 0);
  };
  peg.addEventListener('pointerup', (e) => lepas(e, false));
  peg.addEventListener('pointercancel', (e) => lepas(e, true));
  peg.addEventListener('click', (e) => { if (e.detail === 0) setLembar(!lembar.classList.contains('buka')); }); // Enter / Spasi

  // Ringkasan rute aktif di pegangan lembar
  const tulisRingkas = () => {
    const p = D.paths.find((x) => x.id === window.getActivePathId());
    ringkas.innerHTML = p
      ? `<span class="color-dot" style="background:${warnaRute(p)}"></span>${formatNodeHtml(p.source)} → ${formatNodeHtml(p.sink)}${p.id.endsWith('-Gasibu') ? ' lewat Gasibu Atas' : ''}`
      : `Semua ${D.paths.length} rute`;
  };
  new MutationObserver(tulisRingkas).observe($('#path-detail'), { childList: true });
  tulisRingkas();

  // Tombol reset cuma muncul kalau ada rute terpilih (chip Semua juga mereset)
  const btnSemua = $('#btn-show-all');
  const sinkronReset = () => { btnSemua.hidden = !window.getActivePathId(); };
  new MutationObserver(sinkronReset).observe($('#path-detail'), { childList: true });
  sinkronReset();

  // Setelah kartu rute dipilih: di HP lembar diturunkan dan peta difokuskan ke rute itu,
  // di desktop panel digulir ke detail rute supaya urutan alirannya kelihatan
  $('#path-list').addEventListener('click', (e) => {
    if (!e.target.closest('.path-card')) return;
    setTimeout(() => {
      const p = D.paths.find((x) => x.id === window.getActivePathId());
      if (!p) return;
      if (hp.matches) {
        setLembar(false);
        map.fitBounds(L.latLngBounds(p.coords), { paddingTopLeft: [24, 72], paddingBottomRight: [24, 24] });
      } else {
        $('#path-detail').scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      }
    }, 0);
  });
})();
