# Tugas Besar Matematika Diskrit Lanjut

## Kasus 4: Pasar Tumpah (Maximum Flow)

Setiap Minggu pagi pedagang pasar tumpah memakai badan jalan di sekitar Lapangan Gasibu dan Monumen Perjuangan (Monju), Bandung, sehingga lebar efektif jalan berkurang dan arus kendaraan tertahan. Kami memodelkan jaringan jalan kawasan itu sebagai graf berarah dengan dua titik masuk dan dua titik keluar, lalu memakai Ford-Fulkerson (Edmonds-Karp) sebagai algoritma dasar dan Dinic sebagai algoritma lanjut untuk menghitung arus maksimum (max flow) dan mencari ruas pembatasnya (min cut), saat tidak ada pasar maupun saat pasar berlangsung.

Situs: **https://maxflow-gasibu.vercel.app**

| Halaman | Isi |
|:---|:---|
| [`/`](https://maxflow-gasibu.vercel.app) | Landing berisi cerita masalah, cara kerja max flow pada graf contoh, tim, dan kliping berita |
| [`/graph/`](https://maxflow-gasibu.vercel.app/graph/) | Dashboard Peta: 8 rute di atas peta OpenStreetMap, simpul, lebar ruas, titik CCTV dan rekaman HP beserta videonya |
| [`/graph/cctv`](https://maxflow-gasibu.vercel.app/graph/cctv) | Data Lapangan: cuplikan CCTV Pelindung dan rekaman HP yang sudah diproses program hitung kendaraan, cara kerja program, jadwal rekam |
| [`/graph/visualisasi`](https://maxflow-gasibu.vercel.app/graph/visualisasi) | Visualisasi Ford-Fulkerson yang bisa dicoba langsung, dan tempat visualisasi Iterative Ford-Fulkerson |
| [`/graph/analisis`](https://maxflow-gasibu.vercel.app/graph/analisis) | Analisis: fishbone akar masalah, rumus kapasitas PKJI, pipeline input proses output, eksperimen Ford-Fulkerson dan Dinic pada graf dinamis, serta temuan dan batasan |

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
| 5 | 251524049 | Hafiz Fauzan Syafrudin | Algoritma Iterative Ford-Fulkerson dan Dinic, graf 8 rute dan spesifikasi jalan, pengelolaan repo |

## Tutorial Penggunaan Aplikasi

Aplikasi tubes ini berupa website yang dibuka langsung di browser, jadi tidak perlu memasang apa pun. Buka **https://maxflow-gasibu.vercel.app**, lalu pakai menu di bagian atas, yaitu Cerita, Dashboard Peta, Data Lapangan, Visualisasi, Analisis, dan Tim. Di HP menunya ada di tombol Menu di kanan atas. Untuk menjalankan program Python, visualizer, atau program hitung kendaraan di komputer sendiri, lihat bagian [Menjalankan](#menjalankan).

### 1. Cerita

Halaman awal menceritakan masalahnya dalam tujuh adegan. Gulir ke bawah untuk berpindah adegan, atau pilih adegan langsung dari menu Cerita.

- Adegan 02 Masalah: kartu berita bisa diklik untuk membuka artikel aslinya.
- Adegan 03 Tim: arahkan kursor ke kartu anggota lalu klik untuk melihat tugasnya.
- Adegan 05 Data: kartu video bisa diklik untuk diperbesar.
- Adegan 06 Algoritma: langkah Ford-Fulkerson pada graf contoh berjalan sambil halaman digulir.

### 2. Dashboard Peta

- Pilih filter rute, yaitu Semua, Lewat Gasibu Atas, Dari S1, Dari S2, Ke T1, atau Ke T2.
- Klik garis rute di peta atau kartunya di Daftar rute untuk melihat arah aliran dan simpang yang dilewati.
- Klik pin CCTV atau titik rekam HP untuk melihat keterangan dan cuplikan videonya.
- Tombol Sembunyikan CCTV dan titik rekam HP serta geseran Kejelasan peta dipakai untuk merapikan tampilan.

### 3. Visualisasi Ford-Fulkerson

Buka menu Visualisasi lalu pilih Ford-Fulkerson, atau klik Buka layar penuh supaya tampilannya lebih lega di [`/graph/ff/`](https://maxflow-gasibu.vercel.app/graph/ff/).

1. Pastikan tab **Langkah per Langkah (Alifah)** di bagian atas sedang aktif.
2. Di **Pilih Kondisi**, pilih **Tanpa pasar** atau **Pasar penuh**. Pasar penuh berarti kapasitas Jl. Gasibu Atas menyempit 11% dan Jl. Singaperbangsa ditutup.
3. Di **Pilih Rute**, pilih pasangan S1 → T1, S1 → T2, S2 → T1, atau S2 → T2. **Semua rute** menampilkan seluruh jaringan untuk pasangan itu, atau pilih salah satu rute di bawahnya.
4. Tekan **Maju ▶** untuk menjalankan satu jalur augmentasi, **◀ Mundur** untuk kembali, atau **▶ Putar** untuk berjalan otomatis dengan kecepatan 0,5×, 1×, atau 2×. Nomor langkah bisa diklik untuk langsung loncat.
5. Panel kanan menjelaskan langkah yang sedang tampil beserta bottleneck-nya. Di langkah terakhir, garis merah putus-putus adalah min cut.
6. Klik ruas atau simpul di peta untuk melihat arus, kapasitas, dan rute yang melewatinya.
7. Nyalakan **Mode residual** untuk melihat kapasitas sisa dan edge balik, atau matikan **Peta dasar** untuk tampilan skematik.
8. Di **Analisis sensitivitas penyempitan**, klik salah satu nilai α pada grafik untuk melihat hasil simulasi penyempitan Gasibu Atas dari 0 sampai 100%.

### 4. Visualisasi Iterative Ford-Fulkerson

Hasil Iterative bisa dilihat dengan dua cara.

**Dashboard Iterative** di halaman Visualisasi, bagian Iterative Ford-Fulkerson:

1. Di **Kondisi Pasar Tumpah**, pilih Tanpa Pasar (α = 0%) atau Saat Pasar (α = 11%).
2. Di **Pasangan Titik**, pilih Semua Pasangan atau salah satu dari empat pasangan.
3. Di **Cabang Rute**, pilih Semua Cabang Rute atau salah satu dari P1 sampai P8.
4. Kartu di atas peta menunjukkan jumlah max flow, total arus, ruas pembatas, dan kondisi pasar. Warna ruas berubah dari hijau (lancar) sampai merah (jenuh).
5. Arahkan kursor atau klik ruas di peta, atau klik baris di tabel rincian, untuk melihat arus maksimal, total arus, kapasitas efektif, sisa kapasitas, dan tingkat kepenuhannya.

**Langkah per pasangan** di tab **Iterative Jaringan (Ganesh)** pada [`/graph/ff/?mode=iterative`](https://maxflow-gasibu.vercel.app/graph/ff/?mode=iterative). Pilih pasangan di Pilih Pasangan S → T, lalu pakai Maju, Mundur, atau Putar seperti pada Ford-Fulkerson untuk melihat keempat pasangan dihitung bergantian.

### 5. Data Lapangan

- Tabel CCTV menunjukkan status tiap kamera dan simpul yang dipantaunya.
- Cuplikan CCTV dan rekaman HP berputar sendiri saat halaman digulir sampai ke kartunya.
- Bagian Program hitung kendaraan menjelaskan cara program YOLO menghitung kendaraan, dan bagian Hasil akhir membandingkan arus terukur dengan kapasitas PKJI.

### 6. Analisis

Halaman ini berisi fishbone akar masalah, rumus kapasitas PKJI, pipeline input proses output, eksperimen graf dinamis, serta temuan dan batasan. Klik **Tabel kapasitas 31 ruas** untuk membuka kapasitas semua ruas, dan pakai menu Analisis untuk langsung loncat ke bagian tertentu.

## Pendekatan

### Graf jaringan jalan

Graf punya 26 simpul dengan koordinat dari OpenStreetMap: dua titik masuk S1 (turun Pasupati, Jl. Tamansari) dan S2 (Jl. Dipatiukur depan kampus Unpad), dua titik keluar T1 (PUSDAI, Jl. Surapati Timur) dan T2 (Jl. Diponegoro Timur), serta 22 persimpangan. Dari S1 dan S2 ke T1 dan T2 ada 8 rute. Empat lewat koridor luar (P1 sampai P4) dan empat lewat Jalan Gasibu Atas (P5 sampai P8). Ruas Gasibu Atas (`V_Gasibu_Barat` ke `V_Gasibu_Timur`) dilalui keempat rute terakhir dan menjadi ruas yang terdampak pasar.

Arah dan lebar tiap ruas diambil dari tag OSM (`oneway`, `lanes`, `width`). Jalan berjalur ganda yang dipisah median, seperti Jl. Ir. H. Djuanda dan Jl. Diponegoro Barat, dihitung setengah lebarnya karena graf hanya memakai satu arah. Rinciannya ada di [`graph/GRAPH_SPEC_LLM.md`](graph/GRAPH_SPEC_LLM.md).

Untuk pipeline Python, [`cases/scenarios/case_04_pasar_tumpah.yaml`](cases/scenarios/case_04_pasar_tumpah.yaml) menambahkan supersource S* dan supersink T* (jadi 28 simpul, 35 ruas) serta event penyempitan Jl. Gasibu Atas dan penutupan Jl. Singaperbangsa pada pagi hari pasar.

### Algoritma

Sesuai catatan dosen, perhitungan dibagi dua.

1. **Ford-Fulkerson per pasangan** (S1-T1, S1-T2, S2-T1, S2-T2). Pengaruh pasar dimodelkan sebagai faktor penyempitan α di ruas Jl. Gasibu Atas, dengan kapasitas efektif = (1 - α) × kapasitas. Nilai α diubah-ubah untuk melihat kapan ruas itu mulai menjadi pembatas. Kodenya ada di [`algorithms/maxflow/ford_fulkerson.py`](algorithms/maxflow/ford_fulkerson.py) (pencarian jalur dengan BFS, varian Edmonds-Karp). Kelas `FordFulkerson` terdaftar di `AlgorithmRegistry` sebagai `maxflow`, menerima event `DYNAMIC_EDGE_CAPACITY` dari skenario, dan menulis trace tiap langkah untuk keempat pasangan dengan α dari 0 sampai 100%. Nilai α untuk kondisi pasar penuh sementara 11% dari hambatan samping PKJI, sampai perbandingan kamera Gasibu_02 Sabtu 21 dan Minggu 22 November keluar.
2. **Iterative Ford-Fulkerson** untuk keempat pasangan yang dihitung bergantian di jaringan yang sama. Kodenya ada di [`algorithms/maxflow/iterative_ford_fulkerson.py`](algorithms/maxflow/iterative_ford_fulkerson.py) dan hasilnya ditulis sebagai trace `iterative_a<alpha>.json` yang dibaca mode Iterative di visualisasi. Tiap ruas menampilkan arus maksimal, total arus yang lewat, dan kapasitas efektifnya.

Sebagai pembanding algoritma klasik dengan algoritma lanjutan (template dosen memetakan kasus 4 ke Ford-Fulkerson/Dinic), max flow juga dihitung dengan **Dinic**. Kodenya ada di [`algorithms/maxflow/dinic.py`](algorithms/maxflow/dinic.py) dan terdaftar di `AlgorithmRegistry` sebagai `dinic`. Tiap fase membangun level graph dengan BFS, lalu mencari blocking flow dengan DFS yang menyimpan pointer sisi per simpul supaya sisi yang sudah jenuh atau buntu tidak diperiksa ulang. Masukan, aturan α, dan nilai kembaliannya sama dengan `FordFulkerson`. Untuk event `DYNAMIC_EDGE_CAPACITY`, kalau kapasitas baru masih ≥ arus yang sedang lewat di ruas itu, arus lama dipertahankan dan perhitungan dilanjutkan dari graf residual (warm start). Kalau lebih kecil, max flow dihitung ulang dari nol.

Visualisasi Ford-Fulkerson di [`visualizer/`](visualizer/) (Vue 3, Vite, TypeScript, Tailwind, Leaflet) menggambar augmenting path, sisa kapasitas, bottleneck, residual graph, dan min cut langkah demi langkah di atas peta, lengkap dengan perbandingan tanpa pasar dan pasar penuh serta analisis sensitivitas α dari 0 sampai 100%. Trace-nya dihasilkan algoritma di atas. Hasil build-nya ada di `graph/ff/` dan dibuka dari halaman Visualisasi.

### Data arus kendaraan

- **CCTV Pelindung Bandung**: 11 titik pantau yang dipetakan ke simpul graf, 8 bisa dipakai dan 3 tidak bisa dibuka. Daftarnya ada di bagian 7.1 `GRAPH_SPEC_LLM.md`. Stream HLS-nya direkam langsung dengan ffmpeg.
- **Rekaman HP**: 6 simpang yang tidak punya CCTV direkam anggota pada Minggu 1 November 2026, sekitar 15 menit per titik.
- **Program hitung kendaraan** (Python, YOLO dari Ultralytics, OpenCV, ByteTrack) ada di [`hitung-kendaraan/`](hitung-kendaraan/). Program ini merekam stream CCTV, mendeteksi dan melacak kendaraan, lalu menghitung kendaraan yang melewati garis di tiap ruas menurut arah dan kelasnya. Untuk rekaman HP yang dipegang tangan, garis hitung ikut bergeser bersama gambar. Rekap rekaman HP ada di [`hitung-kendaraan/hasil_hitung/hp_1nov/`](hitung-kendaraan/hasil_hitung/hp_1nov/), dan kolase rekaman yang sudah diproses ada di [youtu.be/rOYqXmBW57s](https://youtu.be/rOYqXmBW57s).
- **CCTV Sabtu dan Minggu**: kamera direkam Sabtu 14 November 2026 (tanpa pasar) dan Minggu 15 November 2026 (saat pasar), pukul 07.30 sampai 08.00 WIB, lalu dihitung dan dicek per kamera. Hasilnya ada di [`hitung-kendaraan/hasil_hitung/`](hitung-kendaraan/hasil_hitung/) (`cctv_14nov_sabtu/`, `cctv_15nov_minggu/`, dan `banding_cctv_sabtu_minggu.csv`), dan kolase rekaman Minggu ada di [youtu.be/KW-fCy3HZwM](https://youtu.be/KW-fCy3HZwM). Kamera CCTV Lapang Gasibu 02 ternyata menghadap Jl. Japati, jalan pasar yang ditutup saat Minggu pagi, jadi datanya tidak dipakai untuk Jl. Gasibu Atas. Gantinya kamera CCTV Gasibu_02 direkam Sabtu 21 dan Minggu 22 November. Jl. Ir. H. Djuanda di Minggu pagi juga ditutup karena Car Free Day.
- Arus juga dihitung dalam skr/jam dengan ekr dari tabel PKJI sesuai tipe jalan tiap titik. Tabel dan sumbernya ada di bagian "ekr" [`hitung-kendaraan/README.md`](hitung-kendaraan/README.md).

### Status

- **Kapasitas dari PKJI.** Kapasitas 31 ruas di YAML dihitung dengan rumus PKJI jalan perkotaan dalam skr/jam per arah (`hitung-kendaraan/video_counting/kapasitas_pkji.py`, tabelnya `hitung-kendaraan/hasil_hitung/kapasitas_pkji.csv`). Arus hasil hitung CCTV dan HP dipakai untuk mengecek, dan dari 10 ruas yang terukur tidak ada arus yang melebihi kapasitas.
- Program hitung mengukur arus, bukan kapasitas. Arus baru sama dengan kapasitas kalau di hulu ruas sedang ada antrean.
- Algoritma Iterative Ford-Fulkerson sudah jadi dan visualisasi Iterative membaca trace dari algoritma Python. Hitungan di browser hanya dipakai kalau berkas trace tidak ada, dan tes memastikan keduanya sama.
- Dinic sudah jadi dan max flow-nya sama dengan Ford-Fulkerson untuk S*-T*, keempat pasangan, dan keempat event skenario. Event yang menutup ruas yang sedang dialiri membuat Dinic menghitung ulang dari nol, sedangkan event yang menaikkan kapasitas cukup diselesaikan dengan warm start. `python -m scripts.banding_ff_dinic` menulis perbandingan keduanya (max flow, jumlah BFS, augmenting path, sisi yang diperiksa, dan waktu) untuk kondisi normal, kondisi pasar, tiap event, dan graf grid sintetis sampai sekitar 2000 simpul ke `output/banding_ff_dinic.csv`. Waktu Ford-Fulkerson ikut menghitung penyusunan trace visualizer tiap langkah, jadi kerja kedua algoritma lebih adil dibandingkan lewat kolom `sisi_diperiksa`.
- Pipeline Python template sudah tersambung. `run_simulation` menjalankan Ford-Fulkerson dan keempat event skenario. Max flow seluruh jaringan 2.668,6 skr/jam dengan pembatas di Jl. Tamansari dan Jl. Dipatiukur, tetap 2.668,6 saat Gasibu Atas menyempit 11%, lalu turun ke 2.331,9 saat Jl. Singaperbangsa ditutup. Gasibu Atas baru ikut membatasi kalau penyempitannya lebih dari 70%. `ScenarioLoader` masih hanya meneruskan `weight`, jadi `FordFulkerson` membaca kapasitas dari `visualizer/public/data/topology.json`. Kalau kapasitas di YAML diubah, jalankan `npm run convert:yaml` di `visualizer/` dulu.

## Struktur Repo

```text
.
├── index.html                  landing page (/)
├── vercel.json                 konfigurasi deploy Vercel
├── requirements.txt            paket Python untuk template dosen
├── .python-version             versi Python acuan (3.12)
├── algorithms/                 solver: maxflow/ford_fulkerson.py, maxflow/dinic.py, maxflow/iterative_ford_fulkerson.py, dan registry.py
├── cases/
│   ├── scenario_loader.py      pembaca YAML menjadi SpatialGraphModel
│   └── scenarios/
│       └── case_04_pasar_tumpah.yaml   graf kasus 4, kapasitas PKJI, event penyempitan dan penutupan ruas
├── config/settings.py          skenario dan algoritma default, folder output
├── core/                       model graf, runner simulasi, observer, gambar graf matplotlib
├── scripts/                    run_simulation.py, run_benchmark.py, dan banding_ff_dinic.py
├── tests/                      tes pytest untuk loader, kontrak skenario, event max flow, dan Dinic
├── tracer/                     modul trace bawaan template, masih kosong
├── output/                     tempat trace JSON hasil runner dan CSV banding Ford-Fulkerson dengan Dinic
├── visualizer/                 aplikasi visualisasi Ford-Fulkerson (Vue 3 + Vite)
├── hitung-kendaraan/
│   ├── video_counting/         rekam CCTV, kalibrasi garis, hitung, agregasi, validasi, beserta config dan tes
│   ├── hasil_uji/              hasil uji CCTV 29 Oktober 2026 dan video demo
│   └── hasil_hitung/           rekap kendaraan per jam dari rekaman HP 1 November dan CCTV 14 dan 15 November 2026
├── graph/
│   ├── index.html              Dashboard Peta, sekaligus sumber data GRAPH_DATA
│   ├── cctv.html               halaman Data Lapangan
│   ├── visualisasi.html        halaman Visualisasi
│   ├── analisis.html, analisis.css  halaman Analisis
│   ├── ff/                     hasil build visualizer, dibuka di /graph/ff/
│   ├── data/                   graf.json (salinan GRAPH_DATA) dan contoh_graf.json (graf contoh di landing)
│   ├── landing/                skrip, gaya, dan gambar peta untuk landing
│   ├── media/                  cuplikan video cctv/, hp/, deteksi/ dan media.js (daftar video)
│   ├── assets/                 foto tim, kliping berita, diagram fishbone
│   ├── peta.js                 tambahan Dashboard Peta (pin, popup video, ruas Gasibu Atas)
│   ├── halaman.js, halaman.css isi dan gaya halaman Data Lapangan dan Visualisasi
│   ├── iterative.js, iterative.css  dashboard Iterative di halaman Visualisasi
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
python -m scripts.run_benchmark -a maxflow -a dinic   # Ford-Fulkerson dan Dinic dalam satu tabel
python -m scripts.banding_ff_dinic # banding lengkap Ford-Fulkerson dan Dinic, sekitar 30 detik
```

Pilihan lain seperti path YAML tertentu, `--all`, dan `--algorithm` dijelaskan di [`TUTORIAL.md`](TUTORIAL.md). Tutorial itu ditulis untuk 28 kasus, sedangkan repo ini hanya berisi skenario kasus 4.

Semua tes lulus, termasuk tes yang memastikan Dinic sama dengan Ford-Fulkerson. `run_simulation` membuka jendela gambar graf matplotlib dan menunggu jendela itu ditutup. Untuk menjalankannya tanpa jendela, pakai `MPLBACKEND=Agg python -m scripts.run_simulation`.

Trace visualizer dibuat ulang dengan `python -m algorithms.maxflow.ford_fulkerson` (trace Ford-Fulkerson dan `manifest.json`) dan `python3 algorithms/maxflow/iterative_ford_fulkerson.py` (trace Iterative), keduanya ke `visualizer/public/data/`. Setelah itu jalankan `bash graph/bangun_ff.sh`.

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

Jalankan dari akar repo, lalu buka `http://localhost:8000/` untuk landing dan `http://localhost:8000/graph/` untuk Dashboard Peta. Di server lokal tidak ada `cleanUrls`, jadi halaman lain dibuka lewat `/graph/cctv.html`, `/graph/visualisasi.html`, dan `/graph/analisis.html`. Peta dasar butuh internet karena tile diambil dari OpenStreetMap.

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

Sejak 20 November 2026 tiap anggota punya branch sendiri, yaitu `alifah`, `elang`, `ganesh`, `hafiz`, dan `ghaisan`. Perubahan dikerjakan di branch masing-masing dengan satu commit untuk satu perubahan, lalu digabung ke `main` dengan merge commit. Sebelum tanggal itu sebagian besar perubahan langsung di-commit ke `main`, kecuali template dan visualisasi Ford-Fulkerson dari branch `alifah` yang digabung lewat pull request #1 pada 11 November 2026 dan visualisasi Iterative dari branch `ganesh` yang digabung pada 18 November 2026. Sebelum menggabungkan ke `main`, jalankan pemeriksaan yang sesuai dengan bagian yang diubah: `python -m pytest` untuk kode Python, `npm test` di `visualizer/`, dan `node graph/verify-map.mjs` untuk Dashboard Peta. Kalau `GRAPH_DATA` atau `visualizer/` berubah, jalankan juga `ekstrak_graf.mjs` atau `bangun_ff.sh` dan commit hasilnya.

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
- [Kolase rekaman CCTV Minggu 15 November di YouTube](https://youtu.be/KW-fCy3HZwM)
