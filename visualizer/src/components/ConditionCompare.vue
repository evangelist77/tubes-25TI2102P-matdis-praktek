<script setup lang="ts">
import { computed } from 'vue'
import type { ComparisonRow } from '../composables/useComparison'

const props = defineProps<{
  rows: ComparisonRow[]
  observedAlpha: number
  sourceCode: string
  sinkCode: string
  isLoading: boolean
}>()

const normal = computed(() => props.rows.find((r) => r.run.alpha === 0) ?? null)
const pasar = computed(() => props.rows.find((r) => r.run.alpha === props.observedAlpha) ?? null)

const names = (r: ComparisonRow | null) =>
  r ? r.bottlenecks.map((b) => `${b.road.split(' (')[0]} (${b.capacity})`).join(' + ') : '—'

const summary = computed(() => {
  if (!normal.value || !pasar.value) return ''
  const drop = normal.value.maxFlow - pasar.value.maxFlow
  const same = JSON.stringify(normal.value.bottlenecks.map((b) => b.edgeId).sort()) ===
    JSON.stringify(pasar.value.bottlenecks.map((b) => b.edgeId).sort())
  if (drop <= 0) {
    return same
      ? 'Pasar tidak mengubah arus maksimum pasangan ini: pembatasnya tetap ruas yang sama.'
      : 'Arus maksimum sama, tetapi ruas pembatasnya berpindah.'
  }
  const pct = Math.round((drop / normal.value.maxFlow) * 100)
  return `Pasar menurunkan arus maksimum ${drop} kend/jam (−${pct}%)${same ? '' : ', dan pembatasnya berpindah ruas'}.`
})
</script>

<template>
  <section class="rounded-2xl border border-stone-200 bg-white shadow-sm p-5 space-y-3">
    <div>
      <h2 class="text-base font-bold text-stone-900">Tanpa pasar vs pasar penuh</h2>
      <p class="text-[13px] text-stone-500">Pasangan {{ sourceCode }} → {{ sinkCode }}</p>
    </div>

    <div v-if="isLoading" class="text-sm text-stone-400 italic">Memuat…</div>
    <template v-else-if="normal && pasar">
      <div class="grid grid-cols-2 gap-3">
        <div class="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
          <div class="text-[11px] font-bold uppercase tracking-wide text-emerald-700">Tanpa pasar</div>
          <div class="mt-1 font-mono text-2xl font-extrabold text-stone-900">{{ normal.maxFlow }}</div>
          <div class="text-[11px] text-stone-500">kend/jam</div>
          <div class="mt-2 text-xs text-stone-600 leading-snug">Pembatas: {{ names(normal) }}</div>
        </div>
        <div class="rounded-xl border border-orange-200 bg-orange-50/60 p-3">
          <div class="text-[11px] font-bold uppercase tracking-wide text-orange-700">Pasar penuh</div>
          <div class="mt-1 font-mono text-2xl font-extrabold text-stone-900">{{ pasar.maxFlow }}</div>
          <div class="text-[11px] text-stone-500">kend/jam</div>
          <div class="mt-2 text-xs text-stone-600 leading-snug">Pembatas: {{ names(pasar) }}</div>
        </div>
      </div>
      <p class="text-[13px] leading-relaxed text-stone-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
        {{ summary }}
      </p>
    </template>
  </section>
</template>
