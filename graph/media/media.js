window.MEDIA_DATA = {
  diperbarui: "2026-11-13T18:30:00+07:00",
  // ID video kolase YouTube hasil program hitung kendaraan (semua rekaman diputar bersamaan). Selama null, pemutar
  // dan tombol "Lihat rekaman penuh di YouTube" tidak ditampilkan.
  youtube: { hp: null, cctv: null },
  cctv: {
    cctv_itb_bonbin: {
      status: "aman",
      catatan: "Awalnya tidak bisa dibuka. Sejak 1 Nov sudah jalan.",
      kamera: "CCTV ITB Kebun Binatang 01 (arah Pasopati)",
      klip: { src: "media/cctv/S1.mp4", poster: "media/cctv/S1.jpg", direkam: "2026-11-13T16:02:15+07:00", durasi_detik: 19 }
    },
    cctv_taman_pasupati: {
      status: "tidak bisa dibuka",
      catatan: "Kamera tidak bisa dibuka. Titik ini juga belum direkam manual karena lokasinya jauh.",
      kamera: "Taman Pasupati 01",
      klip: null
    },
    cctv_tamansari_ws: {
      status: "aman",
      catatan: "Kamera bisa dibuka. Masih dicek apakah titik ini masuk lingkup graf.",
      kamera: "CCTV Taman Sari - WS 01 (arah Sulanjana)",
      klip: { src: "media/cctv/V_Sulanjana.mp4", poster: "media/cctv/V_Sulanjana.jpg", direkam: "2026-11-13T16:02:13+07:00", durasi_detik: 18.5 }
    },
    cctv_du_sekeloa: {
      status: "aman",
      catatan: "Awalnya salah titik dan sudut kamera dari lawan arus yang dihitung (arus Unikom ke Gasibu). Sejak 1 Nov sudah jalan.",
      kamera: "CCTV Dipatiukur - Sekeloa 02 (arah Unikom)",
      klip: { src: "media/cctv/S2.mp4", poster: "media/cctv/S2.jpg", direkam: "2026-11-13T16:02:16+07:00", durasi_detik: 19.8 }
    },
    cctv_dago_sma1: {
      status: "aman",
      catatan: "Kamera bisa dibuka dan jalannya terlihat jelas.",
      kamera: "CCTV Dago 2 - SMA 1 01 (arah Borromeus)",
      klip: { src: "media/cctv/V_Djuanda_Hasanuddin.mp4", poster: "media/cctv/V_Djuanda_Hasanuddin.jpg", direkam: "2026-11-13T16:02:13+07:00", durasi_detik: 19 }
    },
    cctv_dago_cikapayang: {
      status: "aman",
      catatan: "Kamera bisa dibuka dan jalannya terlihat jelas.",
      kamera: "CCTV Dago 1 - Cikapayang 01 (arah perempatan Cikapayang)",
      klip: { src: "media/cctv/V_DU_Selatan.mp4", poster: "media/cctv/V_DU_Selatan.jpg", direkam: "2026-11-13T16:02:13+07:00", durasi_detik: 18.9 }
    },
    cctv_sp_sulanjana: {
      status: "tidak bisa dibuka",
      catatan: "Kamera tidak bisa dibuka. Titik ini juga belum direkam manual karena lokasinya jauh.",
      kamera: "SP Sulanjana",
      klip: null
    },
    cctv_gasibu_merak: {
      status: "aman",
      catatan: "Bisa dipakai, tetapi kamera dipasang tinggi dan sedikit tertutup kabel.",
      kamera: "CCTV Gasibu 01 (arah Cihaurgeulis)",
      klip: { src: "media/cctv/V_Surapati_Merak.mp4", poster: "media/cctv/V_Surapati_Merak.jpg", direkam: "2026-11-13T16:02:13+07:00", durasi_detik: 18.5 }
    },
    cctv_lansia_pustaka: {
      status: "tidak bisa dibuka",
      catatan: "Kamera tidak bisa dibuka. Titik ini juga belum direkam manual karena lokasinya jauh.",
      kamera: "Taman Lansia",
      klip: null
    },
    cctv_pusdai_sink: {
      status: "aman",
      catatan: "Dipakai untuk T1 dan T2. Sebagian jalan tertutup kabel dan kamera ada di belakang tiang. Jam di layar kamera ini tertinggal sekitar 20 menit dari waktu rekam.",
      kamera: "CCTV PHH Mustofa - PUSDAI 01 (arah perempatan Pahlawan)",
      klip: { src: "media/cctv/T1_T2.mp4", poster: "media/cctv/T1_T2.jpg", direkam: "2026-11-13T16:02:22+07:00", durasi_detik: 20 }
    },
    cctv_surapati_gasibu: {
      status: "baru, belum dicek kelompok",
      catatan: "Titik baru untuk jalur Gasibu Atas (P5 sampai P8). Kamera ada di Jl. Surapati bawah flyover sekitar 270 m sebelum simpang Gasibu Barat dan menghadap ke arah Gasibu, jadi kendaraan yang terlihat bergerak menjauhi kamera menuju Gasibu Atas. Direkam malam hari waktu lampu jalan sudah menyala.",
      kamera: "CCTV Jl. Surapati - Gasibu 01 (arah Gasibu)",
      klip: { src: "media/cctv/V_Gasibu_Barat.mp4", poster: "media/cctv/V_Gasibu_Barat.jpg", direkam: "2026-11-13T18:26:58+07:00", durasi_detik: 20 }
    },
    cctv_lapang_gasibu: {
      status: "baru, belum dicek kelompok",
      catatan: "Titik baru untuk jalur Gasibu Atas (P5 sampai P8). Kamera di sisi utara Lapangan Gasibu menghadap ke arah Telkom Japati dan memperlihatkan badan jalan dengan pulau jalan di depannya, jadi kelompok masih perlu memastikan ruas yang terlihat memang Jl. Gasibu Atas. Jam di layar kamera ini tertinggal sekitar 12 menit dari waktu rekam.",
      kamera: "CCTV Lapang Gasibu 02 (arah Telkom Japati)",
      klip: { src: "media/cctv/V_Gasibu_Timur.mp4", poster: "media/cctv/V_Gasibu_Timur.jpg", direkam: "2026-11-13T18:27:02+07:00", durasi_detik: 20 }
    }
  },
  manual: {
    manual_singaperbangsa: { judul: "Dipatiukur - Singaperbangsa", alasan: "Arus S1-T1 dan S2-T1 bertemu di sini sebelum masuk Jl. Singaperbangsa yang sempit.", status: "Direkam HP 1 Nov 2026", catatan: "Tidak ada CCTV di titik ini. Direkam anggota dengan HP pada Minggu 1 Nov 2026 sekitar 08.45 WIB, sekitar 15 menit. Jumlah kendaraan belum dihitung.", klip: { src: "media/hp/V_Singaperbangsa.mp4", poster: "media/hp/V_Singaperbangsa.jpg", direkam: "2026-11-01", jam: "08.45", durasi_detik: 20, durasi_asli_detik: 901, dari_menit: 5 } },
    manual_titiran: { judul: "Singaperbangsa - Titiran", alasan: "Arus dari Jl. Singaperbangsa terbagi di sini ke Jl. Tikukur untuk S1-T1 dan ke Jl. Merak untuk S2-T1.", status: "Direkam HP 1 Nov 2026", catatan: "Tidak ada CCTV di titik ini. Direkam anggota dengan HP pada Minggu 1 Nov 2026 sekitar 12.19 WIB, sekitar 15 menit. Terlihat lapak pasar di badan jalan. Jumlah kendaraan belum dihitung.", klip: { src: "media/hp/V_Titiran.mp4", poster: "media/hp/V_Titiran.jpg", direkam: "2026-11-01", jam: "12.19", durasi_detik: 20, durasi_asli_detik: 901, dari_menit: 5 } },
    manual_gagak: { judul: "Gagak - Surapati", alasan: "Arus yang keluar dari Jl. Gagak (S1-T1) bergabung di sini dengan arus Jl. Surapati dari rute Gasibu Atas menuju T1.", status: "Direkam HP 1 Nov 2026", catatan: "Tidak ada CCTV di titik ini. Direkam anggota dengan HP pada Minggu 1 Nov 2026 sekitar 11.01 WIB, sekitar 15 menit. Jumlah kendaraan belum dihitung.", klip: { src: "media/hp/V_Surapati_Gagak.mp4", poster: "media/hp/V_Surapati_Gagak.jpg", direkam: "2026-11-01", jam: "11.01", durasi_detik: 20, durasi_asli_detik: 902, dari_menit: 5 } },
    manual_hasanuddin: { judul: "Dipatiukur - Hasanuddin", alasan: "Arus dari S2 terbagi di sini, yang belok ke Jl. Hasanuddin ikut S2-T2 dan dua rute Gasibu Atas sedangkan yang lurus ke Jl. Singaperbangsa ikut S2-T1.", status: "Direkam HP 1 Nov 2026", catatan: "Tidak ada CCTV di titik ini. Direkam anggota dengan HP pada Minggu 1 Nov 2026 sekitar 08.56 WIB, sekitar 15 menit. Jumlah kendaraan belum dihitung.", klip: { src: "media/hp/V_Hasanuddin.mp4", poster: "media/hp/V_Hasanuddin.jpg", direkam: "2026-11-01", jam: "08.56", durasi_detik: 20, durasi_asli_detik: 911, dari_menit: 5 } },
    manual_cilamaya: { judul: "Diponegoro - Cilamaya", alasan: "Gabungan arus S1-T2 dan S2-T2 masuk ke koridor belakang Gedung Sate yang tidak terlihat dari CCTV Gasibu.", status: "Direkam HP 1 Nov 2026", catatan: "Tidak ada CCTV di titik ini. Direkam anggota dengan HP pada Minggu 1 Nov 2026 sekitar 09.47 WIB, sekitar 15 menit. Jumlah kendaraan belum dihitung.", klip: { src: "media/hp/V_Cilamaya.mp4", poster: "media/hp/V_Cilamaya.jpg", direkam: "2026-11-01", jam: "09.47", durasi_detik: 20, durasi_asli_detik: 904, dari_menit: 5 } },
    manual_cisanggarung: { judul: "Cimandiri - Cisanggarung", alasan: "Arus terbagi di sini ke Jl. Cisangkuy untuk S1-T2 dan ke Jl. Citarum untuk S2-T2.", status: "Direkam HP 1 Nov 2026", catatan: "Tidak ada CCTV di titik ini. Direkam anggota dengan HP pada Minggu 1 Nov 2026 sekitar 10.15 WIB, sekitar 15 menit. Jumlah kendaraan belum dihitung.", klip: { src: "media/hp/V_Cisanggarung.mp4", poster: "media/hp/V_Cisanggarung.jpg", direkam: "2026-11-01", jam: "10.15", durasi_detik: 20, durasi_asli_detik: 905, dari_menit: 5 } }
  },
  deteksi: [
    {
      src: "media/deteksi/V_Djuanda_Hasanuddin.mp4",
      poster: "media/deteksi/V_Djuanda_Hasanuddin.jpg",
      judul: "CCTV Dago 2 - SMA 1 (V_Djuanda_Hasanuddin)",
      catatan: "Uji malam Kamis 29 Okt 2026 sekitar 18.38 WIB, cuplikan 30 detik. Kotak menandai kendaraan yang dideteksi YOLO, garis kuning L1 adalah garis hitung. Dalam 6 menit tercatat 64 kendaraan searah edge V_Djuanda_Hasanuddin -> V_Djuanda_Diponegoro (kendaraan ringan 59, sepeda motor 3, kendaraan berat 2) dan 103 lawan arah. Angka ini hasil uji, belum dipakai sebagai kapasitas."
    },
    {
      src: "media/deteksi/V_Surapati_Merak.mp4",
      poster: "media/deteksi/V_Surapati_Merak.jpg",
      judul: "CCTV Gasibu 01 (V_Surapati_Merak)",
      catatan: "Uji malam Kamis 29 Okt 2026 sekitar 18.42 WIB, cuplikan 40 detik. Mobil, bus, dan truk terdeteksi, tetapi motor yang membelakangi kamera hampir tidak terdeteksi. Dalam 6 menit tercatat 76 kendaraan searah edge V_Surapati_Merak -> T1 (kendaraan ringan 72, sepeda motor 1, kendaraan berat 3). Angka ini hasil uji, belum dipakai sebagai kapasitas."
    }
  ]
};
