<script setup lang="ts">
import { computed } from 'vue'
import { cutCapacity, describeBottlenecks } from '../core/selectors'
import type { Topology, Trace } from '../core/types'

const props = defineProps<{ topology: Topology; trace: Trace; isFinal: boolean }>()

const bottlenecks = computed(() => describeBottlenecks(props.topology, props.trace))
const cutSum = computed(() => cutCapacity(props.trace.result.minCut, props.trace.effectiveCapacity))
const matches = computed(() => cutSum.value === props.trace.result.maxFlow)
</script>

<template>
  <section v-if="isFinal" class="rounded-2xl border border-emerald-300 bg-emerald-50 p-5 space-y-3">
    <div>
      <div class="text-[11px] font-bold uppercase tracking-wide text-emerald-700">Hasil akhir</div>
      <div class="font-mono text-3xl font-extrabold text-emerald-900">
        {{ trace.result.maxFlow }} <span class="text-base font-semibold">kend/jam</span>
      </div>
      <div class="text-[13px] text-stone-600">arus maksimum dari titik masuk ke titik keluar</div>
    </div>

    <div class="space-y-1.5">
      <div class="text-sm font-bold text-stone-900">Bottleneck (min-cut)</div>
      <p class="text-[13px] text-stone-600 leading-relaxed">
        Simpul yang masih terjangkau dari S di residual graph membentuk <b>sisi S</b> (cincin biru), sisanya
        <b>sisi T</b> (cincin cokelat). Ruas yang memisahkan keduanya penuh semua; itulah pembatas jaringan:
      </p>
      <ul class="space-y-1.5">
        <li
          v-for="b in bottlenecks"
          :key="b.edgeId"
          class="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-white px-3 py-2"
        >
          <span class="text-[13px] font-semibold text-stone-900 leading-snug">
            {{ b.road }}
            <span v-if="b.isMarket" class="text-orange-600">· ruas pasar</span>
            <span v-if="b.isClosed" class="text-red-600">· ditutup</span>
          </span>
          <span class="font-mono text-base font-bold text-red-600">{{ b.capacity }}</span>
        </li>
      </ul>
      <div
        class="flex items-center justify-between rounded-lg px-3 py-2 font-mono text-[13px]"
        :class="matches ? 'bg-emerald-100 text-emerald-900' : 'bg-red-100 text-red-800'"
      >
        <span>Σ kapasitas potongan = {{ cutSum }}</span>
        <span>{{ matches ? '= max flow ✓' : '≠ max flow ✗' }}</span>
      </div>
      <p class="text-xs text-stone-500">
        Teorema max-flow min-cut (Ford &amp; Fulkerson, 1956): arus maksimum sama dengan jumlah kapasitas potongan terkecil.
      </p>
    </div>
  </section>

  <section v-else class="rounded-2xl border border-dashed border-stone-300 bg-white/60 p-4 text-[13px] text-stone-500">
    Putar sampai langkah terakhir untuk melihat hasil akhir dan bottleneck (min-cut).
  </section>
</template>
