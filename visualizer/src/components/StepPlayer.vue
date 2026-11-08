<script setup lang="ts">
import { computed } from 'vue'
import type { TraceStep, Topology } from '../core/types'

const props = withDefaults(
  defineProps<{
    topology: Topology | null
    steps: TraceStep[]
    currentStepIndex: number
    maxFlow: number
    isPlaying?: boolean
    playSpeed?: number
  }>(),
  {
    isPlaying: false,
    playSpeed: 1500
  }
)

const emit = defineEmits<{
  (e: 'update:currentStepIndex', index: number): void
  (e: 'toggle-play'): void
  (e: 'change-speed', speed: number): void
  (e: 'reset'): void
}>()

const totalSteps = computed(() => props.steps.length)

const currentStep = computed<TraceStep | null>(() => {
  if (props.currentStepIndex <= 0) return null
  return props.steps[props.currentStepIndex - 1] ?? null
})

const isAtStart = computed(() => props.currentStepIndex === 0)
const isAtEnd = computed(() => props.currentStepIndex === totalSteps.value)

function prevStep() {
  if (props.currentStepIndex > 0) {
    emit('update:currentStepIndex', props.currentStepIndex - 1)
  }
}

function nextStep() {
  if (props.currentStepIndex < totalSteps.value) {
    emit('update:currentStepIndex', props.currentStepIndex + 1)
  }
}

function handleSliderChange(e: Event) {
  const target = e.target as HTMLInputElement
  emit('update:currentStepIndex', Number(target.value))
}

// Terjemahkan ID edge ke nama jalan untuk tampilan rute augmentasi
const augmentingRoads = computed(() => {
  if (!currentStep.value || !props.topology) return []
  return currentStep.value.path.map((edgeId) => {
    const edge = props.topology?.edges.find((e) => e.id === edgeId)
    return {
      id: edgeId,
      name: edge?.road || `Ruas #${edgeId}`,
      code: edge?.code || ''
    }
  })
})
</script>

<template>
  <div class="bg-white border-t border-stone-200 p-3 shadow-md z-20">
    <div class="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
      <!-- 1. Tombol Kontrol Pemutar -->
      <div class="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          class="p-2 rounded-lg border border-stone-200 hover:bg-stone-100 text-stone-700 disabled:opacity-40 transition-colors"
          :disabled="isAtStart"
          title="Reset ke kondisi awal (Arus 0)"
          @click="$emit('reset')"
        >
          ⏮
        </button>

        <button
          type="button"
          class="px-2.5 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 text-stone-700 disabled:opacity-40 font-semibold text-xs transition-colors"
          :disabled="isAtStart"
          @click="prevStep"
        >
          ◀ Mundur
        </button>

        <button
          type="button"
          class="px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all"
          :class="isPlaying ? 'bg-amber-600 text-white hover:bg-amber-700' : 'bg-orange-600 text-white hover:bg-orange-700'"
          @click="$emit('toggle-play')"
        >
          <span>{{ isPlaying ? '⏸ Jeda' : '▶ Putar' }}</span>
        </button>

        <button
          type="button"
          class="px-2.5 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 text-stone-700 disabled:opacity-40 font-semibold text-xs transition-colors"
          :disabled="isAtEnd"
          @click="nextStep"
        >
          Maju ▶
        </button>
      </div>

      <!-- 2. Slider Langkah & Status Berjalan -->
      <div class="flex-1 w-full md:w-auto px-2 flex flex-col justify-center space-y-1">
        <div class="flex items-center justify-between text-xs">
          <span class="font-bold text-stone-800">
            Langkah {{ currentStepIndex }} dari {{ totalSteps }}
          </span>
          <span class="text-stone-500 font-mono text-[11px]">
            Total Aliran:
            <span class="font-bold text-orange-700">{{ currentStep ? currentStep.totalFlow : 0 }}</span>
            / {{ maxFlow }} kend/jam
          </span>
        </div>

        <input
          type="range"
          min="0"
          :max="totalSteps"
          :value="currentStepIndex"
          class="w-full accent-orange-600 cursor-pointer h-1.5 bg-stone-200 rounded-lg"
          @input="handleSliderChange"
        />
      </div>

      <!-- 3. Rute Augmentasi Singkat & Kecepatan -->
      <div class="shrink-0 flex items-center gap-3">
        <div class="text-right hidden sm:block">
          <div class="text-[10px] uppercase font-bold text-stone-400 tracking-wider">Kecepatan Putar</div>
          <div class="flex items-center gap-1 mt-0.5">
            <button
              v-for="s in [2000, 1200, 600]"
              :key="s"
              type="button"
              class="px-2 py-0.5 text-[10px] font-semibold rounded border transition-colors"
              :class="playSpeed === s ? 'bg-orange-600 text-white border-orange-600' : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'"
              @click="$emit('change-speed', s)"
            >
              {{ s === 2000 ? '0.75x' : s === 1200 ? '1x' : '2x' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 4. Baris Narasi Semantik Langkah Saat Ini (GLOSSARY.md) -->
    <div v-if="currentStep" class="mt-2.5 pt-2 border-t border-stone-100 max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-2 text-xs">
      <div class="flex-1 flex items-start gap-2">
        <span class="bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded text-[10px] shrink-0">
          +{{ currentStep.bottleneck }} kend/jam
        </span>
        <p class="text-stone-700 leading-snug">
          {{ currentStep.narrative }}
        </p>
      </div>

      <!-- Jalur Augmentasi Aktif -->
      <div v-if="augmentingRoads.length > 0" class="shrink-0 flex items-center gap-1 text-[11px] text-stone-500 overflow-x-auto max-w-full pb-1 md:pb-0">
        <span class="font-semibold text-stone-700 shrink-0">Jalur:</span>
        <template v-for="(road, idx) in augmentingRoads" :key="road.id">
          <span class="bg-blue-50 border border-blue-200 text-blue-900 px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0">
            {{ road.name }}
          </span>
          <span v-if="idx < augmentingRoads.length - 1" class="text-stone-300">→</span>
        </template>
      </div>
    </div>

    <div v-else class="mt-2 pt-2 border-t border-stone-100 max-w-6xl mx-auto text-xs text-stone-400 italic">
      Kondisi awal graf (aliran masih 0 kend/jam). Klik "Maju" atau "Putar" untuk memulai penelusuran jalur augmentasi Ford-Fulkerson.
    </div>
  </div>
</template>
