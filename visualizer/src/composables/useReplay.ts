import { onUnmounted, ref, type Ref } from 'vue'

/**
 * Logika pemutar langkah (play/pause/reset/kecepatan).
 * Dipisah dari komponen agar bisa dipakai ulang oleh tampilan iterative (Ganesh).
 *
 * @param totalSteps jumlah langkah pada trace aktif (reaktif)
 */
export function useReplay(totalSteps: Ref<number>) {
  const currentStepIndex = ref(0)
  const isPlaying = ref(false)
  const playSpeed = ref(1200) // ms per langkah
  let timer: ReturnType<typeof setInterval> | null = null

  function stop() {
    isPlaying.value = false
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  function start() {
    if (totalSteps.value === 0) return
    if (currentStepIndex.value >= totalSteps.value) currentStepIndex.value = 0
    stop()
    isPlaying.value = true
    timer = setInterval(() => {
      if (currentStepIndex.value < totalSteps.value) {
        currentStepIndex.value++
      } else {
        stop()
      }
    }, playSpeed.value)
  }

  function toggle() {
    if (isPlaying.value) stop()
    else start()
  }

  function reset() {
    stop()
    currentStepIndex.value = 0
  }

  function setSpeed(ms: number) {
    playSpeed.value = ms
    if (isPlaying.value) start()
  }

  onUnmounted(stop)

  return { currentStepIndex, isPlaying, playSpeed, toggle, reset, stop, setSpeed }
}
