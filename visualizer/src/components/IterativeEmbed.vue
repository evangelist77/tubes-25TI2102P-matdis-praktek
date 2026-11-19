<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import MapCanvas from './MapCanvas.vue'
import type { ResidualTraversal, TerminalPairId } from '../core/iterative'
import type { GeometryMap, Topology } from '../core/types'
import { themeTokens } from '../theme/tokens'

const props = defineProps<{
  topology: Topology
  geometry: GeometryMap
  selectedPair: 'all' | TerminalPairId
  activePair: string
  currentRound: number
  totalRounds: number
  pairRound: number
  pairTotalRounds: number
  roundName: string
  edgeFlows: Record<number, number>
  effectiveCapacities: Record<number, number>
  activePath: number[]
  activePathReverse: number[]
  currentPath: ResidualTraversal[]
  totalFlow: number
  maxFlow: number
  isFinal: boolean
  isMarketActive: boolean
}>()

const emit = defineEmits<{
  (e: 'update:current-round', round: number): void
  (e: 'select-pair', pair: 'all' | TerminalPairId): void
  (e: 'select-condition', condition: 'normal' | 'pasar'): void
}>()

const pairs = [
  { id: 'all', label: 'Semua' },
  { id: 'S1-T1', label: 'S₁ → T₁' },
  { id: 'S1-T2', label: 'S₁ → T₂' },
  { id: 'S2-T1', label: 'S₂ → T₁' },
  { id: 'S2-T2', label: 'S₂ → T₂' }
]

const isPlaying = ref(false)
let timer: ReturnType<typeof setInterval> | null = null

function stop() {
  isPlaying.value = false
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

function play() {
  if (props.totalRounds === 0) return
  if (props.currentRound >= props.totalRounds) emit('update:current-round', 0)
  stop()
  isPlaying.value = true
  timer = setInterval(() => {
    if (props.currentRound >= props.totalRounds) {
      stop()
      return
    }
    emit('update:current-round', props.currentRound + 1)
  }, 1300)
}

function moveTo(round: number) {
  emit('update:current-round', Math.min(props.totalRounds, Math.max(0, round)))
}

watch(() => props.totalRounds, stop)
watch(() => [props.selectedPair, props.activePair], stop)
watch(() => props.currentRound, (round) => {
  if (round >= props.totalRounds) stop()
})
onUnmounted(stop)

const openPanel = ref<'flow' | 'legend' | null>(null)

const activeTerminalIds = computed(() => {
  const activeCodes = new Set(props.activePair.split('-'))
  return props.topology.nodes
    .filter((node) => activeCodes.has(node.code))
    .map((node) => node.id)
})

const roundLabel = computed(() =>
  props.selectedPair === 'all'
    ? props.roundName.split(' · ').pop() ?? props.roundName
    : props.roundName
)

const progressLabel = computed(() =>
  props.selectedPair === 'all'
    ? props.roundName
    : `${props.activePair.replace('-', ' → ')} · ${props.roundName}`
)

const pathSummary = computed(() => {
  if (!props.currentPath.length) return ''
  const codes = new Map(props.topology.nodes.map((node) => [node.id, node.code]))
  return [
    codes.get(props.currentPath[0].from) ?? '?',
    ...props.currentPath.map((edge) => codes.get(edge.to) ?? '?')
  ].join(' → ')
})

const bottleneck = computed(() =>
  props.currentPath.length
    ? Math.min(...props.currentPath.map((edge) => edge.residualBefore))
    : 0
)

const noAugmentingPath = computed(() => props.pairTotalRounds === 0 && props.maxFlow === 0)

function togglePanel(panel: 'flow' | 'legend') {
  openPanel.value = openPanel.value === panel ? null : panel
}
</script>

<template>
  <main class="relative h-full min-h-[380px] w-full overflow-hidden text-slate-900">
    <MapCanvas
      class="absolute inset-0"
      compact
      :topology="topology"
      :geometry="geometry"
      :edge-flows="edgeFlows"
      :effective-capacities="effectiveCapacities"
      :active-path="activePath"
      :active-path-reverse="activePathReverse"
      :active-terminals="activeTerminalIds"
      :market-active="isMarketActive"
      :show-base-map="true"
    />

    <div class="pointer-events-none absolute inset-x-2 top-2 z-[1000] flex flex-wrap items-start justify-between gap-1.5 sm:inset-x-3 sm:top-3">
      <nav class="pointer-events-auto flex flex-wrap gap-1 rounded-xl bg-white/90 p-1 shadow-md backdrop-blur-sm" aria-label="Pilih pasangan terminal">
        <button
          v-for="pair in pairs"
          :key="pair.id"
          type="button"
          class="rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors sm:px-3 sm:text-xs"
          :class="selectedPair === pair.id ? 'border-indigo-950 bg-indigo-950 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-amber-50'"
          :aria-pressed="selectedPair === pair.id"
          @click="emit('select-pair', pair.id)"
        >
          {{ pair.label }}
        </button>
      </nav>

      <div class="pointer-events-auto flex flex-wrap justify-end gap-1">
        <nav class="flex gap-1 rounded-xl bg-white/90 p-1 shadow-md backdrop-blur-sm" aria-label="Pilih kondisi pasar">
          <button
            type="button"
            class="rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors sm:px-3 sm:text-xs"
            :class="!isMarketActive ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-emerald-50'"
            :aria-pressed="!isMarketActive"
            @click="emit('select-condition', 'normal')"
          >
            Normal
          </button>
          <button
            type="button"
            class="rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors sm:px-3 sm:text-xs"
            :class="isMarketActive ? 'border-orange-700 bg-orange-700 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-orange-50'"
            :aria-pressed="isMarketActive"
            @click="emit('select-condition', 'pasar')"
          >
            Pasar penuh
          </button>
        </nav>
        <button
          type="button"
          class="rounded-xl border border-white/80 bg-white/90 px-2.5 py-1.5 text-[11px] font-bold text-slate-800 shadow-md backdrop-blur-sm"
          :aria-expanded="openPanel === 'flow'"
          aria-controls="iterative-flow-popout"
          @click="togglePanel('flow')"
        >
          Arus
        </button>
        <button
          type="button"
          class="rounded-xl border border-white/80 bg-white/90 px-2.5 py-1.5 text-[11px] font-bold text-slate-800 shadow-md backdrop-blur-sm"
          :aria-expanded="openPanel === 'legend'"
          aria-controls="iterative-legend-popout"
          @click="togglePanel('legend')"
        >
          Legenda
        </button>
      </div>
    </div>

    <section
      v-if="openPanel === 'flow'"
      id="iterative-flow-popout"
      class="absolute bottom-14 right-2 z-[1000] w-[min(19rem,calc(100%-1rem))] rounded-xl border border-slate-200 bg-white/95 p-3 text-xs text-slate-800 shadow-xl backdrop-blur-sm sm:bottom-16 sm:right-3"
      aria-label="Informasi arus"
    >
      <div class="flex items-start justify-between gap-3">
        <div>
          <h2 class="font-extrabold">Arus {{ activePair.replace('-', ' → ') }}</h2>
          <p class="mt-0.5 text-[11px] text-slate-500">{{ roundLabel }} · langkah {{ pairRound }}/{{ pairTotalRounds }}</p>
        </div>
        <button type="button" class="rounded px-1 text-base leading-none text-slate-500 hover:bg-slate-100" aria-label="Tutup informasi arus" @click="openPanel = null">×</button>
      </div>
      <p class="mt-2 font-mono text-xl font-black text-slate-950">
        {{ totalFlow }} <span class="text-sm font-bold text-slate-500">/ {{ maxFlow }} skr/jam</span>
      </p>
      <p v-if="currentPath.length" class="mt-1 leading-relaxed">
        {{ pathSummary }}<br>
        Bottleneck <b>{{ bottleneck }}</b> skr/jam
      </p>
      <p v-else-if="noAugmentingPath" class="mt-1 leading-relaxed">
        Tidak ada jalur augmentasi pada pasangan dan kondisi ini.
      </p>
      <p v-else class="mt-1 leading-relaxed">Pilih Maju untuk menampilkan jalur augmentasi.</p>
    </section>

    <section
      v-else-if="openPanel === 'legend'"
      id="iterative-legend-popout"
      class="absolute bottom-14 right-2 z-[1000] w-[min(19rem,calc(100%-1rem))] rounded-xl border border-slate-200 bg-white/95 p-3 text-xs text-slate-800 shadow-xl backdrop-blur-sm sm:bottom-16 sm:right-3"
      aria-label="Legenda peta"
    >
      <div class="flex items-center justify-between gap-3">
        <h2 class="font-extrabold">Legenda</h2>
        <button type="button" class="rounded px-1 text-base leading-none text-slate-500 hover:bg-slate-100" aria-label="Tutup legenda" @click="openPanel = null">×</button>
      </div>
      <div class="mt-2 space-y-2">
        <div>
          <p class="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">Arus / kapasitas</p>
          <div class="flex h-2 overflow-hidden rounded-full">
            <span class="flex-1" :style="{ backgroundColor: themeTokens.colors.ratio.low }"></span>
            <span class="flex-1" :style="{ backgroundColor: themeTokens.colors.ratio.moderate }"></span>
            <span class="flex-1" :style="{ backgroundColor: themeTokens.colors.ratio.high }"></span>
            <span class="flex-1" :style="{ backgroundColor: themeTokens.colors.ratio.critical }"></span>
            <span class="flex-1" :style="{ backgroundColor: themeTokens.colors.ratio.saturated }"></span>
          </div>
          <div class="mt-0.5 flex justify-between text-[10px] text-slate-500"><span>lancar</span><span>jenuh</span></div>
        </div>
        <div class="flex items-center gap-2">
          <span class="h-1 w-7 rounded" :style="{ backgroundColor: themeTokens.colors.edges.augmentingPath }"></span>
          Jalur augmentasi aktif
        </div>
        <div class="flex items-center gap-2">
          <span class="w-7 border-t-2 border-dashed" :style="{ borderColor: themeTokens.colors.edges.residualBack }"></span>
          Jalur balik residual
        </div>
        <div class="flex items-center gap-2">
          <span class="w-7 border-t-2 border-dotted" :style="{ borderColor: themeTokens.colors.edges.closed }"></span>
          Ruas tertutup
        </div>
        <div class="flex items-center gap-3 border-t border-slate-100 pt-2">
          <span class="inline-flex items-center gap-1.5"><i class="h-2.5 w-2.5 rounded-full bg-sky-600"></i>Sumber</span>
          <span class="inline-flex items-center gap-1.5"><i class="h-2.5 w-2.5 rounded-full bg-emerald-600"></i>Tujuan</span>
          <span class="text-slate-500">Ketebalan garis ∝ kapasitas</span>
        </div>
      </div>
    </section>

    <div class="absolute bottom-2 left-2 z-[1000] max-w-[calc(100%-13rem)] truncate rounded-lg bg-white/90 px-2 py-1 text-[10px] font-semibold text-slate-700 shadow-sm backdrop-blur-sm sm:bottom-3 sm:left-3 sm:text-[11px]">
      {{ progressLabel }}{{ isFinal ? ' · maksimum' : '' }}
    </div>

    <footer class="absolute bottom-2 right-2 z-[1000] flex items-center gap-1 sm:bottom-3 sm:right-3">
      <button
        type="button"
        class="rounded-lg border border-slate-300 bg-white/95 px-2.5 py-1.5 text-xs font-bold shadow-sm disabled:opacity-40"
        :disabled="currentRound === 0"
        aria-label="Kembali satu langkah"
        @click="moveTo(currentRound - 1)"
      >
        ‹
      </button>
      <button
        type="button"
        class="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-extrabold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
        :disabled="totalRounds === 0"
        :title="totalRounds === 0 ? 'Tidak ada langkah augmentasi untuk diputar' : undefined"
        @click="isPlaying ? stop() : play()"
      >
        {{ isPlaying ? 'Jeda' : 'Putar' }}
      </button>
      <button
        type="button"
        class="rounded-lg border border-slate-300 bg-white/95 px-2.5 py-1.5 text-xs font-bold shadow-sm disabled:opacity-40"
        :disabled="currentRound >= totalRounds"
        aria-label="Maju satu langkah"
        @click="moveTo(currentRound + 1)"
      >
        ›
      </button>
    </footer>
  </main>
</template>
