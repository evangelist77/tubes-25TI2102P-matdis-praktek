<script setup lang="ts">
import { onMounted, ref } from 'vue'
import MapCanvas from './components/MapCanvas.vue'
import { loadTopology } from './core/loader'
import type { Topology, EdgeDef, NodeDef } from './core/types'

const topology = ref<Topology | null>(null)
const isLoading = ref(true)
const errorMessage = ref<string | null>(null)

const selectedEdge = ref<EdgeDef | null>(null)
const selectedNode = ref<NodeDef | null>(null)

onMounted(async () => {
  try {
    isLoading.value = true
    topology.value = await loadTopology('/data/topology.json')
  } catch (err: any) {
    errorMessage.value = err.message || 'Gagal memuat file topologi.'
  } finally {
    isLoading.value = false
  }
})

function handleSelectEdge(edge: EdgeDef) {
  selectedEdge.value = edge
  selectedNode.value = null
}

function handleSelectNode(node: NodeDef) {
  selectedNode.value = node
}
</script>

<template>
  <div class="flex flex-col h-screen w-screen overflow-hidden bg-stone-100 font-sans">
    <!-- Header dengan aksen tenda pasar tumpah -->
    <header class="bg-white border-b border-stone-200 shadow-xs z-10">
      <div class="h-1.5 tenda-pattern w-full"></div>
      <div class="px-5 py-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 uppercase tracking-wider">
              Tahap 1: Topologi &amp; Peta
            </span>
            <span class="text-xs text-stone-500 font-medium">Kasus 4 • Gasibu–Monju, Bandung</span>
          </div>
          <h1 class="text-lg font-bold text-stone-900 leading-tight mt-0.5">
            Visualisasi Jaringan Aliran Maksimum (Ford-Fulkerson)
          </h1>
        </div>

        <div class="flex items-center gap-3 text-xs text-stone-600">
          <div class="bg-stone-50 border border-stone-200 px-3 py-1.5 rounded-lg">
            <span class="font-semibold text-stone-800">29</span> Simpul •
            <span class="font-semibold text-stone-800">36</span> Ruas Jalan
          </div>
          <div class="bg-orange-50 border border-orange-200 text-orange-900 px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-orange-600 animate-pulse"></span>
            Pasar Tumpah: Jl. Japati
          </div>
        </div>
      </div>
    </header>

    <!-- Main Workspace -->
    <div class="flex-1 flex overflow-hidden relative">
      <!-- Sidebar Kontrol & Inspeksi -->
      <aside class="w-80 md:w-96 bg-white border-r border-stone-200 flex flex-col z-10 shadow-xs overflow-y-auto">
        <div class="p-4 space-y-4">
          <!-- Info Ringkasan Kasus -->
          <div class="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5 space-y-2">
            <div class="flex items-center gap-1.5 text-xs font-bold text-amber-900 uppercase tracking-wider">
              <span>🌾</span>
              <span>Konteks Skenario</span>
            </div>
            <p class="text-xs text-stone-700 leading-relaxed">
              Pemodelan kemacetan akibat pedagang pasar tumpah hari Minggu pagi di kawasan Gasibu–Monju.
              Menganalisis kapasitas maksimum kendaraan dari titik masuk (<span class="font-semibold">S1, S2</span>) ke titik keluar (<span class="font-semibold">T1, T2</span>).
            </p>
          </div>

          <!-- Indikator Ruas Khusus -->
          <div class="space-y-2">
            <h3 class="text-xs font-bold uppercase tracking-wider text-stone-500">Ruas Kritis Lapangan</h3>
            
            <div class="border border-orange-200 bg-orange-50/50 rounded-lg p-3 space-y-1">
              <div class="flex items-center justify-between text-xs font-bold text-orange-900">
                <span>Jl. Japati (Edge #8)</span>
                <span class="bg-orange-600 text-white text-[10px] px-1.5 py-0.2 rounded font-mono">Pasar Tumpah</span>
              </div>
              <p class="text-[11px] text-stone-600 leading-tight">
                Ruas penyempitan lapak pedagang dari Monju Utara ke Gasibu Barat. Kapasitas dasar: <span class="font-bold">750</span> kend/jam.
              </p>
            </div>

            <div class="border border-stone-200 bg-stone-50 rounded-lg p-3 space-y-1">
              <div class="flex items-center justify-between text-xs font-bold text-stone-800">
                <span>Jl. Singaperbangsa (Edge #20)</span>
                <span class="bg-stone-600 text-white text-[10px] px-1.5 py-0.2 rounded font-mono">Tutup Pagi</span>
              </div>
              <p class="text-[11px] text-stone-600 leading-tight">
                Akses dari Dipatiukur ke Titiran. Ditutup pada pagi hari pasar sampai sekitar pukul 11.00–12.00 WIB.
              </p>
            </div>
          </div>

          <!-- Detail Inspeksi Saat Ruas / Simpul Diklik -->
          <div class="border border-stone-200 rounded-xl p-3.5 bg-white space-y-2">
            <div class="text-xs font-bold uppercase tracking-wider text-stone-500">
              Panel Inspeksi
            </div>

            <div v-if="selectedEdge" class="space-y-2 text-xs">
              <div class="font-bold text-stone-900 text-sm border-b border-stone-100 pb-1">
                {{ selectedEdge.road }}
              </div>
              <div class="grid grid-cols-2 gap-2 text-stone-600">
                <div>
                  <span class="text-[10px] uppercase text-stone-400 block">ID Ruas</span>
                  <span class="font-mono font-bold text-stone-800">#{{ selectedEdge.id }}</span>
                </div>
                <div>
                  <span class="text-[10px] uppercase text-stone-400 block">Kapasitas Dasar</span>
                  <span class="font-bold text-amber-700">{{ selectedEdge.capacity }} kend/jam</span>
                </div>
                <div class="col-span-2">
                  <span class="text-[10px] uppercase text-stone-400 block">Hubungan Simpul</span>
                  <span class="font-mono font-semibold text-stone-700">{{ selectedEdge.code }}</span>
                </div>
              </div>
            </div>

            <div v-else-if="selectedNode" class="space-y-2 text-xs">
              <div class="font-bold text-stone-900 text-sm border-b border-stone-100 pb-1">
                {{ selectedNode.code }} (ID: {{ selectedNode.id }})
              </div>
              <p class="text-stone-600 text-xs">{{ selectedNode.label }}</p>
              <div class="text-[11px] text-stone-500 font-mono">
                Posisi: [{{ selectedNode.pos[0].toFixed(5) }}, {{ selectedNode.pos[1].toFixed(5) }}]
              </div>
            </div>

            <div v-else class="text-xs text-stone-400 italic py-2 text-center">
              Klik ruas jalan atau simpul pada peta untuk melihat detail spesifikasi.
            </div>
          </div>

          <!-- Status Kesiapan Tahap 1 -->
          <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 space-y-1">
            <div class="font-bold flex items-center gap-1">
              <span>✓</span>
              <span>Pemeriksaan Tahap 1 Berhasil</span>
            </div>
            <p class="text-[11px] text-emerald-800 leading-relaxed">
              Topologi graf (29 simpul, 36 busur) terhubung penuh ke OpenStreetMap dengan penandaan kapasitas jalan yang akurat.
            </p>
          </div>
        </div>
      </aside>

      <!-- Area Peta Leaflet -->
      <main class="flex-1 h-full relative">
        <div v-if="isLoading" class="absolute inset-0 z-50 bg-white/80 backdrop-blur-xs flex items-center justify-center">
          <div class="flex items-center gap-2 text-stone-700 font-medium text-sm">
            <span class="w-4 h-4 rounded-full border-2 border-amber-600 border-t-transparent animate-spin"></span>
            Memuat peta dan topologi graf...
          </div>
        </div>

        <div v-else-if="errorMessage" class="absolute inset-0 z-50 bg-red-50 flex items-center justify-center p-6">
          <div class="bg-white border border-red-200 rounded-xl p-4 max-w-md shadow-md text-center space-y-2">
            <div class="text-red-600 font-bold text-sm">Gagal Memuat Data</div>
            <p class="text-xs text-stone-600">{{ errorMessage }}</p>
          </div>
        </div>

        <MapCanvas
          v-else
          :topology="topology"
          :selected-edge-id="selectedEdge?.id ?? null"
          @select-edge="handleSelectEdge"
          @select-node="handleSelectNode"
        />
      </main>
    </div>
  </div>
</template>

