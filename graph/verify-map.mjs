import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const htmlPath = new URL('./index.html', import.meta.url);
assert.ok(fs.existsSync(htmlPath), 'index.html harus ada');

const html = fs.readFileSync(htmlPath, 'utf8');

// Pastikan Leaflet, animasi CSS flowDash, meta referrer, dan kontainer utama tersedia
assert.match(html, /leaflet\.css/, 'Harus memuat stylesheet Leaflet');
assert.match(
  html,
  /<meta\s+name="referrer"\s+content="origin-when-cross-origin"\s*\/?>/,
  'Harus memiliki <meta name="referrer" content="origin-when-cross-origin">'
);
assert.match(html, /@keyframes\s+flowDash/, 'Harus memiliki animasi @keyframes flowDash');
assert.match(html, /id="map"/, 'Harus memiliki elemen #map');
assert.match(html, /id="path-list"/, 'Harus memiliki daftar jalur #path-list');
assert.match(html, /id="path-detail"/, 'Harus memiliki panel detail #path-detail');
assert.match(html, /id="slider-map-opacity"/, 'Harus memiliki input #slider-map-opacity');
assert.match(html, /id="label-map-opacity"/, 'Harus memiliki label persentase #label-map-opacity');

let capturedTileUrl = '';
let capturedTileOpts = null;

// Ekstrak script utama dan jalankan dalam sandbox dengan stub Leaflet untuk menguji GRAPH_DATA dan interaksi
const match = html.match(/<script id="app-script">([\s\S]*?)<\/script>/);
assert.ok(match, 'Harus memiliki <script id="app-script">');

const sandbox = {
  window: {},
  document: {
    getElementById: () => ({ innerHTML: '', addEventListener: () => {}, classList: { add: () => {}, remove: () => {}, toggle: () => {} } }),
    querySelectorAll: () => []
  },
  L: {
    map: () => ({
      setView: () => ({}),
      fitBounds: () => ({}),
      on: () => ({})
    }),
    tileLayer: (url, opts) => {
      capturedTileUrl = url;
      capturedTileOpts = opts;
      let opacity = opts?.opacity ?? 1;
      const layer = {
        addTo: () => layer,
        setOpacity: (val) => {
          opacity = val;
        },
        options: {
          get opacity() {
            return opacity;
          }
        }
      };
      return layer;
    },
    polyline: () => {
      const p = {
        addTo: () => p,
        on: () => p,
        bindTooltip: () => p,
        setStyle: () => p,
        bringToFront: () => p,
        getBounds: () => ({})
      };
      return p;
    },
    circleMarker: () => {
      const c = {
        addTo: () => c,
        on: () => c,
        bindTooltip: () => c,
        setStyle: () => c,
        bringToFront: () => c
      };
      return c;
    },
    marker: () => {
      const m = {
        addTo: () => m,
        bindTooltip: () => m,
        setOpacity: () => m
      };
      return m;
    },
    divIcon: (opts) => opts,
    featureGroup: () => ({
      getBounds: () => ({ pad: () => ({}) })
    })
  }
};

vm.createContext(sandbox);
vm.runInContext(match[1], sandbox);

const rawGraphData = sandbox.window.GRAPH_DATA;
assert.ok(rawGraphData, 'window.GRAPH_DATA harus terdefinisi');
const GRAPH_DATA = JSON.parse(JSON.stringify(rawGraphData));

// 1. Cek simpul utama S1, S2, T1, T2
for (const key of ['S1', 'S2', 'T1', 'T2']) {
  assert.ok(GRAPH_DATA.nodes[key], `Node utama ${key} harus ada`);
  assert.equal(typeof GRAPH_DATA.nodes[key].lat, 'number');
  assert.equal(typeof GRAPH_DATA.nodes[key].lng, 'number');
}

// 2. Cek ke-4 jalur sesuai 4 file .txt
assert.equal(GRAPH_DATA.paths.length, 4, 'Harus terdapat tepat 4 path');

const expectedIds = ['S1-T1', 'S1-T2', 'S2-T1', 'S2-T2'];
assert.deepEqual(GRAPH_DATA.paths.map((p) => p.id), expectedIds);

const expectedStreets = {
  'S2-T1': ['Jalan Dipati Ukur', 'Belok Kanan Jl. Singaperbangsa', 'Jl. Titiran', 'Jl. Merak', 'Jl. Surapati', 'PUSDAI'],
  'S2-T2': ['Jalan Dipati Ukur', 'Jl. Hasanuddin', 'Jl. Ir H Djuanda', 'Jl. Diponegoro', 'Jl. Aria Jipang', 'Jl. Cilamaya', 'Jl. Cimandiri', 'Jl. Cisanggarung', 'Jl. Citarum', 'Jl. Diponegoro Timur'],
  'S1-T1': ['Turun Pasupati/Jl. Tamansari', 'Jl. Dipatiukur', 'Jl. Singaperbangsa', 'Jl. Titiran', 'Jl. Tikukur', 'Jl. Gagak', 'PUSDAI/Surapati Timur'],
  'S1-T2': ['Turun Pasupati/Jl. Tamansari', 'Jl. Sulanjana', 'Jl. Aria Jipang', 'Jl. Cilamaya', 'Jl. Cimandiri', 'Jl. Cisanggarung', 'Jl. Cisangkuy', 'Jl. Diponegoro Timur/Pusdai']
};

for (const path of GRAPH_DATA.paths) {
  assert.deepEqual(
    path.streets,
    expectedStreets[path.id],
    `Urutan jalan pada ${path.id} harus sama persis dengan file .txt`
  );
  assert.ok(path.nodeIds.length >= 5, `Path ${path.id} harus melewati simpul-simpul persimpangan`);
  for (const nodeId of path.nodeIds) {
    assert.ok(GRAPH_DATA.nodes[nodeId], `Node ${nodeId} pada path ${path.id} harus terdaftar di GRAPH_DATA.nodes`);
  }
  assert.ok(path.coords.length >= 15, `Path ${path.id} harus memiliki koordinat polyline jalan OSM yang detail`);
}

// 3. Cek fungsi seleksi path interaktif
assert.equal(typeof sandbox.window.selectPath, 'function', 'window.selectPath harus tersedia untuk interaksi klik');
sandbox.window.selectPath('S2-T1');
assert.equal(sandbox.window.getActivePathId(), 'S2-T1', 'selectPath("S2-T1") harus mengubah activePathId menjadi S2-T1');
sandbox.window.selectPath(null);
assert.equal(sandbox.window.getActivePathId(), null, 'selectPath(null) harus mereset tampilan ke semua jalur');
// 4. Cek konfigurasi tileLayer OSM & referrerPolicy
assert.equal(
  capturedTileUrl,
  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  'Harus menggunakan URL tile resmi OpenStreetMap'
);
assert.equal(
  capturedTileOpts?.referrerPolicy,
  'origin-when-cross-origin',
  'L.tileLayer harus menyertakan referrerPolicy: "origin-when-cross-origin"'
);

// 5. Cek server HTTP lokal (serve.mjs) mengirimkan header Referrer-Policy dan menyajikan index.html
const { createGraphServer } = await import('./serve.mjs');
const server = createGraphServer();
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();

try {
  const res = await fetch(`http://127.0.0.1:${port}/`);
  assert.equal(res.status, 200, 'GET / pada serve.mjs harus mengembalikan HTTP 200');
  assert.equal(
    res.headers.get('referrer-policy'),
    'origin-when-cross-origin',
    'Response header harus menyertakan Referrer-Policy: origin-when-cross-origin'
  );
  assert.match(
    res.headers.get('content-type') || '',
    /text\/html/,
    'Response Content-Type harus text/html'
  );
  const body = await res.text();
  assert.ok(body.includes('window.GRAPH_DATA'), 'Body HTTP harus memuat isi index.html');
} finally {
  await new Promise((resolve) => server.close(resolve));
}

// 6. Cek dokumen spesifikasi graf untuk LLM (GRAPH_SPEC_LLM.md)
const specPath = new URL('./GRAPH_SPEC_LLM.md', import.meta.url);
assert.ok(fs.existsSync(specPath), 'GRAPH_SPEC_LLM.md harus ada');

const specContent = fs.readFileSync(specPath, 'utf8');

// Memastikan memuat identitas kasus & masalah Tubes
assert.match(specContent, /Kasus 4:\s*Pasar Tumpah/i, 'Harus memuat informasi Kasus 4 Pasar Tumpah');
assert.match(specContent, /Maximum Flow|Network Flow/i, 'Harus memuat konteks Maximum Flow');

// Memastikan memuat simpul terminal S1, S2, T1, T2 beserta koordinat
for (const term of ['S1', 'S2', 'T1', 'T2']) {
  assert.ok(specContent.includes(term), `Dokumen LLM harus mendefinisikan simpul ${term}`);
}

// Memastikan memuat ke-4 rute beserta urutan jalannya
for (const path of GRAPH_DATA.paths) {
  assert.ok(specContent.includes(path.id), `Dokumen LLM harus memuat rute ${path.id}`);
  for (const st of path.streets) {
    assert.ok(specContent.includes(st), `Dokumen LLM harus mencantumkan jalan '${st}' pada ${path.id}`);
  }
}

// Memastikan memuat diagram Mermaid dan bagian Shared Edges / Bottleneck
assert.match(specContent, /```mermaid[\s\S]*?flowchart/i, 'Harus memiliki diagram Mermaid flowchart');
assert.match(specContent, /Shared Edges|Ruas Bersama|Bottleneck/i, 'Harus memiliki analisis shared edges untuk Max-Flow');
assert.match(specContent, /Prompt Template/i, 'Harus menyediakan template prompt siap pakai untuk LLM');

// 8. Cek kelengkapan data lebar jalan OSM pada GRAPH_SPEC_LLM.md
assert.match(specContent, /Lebar Jalan/i, 'Dokumen LLM harus memuat kolom data Lebar Jalan');
assert.match(specContent, /Jumlah Lajur|Lajur/i, 'Dokumen LLM harus memuat informasi jumlah lajur');
assert.match(specContent, /Tipe Jalan OSM|Klasifikasi OSM/i, 'Dokumen LLM harus memuat klasifikasi highway OSM');
assert.match(specContent, /Jl\. Titiran[\s\S]*?3\s*meter/i, 'Dokumen LLM harus mencatat lebar Jl. Titiran sebesar 3 meter sesuai OSM');
assert.match(specContent, /Jl\. Merak[\s\S]*?4\s*meter/i, 'Dokumen LLM harus mencatat lebar Jl. Merak sebesar 4 meter sesuai OSM');
assert.match(specContent, /Jl\. Surapati[\s\S]*?3\s*lajur/i, 'Dokumen LLM harus mencatat Jl. Surapati memiliki 3 lajur trunk');
assert.match(specContent, /Jl\. Diponegoro[\s\S]*?4\s*lajur/i, 'Dokumen LLM harus mencatat Jl. Diponegoro memiliki 4 lajur primary');

// 7. Cek fungsi pengatur transparansi peta (setMapOpacity & getMapOpacity)
assert.equal(typeof sandbox.window.setMapOpacity, 'function', 'window.setMapOpacity harus tersedia');
assert.equal(typeof sandbox.window.getMapOpacity, 'function', 'window.getMapOpacity harus tersedia');

sandbox.window.setMapOpacity(0.5);
assert.equal(sandbox.window.getMapOpacity(), 0.5, 'setMapOpacity(0.5) harus mengubah opacity tileLayer ke 0.5');

sandbox.window.setMapOpacity(1.0);
assert.equal(sandbox.window.getMapOpacity(), 1.0, 'setMapOpacity(1.0) harus mengembalikan opacity tileLayer ke 1.0');

// 9. Cek struktur data ruas jalan satuan (GRAPH_DATA.segments) dan interaktivitasnya
const { segments } = GRAPH_DATA;
assert.ok(Array.isArray(segments), 'GRAPH_DATA.segments harus berupa array');
assert.ok(segments.length >= 18, 'Harus terdapat minimal 18 ruas jalan satuan');

for (const seg of segments) {
  assert.ok(seg.id, 'Setiap segmen harus memiliki id');
  assert.ok(seg.name, 'Setiap segmen harus memiliki nama jalan');
  assert.ok(seg.fromNode && GRAPH_DATA.nodes[seg.fromNode], `Simpul asal ${seg.fromNode} harus valid`);
  assert.ok(seg.toNode && GRAPH_DATA.nodes[seg.toNode], `Simpul tujuan ${seg.toNode} harus valid`);
  assert.ok(typeof seg.widthInfo === 'string', 'Setiap segmen harus memiliki info lebar jalan');
  assert.ok(seg.coords.length >= 2, 'Setiap segmen harus memiliki minimal 2 titik koordinat');
}

assert.match(html, /segment-tooltip/, 'Harus memiliki kelas CSS .segment-tooltip');
assert.match(html, /segment-patch/, 'Harus memiliki kelas CSS .segment-patch');

// 10. Cek script Console pelindung-highlight.js untuk web pelindung.bandung.go.id
const highlightScriptPath = new URL('./pelindung-highlight.js', import.meta.url);
assert.ok(fs.existsSync(highlightScriptPath), 'File pelindung-highlight.js harus ada');

const highlightCode = fs.readFileSync(highlightScriptPath, 'utf8');
assert.ok(!highlightCode.includes('drop-shadow'), 'Script tidak boleh menggunakan filter drop-shadow/glow');
assert.match(highlightCode, /invert|hue-rotate/i, 'Script harus menggunakan filter CSS pewarnaan maroon/merah tua');
assert.match(highlightCode, /CCTV DIPATIUKUR SEKELOA 01/, 'Script harus memuat target CCTV DIPATIUKUR SEKELOA 01');
assert.match(highlightCode, /SP SULANJANA/, 'Script harus memuat target SP SULANJANA');

// Jalankan pelindung-highlight.js pada mock DOM pelindung.bandung.go.id
const mockMarkerIconTarget = { style: {}, classList: { add: () => {} }, setAttribute: () => {}, parentElement: { appendChild: () => {} } };
const mockMarkerIconOther = { style: {}, classList: { add: () => {} }, setAttribute: () => {} };
const mockListItemTarget = {
  textContent: ' CCTV DIPATIUKUR SEKELOA 01',
  style: {},
  classList: { add: () => {} },
  parentElement: { prepend: () => {} }
};
const mockListItemOther = {
  textContent: ' CCTV BATAS KOTA 01',
  style: {},
  classList: { add: () => {} }
};

const pelindungSandbox = {
  window: {},
  console: { log: () => {}, table: () => {}, warn: () => {} },
  document: {
    head: { appendChild: () => {} },
    createElement: () => ({ id: '', textContent: '', style: {}, className: '' }),
    getElementById: () => null,
    querySelector: (sel) => {
      if (sel === '.maps') {
        return {
          __reactFiber$mock: {
            return: {
              stateNode: {
                state: {
                  items: [
                    { id: '8915bf0d-106e-48a6-bb3c-93919e2eef32', cctv_name: 'CCTV DIPATIUKUR SEKELOA 01', lat: '-6.892916163', lng: '107.6183134' },
                    { id: '48a4d270-9db2-4111-b94e-d026129b2802', cctv_name: 'CCTV BATAS KOTA 01', lat: '-6.910573', lng: '107.569273' }
                  ]
                },
                markerRefs: {
                  '8915bf0d-106e-48a6-bb3c-93919e2eef32': { _icon: mockMarkerIconTarget, bindTooltip: () => ({ openTooltip: () => {} }), setZIndexOffset: () => {} },
                  '48a4d270-9db2-4111-b94e-d026129b2802': { _icon: mockMarkerIconOther, setZIndexOffset: () => {} }
                }
              }
            }
          }
        };
      }
      return null;
    },
    querySelectorAll: (sel) => {
      if (sel.includes('list-group-item')) return [mockListItemTarget, mockListItemOther];
      if (sel.includes('leaflet-marker-icon')) return [mockMarkerIconTarget, mockMarkerIconOther];
      return [];
    }
  }
};

vm.createContext(pelindungSandbox);
vm.runInContext(highlightCode, pelindungSandbox);

assert.ok(Array.isArray(pelindungSandbox.window.PELINDUNG_MAXFLOW_TARGETS), 'window.PELINDUNG_MAXFLOW_TARGETS harus berupa array');
assert.equal(pelindungSandbox.window.PELINDUNG_MAXFLOW_TARGETS.length, 10, 'Script harus memuat tepat 10 titik CCTV utama agar konsisten 1-to-1 dengan peta rute graf');
assert.match(mockMarkerIconTarget.style.filter || '', /invert|hue-rotate/, 'Pinpoint target harus diberi filter maroon');
assert.ok(!((mockMarkerIconTarget.style.filter || '').includes('drop-shadow')), 'Pinpoint target tidak boleh memiliki filter drop-shadow');
assert.equal(mockMarkerIconOther.style.opacity, '0.25', 'Pinpoint non-target harus diredupkan (opacity 0.25)');
assert.ok(Array.isArray(GRAPH_DATA.cctvPoints), 'GRAPH_DATA.cctvPoints harus berupa array');
assert.equal(GRAPH_DATA.cctvPoints.length, 10, 'Harus terdapat 10 titik lokasi CCTV Pelindung pada graf');
const cctvCisangkuy = GRAPH_DATA.cctvPoints.find((c) => c.id === 'cctv_lansia_pustaka' || c.nodeId === 'V_Cisangkuy');
assert.ok(cctvCisangkuy, 'CCTV Cisangkuy harus ada');
assert.ok(cctvCisangkuy.lat >= -6.9015, 'CCTV Cisangkuy harus berada di atas Taman Lansia (simpang Cisangkuy - Diponegoro, lat >= -6.9015)');
assert.ok(Array.isArray(GRAPH_DATA.manualSurveyPoints), 'GRAPH_DATA.manualSurveyPoints harus berupa array');
assert.equal(GRAPH_DATA.manualSurveyPoints.length, 6, 'Harus terdapat 6 titik lokasi survei manual di lapangan');

assert.match(html, /id="btn-toggle-cctv"/, 'Harus memiliki tombol #btn-toggle-cctv di sidebar');
assert.equal(typeof sandbox.window.toggleSurveyLayer, 'function', 'window.toggleSurveyLayer harus tersedia');

assert.match(specContent, /pelindung\.bandung\.go\.id/i, 'GRAPH_SPEC_LLM.md harus memuat referensi CCTV pelindung.bandung.go.id');
assert.match(specContent, /Survei Manual|Rekam Manual/i, 'GRAPH_SPEC_LLM.md harus memuat daftar titik survei manual');

// 12. Cek konfigurasi deployment Vercel
const vercelConfigPath = new URL('../vercel.json', import.meta.url);
assert.ok(fs.existsSync(vercelConfigPath), 'File vercel.json harus ada di root repositori');

const vercelConfig = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'));
assert.ok(Array.isArray(vercelConfig.headers), 'vercel.json harus memiliki konfigurasi headers');
const osmHeader = vercelConfig.headers.find((h) =>
  h.headers && h.headers.some((kv) => kv.key.toLowerCase() === 'referrer-policy' && kv.value === 'origin-when-cross-origin')
);
assert.ok(osmHeader, 'vercel.json harus menyuntikkan header Referrer-Policy: origin-when-cross-origin');

assert.ok(Array.isArray(vercelConfig.redirects), 'vercel.json harus memiliki konfigurasi redirects');
const rootRedirect = vercelConfig.redirects.find((r) => r.source === '/' && r.destination === '/graph/');
assert.ok(rootRedirect, 'vercel.json harus mengarahkan root / ke /graph/');

const rootHtmlPath = new URL('../index.html', import.meta.url);
assert.ok(fs.existsSync(rootHtmlPath), 'File fallback index.html harus ada di root repositori');
const rootHtmlContent = fs.readFileSync(rootHtmlPath, 'utf8');
assert.match(rootHtmlContent, /url=\/graph\//, 'Root index.html harus memuat meta redirect ke /graph/');

const gitignorePath = new URL('../.gitignore', import.meta.url);
assert.ok(fs.existsSync(gitignorePath), 'File .gitignore harus ada di root repositori');
const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
assert.ok(gitignoreContent.includes('docs/'), '.gitignore harus mengabaikan folder docs/ superpower');
assert.ok(gitignoreContent.includes('.superpowers/'), '.gitignore harus mengabaikan folder .superpowers/');

// 13. Cek formulasi proper S1, S2 -> T1, T2, notasi subskrip simpul graf, filter tabs, & Supersource/Supersink
assert.equal(rawGraphData.paths[0].source, 'S1', 'Jalur 1 harus bermula dari S1');
assert.equal(rawGraphData.paths[1].source, 'S1', 'Jalur 2 harus bermula dari S1');
assert.equal(rawGraphData.paths[2].source, 'S2', 'Jalur 3 harus bermula dari S2');
assert.equal(rawGraphData.paths[3].source, 'S2', 'Jalur 4 harus bermula dari S2');

assert.match(html, /formatNodeHtml|formatNodeMath/, 'Harus memiliki fungsi formatter subskrip simpul graf');
assert.match(html, /data-filter/, 'Harus menyediakan filter tab berdasarkan sumber/tujuan');
assert.match(html, /Supersource|Super Source/i, 'Harus memuat penjelasan Supersource (S*)');
assert.match(html, /Supersink|Super Sink/i, 'Harus memuat penjelasan Supersink (T*)');
assert.ok(!html.includes('($S_1, S_2 \\to T_1, T_2$)'), 'Tidak boleh membiarkan penulisan raw LaTeX ($S_1, S_2 \\to T_1, T_2$) di teks DOM');

assert.match(specContent, /Supersource|Super Source/i, 'GRAPH_SPEC_LLM.md harus memuat transformasi Supersource');
assert.match(specContent, /Supersink|Super Sink/i, 'GRAPH_SPEC_LLM.md harus memuat transformasi Supersink');

console.log('PASS: Semua pemeriksaan data graf, 4 jalur OSM, ruas segmen satuan dengan lebar jalan, simpul, interaksi, server HTTP lokal, dokumen LLM, slider transparansi peta, script pelindung-highlight.js, layer CCTV/Survei Manual, dan konfigurasi Vercel berhasil.');
