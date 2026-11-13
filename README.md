# Tugas Besar Matematika Diskrit Lanjut

## Kasus 4: Pasar Tumpah (Maximum Flow)

Setiap Minggu pagi pedagang pasar tumpah memakai badan jalan di sekitar Lapangan Gasibu dan Monumen Perjuangan (Monju), Bandung, sehingga lebar efektif jalan berkurang dan arus kendaraan tertahan. Kami memodelkan jaringan jalan kawasan itu sebagai graf berarah dengan dua titik masuk dan dua titik keluar, lalu memakai Ford-Fulkerson untuk menghitung arus maksimum (max flow) dan mencari ruas pembatasnya (min cut), saat tidak ada pasar maupun saat pasar berlangsung.

Situs: **https://tubes-25ti2102p-matdis-praktek.vercel.app**

| Halaman | Isi |
|:---|:---|
| [`/`](https://tubes-25ti2102p-matdis-praktek.vercel.app) | Landing berisi cerita masalah, cara kerja max flow pada graf contoh, tim, dan kliping berita |
| [`/graph/`](https://tubes-25ti2102p-matdis-praktek.vercel.app/graph/) | Dashboard Peta: 8 rute di atas peta OpenStreetMap, simpul, lebar ruas, titik CCTV dan rekaman HP beserta videonya |
| [`/graph/cctv`](https://tubes-25ti2102p-matdis-praktek.vercel.app/graph/cctv) | CCTV dan Video: cuplikan CCTV Pelindung dan rekaman HP yang sudah diproses program hitung kendaraan, cara kerja program, jadwal rekam |
| [`/graph/visualisasi`](https://tubes-25ti2102p-matdis-praktek.vercel.app/graph/visualisasi) | Visualisasi Ford-Fulkerson yang bisa dicoba langsung, dan tempat visualisasi Iterative Ford-Fulkerson |

## Identitas Kelompok

**Kelompok 1, Kelas 2B-D4**  
**Program Studi:** D4 Teknik Informatika  
**Jurusan:** Teknik Komputer dan Informatika  
**Institusi:** Politeknik Negeri Bandung  
**Tahun:** 2026  

**Masalah:** Pemodelan Jaringan Aliran (Network Flow / Maximum Flow) dan Analisis Max-Flow Min-Cut pada Kemacetan Pasar Tumpah Kawasan Gasibu-Monumen Perjuangan (Monju), Kota Bandung.

| No | NIM | Nama Mahasiswa | Peran |
|:--:|:---:|:---|:---|
| 1 | 251524036 | Alifah Zachra Syifatunnajwa | Visualisasi Ford-Fulkerson (`visualizer/`) |
| 2 | 251524042 | Elang Permadi Lau | Algoritma Ford-Fulkerson |
| 3 | 251524046 | Ganesh Diyan Khansa Khairunnisa | Visualisasi Iterative Ford-Fulkerson |
| 4 | 251524048 | Ghaisan Khoirul Badruzaman | Data CCTV dan rekaman HP, program hitung kendaraan, situs presentasi |
| 5 | 251524049 | Hafiz Fauzan Syafrudin | Algoritma Iterative Ford-Fulkerson, graf 8 rute dan spesifikasi jalan, pengelolaan repo |

## Pendekatan

### Graf jaringan jalan

Graf punya 26 simpul dengan koordinat dari OpenStreetMap: dua titik masuk S1 (turun Pasupati, Jl. Tamansari) dan S2 (Jl. Dipatiukur depan kampus Unpad), dua titik keluar T1 (PUSDAI, Jl. Surapati Timur) dan T2 (Jl. Diponegoro Timur), serta 22 persimpangan. Dari S1 dan S2 ke T1 dan T2 ada 8 rute. Empat lewat koridor luar (P1 sampai P4) dan empat lewat Jalan Gasibu Atas (P5 sampai P8). Ruas Gasibu Atas (`V_Gasibu_Barat` ke `V_Gasibu_Timur`) dilalui keempat rute terakhir dan dipakai sebagai ruas pasar.

Arah dan lebar tiap ruas diambil dari tag OSM (`oneway`, `lanes`, `width`). Jalan berjalur ganda yang dipisah median, seperti Jl. Ir. H. Djuanda dan Jl. Diponegoro Barat, dihitung setengah lebarnya karena graf hanya memakai satu arah. Rinciannya ada di [`graph/GRAPH_SPEC_LLM.md`](graph/GRAPH_SPEC_LLM.md).

Untuk pipeline Python, [`cases/scenarios/case_04_pasar_tumpah.yaml`](cases/scenarios/case_04_pasar_tumpah.yaml) menambahkan supersource S* dan supersink T* (jadi 28 simpul, 35 ruas) serta event penyempitan ruas pasar dan penutupan Jl. Singaperbangsa pada pagi hari pasar.

### Algoritma

Sesuai catatan dosen, perhitungan dibagi dua.

1. **Ford-Fulkerson per pasangan** (S1-T1, S1-T2, S2-T1, S2-T2). Lapak pedagang dimodelkan sebagai faktor penyempitan α di ruas pasar, dengan kapasitas efektif = (1 - α) × kapasitas. Nilai α diubah-ubah untuk melihat kapan ruas pasar mulai menjadi pembatas. Kode awalnya ada di [`algorithms/maxflow/ford_fulkerson.py`](algorithms/maxflow/ford_fulkerson.py) (pencarian jalur dengan BFS, varian Edmonds-Karp).
2. **Iterative Ford-Fulkerson** untuk semua pasangan sekaligus. Tiap ruas nantinya menampilkan arus maksimal, total arus yang lewat, dan kapasitas efektifnya.

Visualisasi Ford-Fulkerson di [`visualizer/`](visualizer/) (Vue 3, Vite, TypeScript, Tailwind, Leaflet) menggambar augmenting path, sisa kapasitas, bottleneck, residual graph, dan min cut langkah demi langkah di atas peta, lengkap dengan perbandingan tanpa pasar dan pasar penuh serta analisis sensitivitas α dari 0 sampai 90%. Hasil build-nya ada di `graph/ff/` dan dibuka dari halaman Visualisasi.

### Data arus kendaraan

- **CCTV Pelindung Bandung**: 12 titik pantau (27 kamera) yang dipetakan ke simpul graf, daftarnya di bagian 7.1 `GRAPH_SPEC_LLM.md`. Stream HLS-nya direkam langsung dengan ffmpeg.
- **Rekaman HP**: 6 simpang yang tidak punya CCTV direkam anggota pada Minggu 1 November 2026, sekitar 15 menit per titik.
- **Program hitung kendaraan** (Python, YOLO dari Ultralytics, OpenCV, ByteTrack) ada di [`hitung-kendaraan/`](hitung-kendaraan/). Program ini merekam stream CCTV, mendeteksi dan melacak kendaraan, lalu menghitung kendaraan yang melewati garis di tiap ruas menurut arah dan kelasnya. Untuk rekaman HP yang dipegang tangan, garis hitung ikut bergeser bersama gambar. Rekap rekaman HP ada di [`hitung-kendaraan/hasil_hitung/hp_1nov/`](hitung-kendaraan/hasil_hitung/hp_1nov/), dan kolase rekaman yang sudah diproses ada di [youtu.be/rOYqXmBW57s](https://youtu.be/rOYqXmBW57s).
- Rekaman yang dihitung untuk graf dijadwalkan Sabtu 14 November 2026 (tanpa pasar) dan Minggu 15 November 2026 (saat pasar), pukul 07.30 sampai 08.00 WIB.

### Status

- **Kapasitas belum final.** Belum ada data kapasitas kendaraan per jam yang terverifikasi untuk tiap ruas (lihat "Status data kapasitas" di bagian 3 `GRAPH_SPEC_LLM.md`). Lebar dan jumlah lajur tidak bisa langsung dianggap kapasitas. Angka kapasitas di YAML masih nilai relatif, dan trace di visualisasi Ford-Fulkerson masih contoh dari `visualizer/dev/sampleTrace.ts` dengan penyempitan pasar penuh 50% sebagai placeholder.
- Program hitung mengukur arus, bukan kapasitas. Arus baru sama dengan kapasitas kalau di hulu ruas sedang ada antrean.
- Algoritma Iterative Ford-Fulkerson dan visualisasinya sedang dikerjakan.
- Pipeline Python template belum tersambung ke kasus ini. Kelas `FordFulkerson` belum didaftarkan ke `AlgorithmRegistry`, belum punya `handle_dynamic_event`, dan `run()` baru mengembalikan nilai max flow, padahal `SimulationRunner` menunggu pasangan rute dan nilai. `ScenarioLoader` juga baru meneruskan `weight` ke graf, belum `capacity`.

## Struktur Repo

```text
.
├── index.html                  landing page (/)
├── vercel.json                 konfigurasi deploy Vercel
├── requirements.txt            paket Python untuk template dosen
├── .python-version             versi Python acuan (3.12)
├── algorithms/                 solver: maxflow/ford_fulkerson.py dan registry.py
├── cases/
│   ├── scenario_loader.py      pembaca YAML menjadi SpatialGraphModel
│   └── scenarios/
│       └── case_04_pasar_tumpah.yaml   graf kasus 4, kapasitas relatif, event penyempitan
├── config/settings.py          skenario dan algoritma default, folder output
├── core/                       model graf, runner simulasi, observer, gambar graf matplotlib
├── scripts/                    run_simulation.py dan run_benchmark.py
├── tests/                      tes pytest untuk loader dan kontrak skenario
├── tracer/                     modul trace bawaan template, masih kosong
├── output/                     tempat trace JSON hasil runner
├── visualizer/                 aplikasi visualisasi Ford-Fulkerson (Vue 3 + Vite)
├── hitung-kendaraan/
│   ├── video_counting/         rekam CCTV, kalibrasi garis, hitung, agregasi, validasi, beserta config dan tes
│   ├── hasil_uji/              hasil uji CCTV 29 Oktober 2026 dan video demo
│   └── hasil_hitung/           rekap kendaraan per jam dari rekaman HP 1 November 2026
├── graph/
│   ├── index.html              Dashboard Peta, sekaligus sumber data GRAPH_DATA
│   ├── cctv.html               halaman CCTV dan Video
│   ├── visualisasi.html        halaman Visualisasi
│   ├── ff/                     hasil build visualizer, dibuka di /graph/ff/
│   ├── data/                   graf.json (salinan GRAPH_DATA) dan contoh_graf.json (graf contoh di landing)
│   ├── landing/                skrip, gaya, dan gambar peta untuk landing
│   ├── media/                  cuplikan video cctv/, hp/, deteksi/ dan media.js (daftar video)
│   ├── assets/                 foto tim, kliping berita, diagram fishbone
│   ├── peta.js                 tambahan Dashboard Peta (pin, popup video, ruas pasar)
│   ├── halaman.js, halaman.css isi dan gaya halaman CCTV dan Visualisasi
│   ├── situs.js, situs.css     navigasi bersama untuk semua halaman
│   ├── pelindung-highlight.js  skrip Console untuk menandai kamera di situs Pelindung Bandung
│   ├── GRAPH_SPEC_LLM.md       spesifikasi simpul, 8 rute, lebar dan arah ruas, titik CCTV dan survei
│   ├── verify-map.mjs          pemeriksaan otomatis Dashboard Peta, data graf, dan vercel.json
│   ├── ekstrak_graf.mjs        menyalin GRAPH_DATA ke data/graf.json
│   ├── bangun_ff.sh            build ulang visualizer ke graph/ff
│   └── serve.mjs               server Node kecil untuk folder graph/ dengan header Referrer-Policy
├── TUTORIAL.md                 tutorial pipeline template dosen
├── CASESS.md                   daftar 28 kasus tubes dan pemetaan algoritmanya
└── GLOSSARY.md                 panduan menulis action_narrative di log
```

## Menjalankan

### Pipeline Python (template dosen)

```bash
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Semua perintah dijalankan dari akar repo.

```bash
python -m pytest                   # tes loader dan kontrak skenario
python -m scripts.run_simulation   # skenario default case_04_pasar_tumpah.yaml
python -m scripts.run_benchmark    # ringkasan langkah dan waktu per skenario
```

Pilihan lain seperti path YAML tertentu, `--all`, dan `--algorithm` dijelaskan di [`TUTORIAL.md`](TUTORIAL.md). Tutorial itu ditulis untuk 28 kasus, sedangkan repo ini hanya berisi skenario kasus 4.

Untuk sekarang tiga tes loader lulus, tetapi `test_scenario_pipeline_contract` gagal dan `run_simulation` serta `run_benchmark` berhenti dengan `KeyError: Algorithm 'maxflow' tidak terdaftar di registry`. Penyebabnya ada di bagian Status di atas.

### Visualizer Ford-Fulkerson

Butuh Node.js 20 atau lebih baru.

```bash
cd visualizer
npm install
npm run dev                        # buka http://localhost:5173
npm test                           # tes logika, integritas data trace, dan tes asap App
```

Perintah lain (`build`, `convert:yaml`, `build:map`, `gen:traces`) dan format trace ada di [`visualizer/README.md`](visualizer/README.md).

### Program hitung kendaraan

Butuh Python 3 (diuji dengan Python 3.14) dan `ffmpeg`. Semua perintah dijalankan dari folder `hitung-kendaraan/`.

```bash
cd hitung-kendaraan
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/yolo settings sync=False                  # matikan kiriman data analitik Ultralytics
.venv/bin/python video_counting/tests/test_lintasan.py
```

Alurnya rekam (`rekam_cctv.py`), pasang garis hitung (`kalibrasi.py`), hitung (`hitung.py`), rekap (`agregasi.py`), lalu validasi dengan hitungan manual (`validasi.py`). Perintah lengkap tiap tahap, format keluaran, dan hasil uji ada di [`hitung-kendaraan/README.md`](hitung-kendaraan/README.md). Video rekaman dan bobot model tidak disimpan di repo.

### Situs statis secara lokal

```bash
python3 -m http.server 8000
```

Jalankan dari akar repo, lalu buka `http://localhost:8000/` untuk landing dan `http://localhost:8000/graph/` untuk Dashboard Peta. Di server lokal tidak ada `cleanUrls`, jadi halaman lain dibuka lewat `/graph/cctv.html` dan `/graph/visualisasi.html`. Peta dasar butuh internet karena tile diambil dari OpenStreetMap.

### Memeriksa dan membangun ulang data

| Perintah | Kapan dijalankan |
|:---|:---|
| `node graph/verify-map.mjs` | Setelah mengubah `graph/index.html` atau `GRAPH_SPEC_LLM.md`. Mencetak `PASS` kalau semua pemeriksaan lolos. |
| `node graph/ekstrak_graf.mjs` | Setiap `GRAPH_DATA` di `graph/index.html` berubah, supaya landing, CCTV, dan Visualisasi memakai data yang sama. |
| `bash graph/bangun_ff.sh` | Setiap `visualizer/` berubah. Build dilakukan di salinan sementara (`npm ci` lalu `vite build`), hasilnya ditulis ke `graph/ff/`, dan folder `visualizer/` tidak ikut berubah. Butuh `rsync`, Node.js, dan npm. |

## Deployment

Situs di-deploy oleh Vercel secara otomatis setiap ada push ke branch `main`. Isi [`vercel.json`](vercel.json):

- `"framework": null`. Vercel tidak menjalankan build dan langsung menyajikan berkas dari repo, jadi `graph/ff/` dan `graph/data/graf.json` harus ikut di-commit setelah dibangun ulang.
- `"cleanUrls": true`. Halaman bisa dibuka tanpa `.html`, misalnya `/graph/cctv`.
- Header `Referrer-Policy: origin-when-cross-origin` untuk semua path, karena kebijakan pemakaian tile OpenStreetMap meminta setiap permintaan tile membawa Referer yang valid. `graph/index.html` juga memasang meta referrer yang sama.

## Alur Kerja

Tiap anggota mengerjakan bagiannya di branch sendiri (contohnya `alifah`), lalu membuka pull request ke `main`. Sebelum membuka pull request, jalankan pemeriksaan yang sesuai dengan bagian yang diubah: `python -m pytest` untuk kode Python, `npm test` di `visualizer/`, dan `node graph/verify-map.mjs` untuk Dashboard Peta. Kalau `GRAPH_DATA` atau `visualizer/` berubah, jalankan juga `ekstrak_graf.mjs` atau `bangun_ff.sh` dan commit hasilnya.

## Sumber Data dan Atribusi

- Peta dasar dan geometri jalan: © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), ditampilkan dengan Leaflet.
- Video CCTV: [Pelindung Bandung](https://pelindung.bandung.go.id/), dikelola Diskominfo, Dishub, dan DPKP3 Kota Bandung.
- Rekaman HP: direkam anggota kelompok di simpang yang tidak punya CCTV.
- Kliping berita dari UlasBandung, detikNews, detikJabar, kumparan, dan situs DPRD Kota Bandung. Gambarnya ada di `graph/assets/`, tautan ke artikel aslinya ada di landing.

## Dokumen Lain

- [`graph/GRAPH_SPEC_LLM.md`](graph/GRAPH_SPEC_LLM.md): spesifikasi graf, 8 rute, lebar dan arah ruas, titik CCTV dan survei manual
- [`visualizer/README.md`](visualizer/README.md): visualizer Ford-Fulkerson, alur data, dan format trace
- [`TUTORIAL.md`](TUTORIAL.md): pipeline simulasi template dosen
- [`CASESS.md`](CASESS.md): daftar kasus tubes dan pemetaan algoritmanya
- [`GLOSSARY.md`](GLOSSARY.md): panduan bahasa untuk `action_narrative`
- [`hitung-kendaraan/README.md`](hitung-kendaraan/README.md): program hitung kendaraan, alur pengambilan data, dan hasil uji
- [Kolase rekaman HP di YouTube](https://youtu.be/rOYqXmBW57s)
