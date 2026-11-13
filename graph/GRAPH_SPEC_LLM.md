# Jaringan Aliran Jalan (Network Flow Graph) — Kasus 4: Pasar Tumpah Kawasan Gasibu–Monju, Bandung

Dokumen ini berisi spesifikasi topologi graf terarah (*directed network flow*) yang merepresentasikan 8 jalur utama pengalihan arus kendaraan (4 rute alternatif koridor luar + 4 rute melintasi Koridor Jalan Gasibu Atas) di sekitar kawasan Gasibu, Monumen Perjuangan (Monju), dan PUSDAI Kota Bandung. Dokumen ini dirancang agar dapat langsung dimasukkan ke dalam konteks LLM (Large Language Model) untuk analisis graf, kapasitas jalan, pemodelan *Maximum Flow / Minimum Cut* (algoritma Ford-Fulkerson / Edmonds-Karp), maupun perancangan rekayasa lalu lintas.

---

## 1. Konteks Masalah
- **Kasus:** Kasus 4 — Kemacetan Pasar Tumpah Kawasan Gasibu – Monju (Tugas Besar Matematika Diskrit Lanjut, D4 Teknik Informatika POLBAN).
- **Titik Asal (Source / Titik Masuk Arus Kendaraan):**
  - **$S_1$ (Tamansari / Turun Flyover Pasupati):** Aliran kendaraan dari arah barat (Pasteur / Pasupati) yang turun di Jl. Tamansari.
  - **$S_2$ (Dipatiukur / Kawasan Kampus Unpad):** Aliran kendaraan dari arah utara (Dago Atas / Coblong) yang melintasi Jl. Dipati Ukur.
- **Titik Tujuan (Sink / Titik Keluar Arus Bebas):**
  - **$T_1$ (PUSDAI / Jl. Surapati Timur):** Akses keluar menuju Jalan Surapati bagian timur / Cicaheum.
  - **$T_2$ (Jl. Diponegoro Timur / Depan PUSDAI No. 61):** Akses keluar menuju Jalan Diponegoro bagian timur / Supratman.

---

## 2. Taksonomi Simpul Graf (Vertices / Nodes)

Berikut daftar lengkap seluruh simpul (titik terminal dan persimpangan peralihan jalan) dengan koordinat OpenStreetMap yang akurat:

| ID Simpul | Tipe | Nama Persimpangan / Titik | Latitude | Longitude |
|:---|:---:|:---|:---:|:---:|
| **S1** | Source | Turun Pasupati / Jl. Tamansari | -6.89550 | 107.60870 |
| **S2** | Source | Jl. Dipatiukur (Depan Kampus Unpad) | -6.89190 | 107.61758 |
| **T1** | Sink | PUSDAI / Jl. Surapati Timur | -6.89955 | 107.62709 |
| **T2** | Sink | Jl. Diponegoro Timur (No. 61 / Dekat PUSDAI) | -6.90115 | 107.62485 |
| **V_Cikapayang** | Junction | Simpang Jl. Tamansari – Jl. Cikapayang | -6.89806 | 107.60967 |
| **V_Sulanjana** | Junction | Simpang Jl. Tamansari – Jl. Sulanjana | -6.89950 | 107.60997 |
| **V_DU_Selatan** | Junction | Simpang Jl. Cikapayang – Jl. Dipatiukur Selatan | -6.89885 | 107.61283 |
| **V_Hasanuddin** | Junction | Simpang Jl. Dipatiukur – Jl. Hasanuddin | -6.89474 | 107.61743 |
| **V_Djuanda_Hasanuddin** | Junction | Simpang Jl. Hasanuddin – Jl. Ir. H. Djuanda (Dago) | -6.89492 | 107.61321 |
| **V_Djuanda_Diponegoro** | Junction | Simpang Dago / Sulanjana – Jl. Diponegoro Barat | -6.90025 | 107.61262 |
| **V_Singaperbangsa** | Junction | Simpang Jl. Dipatiukur – Jl. Singaperbangsa | -6.89559 | 107.61688 |
| **V_Titiran** | Junction | Simpang Jl. Singaperbangsa – Jl. Titiran | -6.89543 | 107.61898 |
| **V_Merak** | Junction | Simpang Jl. Titiran – Jl. Merak | -6.89761 | 107.62025 |
| **V_Surapati_Merak** | Junction | Simpang Jl. Merak – Jl. Surapati | -6.89928 | 107.62032 |
| **V_Tikukur** | Junction | Simpang Jl. Titiran – Jl. Tikukur | -6.89718 | 107.62153 |
| **V_Gagak** | Junction | Simpang Jl. Tikukur / Puyuh – Jl. Gagak | -6.89810 | 107.62387 |
| **V_Surapati_Gagak** | Junction | Simpang Jl. Gagak – Jl. Surapati | -6.89923 | 107.62373 |
| **V_AriaJipang** | Junction | Simpang Jl. Diponegoro – Jl. Aria Jipang | -6.90063 | 107.61507 |
| **V_Cilamaya** | Junction | Simpang Jl. Diponegoro – Jl. Cilamaya | -6.90134 | 107.61697 |
| **V_Cimandiri** | Junction | Simpang Jl. Cilamaya – Jl. Cimandiri | -6.90351 | 107.61725 |
| **V_Cisanggarung** | Junction | Simpang Jl. Cimandiri – Jl. Cisanggarung | -6.90334 | 107.62020 |
| **V_Citarum** | Junction | Simpang Jl. Cisanggarung – Jl. Citarum | -6.90449 | 107.62250 |
| **V_Cisangkuy** | Junction | Simpang Jl. Cisanggarung / Cimanuk – Jl. Cisangkuy | -6.90276 | 107.62191 |
| **V_Gasibu_Barat** | Junction | Simpang Jl. Surapati – Gasibu Atas Barat | -6.89926 | 107.61843 |
| **V_Gasibu_Timur** | Junction | Simpang Jl. Surapati – Jl. Sentot Alibasyah (Gasibu Atas Timur) | -6.89932 | 107.61927 |
| **V_Diponegoro_Sentot** | Junction | Simpang Jl. Sentot Alibasyah – Jl. Diponegoro (Museum Geologi) | -6.90119 | 107.61942 |

### Transformasi Graf Multi-Source Multi-Sink (Supersource $S^*$ dan Supersink $T^*$)

Dalam teori graf jaringan aliran (*network flow*), sistem pengalihan arus lalu lintas Kasus 4 memiliki 2 titik sumber masuk ($S_1, S_2$) dan 2 titik muara keluar ($T_1, T_2$). Untuk menyelesaikan persoalan aliran maksimum (*Maximum Flow*) dan pemotongan minimum (*Minimum Cut*) menggunakan algoritma standar seperti **Ford-Fulkerson** atau **Edmonds-Karp**, graf multi-terminal ini ditransformasikan ke bentuk kanonikal *Single-Source Single-Sink* standar:

1. **Simpul Semu Supersource ($S^*$):**
   - Menambahkan satu simpul semu $S^*$ (*Super Source*).
   - Menambahkan dua busur terarah baru:
     - $(S^* \to S_1)$ dengan kapasitas $c(S^*, S_1) = \text{inflow}(S_1)$ atau $\infty$.
     - $(S^* \to S_2)$ dengan kapasitas $c(S^*, S_2) = \text{inflow}(S_2)$ atau $\infty$.
2. **Simpul Semu Supersink ($T^*$):**
   - Menambahkan satu simpul semu $T^*$ (*Super Sink*).
   - Menambahkan dua busur terarah baru:
     - $(T_1 \to T^*)$ dengan kapasitas $c(T_1, T^*) = \text{outflow}(T_1)$ atau $\infty$.
     - $(T_2 \to T^*)$ dengan kapasitas $c(T_2, T^*) = \text{outflow}(T_2)$ atau $\infty$.

Dengan transformasi ini, kapasitas total jaringan dihitung sebagai aliran maksimum tunggal dari $S^* \to T^*$:
$$\text{MaxFlow}(S^* \to T^*) = \sum_{e \in \text{out}(S^*)} f(e) = \sum_{e \in \text{in}(T^*)} f(e)$$

### Konvensi Notasi Simpul Graf
- **ID Teknis di Kode/Data:** String pengenal teknis seperti `S1`, `S2`, `T1`, `T2`, dan `V_Singaperbangsa`, `V_DU_Selatan`.
- **Notasi Matematika Baku:** Ditulis sebagai subskrip yang rapi:
  - Sumber: $S_1, S_2$
  - Muara: $T_1, T_2$
  - Simpul persimpangan: $V_{\text{Singaperbangsa}}$, $V_{\text{DU\_Selatan}}$, dsb.
- **Tampilan Antarmuka Web (UI):** Di-render secara proper menggunakan tag HTML subskrip (`V<sub>Singaperbangsa</sub>`) atau simbol Unicode ($S_1, S_2 \to T_1, T_2$), bukan string mentah dengan karakter garis bawah (*raw underscore*).

---

## 3. Rincian 8 Path Aliran Terarah (Directed Flow Paths)

### Metodologi Penentuan Lebar Jalan dan Arah Lalu Lintas (Berdasarkan OpenStreetMap)
Mengacu pada data faktual OpenStreetMap (OSM API & Way tags serta Diskusi Komunitas OSM #133623):
1. **Nilai Terukur (Measured Width):** Diambil langsung dari tag OSM `width` (misal Jl. Titiran: 3 meter, Jl. Merak: 4 meter, Jl. Tikukur: 3 meter, Jl. Gagak: 3 meter).
2. **Nilai Inferensi Lajur (Inferred Width):** Untuk jalan tanpa tag `width`, dihitung berdasarkan tag `lanes` dikalikan standar lebar lajur perkotaan (3,5 meter untuk Trunk/Primary, 3,0 meter untuk Secondary/Tertiary, 2,5 meter untuk Residential). Contohnya Jl. Surapati memiliki 3 lajur trunk (~11 meter) dan Jl. Diponegoro memiliki 4 lajur primary (~14 meter).
3. **Koreksi 2 Jalur Independen (Independent Dual Carriageway):**
   - Untuk jalan dengan dua badan jalan terpisah oleh median fisik permanen, taman pemisah, atau konstruksi jalan layang (flyover) seperti **Jl. Ir. H. Djuanda (Dago)** dan **Jl. Cikapayang**, lebar jalan total yang sebelumnya tercatat (~12 meter) **dibagi 2 menjadi ~6 meter (1-2 lajur independen)** agar merepresentasikan kapasitas satu arah fisik yang dilalui graf.
   - Begitu pula pada **Jl. Diponegoro Barat**, total 4 lajur primary (~14 meter) terbagi median taman permanen menjadi dua jalur independen, sehingga kapasitas searah yang dilalui graf dihitung **dibagi 2 menjadi ~7 meter (2 lajur independen)** pada jalur selatan.
   - **Sifat Lajur Independen:** Arah yang dilalui graf adalah 1 arah pada jalur fisiknya sendiri (jalur barat ke selatan untuk Djuanda, jalur selatan ke timur untuk Cikapayang, dan jalur barat ke timur untuk Diponegoro Barat), terisolasi dari lalu lintas berlawanan arah.
4. **Klasifikasi Arah Ruas Jalan OpenStreetMap (OSM Directionality):**
   - **1 Arah Murni (Oneway, tag OSM `oneway=yes`):**
     Arus kendaraan bergerak satu arah secara legal dan fisik searah orientasi graf:
     - Jl. Dipati Ukur (Utara / Tengah)
     - Jl. Surapati (Trunk ke timur)
     - Jl. Sulanjana
     - Jl. Hasanuddin
     - Jl. Aria Jipang
     - Jl. Cilamaya
     - Jl. Cisanggarung
     - Jl. Cisangkuy
     - Jl. Citarum
     - Jl. Gagak
     - Jl. Sentot Alibasyah
   - **2 Arah Independen (Dual Carriageway):**
     Terdiri atas dua jalur fisik independen yang dipisahkan median permanen/flyover:
     - Jl. Cikapayang (total ~12 meter dibagi 2 $\to$ ~6 meter, 1-2 lajur independen)
     - Jl. Ir. H. Djuanda (total ~12 meter dibagi 2 $\to$ ~6 meter, 1-2 lajur independen)
     - Jl. Diponegoro Barat (total 4 lajur ~14 meter dibagi 2 $\to$ ~7 meter lajur selatan, 2 lajur independen)
   - **2 Arah Bersama (Shared Lanes, tag OSM `oneway=no`):**
     Satu badan jalan dipakai bersama oleh dua arah arus kendaraan yang saling berpapasan tanpa pembatas/median fisik:
     - Turun Pasupati / Jl. Tamansari
     - Jl. Dipatiukur (Selatan)
     - Jl. Singaperbangsa
     - Jl. Titiran
     - Jl. Merak
     - Jl. Tikukur
     - Jl. Cimandiri
5. **Catatan Parameter Kapasitas Efektif ($C$ / Effective Lane Width):**
   - Pada semua ruas bertipe **2 Arah Bersama (Shared Lanes)**, dicantumkan catatan eksplisit:
     > **"Nilai C (Effective Lane Width) untuk konteks masalah ini belum ditentukan (masih open-ended question)"**
   - **Rasionalisasi:** Pada ruas *shared lanes*, kapasitas efektif bersih yang tersedia untuk menampung arus pengalihan sangat dipengaruhi oleh fluktuasi arus kendaraan dari arah berlawanan, waktu tunda akibat manuver berpapasan kendaraan di badan jalan sempit (lebar 3–6 meter), serta friksi hambatan samping (seperti parkir liar di badan jalan dan aktivitas pertokoan/pemukiman). Oleh karena itu, penentuan nilai numerik kapasitas pasti ($C$) memerlukan survei lapangan dinamis lebih lanjut.

### Path 1: S1-T1 (`S1 (Pasupati / Tamansari) → T1 (PUSDAI / Surapati Timur)`)
- **Karakteristik:** Jarak ±3,4 km • Estimasi waktu tempuh ±11 menit • Warna Visual: Hijau (`#10b981`).
- **Urutan Nama Jalan:**
  1. Turun Pasupati/Jl. Tamansari
  2. Jl. Dipatiukur
  3. Jl. Singaperbangsa
  4. Jl. Titiran
  5. Jl. Tikukur
  6. Jl. Gagak
  7. PUSDAI/Surapati Timur
- **Urutan Simpul Graf:**  
  `S1` $\to$ `V_Cikapayang` $\to$ `V_DU_Selatan` $\to$ `V_Singaperbangsa` $\to$ `V_Titiran` $\to$ `V_Tikukur` $\to$ `V_Gagak` $\to$ `V_Surapati_Gagak` $\to$ `T1`
- **Daftar Edge Terarah & Kapasitas Jalan:**

| Ruas Jalan / Edge | Simpul Asal ($u$) | Simpul Tujuan ($v$) | Lebar Jalan | Jumlah Lajur | Klasifikasi OSM | Kapasitas Relatif & Catatan Arah |
|:---|:---:|:---:|:---:|:---:|:---:|:---|
| **Turun Pasupati / Jl. Tamansari** | `S1` | `V_Cikapayang` | ~7-8 meter (total dua arah) | 2 lajur | Secondary (2 Arah Bersama / Shared Lanes, `oneway=no`) | Sedang (500 kend/jam) — *Nilai C (Effective Lane Width) untuk konteks masalah ini belum ditentukan (masih open-ended question)* |
| **Jl. Cikapayang** | `V_Cikapayang` | `V_DU_Selatan` | ~6 meter (total ~12m dibagi 2) | 1-2 lajur independen | Primary (2 Arah Independen / Dual Carriageway) | Tinggi (1200 kend/jam) — Jalur selatan mandiri ke arah timur |
| **Jl. Dipatiukur (Selatan)** | `V_DU_Selatan` | `V_Singaperbangsa` | ~8 meter (total dua arah) | 2 lajur | Secondary (2 Arah Bersama / Shared Lanes, `oneway=no`) | Sedang (500 kend/jam) — *Nilai C (Effective Lane Width) untuk konteks masalah ini belum ditentukan (masih open-ended question)* |
| **Jl. Singaperbangsa** | `V_Singaperbangsa` | `V_Titiran` | ~4-5 meter (total dua arah) | 1-2 lajur | Residential (2 Arah Bersama / Shared Lanes, `oneway=no`) | Rendah (250 kend/jam) — *Nilai C (Effective Lane Width) untuk konteks masalah ini belum ditentukan (masih open-ended question)* |
| **Jl. Titiran** | `V_Titiran` | `V_Tikukur` | 3 meter (OSM) | 1 lajur | Residential (2 Arah Bersama / Shared Lanes, `oneway=no`) | Sangat Rendah (150 kend/jam) — *Nilai C (Effective Lane Width) untuk konteks masalah ini belum ditentukan (masih open-ended question)* |
| **Jl. Tikukur** | `V_Tikukur` | `V_Gagak` | 3 meter (OSM) | 1 lajur | Residential (2 Arah Bersama / Shared Lanes, `oneway=no`) | Sangat Rendah (150 kend/jam) — *Nilai C (Effective Lane Width) untuk konteks masalah ini belum ditentukan (masih open-ended question)* |
| **Jl. Gagak** | `V_Gagak` | `V_Surapati_Gagak` | 3 meter (OSM) | 1 lajur (oneway) | Residential (1 Arah Murni, `oneway=yes`) | Sangat Rendah (150 kend/jam) |
| **Jl. Surapati $\to$ PUSDAI** | `V_Surapati_Gagak` | `T1` | ~11 meter | 3 lajur (oneway trunk) | Trunk (1 Arah Murni, `oneway=yes`) | Sangat Tinggi (1800 kend/jam) |

---

### Path 2: S1-T2 (`S1 (Pasupati / Tamansari) → T2 (Diponegoro)`)
- **Karakteristik:** Jarak ±3,1 km • Estimasi waktu tempuh ±9 menit • Warna Visual: Merah Muda (`#ec4899`).
- **Urutan Nama Jalan:**
  1. Turun Pasupati/Jl. Tamansari
  2. Jl. Sulanjana
  3. Jl. Aria Jipang
  4. Jl. Cilamaya
  5. Jl. Cimandiri
  6. Jl. Cisanggarung
  7. Jl. Cisangkuy
  8. Jl. Diponegoro Timur/Pusdai
- **Urutan Simpul Graf:**  
  `S1` $\to$ `V_Sulanjana` $\to$ `V_Djuanda_Diponegoro` $\to$ `V_AriaJipang` $\to$ `V_Cilamaya` $\to$ `V_Cimandiri` $\to$ `V_Cisanggarung` $\to$ `V_Cisangkuy` $\to$ `T2`
- **Daftar Edge Terarah & Kapasitas Jalan:**

| Ruas Jalan / Edge | Simpul Asal ($u$) | Simpul Tujuan ($v$) | Lebar Jalan | Jumlah Lajur | Klasifikasi OSM | Kapasitas Relatif & Catatan Arah |
|:---|:---:|:---:|:---:|:---:|:---:|:---|
| **Turun Pasupati / Jl. Tamansari** | `S1` | `V_Sulanjana` | ~7-8 meter (total dua arah) | 2 lajur | Secondary (2 Arah Bersama / Shared Lanes, `oneway=no`) | Sedang (500 kend/jam) — *Nilai C (Effective Lane Width) untuk konteks masalah ini belum ditentukan (masih open-ended question)* |
| **Jl. Sulanjana** | `V_Sulanjana` | `V_Djuanda_Diponegoro` | ~6 meter | 2 lajur | Tertiary (1 Arah Murni, `oneway=yes`) | Sedang (400 kend/jam) |
| **Jl. Diponegoro (Barat)** | `V_Djuanda_Diponegoro` | `V_AriaJipang` | ~7 meter (total 4 lajur primary ~14m dibagi 2) | 2 lajur independen (lajur selatan) | Primary (2 Arah Independen / Dual Carriageway) | Sangat Tinggi (1600 kend/jam) — Jalur selatan mandiri ke arah timur |
| **Jl. Aria Jipang** | `V_AriaJipang` | `V_Cilamaya` | ~6 meter | 2 lajur | Tertiary (1 Arah Murni, `oneway=yes`) | Sedang (350 kend/jam) |
| **Jl. Cilamaya** | `V_Cilamaya` | `V_Cimandiri` | ~7 meter | 2 lajur (oneway) | Tertiary (1 Arah Murni, `oneway=yes`) | Sedang (450 kend/jam) |
| **Jl. Cimandiri** | `V_Cimandiri` | `V_Cisanggarung` | ~6 meter (total dua arah) | 2 lajur | Tertiary (2 Arah Bersama / Shared Lanes, `oneway=no`) | Sedang (400 kend/jam) — *Nilai C (Effective Lane Width) untuk konteks masalah ini belum ditentukan (masih open-ended question)* |
| **Jl. Cisanggarung $\to$ Jl. Cimanuk** | `V_Cisanggarung` | `V_Cisangkuy` | ~6 meter | 2 lajur (oneway) | Tertiary (1 Arah Murni, `oneway=yes`) | Sedang (400 kend/jam) |
| **Jl. Cisangkuy $\to$ Jl. Diponegoro Timur** | `V_Cisangkuy` | `T2` | ~7 meter | 2 lajur (oneway) | Tertiary (1 Arah Murni, `oneway=yes`) | Sedang (450 kend/jam) |

---

### Path 3: S2-T1 (`S2 (Dipatiukur) → T1 (PUSDAI / Surapati Timur)`)
- **Karakteristik:** Jarak ±2,3 km • Estimasi waktu tempuh ±8 menit • Warna Visual: Biru (`#3b82f6`).
- **Urutan Nama Jalan:**
  1. Jalan Dipati Ukur
  2. Belok Kanan Jl. Singaperbangsa
  3. Jl. Titiran
  4. Jl. Merak
  5. Jl. Surapati
  6. PUSDAI
- **Urutan Simpul Graf:**  
  `S2` $\to$ `V_Singaperbangsa` $\to$ `V_Titiran` $\to$ `V_Merak` $\to$ `V_Surapati_Merak` $\to$ `T1`
- **Daftar Edge Terarah & Kapasitas Jalan:**

| Ruas Jalan / Edge | Simpul Asal ($u$) | Simpul Tujuan ($v$) | Lebar Jalan | Jumlah Lajur | Klasifikasi OSM | Kapasitas Relatif & Catatan Arah |
|:---|:---:|:---:|:---:|:---:|:---:|:---|
| **Jl. Dipati Ukur (Utara)** | `S2` | `V_Singaperbangsa` | ~8 meter | 2 lajur | Secondary (1 Arah Murni, `oneway=yes`) | Sedang (500 kend/jam) |
| **Jl. Singaperbangsa** | `V_Singaperbangsa` | `V_Titiran` | ~4-5 meter (total dua arah) | 1-2 lajur | Residential (2 Arah Bersama / Shared Lanes, `oneway=no`) | Rendah (250 kend/jam) — *Nilai C (Effective Lane Width) untuk konteks masalah ini belum ditentukan (masih open-ended question)* |
| **Jl. Titiran** | `V_Titiran` | `V_Merak` | 3 meter (OSM) | 1 lajur | Residential (2 Arah Bersama / Shared Lanes, `oneway=no`) | Sangat Rendah (150 kend/jam) — *Nilai C (Effective Lane Width) untuk konteks masalah ini belum ditentukan (masih open-ended question)* |
| **Jl. Merak** | `V_Merak` | `V_Surapati_Merak` | 4 meter (OSM) | 2 lajur | Residential (2 Arah Bersama / Shared Lanes, `oneway=no`) | Rendah (200 kend/jam) — *Nilai C (Effective Lane Width) untuk konteks masalah ini belum ditentukan (masih open-ended question)* |
| **Jl. Surapati** | `V_Surapati_Merak` | `T1` | ~11 meter | 3 lajur (oneway trunk) | Trunk (1 Arah Murni, `oneway=yes`) | Sangat Tinggi (1800 kend/jam) |

---

### Path 4: S2-T2 (`S2 (Dipatiukur) → T2 (Diponegoro)`)
- **Karakteristik:** Jarak ±3,8 km • Estimasi waktu tempuh ±10 menit • Warna Visual: Oranye (`#f59e0b`).
- **Urutan Nama Jalan:**
  1. Jalan Dipati Ukur
  2. Jl. Hasanuddin
  3. Jl. Ir H Djuanda
  4. Jl. Diponegoro
  5. Jl. Aria Jipang
  6. Jl. Cilamaya
  7. Jl. Cimandiri
  8. Jl. Cisanggarung
  9. Jl. Citarum
  10. Jl. Diponegoro Timur
- **Urutan Simpul Graf:**  
  `S2` $\to$ `V_Hasanuddin` $\to$ `V_Djuanda_Hasanuddin` $\to$ `V_Djuanda_Diponegoro` $\to$ `V_AriaJipang` $\to$ `V_Cilamaya` $\to$ `V_Cimandiri` $\to$ `V_Cisanggarung` $\to$ `V_Citarum` $\to$ `T2`
- **Daftar Edge Terarah & Kapasitas Jalan:**

| Ruas Jalan / Edge | Simpul Asal ($u$) | Simpul Tujuan ($v$) | Lebar Jalan | Jumlah Lajur | Klasifikasi OSM | Kapasitas Relatif & Catatan Arah |
|:---|:---:|:---:|:---:|:---:|:---:|:---|
| **Jl. Dipati Ukur (Tengah)** | `S2` | `V_Hasanuddin` | ~8 meter | 2 lajur | Secondary (1 Arah Murni, `oneway=yes`) | Sedang (500 kend/jam) |
| **Jl. Hasanuddin** | `V_Hasanuddin` | `V_Djuanda_Hasanuddin` | ~6 meter | 2 lajur | Tertiary (1 Arah Murni, `oneway=yes`) | Sedang (400 kend/jam) |
| **Jl. Ir. H. Djuanda (Dago)** | `V_Djuanda_Hasanuddin` | `V_Djuanda_Diponegoro` | ~6 meter (total ~12m dibagi 2) | 1-2 lajur independen | Primary (2 Arah Independen / Dual Carriageway) | Tinggi (1200 kend/jam) — Jalur barat mandiri ke arah selatan |
| **Jl. Diponegoro (Barat)** | `V_Djuanda_Diponegoro` | `V_AriaJipang` | ~7 meter (total 4 lajur primary ~14m dibagi 2) | 2 lajur independen (lajur selatan) | Primary (2 Arah Independen / Dual Carriageway) | Sangat Tinggi (1600 kend/jam) — Jalur selatan mandiri ke arah timur |
| **Jl. Aria Jipang** | `V_AriaJipang` | `V_Cilamaya` | ~6 meter | 2 lajur | Tertiary (1 Arah Murni, `oneway=yes`) | Sedang (350 kend/jam) |
| **Jl. Cilamaya** | `V_Cilamaya` | `V_Cimandiri` | ~7 meter | 2 lajur (oneway) | Tertiary (1 Arah Murni, `oneway=yes`) | Sedang (450 kend/jam) |
| **Jl. Cimandiri** | `V_Cimandiri` | `V_Cisanggarung` | ~6 meter (total dua arah) | 2 lajur | Tertiary (2 Arah Bersama / Shared Lanes, `oneway=no`) | Sedang (400 kend/jam) — *Nilai C (Effective Lane Width) untuk konteks masalah ini belum ditentukan (masih open-ended question)* |
| **Jl. Cisanggarung** | `V_Cisanggarung` | `V_Citarum` | ~6 meter | 2 lajur (oneway) | Tertiary (1 Arah Murni, `oneway=yes`) | Sedang (400 kend/jam) |
| **Jl. Citarum $\to$ Jl. Diponegoro Timur** | `V_Citarum` | `T2` | ~7 meter | 2 lajur (oneway) | Tertiary (1 Arah Murni, `oneway=yes`) | Sedang (450 kend/jam) |

---

### Path 5: S1-T1-Gasibu (`S1 (Pasupati / Tamansari) → T1 (PUSDAI / Surapati Timur) via Gasibu Atas`)
- **Karakteristik:** Jarak ±2,9 km • Estimasi waktu tempuh ±7 menit • Warna Visual: Cyan (`#06b6d4`).
- **Urutan Nama Jalan:**
  1. Turun Pasupati/Jl. Tamansari
  2. Jl. Cikapayang
  3. Jl. Surapati (Barat)
  4. Jl. Gasibu Atas (Jl. Surapati)
  5. Jl. Surapati (Depan Telkom)
  6. Jl. Surapati Timur
  7. PUSDAI/Surapati Timur
- **Urutan Simpul Graf:**  
  `S1` $\to$ `V_Cikapayang` $\to$ `V_DU_Selatan` $\to$ `V_Gasibu_Barat` $\to$ `V_Gasibu_Timur` $\to$ `V_Surapati_Merak` $\to$ `V_Surapati_Gagak` $\to$ `T1`
- **Daftar Edge Terarah & Kapasitas Jalan:**

| Ruas Jalan / Edge | Simpul Asal ($u$) | Simpul Tujuan ($v$) | Lebar Jalan | Jumlah Lajur | Klasifikasi OSM | Kapasitas Relatif & Catatan Arah |
|:---|:---:|:---:|:---:|:---:|:---:|:---|
| **Turun Pasupati / Jl. Tamansari** | `S1` | `V_Cikapayang` | ~7-8 meter (total dua arah) | 2 lajur | Secondary (2 Arah Bersama / Shared Lanes, `oneway=no`) | Sedang (500 kend/jam) — *Nilai C (Effective Lane Width) untuk konteks masalah ini belum ditentukan (masih open-ended question)* |
| **Jl. Cikapayang** | `V_Cikapayang` | `V_DU_Selatan` | ~6 meter (total ~12m dibagi 2) | 1-2 lajur independen | Primary (2 Arah Independen / Dual Carriageway) | Tinggi (1200 kend/jam) — Jalur selatan mandiri ke arah timur |
| **Jl. Surapati (Barat)** | `V_DU_Selatan` | `V_Gasibu_Barat` | ~7-10 meter | 2-3 lajur (oneway) | Primary / Trunk (1 Arah Murni, `oneway=yes`) | Tinggi (1400 kend/jam) — Jalur bawah flyover searah ke timur menuju Gasibu Atas |
| **Jl. Gasibu Atas (Jl. Surapati)** | `V_Gasibu_Barat` | `V_Gasibu_Timur` | ~11 meter | 3 lajur (oneway trunk) | Trunk (1 Arah Murni, `oneway=yes`) | Sangat Tinggi (1800 kend/jam) — Koridor utama sisi utara Lapangan Gasibu (rawan hambatan samping saat pasar tumpah) |
| **Jl. Surapati (Depan Telkom)** | `V_Gasibu_Timur` | `V_Surapati_Merak` | ~11 meter | 3 lajur (oneway trunk) | Trunk (1 Arah Murni, `oneway=yes`) | Sangat Tinggi (1800 kend/jam) |
| **Jl. Surapati Timur** | `V_Surapati_Merak` | `V_Surapati_Gagak` | ~11 meter | 3 lajur (oneway trunk) | Trunk (1 Arah Murni, `oneway=yes`) | Sangat Tinggi (1800 kend/jam) |
| **PUSDAI/Surapati Timur** | `V_Surapati_Gagak` | `T1` | ~11 meter | 3 lajur (oneway trunk) | Trunk (1 Arah Murni, `oneway=yes`) | Sangat Tinggi (1800 kend/jam) |

---

### Path 6: S1-T2-Gasibu (`S1 (Pasupati / Tamansari) → T2 (Diponegoro) via Gasibu Atas`)
- **Karakteristik:** Jarak ±2,8 km • Estimasi waktu tempuh ±8 menit • Warna Visual: Ungu (`#a855f7`).
- **Urutan Nama Jalan:**
  1. Turun Pasupati/Jl. Tamansari
  2. Jl. Cikapayang
  3. Jl. Surapati (Barat)
  4. Jl. Gasibu Atas (Jl. Surapati)
  5. Jl. Sentot Alibasyah
  6. Jl. Diponegoro Timur/Pusdai
- **Urutan Simpul Graf:**  
  `S1` $\to$ `V_Cikapayang` $\to$ `V_DU_Selatan` $\to$ `V_Gasibu_Barat` $\to$ `V_Gasibu_Timur` $\to$ `V_Diponegoro_Sentot` $\to$ `T2`
- **Daftar Edge Terarah & Kapasitas Jalan:**

| Ruas Jalan / Edge | Simpul Asal ($u$) | Simpul Tujuan ($v$) | Lebar Jalan | Jumlah Lajur | Klasifikasi OSM | Kapasitas Relatif & Catatan Arah |
|:---|:---:|:---:|:---:|:---:|:---:|:---|
| **Turun Pasupati / Jl. Tamansari** | `S1` | `V_Cikapayang` | ~7-8 meter (total dua arah) | 2 lajur | Secondary (2 Arah Bersama / Shared Lanes, `oneway=no`) | Sedang (500 kend/jam) — *Nilai C (Effective Lane Width) untuk konteks masalah ini belum ditentukan (masih open-ended question)* |
| **Jl. Cikapayang** | `V_Cikapayang` | `V_DU_Selatan` | ~6 meter (total ~12m dibagi 2) | 1-2 lajur independen | Primary (2 Arah Independen / Dual Carriageway) | Tinggi (1200 kend/jam) — Jalur selatan mandiri ke arah timur |
| **Jl. Surapati (Barat)** | `V_DU_Selatan` | `V_Gasibu_Barat` | ~7-10 meter | 2-3 lajur (oneway) | Primary / Trunk (1 Arah Murni, `oneway=yes`) | Tinggi (1400 kend/jam) |
| **Jl. Gasibu Atas (Jl. Surapati)** | `V_Gasibu_Barat` | `V_Gasibu_Timur` | ~11 meter | 3 lajur (oneway trunk) | Trunk (1 Arah Murni, `oneway=yes`) | Sangat Tinggi (1800 kend/jam) |
| **Jl. Sentot Alibasyah** | `V_Gasibu_Timur` | `V_Diponegoro_Sentot` | ~7 meter | 2 lajur (oneway) | Primary (1 Arah Murni, `oneway=yes`) | Tinggi (900 kend/jam) — Sisi timur Lapangan Gasibu menuju Jl. Diponegoro |
| **Jl. Diponegoro Timur/Pusdai** | `V_Diponegoro_Sentot` | `T2` | ~7 meter | 2 lajur (oneway) | Primary (1 Arah Murni, `oneway=yes`) | Tinggi (1200 kend/jam) — Searah ke timur melewati depan Museum Geologi menuju $T_2$ |

---

### Path 7: S2-T1-Gasibu (`S2 (Dipatiukur) → T1 (PUSDAI / Surapati Timur) via Gasibu Atas`)
- **Karakteristik:** Jarak ±3,5 km • Estimasi waktu tempuh ±9 menit • Warna Visual: Hijau Muda / Lime (`#84cc16`).
- **Urutan Nama Jalan:**
  1. Jalan Dipati Ukur
  2. Jl. Hasanuddin
  3. Jl. Ir. H. Djuanda
  4. Jl. Surapati (Barat)
  5. Jl. Gasibu Atas (Jl. Surapati)
  6. Jl. Surapati (Depan Telkom)
  7. Jl. Surapati Timur
  8. PUSDAI
- **Urutan Simpul Graf:**  
  `S2` $\to$ `V_Hasanuddin` $\to$ `V_Djuanda_Hasanuddin` $\to$ `V_DU_Selatan` $\to$ `V_Gasibu_Barat` $\to$ `V_Gasibu_Timur` $\to$ `V_Surapati_Merak` $\to$ `V_Surapati_Gagak` $\to$ `T1`
- **Daftar Edge Terarah & Kapasitas Jalan:**

| Ruas Jalan / Edge | Simpul Asal ($u$) | Simpul Tujuan ($v$) | Lebar Jalan | Jumlah Lajur | Klasifikasi OSM | Kapasitas Relatif & Catatan Arah |
|:---|:---:|:---:|:---:|:---:|:---:|:---|
| **Jalan Dipati Ukur** | `S2` | `V_Hasanuddin` | ~8 meter | 2 lajur (oneway) | Secondary (1 Arah Murni, `oneway=yes`) | Sedang (500 kend/jam) |
| **Jl. Hasanuddin** | `V_Hasanuddin` | `V_Djuanda_Hasanuddin` | ~6 meter | 2 lajur (oneway) | Tertiary (1 Arah Murni, `oneway=yes`) | Sedang (400 kend/jam) |
| **Jl. Ir. H. Djuanda** | `V_Djuanda_Hasanuddin` | `V_DU_Selatan` | ~6 meter (total ~12m dibagi 2) | 1-2 lajur independen | Primary (2 Arah Independen / Dual Carriageway) | Tinggi (1200 kend/jam) — Jalur barat mandiri ke arah selatan menuju Simpang Cikapayang/Surapati |
| **Jl. Surapati (Barat)** | `V_DU_Selatan` | `V_Gasibu_Barat` | ~7-10 meter | 2-3 lajur (oneway) | Primary / Trunk (1 Arah Murni, `oneway=yes`) | Tinggi (1400 kend/jam) — Belok kiri dari Dago ke Jl. Surapati menuju Gasibu Atas |
| **Jl. Gasibu Atas (Jl. Surapati)** | `V_Gasibu_Barat` | `V_Gasibu_Timur` | ~11 meter | 3 lajur (oneway trunk) | Trunk (1 Arah Murni, `oneway=yes`) | Sangat Tinggi (1800 kend/jam) |
| **Jl. Surapati (Depan Telkom)** | `V_Gasibu_Timur` | `V_Surapati_Merak` | ~11 meter | 3 lajur (oneway trunk) | Trunk (1 Arah Murni, `oneway=yes`) | Sangat Tinggi (1800 kend/jam) |
| **Jl. Surapati Timur** | `V_Surapati_Merak` | `V_Surapati_Gagak` | ~11 meter | 3 lajur (oneway trunk) | Trunk (1 Arah Murni, `oneway=yes`) | Sangat Tinggi (1800 kend/jam) |
| **PUSDAI** | `V_Surapati_Gagak` | `T1` | ~11 meter | 3 lajur (oneway trunk) | Trunk (1 Arah Murni, `oneway=yes`) | Sangat Tinggi (1800 kend/jam) |

---

### Path 8: S2-T2-Gasibu (`S2 (Dipatiukur) → T2 (Diponegoro) via Gasibu Atas`)
- **Karakteristik:** Jarak ±3,4 km • Estimasi waktu tempuh ±9 menit • Warna Visual: Rose (`#f43f5e`).
- **Urutan Nama Jalan:**
  1. Jalan Dipati Ukur
  2. Jl. Hasanuddin
  3. Jl. Ir. H. Djuanda
  4. Jl. Surapati (Barat)
  5. Jl. Gasibu Atas (Jl. Surapati)
  6. Jl. Sentot Alibasyah
  7. Jl. Diponegoro Timur
- **Urutan Simpul Graf:**  
  `S2` $\to$ `V_Hasanuddin` $\to$ `V_Djuanda_Hasanuddin` $\to$ `V_DU_Selatan` $\to$ `V_Gasibu_Barat` $\to$ `V_Gasibu_Timur` $\to$ `V_Diponegoro_Sentot` $\to$ `T2`
- **Daftar Edge Terarah & Kapasitas Jalan:**

| Ruas Jalan / Edge | Simpul Asal ($u$) | Simpul Tujuan ($v$) | Lebar Jalan | Jumlah Lajur | Klasifikasi OSM | Kapasitas Relatif & Catatan Arah |
|:---|:---:|:---:|:---:|:---:|:---:|:---|
| **Jalan Dipati Ukur** | `S2` | `V_Hasanuddin` | ~8 meter | 2 lajur (oneway) | Secondary (1 Arah Murni, `oneway=yes`) | Sedang (500 kend/jam) |
| **Jl. Hasanuddin** | `V_Hasanuddin` | `V_Djuanda_Hasanuddin` | ~6 meter | 2 lajur (oneway) | Tertiary (1 Arah Murni, `oneway=yes`) | Sedang (400 kend/jam) |
| **Jl. Ir. H. Djuanda** | `V_Djuanda_Hasanuddin` | `V_DU_Selatan` | ~6 meter (total ~12m dibagi 2) | 1-2 lajur independen | Primary (2 Arah Independen / Dual Carriageway) | Tinggi (1200 kend/jam) — Jalur barat mandiri ke arah selatan menuju Simpang Cikapayang/Surapati |
| **Jl. Surapati (Barat)** | `V_DU_Selatan` | `V_Gasibu_Barat` | ~7-10 meter | 2-3 lajur (oneway) | Primary / Trunk (1 Arah Murni, `oneway=yes`) | Tinggi (1400 kend/jam) — Belok kiri dari Dago ke Jl. Surapati menuju Gasibu Atas |
| **Jl. Gasibu Atas (Jl. Surapati)** | `V_Gasibu_Barat` | `V_Gasibu_Timur` | ~11 meter | 3 lajur (oneway trunk) | Trunk (1 Arah Murni, `oneway=yes`) | Sangat Tinggi (1800 kend/jam) |
| **Jl. Sentot Alibasyah** | `V_Gasibu_Timur` | `V_Diponegoro_Sentot` | ~7 meter | 2 lajur (oneway) | Primary (1 Arah Murni, `oneway=yes`) | Tinggi (900 kend/jam) |
| **Jl. Diponegoro Timur** | `V_Diponegoro_Sentot` | `T2` | ~7 meter | 2 lajur (oneway) | Primary (1 Arah Murni, `oneway=yes`) | Tinggi (1200 kend/jam) |

---

## 4. Analisis Ruas Jalan Bersama (Shared Edges & Bottleneck Max-Flow)

Untuk analisis pemodelan kapasitas jaringan aliran (*Network Flow*), beberapa ruas jalan dilalui bersama oleh lebih dari satu jalur. Ruas ini merupakan titik kritis (*bottleneck*) terjadinya kemacetan saat volume kendaraan dari kedua sumber bertemu. Dalam konteks rekayasa lalu lintas dan pemodelan matematis graf, karakteristik ruas bersama dibedakan secara tegas berdasarkan arah dan separasi fisiknya:

| Ruas Jalan / Edge | Simpul Asal ($u$) | Simpul Tujuan ($v$) | Lebar Jalan | Jumlah Lajur | Klasifikasi OSM & Arah | Kapasitas Relatif / Catatan Nilai C | Jalur yang Menggunakan | Dampak Kapasitas Graf |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---|
| **Jl. Singaperbangsa** | `V_Singaperbangsa` | `V_Titiran` | ~4-5 meter | 1-2 lajur | Residential (2 Arah Bersama / Shared Lanes, `oneway=no`) | Rendah (250 kend/jam) — **Nilai C (Effective Lane Width) untuk konteks masalah ini belum ditentukan (masih open-ended question)** | $P_1$ (S1-T1) & $P_3$ (S2-T1) | Arus kendaraan dari Pasupati ($P_1$) dan Dipatiukur utara ($P_3$) bertemu di jalan sempit Singaperbangsa menuju Titiran. Karena bertipe *shared lanes*, kapasitas efektif terbagi lagi dengan arus lokal arah berlawanan. |
| **Jl. Diponegoro Barat** | `V_Djuanda_Diponegoro` | `V_AriaJipang` | ~7 meter (total 4 lajur ~14m dibagi 2) | 2 lajur independen | Primary (2 Arah Independen / Dual Carriageway) | Sangat Tinggi (1600 kend/jam) | $P_2$ (S1-T2) & $P_4$ (S2-T2) | Arus dari Sulanjana ($P_2$) dan Dago ($P_4$) menyatu pada lajur selatan independen sebelum masuk kawasan Gedung Sate. Terlindung dari arus arah timur-barat oleh median. |
| **Jl. Cilamaya** | `V_Cilamaya` | `V_Cimandiri` | ~7 meter | 2 lajur (oneway) | Tertiary (1 Arah Murni, `oneway=yes`) | Sedang (450 kend/jam) | $P_2$ (S1-T2) & $P_4$ (S2-T2) | Segmen penghubung 1 arah penting di belakang Gedung Sate untuk menyalurkan gabungan arus $P_2$ dan $P_4$. |
| **Jl. Cimandiri** | `V_Cimandiri` | `V_Cisanggarung` | ~6 meter | 2 lajur | Tertiary (2 Arah Bersama / Shared Lanes, `oneway=no`) | Sedang (400 kend/jam) — **Nilai C (Effective Lane Width) untuk konteks masalah ini belum ditentukan (masih open-ended question)** | $P_2$ (S1-T2) & $P_4$ (S2-T2) | Jalan lokal yang menampung gabungan arus $P_2$ dan $P_4$. Sebagai *shared lanes*, jalan berisiko macet parah saat berpapasan dengan kendaraan lokal arah sebaliknya. |
| **Jl. Gasibu Atas (Jl. Surapati)** | `V_Gasibu_Barat` | `V_Gasibu_Timur` | ~11 meter | 3 lajur (oneway trunk) | Trunk (1 Arah Murni, `oneway=yes`) | Sangat Tinggi (1800 kend/jam) | $P_5$ (S1-T1-Gasibu), $P_6$ (S1-T2-Gasibu), $P_7$ (S2-T1-Gasibu), & $P_8$ (S2-T2-Gasibu) | Segmen bottleneck utama koridor Gasibu Atas (sisi utara Lapangan Gasibu) yang dilalui bersama oleh ke-4 rute Gasibu Atas baik dari $S_1$ maupun $S_2$. Rawan hambatan samping akibat penyeberang jalan dan aktivitas pasar tumpah di bahu jalan. |
| **Jl. Hasanuddin & Jl. Ir. H. Djuanda** | V_Hasanuddin → V_Djuanda_Hasanuddin → V_DU_Selatan | ~6 meter | 2 lajur | Tertiary (Oneway) & Primary (Dual Carriageway) | Sedang (400 kend/jam) & Tinggi (1200 kend/jam) | P4 (S2-T2), P7 (S2-T1-Gasibu), & P8 (S2-T2-Gasibu) | Menyalurkan 3 jalur sekaligus dari S2 menuju koridor Dago sebelum bercabang di V_DU_Selatan (belok kiri ke Jl. Surapati untuk P7 & P8, atau lurus ke Diponegoro untuk P4). |
| **Jl. Surapati (Barat)** | V_DU_Selatan | V_Gasibu_Barat | ~7-10 meter | 2-3 lajur (oneway) | Primary / Trunk (1 Arah Murni, oneway=yes) | Tinggi (1400 kend/jam) | P5, P6, P7, & P8 | Titik penyatuan seluruh 4 rute Gasibu Atas (dari S1 via Cikapayang dan dari S2 via Hasanuddin–Djuanda) menuju koridor Jalan Gasibu Atas. |
| **Jl. Sentot Alibasyah** | `V_Gasibu_Timur` | `V_Diponegoro_Sentot` | ~7 meter | 2 lajur (oneway) | Primary (1 Arah Murni, `oneway=yes`) | Tinggi (900 kend/jam) | $P_6$ (S1-T2-Gasibu) & $P_8$ (S2-T2-Gasibu) | Ruas penghubung sisi timur Lapangan Gasibu untuk membelokkan arus dari Jalan Gasibu Atas ke Jl. Diponegoro Timur menuju $T_2$, menampung aliran bersama $P_6$ dan $P_8$. |
| **Jl. Diponegoro Timur** | `V_Diponegoro_Sentot` | `T2` | ~7 meter | 2 lajur (oneway) | Primary (1 Arah Murni, `oneway=yes`) | Tinggi (1200 kend/jam) | $P_6$ (S1-T2-Gasibu) & $P_8$ (S2-T2-Gasibu) | Ruas jalan arteri satu arah melewati depan Museum Geologi menuju muara $T_2$, menampung aliran kendaraan dari koridor Gasibu Atas ($P_6$ dan $P_8$). |
| **Jl. Surapati Timur** | `V_Surapati_Merak` / `V_Surapati_Gagak` | `T1` | ~11 meter | 3 lajur (oneway) | Trunk (1 Arah Murni, `oneway=yes`) | Sangat Tinggi (1800 kend/jam) | $P_1$ (S1-T1), $P_3$ (S2-T1), $P_5$ (S1-T1-Gasibu), & $P_7$ (S2-T1-Gasibu) | Arus masuk ke tujuan akhir PUSDAI ($T_1$) dari rute alternatif luar ($P_1, P_3$) dan rute Gasibu Atas ($P_5, P_7$) menyatu di jalan arteri raya Surapati 3 lajur trunk searah. |

### Implikasi Pemodelan Max-Flow pada Tipe Ruas (Shared Lanes vs Independent Lanes vs Oneway)

1. **Ruas 2 Arah Bersama (Shared Lanes) — Bottleneck Terberat:**
   - Ruas seperti **Jl. Singaperbangsa**, **Jl. Titiran**, **Jl. Merak**, **Jl. Tikukur**, dan **Jl. Cimandiri** adalah badan jalan sempit (3–6 meter) tanpa median pemisah fisik.
   - Sesuai standar pemodelan matematis, kapasitas nominal jalan dua arah tidak dapat langsung dialokasikan 100% untuk aliran graf pengalihan arus. Arus balik (*counter-flow*) dari warga lokal dan kendaraan umum secara drastis memangkas lebar efektif lajur jalan.
   - Oleh sebab itu, dokumen ini menetapkan status: **"Nilai C (Effective Lane Width) untuk konteks masalah ini belum ditentukan (masih open-ended question)"** sebagai pengingat bagi pengambil kebijakan rekayasa lalu lintas bahwa ruas-ruas ini memerlukan intervensi operasional (misalnya memberlakukan *one-way* sementara pada jam pasar tumpah) sebelum kapasitas penuhnya dapat dimanfaatkan.

2. **Ruas 2 Arah Independen (Dual Carriageway) — Kapasitas Terproteksi:**
   - Ruas seperti **Jl. Cikapayang**, **Jl. Ir. H. Djuanda**, dan **Jl. Diponegoro Barat** memiliki pemisah fisik permanen (median beton/taman atau jalur bawah flyover).
   - Jalur yang dilalui graf diisolasi penuh dari lalu lintas arah berlawanan, sehingga pemodelan kapasitas realistis dilakukan dengan **membagi 2 lebar total badan jalan** (~6 meter untuk Cikapayang dan Djuanda; ~7 meter untuk Diponegoro Barat). Kapasitas terarah pada jalur ini stabil dan tidak terganggu arus balik.

3. **Ruas 1 Arah Murni (Oneway) — Efisiensi Maksimal Aliran:**
   - Ruas seperti **Jl. Dipati Ukur (Utara/Tengah)**, **Jl. Sulanjana**, **Jl. Hasanuddin**, **Jl. Aria Jipang**, **Jl. Cilamaya**, **Jl. Cisanggarung**, **Jl. Cisangkuy**, **Jl. Citarum**, **Jl. Gagak**, **Jl. Surapati**, **Jl. Sentot Alibasyah**, dan **Jl. Diponegoro Timur** telah memiliki regulasi satu arah (*oneway=yes*).
   - Seluruh lebar geometrik jalan didedikasikan penuh searah vektor graf tanpa risiko konflik berpapasan (*head-on conflict*), sehingga batas kapasitas (*upper bound*) murni ditentukan oleh lebar lajur dan kelancaran persimpangan keluar.

4. **Koridor Jalan Gasibu Atas & Sentot Alibasyah — Shared Bottleneck Rute Gasibu:**
   - Ruas **Jl. Gasibu Atas** (`V_Gasibu_Barat` $\to$ `V_Gasibu_Timur`) memiliki kapasitas tinggi (~11 meter, 3 lajur trunk), namun dilalui secara simultan oleh seluruh 4 rute Gasibu Atas ($P_5, P_6, P_7, P_8$). Jika volume dari $S_1$ dan $S_2$ sama-sama tinggi, segmen ini menjadi titik konsentrasi aliran terbesar pada jaringan.
   - Ruas **Jl. Sentot Alibasyah** (`V_Gasibu_Timur` $\to$ `V_Diponegoro_Sentot`) dengan lebar ~7 meter (2 lajur) menjadi bottleneck pembatas aliran bagi rute Gasibu Atas yang menuju $T_2$ ($P_6$ dan $P_8$), sebelum menyatu ke Jalan Diponegoro Timur.

---

## 5. Diagram Topologi Graf (Mermaid Flowchart)

```mermaid
flowchart TD
    subgraph Sources ["Sumber Aliran (Sources)"]
        S1["S1: Pasupati / Tamansari"]
        S2["S2: Dipatiukur (Unpad)"]
    end

    subgraph NorthCorridor ["Koridor Utara (Rute T1 Luar: P1 & P3)"]
        S2 -->|Jl. Dipatiukur| V_SPB["V_Singaperbangsa"]
        S1 -->|Jl. Tamansari| V_Ckp["V_Cikapayang"]
        V_Ckp -->|Jl. Cikapayang| V_DU_S["V_DU_Selatan"]
        V_DU_S -->|Jl. Dipatiukur| V_SPB

        V_SPB -->|Jl. Singaperbangsa (Shared)| V_Ttr["V_Titiran"]

        V_Ttr -->|Jl. Merak| V_Mrk["V_Merak"]
        V_Mrk -->|Jl. Merak| V_Sur_M["V_Surapati_Merak"]
        V_Sur_M -->|Jl. Surapati| T1["T1: PUSDAI / Surapati Timur"]

        V_Ttr -->|Jl. Tikukur| V_Tkk["V_Tikukur"]
        V_Tkk -->|Jl. Puyuh / Gagak| V_Ggk["V_Gagak"]
        V_Ggk -->|Jl. Gagak| V_Sur_G["V_Surapati_Gagak"]
        V_Sur_G -->|Jl. Surapati| T1
    end

    subgraph SouthCorridor ["Koridor Selatan (Rute T2 Luar: P2 & P4)"]
        S2 -->|Jl. Hasanuddin| V_Hsn["V_Hasanuddin"]
        V_Hsn -->|Jl. Ir. H. Djuanda| V_Dju_Dip["V_Djuanda_Diponegoro"]

        S1 -->|Jl. Sulanjana| V_Sul["V_Sulanjana"]
        V_Sul -->|Jl. Sulanjana| V_Dju_Dip

        V_Dju_Dip -->|Jl. Diponegoro (Shared)| V_AJ["V_AriaJipang"]
        V_AJ -->|Jl. Cilamaya (Shared)| V_Clm["V_Cilamaya"]
        V_Clm -->|Jl. Cimandiri (Shared)| V_Cmd["V_Cimandiri"]
        V_Cmd -->|Jl. Cisanggarung (Shared)| V_Csg["V_Cisanggarung"]

        V_Csg -->|Jl. Citarum| V_Ctr["V_Citarum"]
        V_Ctr -->|Jl. Diponegoro Timur| T2["T2: Jl. Diponegoro Timur"]

        V_Csg -->|Jl. Cimanuk / Cisangkuy| V_Csk["V_Cisangkuy"]
        V_Csk -->|Jl. Diponegoro Timur| T2
    end

    subgraph GasibuAtasCorridor ["Koridor Gasibu Atas (Rute P5, P6, P7, P8)"]
        V_Hsn -->|Jl. Ir. H. Djuanda (P7, P8)| V_DU_S
        V_DU_S -->|Jl. Surapati Barat (Shared 4 Rute)| V_GB["V_Gasibu_Barat"]
        V_GB -->|Jl. Gasibu Atas (Shared 4 Rute)| V_GT["V_Gasibu_Timur"]

        V_GT -->|Jl. Surapati (P5, P7)| V_Sur_M
        V_GT -->|Jl. Sentot Alibasyah (P6, P8)| V_DS["V_Diponegoro_Sentot"]
        V_DS -->|Jl. Diponegoro Timur| T2
    end

    subgraph Sinks ["Tujuan Aliran (Sinks)"]
        T1
        T2
    end
```

---

## 6. Template Prompt Siap Pakai untuk LLM (Prompt Template)

Salin teks berikut bersama isi dokumen ini ketika Anda ingin meminta LLM melakukan analisis pemodelan Matematika Diskrit:

> *"Berikut adalah spesifikasi jaringan aliran jalan (Directed Network Flow Graph) dari Kasus 4 Pasar Tumpah Kawasan Gasibu–Monju Bandung, mencakup 2 Source ($S_1, S_2$), 2 Sink ($T_1, T_2$), 22 Simpul Persimpangan (total 26 simpul), dan 8 Path aliran. Berdasarkan dokumen ini, mohon lakukan [PILIH: hitung Maximum Flow dengan menentukan kapasitas realistis tiap ruas / cari Minimum Cut bottleneck pemotongan arus / buat matriks ketetanggaan graf / rancang rute alternatif pengalihan arus]."*

---

## 7. Strategi Pengukuran Flow Kendaraan: CCTV Pelindung Bandung vs Survei Manual Lapangan

Untuk menghitung arus aktual (real traffic flow) kendaraan per jam pada model Maximum Flow, tim dapat memanfaatkan data streaming video daring dari sistem **Pelindung Bandung** (`https://pelindung.bandung.go.id/`) yang dikelola Diskominfo, Dishub, dan DPKP3 Kota Bandung, dikombinasikan dengan titik **Survei Manual (Rekam Lapangan)** pada ruas jalan perumahan/lingkungan yang tidak terjangkau CCTV publik.

### 7.1 Matriks 12 Titik Lokasi Pantau CCTV Pelindung Bandung (27 Kamera)

Daftar kamera berikut telah dipetakan langsung dengan koordinat dan ID streaming resmi dari portal `pelindung.bandung.go.id:8443/api/cek`:

| No | ID Simpul | Lokasi & Nama Kamera CCTV Pelindung | Instansi | Koordinat (Lat, Lng) | Peran Pengukuran Aliran (Network Flow) |
|:---:|:---:|:---|:---:|:---:|:---|
| 1 | **S1** | `CCTV ITB KEBUN BINATANG 01 / 02 / 03` | DISKOMINFO | -6.895500, 107.608700 | Menghitung inflow utama $S_1$ dari arah Jl. Tamansari Utara / turunan Pasupati |
| 2 | **V_Cikapayang** | `TAMAN PASUPATI_01 / 02` & `TAMAN SKETPARK_01 / 03` | DPKP3 | -6.898060, 107.609670 | Memantau turun Pasupati & percabangan aliran $S_1 \to$ Cikapayang (P3) vs Sulanjana (P4) |
| 3 | **V_Sulanjana** | `CCTV TAMAN SARI - WS 01 / 02` | DISKOMINFO | -6.899500, 107.609970 | Memantau volume belok kiri masuk Jl. Sulanjana (P4) |
| 4 | **S2** | `CCTV DIPATIUKUR SEKELOA 01 / 02` | DISKOMINFO | -6.891900, 107.617580 | Menghitung inflow utama $S_2$ di koridor Jl. Dipatiukur utara |
| 5 | **V_Djuanda_Hasanuddin** | `CCTV DAGO 2-SMA 1 01 / 02` | DISKOMINFO | -6.894920, 107.613210 | Menghitung arus P2 yang keluar dari Jl. Hasanuddin menuju Jl. Ir. H. Djuanda (Dago) |
| 6 | **V_DU_Selatan** | `CCTV DAGO 1-CIKAPAYANG 01` & `TM CIKAPAYANG DAGO_04` | DISKOMINFO | -6.898850, 107.612830 | Menghitung arus P3 masuk Dipatiukur Selatan dan arus P2 lurus di Dago |
| 7 | **V_Djuanda_Diponegoro** | `SP SULANJANA` | DISHUB | -6.900250, 107.612620 | Titik temu aliran P2 (Dago) dan P4 (Sulanjana) masuk ke Jl. Diponegoro Barat |
| 8 | **V_Surapati_Merak** | `CCTV GASIBU_01 / 02` & `SP TELKOM - Gasibu` | DISKOMINFO / DISHUB | -6.899280, 107.620320 | Memantau arus keluar Jl. Merak (P1) yang bergabung ke Jl. Surapati depan Gasibu |
| 9 | **V_Cisangkuy** | `TAMAN LANSIA` & `Taman Pustaka Bunga_03` | DPKP3 | -6.901230, 107.620840 | Memantau arus P4 di Jl. Cisangkuy simpang Jl. Diponegoro (utara/atas Taman Lansia) |
| 10 | **T1 & T2** | `CCTV PHH MUSTOFA-PUSDAI 01 / 02` & `CCTV PUSDAI 01 / 02` | DISKOMINFO | -6.899550, 107.627090 | Menghitung total outflow akhir pada Sink $T_1$ (Surapati Timur) dan $T_2$ (Diponegoro Timur) |
| 11 | **V_Gasibu_Barat** | `CCTV JL. SURAPATI - GASIBU 01` | DISKOMINFO | -6.898899, 107.616002 | Jalur Gasibu Atas (Path 5 sampai 8): menghitung arus Jl. Surapati (Barat) di ruas `V_DU_Selatan` ke `V_Gasibu_Barat` (kamera 4 m dari ruas, 271 m sebelum `V_Gasibu_Barat`, menghadap arah Gasibu) |
| 12 | **V_Gasibu_Timur** | `CCTV LAPANG GASIBU 02` | DISKOMINFO | -6.898644, 107.618605 | Jalur Gasibu Atas (Path 5 sampai 8): memantau arus Jl. Gasibu Atas di ruas `V_Gasibu_Barat` ke `V_Gasibu_Timur` (kamera 67 m dari ruas, 105 m dari `V_Gasibu_Timur`, menghadap arah Telkom Japati; ruas yang terlihat masih perlu dipastikan kelompok) |

Titik 11 dan 12 ditambahkan 13 Nov 2026 atas permintaan Hafiz untuk keempat jalur yang lewat Jalan Gasibu Atas. Keduanya dicari dari
`pelindung.bandung.go.id:8443/api/cek` dalam radius sekitar 300 m dari simpul dan ruas Path 5 sampai 8, lalu dicek hidup dengan ffprobe
dan dilihat satu frame-nya (13 Nov 2026 sekitar 18.24 WIB). Kamera lain di radius itu yang tidak dimasukkan: `CCTV JL. SURAPATI - GASIBU 02`
(hidup tetapi pada malam hari gambarnya tertutup silau lampu sehingga sudutnya belum bisa dipastikan, perlu dicek ulang siang hari),
`CCTV DAGO 3-BORROMEUS 01 / 02` (hidup tetapi menyorot Jl. Ir. H. Djuanda di utara simpang Hasanuddin yang tidak dilewati jalur, dan
simpang `V_Djuanda_Hasanuddin` sudah dipantau `CCTV DAGO 2-SMA 1`), `TAMAN LANSIA_02 / 03 / 04` (stream 404), dan `Lobby PDAM TIRTAWENING`
(kamera dalam ruangan). `CCTV GASIBU_02` dan `SP TELKOM - Gasibu` yang dekat `V_Gasibu_Timur` sudah tercatat di titik 8.

### 7.2 Matriks 6 Titik Wajib Survei Manual / Rekam Lapangan (Blind Spots)

Enam persimpangan berikut berada di kawasan perumahan/lingkungan sempit yang tidak memiliki fasilitas CCTV pemerintah, sehingga wajib disurvei atau direkam secara manual (misal 15 menit menggunakan kamera ponsel/tally counter):

| No | ID Simpul | Nama Titik Survei Manual Lapangan | Koordinat (Lat, Lng) | Alasan Teknis & Peran Validasi Aliran |
|:---:|:---:|:---|:---:|:---|
| 1 | **V_Singaperbangsa** | Simpang Dipatiukur – Singaperbangsa | -6.89559, 107.61688 | **Bottleneck Utama:** Tidak ada CCTV (337m dari Sekeloa). Wajib mengukur gabungan arus P1 (dari utara) + P3 (dari selatan) yang masuk ke Jl. Singaperbangsa selebar 4-5m. |
| 2 | **V_Titiran** | Simpang Singaperbangsa – Titiran | -6.89543, 107.61898 | **Percabangan Aliran:** Jalan perumahan lebar 3m. Wajib merekam proporsi pecahnya aliran ke Jl. Merak (P1) vs Jl. Tikukur (P3). |
| 3 | **V_Surapati_Gagak** | Simpang Keluar Jl. Gagak $\to$ Jl. Surapati | -6.89923, 107.62373 | **Outflow P3:** Tidak ada CCTV di mulut Jl. Gagak. Wajib merekam volume kendaraan yang keluar dari Jl. Gagak sebelum bergabung ke jalan arteri Surapati. |
| 4 | **V_Hasanuddin** | Simpang Jl. Dipatiukur – Jl. Hasanuddin | -6.89474, 107.61743 | **Percabangan S2:** Belokan masuk Jl. Hasanuddin tidak ter-cover CCTV Dipatiukur Sekeloa. Mengukur proporsi kendaraan S2 yang belok ke Hasanuddin (P2) vs lurus ke Singaperbangsa (P1). |
| 5 | **V_Cilamaya** | Simpang Jl. Diponegoro – Jl. Cilamaya | -6.90134, 107.61697 | **Samping Gedung Sate:** CCTV Gasibu terhalang gedung. Wajib merekam volume arus gabungan P2 + P4 yang beralih dari Diponegoro ke Jl. Cilamaya. |
| 6 | **V_Cisanggarung** | Simpang Jl. Cimandiri – Jl. Cisanggarung | -6.90334, 107.62020 | **Percabangan Koridor Belakang:** Mengukur pembagian kendaraan yang diarahkan ke Jl. Citarum (P2) vs Jl. Cisangkuy (P4). |

### 7.3 Optimasi Survei Menggunakan Hukum Kekekalan Aliran Kirchhoff

Dengan menerapkan Hukum Kekekalan Aliran (*Kirchhoff's Flow Law* / Node Conservation) $\sum f_{\text{in}}(v) = \sum f_{\text{out}}(v)$ pada simpul perantara, tim survei dapat meminimalkan titik rekam manual:
1. **Simpul $V_{\text{Singaperbangsa}}$:** $f(\text{Singaperbangsa}) = f(\text{S2} \to \text{SPB}) + f(\text{DU Selatan} \to \text{SPB})$. Karena $f(\text{DU Selatan})$ dapat divalidasi dari CCTV Dago Cikapayang, tim cukup menghitung flow pada simpang Singaperbangsa untuk memverifikasi akurasi konservasi aliran.
2. **Simpul $V_{\text{Titiran}}$:** $f(\text{Titiran}) = f(\text{Merak}) + f(\text{Tikukur})$. Karena arus keluar Jl. Merak terpantau jelas di CCTV Gasibu Telkom, volume arus yang masuk ke Jl. Tikukur dapat dihitung secara analitik: $f(\text{Tikukur}) = f(\text{Titiran}) - f(\text{Merak})$, sehingga survei pada Jl. Tikukur tidak perlu dilakukan di semua titik.
