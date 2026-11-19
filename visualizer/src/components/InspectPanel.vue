<script setup lang="ts">
import { computed } from 'vue'
import type { EdgeDef, NodeDef, RouteDef } from '../core/types'
import { getFlowRatioColor } from '../theme/tokens'

const props = defineProps<{
  edge: EdgeDef | null
  node: NodeDef | null
  edgeFlows: Record<number, number>
  effectiveCapacities: Record<number, number>
  sourceSideNodes: number[]
  isFinal: boolean
  routes?: RouteDef[]
  marketActive?: boolean
}>()

const currentFlow = computed(() => (props.edge ? props.edgeFlows[props.edge.id] ?? 0 : 0))
const effectiveCap = computed(() => (props.edge ? props.effectiveCapacities[props.edge.id] ?? props.edge.capacity : 0))
const residualCap = computed(() => Math.max(0, effectiveCap.value - currentFlow.value))
const ratio = computed(() => (effectiveCap.value > 0 ? Math.min(100, Math.round((currentFlow.value / effectiveCap.value) * 100)) : 0))
const ratioColor = computed(() => getFlowRatioColor(currentFlow.value, effectiveCap.value))

// Rute yang melewati ruas yang sedang dipilih
const passingRoutes = computed(() => {
  if (!props.edge || !props.routes) return []
  return props.routes.filter((r) => r.edgeIds.includes(props.edge!.id))
})
</script>

<template>
  <section class="rounded-2xl border border-stone-200 bg-white shadow-sm p-5 space-y-3">
    <div class="flex items-center justify-between border-b border-stone-100 pb-2">
      <h2 class="text-base font-bold text-stone-900">Detail Ruas / Simpul Terpilih</h2>
      <span v-if="edge" class="text-xs font-mono font-bold px-2 py-0.5 rounded bg-stone-100 text-stone-700">
        Ruas #{{ edge.id }}
      </span>
    </div>

    <!-- Informasi Ruas Jalan -->
    <div v-if="edge" class="space-y-3 text-sm">
      <div>
        <div class="font-extrabold text-stone-900 text-sm leading-snug">{{ edge.road }}</div>
        <div class="text-xs font-mono text-stone-500 mt-0.5">{{ edge.code }}</div>
      </div>

      <!-- Tag Khusus Kondisi Lapangan -->
      <div v-if="edge.isMarket || edge.closedInMorning" class="flex flex-wrap gap-1.5">
        <span v-if="edge.isMarket" class="rounded-md bg-orange-100 text-orange-800 text-[11px] font-bold px-2 py-0.5">
          ⚠️ Ruas Jl. Gasibu Atas (kapasitas turun saat pasar ramai)
        </span>
        <span v-if="edge.closedInMorning && marketActive" class="rounded-md bg-red-100 text-red-800 text-[11px] font-bold px-2 py-0.5">
          ⛔ Ditutup Total Minggu Pagi
        </span>
      </div>

      <!-- Utilisasi Kapasitas Ruas -->
      <div class="space-y-1.5 rounded-xl border border-stone-100 bg-stone-50 p-3">
        <div class="flex items-center justify-between text-xs">
          <span class="font-bold text-stone-700">Tingkat Kepenuhan (Utilisasi):</span>
          <span class="font-mono font-bold px-2 py-0.5 rounded text-white" :style="{ backgroundColor: ratioColor }">
            {{ ratio }}%
          </span>
        </div>
        <div class="h-2 w-full rounded-full bg-stone-200 overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-300"
            :style="{ width: `${ratio}%`, backgroundColor: ratioColor }"
          ></div>
        </div>
      </div>

      <!-- Rincian Numerik Kapasitas & Arus -->
      <div class="grid grid-cols-2 gap-2 text-stone-600 text-xs">
        <div class="rounded-lg border border-stone-100 p-2">
          <span class="text-[11px] uppercase text-stone-400 block font-semibold">Arus saat ini</span>
          <span class="font-mono font-extrabold text-sm text-orange-700">{{ currentFlow }} <small class="text-stone-500 font-normal">kend/jam</small></span>
        </div>
        <div class="rounded-lg border border-stone-100 p-2">
          <span class="text-[11px] uppercase text-stone-400 block font-semibold">Kapasitas efektif</span>
          <span class="font-mono font-bold text-sm text-stone-900">{{ effectiveCap }} <small class="text-stone-500 font-normal">kend/jam</small></span>
        </div>
        <div class="rounded-lg border border-stone-100 p-2">
          <span class="text-[11px] uppercase text-stone-400 block font-semibold">Kapasitas dasar</span>
          <span class="font-bold text-stone-700">{{ edge.capacity }} kend/jam</span>
        </div>
        <div class="rounded-lg border border-stone-100 p-2">
          <span class="text-[11px] uppercase text-stone-400 block font-semibold">Kapasitas sisa (residual)</span>
          <span class="font-mono font-bold text-emerald-700">{{ residualCap }} kend/jam</span>
        </div>
      </div>

      <!-- Cabang Rute yang Melintas -->
      <div v-if="passingRoutes.length" class="space-y-1.5 pt-1 border-t border-stone-100">
        <div class="text-xs font-bold text-stone-700">Dilewati oleh {{ passingRoutes.length }} cabang rute:</div>
        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="pr in passingRoutes"
            :key="pr.id"
            class="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold border"
            :style="{ borderColor: pr.color, color: pr.color, backgroundColor: pr.color + '10' }"
          >
            <span class="h-1.5 w-1.5 rounded-full" :style="{ backgroundColor: pr.color }"></span>
            {{ pr.id }}
          </span>
        </div>
      </div>
    </div>

    <!-- Informasi Simpul / Persimpangan -->
    <div v-else-if="node" class="space-y-2 text-sm">
      <div class="font-bold text-stone-900 text-sm border-b border-stone-100 pb-1">
        {{ node.code }} <span class="font-normal text-stone-400">(ID {{ node.id }})</span>
      </div>
      <p class="text-stone-600">{{ node.label }}</p>
      <div class="text-xs text-stone-500 font-mono">
        Posisi: [{{ node.pos[0].toFixed(5) }}, {{ node.pos[1].toFixed(5) }}]
      </div>
      <div v-if="isFinal && sourceSideNodes.includes(node.id)" class="text-[13px] font-semibold text-blue-600">
        Partisi: sisi S (terjangkau di residual graph)
      </div>
      <div v-else-if="isFinal" class="text-[13px] font-semibold" style="color: #a16207">
        Partisi: sisi T (tidak terjangkau dari S)
      </div>
    </div>

    <div v-else class="text-[13px] text-stone-400 italic py-2 text-center bg-stone-50 rounded-xl border border-dashed border-stone-200">
      Klik salah satu ruas jalan atau simpul pada peta untuk menginspeksi nilai arus, kapasitas, dan rute yang melintas.
    </div>
  </section>
</template>
