<script setup lang="ts">
import { computed } from 'vue'
import type { ComparisonRow } from '../composables/useComparison'
import type { ManifestEntry } from '../core/types'

const props = defineProps<{
  rows: ComparisonRow[]
  observedAlpha: number
  selected: ManifestEntry | null
}>()
const emit = defineEmits<{ (e: 'select-run', entry: ManifestEntry): void }>()

const maxY = computed(() => Math.max(1, ...props.rows.map((r) => r.maxFlow)))
const W = 300
const H = 130
const barW = computed(() => (props.rows.length ? (W - 20) / props.rows.length - 6 : 20))

const barColor = (r: ComparisonRow) =>
  r.run.alpha === 0 ? '#10b981' : r.run.alpha === props.observedAlpha ? '#ea580c' : '#94a3b8'

const selectedRow = computed(() => props.rows.find((r) => r.run.filename === props.selected?.filename) ?? null)
</script>

<template>
  <details class="group rounded-2xl border border-stone-200 bg-white shadow-sm">
    <summary class="cursor-pointer list-none px-4 py-3 flex items-center justify-between">
      <div>
        <div class="text-sm font-bold text-stone-900">Analisis sensitivitas penyempitan</div>
        <div class="text-xs text-stone-500">simulasi dari catatan dosen, bukan data CCTV</div>
      </div>
      <span class="text-stone-400 text-sm group-open:rotate-90 transition-transform">▶</span>
    </summary>

    <div class="px-4 pb-4 space-y-2">
      <p class="text-[13px] text-stone-600 leading-relaxed">
        Seberapa jauh penyempitan ruas pasar harus naik sebelum arus maksimum benar-benar turun?
        Klik batang untuk menampilkan simulasinya.
      </p>
      <svg :viewBox="`0 0 ${W} ${H + 28}`" class="w-full" role="img" aria-label="Arus maksimum menurut penyempitan pasar">
        <line :x1="10" :y1="H" :x2="W - 10" :y2="H" stroke="#d6d3d1" />
        <g v-for="(r, i) in rows" :key="r.run.filename" class="cursor-pointer" @click="emit('select-run', r.run)">
          <rect
            :x="10 + i * (barW + 6)"
            :y="H - (r.maxFlow / maxY) * (H - 16)"
            :width="barW"
            :height="Math.max(2, (r.maxFlow / maxY) * (H - 16))"
            rx="3"
            :fill="barColor(r)"
            :stroke="r.run.filename === selected?.filename ? '#1c1917' : 'none'"
            stroke-width="2"
          />
          <text :x="10 + i * (barW + 6) + barW / 2" :y="H - (r.maxFlow / maxY) * (H - 16) - 3" text-anchor="middle" font-size="9" fill="#44403c">
            {{ r.maxFlow }}
          </text>
          <text :x="10 + i * (barW + 6) + barW / 2" :y="H + 12" text-anchor="middle" font-size="9" fill="#78716c">
            {{ Math.round(r.run.alpha * 100) }}%
          </text>
        </g>
        <text :x="W / 2" :y="H + 25" text-anchor="middle" font-size="9" fill="#a8a29e">penyempitan ruas pasar (α)</text>
      </svg>

      <div class="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-stone-500">
        <span><span class="inline-block h-2 w-2 rounded-sm align-middle bg-emerald-500"></span> tanpa pasar</span>
        <span><span class="inline-block h-2 w-2 rounded-sm align-middle bg-orange-600"></span> pasar penuh (pengamatan)</span>
        <span><span class="inline-block h-2 w-2 rounded-sm align-middle bg-slate-400"></span> simulasi</span>
      </div>

      <p v-if="selectedRow" class="text-[13px] text-stone-700">
        α {{ Math.round(selectedRow.run.alpha * 100) }}%: arus maksimum <b>{{ selectedRow.maxFlow }}</b>, pembatas
        <b>{{ selectedRow.bottlenecks.map((b) => b.road.split(' (')[0]).join(' + ') || '—' }}</b>.
      </p>
    </div>
  </details>
</template>
