/*
 * Isi halaman /graph/cctv dan /graph/visualisasi. Data dari graph/data/graf.json (salinan GRAPH_DATA, dibuat
 * graph/ekstrak_graf.mjs) dan window.MEDIA_DATA (graph/media/media.js). Semua angka di halaman dihitung dari data itu.
 */
(() => {
  'use strict';
  const M = window.MEDIA_DATA || {};
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const aset = (s) => (s ? '/graph/' + String(s).replace(/^\.?\//, '') : '');
  const bersih = (t) => String(t || '').replace(/\s*[\u2013\u2014]\s*/g, ' - ');
  const simpul = (id) => {
    if (/^[ST][12]$/.test(id)) return `${id[0]}<sub>${id[1]}</sub>`;
    if (/^V_/.test(id)) return `V<sub>${id.slice(2).replace(/_/g, ' ')}</sub>`;
    return esc(id);
  };
  const waktu = (iso) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(iso || '');
    return m ? `${+m[3]} ${BULAN[+m[2] - 1]} ${m[1]}${m[4] ? ` pukul ${m[4]}.${m[5]}` : ''}` : '';
  };
  const durasi = (dtk) => {
    const m = Math.floor(dtk / 60), d = Math.round(dtk % 60);
    return m ? `${m} menit${d ? ` ${d} detik` : ''}` : `${d} detik`;
  };
  const status = (s) => {
    if (s === 'aman') return { k: 'aman', t: 'Aman', urut: 0 };
    if (s && s.startsWith('baru')) return { k: 'baru', t: 'Baru, belum dicek', urut: 1 };
    if (s === 'tidak bisa dibuka') return { k: 'mati', t: 'Tidak bisa dibuka', urut: 2 };
    return { k: 'tunggu', t: s || 'Belum ada data', urut: 3 };
  };
  const namaKamera = (k) => bersih(k).replace(/^CCTV\s+/i, '');

  // ---------- galeri video: kartu muncul satu per satu mengikuti gulir dan videonya langsung berputar (muted, loop) ----------
  // poster dan src dipasang saat kartu mendekati layar, video dijeda saat kartunya jauh dari layar dan diputar lagi saat kembali
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const muat = (v) => {
    if (v.dataset.poster) v.poster = v.dataset.poster;
    if (v.dataset.src) v.src = v.dataset.src;
    delete v.dataset.poster;
    delete v.dataset.src;
  };
  const putar = (v) => { muat(v); v.muted = true; const p = v.play(); if (p && p.catch) p.catch(() => {}); };
  const antre = [];
  let jeda = 0;
  const munculkan = () => {
    const f = antre.shift();
    if (!f) { jeda = 0; return; }
    f.classList.add('muncul');
    const v = $('video', f);
    if (v) putar(v);
    jeda = setTimeout(munculkan, REDUCED ? 0 : 170);
  };
  const IO = 'IntersectionObserver' in window;
  const lihat = IO && new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    lihat.unobserve(e.target);
    antre.push(e.target);
    if (!jeda) munculkan();
  }), { threshold: 0.2 });
  const dekat = IO && new IntersectionObserver((es) => es.forEach((e) => {
    const v = $('video', e.target);
    if (!v) return;
    if (!e.isIntersecting) v.pause();
    else if (e.target.classList.contains('muncul')) putar(v);
    else muat(v);
  }), { rootMargin: '400px 0px' });
  const pasangGaleri = (root) => $$('.galeri .foto', root).forEach((f) => {
    if (IO) { lihat.observe(f); dekat.observe(f); return; }
    f.classList.add('muncul');
    const v = $('video', f);
    if (v) putar(v);
  });
  // klik video untuk memperbesar ke layar penuh (iPhone memakai pemutar layar penuh bawaan)
  document.addEventListener('click', (e) => {
    const v = e.target.closest && e.target.closest('.galeri video');
    const f = v && (v.requestFullscreen || v.webkitRequestFullscreen || v.webkitEnterFullscreen);
    if (!f) return;
    const p = f.call(v);
    if (p && p.catch) p.catch(() => {});
  });
  const htmlVideo = (src, poster, label) =>
    `<video muted loop playsinline preload="none" data-src="${esc(aset(src))}" data-poster="${esc(aset(poster))}" aria-label="${esc(label)}" title="Klik untuk memperbesar"></video>`;

  // ---------- pemutar YouTube ringan: iframe baru dimuat setelah diklik ----------
  function pemutarYoutube(el, id) {
    if (!el) return;
    if (!id || !/^[\w-]{6,20}$/.test(id)) { el.remove(); return; }
    el.hidden = false;
    el.innerHTML = `<div class="yt-layar" style="background-image:url('https://i.ytimg.com/vi/${id}/hqdefault.jpg')">
        <button class="yt-putar" type="button" aria-label="Putar video kolase rekaman di YouTube"><span><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 3l12 7-12 7z"/></svg></span></button>
      </div>
      <div class="tombol-baris"><a class="tombol alt" href="https://www.youtube.com/watch?v=${id}" target="_blank" rel="noopener">Lihat rekaman penuh di YouTube</a></div>`;
    $('.yt-putar', el).addEventListener('click', () => {
      $('.yt-layar', el).innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0" title="Kolase rekaman hasil program hitung kendaraan" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
    });
  }

  // ================= /graph/cctv =================
  async function halamanCctv() {
    let D;
    try {
      const r = await fetch('/graph/data/graf.json');
      D = await r.json();
    } catch (err) {
      $('#tabel-cctv tbody').innerHTML = '<tr><td colspan="4">Data graf tidak bisa dimuat.</td></tr>';
      return;
    }
    const cctv = D.cctvPoints.map((c) => {
      const info = (M.cctv || {})[c.id] || {};
      return { c, info, st: status(info.status), lewat: D.paths.filter((p) => p.nodeIds.includes(c.nodeId)).map((p) => p.id) };
    });
    const manual = D.manualSurveyPoints
      .map((p) => ({ p, info: (M.manual || {})[p.id] || {} }))
      .sort((a, b) => String((a.info.klip || {}).jam).localeCompare(String((b.info.klip || {}).jam)));
    const hit = (k) => cctv.filter((x) => x.st.k === k).length;
    const N = {
      cctv: cctv.length, aman: hit('aman'), mati: hit('mati'), baru: hit('baru'),
      hp: manual.length,
      klipCctv: cctv.filter((x) => x.info.klip && x.info.klip.src).length,
      totalHp: durasi(manual.reduce((s, x) => s + ((x.info.klip || {}).durasi_asli_detik || 0), 0))
    };
    $$('[data-n]').forEach((el) => { el.textContent = N[el.dataset.n]; });

    $('#ringkas').innerHTML = [
      [N.cctv, 'titik CCTV'], [N.aman, 'aman'], [N.mati, 'tidak bisa dibuka'], [N.baru, 'baru'], [N.hp, 'rekaman HP']
    ].filter(([n]) => n).map(([n, t]) => `<li><b>${n}</b><span>${t}</span></li>`).join('') +
      '<li class="gelap"><span>kapasitas belum dihitung</span></li>';

    // pita berjalan: kamera yang bisa dipakai dan simpang rekaman HP
    const nama = cctv.filter((x) => x.st.k !== 'mati').map((x) => namaKamera(x.info.kamera || x.c.name).replace(/\s*\(.*\)$/, ''))
      .concat(manual.map((x) => x.info.judul || x.p.nodeId));
    const satu = nama.map((n) => `<span>${esc(n.toUpperCase())}</span><span class="sep">✶</span>`).join('');
    $('#mq').innerHTML = satu + satu;

    // tabel status
    $('#tabel-cctv tbody').innerHTML = cctv.slice().sort((a, b) => a.st.urut - b.st.urut).map((x) => `<tr>
        <td class="utama" data-l="Kamera"><b>${esc(bersih(x.info.kamera || x.c.name))}</b><span class="mono">${esc(x.c.dinas)}</span></td>
        <td data-l="Simpul" class="simpul">${simpul(x.c.nodeId)}<br>dilewati ${x.lewat.length} rute</td>
        <td data-l="Status"><span class="pill st-${x.st.k}">${x.st.t}</span></td>
        <td data-l="Catatan">${esc(x.info.catatan || '')}</td>
      </tr>`).join('');

    // galeri cuplikan CCTV
    $('#galeri-cctv').innerHTML = cctv.filter((x) => x.info.klip && x.info.klip.src).map((x) => {
      const k = x.info.klip;
      const judul = namaKamera(x.info.kamera || x.c.name);
      return `<figure class="foto">
          ${x.st.k === 'baru' ? '<span class="pill st-baru">baru</span>' : ''}
          ${htmlVideo(k.src, k.poster, 'Cuplikan ' + judul)}
          <figcaption><h4>${esc(judul)}</h4><p class="meta">${simpul(x.c.nodeId)} · ${waktu(k.direkam)} · ${Math.round(k.durasi_detik)} detik</p></figcaption>
        </figure>`;
    }).join('');

    // rekaman HP
    $('#galeri-hp').innerHTML = manual.map((x) => {
      const k = x.info.klip || {};
      const judul = x.info.judul || bersih(x.p.name);
      // kalimat catatan selain yang sudah tampil di tempat lain (misalnya lapak pasar terlihat di badan jalan)
      const khusus = String(x.info.catatan || '').split(/(?<=\.)\s+/).filter((s) => s && !/^(Tidak ada CCTV|Direkam anggota|Jumlah kendaraan)/.test(s)).join(' ');
      return `<figure class="foto lebar">
          ${k.src ? htmlVideo(k.src, k.poster, 'Rekaman HP ' + judul) : '<p>Video belum tersedia.</p>'}
          <figcaption>
            <h4>${esc(judul)}</h4>
            <p class="meta">${simpul(x.p.nodeId)} · sekitar ${esc(k.jam || '')} · asli ${k.durasi_asli_detik ? durasi(k.durasi_asli_detik) : '-'}</p>
            <p>${esc(x.info.alasan || '')}${khusus ? ` ${esc(khusus)}` : ''}</p>
            <span class="belum">Jumlah kendaraan belum dihitung</span>
          </figcaption>
        </figure>`;
    }).join('');

    // contoh deteksi YOLO
    $('#galeri-deteksi').innerHTML = (M.deteksi || []).map((d) => {
      const m = /^(.*?)\s*\((V_[A-Za-z_]+|[ST]\d)\)\s*$/.exec(d.judul || '');
      const judul = m ? namaKamera(m[1]) : namaKamera(d.judul);
      return `<figure class="foto">
          <span class="pill st-tunggu">hasil uji</span>
          ${htmlVideo(d.src, d.poster, 'Contoh deteksi ' + judul)}
          <figcaption><h4>Deteksi YOLO · ${esc(judul)}</h4>${m ? `<p class="meta">${simpul(m[2])}</p>` : ''}<p>${esc(d.catatan || '').replace(/\b(V_[A-Za-z_]+|[ST][12])\b/g, (s) => simpul(s)).replace(/ -&gt; /g, ' → ')}</p></figcaption>
        </figure>`;
    }).join('');

    pemutarYoutube($('[data-yt="cctv"]'), (M.youtube || {}).cctv);
    pemutarYoutube($('[data-yt="hp"]'), (M.youtube || {}).hp);
    pasangGaleri(document);

    // isi galeri menggeser tinggi halaman, jadi lompatan ke #bagian diulang setelah isi siap
    const tujuan = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (tujuan) requestAnimationFrame(() => tujuan.scrollIntoView({ behavior: 'instant' }));
  }

  // ================= /graph/visualisasi =================
  function halamanVis() {
    const wrap = $('#vis-ff'), f = $('#bingkai-ff');
    // Mulai 1024 px aplikasi Alifah memakai tiga kolom 330 px, peta, 400 px. Supaya kolom petanya minimal 640 px, bingkai yang
    // lebih sempit dari 1370 px merender iframe selebar 1370 px lalu memperkecilnya (ukuran berubah tidak memuat ulang iframe)
    const skala = () => {
      const w = wrap.clientWidth;
      wrap.style.setProperty('--z', w >= 1024 && w < 1370 ? (w / 1370).toFixed(4) : '1');
    };
    skala();
    addEventListener('resize', skala);
    f.addEventListener('load', () => wrap.classList.add('siap'));
    // src baru diisi setelah bingkai punya ukuran akhirnya, jadi fitBounds peta Alifah memakai ukuran yang benar
    requestAnimationFrame(() => requestAnimationFrame(() => { f.src = '/graph/ff/'; }));
  }

  if ($('#tabel-cctv')) halamanCctv();
  if ($('#bingkai-ff')) halamanVis();
})();
