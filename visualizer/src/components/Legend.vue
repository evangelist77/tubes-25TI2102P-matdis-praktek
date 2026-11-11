<script setup lang="ts">
import { ref } from 'vue'
import { themeTokens } from '../theme/tokens'

defineProps<{ residualMode?: boolean }>()
const open = ref(true)

const ratioSteps = [
  { label: 'Lancar', color: themeTokens.colors.ratio.low },
  { label: 'Sedang', color: themeTokens.colors.ratio.moderate },
  { label: 'Padat', color: themeTokens.colors.ratio.high },
  { label: 'Sangat padat', color: themeTokens.colors.ratio.critical },
  { label: 'Jenuh', color: themeTokens.colors.ratio.saturated }
]
</script>

<template>
  <div class="absolute bottom-4 left-4 z-[400] w-[220px] rounded-xl border border-stone-200 bg-white/95 backdrop-blur-sm shadow-lg text-[13px]">
    <button type="button" class="w-full flex items-center justify-between px-3 py-2 font-bold text-stone-800" @click="open = !open">
      Legenda <span class="text-stone-400 text-xs">{{ open ? '▼' : '▲' }}</span>
    </button>
    <div v-if="open" class="px-3 pb-3 space-y-2.5 border-t border-stone-100 pt-2">
      <div>
        <div class="text-[11px] font-bold uppercase text-stone-500 mb-1">Kepenuhan ruas (arus/kapasitas)</div>
        <div class="flex items-center gap-1.5 mb-1">
          <span class="h-2 w-8 rounded" style="background:#94a3b8"></span><span>Belum dialiri</span>
        </div>
        <div class="flex h-2 overflow-hidden rounded">
          <span v-for="s in ratioSteps" :key="s.label" class="flex-1" :style="{ backgroundColor: s.color }"></span>
        </div>
        <div class="flex justify-between text-[11px] text-stone-500 mt-0.5"><span>lancar</span><span>jenuh</span></div>
        <div class="text-[11px] text-stone-500 mt-1">Tebal garis ∝ kapasitas ruas</div>
      </div>
      <div class="space-y-1">
        <div class="flex items-center gap-2"><span class="h-1.5 w-8 rounded" :style="{ backgroundColor: themeTokens.colors.edges.augmentingPath }"></span>Jalur langkah ini</div>
        <div class="flex items-center gap-2"><span class="w-8 border-t-2 border-dashed" :style="{ borderColor: themeTokens.colors.edges.minCut }"></span>Bottleneck (min-cut)</div>
        <div class="flex items-center gap-2"><span class="w-8 border-t-[3px] border-dotted border-stone-500"></span>Ruas ditutup</div>
        <div class="flex items-center gap-2"><span class="rounded-full bg-orange-700 px-1.5 text-[10px] font-bold text-white">PASAR</span>Ruas pasar tumpah</div>
        <div v-if="residualMode" class="flex items-center gap-2"><span class="w-8 border-t-2 border-dashed" :style="{ borderColor: themeTokens.colors.edges.residualBack }"></span>Edge balik (↩)</div>
      </div>
      <div class="space-y-1 border-t border-stone-100 pt-2">
        <div class="flex items-center gap-2"><span class="h-3 w-3 rounded-full border-[3px] bg-white" :style="{ borderColor: themeTokens.colors.partition.source }"></span>Sisi S (hasil akhir)</div>
        <div class="flex items-center gap-2"><span class="h-3 w-3 rounded-full border-[3px] bg-amber-200" :style="{ borderColor: themeTokens.colors.partition.sink }"></span>Sisi T (hasil akhir)</div>
      </div>
    </div>
  </div>
</template>
