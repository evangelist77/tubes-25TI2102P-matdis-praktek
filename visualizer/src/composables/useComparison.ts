import { computed, ref, watch, type Ref } from 'vue'
import { loadTrace } from '../core/loader'
import { describeBottlenecks, runsForPair, type BottleneckInfo } from '../core/selectors'
import type { Manifest, ManifestEntry, Topology } from '../core/types'

export interface ComparisonRow {
  run: ManifestEntry
  maxFlow: number
  bottlenecks: BottleneckInfo[]
}

/**
 * Perbandingan sebelum/sesudah penyempitan pasar untuk pasangan S→T yang sedang dipilih.
 * Memuat semua trace pasangan itu (di-cache) lalu merangkum max flow dan bottleneck-nya.
 */
export function useComparison(
  topology: Ref<Topology | null>,
  manifest: Ref<Manifest | null>,
  selected: Ref<ManifestEntry | null>
) {
  const rows = ref<ComparisonRow[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function refresh() {
    if (!topology.value || !manifest.value || !selected.value) {
      rows.value = []
      return
    }
    const sel = selected.value
    const runs = runsForPair(manifest.value, sel.sourceCode, sel.sinkCode)
    isLoading.value = true
    error.value = null
    try {
      const traces = await Promise.all(runs.map((r) => loadTrace(r.filename)))
      // abaikan hasil usang bila pilihan sudah berubah selama memuat
      if (selected.value?.sourceCode !== sel.sourceCode || selected.value?.sinkCode !== sel.sinkCode) return
      rows.value = runs.map((run, i) => ({
        run,
        maxFlow: traces[i].result.maxFlow,
        bottlenecks: describeBottlenecks(topology.value!, traces[i])
      }))
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Gagal memuat perbandingan.'
    } finally {
      isLoading.value = false
    }
  }

  // muat ulang hanya bila pasangan S→T berubah (bukan saat alpha berganti)
  watch(
    () => [topology.value, manifest.value, selected.value?.sourceCode, selected.value?.sinkCode],
    refresh,
    { immediate: true }
  )

  /** Baris referensi (alpha terkecil) sebagai kondisi "sebelum". */
  const baseline = computed(() => rows.value[0] ?? null)

  return { rows, baseline, isLoading, error }
}
