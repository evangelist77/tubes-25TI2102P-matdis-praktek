import type { EdgeDef, Topology } from './types'

export type TerminalPairId = 'S1-T1' | 'S1-T2' | 'S2-T1' | 'S2-T2'

export interface ResidualTraversal {
  edgeId: number
  from: number
  to: number
  isBackward: boolean
  residualBefore: number
}

export interface AugmentingStep {
  step: number
  path: ResidualTraversal[]
  pathNodes: number[]
  bottleneck: number
  totalFlow: number
  edgeFlows: Record<number, number>
}

export interface MaxFlowResult {
  source: number
  sink: number
  alpha: number
  effectiveCapacity: Record<number, number>
  steps: AugmentingStep[]
  maxFlow: number
  minCut: number[]
  sourceSide: number[]
}

/** Hasil satu pasangan di iterative_a<alpha>.json, keluaran iterative_ford_fulkerson.py. */
export interface IterativePairResult extends MaxFlowResult {
  pairId: TerminalPairId
}

/** Isi iterative_a<alpha>.json: hasil keempat pasangan untuk satu nilai alpha. */
export interface IterativeTrace {
  caseId: string
  alpha: number
  pairs: IterativePairResult[]
}

interface ResidualArc {
  to: number
  reverseIndex: number
  edgeId: number
  direction: 1 | -1
  capacity: number
}

function effectiveCapacity(edge: EdgeDef, alpha: number): number {
  if (alpha > 0 && edge.closedInMorning) return 0
  if (edge.isMarket) {
    const narrowed = edge.capacity * (1 - alpha)
    const lower = Math.floor(narrowed)
    const fraction = narrowed - lower
    if (fraction === 0.5) return lower % 2 === 0 ? lower : lower + 1
    return Math.round(narrowed)
  }
  return edge.capacity
}

export function solveMaxFlow(
  topology: Topology,
  source: number,
  sink: number,
  alpha = 0
): MaxFlowResult {
  if (!Number.isFinite(alpha) || alpha < 0 || alpha > 1) {
    throw new RangeError('alpha harus berada di antara 0 dan 1.')
  }
  if (source === sink) throw new RangeError('Source dan sink harus berbeda.')

  const nodeIds = new Set(topology.nodes.map((node) => node.id))
  if (!nodeIds.has(source) || !nodeIds.has(sink)) {
    throw new RangeError('Source dan sink harus ada di topologi.')
  }

  const adjacency = new Map<number, ResidualArc[]>()
  for (const id of nodeIds) adjacency.set(id, [])

  const capacities: Record<number, number> = {}
  const flows: Record<number, number> = {}

  for (const edge of topology.edges) {
    if (!adjacency.has(edge.from) || !adjacency.has(edge.to)) {
      throw new Error(`Edge #${edge.id} memiliki simpul yang tidak ada di topologi.`)
    }
    const capacity = effectiveCapacity(edge, alpha)
    if (!Number.isFinite(capacity) || capacity < 0) {
      throw new RangeError(`Kapasitas edge #${edge.id} tidak valid.`)
    }
    capacities[edge.id] = capacity
    flows[edge.id] = 0

    const fromArcs = adjacency.get(edge.from)!
    const toArcs = adjacency.get(edge.to)!
    const forwardIndex = fromArcs.length
    const reverseIndex = toArcs.length
    fromArcs.push({ to: edge.to, reverseIndex, edgeId: edge.id, direction: 1, capacity })
    toArcs.push({ to: edge.from, reverseIndex: forwardIndex, edgeId: edge.id, direction: -1, capacity: 0 })
  }

  const steps: AugmentingStep[] = []
  let totalFlow = 0

  while (true) {
    const parent = new Map<number, { from: number; arcIndex: number }>()
    const visited = new Set([source])
    const queue = [source]

    for (let head = 0; head < queue.length && !visited.has(sink); head++) {
      const from = queue[head]
      for (let arcIndex = 0; arcIndex < adjacency.get(from)!.length; arcIndex++) {
        const arc = adjacency.get(from)![arcIndex]
        const residual = arc.direction === 1
          ? arc.capacity - flows[arc.edgeId]
          : flows[arc.edgeId]
        if (residual <= 0 || visited.has(arc.to)) continue
        visited.add(arc.to)
        parent.set(arc.to, { from, arcIndex })
        queue.push(arc.to)
        if (arc.to === sink) break
      }
    }

    if (!visited.has(sink)) break

    const path: ResidualTraversal[] = []
    let node = sink
    while (node !== source) {
      const step = parent.get(node)!
      const arc = adjacency.get(step.from)![step.arcIndex]
      const residualBefore = arc.direction === 1
        ? arc.capacity - flows[arc.edgeId]
        : flows[arc.edgeId]
      path.push({
        edgeId: arc.edgeId,
        from: step.from,
        to: node,
        isBackward: arc.direction === -1,
        residualBefore
      })
      node = step.from
    }
    path.reverse()

    const bottleneck = Math.min(...path.map((traversal) => traversal.residualBefore))
    for (const traversal of path) {
      flows[traversal.edgeId] += traversal.isBackward ? -bottleneck : bottleneck
    }
    totalFlow += bottleneck

    steps.push({
      step: steps.length + 1,
      path,
      pathNodes: [source, ...path.map((traversal) => traversal.to)],
      bottleneck,
      totalFlow,
      edgeFlows: { ...flows }
    })
  }

  const reachable = new Set([source])
  const queue = [source]
  for (let head = 0; head < queue.length; head++) {
    const from = queue[head]
    for (const arc of adjacency.get(from)!) {
      const residual = arc.direction === 1
        ? arc.capacity - flows[arc.edgeId]
        : flows[arc.edgeId]
      if (residual > 0 && !reachable.has(arc.to)) {
        reachable.add(arc.to)
        queue.push(arc.to)
      }
    }
  }

  const minCut = topology.edges
    .filter((edge) => reachable.has(edge.from) && !reachable.has(edge.to))
    .map((edge) => edge.id)

  return {
    source,
    sink,
    alpha,
    effectiveCapacity: capacities,
    steps,
    maxFlow: totalFlow,
    minCut,
    sourceSide: Array.from(reachable).sort((a, b) => a - b)
  }
}

// ringkasan yang dibandingkan: jalur ditulis sebagai id edge, edge balik diberi tanda minus
function summarize(result: MaxFlowResult) {
  return {
    'kapasitas efektif': result.effectiveCapacity,
    'max flow': result.maxFlow,
    jalur: result.steps.map((step) =>
      step.path.map((t) => `${t.isBackward ? '-' : ''}${t.edgeId}`).join(' ')
    ),
    'arus akhir': result.steps[result.steps.length - 1]?.edgeFlows ?? {},
    'min-cut': [...result.minCut].sort((a, b) => a - b)
  }
}

/** Membandingkan trace Python dengan hitungan browser. Hasil kosong berarti keduanya sama. */
export function diffIterativeTrace(topology: Topology, trace: IterativeTrace): string[] {
  return trace.pairs.flatMap((pair) => {
    const fromTrace = summarize(pair)
    const fromBrowser = summarize(solveMaxFlow(topology, pair.source, pair.sink, trace.alpha))
    return (Object.keys(fromTrace) as (keyof typeof fromTrace)[])
      .filter((key) => JSON.stringify(fromTrace[key]) !== JSON.stringify(fromBrowser[key]))
      .map((key) => `${pair.pairId}: ${key} berbeda`)
  })
}
