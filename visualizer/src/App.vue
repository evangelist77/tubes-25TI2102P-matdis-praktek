<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import AlgorithmPanel from './components/AlgorithmPanel.vue'
import ConditionCompare from './components/ConditionCompare.vue'
import ConditionToggle from './components/ConditionToggle.vue'
import CutPanel from './components/CutPanel.vue'
import InspectPanel from './components/InspectPanel.vue'
import IterativeEmbed from './components/IterativeEmbed.vue'
import IterativePanel from './components/IterativePanel.vue'
import IterativePlayer from './components/IterativePlayer.vue'
import Legend from './components/Legend.vue'
import MapCanvas from './components/MapCanvas.vue'
import RoutePanel from './components/RoutePanel.vue'
import SensitivityPanel from './components/SensitivityPanel.vue'
import StepPlayer from './components/StepPlayer.vue'
import { useComparison } from './composables/useComparison'
import { useReplay } from './composables/useReplay'
import { diffIterativeTrace, solveMaxFlow, type IterativeTrace, type MaxFlowResult, type TerminalPairId } from './core/iterative'
import { loadGeometry, loadIterativeTrace, loadManifest, loadRoutes, loadTopology, loadTrace } from './core/loader'
import {
  describeCondition,
  findDefaultRun,
  pickRunForPair,
  routesForPair,
  runForCondition,
  sinkSideNodeIds
} from './core/selectors'
import type { EdgeDef, GeometryMap, Manifest, ManifestEntry, NodeDef, RouteDef, Topology, Trace } from './core/types'

// Mode Visualisasi: 'single' (Alifah: langkah demi langkah per pasangan) vs 'iterative' (Ganesh: seluruh jaringan & 8 rute)
const initialMode = typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('mode')
const hasIterativeHash = typeof window !== 'undefined' && window.location.hash === '#iterative'
const isEmbedMode = ref(initialMode === 'embed')
const isIterativeOnly = ref(
  initialMode === 'iterative' || initialMode === 'embed' || hasIterativeHash
)
const viewMode = ref<'single' | 'iterative'>(isIterativeOnly.value ? 'iterative' : 'single')

const topology = ref<Topology | null>(null)
const manifest = ref<Manifest | null>(null)
const routes = ref<RouteDef[]>([])
const geometry = ref<GeometryMap>({})
const selectedRun = ref<ManifestEntry | null>(null)
const activeTrace = ref<Trace | null>(null)
const selectedRouteId = ref<string | null>(null)

const terminalPairs = [
  { id: 'S1-T1', sourceCode: 'S1', sinkCode: 'T1' },
  { id: 'S1-T2', sourceCode: 'S1', sinkCode: 'T2' },
  { id: 'S2-T1', sourceCode: 'S2', sinkCode: 'T1' },
  { id: 'S2-T2', sourceCode: 'S2', sinkCode: 'T2' }
] as const

interface IterativeRound {
  pairId: TerminalPairId
  round: number
}

const iterativePair = ref<'all' | TerminalPairId>('all')
const iterativeRound = ref<number>(0)

const isLoading = ref(true)
const errorMessage = ref<string | null>(null)
const selectedEdge = ref<EdgeDef | null>(null)
const selectedNode = ref<NodeDef | null>(null)
const residualMode = ref(false)
const showBaseMap = ref(true)

const totalSteps = computed(() => activeTrace.value?.steps.length ?? 0)
const { currentStepIndex, isPlaying, playSpeed, toggle, reset, stop, setSpeed } = useReplay(totalSteps)
const comparison = useComparison(topology, manifest, selectedRun)

// Pemetaan 8 cabang rute (P1 s.d. P8)
const routeCodeMap: Record<string, string> = {
  'S1-T1': 'P1',
  'S1-T1-Gasibu': 'P2',
  'S1-T2': 'P3',
  'S1-T2-Gasibu': 'P4',
  'S2-T1': 'P5',
  'S2-T1-Gasibu': 'P6',
  'S2-T2': 'P7',
  'S2-T2-Gasibu': 'P8'
}

onMounted(async () => {
  try {
    const [t, m, r, g] = await Promise.all([loadTopology(), loadManifest(), loadRoutes(), loadGeometry()])
    topology.value = t
    manifest.value = m
    routes.value = r.routes
    geometry.value = g

    // Deteksi parameter query mode=iterative dari URL
    const urlParams = new URLSearchParams(window.location.search)
    const mode = urlParams.get('mode')
    isEmbedMode.value = mode === 'embed'
    isIterativeOnly.value = mode === 'iterative' || mode === 'embed' || window.location.hash === '#iterative'
    if (isIterativeOnly.value) {
      viewMode.value = 'iterative'
    }

    const first = findDefaultRun(m)
    if (first) await selectRun(first)

  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Gagal memuat data simulasi.'
  } finally {
    isLoading.value = false
  }
})

watch(
  () => [selectedRun.value?.alpha, iterativePair.value],
  () => {
    iterativeRound.value = 0
  }
)

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

function chooseCondition(cond: 'normal' | 'pasar') {
  if (!manifest.value || !selectedRun.value) return
  const run = runForCondition(manifest.value, selectedRun.value.sourceCode, selectedRun.value.sinkCode, cond)
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

// Hasil iterative dibaca dari trace Python (iterative_a<alpha>.json). Bila berkasnya belum ada,
// keempat pasangan dihitung di browser sebagai cadangan.
const iterativePairResults = shallowRef(new Map<TerminalPairId, MaxFlowResult>())

async function refreshIterative() {
  const topo = topology.value
  const alpha = selectedRun.value?.alpha ?? 0
  if (!topo || viewMode.value !== 'iterative') return

  let trace: IterativeTrace | null = null
  try {
    trace = await loadIterativeTrace(alpha)
  } catch {
    console.warn(`Trace iterative alpha ${alpha} belum ada, dihitung di browser.`)
  }
  // saat pengembangan, cocokkan trace Python dengan hitungan browser
  if (trace && import.meta.env.DEV) {
    const diffs = diffIterativeTrace(topo, trace)
    if (diffs.length) console.warn(`Trace iterative alpha ${alpha} beda dengan hitungan browser:`, diffs)
  }

  const results = new Map<TerminalPairId, MaxFlowResult>()
  for (const pair of terminalPairs) {
    const source = topo.nodes.find((node) => node.code === pair.sourceCode)?.id
    const sink = topo.nodes.find((node) => node.code === pair.sinkCode)?.id
    if (source === undefined || sink === undefined) {
      throw new Error(`Topologi tidak memiliki pasangan ${pair.sourceCode} → ${pair.sinkCode}.`)
    }
    results.set(pair.id, trace?.pairs.find((p) => p.pairId === pair.id) ?? solveMaxFlow(topo, source, sink, alpha))
  }

  // hasil yang datang terlambat diabaikan bila kondisi sudah diganti
  if (topo === topology.value && alpha === (selectedRun.value?.alpha ?? 0)) iterativePairResults.value = results
}

watch([topology, () => selectedRun.value?.alpha, viewMode], () =>
  refreshIterative().catch((err) => {
    errorMessage.value = err instanceof Error ? err.message : 'Gagal menyiapkan data iterative.'
  })
)

const iterativeTimeline = computed<IterativeRound[]>(() => {
  const timeline: IterativeRound[] = []
  for (const pair of terminalPairs) {
    const result = iterativePairResults.value.get(pair.id)
    if (!result) return []
    timeline.push({ pairId: pair.id, round: 0 })
    for (let round = 1; round <= result.steps.length; round++) {
      timeline.push({ pairId: pair.id, round })
    }
  }
  return timeline
})

const iterativeCurrentPair = computed<TerminalPairId>(() => {
  if (iterativePair.value !== 'all') return iterativePair.value
  return iterativeTimeline.value[iterativeRound.value]?.pairId ?? terminalPairs[0].id
})

const iterativePairRound = computed(() =>
  iterativePair.value === 'all'
    ? iterativeTimeline.value[iterativeRound.value]?.round ?? 0
    : iterativeRound.value
)

const iterativeResult = computed(() => iterativePairResults.value.get(iterativeCurrentPair.value) ?? null)

const iterativeTotalRounds = computed(() =>
  iterativePair.value === 'all'
    ? Math.max(0, iterativeTimeline.value.length - 1)
    : iterativeResult.value?.steps.length ?? 0
)

const iterativeRoundNames = computed(() =>
  iterativePair.value === 'all'
    ? iterativeTimeline.value.map(({ pairId, round }) =>
        `${pairId.replace('-', ' → ')} · ${round === 0 ? 'Mulai' : `Langkah ${round}`}`
      )
    : ['Awal', ...(iterativeResult.value?.steps.map((step) => `Langkah ${step.step}`) ?? [])]
)
const iterativeRoundName = computed(() =>
  iterativeRoundNames.value[iterativeRound.value] ?? `Langkah ${iterativeRound.value}`
)

const iterativeCurrentStep = computed(() => {
  if (iterativePairRound.value <= 0) return null
  return iterativeResult.value?.steps[iterativePairRound.value - 1] ?? null
})

const pairRoutes = computed(() => {
  if (viewMode.value === 'iterative') {
    if (iterativePair.value === 'all') return routes.value
    const pair = terminalPairs.find(({ id }) => id === iterativePair.value)
    return pair ? routesForPair(routes.value, pair.sourceCode, pair.sinkCode) : []
  }
  return selectedRun.value ? routesForPair(routes.value, selectedRun.value.sourceCode, selectedRun.value.sinkCode) : []
})

const selectedRoute = computed(() => routes.value.find((r) => r.id === selectedRouteId.value) ?? null)
const visibleEdgeIds = computed(() => selectedRoute.value?.edgeIds ?? null)
const halos = computed(() =>
  selectedRoute.value
    ? [{ color: selectedRoute.value.color, edgeIds: selectedRoute.value.edgeIds }]
    : pairRoutes.value.map((r) => ({ color: r.color, edgeIds: r.edgeIds }))
)

const activeTerminals = computed(() => {
  if (viewMode.value === 'iterative') {
    const result = iterativeResult.value
    if (result) return [result.source, result.sink]
  }
  return activeTrace.value ? [activeTrace.value.meta.source, activeTrace.value.meta.sink] : []
})

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

const iterativeComputedFlows = computed(() => {
  return iterativeCurrentStep.value?.edgeFlows ?? {}
})

const iterativeCurrentFlow = computed(() => {
  return iterativeCurrentStep.value?.totalFlow ?? 0
})

const iterativeTotalMaxFlow = computed(() => {
  return iterativeResult.value?.maxFlow ?? 0
})

const currentEdgeFlows = computed<Record<number, number>>(() => {
  if (viewMode.value === 'iterative') return iterativeComputedFlows.value
  return currentStep.value?.edgeFlows ?? {}
})

const effectiveCapacities = computed<Record<number, number>>(() => {
  if (viewMode.value === 'iterative') return iterativeResult.value?.effectiveCapacity ?? {}
  return activeTrace.value?.effectiveCapacity ?? {}
})

const activePath = computed<number[]>(() => {
  if (viewMode.value === 'iterative') return iterativeCurrentStep.value?.path.map((edge) => edge.edgeId) ?? []
  return currentStep.value?.path ?? []
})

const activePathReverse = computed<number[]>(() =>
  viewMode.value === 'iterative'
    ? iterativeCurrentStep.value?.path.filter((edge) => edge.isBackward).map((edge) => edge.edgeId) ?? []
    : []
)

const isAtFinalStep = computed(() => {
  if (viewMode.value === 'iterative') return !!iterativeResult.value && iterativePairRound.value === iterativeResult.value.steps.length
  return !!activeTrace.value && currentStepIndex.value === totalSteps.value
})

const minCutEdges = computed(() =>
  isAtFinalStep.value
    ? viewMode.value === 'iterative'
      ? iterativeResult.value?.minCut ?? []
      : activeTrace.value?.result.minCut ?? []
    : []
)
const sourceSideNodes = computed(() =>
  isAtFinalStep.value
    ? viewMode.value === 'iterative'
      ? iterativeResult.value?.sourceSide ?? []
      : activeTrace.value?.result.sourceSide ?? []
    : []
)
const sinkSideNodes = computed(() =>
  isAtFinalStep.value && topology.value
    ? sinkSideNodeIds(
        topology.value,
        viewMode.value === 'iterative'
          ? iterativeResult.value?.sourceSide ?? []
          : activeTrace.value?.result.sourceSide ?? []
      )
    : []
)

const condition = computed(() =>
  selectedRun.value && manifest.value ? describeCondition(selectedRun.value.alpha, manifest.value.observedAlpha) : null
)

const isMarketActive = computed(() =>
  viewMode.value === 'iterative'
    ? (selectedRun.value?.alpha ?? 0) > 0
    : activeTrace.value?.meta.pasarActive ?? false
)
</script>

<template>
  <main v-if="isEmbedMode" class="h-screen w-screen overflow-hidden">
    <div v-if="isLoading || (!errorMessage && !iterativeResult)" class="grid h-full place-items-center bg-[#fbf7ed] text-sm font-semibold text-slate-600">
      Memuat visualisasi jaringan...
    </div>
    <div v-else-if="errorMessage || !topology || !iterativeResult" class="grid h-full place-items-center bg-red-50 p-5 text-center text-sm text-red-800">
      {{ errorMessage ?? 'Data visualisasi iterative tidak tersedia.' }}
    </div>
    <IterativeEmbed
      v-else
      :topology="topology"
      :geometry="geometry"
      :selected-pair="iterativePair"
      :active-pair="iterativeCurrentPair"
      :current-round="iterativeRound"
      :total-rounds="iterativeTotalRounds"
      :pair-round="iterativePairRound"
      :pair-total-rounds="iterativeResult.steps.length"
      :round-name="iterativeRoundName"
      :edge-flows="currentEdgeFlows"
      :effective-capacities="effectiveCapacities"
      :active-path="activePath"
      :active-path-reverse="activePathReverse"
      :current-path="iterativeCurrentStep?.path ?? []"
      :total-flow="iterativeCurrentFlow"
      :max-flow="iterativeTotalMaxFlow"
      :is-final="isAtFinalStep"
      :is-market-active="isMarketActive"
      @update:current-round="(round) => (iterativeRound = round)"
      @select-pair="(pair) => { iterativePair = pair; selectedRouteId = null }"
      @select-condition="chooseCondition"
    />
  </main>
  <div v-else class="flex flex-col h-screen w-screen overflow-hidden bg-stone-100 font-sans text-stone-800">
    <!-- Header Aplikasi -->
    <header class="bg-white border-b border-stone-200 z-10 shadow-2xs">
      <div class="h-1.5 tenda-pattern w-full"></div>
      <div class="px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div class="text-xs font-semibold uppercase tracking-wider text-amber-700">Kasus 4 · Pasar Tumpah Gasibu–Monju</div>
          <h1 class="text-xl font-extrabold text-stone-900 leading-tight">Visualisasi Aliran Maksimum dengan Ford-Fulkerson</h1>
        </div>

        <!-- Mode Selector: Alifah vs Ganesh -->
        <div v-if="!isIterativeOnly" class="inline-flex rounded-xl bg-stone-100 border border-stone-200 p-1 text-xs font-bold shadow-2xs">
          <button
            type="button"
            class="px-4 py-1.5 rounded-lg transition-all"
            :class="viewMode === 'single' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-900'"
            @click="viewMode = 'single'"
          >
            Langkah per Langkah (Alifah)
          </button>
          <button
            type="button"
            class="px-4 py-1.5 rounded-lg transition-all"
            :class="viewMode === 'iterative' ? 'bg-amber-600 text-white shadow-xs' : 'text-stone-500 hover:text-stone-900'"
            @click="viewMode = 'iterative'"
          >
            Iterative Jaringan (Ganesh)
          </button>
        </div>

        <div v-if="activeTrace" class="flex items-center gap-3">
          <span v-if="condition" class="rounded-full px-3 py-1 text-sm font-bold"
            :class="condition.key === 'normal' ? 'bg-emerald-100 text-emerald-800' : condition.key === 'pasar' ? 'bg-orange-100 text-orange-800' : 'bg-sky-100 text-sky-800'">
            {{ condition.title }}
          </span>
          <div class="rounded-xl border border-stone-200 bg-stone-50 px-4 py-1.5 text-right">
            <div class="text-[11px] font-bold uppercase text-stone-500">
              {{ viewMode === 'iterative' ? 'Arus Pasangan' : 'Arus maksimum' }}
            </div>
            <div class="font-mono text-xl font-extrabold text-stone-900 leading-tight">
              {{ viewMode === 'iterative' ? iterativeCurrentFlow : activeTrace.result.maxFlow }}
              <span class="text-xs font-semibold text-stone-500">
                {{ viewMode === 'iterative' ? ` / ${iterativeTotalMaxFlow} kend/jam` : ' kend/jam' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>

    <div class="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)_410px]">
      <!-- Kiri: pilihan kontrol -->
      <aside class="overflow-y-auto bg-white border-r border-stone-200 p-5 space-y-6">
        <!-- 1. Kondisi Pasar -->
        <section v-if="manifest" class="space-y-2.5">
          <h2 class="text-sm font-bold text-stone-900 flex items-center gap-1.5">
            <span class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-600 text-[11px] text-white font-bold">1</span>
            Pilih Kondisi
          </h2>
          <ConditionToggle :manifest="manifest" :selected="selectedRun" @choose="chooseCondition" />
        </section>

        <!-- 2. Rute / Pasangan -->
        <section v-if="manifest" class="space-y-2.5">
          <h2 class="text-sm font-bold text-stone-900 flex items-center gap-1.5">
            <span class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-600 text-[11px] text-white font-bold">2</span>
            {{ viewMode === 'iterative' ? 'Pasangan & Cabang Rute (P₁–P₈)' : 'Pilih Rute' }}
          </h2>

          <!-- Kontrol Pasangan Khusus Mode Iterative -->
          <div v-if="viewMode === 'iterative'" class="space-y-3">
            <div class="space-y-1.5">
              <span class="text-xs font-semibold text-stone-500 uppercase tracking-wider">Pilih Pasangan S → T</span>
              <div class="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  class="col-span-2 rounded-lg border px-3 py-2 text-sm font-bold transition-all text-left flex items-center justify-between"
                  :class="iterativePair === 'all' ? 'border-amber-500 bg-amber-50 text-amber-900 ring-1 ring-amber-400' : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-50'"
                  @click="() => { iterativePair = 'all'; selectedRouteId = null; }"
                >
                  <span>Semua Pasangan</span>
                  <span class="text-xs opacity-75 font-normal">4 perhitungan berurutan</span>
                </button>
                <button
                  v-for="pair in terminalPairs"
                  :key="pair.id"
                  type="button"
                  class="rounded-lg border px-3 py-2 text-sm font-bold transition-all"
                  :class="iterativePair === pair.id ? 'border-amber-500 bg-amber-50 text-amber-900 ring-1 ring-amber-400' : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-50'"
                  @click="() => { iterativePair = pair.id; selectedRouteId = null; }"
                >
                  {{ pair.id.replace('-', ' → ') }}
                </button>
              </div>
            </div>

            <!-- List Cabang Rute (8 Rute P1 - P8) -->
            <div class="space-y-1.5">
              <span class="text-xs font-semibold text-stone-500 uppercase tracking-wider">Filter Cabang Rute (P₁–P₈)</span>
              <button
                type="button"
                class="w-full rounded-xl border px-3.5 py-2.5 text-left transition-colors"
                :class="selectedRouteId === null ? 'border-stone-800 bg-stone-900 text-white shadow-xs' : 'border-stone-200 bg-white text-stone-800 hover:bg-stone-50'"
                @click="selectedRouteId = null"
              >
                <div class="text-sm font-bold">Semua Cabang Rute</div>
                <div class="text-xs opacity-80">Tampilkan seluruh jaringan rute di peta</div>
              </button>

              <button
                v-for="r in pairRoutes"
                :key="r.id"
                type="button"
                class="w-full rounded-xl border bg-white px-3 py-2.5 text-left transition-all hover:shadow-xs"
                :class="selectedRouteId === r.id ? 'ring-2 border-amber-500 bg-amber-50/40' : 'border-stone-200'"
                :style="selectedRouteId === r.id ? { borderColor: r.color, '--tw-ring-color': r.color } : {}"
                @click="selectedRouteId = (selectedRouteId === r.id ? null : r.id)"
              >
                <div class="flex items-start gap-2.5">
                  <span class="mt-0.5 h-5 w-5 shrink-0 rounded flex items-center justify-center text-[10px] font-extrabold text-white" :style="{ backgroundColor: r.color }">
                    {{ routeCodeMap[r.id] ?? '•' }}
                  </span>
                  <div class="min-w-0 flex-1">
                    <div class="text-sm font-bold text-stone-900 leading-snug">{{ r.corridor }}</div>
                    <div class="text-xs text-stone-600 mt-0.5 leading-snug">via {{ r.via }}</div>
                    <div class="flex items-center justify-between text-[11px] text-stone-400 mt-1">
                      <span>{{ r.distanceInfo }}</span>
                      <span v-if="r.edgeIds.includes(25)" class="text-orange-700 font-semibold">[Pasar Gasibu]</span>
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          <!-- RoutePanel Bawaan untuk Mode Single -->
          <RoutePanel
            v-else
            :manifest="manifest"
            :routes="routes"
            :selected="selectedRun"
            :selected-route-id="selectedRouteId"
            @choose-pair="choosePair"
            @choose-route="(id) => (selectedRouteId = id)"
          />
        </section>

        <!-- 3. Opsi Tampilan -->
        <section class="space-y-2">
          <h2 class="text-sm font-bold text-stone-900 flex items-center gap-1.5">
            <span class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-600 text-[11px] text-white font-bold">3</span>
            Opsi Tampilan
          </h2>
          <label class="flex items-start gap-2.5 text-[13px] text-stone-700 cursor-pointer">
            <input v-model="residualMode" type="checkbox" class="mt-0.5 accent-violet-600" />
            <span><b>Mode residual</b><br /><span class="text-stone-500">tampilkan kapasitas sisa dan edge balik</span></span>
          </label>
          <label class="flex items-start gap-2.5 text-[13px] text-stone-700 cursor-pointer">
            <input v-model="showBaseMap" type="checkbox" class="mt-0.5 accent-amber-600" />
            <span><b>Peta dasar</b><br /><span class="text-stone-500">matikan untuk mode skematik</span></span>
          </label>
        </section>

        <!-- Sensitivitas -->
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
            :active-path-reverse="activePathReverse"
            :min-cut-edges="minCutEdges"
            :source-side-nodes="sourceSideNodes"
            :sink-side-nodes="sinkSideNodes"
            :selected-edge-id="selectedEdge?.id ?? null"
            :residual-mode="residualMode"
            :show-base-map="showBaseMap"
            :visible-edge-ids="visibleEdgeIds"
            :halos="halos"
            :active-terminals="activeTerminals"
            :market-active="isMarketActive"
            @select-edge="(e) => { selectedEdge = e; selectedNode = null }"
            @select-node="(n) => { selectedNode = n; selectedEdge = null }"
          >
            <Legend :residual-mode="residualMode" />
            <div
              v-if="pathOutsideRoute"
              class="absolute top-4 left-1/2 -translate-x-1/2 z-[400] max-w-[80%] rounded-xl border border-amber-300 bg-amber-50/95 px-4 py-2 text-[13px] text-amber-900 shadow-md"
            >
              Jalur langkah ini tidak melewati rute yang dipilih. Pilih <b>Semua Cabang Rute</b> untuk melihatnya di peta.
            </div>
          </MapCanvas>
        </div>

        <!-- Pemutar Interaktif (Ganesh: IterativePlayer vs Alifah: StepPlayer) -->
        <IterativePlayer
          v-if="viewMode === 'iterative'"
          :current-round="iterativeRound"
          :total-rounds="iterativeTotalRounds"
          :total-flow="iterativeCurrentFlow"
          :max-flow="iterativeTotalMaxFlow"
          :round-names="iterativeRoundNames"
          @update:current-round="(r) => (iterativeRound = r)"
        />

        <StepPlayer
          v-else-if="activeTrace"
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

      <!-- Kanan: panel penjelasan algoritma & inspeksi -->
      <aside class="overflow-y-auto bg-stone-50 border-l border-stone-200 p-5 space-y-5">
        <!-- Panel Iterative Ganesh -->
        <template v-if="viewMode === 'iterative' && topology">
          <IterativePanel
            :topology="topology"
            :routes="routes"
            :active-pair="iterativeCurrentPair"
            :is-all-pairs="iterativePair === 'all'"
            :active-route-id="selectedRouteId"
            :is-market-active="isMarketActive"
            :round-index="iterativePairRound"
            :total-rounds="iterativeTotalRounds"
            :is-final="isAtFinalStep"
            :current-path="iterativeCurrentStep?.path ?? []"
            :total-flow="iterativeCurrentFlow"
            :edge-flows="currentEdgeFlows"
            :effective-capacities="effectiveCapacities"
            :max-flow="iterativeTotalMaxFlow"
            :min-cut-edges="iterativeResult?.minCut ?? []"
            @select-route="(id) => (selectedRouteId = id)"
          />
        </template>

        <!-- Panel Single Alifah -->
        <template v-else-if="topology && activeTrace">
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
          :routes="routes"
          :market-active="isMarketActive"
        />
      </aside>
    </div>
  </div>
</template>
