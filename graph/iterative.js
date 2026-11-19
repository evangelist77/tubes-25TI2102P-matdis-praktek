/* ==========================================================================
   Visualisasi Iterative Ford-Fulkerson
   Penulis: Ganesh Diyan Khansa Khairunnisa (Kelompok 1, Kelas 2B-D4)
   Kasus 4: Pasar Tumpah Gasibu - Monju
   ========================================================================== */

(() => {
  'use strict';

  // --- Konstanta Warna & Desain Token (Theme Tokens) ---
  const COLORS = {
    ratio: {
      low: '#10b981',       // 0% - 30% (Lancar)
      moderate: '#84cc16',  // 31% - 60% (Sedang)
      high: '#eab308',      // 61% - 85% (Padat)
      critical: '#f97316',  // 86% - 99% (Sangat Padat)
      saturated: '#ef4444'  // 100% (Jenuh / Bottleneck)
    },
    edges: {
      defaultNormal: '#64748b',
      marketSpecial: '#ea580c',
      closed: '#94a3b8'
    }
  };

  function getFlowRatioColor(flow, capacity) {
    if (capacity <= 0) return COLORS.edges.closed;
    const ratio = flow / capacity;
    if (ratio >= 1.0) return COLORS.ratio.saturated;
    if (ratio >= 0.85) return COLORS.ratio.critical;
    if (ratio >= 0.6) return COLORS.ratio.high;
    if (ratio >= 0.3) return COLORS.ratio.moderate;
    return COLORS.ratio.low;
  }

  function getBadgeInfo(flow, capacity) {
    if (capacity <= 0) return { cls: 'kritis', text: 'Ditutup' };
    const ratio = flow / capacity;
    if (ratio >= 1.0) return { cls: 'jenuh', text: 'Jenuh 100%' };
    if (ratio >= 0.85) return { cls: 'kritis', text: 'Sangat Padat' };
    if (ratio >= 0.6) return { cls: 'padat', text: 'Padat' };
    if (ratio >= 0.3) return { cls: 'sedang', text: 'Sedang' };
    return { cls: 'lancar', text: 'Lancar' };
  }

  // --- State Aplikasi Visualisasi Ganesh ---
  const state = {
    topology: null,
    geometry: null,
    routes: [],
    iter: {}, // trace iterative Python: { normal: iterative_a0.json, pasar: iterative_a<alpha pasar>.json }
    alphaPasar: 0,
    currentCondition: 'normal', // 'normal' | 'pasar'
    currentPair: 'all',         // 'all' | 'S1-T1' | 'S1-T2' | 'S2-T1' | 'S2-T2'
    currentRoute: 'all',        // 'all' | 'S1-T1' | 'S1-T2' | ... (8 rute)
    selectedEdgeId: null,
    map: null,
    edgeLayers: {},
    haloLayers: {}
  };

  const PAIR_KEYS = [
    { src: 'S1', sink: 'T1', label: 'S1 → T1' },
    { src: 'S1', sink: 'T2', label: 'S1 → T2' },
    { src: 'S2', sink: 'T1', label: 'S2 → T1' },
    { src: 'S2', sink: 'T2', label: 'S2 → T2' }
  ];

  // Helper DOM
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  // --- Inisialisasi Utama ---
  async function init() {
    const mapEl = $('#iter-map');
    if (!mapEl) return;

    try {
      await loadData();
      $('.iter-toggle-btn[data-kondisi="pasar"]').textContent = `Saat Pasar (α = ${Math.round(state.alphaPasar * 100)}%)`;
      initMap();
      initControls();
      render();
    } catch (err) {
      console.error('[Iterative Visualizer] Gagal inisialisasi:', err);
      $('#iter-inspect-content').innerHTML = `
        <p style="color: #c2410c; font-weight: 600;">
          Gagal memuat data visualisasi: ${err.message}. Pastikan file data tersedia di /graph/ff/data/.
        </p>
      `;
    }
  }

  // --- Memuat Data JSON yang Sudah Ada (Tanpa Mengubah Data) ---
  async function loadData() {
    // Jalur data yang ada di graph/ff/data/ dan graph/data/
    const [topoRes, geomRes, routesRes] = await Promise.all([
      fetch('/graph/ff/data/topology.json').then((r) => r.json()),
      fetch('/graph/ff/data/geometry.json').then((r) => r.json()),
      fetch('/graph/ff/data/routes.json').then((r) => r.json())
    ]);

    state.topology = topoRes;
    state.geometry = geomRes;
    state.routes = routesRes.routes || [];

    // Trace dari algoritma Iterative Ford-Fulkerson Python (algorithms/maxflow/iterative_ford_fulkerson.py).
    // Kondisi pasar memakai alpha terukur di manifest, sama dengan visualisasi Ford-Fulkerson.
    const manifest = await fetch('/graph/ff/data/manifest.json').then((r) => r.json());
    state.alphaPasar = manifest.observedAlpha;
    const [normal, pasar] = await Promise.all([0, manifest.observedAlpha].map((a) =>
      fetch(`/graph/ff/data/iterative_a${Math.round(a * 100)}.json`).then((r) => (r.ok ? r.json() : null))
    ));
    if (!normal || !pasar) throw new Error('trace iterative belum dibuat');
    state.iter = { normal, pasar };
  }

  // --- Inisialisasi Peta Leaflet ---
  function initMap() {
    // Pusat peta kawasan Gasibu - Gedung Sate - Monju
    state.map = L.map('iter-map', {
      center: [-6.8995, 107.6185],
      zoom: 15,
      minZoom: 13,
      maxZoom: 18,
      zoomControl: true
    });

    // Tile OpenStreetMap
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap kontributor'
    }).addTo(state.map);

    // Marker simpul utama S1, S2, T1, T2
    const nodeIcons = {
      S1: L.divIcon({ className: 'iter-node-icon', html: '<div class="node-badge node-src">S₁</div>', iconSize: [28, 28] }),
      S2: L.divIcon({ className: 'iter-node-icon', html: '<div class="node-badge node-src">S₂</div>', iconSize: [28, 28] }),
      T1: L.divIcon({ className: 'iter-node-icon', html: '<div class="node-badge node-sink">T₁</div>', iconSize: [28, 28] }),
      T2: L.divIcon({ className: 'iter-node-icon', html: '<div class="node-badge node-sink">T₂</div>', iconSize: [28, 28] })
    };

    const terminalCoords = {
      S1: [-6.89550, 107.60870],
      S2: [-6.89190, 107.61758],
      T1: [-6.89955, 107.62709],
      T2: [-6.90115, 107.62485]
    };

    for (const [code, pos] of Object.entries(terminalCoords)) {
      L.marker(pos, { icon: nodeIcons[code] })
        .addTo(state.map)
        .bindTooltip(`<b>${code}</b>: Titik ${code.startsWith('S') ? 'Masuk (Source)' : 'Keluar (Sink)'}`);
    }
  }

  // --- Inisialisasi Kontrol Interaktif ---
  function initControls() {
    // 1. Toggle Kondisi (Tanpa Pasar vs Pasar Penuh)
    $$('#iter-kondisi-toggle .iter-toggle-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        $$('#iter-kondisi-toggle .iter-toggle-btn').forEach((b) => b.classList.remove('aktif'));
        btn.classList.add('aktif');
        state.currentCondition = btn.dataset.kondisi;
        render();
      });
    });

    // 2. Select Pasangan S-T
    const pairSelect = $('#iter-pair-select');
    if (pairSelect) {
      pairSelect.addEventListener('change', (e) => {
        state.currentPair = e.target.value;
        // Sesuaikan rute dropdown bila pasangan berubah
        syncRouteDropdown();
        render();
      });
    }

    // 3. Select Cabang Rute (8 Rute P1 - P8)
    const routeSelect = $('#iter-route-select');
    if (routeSelect) {
      routeSelect.addEventListener('change', (e) => {
        state.currentRoute = e.target.value;
        render();
      });
    }
  }

  function syncRouteDropdown() {
    const routeSelect = $('#iter-route-select');
    if (!routeSelect) return;

    const currentPair = state.currentPair;
    Array.from(routeSelect.options).forEach((opt) => {
      if (opt.value === 'all') {
        opt.hidden = false;
        return;
      }
      if (currentPair === 'all') {
        opt.hidden = false;
      } else {
        // Hanya tampilkan rute yang cocok dengan pasangan
        opt.hidden = !opt.value.startsWith(currentPair);
      }
    });

    // Jika opsi yang sedang terpilih tersembunyi, reset ke 'all'
    if (routeSelect.selectedOptions[0]?.hidden) {
      routeSelect.value = 'all';
      state.currentRoute = 'all';
    }
  }

  // --- Kalkulasi Aliran (Iterative Ford-Fulkerson) ---
  function computeEdgeData() {
    const trace = state.iter[state.currentCondition];
    // kapasitas efektif sama untuk keempat pasangan, diambil dari hasil algoritma
    const kapasitas = trace.pairs[0].effectiveCapacity;
    const edgeMap = {};

    // Inisialisasi semua edge dari topologi
    for (const edge of state.topology.edges) {
      // Kapasitas efektif pada kondisi saat ini (Gasibu Atas menyempit, Singaperbangsa 0 saat pasar)
      const effectiveCap = kapasitas[edge.id] ?? edge.capacity;

      edgeMap[edge.id] = {
        id: edge.id,
        road: edge.road,
        code: edge.code,
        from: edge.from,
        to: edge.to,
        capacity: effectiveCap,
        baseCapacity: edge.capacity,
        isMarket: !!edge.isMarket,
        closedInMorning: !!edge.closedInMorning,
        flow: 0
      };
    }

    // Hitung akumulasi flow berdasarkan pasangan yang dipilih
    let activePairs = [];
    if (state.currentPair === 'all') {
      activePairs = PAIR_KEYS;
    } else {
      const [src, sink] = state.currentPair.split('-');
      activePairs = [{ src, sink }];
    }

    let calculatedMaxFlow = 0;

    for (const p of activePairs) {
      const hasil = trace.pairs.find((x) => x.pairId === `${p.src}-${p.sink}`);
      if (!hasil) continue;

      calculatedMaxFlow += hasil.maxFlow;

      // Ambil step terakhir untuk melihat arus tiap edge
      const finalStep = hasil.steps[hasil.steps.length - 1];
      if (finalStep && finalStep.edgeFlows) {
        for (const [eid, flow] of Object.entries(finalStep.edgeFlows)) {
          const numId = Number(eid);
          if (edgeMap[numId]) {
            edgeMap[numId].flow = Math.round((edgeMap[numId].flow + flow) * 10) / 10;
          }
        }
      }
    }

    return { edgeMap, calculatedMaxFlow: Math.round(calculatedMaxFlow * 10) / 10 };
  }

  // --- Render Visualisasi ---
  function render() {
    const { edgeMap, calculatedMaxFlow } = computeEdgeData();

    // 1. Dapatkan daftar edge yang aktif pada rute yang dipilih
    let activeEdgeIds = null;
    if (state.currentRoute !== 'all') {
      const ruteObj = state.routes.find((r) => r.id === state.currentRoute);
      if (ruteObj) activeEdgeIds = new Set(ruteObj.edgeIds);
    }

    // 2. Update Peta Leaflet
    renderMap(edgeMap, activeEdgeIds);

    // 3. Update Stat Cards
    renderStats(edgeMap, calculatedMaxFlow);

    // 4. Update Tabel Rincian Ruas Jalan
    renderTable(edgeMap, activeEdgeIds);

    // 5. Update Inspector bila ada edge yang sedang dipilih
    if (state.selectedEdgeId != null && edgeMap[state.selectedEdgeId]) {
      inspectEdge(edgeMap[state.selectedEdgeId]);
    }
  }

  // --- Render Garis Ruas di Peta ---
  function renderMap(edgeMap, activeEdgeIds) {
    if (!state.map || !state.geometry) return;

    // Bersihkan layer sebelumnya
    for (const l of Object.values(state.edgeLayers)) state.map.removeLayer(l);
    for (const l of Object.values(state.haloLayers)) state.map.removeLayer(l);
    state.edgeLayers = {};
    state.haloLayers = {};

    const bounds = [];

    for (const [idStr, edge] of Object.entries(edgeMap)) {
      const edgeId = Number(idStr);
      // Lewati edge virtual
      if (edge.from === 0 || edge.to === 27) continue;

      const rawCoords = state.geometry[edgeId];
      if (!rawCoords || rawCoords.length < 2) continue;

      // Leaflet memakai [lat, lon], sedangkan geometry.json adalah [lon, lat]
      const latLngs = rawCoords.map((pt) => [pt[1], pt[0]]);
      latLngs.forEach((pt) => bounds.push(pt));

      const isHighlighted = !activeEdgeIds || activeEdgeIds.has(edgeId);
      const isSelected = state.selectedEdgeId === edgeId;
      const color = getFlowRatioColor(edge.flow, edge.capacity);
      const ratio = edge.capacity > 0 ? edge.flow / edge.capacity : 1;

      // Ketebalan garis proporsional terhadap kapasitas
      const weight = Math.max(3.5, Math.min(9, Math.sqrt(edge.capacity) * 0.18));

      // Layer Halo (Highlight Rute / Seleksi)
      if (isSelected || (activeEdgeIds && isHighlighted)) {
        const halo = L.polyline(latLngs, {
          color: isSelected ? '#151a4f' : '#3b82f6',
          weight: weight + 6,
          opacity: isSelected ? 0.8 : 0.45,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(state.map);
        state.haloLayers[edgeId] = halo;
      }

      // Garis Utama Ruas Jalan dengan Gradasi Warna
      const line = L.polyline(latLngs, {
        color: edge.closedInMorning && state.currentCondition === 'pasar' ? '#94a3b8' : color,
        weight: isSelected ? weight + 2 : weight,
        opacity: isHighlighted ? 0.95 : 0.22,
        dashArray: edge.closedInMorning && state.currentCondition === 'pasar' ? '6, 6' : null,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(state.map);

      // Tooltip Interaktif
      const pct = edge.capacity > 0 ? Math.round(ratio * 100) : 0;
      line.bindTooltip(`
        <div style="font-size:12px; font-family: sans-serif; line-height:1.4;">
          <b>${edge.road}</b><br>
          Arus: <b>${edge.flow.toLocaleString('id-ID')}</b> / ${edge.capacity.toLocaleString('id-ID')} skr/jam (${pct}%)
          ${edge.isMarket ? '<br><span style="color:#ea580c; font-weight:700;">★ Ruas Jl. Gasibu Atas (terdampak pasar)</span>' : ''}
          ${edge.closedInMorning && state.currentCondition === 'pasar' ? '<br><span style="color:#dc2626;">✕ Ditutup Pagi</span>' : ''}
        </div>
      `, { sticky: true });

      // Klik Ruas
      line.on('click', () => {
        state.selectedEdgeId = edgeId;
        render();
        // Scroll ke baris tabel
        const row = $(`#row-edge-${edgeId}`);
        if (row) {
          row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });

      state.edgeLayers[edgeId] = line;
    }
  }

  // --- Render Statistik Atas ---
  function renderStats(edgeMap, calculatedMaxFlow) {
    // 1. Max Flow
    $('#iter-stat-maxflow').textContent = `${calculatedMaxFlow.toLocaleString('id-ID')}`;
    $('#iter-stat-maxflow-sub').textContent = state.currentPair === 'all'
      ? 'total kapasitas keluar jaringan'
      : `arus maksimal ${state.currentPair}`;

    // 2. Total Arus yang Lewat di seluruh ruas
    let totalNetworkFlow = 0;
    let worstEdge = null;
    let maxRatio = -1;

    for (const edge of Object.values(edgeMap)) {
      if (edge.from === 0 || edge.to === 27) continue;
      totalNetworkFlow += edge.flow;

      if (edge.capacity > 0) {
        const r = edge.flow / edge.capacity;
        if (r > maxRatio) {
          maxRatio = r;
          worstEdge = edge;
        }
      }
    }

    $('#iter-stat-totalflow').textContent = `${totalNetworkFlow.toLocaleString('id-ID')} skr`;

    // 3. Bottleneck
    if (worstEdge) {
      const pct = Math.round(maxRatio * 100);
      $('#iter-stat-bottleneck').textContent = worstEdge.road;
      $('#iter-stat-bottleneck-sub').textContent = `Kepenuhan ${pct}% (${worstEdge.flow}/${worstEdge.capacity} skr/jam)`;
    } else {
      $('#iter-stat-bottleneck').textContent = 'Tidak Ada';
      $('#iter-stat-bottleneck-sub').textContent = 'seluruh ruas lancar';
    }

    // 4. Status Pasar
    const gasibu = Object.values(edgeMap).find((e) => e.isMarket);
    const kapGasibu = gasibu ? gasibu.capacity.toLocaleString('id-ID') : '-';
    if (state.currentCondition === 'pasar') {
      $('#iter-stat-market').textContent = `Saat Pasar (α = ${Math.round(state.alphaPasar * 100)}%)`;
      $('#iter-stat-market').style.color = '#c2410c';
      $('#iter-stat-market-sub').textContent = `Gasibu Atas: ${kapGasibu} skr/jam | Singaperbangsa tutup`;
    } else {
      $('#iter-stat-market').textContent = 'Tanpa Pasar (Normal)';
      $('#iter-stat-market').style.color = '#15803d';
      $('#iter-stat-market-sub').textContent = `Gasibu Atas: ${kapGasibu} skr/jam | Semua ruas buka`;
    }
  }

  // --- Render Inspector Panel ---
  function inspectEdge(edge) {
    const badge = getBadgeInfo(edge.flow, edge.capacity);
    const ratio = edge.capacity > 0 ? edge.flow / edge.capacity : 0;
    const pct = Math.min(100, Math.round(ratio * 100));
    const sisa = Math.max(0, edge.capacity - edge.flow);
    const color = getFlowRatioColor(edge.flow, edge.capacity);

    $('#iter-inspect-road').textContent = edge.road;
    $('#iter-inspect-badge').className = `iter-badge ${badge.cls}`;
    $('#iter-inspect-badge').textContent = badge.text;

    $('#iter-inspect-content').innerHTML = `
      <div class="iter-metric-grid">
        <div class="iter-metric-box">
          <span class="iter-metric-label">Total Arus Lewat</span>
          <span class="iter-metric-val" style="color: ${color};">${edge.flow.toLocaleString('id-ID')}</span>
          <span style="font-size:11px; color:#78716c;">skr / jam</span>
        </div>
        <div class="iter-metric-box">
          <span class="iter-metric-label">Kapasitas Efektif</span>
          <span class="iter-metric-val">${edge.capacity.toLocaleString('id-ID')}</span>
          <span style="font-size:11px; color:#78716c;">skr / jam</span>
        </div>
        <div class="iter-metric-box">
          <span class="iter-metric-label">Sisa Kapasitas</span>
          <span class="iter-metric-val">${sisa.toLocaleString('id-ID')}</span>
          <span style="font-size:11px; color:#78716c;">skr/jam tersisa</span>
        </div>
        <div class="iter-metric-box">
          <span class="iter-metric-label">Kepenuhan Ruas</span>
          <span class="iter-metric-val">${pct}%</span>
          <span style="font-size:11px; color:#78716c;">rasio arus / kapasitas</span>
        </div>
        <div class="iter-metric-box span-2">
          <span class="iter-metric-label">Tingkat Utilisasi Ruas</span>
          <div class="iter-meter-wrap">
            <div class="iter-meter-bar">
              <div class="iter-meter-fill" style="width: ${pct}%; background: ${color};"></div>
            </div>
          </div>
        </div>
      </div>
      <div style="margin-top: 10px; font-size: 12px; color: #57534e; line-height: 1.4;">
        <b>Kode Ruas:</b> <code>${edge.code}</code> (ID: ${edge.id})<br>
        ${edge.isMarket ? '<span style="color:#c2410c; font-weight:700;">★ Ruas Jl. Gasibu Atas: kapasitas menyempit saat pasar karena hambatan samping naik.</span><br>' : ''}
        ${edge.closedInMorning ? '<span style="color:#b91c1c; font-weight:600;">✕ Ruas Ditutup Pagi: Kapasitas menjadi 0 saat pasar tumpah pagi hari.</span>' : ''}
      </div>
    `;
  }

  // --- Render Tabel Detail Ruas Jalan ---
  function renderTable(edgeMap, activeEdgeIds) {
    const tbody = $('#iter-table tbody');
    if (!tbody) return;

    const rows = [];
    const edgesList = Object.values(edgeMap)
      .filter((e) => e.from !== 0 && e.to !== 27) // bukan virtual
      .filter((e) => !activeEdgeIds || activeEdgeIds.has(e.id)) // filter rute bila ada
      .sort((a, b) => {
        // Urutkan dari kepenuhan tertinggi
        const ra = a.capacity > 0 ? a.flow / a.capacity : -1;
        const rb = b.capacity > 0 ? b.flow / b.capacity : -1;
        return rb - ra;
      });

    for (const edge of edgesList) {
      const isSelected = state.selectedEdgeId === edge.id;
      const ratio = edge.capacity > 0 ? edge.flow / edge.capacity : 0;
      const pct = Math.min(100, Math.round(ratio * 100));
      const sisa = Math.max(0, edge.capacity - edge.flow);
      const color = getFlowRatioColor(edge.flow, edge.capacity);
      const badge = getBadgeInfo(edge.flow, edge.capacity);

      rows.push(`
        <tr id="row-edge-${edge.id}" class="${isSelected ? 'terpilih' : ''}" data-id="${edge.id}">
          <td>
            <b>${edge.road}</b>
            ${edge.isMarket ? '<span style="color:#ea580c; font-weight:700; font-size:11px;"> [terdampak pasar]</span>' : ''}
          </td>
          <td><code style="font-size:11.5px;">${edge.code}</code></td>
          <td style="font-family: var(--mono); font-weight:700; color: ${color};">
            ${edge.flow.toLocaleString('id-ID')}
          </td>
          <td style="font-family: var(--mono);">${edge.capacity.toLocaleString('id-ID')}</td>
          <td style="font-family: var(--mono);">${sisa.toLocaleString('id-ID')}</td>
          <td>
            <div class="iter-bar-mini"><span style="width: ${pct}%; background: ${color};"></span></div>
            <span style="font-family: var(--mono); font-size:12px;">${pct}%</span>
          </td>
          <td><span class="iter-badge ${badge.cls}">${badge.text}</span></td>
        </tr>
      `);
    }

    tbody.innerHTML = rows.join('');

    // Pasang listener klik baris tabel
    $$('#iter-table tbody tr').forEach((tr) => {
      tr.addEventListener('click', () => {
        const edgeId = Number(tr.dataset.id);
        state.selectedEdgeId = edgeId;
        render();
      });
    });
  }

  // Jalankan saat script dimuat atau DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
