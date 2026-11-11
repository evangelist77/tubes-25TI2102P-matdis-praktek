<script setup lang="ts">
import type { EdgeDef, NodeDef } from '../core/types'

defineProps<{
  edge: EdgeDef | null
  node: NodeDef | null
  edgeFlows: Record<number, number>
  effectiveCapacities: Record<number, number>
  sourceSideNodes: number[]
  isFinal: boolean
}>()
</script>

<template>
  <section class="rounded-2xl border border-stone-200 bg-white shadow-sm p-5 space-y-2">
    <h2 class="text-base font-bold text-stone-900">Detail ruas / simpul</h2>

    <div v-if="edge" class="space-y-2 text-sm">
      <div class="font-bold text-stone-900 text-sm border-b border-stone-100 pb-1">{{ edge.road }}</div>
      <div class="grid grid-cols-2 gap-2 text-stone-600">
        <div>
          <span class="text-[11px] uppercase text-stone-400 block">ID ruas</span>
          <span class="font-mono font-bold text-stone-800">#{{ edge.id }}</span>
        </div>
        <div>
          <span class="text-[11px] uppercase text-stone-400 block">Arus saat ini</span>
          <span class="font-mono font-bold text-orange-700">{{ edgeFlows[edge.id] ?? 0 }} kend/jam</span>
        </div>
        <div>
          <span class="text-[11px] uppercase text-stone-400 block">Kapasitas dasar</span>
          <span class="font-bold text-stone-800">{{ edge.capacity }} kend/jam</span>
        </div>
        <div>
          <span class="text-[11px] uppercase text-stone-400 block">Kapasitas efektif</span>
          <span class="font-bold text-stone-800">{{ effectiveCapacities[edge.id] ?? edge.capacity }} kend/jam</span>
        </div>
        <div class="col-span-2">
          <span class="text-[11px] uppercase text-stone-400 block">Kapasitas sisa (residual)</span>
          <span class="font-mono font-bold text-emerald-700">
            {{ Math.max(0, (effectiveCapacities[edge.id] ?? edge.capacity) - (edgeFlows[edge.id] ?? 0)) }}
          </span>
        </div>
        <div class="col-span-2">
          <span class="text-[11px] uppercase text-stone-400 block">Hubungan simpul</span>
          <span class="font-mono font-semibold text-stone-700">{{ edge.code }}</span>
        </div>
      </div>
    </div>

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

    <div v-else class="text-[13px] text-stone-400 italic py-1">
      Klik ruas jalan atau simpul pada peta untuk melihat detail aliran.
    </div>
  </section>
</template>
