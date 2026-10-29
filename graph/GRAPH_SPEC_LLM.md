# Jaringan Aliran Jalan (Network Flow Graph) — Kasus 4: Pasar Tumpah Kawasan Gasibu–Monju, Bandung

Dokumen ini berisi spesifikasi topologi graf terarah (*directed network flow*) yang merepresentasikan 4 jalur utama pengalihan arus kendaraan di sekitar kawasan Gasibu, Monumen Perjuangan (Monju), dan PUSDAI Kota Bandung. Dokumen ini dirancang agar dapat langsung dimasukkan ke dalam konteks LLM (Large Language Model) untuk analisis graf, kapasitas jalan, pemodelan *Maximum Flow / Minimum Cut* (algoritma Ford-Fulkerson / Edmonds-Karp), maupun perancangan rekayasa lalu lintas.

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

---

## 3. Rincian 4 Path Aliran Terarah (Directed Flow Paths)

### Metodologi Penentuan Lebar Jalan (Berdasarkan OpenStreetMap)
Mengacu pada standar OpenStreetMap (Diskusi Komunitas OSM #133623):
1. **Nilai Terukur (Measured Width):** Diambil langsung dari tag OSM `width` (misal Jl. Titiran: 3 meter, Jl. Merak: 4 meter, Jl. Tikukur: 3 meter, Jl. Gagak: 3 meter).
2. **Nilai Inferensi Lajur (Inferred Width):** Untuk jalan tanpa tag `width`, dihitung berdasarkan tag `lanes` dikalikan standar lebar lajur perkotaan (3,5 meter untuk Trunk/Primary, 3,0 meter untuk Secondary/Tertiary, 2,5 meter untuk Residential). Contohnya Jl. Surapati memiliki 3 lajur trunk (~11 meter) dan Jl. Diponegoro memiliki 4 lajur primary (~14 meter).

### Path 1: S2-T1 (`S2 (Dipatiukur) → T1 (PUSDAI / Surapati Timur)`)
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

| Ruas Jalan / Edge | Simpul Asal ($u$) | Simpul Tujuan ($v$) | Lebar Jalan | Jumlah Lajur | Klasifikasi OSM | Kapasitas Relatif |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Jl. Dipati Ukur (Utara)** | `S2` | `V_Singaperbangsa` | ~8 meter | 2 lajur | Secondary | Sedang (500 kend/jam) |
| **Jl. Singaperbangsa** | `V_Singaperbangsa` | `V_Titiran` | ~4-5 meter | 1-2 lajur | Residential | Rendah (250 kend/jam) |
| **Jl. Titiran** | `V_Titiran` | `V_Merak` | 3 meter (OSM) | 1 lajur | Residential | Sangat Rendah (150 kend/jam) |
| **Jl. Merak** | `V_Merak` | `V_Surapati_Merak` | 4 meter (OSM) | 2 lajur | Residential | Rendah (200 kend/jam) |
| **Jl. Surapati** | `V_Surapati_Merak` | `T1` | ~11 meter | 3 lajur (oneway trunk) | Trunk | Sangat Tinggi (1800 kend/jam) |

---

### Path 2: S2-T2 (`S2 (Dipatiukur) → T2 (Diponegoro)`)
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

| Ruas Jalan / Edge | Simpul Asal ($u$) | Simpul Tujuan ($v$) | Lebar Jalan | Jumlah Lajur | Klasifikasi OSM | Kapasitas Relatif |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Jl. Dipati Ukur (Tengah)** | `S2` | `V_Hasanuddin` | ~8 meter | 2 lajur | Secondary | Sedang (500 kend/jam) |
| **Jl. Hasanuddin** | `V_Hasanuddin` | `V_Djuanda_Hasanuddin` | ~6 meter | 2 lajur | Tertiary | Sedang (400 kend/jam) |
| **Jl. Ir. H. Djuanda (Dago)** | `V_Djuanda_Hasanuddin` | `V_Djuanda_Diponegoro` | ~12 meter | 3 lajur | Primary | Tinggi (1200 kend/jam) |
| **Jl. Diponegoro (Barat)** | `V_Djuanda_Diponegoro` | `V_AriaJipang` | ~14 meter | 4 lajur (primary) | Primary | Sangat Tinggi (1600 kend/jam) |
| **Jl. Aria Jipang** | `V_AriaJipang` | `V_Cilamaya` | ~6 meter | 2 lajur | Tertiary | Sedang (350 kend/jam) |
| **Jl. Cilamaya** | `V_Cilamaya` | `V_Cimandiri` | ~7 meter | 2 lajur (oneway) | Tertiary | Sedang (450 kend/jam) |
| **Jl. Cimandiri** | `V_Cimandiri` | `V_Cisanggarung` | ~6 meter | 2 lajur (oneway) | Tertiary | Sedang (400 kend/jam) |
| **Jl. Cisanggarung** | `V_Cisanggarung` | `V_Citarum` | ~6 meter | 2 lajur (oneway) | Tertiary | Sedang (400 kend/jam) |
| **Jl. Citarum $\to$ Jl. Diponegoro Timur** | `V_Citarum` | `T2` | ~7 meter | 2 lajur | Tertiary | Sedang (450 kend/jam) |

---

### Path 3: S1-T1 (`S1 (Pasupati / Tamansari) → T1 (PUSDAI / Surapati Timur)`)
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

| Ruas Jalan / Edge | Simpul Asal ($u$) | Simpul Tujuan ($v$) | Lebar Jalan | Jumlah Lajur | Klasifikasi OSM | Kapasitas Relatif |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Turun Pasupati / Jl. Tamansari** | `S1` | `V_Cikapayang` | ~7-8 meter | 2 lajur | Secondary | Sedang (500 kend/jam) |
| **Jl. Cikapayang** | `V_Cikapayang` | `V_DU_Selatan` | ~12 meter | 3 lajur | Primary | Tinggi (1200 kend/jam) |
| **Jl. Dipatiukur (Selatan)** | `V_DU_Selatan` | `V_Singaperbangsa` | ~8 meter | 2 lajur | Secondary | Sedang (500 kend/jam) |
| **Jl. Singaperbangsa** | `V_Singaperbangsa` | `V_Titiran` | ~4-5 meter | 1-2 lajur | Residential | Rendah (250 kend/jam) |
| **Jl. Titiran** | `V_Titiran` | `V_Tikukur` | 3 meter (OSM) | 1 lajur | Residential | Sangat Rendah (150 kend/jam) |
| **Jl. Tikukur** | `V_Tikukur` | `V_Gagak` | 3 meter (OSM) | 1 lajur | Residential | Sangat Rendah (150 kend/jam) |
| **Jl. Gagak** | `V_Gagak` | `V_Surapati_Gagak` | 3 meter (OSM) | 1 lajur (oneway) | Residential | Sangat Rendah (150 kend/jam) |
| **Jl. Surapati $\to$ PUSDAI** | `V_Surapati_Gagak` | `T1` | ~11 meter | 3 lajur (oneway trunk) | Trunk | Sangat Tinggi (1800 kend/jam) |

---

### Path 4: S1-T2 (`S1 (Pasupati / Tamansari) → T2 (Diponegoro)`)
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

| Ruas Jalan / Edge | Simpul Asal ($u$) | Simpul Tujuan ($v$) | Lebar Jalan | Jumlah Lajur | Klasifikasi OSM | Kapasitas Relatif |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Turun Pasupati / Jl. Tamansari** | `S1` | `V_Sulanjana` | ~7-8 meter | 2 lajur | Secondary | Sedang (500 kend/jam) |
| **Jl. Sulanjana** | `V_Sulanjana` | `V_Djuanda_Diponegoro` | ~6 meter | 2 lajur | Tertiary | Sedang (400 kend/jam) |
| **Jl. Diponegoro (Barat)** | `V_Djuanda_Diponegoro` | `V_AriaJipang` | ~14 meter | 4 lajur (primary) | Primary | Sangat Tinggi (1600 kend/jam) |
| **Jl. Aria Jipang** | `V_AriaJipang` | `V_Cilamaya` | ~6 meter | 2 lajur | Tertiary | Sedang (350 kend/jam) |
| **Jl. Cilamaya** | `V_Cilamaya` | `V_Cimandiri` | ~7 meter | 2 lajur (oneway) | Tertiary | Sedang (450 kend/jam) |
| **Jl. Cimandiri** | `V_Cimandiri` | `V_Cisanggarung` | ~6 meter | 2 lajur (oneway) | Tertiary | Sedang (400 kend/jam) |
| **Jl. Cisanggarung $\to$ Jl. Cimanuk** | `V_Cisanggarung` | `V_Cisangkuy` | ~6 meter | 2 lajur | Tertiary | Sedang (400 kend/jam) |
| **Jl. Cisangkuy $\to$ Jl. Diponegoro Timur** | `V_Cisangkuy` | `T2` | ~7 meter | 2 lajur (oneway) | Tertiary | Sedang (450 kend/jam) |

---

## 4. Analisis Ruas Jalan Bersama (Shared Edges & Bottleneck Max-Flow)

Untuk analisis pemodelan kapasitas jaringan aliran (*Network Flow*), beberapa ruas jalan dilalui bersama oleh lebih dari satu jalur. Ruas ini merupakan titik kritis (*bottleneck*) terjadinya kemacetan saat volume kendaraan dari kedua sumber bertemu:

| Ruas Jalan / Edge | Simpul Asal ($u$) | Simpul Tujuan ($v$) | Lebar Jalan | Jumlah Lajur | Klasifikasi OSM | Kapasitas Relatif | Jalur yang Menggunakan | Dampak Kapasitas Graf |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---|
| **Jl. Singaperbangsa** | `V_Singaperbangsa` | `V_Titiran` | ~4-5 meter | 1-2 lajur | Residential | Rendah (250 kend/jam) | $P_1$ (S2-T1) & $P_3$ (S1-T1) | Arus kendaraan dari Dipatiukur utara dan Pasupati bertemu di jalan sempit Singaperbangsa menuju Titiran. |
| **Jl. Diponegoro Barat** | `V_Djuanda_Diponegoro` | `V_AriaJipang` | ~14 meter | 4 lajur | Primary | Sangat Tinggi (1600 kend/jam) | $P_2$ (S2-T2) & $P_4$ (S1-T2) | Arus dari Dago dan Sulanjana menyatu sebelum masuk kawasan perkantoran/Gedung Sate. |
| **Jl. Cilamaya** | `V_Cilamaya` | `V_Cimandiri` | ~7 meter | 2 lajur (oneway) | Tertiary | Sedang (450 kend/jam) | $P_2$ (S2-T2) & $P_4$ (S1-T2) | Segmen penghubung penting di belakang Gedung Sate. |
| **Jl. Cimandiri** | `V_Cimandiri` | `V_Cisanggarung` | ~6 meter | 2 lajur (oneway) | Tertiary | Sedang (400 kend/jam) | $P_2$ (S2-T2) & $P_4$ (S1-T2) | Jalan lokal sempit yang menampung gabungan arus $P_2$ dan $P_4$. |
| **Jl. Surapati Timur** | `V_Surapati_Merak` / `V_Surapati_Gagak` | `T1` | ~11 meter | 3 lajur (oneway) | Trunk | Sangat Tinggi (1800 kend/jam) | $P_1$ (S2-T1) & $P_3$ (S1-T1) | Arus masuk ke tujuan PUSDAI dari Jl. Merak dan Jl. Gagak menyatu di jalan arteri Surapati. |


---

## 5. Diagram Topologi Graf (Mermaid Flowchart)

```mermaid
flowchart TD
    subgraph Sources ["Sumber Aliran (Sources)"]
        S1["S1: Pasupati / Tamansari"]
        S2["S2: Dipatiukur (Unpad)"]
    end

    subgraph NorthCorridor ["Koridor Utara (Rute T1)"]
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

    subgraph SouthCorridor ["Koridor Selatan (Rute T2)"]
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

    subgraph Sinks ["Tujuan Aliran (Sinks)"]
        T1
        T2
    end
```

---

## 6. Template Prompt Siap Pakai untuk LLM (Prompt Template)

Salin teks berikut bersama isi dokumen ini ketika Anda ingin meminta LLM melakukan analisis pemodelan Matematika Diskrit:

> *"Berikut adalah spesifikasi jaringan aliran jalan (Directed Network Flow Graph) dari Kasus 4 Pasar Tumpah Kawasan Gasibu–Monju Bandung, mencakup 2 Source ($S_1, S_2$), 2 Sink ($T_1, T_2$), 19 Simpul Persimpangan, dan 4 Path aliran. Berdasarkan dokumen ini, mohon lakukan [PILIH: hitung Maximum Flow dengan menentukan kapasitas realistis tiap ruas / cari Minimum Cut bottleneck pemotongan arus / buat matriks ketetanggaan graf / rancang rute alternatif pengalihan arus]."*

---

## 7. Strategi Pengukuran Flow Kendaraan: CCTV Pelindung Bandung vs Survei Manual Lapangan

Untuk menghitung arus aktual (real traffic flow) kendaraan per jam pada model Maximum Flow, tim dapat memanfaatkan data streaming video daring dari sistem **Pelindung Bandung** (`https://pelindung.bandung.go.id/`) yang dikelola Diskominfo, Dishub, dan DPKP3 Kota Bandung, dikombinasikan dengan titik **Survei Manual (Rekam Lapangan)** pada ruas jalan perumahan/lingkungan yang tidak terjangkau CCTV publik.

### 7.1 Matriks 10 Titik Lokasi Pantau CCTV Pelindung Bandung (24 Kamera)

Daftar kamera berikut telah dipetakan langsung dengan koordinat dan ID streaming resmi dari portal `pelindung.bandung.go.id:8443/api/cek`:

| No | ID Simpul | Lokasi & Nama Kamera CCTV Pelindung | Instansi | Koordinat (Lat, Lng) | Peran Pengukuran Aliran (Network Flow) |
|:---:|:---:|:---|:---:|:---:|:---|
| 1 | **S1** | `CCTV ITB KEBUN BINATANG 01 / 02 / 03` | DISKOMINFO | -6.893909, 107.608646 | Menghitung inflow utama $S_1$ dari arah Jl. Tamansari Utara / Flyover Pasupati |
| 2 | **V_Cikapayang** | `TAMAN PASUPATI_01 / 02` & `TAMAN SKETPARK_01 / 03` | DPKP3 | -6.897761, 107.609868 | Memantau turun Pasupati & percabangan aliran $S_1 \to$ Cikapayang (P3) vs Sulanjana (P4) |
| 3 | **V_Sulanjana** | `CCTV TAMAN SARI - WS 01 / 02` | DISKOMINFO | -6.900525, 107.609357 | Memantau volume belok kiri masuk Jl. Sulanjana (P4) |
| 4 | **S2** | `CCTV DIPATIUKUR SEKELOA 01 / 02` | DISKOMINFO | -6.892916, 107.618313 | Menghitung inflow utama $S_2$ di koridor Jl. Dipatiukur utara |
| 5 | **V_Djuanda_Hasanuddin** | `CCTV DAGO 2-SMA 1 01 / 02` | DISKOMINFO | -6.894972, 107.612795 | Menghitung arus P2 yang keluar dari Jl. Hasanuddin menuju Jl. Ir. H. Djuanda (Dago) |
| 6 | **V_DU_Selatan** | `CCTV DAGO 1-CIKAPAYANG 01` & `TM CIKAPAYANG DAGO_04` | DISKOMINFO | -6.899000, 107.612643 | Menghitung arus P3 masuk Dipatiukur Selatan dan arus P2 lurus di Dago |
| 7 | **V_Djuanda_Diponegoro** | `SP SULANJANA` | DISHUB | -6.900167, 107.612457 | Titik temu aliran P2 (Dago) dan P4 (Sulanjana) masuk ke Jl. Diponegoro Barat |
| 8 | **V_Surapati_Merak** | `CCTV GASIBU_01 / 02` & `SP TELKOM - Gasibu` | DISKOMINFO / DISHUB | -6.899248, 107.619846 | Memantau arus keluar Jl. Merak (P1) yang bergabung ke Jl. Surapati depan Gasibu |
| 9 | **V_Cisangkuy** | `TAMAN LANSIA` & `Taman Pustaka Bunga_03` | DPKP3 | -6.902141, 107.620938 | Memantau arus P4 di koridor belakang Gedung Sate (Cisangkuy & Citarum) |
| 10 | **T1 & T2** | `CCTV PHH MUSTOFA-PUSDAI 01 / 02` & `CCTV PUSDAI 01 / 02` | DISKOMINFO | -6.899439, 107.627107 | Menghitung total outflow akhir pada Sink $T_1$ (Surapati Timur) dan $T_2$ (Diponegoro Timur) |

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
