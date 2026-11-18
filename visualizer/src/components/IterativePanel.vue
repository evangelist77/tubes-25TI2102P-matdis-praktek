<script setup lang="ts">
import { computed } from 'vue'
import type { ResidualTraversal } from '../core/iterative'
import type { RouteDef, Topology } from '../core/types'
import { getFlowRatioColor } from '../theme/tokens'

const props = defineProps<{
  topology: Topology
  routes: RouteDef[]
  activePair: string
  isAllPairs: boolean
  activeRouteId: string | null
  isMarketActive: boolean
  roundIndex: number
  totalRounds: number
  isFinal: boolean
  currentPath: ResidualTraversal[]
  totalFlow: number
  edgeFlows: Record<number, number>
  effectiveCapacities: Record<number, number>
  maxFlow: number
  minCutEdges: number[]
}>()

const emit = defineEmits<{
  (e: 'select-route', routeId: string | null): void
}>()

const routeCodeMap: Record<string, { code: string; label: string }> = {
  'S1-T1': { code: 'P1', label: 'Koridor Utara Gasibu via Singaperbangsa' },
  'S1-T1-Gasibu': { code: 'P2', label: 'Koridor Gasibu Atas – Surapati' },
  'S1-T2': { code: 'P3', label: 'Koridor Selatan Belakang Gedung Sate via Sulanjana' },
  'S1-T2-Gasibu': { code: 'P4', label: 'Koridor Gasibu Atas – Sentot Alibasyah' },
  'S2-T1': { code: 'P5', label: 'Koridor Utara Dipatiukur – Monju' },
  'S2-T1-Gasibu': { code: 'P6', label: 'Koridor Dago – Gasibu Atas – Surapati' },
  'S2-T2': { code: 'P7', label: 'Koridor Selatan Dago – Diponegoro' },
  'S2-T2-Gasibu': { code: 'P8', label: 'Koridor Dago – Gasibu Atas – Sentot Alibasyah' }
}

const marketEdge = computed(() => props.topology.edges.find((edge) => edge.isMarket) ?? null)
const marketFlow = computed(() => (marketEdge.value ? props.edgeFlows[marketEdge.value.id] ?? 0 : 0))
const marketCap = computed(() =>
  marketEdge.value
    ? props.effectiveCapacities[marketEdge.value.id] ?? marketEdge.value.capacity
    : 0
)
const marketRatio = computed(() =>
  marketCap.value > 0 ? Math.round((marketFlow.value / marketCap.value) * 100) : 0
)
const edgeById = computed(() => new Map(props.topology.edges.map((edge) => [edge.id, edge])))
const pathBottleneck = computed(() =>
  props.currentPath.length
    ? Math.min(...props.currentPath.map((edge) => edge.residualBefore))
    : 0
)
const cutCapacity = computed(() =>
  props.minCutEdges.reduce((sum, id) => sum + (props.effectiveCapacities[id] ?? 0), 0)
)
const detailedRoutes = computed(() =>
  props.routes.map((route) => {
    const meta = routeCodeMap[route.id] ?? { code: route.id, label: route.corridor }
    let highestUtilization = 0
    for (const id of route.edgeIds) {
      const edge = edgeById.value.get(id)
      const capacity = props.effectiveCapacities[id] ?? edge?.capacity ?? 0
      if (capacity > 0) {
        highestUtilization = Math.max(highestUtilization, (props.edgeFlows[id] ?? 0) / capacity)
      }
    }

    return {
      ...route,
      code: meta.code,
      cleanLabel: meta.label,
      passesMarket: route.edgeIds.some((id) => edgeById.value.get(id)?.isMarket),
      passesClosed: route.edgeIds.some((id) => edgeById.value.get(id)?.closedInMorning),
      ratio: Math.min(100, Math.round(highestUtilization * 100)),
      ratioColor: getFlowRatioColor(highestUtilization, 1)
    }
  })
)

const currentRoundTitle = computed(() => {
  if (props.roundIndex === 0 && props.totalRounds === 0) return 'Tidak ada aliran yang dapat dikirim'
  if (props.roundIndex === 0) return 'Kapasitas awal jaringan'
  if (props.isFinal) return 'Aliran maksimum tercapai'
  return `Jalur augmentasi ${props.roundIndex}`
})
</script>

<template>
  <section class="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
    <div class="px-5 py-4 bg-stone-50 border-b border-stone-200">
      <div class="flex items-center gap-2 mb-1">
        <span class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-600 text-[11px] font-bold text-white">Σ</span>
        <h2 class="text-base font-extrabold text-stone-900">Iterative Ford-Fulkerson</h2>
      </div>
      <p class="text-[13px] text-stone-600 leading-snug">
        Tiap pasangan terminal dihitung dengan solver baru menggunakan BFS (Edmonds–Karp). Di dalam satu
        perhitungan, semua cabang berbagi kapasitas ruas; arus direset saat berpindah pasangan.
      </p>
    </div>

    <div class="p-5 space-y-4 text-[13px] text-stone-700 leading-relaxed">
      <div class="rounded-xl border border-amber-200 bg-amber-50/70 p-4 space-y-2">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-bold uppercase tracking-wider text-amber-800">
            {{ roundIndex === 0 ? 'Sebelum aliran' : `Langkah ${roundIndex} dari ${totalRounds}` }}
          </span>
          <span class="rounded-full bg-amber-200/90 px-2.5 py-0.5 text-[11px] font-bold text-amber-900">
            {{ activePair.replace('-', ' → ') }}<template v-if="isAllPairs"> · solver baru</template>
          </span>
        </div>
        <div class="font-bold text-stone-900 text-sm leading-snug">{{ currentRoundTitle }}</div>
        <p v-if="roundIndex === 0 && totalRounds === 0" class="text-xs leading-relaxed">
          Tidak ada jalur augmentasi pada pasangan dan kondisi ini, sehingga arus maksimum 0 kend/jam dan tidak ada langkah untuk diputar.
          Pilih pasangan lain atau kondisi normal untuk melihat jalur yang tersedia.
        </p>
        <p v-else-if="roundIndex === 0" class="text-xs leading-relaxed">
          <template v-if="isAllPairs">
            Perhitungan pasangan ini dimulai dari arus 0; hasil pasangan sebelumnya tidak mengurangi kapasitasnya.
          </template>
          <template v-else>
            Semua rute untuk pasangan ini menggunakan kapasitas ruas yang sama.
          </template>
          Tekan <b>Maju</b> untuk melihat jalur dan bottleneck berikutnya.
        </p>
        <template v-else-if="currentPath.length">
          <ol class="space-y-1.5">
            <li
              v-for="(traversal, index) in currentPath"
              :key="`${traversal.edgeId}-${index}`"
              class="rounded-lg border border-amber-200 bg-white/80 px-2.5 py-1.5 text-xs"
            >
              <span class="font-bold">{{ index + 1 }}.</span>
              <span>{{ edgeById.get(traversal.edgeId)?.road ?? `Ruas #${traversal.edgeId}` }}</span>
              <span class="font-mono text-stone-500">({{ topology.nodes.find((node) => node.id === traversal.from)?.code }} → {{ topology.nodes.find((node) => node.id === traversal.to)?.code }})</span>
              <span v-if="traversal.isBackward" class="font-semibold text-violet-700">· edge balik</span>
              <span class="font-mono text-stone-600">· sisa {{ traversal.residualBefore }}</span>
            </li>
          </ol>
          <div class="border-t border-amber-200/70 pt-2 text-[12px] text-stone-700">
            Bottleneck jalur: <b class="font-mono">{{ pathBottleneck }}</b> kend/jam · total arus:
            <b class="font-mono">{{ totalFlow }}</b> kend/jam
          </div>
        </template>
        <p v-else class="text-xs leading-relaxed">
          Tidak ditemukan jalur augmentasi baru. Arus maksimum jaringan adalah {{ maxFlow }} kend/jam.
        </p>
      </div>

      <div class="rounded-xl border border-stone-200 bg-stone-50/90 p-4 space-y-3">
        <div class="flex items-center justify-between gap-2">
          <b class="text-stone-900 flex items-center gap-1.5 font-bold text-sm">
            <span class="h-2.5 w-2.5 rounded-full bg-orange-600"></span>
            Jl. Gasibu Atas
          </b>
          <span
            class="text-[11px] font-bold px-2 py-0.5 rounded-md"
            :class="marketRatio >= 100 ? 'bg-red-100 text-red-700' : marketRatio >= 60 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'"
          >
            Utilisasi {{ marketRatio }}%
          </span>
        </div>
        <p class="text-xs text-stone-600 leading-relaxed">
          Arus pada ruas ini berbagi kapasitas dengan semua jalur yang melintasinya.
        </p>
        <div class="space-y-1.5 text-xs font-mono">
          <div class="flex justify-between text-stone-600">
            <span>Arus lewat: <b class="text-stone-900">{{ marketFlow }} kend/jam</b></span>
            <span>Kapasitas efektif: <b class="text-stone-900">{{ marketCap }} kend/jam</b></span>
          </div>
          <div class="h-2.5 w-full rounded-full bg-stone-200 overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-300"
              :class="marketRatio >= 100 ? 'bg-red-600' : marketRatio >= 60 ? 'bg-amber-500' : 'bg-emerald-500'"
              :style="{ width: `${Math.min(100, marketRatio)}%` }"
            ></div>
          </div>
          <div class="flex justify-between text-[11px] text-stone-500">
            <span>0</span>
            <span>Sisa: {{ Math.max(0, marketCap - marketFlow) }} kend/jam</span>
            <span>{{ marketCap }}</span>
          </div>
        </div>
        <div v-if="isMarketActive" class="rounded-lg bg-orange-50 border border-orange-200 p-2.5 text-xs text-orange-900">
          <b>Pasar aktif:</b> kapasitas ruas pasar dan penutupan jalan mengikuti kondisi α yang dipilih.
        </div>
        <div v-else class="rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-900">
          <b>Kondisi normal:</b> kapasitas dasar ruas digunakan dan jalan pagi yang ditutup kembali dibuka.
        </div>
      </div>

      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <h3 class="text-xs font-bold uppercase tracking-wider text-stone-700">8 Cabang Rute Jaringan</h3>
          <span class="text-[11px] text-stone-500">Klik rute untuk sorot</span>
        </div>
        <div class="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
          <button
            v-for="route in detailedRoutes"
            :key="route.id"
            type="button"
            class="w-full rounded-xl border p-2.5 text-left transition-all"
            :class="activeRouteId === route.id ? 'border-amber-500 bg-amber-50/80 ring-2 ring-amber-400' : 'border-stone-200 bg-white hover:bg-stone-50'"
            @click="emit('select-route', activeRouteId === route.id ? null : route.id)"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-center gap-2">
                <span class="h-5 w-5 shrink-0 rounded-md flex items-center justify-center text-[10px] font-extrabold text-white" :style="{ backgroundColor: route.color }">
                  {{ route.code }}
                </span>
                <div>
                  <div class="text-xs font-bold text-stone-900 leading-snug">{{ route.cleanLabel }}</div>
                  <div class="text-[11px] text-stone-500">{{ route.source }} → {{ route.sink }} · via {{ route.via }}</div>
                </div>
              </div>
              <span
                class="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded"
                :class="route.ratio >= 100 ? 'bg-red-100 text-red-700' : route.ratio >= 60 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'"
              >
                {{ route.ratio }}%
              </span>
            </div>
            <div class="flex flex-wrap items-center gap-1.5 mt-2 text-[10px]">
              <span v-if="route.passesMarket" class="rounded bg-orange-100 px-1.5 py-0.2 text-orange-800 font-semibold">via Pasar Gasibu</span>
              <span v-if="route.passesClosed && isMarketActive" class="rounded bg-red-100 px-1.5 py-0.2 text-red-800 font-semibold">Terdampak Penutupan</span>
              <span class="text-stone-400 ml-auto">Utilisasi tertinggi pada ruas rute</span>
            </div>
          </button>
        </div>
      </div>

      <div class="rounded-xl bg-stone-900 text-stone-100 p-4 space-y-2.5 shadow-sm">
        <div class="flex items-center justify-between border-b border-stone-800 pb-2">
          <span class="text-xs uppercase tracking-wider text-amber-300 font-extrabold">Teorema Max-Flow Min-Cut</span>
          <span class="text-[11px] font-mono text-stone-400">Kasus 4</span>
        </div>
        <div class="grid grid-cols-2 gap-3 text-xs font-mono">
          <div>
            <span class="text-stone-400 block text-[11px]">Total Arus Optimal</span>
            <span class="text-lg font-extrabold text-emerald-400">{{ maxFlow }}</span>
            <span class="text-[11px] text-stone-400"> kend/jam</span>
          </div>
          <div>
            <span class="text-stone-400 block text-[11px]">Kondisi Simulasi</span>
            <span class="text-xs font-bold block" :class="isMarketActive ? 'text-orange-400' : 'text-emerald-400'">
              {{ isMarketActive ? 'Pasar aktif' : 'Normal' }}
            </span>
            <span class="text-[10px] text-stone-400">{{ isMarketActive ? 'α ' + Math.round((1 - marketCap / (marketEdge?.capacity || 1)) * 100) + '%' : 'Kapasitas dasar' }}</span>
          </div>
        </div>
        <div class="border-t border-stone-800 pt-2 text-[11px] text-stone-300">
          <div class="font-bold">Potongan minimum</div>
          <ul class="mt-1 space-y-0.5">
            <li v-for="id in minCutEdges" :key="id">{{ edgeById.get(id)?.road ?? `Ruas #${id}` }} · {{ effectiveCapacities[id] ?? 0 }}</li>
            <li v-if="!minCutEdges.length">Belum ada ruas potongan.</li>
          </ul>
          <div class="mt-1 font-mono">Σ kapasitas min-cut = {{ cutCapacity }} kend/jam</div>
        </div>
      </div>
    </div>
  </section>
</template>
