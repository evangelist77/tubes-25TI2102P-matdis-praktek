<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import MapCanvas from './components/MapCanvas.vue'
import StepPlayer from './components/StepPlayer.vue'
import { loadManifest, loadTopology, loadTrace } from './core/loader'
import type { Topology, EdgeDef, NodeDef, Trace, Manifest, ManifestEntry } from './core/types'

const topology = ref<Topology | null>(null)
const manifest = ref<Manifest | null>(null)
const selectedManifestEntry = ref<ManifestEntry | null>(null)
const activeTrace = ref<Trace | null>(null)

const isLoading = ref(true)
const errorMessage = ref<string | null>(null)

const selectedEdge = ref<EdgeDef | null>(null)
const selectedNode = ref<NodeDef | null>(null)

const currentStepIndex = ref(0)
const isPlaying = ref(false)
const playSpeed = ref(1200) // ms
let playTimer: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  try {
    isLoading.value = true
    topology.value = await loadTopology('/data/topology.json')
    manifest.value = await loadManifest('/data/manifest.json')

    // Pilih default: S2 -> T1 dengan alpha=0.5 (Pasar Penuh Pagi)
    const defaultEntry =
      manifest.value.runs.find((r) => r.sourceCode === 'S2' && r.sinkCode === 'T1' && r.alpha === 0.5) ||
      manifest.value.runs[0]

    if (defaultEntry) {
      await selectRun(defaultEntry)
    }
  } catch (err: any) {
    errorMessage.value = err.message || 'Gagal memuat data simulasi.'
  } finally {
    isLoading.value = false
  }
})

async function selectRun(entry: ManifestEntry) {
  stopPlaying()
  selectedManifestEntry.value = entry
  try {
    activeTrace.value = await loadTrace(entry.filename)
    currentStepIndex.value = 0
  } catch (err: any) {
    errorMessage.value = err.message || 'Gagal memuat file trace.'
  }
}

// Komputasi status langkah saat ini
const currentStep = computed(() => {
  if (!activeTrace.value || currentStepIndex.value <= 0) return null
  return activeTrace.value.steps[currentStepIndex.value - 1] ?? null
})

const currentEdgeFlows = computed<Record<number, number>>(() => {
  if (!currentStep.value) return {}
  return currentStep.value.edgeFlows
})

const effectiveCapacities = computed<Record<number, number>>(() => {
  if (!activeTrace.value) return {}
  return activeTrace.value.effectiveCapacity
})

const activePath = computed<number[]>(() => {
  if (!currentStep.value) return []
  return currentStep.value.path
})

const isAtFinalStep = computed(() => {
  if (!activeTrace.value) return false
  return currentStepIndex.value === activeTrace.value.steps.length
})

const minCutEdges = computed<number[]>(() => {
  if (!activeTrace.value || !isAtFinalStep.value) return []
  return activeTrace.value.result.minCut
})

const sourceSideNodes = computed<number[]>(() => {
  if (!activeTrace.value || !isAtFinalStep.value) return []
  return activeTrace.value.result.sourceSide
})

// Logika Pemutar Langkah Otomatis
function togglePlay() {
  if (isPlaying.value) {
    stopPlaying()
  } else {
    startPlaying()
  }
}

function startPlaying() {
  if (!activeTrace.value) return
  if (currentStepIndex.value >= activeTrace.value.steps.length) {
    currentStepIndex.value = 0
  }
  isPlaying.value = true

  playTimer = setInterval(() => {
    if (!activeTrace.value) return
    if (currentStepIndex.value < activeTrace.value.steps.length) {
      currentStepIndex.value++
    } else {
      stopPlaying()
    }
  }, playSpeed.value)
}

function stopPlaying() {
  isPlaying.value = false
  if (playTimer) {
    clearInterval(playTimer)
    playTimer = null
  }
}

function resetSteps() {
  stopPlaying()
  currentStepIndex.value = 0
}

function changeSpeed(speed: number) {
  playSpeed.value = speed
  if (isPlaying.value) {
    stopPlaying()
    startPlaying()
  }
}

watch(playSpeed, () => {
  if (isPlaying.value) {
    stopPlaying()
    startPlaying()
  }
})

onUnmounted(() => {
  stopPlaying()
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
      <div class="px-5 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 uppercase tracking-wider">
              Tahap 2: Replay Langkah &amp; Aliran
            </span>
            <span class="text-xs text-stone-500 font-medium">Kasus 4 • Pasar Tumpah Gasibu–Monju</span>
          </div>
          <h1 class="text-base font-bold text-stone-900 leading-tight mt-0.5">
            Visualisasi Jaringan Aliran Maksimum (Ford-Fulkerson)
          </h1>
        </div>

        <!-- Indikator Metrik Aliran Saat Ini -->
        <div class="flex items-center gap-2 text-xs">
          <div class="bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-lg flex items-center gap-2">
            <span class="text-[10px] uppercase font-bold text-orange-600">Aliran Berjalan:</span>
            <span class="font-mono font-bold text-sm text-orange-900">
              {{ currentStep ? currentStep.totalFlow : 0 }} kend/jam
            </span>
          </div>

          <div v-if="activeTrace" class="bg-stone-50 border border-stone-200 px-3 py-1.5 rounded-lg flex items-center gap-2">
            <span class="text-[10px] uppercase font-bold text-stone-500">Max Flow:</span>
            <span class="font-mono font-bold text-sm text-stone-900">
              {{ activeTrace.result.maxFlow }} kend/jam
            </span>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Workspace -->
    <div class="flex-1 flex overflow-hidden relative">
      <!-- Sidebar Kontrol & Inspeksi -->
      <aside class="w-80 md:w-96 bg-white border-r border-stone-200 flex flex-col z-10 shadow-xs overflow-y-auto">
        <div class="p-4 space-y-4">
          <!-- 1. Pemilih Kasus / Rute S-T & Skenario Alpha -->
          <div class="space-y-1.5">
            <label class="block text-xs font-bold uppercase tracking-wider text-stone-500">
              Pilih Rute Terminal &amp; Skenario Pasar:
            </label>
            <select
              v-if="manifest"
              class="w-full text-xs font-medium bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              :value="selectedManifestEntry?.filename"
              @change="(e) => {
                const target = e.target as HTMLSelectElement
                const entry = manifest?.runs.find((r) => r.filename === target.value)
                if (entry) selectRun(entry)
              }"
            >
              <option
                v-for="run in manifest.runs"
                :key="run.filename"
                :value="run.filename"
              >
                {{ run.label }}
              </option>
            </select>
          </div>

          <!-- 2. Ringkasan Status Skenario -->
          <div v-if="activeTrace" class="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 space-y-2 text-xs">
            <div class="flex items-center justify-between">
              <span class="font-bold text-amber-900">
                Skenario {{ activeTrace.meta.scenario }} (Penyempitan: {{ Math.round(activeTrace.meta.alpha * 100) }}%)
              </span>
              <span
                class="px-1.5 py-0.5 rounded text-[10px] font-bold"
                :class="activeTrace.meta.scenario === 'A' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'"
              >
                {{ activeTrace.meta.scenario === 'A' ? 'Pasar Padat Pagi' : activeTrace.meta.scenario === 'B' ? 'Pasar Bubar' : 'Normal' }}
              </span>
            </div>
            <div class="grid grid-cols-2 gap-1.5 text-[11px] text-stone-700">
              <div>
                <span class="text-stone-400 block">Jl. Japati:</span>
                <span class="font-semibold text-orange-700">
                  {{ effectiveCapacities[8] ?? 750 }} kend/jam
                </span>
              </div>
              <div>
                <span class="text-stone-400 block">Jl. Singaperbangsa:</span>
                <span class="font-semibold" :class="(effectiveCapacities[20] ?? 250) === 0 ? 'text-red-600 font-bold' : 'text-stone-800'">
                  {{ (effectiveCapacities[20] ?? 250) === 0 ? 'DITUTUP (0)' : `${effectiveCapacities[20]} kend/jam` }}
                </span>
              </div>
            </div>
          </div>

          <!-- 3. Status Penyelesaian Aliran & Min-Cut -->
          <div v-if="isAtFinalStep && activeTrace" class="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 space-y-2 text-xs text-emerald-900">
            <div class="flex items-center gap-1.5 font-bold">
              <span>🎯</span>
              <span>Aliran Maksimum Tercapai ({{ activeTrace.result.maxFlow }} kend/jam)</span>
            </div>
            <p class="text-[11px] text-stone-600 leading-relaxed">
              Tidak ada lagi jalur augmentasi dari sumber ke muara. Seluruh aliran telah jenuh pada ruas pemotong (Min-Cut).
            </p>
            <div class="pt-1.5 border-t border-emerald-200/80">
              <div class="text-[10px] font-bold uppercase text-emerald-700">Ruas Pemotong (Min-Cut / Bottleneck):</div>
              <ul class="mt-1 space-y-1">
                <li
                  v-for="cutId in activeTrace.result.minCut"
                  :key="cutId"
                  class="flex items-center justify-between text-[11px] bg-white/70 px-2 py-1 rounded border border-emerald-200"
                >
                  <span class="font-semibold text-stone-800">
                    {{ topology?.edges.find((e) => e.id === cutId)?.road || `Ruas #${cutId}` }}
                  </span>
                  <span class="font-mono text-red-600 font-bold">
                    {{ effectiveCapacities[cutId] }} kend/jam
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <!-- 4. Detail Inspeksi Saat Ruas / Simpul Diklik -->
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
                  <span class="text-[10px] uppercase text-stone-400 block">Arus Saat Ini</span>
                  <span class="font-mono font-bold text-orange-700">
                    {{ currentEdgeFlows[selectedEdge.id] ?? 0 }} kend/jam
                  </span>
                </div>
                <div>
                  <span class="text-[10px] uppercase text-stone-400 block">Kapasitas Efektif</span>
                  <span class="font-bold text-stone-800">
                    {{ effectiveCapacities[selectedEdge.id] ?? selectedEdge.capacity }} kend/jam
                  </span>
                </div>
                <div>
                  <span class="text-[10px] uppercase text-stone-400 block">Kapasitas Sisa (Residual)</span>
                  <span class="font-mono font-bold text-emerald-700">
                    {{ Math.max(0, (effectiveCapacities[selectedEdge.id] ?? selectedEdge.capacity) - (currentEdgeFlows[selectedEdge.id] ?? 0)) }}
                  </span>
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
              <div v-if="sourceSideNodes.includes(selectedNode.id)" class="text-[11px] font-semibold text-blue-600">
                Partisi: Sisi Sumber (S-Cut)
              </div>
              <div v-else-if="isAtFinalStep" class="text-[11px] font-semibold text-stone-500">
                Partisi: Sisi Muara (T-Cut)
              </div>
            </div>

            <div v-else class="text-xs text-stone-400 italic py-2 text-center">
              Klik ruas jalan atau simpul pada peta untuk melihat detail spesifikasi aliran.
            </div>
          </div>
        </div>
      </aside>

      <!-- Area Peta Leaflet & StepPlayer -->
      <main class="flex-1 flex flex-col h-full relative overflow-hidden">
        <div v-if="isLoading" class="absolute inset-0 z-50 bg-white/80 backdrop-blur-xs flex items-center justify-center">
          <div class="flex items-center gap-2 text-stone-700 font-medium text-sm">
            <span class="w-4 h-4 rounded-full border-2 border-amber-600 border-t-transparent animate-spin"></span>
            Memuat peta dan simulasi aliran...
          </div>
        </div>

        <div v-else-if="errorMessage" class="absolute inset-0 z-50 bg-red-50 flex items-center justify-center p-6">
          <div class="bg-white border border-red-200 rounded-xl p-4 max-w-md shadow-md text-center space-y-2">
            <div class="text-red-600 font-bold text-sm">Gagal Memuat Data</div>
            <p class="text-xs text-stone-600">{{ errorMessage }}</p>
          </div>
        </div>

        <!-- Peta Leaflet Utama -->
        <div class="flex-1 relative">
          <MapCanvas
            v-if="topology"
            :topology="topology"
            :edge-flows="currentEdgeFlows"
            :effective-capacities="effectiveCapacities"
            :active-path="activePath"
            :min-cut-edges="minCutEdges"
            :source-side-nodes="sourceSideNodes"
            :selected-edge-id="selectedEdge?.id ?? null"
            @select-edge="handleSelectEdge"
            @select-node="handleSelectNode"
          />
        </div>

        <!-- Pemutar Langkah (StepPlayer) -->
        <StepPlayer
          v-if="activeTrace"
          :topology="topology"
          :steps="activeTrace.steps"
          :current-step-index="currentStepIndex"
          :max-flow="activeTrace.result.maxFlow"
          :is-playing="isPlaying"
          :play-speed="playSpeed"
          @update:current-step-index="(idx) => currentStepIndex = idx"
          @toggle-play="togglePlay"
          @change-speed="changeSpeed"
          @reset="resetSteps"
        />
      </main>
    </div>
  </div>
</template>
