<script setup lang="ts">
import { computed } from 'vue'
import { describeStep } from '../core/selectors'
import type { Topology, Trace } from '../core/types'

const props = defineProps<{
  topology: Topology
  trace: Trace
  stepIndex: number // 0 = awal, 1..n = langkah ke-n
}>()

const total = computed(() => props.trace.steps.length)
const detail = computed(() => (props.stepIndex >= 1 ? describeStep(props.topology, props.trace, props.stepIndex) : null))
const forwardRows = computed(() => detail.value?.rows.filter((r) => r.kind === 'maju') ?? [])
const backRows = computed(() => detail.value?.rows.filter((r) => r.kind === 'balik') ?? [])
const minExpression = computed(() => (detail.value ? forwardRows.value.concat(backRows.value).map((r) => r.residualBefore).join(', ') : ''))

const sCode = computed(() => props.topology.nodes.find((n) => n.id === props.trace.meta.source)?.code ?? 'S')
const tCode = computed(() => props.topology.nodes.find((n) => n.id === props.trace.meta.sink)?.code ?? 'T')
const isFinal = computed(() => props.stepIndex === total.value)
</script>

<template>
  <section class="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
    <details class="group px-5 py-3.5 bg-stone-50 border-b border-stone-200" :open="stepIndex === 0">
      <summary class="cursor-pointer list-none flex items-center justify-between">
        <div>
          <h2 class="text-base font-bold text-stone-900">Algoritma Ford-Fulkerson</h2>
          <p class="text-[13px] text-stone-600">
            Arus terbesar dari <b>{{ sCode }}</b> ke <b>{{ tCode }}</b>, dicari langkah demi langkah
          </p>
        </div>
        <span class="text-xs text-stone-400 group-open:rotate-90 transition-transform">▶</span>
      </summary>
      <ol class="mt-2 text-[13px] text-stone-700 space-y-1 list-decimal list-inside">
        <li>Cari jalur dari {{ sCode }} ke {{ tCode }} yang semua ruasnya masih punya <b>sisa kapasitas</b>.</li>
        <li>Alirkan sebanyak <b>sisa terkecil</b> di jalur itu (ruas tersempit).</li>
        <li>Kurangi sisa kapasitas, lalu ulangi. Berhenti bila tak ada jalur lagi.</li>
      </ol>
    </details>

    <div class="p-5">
      <!-- Awal -->
      <div v-if="stepIndex === 0" class="space-y-2">
        <div class="text-sm font-bold text-stone-900">Awal: belum ada arus</div>
        <p class="text-[13px] text-stone-600 leading-relaxed">
          Setiap ruas punya kapasitas efektif (batas kendaraan/jam) yang tampil di peta. Ada
          <b>{{ total }} langkah</b> sampai arus maksimum ditemukan. Tekan <b>Maju</b> atau <b>Putar</b>.
        </p>
      </div>

      <!-- Langkah ke-k -->
      <div v-else-if="detail" class="space-y-3.5">
        <div class="flex items-baseline justify-between">
          <div class="text-sm font-bold text-stone-900">Langkah {{ detail.step }} dari {{ total }}</div>
          <div class="text-xs font-semibold text-amber-700">jalur augmentasi</div>
        </div>

        <p class="text-[13px] text-stone-600">
          Ditemukan jalur dari <b>{{ sCode }}</b> ke <b>{{ tCode }}</b>. Sisa kapasitas tiap ruas
          (<span class="font-mono">kapasitas − arus saat ini</span>):
        </p>

        <ol class="space-y-1.5">
          <li
            v-for="(r, i) in forwardRows"
            :key="r.edgeId"
            class="flex items-center gap-2.5 rounded-lg border px-3 py-2"
            :class="r.isBottleneck ? 'border-orange-400 bg-orange-50' : 'border-stone-200 bg-white'"
          >
            <span class="h-6 w-6 shrink-0 rounded-full bg-stone-800 text-white text-xs font-bold flex items-center justify-center">{{ i + 1 }}</span>
            <div class="min-w-0 flex-1">
              <div class="text-[13px] font-semibold text-stone-900 leading-snug">{{ r.road }}</div>
              <div class="text-[12px] font-mono text-stone-600">
                {{ r.capacity }} − {{ r.flowBefore }} = <b class="text-stone-900">{{ r.residualBefore }}</b>
              </div>
            </div>
            <span v-if="r.isBottleneck" class="shrink-0 rounded-full bg-orange-600 px-2 py-0.5 text-[11px] font-bold text-white">tersempit</span>
          </li>
        </ol>

        <div v-if="backRows.length" class="rounded-lg border border-violet-300 bg-violet-50 px-3 py-2 text-[12px] text-violet-900">
          <b>Edge balik dipakai</b> (sebagian arus lama dibatalkan):
          <div v-for="r in backRows" :key="r.edgeId" class="font-mono mt-0.5">
            {{ r.road }}: −{{ r.flowBefore - r.flowAfter }} (dari {{ r.flowBefore }})
          </div>
        </div>

        <div class="rounded-xl bg-stone-900 text-stone-50 px-4 py-3 space-y-1.5">
          <div class="text-[13px]">
            Bottleneck = min({{ minExpression }}) =
            <b class="text-amber-300 text-base font-mono">{{ detail.bottleneck }}</b>
          </div>
          <div class="text-[13px] leading-relaxed">
            Alirkan <b class="text-amber-300">{{ detail.bottleneck }}</b> kend/jam di setiap ruas jalur.
          </div>
          <div class="text-sm font-mono border-t border-stone-700 pt-1.5">
            Total arus: {{ detail.totalBefore }} + {{ detail.bottleneck }} =
            <b class="text-emerald-300 text-base">{{ detail.totalAfter }}</b>
          </div>
        </div>

        <p v-if="isFinal" class="text-[13px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          Ini langkah terakhir: dari {{ sCode }} sudah tidak ada jalur lagi dengan sisa kapasitas ke {{ tCode }}.
          Arus maksimum = <b>{{ trace.result.maxFlow }}</b> kend/jam.
        </p>
      </div>
    </div>
  </section>
</template>
