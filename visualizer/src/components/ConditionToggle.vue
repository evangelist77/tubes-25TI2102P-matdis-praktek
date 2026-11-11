<script setup lang="ts">
import { computed } from 'vue'
import { describeCondition } from '../core/selectors'
import type { Manifest, ManifestEntry } from '../core/types'

const props = defineProps<{ manifest: Manifest; selected: ManifestEntry | null }>()
const emit = defineEmits<{ (e: 'choose', condition: 'normal' | 'pasar'): void }>()

const current = computed(() =>
  props.selected ? describeCondition(props.selected.alpha, props.manifest.observedAlpha) : null
)
const options = [
  { key: 'normal' as const, label: 'Tanpa pasar', hint: 'hari biasa' },
  { key: 'pasar' as const, label: 'Pasar penuh', hint: 'saat pasar padat' }
]
</script>

<template>
  <div class="space-y-2">
    <div class="grid grid-cols-2 gap-1.5 rounded-xl bg-stone-100 p-1">
      <button
        v-for="o in options"
        :key="o.key"
        type="button"
        class="rounded-lg px-3 py-2 text-left transition-all"
        :class="current?.key === o.key ? 'bg-white shadow-sm ring-1 ring-amber-500' : 'hover:bg-white/60'"
        @click="emit('choose', o.key)"
      >
        <div class="text-sm font-bold" :class="current?.key === o.key ? 'text-amber-800' : 'text-stone-700'">{{ o.label }}</div>
        <div class="text-[11px] text-stone-500">{{ o.hint }}</div>
      </button>
    </div>
    <p v-if="current?.key === 'simulasi'" class="text-xs rounded-lg bg-sky-50 border border-sky-200 text-sky-900 px-2.5 py-1.5">
      Sedang menampilkan <b>simulasi sensitivitas</b> (penyempitan {{ Math.round((selected?.alpha ?? 0) * 100) }}%),
      bukan data hasil pengamatan.
    </p>
    <p v-else-if="current?.key === 'pasar'" class="text-xs text-stone-500 px-1">
      Penyempitan ruas pasar: <b>{{ Math.round(manifest.observedAlpha * 100) }}%</b>
      <span class="text-amber-700">&nbsp;(placeholder, diganti dari data CCTV/video manual)</span>
    </p>
    <p v-else class="text-xs text-stone-500 px-1">Kapasitas ruas = nilai dasar dari spek.</p>
  </div>
</template>
