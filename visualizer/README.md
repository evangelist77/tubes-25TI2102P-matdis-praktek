# Visualisasi Ford-Fulkerson: Kasus 4 Pasar Tumpah Gasibu–Monju

Aplikasi web (Vue 3 + Vite + TypeScript + Tailwind + Leaflet) yang menunjukkan **bagaimana algoritma
Ford-Fulkerson bekerja** pada jaringan jalan kasus pasar tumpah: jalur augmentasi tiap langkah, sisa kapasitas
tiap ruas, bottleneck, residual graph, min-cut, dan perbandingan kondisi tanpa pasar vs pasar penuh.

Mode Ford-Fulkerson per pasangan membaca trace hasil solver Python. Mode Iterative menghitung empat pasangan
S→T secara berurutan di browser dengan Edmonds–Karp; setiap pasangan memakai solver baru sehingga arusnya
direset, sementara cabang rute dalam pasangan tersebut berbagi kapasitas ruas.

## Menjalankan

Prasyarat: **Node.js 20 atau lebih baru** (`node -v`).

```bash
cd visualizer
npm install
npm run dev        # buka alamat yang tampil (biasanya http://localhost:5173)
```

| Perintah | Fungsi |
|---|---|
| `npm run dev` | server pengembangan dengan hot reload |
| `npm test` | seluruh tes (logika, integritas data, tes asap App) |
| `npm run build` | cek tipe (`vue-tsc`) + build produksi ke `dist/` |
| `npm run preview` | menjalankan hasil build secara lokal |
| `npm run convert:yaml` | YAML skenario → `public/data/topology.json` (butuh Python + `pyyaml`) |
| `npm run build:map` | geometri jalan + daftar rute dari `../graph/index.html` → `geometry.json`, `routes.json` |
| `npm run gen:traces` | trace **contoh (dev-only)** + `manifest.json` |
| `npm run gen:data` | ketiganya berurutan |

Peta dasar memakai tile OpenStreetMap (butuh internet). Matikan "Peta dasar" untuk mode skematik.

## Cara memakai

1. **Pilih kondisi**: *Tanpa pasar* atau *Pasar penuh*. Hanya dua kondisi ini yang punya data pengamatan
   (CCTV / video manual).
2. Pada mode **Iterative Jaringan**, pilih *Semua Pasangan* untuk melihat keempat perhitungan berurutan
   (arus direset setiap berganti pasangan), atau pilih satu pasangan. Pilih satu rute (tiap rute berwarna sendiri)
   atau *Semua Cabang Rute* untuk menyorot jaringan di peta.
3. **Putar langkah**: panel kanan menjelaskan tiap langkah: jalur, sisa kapasitas tiap ruas
   (kapasitas − arus), ruas tersempit (bottleneck jalur), dan total arus. Di langkah terakhir muncul hasil akhir,
   min-cut, dan pengecekan Σ kapasitas potongan = max flow.
4. **Mode residual** menampilkan kapasitas sisa dan edge balik. **Analisis sensitivitas** (dilipat) adalah
   simulasi penyempitan 0 sampai 100% di ruas Jl. Gasibu Atas sesuai catatan dosen, bukan data pengamatan.

## Struktur

```
visualizer/
├─ public/data/          topology.json, geometry.json, routes.json, manifest.json, trace_<S>_<T>_a<alpha>.json
├─ scripts/              convert_yaml_to_topology.py, build_map_data.mjs
├─ dev/sampleTrace.ts    generator trace CONTOH (Edmonds-Karp), hanya untuk pengembangan
└─ src/
   ├─ core/              types, loader, validateTrace, selectors, residual, iterative, geometry (logika murni + tes)
   ├─ composables/       useReplay (pemutar langkah), useComparison (perbandingan α)
   ├─ components/        MapCanvas, StepPlayer, AlgorithmPanel, CutPanel, ConditionToggle, RoutePanel,
   │                     ConditionCompare, SensitivityPanel, InspectPanel, Legend
   ├─ theme/tokens.ts    warna, ketebalan, skala gradasi
   ├─ data/labels.json   kode simpul, nama jalan, penanda ruas pasar (isMarket) dan ruas tutup (closedInMorning)
   └─ App.vue            komposisi halaman
```

Aturan modular: peta, legenda, gradasi, pemutar langkah, dan panel penjelasan ada di `components/`,
`composables/`, `theme/`, sehingga tampilan iterative (Ganesh) bisa memakai ulang yang sama.
Tidak ada warna atau angka literal di komponen; semuanya dari token atau data.

## Alur data

```
cases/scenarios/case_04_pasar_tumpah.yaml ─(convert:yaml + labels.json)─▶ topology.json
graph/index.html (web tim) ─(build:map)─▶ geometry.json (bentuk jalan) + routes.json (8 rute)
topology.json ─(python -m algorithms.maxflow.ford_fulkerson)─▶ trace_*.json + manifest.json   (solver Python Elang)
```

- **Kondisi.** `manifest.json` memuat `observedAlpha` = penyempitan ruas Jl. Gasibu Atas saat *pasar penuh*. Sekarang
  nilainya 11% dari hambatan samping PKJI, dan diganti hasil perbandingan kamera Gasibu_02 21 dan 22 November. Nilainya
  diatur lewat `OBSERVED_ALPHA` di `algorithms/maxflow/ford_fulkerson.py`. Kapasitas di `topology.json` sudah dari rumus
  PKJI (`hitung-kendaraan/hasil_hitung/kapasitas_pkji.csv`).
- **Ruas pasar dan ruas tutup** dibaca dari penanda `isMarket` / `closedInMorning` di `labels.json`, bukan
  dari nomor edge. Ruas yang ditandai `closedInMorning` ditutup (kapasitas 0) selama pasar aktif; informasi
  penutupan itu berasal dari tim, bukan dari spek.
- Id edge = urutan edge di YAML (mulai 0).

### Format trace (kontrak dengan algoritma)

```ts
interface Trace {
  meta: { caseId: string; source: number; sink: number; alpha: number; pasarActive: boolean }
  effectiveCapacity: Record<number, number>   // kapasitas efektif tiap edge pada run ini
  steps: Array<{
    step: number
    path: number[]                            // id edge pada augmenting path
    bottleneck: number                        // tambahan arus langkah ini
    totalFlow: number                         // total arus setelah langkah ini
    edgeFlows: Record<number, number>         // arus tiap edge setelah langkah ini  ← wajib ada
    narrative?: string                        // action_narrative (lihat GLOSSARY.md)
  }>
  result: { maxFlow: number; minCut: number[]; sourceSide: number[] }
}
```

Rincian tiap langkah di panel (sisa kapasitas, ruas tersempit, edge balik) **diturunkan dari selisih
`edgeFlows` antar langkah**, jadi solver cukup mencatat arus tiap ruas per langkah.
`validateTrace()` memeriksa arus ≤ kapasitas, konservasi arus, dan Σ kapasitas min-cut = max flow.
`npm test` memeriksa semua trace di `public/data/`.

### Format trace iterative

Dibuat dari root repo dengan `python3 algorithms/maxflow/iterative_ford_fulkerson.py`, yang menulis
`iterative_a<alpha>.json` ke `public/data/`, satu berkas per nilai α (0, 10, ..., 100 persen, sama dengan
trace Ford-Fulkerson). Isinya hasil keempat pasangan sesuai urutan iterasi:

```ts
interface IterativeTrace {
  caseId: string
  alpha: number
  pairs: Array<{                              // urutan: S1-T1, S1-T2, S2-T1, S2-T2
    pairId: 'S1-T1' | 'S1-T2' | 'S2-T1' | 'S2-T2'
    source: number
    sink: number
    alpha: number
    effectiveCapacity: Record<number, number>
    steps: Array<{
      step: number
      path: Array<{ edgeId: number; from: number; to: number; isBackward: boolean; residualBefore: number }>
      pathNodes: number[]                     // simpul dari source sampai sink
      bottleneck: number
      totalFlow: number
      edgeFlows: Record<number, number>
    }>
    maxFlow: number
    minCut: number[]
    sourceSide: number[]
  }>
}
```

Tiap pasangan dihitung dari arus nol dengan Edmonds-Karp milik `FordFulkerson`, jadi angkanya sama dengan
`trace_<S>_<T>_a<alpha>.json`. `isBackward: true` berarti ruas dilewati lewat edge balik (arus lama
dibatalkan), `residualBefore` adalah sisa kapasitas ruas sebelum langkah itu.

## Mengganti trace contoh dengan keluaran asli

1. Minta solver (Python) menulis trace dengan format di atas, satu berkas per pasangan S→T dan nilai α
   (minimal α = 0 dan α = pasar penuh; α lain untuk analisis sensitivitas).
2. Taruh di `public/data/`, daftarkan di `manifest.json` (isi `observedAlpha`, tandai satu run `isDefault: true`).
3. Jalankan `npm test`; pesan kesalahan menyebut berkas dan penyebabnya.

`dev/sampleTrace.ts` dan skrip `gen:traces` bisa dihapus setelah trace asli tersedia.

## Catatan penting

- **Kapasitas** adalah nilai relatif dari `graph/GRAPH_SPEC_LLM.md` (spek sendiri menyebut nilai belum final).
  Hasil (arus maksimum, bottleneck) belum boleh dibaca sebagai temuan akhir. Pada angka sekarang, jalan
  masuk S1 dan S2 adalah pembatas utama, dan ruas pasar baru menjadi pembatas bila penyempitan sangat besar.
- **Lokasi pasar:** spek terbaru tidak memuat Jl. Japati, sehingga ruas pasar dipasang di **Jl. Gasibu Atas**.
  Konfirmasi dengan tim bila lokasi sebenarnya berbeda.
- Beberapa ruas di spek digambarkan sebagai edge paralel padahal satu jalan fisik; di YAML dirantai
  (`FIX-1..4`, lihat komentar di akhir YAML) supaya kapasitas tidak terhitung dobel.
