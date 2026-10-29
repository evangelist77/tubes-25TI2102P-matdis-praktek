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
    { id: 'b1deaffc-fa23-41d6-a49f-e3405ffcf0de', name: 'CCTV ITB KEBUN BINATANG 01', node: 'S1', role: 'Inflow S1 (Tamansari Utara)', lat: -6.8939091, lng: 107.608446 },
    { id: '8b16cbe4-6d28-49c4-b6e1-f89101e4da57', name: 'CCTV ITB KEBUN BINATANG 02', node: 'S1', role: 'Inflow S1 (Tamansari Utara)', lat: -6.8939091, lng: 107.609546 },
    { id: '2d057f0b-0112-4b43-bcdb-b505fec825f4', name: 'CCTV ITB KEBUN BINATANG 03', node: 'S1', role: 'Inflow S1 (Tamansari Utara)', lat: -6.893909, lng: 107.608646 },

    // 2. V_Cikapayang: Simpang Turun Flyover Pasupati - Tamansari - Cikapayang
    { id: '1c9d4ce8-8cde-42b9-8abb-60d265a12c66', name: 'TAMAN PASUPATI_01', node: 'V_Cikapayang', role: 'Percabangan S1 -> Cikapayang (P3) & Sulanjana (P4)', lat: -6.897761, lng: 107.609868 },
    { id: '30231922-948b-4a12-a1ab-e1bcd4fe054e', name: 'TAMAN PASUPATI_02', node: 'V_Cikapayang', role: 'Percabangan S1 -> Cikapayang (P3) & Sulanjana (P4)', lat: -6.897761, lng: 107.609868 },
    { id: '76cb84de-758c-44b7-a5c2-a680f7776e04', name: 'TAMAN SKETPARK_01', node: 'V_Cikapayang', role: 'Simpang Tamansari - Cikapayang', lat: -6.898114, lng: 107.609165 },
    { id: '65bcb0ea-dfc9-469a-a33c-600131ab7dc3', name: 'TAMAN SKETPARK_03', node: 'V_Cikapayang', role: 'Simpang Tamansari - Cikapayang', lat: -6.898114, lng: 107.609165 },

    // 3. V_Sulanjana: Simpang Tamansari - Jl. Sulanjana
    { id: 'b0687763-001b-4087-b236-c4ac1ba71d92', name: 'CCTV TAMAN SARI - WS 01', node: 'V_Sulanjana', role: 'Aliran P4 masuk Jl. Sulanjana', lat: -6.900525, lng: 107.609357 },
    { id: '0d36f0f7-7c08-4792-9279-baea8021b6d9', name: 'CCTV TAMAN SARI - WS 02', node: 'V_Sulanjana', role: 'Aliran P4 masuk Jl. Sulanjana', lat: -6.900525, lng: 107.608358 },

    // 4. S2: Jl. Dipatiukur (Unpad - Sekeloa)
    { id: '8915bf0d-106e-48a6-bb3c-93919e2eef32', name: 'CCTV DIPATIUKUR SEKELOA 01', node: 'S2', role: 'Inflow Utama S2 (Jl. Dipatiukur)', lat: -6.892916163, lng: 107.6183134 },
    { id: 'a45f328c-04d4-47ca-bdab-f7347d27ad93', name: 'CCTV DIPATIUKUR SEKELOA 02', node: 'S2', role: 'Inflow Utama S2 (Jl. Dipatiukur)', lat: -6.892916163, lng: 107.6183134 },

    // 5. V_Djuanda_Hasanuddin: Simpang Jl. Hasanuddin - Jl. Ir. H. Djuanda (Dago SMAN 1)
    { id: '12ec8572-6954-4997-813a-9e39e9c265f9', name: 'CCTV DAGO 2-SMA 1 01', node: 'V_Djuanda_Hasanuddin', role: 'Aliran P2 keluar Hasanuddin -> Dago', lat: -6.894971581, lng: 107.6127949 },
    { id: '12203183-2195-4007-a71b-59704c988d61', name: 'CCTV DAGO 2-SMA 1 02', node: 'V_Djuanda_Hasanuddin', role: 'Aliran P2 keluar Hasanuddin -> Dago', lat: -6.894971581, lng: 107.6127949 },

    // 6. V_DU_Selatan: Simpang Dago - Cikapayang - Dipatiukur Selatan
    { id: '52fe5caa-9b77-41fa-8248-fce66d5b71bc', name: 'CCTV DAGO 1-CIKAPAYANG 01', node: 'V_DU_Selatan', role: 'Aliran P3 masuk Dipatiukur & P2 lurus Dago', lat: -6.899000105, lng: 107.6126426 },
    { id: '92cacc17-dad2-45c5-b35e-91e87a040399', name: 'TM CIKAPAYANG DAGO_04', node: 'V_DU_Selatan', role: 'Simpang Cikapayang - Dipatiukur', lat: -6.898777, lng: 107.612446 },

    // 7. V_Djuanda_Diponegoro: Simpang Dago - Sulanjana - Jl. Diponegoro
    { id: '37528553-e8fc-4cdc-805a-140713f303d4', name: 'SP SULANJANA', node: 'V_Djuanda_Diponegoro', role: 'Titik Temu P2 (Dago) + P4 (Sulanjana) -> Diponegoro', lat: -6.900167, lng: 107.612457 },

    // 8. V_Surapati_Merak: Simpang Jl. Merak - Jl. Surapati (Gasibu / Telkom)
    { id: '501f4c5c-e894-4c58-9c38-8dbf88964a06', name: 'CCTV GASIBU_01', node: 'V_Surapati_Merak', role: 'Aliran P1 keluar Jl. Merak -> Jl. Surapati', lat: -6.899248, lng: 107.619846 },
    { id: '31dd82a1-7061-4201-b8f7-eded43648451', name: 'CCTV GASIBU_02', node: 'V_Surapati_Merak', role: 'Aliran Jl. Surapati depan Gasibu', lat: -6.899248, lng: 107.619440 },
    { id: '7fb5b08b-0349-4b03-89c2-2b5a3c976628', name: 'SP TELKOM - Gasibu', node: 'V_Surapati_Merak', role: 'Simpang Surapati - Telkom / Merak', lat: -6.899245, lng: 107.619040 },

    // 9. V_Cisangkuy & V_Citarum: Koridor Taman Lansia & Pustaka Bunga (Cisangkuy / Citarum)
    { id: '4d000111-f853-4b53-a72c-8d196cea25f2', name: 'TAMAN LANSIA', node: 'V_Cisangkuy', role: 'Aliran P4 melintasi Jl. Cisangkuy', lat: -6.902141, lng: 107.620938 },
    { id: '9e56d7ca-5baa-4754-b024-d4288c5af69f', name: 'Taman Pustaka Bunga_03', node: 'V_Citarum', role: 'Pertemuan Jl. Cisangkuy & Jl. Citarum', lat: -6.9032133, lng: 107.6225588 },

    // 10. T1 & T2: Sink PUSDAI (Jl. Surapati Timur & Jl. Diponegoro Timur)
    { id: 'e46b2d97-e032-470c-96d3-97f68171bdda', name: 'CCTV PHH MUSTOFA-PUSDAI 01', node: 'T1', role: 'Outflow Sink T1 (PUSDAI / Surapati Timur)', lat: -6.8994392, lng: 107.6271074 },
    { id: '01de6eea-5935-47a4-8e72-f28de08639ff', name: 'CCTV PHH MUSTOFA-PUSDAI 02', node: 'T1', role: 'Outflow Sink T1 (PUSDAI / Surapati Timur)', lat: -6.8994392, lng: 107.6271074 },
    { id: '61818785-552f-48c1-8605-89ea9b25a514', name: 'CCTV PUSDAI 01', node: 'T2', role: 'Outflow Sink T2 (Jl. Diponegoro Timur)', lat: -6.901174, lng: 107.625363 },
    { id: '57215230-6f3b-4a50-8f6d-c0f065d92844', name: 'CCTV PUSDAI 02', node: 'T2', role: 'Outflow Sink T2 (Jl. Diponegoro Timur)', lat: -6.901174, lng: 107.626364 }
  ];

  const RED_PIN_FILTER =
    'brightness(0) saturate(100%) invert(16%) sepia(99%) saturate(7404%) hue-rotate(357deg) brightness(98%) contrast(118%) drop-shadow(0 0 8px #ff0000) drop-shadow(0 0 16px rgba(255, 0, 0, 0.95))';

  function injectHighlightStyles(doc) {
    if (!doc.head) return;
    const styleEl = doc.createElement('style');
    styleEl.id = 'maxflow-pelindung-style';
    styleEl.textContent = `
      @keyframes maxflowPulseRed {
        0%, 100% {
          filter: ${RED_PIN_FILTER};
        }
        50% {
          filter: brightness(0) saturate(100%) invert(21%) sepia(99%) saturate(7404%) hue-rotate(357deg) brightness(110%) contrast(120%) drop-shadow(0 0 14px #ff0000) drop-shadow(0 0 26px #ff1111);
        }
      }
      img.leaflet-marker-icon.maxflow-red-pin {
        filter: ${RED_PIN_FILTER} !important;
        animation: maxflowPulseRed 1.6s infinite ease-in-out !important;
        z-index: 9999 !important;
      }
      .leaflet-tooltip.maxflow-node-badge {
        background: #b91c1c !important;
        color: #ffffff !important;
        border: 2px solid #fecaca !important;
        border-radius: 6px !important;
        padding: 2px 7px !important;
        font-size: 11px !important;
        font-weight: 800 !important;
        box-shadow: 0 3px 10px rgba(220, 38, 38, 0.85) !important;
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
          icon.style.filter = RED_PIN_FILTER;
          icon.style.opacity = '1';
          icon.style.zIndex = '9999';
          icon.classList.add('maxflow-red-pin');
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

    // Highlight dan pindahkan item CCTV target ke urutan teratas pada sidebar kiri web Pelindung
    const listItems = Array.from(doc.querySelectorAll('ul.list-group li.list-group-item'));
    let highlightedList = 0;
    listItems.reverse().forEach((li) => {
      const rawText = (li.textContent || '').trim().toUpperCase();
      const matchedTarget = PELINDUNG_MAXFLOW_TARGETS.find((t) => rawText === t.name.trim().toUpperCase() || rawText.includes(t.name.trim().toUpperCase()));
      if (matchedTarget) {
        li.style.backgroundColor = '#7f1d1d';
        li.style.color = '#ffffff';
        li.style.fontWeight = '700';
        li.style.borderLeft = '6px solid #ef4444';
        li.style.boxShadow = '0 0 12px rgba(239, 68, 68, 0.75)';
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
      `✅ [Max-Flow Pelindung Highlighter] Berhasil mewarnai ${highlightedPins} pinpoint peta & ${highlightedList} item daftar CCTV menjadi MERAH!`
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
