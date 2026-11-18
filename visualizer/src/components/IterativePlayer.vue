<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue'

const props = defineProps<{
  currentRound: number
  totalRounds: number
  totalFlow: number
  maxFlow: number
  roundNames?: string[]
}>()

const emit = defineEmits<{
  (e: 'update:currentRound', value: number): void
}>()

const isPlaying = ref(false)
const playSpeed = ref(1500) // ms per round
let timer: ReturnType<typeof setInterval> | null = null

const speeds = [
  { label: '0,5×', value: 2400 },
  { label: '1×', value: 1500 },
  { label: '2×', value: 750 }
]

function stop() {
  isPlaying.value = false
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

function start() {
  if (props.totalRounds === 0) return
  if (props.currentRound >= props.totalRounds) {
    emit('update:currentRound', 0)
  }
  stop()
  isPlaying.value = true
  timer = setInterval(() => {
    if (props.currentRound < props.totalRounds) {
      emit('update:currentRound', props.currentRound + 1)
    } else {
      stop()
    }
  }, playSpeed.value)
}

watch(() => props.roundNames, stop)
watch(() => props.totalRounds, stop)

function togglePlay() {
  if (isPlaying.value) stop()
  else start()
}

function go(round: number) {
  emit('update:currentRound', Math.min(props.totalRounds, Math.max(0, round)))
}

function setSpeed(ms: number) {
  playSpeed.value = ms
  if (isPlaying.value) start()
}

onUnmounted(stop)

const btnClass =
  'inline-flex items-center justify-center rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors'
</script>

<template>
  <div class="bg-white border-t border-stone-200 px-5 py-3 flex flex-wrap items-center gap-x-5 gap-y-2.5 z-10">
    <!-- Kontrol Pemutar Navigasi -->
    <div class="flex items-center gap-2">
      <button type="button" :class="btnClass" title="Kembali ke awal graf" @click="go(0)">⏮</button>
      <button type="button" :class="btnClass" :disabled="currentRound <= 0" @click="go(currentRound - 1)">◀ Mundur</button>
      <button
        type="button"
        class="inline-flex items-center justify-center rounded-lg bg-amber-600 px-4 py-1.5 text-sm font-bold text-white hover:bg-amber-700 transition-colors min-w-[92px] shadow-xs"
        :disabled="totalRounds === 0"
        :title="totalRounds === 0 ? 'Tidak ada jalur augmentasi pada pasangan dan kondisi ini' : undefined"
        @click="togglePlay"
      >
        {{ isPlaying ? '⏸ Jeda' : '▶ Putar' }}
      </button>
      <button type="button" :class="btnClass" :disabled="currentRound >= totalRounds" @click="go(currentRound + 1)">Maju ▶</button>
    </div>

    <!-- Tombol Loncat Ronde Berurutan -->
    <div class="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto py-0.5">
      <button
        v-for="idx in totalRounds + 1"
        :key="idx - 1"
        type="button"
        class="h-8 min-w-8 shrink-0 rounded-full px-2.5 text-xs font-bold border transition-all flex items-center justify-center"
        :aria-label="roundNames?.[idx - 1] ?? `Langkah ${idx - 1}`"
        :class="
          currentRound === idx - 1
            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
            : currentRound > idx - 1
              ? 'bg-amber-100 text-amber-900 border-amber-300'
              : 'bg-white text-stone-600 border-stone-300 hover:bg-stone-50'
        "
        :title="roundNames?.[idx - 1] ?? `Langkah ${idx - 1}`"
        @click="go(idx - 1)"
      >
        <span>{{ idx - 1 }}</span>
      </button>
      <span class="shrink-0 truncate text-xs text-stone-500" aria-live="polite">
        {{ roundNames?.[currentRound] ?? `Langkah ${currentRound}` }}
      </span>
    </div>

    <!-- Info Arus & Kecepatan -->
    <div class="flex items-center gap-4 ml-auto text-sm">
      <span class="text-stone-600">
        Arus pasangan:
        <b class="font-mono text-base text-orange-700 font-extrabold">{{ totalFlow }}</b>
        <span class="text-stone-400 font-mono"> / {{ maxFlow }} kend/jam</span>
      </span>

      <!-- Kecepatan Putar -->
      <div class="flex items-center gap-1">
        <button
          v-for="s in speeds"
          :key="s.value"
          type="button"
          class="rounded-md px-2 py-1 text-xs font-semibold border"
          :class="playSpeed === s.value ? 'bg-stone-800 text-white border-stone-800' : 'bg-white text-stone-600 border-stone-300 hover:bg-stone-50'"
          @click="setSpeed(s.value)"
        >
          {{ s.label }}
        </button>
      </div>
    </div>
  </div>
</template>
