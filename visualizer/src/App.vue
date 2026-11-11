<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AlgorithmPanel from './components/AlgorithmPanel.vue'
import ConditionCompare from './components/ConditionCompare.vue'
import ConditionToggle from './components/ConditionToggle.vue'
import CutPanel from './components/CutPanel.vue'
import InspectPanel from './components/InspectPanel.vue'
import Legend from './components/Legend.vue'
import MapCanvas from './components/MapCanvas.vue'
import RoutePanel from './components/RoutePanel.vue'
import SensitivityPanel from './components/SensitivityPanel.vue'
import StepPlayer from './components/StepPlayer.vue'
import { useComparison } from './composables/useComparison'
import { useReplay } from './composables/useReplay'
import { loadGeometry, loadManifest, loadRoutes, loadTopology, loadTrace } from './core/loader'
import {
  describeCondition,
  findDefaultRun,
  pickRunForPair,
  routesForPair,
  runForCondition,
  sinkSideNodeIds
} from './core/selectors'
import type { EdgeDef, GeometryMap, Manifest, ManifestEntry, NodeDef, RouteDef, Topology, Trace } from './core/types'

const topology = ref<Topology | null>(null)
const manifest = ref<Manifest | null>(null)
const routes = ref<RouteDef[]>([])
const geometry = ref<GeometryMap>({})
const selectedRun = ref<ManifestEntry | null>(null)
const activeTrace = ref<Trace | null>(null)
const selectedRouteId = ref<string | null>(null)

const isLoading = ref(true)
const errorMessage = ref<string | null>(null)
const selectedEdge = ref<EdgeDef | null>(null)
const selectedNode = ref<NodeDef | null>(null)
const residualMode = ref(false)
const showBaseMap = ref(true)

const totalSteps = computed(() => activeTrace.value?.steps.length ?? 0)
const { currentStepIndex, isPlaying, playSpeed, toggle, reset, stop, setSpeed } = useReplay(totalSteps)
const comparison = useComparison(topology, manifest, selectedRun)

onMounted(async () => {
  try {
    const [t, m, r, g] = await Promise.all([loadTopology(), loadManifest(), loadRoutes(), loadGeometry()])
    topology.value = t
    manifest.value = m
    routes.value = r.routes
    geometry.value = g
    const first = findDefaultRun(m)
    if (first) await selectRun(first)
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Gagal memuat data simulasi.'
  } finally {
    isLoading.value = false
  }
})

async function selectRun(entry: ManifestEntry) {
  stop()
  try {
    activeTrace.value = await loadTrace(entry.filename)
    selectedRun.value = entry
    currentStepIndex.value = 0
    errorMessage.value = null
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Gagal memuat file trace.'
  }
}

function chooseCondition(condition: 'normal' | 'pasar') {
  if (!manifest.value || !selectedRun.value) return
  const run = runForCondition(manifest.value, selectedRun.value.sourceCode, selectedRun.value.sinkCode, condition)
  if (run) selectRun(run)
}

function choosePair(sourceCode: string, sinkCode: string) {
  if (!manifest.value) return
  const run = pickRunForPair(manifest.value, sourceCode, sinkCode, selectedRun.value?.alpha ?? 0)
  selectedRouteId.value = null
  selectedEdge.value = null
  selectedNode.value = null
  if (run) selectRun(run)
}

const pairRoutes = computed(() =>
  selectedRun.value ? routesForPair(routes.value, selectedRun.value.sourceCode, selectedRun.value.sinkCode) : []
)
const selectedRoute = computed(() => routes.value.find((r) => r.id === selectedRouteId.value) ?? null)
const visibleEdgeIds = computed(() => selectedRoute.value?.edgeIds ?? null)
const halos = computed(() =>
  selectedRoute.value
    ? [{ color: selectedRoute.value.color, edgeIds: selectedRoute.value.edgeIds }]
    : pairRoutes.value.map((r) => ({ color: r.color, edgeIds: r.edgeIds }))
)
const activeTerminals = computed(() =>
  activeTrace.value ? [activeTrace.value.meta.source, activeTrace.value.meta.sink] : []
)

// Bila satu rute dipilih, jalur augmentasi langkah ini bisa berada di luar rute tersebut
const pathOutsideRoute = computed(() => {
  const visible = visibleEdgeIds.value
  const path = activePath.value
  if (!visible || path.length === 0) return false
  return !path.some((id) => visible.includes(id))
})

const currentStep = computed(() => {
  if (!activeTrace.value || currentStepIndex.value <= 0) return null
  return activeTrace.value.steps[currentStepIndex.value - 1] ?? null
})
const currentEdgeFlows = computed<Record<number, number>>(() => currentStep.value?.edgeFlows ?? {})
const effectiveCapacities = computed<Record<number, number>>(() => activeTrace.value?.effectiveCapacity ?? {})
const activePath = computed<number[]>(() => currentStep.value?.path ?? [])

const isAtFinalStep = computed(() => !!activeTrace.value && currentStepIndex.value === totalSteps.value)
const minCutEdges = computed(() => (isAtFinalStep.value ? (activeTrace.value?.result.minCut ?? []) : []))
const sourceSideNodes = computed(() => (isAtFinalStep.value ? (activeTrace.value?.result.sourceSide ?? []) : []))
const sinkSideNodes = computed(() =>
  isAtFinalStep.value && topology.value && activeTrace.value
    ? sinkSideNodeIds(topology.value, activeTrace.value.result.sourceSide)
    : []
)
const condition = computed(() =>
  selectedRun.value && manifest.value ? describeCondition(selectedRun.value.alpha, manifest.value.observedAlpha) : null
)
</script>

<template>
  <div class="flex flex-col h-screen w-screen overflow-hidden bg-stone-100 font-sans text-stone-800">
    <header class="bg-white border-b border-stone-200 z-10">
      <div class="h-1.5 tenda-pattern w-full"></div>
      <div class="px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div class="text-xs font-semibold uppercase tracking-wider text-amber-700">Kasus 4 · Pasar Tumpah Gasibu–Monju</div>
          <h1 class="text-xl font-extrabold text-stone-900 leading-tight">Visualisasi Aliran Maksimum dengan Ford-Fulkerson</h1>
        </div>
        <div v-if="activeTrace" class="flex items-center gap-3">
          <span v-if="condition" class="rounded-full px-3 py-1 text-sm font-bold"
            :class="condition.key === 'normal' ? 'bg-emerald-100 text-emerald-800' : condition.key === 'pasar' ? 'bg-orange-100 text-orange-800' : 'bg-sky-100 text-sky-800'">
            {{ condition.title }}
          </span>
          <div class="rounded-xl border border-stone-200 bg-stone-50 px-4 py-1.5 text-right">
            <div class="text-[11px] font-bold uppercase text-stone-500">Arus maksimum</div>
            <div class="font-mono text-xl font-extrabold text-stone-900 leading-tight">{{ activeTrace.result.maxFlow }}<span class="text-xs font-semibold text-stone-500"> kend/jam</span></div>
          </div>
        </div>
      </div>
    </header>

    <div class="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[330px_minmax(0,1fr)_400px]">
      <!-- Kiri: pilihan -->
      <aside class="overflow-y-auto bg-white border-r border-stone-200 p-5 space-y-6">
        <section v-if="manifest" class="space-y-2.5">
          <h2 class="text-sm font-bold text-stone-900"><span class="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-600 text-[11px] text-white">1</span>Pilih kondisi</h2>
          <ConditionToggle :manifest="manifest" :selected="selectedRun" @choose="chooseCondition" />
        </section>

        <section v-if="manifest" class="space-y-2.5">
          <h2 class="text-sm font-bold text-stone-900"><span class="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-600 text-[11px] text-white">2</span>Pilih rute</h2>
          <RoutePanel
            :manifest="manifest"
            :routes="routes"
            :selected="selectedRun"
            :selected-route-id="selectedRouteId"
            @choose-pair="choosePair"
            @choose-route="(id) => (selectedRouteId = id)"
          />
        </section>

        <section class="space-y-2">
          <h2 class="text-sm font-bold text-stone-900"><span class="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-600 text-[11px] text-white">3</span>Tampilan</h2>
          <label class="flex items-start gap-2.5 text-[13px] text-stone-700 cursor-pointer">
            <input v-model="residualMode" type="checkbox" class="mt-0.5 accent-violet-600" />
            <span><b>Mode residual</b><br /><span class="text-stone-500">tampilkan kapasitas sisa dan edge balik</span></span>
          </label>
          <label class="flex items-start gap-2.5 text-[13px] text-stone-700 cursor-pointer">
            <input v-model="showBaseMap" type="checkbox" class="mt-0.5 accent-amber-600" />
            <span><b>Peta dasar</b><br /><span class="text-stone-500">matikan untuk mode skematik</span></span>
          </label>
        </section>

        <SensitivityPanel
          v-if="manifest"
          :rows="comparison.rows.value"
          :observed-alpha="manifest.observedAlpha"
          :selected="selectedRun"
          @select-run="selectRun"
        />
      </aside>

      <!-- Tengah: peta + pemutar -->
      <main class="flex flex-col min-h-0 min-w-0 relative">
        <div v-if="isLoading" class="absolute inset-0 z-50 bg-white/80 backdrop-blur-xs flex items-center justify-center">
          <div class="flex items-center gap-2 text-stone-700 font-medium">
            <span class="w-5 h-5 rounded-full border-2 border-amber-600 border-t-transparent animate-spin"></span>
            Memuat peta dan simulasi aliran...
          </div>
        </div>
        <div v-else-if="errorMessage" class="absolute inset-0 z-50 bg-red-50 flex items-center justify-center p-6">
          <div class="bg-white border border-red-200 rounded-xl p-5 max-w-md shadow-md text-center space-y-2">
            <div class="text-red-600 font-bold">Gagal memuat data</div>
            <p class="text-sm text-stone-600">{{ errorMessage }}</p>
          </div>
        </div>

        <div class="flex-1 min-h-0 relative">
          <MapCanvas
            v-if="topology"
            :topology="topology"
            :geometry="geometry"
            :edge-flows="currentEdgeFlows"
            :effective-capacities="effectiveCapacities"
            :active-path="activePath"
            :min-cut-edges="minCutEdges"
            :source-side-nodes="sourceSideNodes"
            :sink-side-nodes="sinkSideNodes"
            :selected-edge-id="selectedEdge?.id ?? null"
            :residual-mode="residualMode"
            :show-base-map="showBaseMap"
            :visible-edge-ids="visibleEdgeIds"
            :halos="halos"
            :active-terminals="activeTerminals"
            :market-active="activeTrace?.meta.pasarActive ?? true"
            @select-edge="(e) => { selectedEdge = e; selectedNode = null }"
            @select-node="(n) => { selectedNode = n; selectedEdge = null }"
          >
            <Legend :residual-mode="residualMode" />
            <div
              v-if="pathOutsideRoute"
              class="absolute top-4 left-1/2 -translate-x-1/2 z-[400] max-w-[80%] rounded-xl border border-amber-300 bg-amber-50/95 px-4 py-2 text-[13px] text-amber-900 shadow-md"
            >
              Jalur langkah ini tidak melewati rute yang dipilih. Pilih <b>Semua rute</b> untuk melihatnya di peta.
            </div>
          </MapCanvas>
        </div>

        <StepPlayer
          v-if="activeTrace"
          :total-steps="totalSteps"
          :current-step-index="currentStepIndex"
          :total-flow="currentStep ? currentStep.totalFlow : 0"
          :max-flow="activeTrace.result.maxFlow"
          :is-playing="isPlaying"
          :play-speed="playSpeed"
          @update:current-step-index="(i) => (currentStepIndex = i)"
          @toggle-play="toggle"
          @change-speed="setSpeed"
          @reset="reset"
        />
      </main>

      <!-- Kanan: penjelasan algoritma -->
      <aside class="overflow-y-auto bg-stone-50 border-l border-stone-200 p-5 space-y-5">
        <template v-if="topology && activeTrace">
          <AlgorithmPanel :topology="topology" :trace="activeTrace" :step-index="currentStepIndex" />
          <CutPanel :topology="topology" :trace="activeTrace" :is-final="isAtFinalStep" />
        </template>

        <ConditionCompare
          v-if="manifest && selectedRun"
          :rows="comparison.rows.value"
          :observed-alpha="manifest.observedAlpha"
          :source-code="selectedRun.sourceCode"
          :sink-code="selectedRun.sinkCode"
          :is-loading="comparison.isLoading.value"
        />

        <InspectPanel
          :edge="selectedEdge"
          :node="selectedNode"
          :edge-flows="currentEdgeFlows"
          :effective-capacities="effectiveCapacities"
          :source-side-nodes="sourceSideNodes"
          :is-final="isAtFinalStep"
        />
      </aside>
    </div>
  </div>
</template>
