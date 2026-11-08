# Web Visualisasi Max-Flow Pasar Tumpah Gasibu–Monju (Kasus 4)

Modul visualisasi web interaktif berbasis **Vue 3, TypeScript, Vite, Tailwind CSS, dan Leaflet** untuk pemodelan Matematika Diskrit Lanjut (POLBAN 2026).

---

## 🚀 Cara Menjalankan

Dari folder `visualizer/`:

```bash
# 1. Masuk ke direktori
cd visualizer

# 2. Pasang dependensi (menggunakan bun atau npm)
bun install
# atau: npm install

# 3. Jalankan server pengembangan lokal (Vite)
bun run dev
# atau: npm run dev
```

Buka URL lokal yang muncul (default: `http://localhost:5173/`).

### Perintah Lainnya:
- `bun run build`: Memeriksa tipe TypeScript dan membundel aset produksi ke `dist/`.
- `bun test` / `bun run test`: Menjalankan pengujian unit berbasis Vitest.
- `bun run convert:yaml`: Mengonversi `cases/scenarios/case_04_pasar_tumpah.yaml` ke `public/data/topology.json`.

---

## 📁 Struktur Direktori

```
visualizer/
├── public/
│   └── data/
│       ├── topology.json         # Topologi graf resmi (29 simpul, 36 busur)
│       ├── manifest.json         # Katalog trace skenario S-T dan nilai alpha (Tahap 4)
│       └── trace_*.json          # File rekaman langkah algoritma
├── scripts/
│   └── convert_yaml_to_topology.py  # Skrip konversi otomatis dari YAML skenario
├── src/
│   ├── assets/                   # Gambar atau ikon pendukung
│   ├── components/
│   │   ├── MapCanvas.vue         # Kanvas Leaflet + layer graf reaktif
│   │   ├── StepPlayer.vue        # Pemutar langkah augmentasi (Tahap 2)
│   │   └── EdgeTooltip.vue       # Tooltip inspeksi detail
│   ├── core/
│   │   ├── types.ts              # Kontrak tipe TypeScript (Topology, Trace, Step)
│   │   └── loader.ts             # Pemanggil file JSON data
│   ├── data/
│   │   └── labels.json           # Label kode simpul dan nama jalan fisik
│   ├── theme/
│   │   ├── tokens.ts             # Token warna tema pasar tumpah & skala gradasi
│   │   └── tokens.test.ts        # Unit test skala warna & tipe simpul
│   ├── App.vue                   # Tampilan utama visualisasi
│   ├── main.ts                   # Entrypoint Vue
│   └── style.css                 # Import Tailwind & styling Leaflet
└── package.json
```

---

## 🎨 Token Tema & Skala Warna Bersama
Warna dan gaya visual didefinisikan secara modular di [`src/theme/tokens.ts`](src/theme/tokens.ts):
- **Palet Pasar Tumpah:** Terakota (`#c2410c`), Kunyit (`#d97706`), Hijau Daun (`#15803d`), Krem (`#fef3c7`).
- **Gradasi Kepenuhan Ruas ($f / c$):**
  - $0\% - 30\%$: Hijau `#10b981` (Lancar)
  - $31\% - 60\%$: Lime `#84cc16` (Sedang)
  - $61\% - 85\%$: Kuning `#eab308` (Padat)
  - $86\% - 99\%$: Oranye `#f97316` (Sangat Padat)
  - $100\%$: Merah `#ef4444` (Jenuh / Saturated)
- **Ruas Khusus:**
  - Jl. Japati (Edge #8): Oranye terakota berpita pasar tumpah.
  - Jl. Singaperbangsa (Edge #20): Penutupan pagi hari pasar.

