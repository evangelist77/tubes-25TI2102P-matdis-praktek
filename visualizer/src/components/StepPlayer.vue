<script setup lang="ts">
const props = defineProps<{
  totalSteps: number
  currentStepIndex: number
  totalFlow: number
  maxFlow: number
  isPlaying: boolean
  playSpeed: number
}>()

const emit = defineEmits<{
  (e: 'update:currentStepIndex', value: number): void
  (e: 'toggle-play'): void
  (e: 'change-speed', value: number): void
  (e: 'reset'): void
}>()

const speeds = [
  { label: '0,5×', value: 2400 },
  { label: '1×', value: 1200 },
  { label: '2×', value: 600 }
]

const go = (i: number) => emit('update:currentStepIndex', Math.min(props.totalSteps, Math.max(0, i)))
const btn =
  'inline-flex items-center justify-center rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors'
</script>

<template>
  <div class="bg-white border-t border-stone-200 px-5 py-3 flex flex-wrap items-center gap-x-5 gap-y-2">
    <div class="flex items-center gap-2">
      <button type="button" :class="btn" title="Kembali ke awal" @click="emit('reset')">⏮</button>
      <button type="button" :class="btn" :disabled="currentStepIndex <= 0" @click="go(currentStepIndex - 1)">◀ Mundur</button>
      <button
        type="button"
        class="inline-flex items-center justify-center rounded-lg bg-amber-600 px-4 py-1.5 text-sm font-bold text-white hover:bg-amber-700 transition-colors min-w-[92px]"
        @click="emit('toggle-play')"
      >
        {{ isPlaying ? '⏸ Jeda' : '▶ Putar' }}
      </button>
      <button type="button" :class="btn" :disabled="currentStepIndex >= totalSteps" @click="go(currentStepIndex + 1)">Maju ▶</button>
    </div>

    <!-- loncat langsung ke langkah -->
    <div class="flex items-center gap-1.5">
      <button
        type="button"
        class="h-8 min-w-8 rounded-full px-2 text-xs font-bold border transition-colors"
        :class="currentStepIndex === 0 ? 'bg-stone-800 text-white border-stone-800' : 'bg-white text-stone-600 border-stone-300 hover:bg-stone-50'"
        title="Awal (belum ada arus)"
        @click="go(0)"
      >
        0
      </button>
      <button
        v-for="n in totalSteps"
        :key="n"
        type="button"
        class="h-8 min-w-8 rounded-full px-2 text-xs font-bold border transition-colors"
        :class="
          n === currentStepIndex
            ? 'bg-amber-600 text-white border-amber-600'
            : n < currentStepIndex
              ? 'bg-amber-100 text-amber-900 border-amber-300'
              : 'bg-white text-stone-600 border-stone-300 hover:bg-stone-50'
        "
        :title="`Langkah ${n}`"
        @click="go(n)"
      >
        {{ n }}
      </button>
    </div>

    <div class="flex items-center gap-3 ml-auto text-sm">
      <span class="text-stone-500">
        Total arus
        <b class="font-mono text-base text-orange-700">{{ totalFlow }}</b>
        <span class="text-stone-400"> / {{ maxFlow }} kend/jam</span>
      </span>
      <div class="flex items-center gap-1">
        <button
          v-for="s in speeds"
          :key="s.value"
          type="button"
          class="rounded-md px-2 py-1 text-xs font-semibold border"
          :class="playSpeed === s.value ? 'bg-stone-800 text-white border-stone-800' : 'bg-white text-stone-600 border-stone-300 hover:bg-stone-50'"
          @click="emit('change-speed', s.value)"
        >
          {{ s.label }}
        </button>
      </div>
    </div>
  </div>
</template>
