<script setup lang="ts">
import { computed } from 'vue'
import { routesForPair, uniqueCodes } from '../core/selectors'
import type { Manifest, ManifestEntry, RouteDef } from '../core/types'

const props = defineProps<{
  manifest: Manifest
  routes: RouteDef[]
  selected: ManifestEntry | null
  selectedRouteId: string | null
}>()

const emit = defineEmits<{
  (e: 'choose-pair', sourceCode: string, sinkCode: string): void
  (e: 'choose-route', routeId: string | null): void
}>()

const pairs = computed(() => {
  const out: { s: string; t: string }[] = []
  for (const s of uniqueCodes(props.manifest, 'sourceCode'))
    for (const t of uniqueCodes(props.manifest, 'sinkCode')) out.push({ s, t })
  return out
})
const pairRoutes = computed(() =>
  props.selected ? routesForPair(props.routes, props.selected.sourceCode, props.selected.sinkCode) : []
)
const isPair = (s: string, t: string) => props.selected?.sourceCode === s && props.selected?.sinkCode === t
</script>

<template>
  <div class="space-y-3">
    <div class="grid grid-cols-2 gap-1.5">
      <button
        v-for="p in pairs"
        :key="p.s + p.t"
        type="button"
        class="rounded-lg border px-3 py-2 text-sm font-bold transition-colors"
        :class="isPair(p.s, p.t) ? 'border-amber-500 bg-amber-50 text-amber-900' : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-50'"
        @click="emit('choose-pair', p.s, p.t)"
      >
        {{ p.s }} → {{ p.t }}
      </button>
    </div>

    <div class="space-y-1.5">
      <button
        type="button"
        class="w-full rounded-xl border px-3 py-2.5 text-left transition-colors"
        :class="selectedRouteId === null ? 'border-stone-800 bg-stone-900 text-white' : 'border-stone-200 bg-white text-stone-800 hover:bg-stone-50'"
        @click="emit('choose-route', null)"
      >
        <div class="text-sm font-bold">Semua rute</div>
        <div class="text-xs opacity-75">tampilkan seluruh jaringan untuk pasangan ini</div>
      </button>

      <button
        v-for="r in pairRoutes"
        :key="r.id"
        type="button"
        class="w-full rounded-xl border bg-white px-3 py-2.5 text-left transition-all hover:shadow-sm"
        :class="selectedRouteId === r.id ? 'ring-2' : 'border-stone-200'"
        :style="selectedRouteId === r.id ? { borderColor: r.color, '--tw-ring-color': r.color } : {}"
        @click="emit('choose-route', r.id)"
      >
        <div class="flex items-start gap-2.5">
          <span class="mt-1 h-3 w-3 shrink-0 rounded-full" :style="{ backgroundColor: r.color }"></span>
          <div class="min-w-0">
            <div class="text-sm font-bold text-stone-900 leading-snug">{{ r.corridor }}</div>
            <div class="text-xs text-stone-600 mt-0.5 leading-snug">via {{ r.via }}</div>
            <div class="text-[11px] text-stone-400 mt-0.5">{{ r.distanceInfo }}</div>
          </div>
        </div>
      </button>
    </div>
  </div>
</template>
