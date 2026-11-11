/**
 * Selector murni (tanpa efek samping) untuk turunan data graf & trace.
 * Dipakai bersama oleh komponen visualisasi Ford-Fulkerson dan iterative.
 */
import type { Manifest, ManifestEntry, RouteDef, Topology, Trace } from './types'

/** Rasio kepenuhan ruas (0..1+). Kapasitas 0 dianggap 0 agar tidak membagi nol. */
export function edgeRatio(flow: number, capacity: number): number {
  if (capacity <= 0) return 0
  return flow / capacity
}

/** Ruas jenuh = kapasitas > 0 dan arus sudah sama dengan kapasitas. */
export function isSaturatedEdge(flow: number, capacity: number): boolean {
  return capacity > 0 && flow >= capacity
}

/** Jumlah kapasitas efektif ruas pemotong. Menurut teorema min-cut nilainya = max flow. */
export function cutCapacity(minCut: number[], effectiveCapacity: Record<number, number>): number {
  return minCut.reduce((sum, id) => sum + (effectiveCapacity[id] ?? 0), 0)
}

/** Simpul sisi T = semua simpul asli (bukan virtual S* dan T*) yang tidak berada di sisi S. */
export function sinkSideNodeIds(topology: Topology, sourceSide: number[]): number[] {
  const s = new Set(sourceSide)
  return topology.nodes
    .filter((n) => n.type !== 'supersource' && n.type !== 'supersink' && !s.has(n.id))
    .map((n) => n.id)
}

/** Daftar kode terminal unik (urut) dari manifest. */
export function uniqueCodes(manifest: Manifest, key: 'sourceCode' | 'sinkCode'): string[] {
  return Array.from(new Set(manifest.runs.map((r) => r[key]))).sort()
}

/** Semua run untuk satu pasangan S→T, urut menurut alpha. */
export function runsForPair(manifest: Manifest, sourceCode: string, sinkCode: string): ManifestEntry[] {
  return manifest.runs
    .filter((r) => r.sourceCode === sourceCode && r.sinkCode === sinkCode)
    .sort((a, b) => a.alpha - b.alpha)
}

/** Run default: yang ditandai isDefault di manifest, atau run pertama. */
export function findDefaultRun(manifest: Manifest): ManifestEntry | null {
  return manifest.runs.find((r) => r.isDefault) ?? manifest.runs[0] ?? null
}

/** Pilih run untuk pasangan baru dengan mempertahankan alpha yang sama bila ada. */
export function pickRunForPair(
  manifest: Manifest,
  sourceCode: string,
  sinkCode: string,
  preferredAlpha: number
): ManifestEntry | null {
  const runs = runsForPair(manifest, sourceCode, sinkCode)
  return runs.find((r) => r.alpha === preferredAlpha) ?? runs[0] ?? null
}

export interface BottleneckInfo {
  edgeId: number
  road: string
  capacity: number
  isClosed: boolean
  isMarket: boolean
}

/** Ruas-ruas min-cut beserta kapasitas efektifnya, urut dari kapasitas terbesar. */
export function describeBottlenecks(topology: Topology, trace: Trace): BottleneckInfo[] {
  return trace.result.minCut
    .map((id) => {
      const edge = topology.edges.find((e) => e.id === id)
      const capacity = trace.effectiveCapacity[id] ?? edge?.capacity ?? 0
      return {
        edgeId: id,
        road: edge?.road ?? `Ruas #${id}`,
        capacity,
        isClosed: capacity === 0,
        isMarket: !!edge?.isMarket
      }
    })
    .sort((a, b) => b.capacity - a.capacity)
}

export interface ConditionInfo {
  key: 'normal' | 'pasar' | 'simulasi'
  title: string
  tone: 'danger' | 'ok' | 'neutral'
}

/**
 * Kondisi sebuah run. Hanya dua kondisi yang punya data pengamatan (CCTV/video manual):
 * tanpa pasar (alpha 0) dan pasar penuh (alpha = observedAlpha). Selain itu adalah simulasi sensitivitas.
 */
export function describeCondition(alpha: number, observedAlpha: number): ConditionInfo {
  if (alpha === 0) return { key: 'normal', title: 'Tanpa pasar', tone: 'ok' }
  if (alpha === observedAlpha) return { key: 'pasar', title: 'Pasar penuh', tone: 'danger' }
  return { key: 'simulasi', title: 'Simulasi sensitivitas', tone: 'neutral' }
}

/** Run untuk kondisi tertentu pada pasangan S→T (alpha 0 atau observedAlpha). */
export function runForCondition(
  manifest: Manifest,
  sourceCode: string,
  sinkCode: string,
  condition: 'normal' | 'pasar'
): ManifestEntry | null {
  const target = condition === 'normal' ? 0 : manifest.observedAlpha
  return runsForPair(manifest, sourceCode, sinkCode).find((r) => r.alpha === target) ?? null
}

/** Rute milik pasangan S→T tertentu. */
export function routesForPair(routes: RouteDef[], sourceCode: string, sinkCode: string): RouteDef[] {
  return routes.filter((r) => r.source === sourceCode && r.sink === sinkCode)
}

export interface StepRow {
  edgeId: number
  road: string
  fromCode: string
  toCode: string
  capacity: number
  flowBefore: number
  flowAfter: number
  /** 'maju' = arus ditambah; 'balik' = arus dibatalkan lewat edge balik residual */
  kind: 'maju' | 'balik'
  /** sisa kapasitas yang tersedia pada ruas ini sebelum langkah (untuk 'balik': arus yang bisa dibatalkan) */
  residualBefore: number
  isBottleneck: boolean
}

export interface StepDetail {
  step: number
  totalBefore: number
  totalAfter: number
  bottleneck: number
  rows: StepRow[]
}

/**
 * Rincian satu langkah Ford-Fulkerson, diturunkan dari selisih arus antar langkah:
 * ruas mana yang dilewati, sisa kapasitas tiap ruas, dan ruas penentu (bottleneck).
 * `stepNo` berbasis 1 (langkah pertama = 1).
 */
export function describeStep(topology: Topology, trace: Trace, stepNo: number): StepDetail | null {
  const step = trace.steps[stepNo - 1]
  if (!step) return null
  const before = stepNo > 1 ? trace.steps[stepNo - 2].edgeFlows : {}
  const codeOf = (id: number) => topology.nodes.find((n) => n.id === id)?.code ?? String(id)

  const rows: StepRow[] = []
  for (const edge of topology.edges) {
    const flowBefore = before[edge.id] ?? 0
    const flowAfter = step.edgeFlows[edge.id] ?? 0
    if (flowBefore === flowAfter) continue
    const capacity = trace.effectiveCapacity[edge.id] ?? edge.capacity
    const kind = flowAfter > flowBefore ? 'maju' : 'balik'
    rows.push({
      edgeId: edge.id,
      road: edge.road,
      fromCode: codeOf(edge.from),
      toCode: codeOf(edge.to),
      capacity,
      flowBefore,
      flowAfter,
      kind,
      residualBefore: kind === 'maju' ? capacity - flowBefore : flowBefore,
      isBottleneck: false
    })
  }

  // urutkan: ruas maju mengikuti urutan jalur pada trace, lalu ruas balik
  const order = new Map(step.path.map((id, i) => [id, i]))
  rows.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'maju' ? -1 : 1
    return (order.get(a.edgeId) ?? 999) - (order.get(b.edgeId) ?? 999)
  })
  for (const r of rows) r.isBottleneck = r.residualBefore === step.bottleneck

  return {
    step: step.step,
    totalBefore: step.totalFlow - step.bottleneck,
    totalAfter: step.totalFlow,
    bottleneck: step.bottleneck,
    rows
  }
}
