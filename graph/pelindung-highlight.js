/**
 * ============================================================================
 * SCRIPT HIGHLIGHT PINPOINT CCTV MAX-FLOW (PELINDUNG BANDUNG)
 * Cara Pakai:
 * 1. Buka https://pelindung.bandung.go.id/ di browser
 * 2. Klik kanan -> Inspect -> buka tab Console
 * 3. Copy-paste seluruh isi file ini ke Console lalu tekan Enter
 * ============================================================================
 */
(function () {
  const PELINDUNG_MAXFLOW_TARGETS = [
    // 1. S1: Turun Pasupati / Jl. Tamansari Utara
    { id: '2d057f0b-0112-4b43-bcdb-b505fec825f4', name: 'CCTV ITB KEBUN BINATANG 03', node: 'S1', role: 'Inflow S1 (Tamansari Utara)', lat: -6.893909, lng: 107.608646 },

    // 2. V_Cikapayang: Simpang Turun Flyover Pasupati - Tamansari - Cikapayang
    { id: '1c9d4ce8-8cde-42b9-8abb-60d265a12c66', name: 'TAMAN PASUPATI_01', node: 'V_Cikapayang', role: 'Percabangan S1 -> Cikapayang (P3) & Sulanjana (P4)', lat: -6.897761, lng: 107.609868 },

    // 3. V_Sulanjana: Simpang Tamansari - Jl. Sulanjana
    { id: 'b0687763-001b-4087-b236-c4ac1ba71d92', name: 'CCTV TAMAN SARI - WS 01', node: 'V_Sulanjana', role: 'Aliran P4 masuk Jl. Sulanjana', lat: -6.900525, lng: 107.609357 },

    // 4. S2: Jl. Dipatiukur (Unpad - Sekeloa)
    { id: '8915bf0d-106e-48a6-bb3c-93919e2eef32', name: 'CCTV DIPATIUKUR SEKELOA 01', node: 'S2', role: 'Inflow Utama S2 (Jl. Dipatiukur)', lat: -6.892916, lng: 107.618313 },

    // 5. V_Djuanda_Hasanuddin: Simpang Jl. Hasanuddin - Jl. Ir. H. Djuanda (Dago SMAN 1)
    { id: '12ec8572-6954-4997-813a-9e39e9c265f9', name: 'CCTV DAGO 2-SMA 1 01', node: 'V_Djuanda_Hasanuddin', role: 'Aliran P2 keluar Hasanuddin -> Dago', lat: -6.894972, lng: 107.612795 },

    // 6. V_DU_Selatan: Simpang Dago - Cikapayang - Dipatiukur Selatan
    { id: '52fe5caa-9b77-41fa-8248-fce66d5b71bc', name: 'CCTV DAGO 1-CIKAPAYANG 01', node: 'V_DU_Selatan', role: 'Aliran P3 masuk Dipatiukur & P2 lurus Dago', lat: -6.899000, lng: 107.612643 },

    // 7. V_Djuanda_Diponegoro: Simpang Dago - Sulanjana - Jl. Diponegoro
    { id: '37528553-e8fc-4cdc-805a-140713f303d4', name: 'SP SULANJANA', node: 'V_Djuanda_Diponegoro', role: 'Titik Temu P2 (Dago) + P4 (Sulanjana) -> Diponegoro', lat: -6.900167, lng: 107.612457 },

    // 8. V_Surapati_Merak: Simpang Jl. Merak - Jl. Surapati (Gasibu / Telkom)
    { id: '501f4c5c-e894-4c58-9c38-8dbf88964a06', name: 'CCTV GASIBU_01', node: 'V_Surapati_Merak', role: 'Aliran P1 keluar Jl. Merak -> Jl. Surapati', lat: -6.899248, lng: 107.619846 },

    // 9. V_Cisangkuy: Koridor Belakang Gedung Sate (Taman Lansia / Cisangkuy)
    { id: '4d000111-f853-4b53-a72c-8d196cea25f2', name: 'TAMAN LANSIA', node: 'V_Cisangkuy', role: 'Aliran P4 melintasi Jl. Cisangkuy', lat: -6.902141, lng: 107.620938 },

    // 10. T1: Sink PUSDAI (Jl. Surapati Timur)
    { id: 'e46b2d97-e032-470c-96d3-97f68171bdda', name: 'CCTV PHH MUSTOFA-PUSDAI 01', node: 'T1', role: 'Outflow Sink T1 (PUSDAI / Surapati Timur)', lat: -6.899439, lng: 107.627107 }
  ];

  const MAROON_PIN_FILTER =
    'brightness(0) saturate(100%) invert(11%) sepia(86%) saturate(4648%) hue-rotate(346deg) brightness(88%) contrast(110%)';

  function injectHighlightStyles(doc) {
    if (!doc.head) return;
    const styleEl = doc.createElement('style');
    styleEl.id = 'maxflow-pelindung-style';
    styleEl.textContent = `
      img.leaflet-marker-icon.maxflow-maroon-pin,
      img.leaflet-marker-icon.maxflow-red-pin {
        filter: ${MAROON_PIN_FILTER} !important;
        z-index: 9999 !important;
      }
      .leaflet-tooltip.maxflow-node-badge {
        background: #800000 !important;
        color: #ffffff !important;
        border: 1px solid #5a0000 !important;
        border-radius: 6px !important;
        padding: 2px 7px !important;
        font-size: 11px !important;
        font-weight: 800 !important;
        box-shadow: none !important;
      }
    `;
    doc.head.appendChild(styleEl);
  }

  function findPelindungReactComponent(doc) {
    const mapsEl = doc.querySelector('.maps') || doc.getElementById('root');
    if (!mapsEl) return null;
    const fiberKey = Object.keys(mapsEl).find(
      (k) => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$') || k.startsWith('__reactContainer$')
    );
    if (!fiberKey) return null;

    let curr = mapsEl[fiberKey];
    const visited = new Set();
    while (curr && !visited.has(curr)) {
      visited.add(curr);
      if (curr.stateNode && curr.stateNode.markerRefs && curr.stateNode.state?.items) {
        return curr.stateNode;
      }
      curr = curr.return || curr.child;
    }
    return null;
  }

  function highlightPelindungMaxFlow(doc = document) {
    injectHighlightStyles(doc);

    const byId = new Map(PELINDUNG_MAXFLOW_TARGETS.map((t) => [t.id, t]));
    const byName = new Map(PELINDUNG_MAXFLOW_TARGETS.map((t) => [t.name.trim().toUpperCase(), t]));

    const comp = findPelindungReactComponent(doc);
    let highlightedPins = 0;

    if (comp && comp.markerRefs) {
      const items = comp.state?.items || [];
      items.forEach((item) => {
        const marker = comp.markerRefs[item.id];
        const icon = marker?._icon;
        if (!icon) return;

        const target = byId.get(item.id) || byName.get((item.cctv_name || '').trim().toUpperCase());
        if (target) {
          icon.style.filter = MAROON_PIN_FILTER;
          icon.style.opacity = '1';
          icon.style.zIndex = '9999';
          icon.classList.add('maxflow-maroon-pin', 'maxflow-red-pin');
          icon.setAttribute('title', `[${target.node}] ${target.name} — ${target.role}`);
          if (typeof marker.setZIndexOffset === 'function') {
            marker.setZIndexOffset(5000);
          }
          if (typeof marker.bindTooltip === 'function') {
            marker.bindTooltip(`[${target.node}] ${target.name}`, {
              permanent: true,
              direction: 'top',
              offset: [-3, -78],
              className: 'maxflow-node-badge'
            });
          }
          highlightedPins++;
        } else {
          icon.style.opacity = '0.25';
          icon.style.filter = 'grayscale(85%)';
        }
      });
    }

    // Highlight dan pindahkan tepat 10 item CCTV target ke urutan teratas pada sidebar kiri web Pelindung
    const listItems = Array.from(doc.querySelectorAll('ul.list-group li.list-group-item'));
    let highlightedList = 0;
    listItems.reverse().forEach((li) => {
      const rawText = (li.textContent || '').replace(/^🔴\s*\[[^\]]+\]\s*/, '').trim().toUpperCase();
      const matchedTarget = PELINDUNG_MAXFLOW_TARGETS.find(
        (t) => rawText === t.name.trim().toUpperCase()
      );
      if (matchedTarget) {
        li.style.backgroundColor = '#660000';
        li.style.color = '#ffffff';
        li.style.fontWeight = '700';
        li.style.borderLeft = '6px solid #800000';
        li.style.boxShadow = 'none';
        if (!li.textContent.includes(`[${matchedTarget.node}]`)) {
          li.textContent = `🔴 [${matchedTarget.node}] ${li.textContent.trim()}`;
        }
        if (li.parentElement && typeof li.parentElement.prepend === 'function') {
          li.parentElement.prepend(li);
        }
        highlightedList++;
      } else {
        li.style.opacity = '0.45';
      }
    });

    console.log(
      `✅ [Max-Flow Pelindung Highlighter] Berhasil mewarnai tepat ${highlightedPins} pinpoint peta & ${highlightedList} item daftar CCTV menjadi MAROON (1-to-1 dengan 10 titik rute graf)!`
    );
    console.table(
      PELINDUNG_MAXFLOW_TARGETS.map((t) => ({
        Simpul: t.node,
        Nama_CCTV: t.name,
        Fungsi_Hitung_Flow: t.role,
        Koordinat: `${t.lat}, ${t.lng}`
      }))
    );

    return { highlightedPins, highlightedList, targets: PELINDUNG_MAXFLOW_TARGETS };
  }

  if (typeof window !== 'undefined') {
    window.PELINDUNG_MAXFLOW_TARGETS = PELINDUNG_MAXFLOW_TARGETS;
    window.highlightPelindungMaxFlow = highlightPelindungMaxFlow;
    if (typeof document !== 'undefined') {
      highlightPelindungMaxFlow(document);
    }
  }
})();
