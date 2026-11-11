import type { Topology, Trace } from './types'

export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

/**
 * Memvalidasi konsistensi matematis data trace algoritma Ford-Fulkerson:
 * 1. Kapasitas: arus tiap ruas tidak melebihi kapasitas efektif (0 <= f(e) <= c(e)).
 * 2. Konservasi Arus (Kirchhoff): pada setiap simpul perantara (bukan source & sink),
 *    total arus masuk = total arus keluar.
 * 3. Teorema Min-Cut (Ford & Fulkerson 1956): jumlah kapasitas ruas pemotong (min-cut)
 *    harus sama dengan nilai max flow akhir.
 */
export function validateTrace(topology: Topology, trace: Trace): ValidationResult {
  const errors: string[] = []

  const sourceId = trace.meta.source
  const sinkId = trace.meta.sink

  // 1. Validasi setiap langkah & kapasitas
  for (const step of trace.steps) {
    for (const [edgeIdStr, flow] of Object.entries(step.edgeFlows)) {
      const edgeId = Number(edgeIdStr)
      const cap = trace.effectiveCapacity[edgeId] ?? 0
      if (flow < 0) {
        errors.push(`Langkah ${step.step}: Arus pada edge #${edgeId} bernilai negatif (${flow}).`)
      }
      if (flow > cap) {
        errors.push(
          `Langkah ${step.step}: Arus pada edge #${edgeId} (${flow}) melebihi kapasitas efektif (${cap}).`
        )
      }
    }
  }

  // Ambil arus pada kondisi final (langkah terakhir)
  const finalStep = trace.steps[trace.steps.length - 1]
  const finalEdgeFlows = finalStep ? finalStep.edgeFlows : {}

  // 2. Validasi Konservasi Aliran di simpul perantara
  const nodeNetFlow: Record<number, number> = {} // inflow - outflow
  for (const node of topology.nodes) {
    nodeNetFlow[node.id] = 0
  }

  for (const edge of topology.edges) {
    const flow = finalEdgeFlows[edge.id] ?? 0
    if (nodeNetFlow[edge.from] !== undefined) {
      nodeNetFlow[edge.from] -= flow // Keluar dari edge.from
    }
    if (nodeNetFlow[edge.to] !== undefined) {
      nodeNetFlow[edge.to] += flow // Masuk ke edge.to
    }
  }

  for (const node of topology.nodes) {
    if (node.id === sourceId || node.id === sinkId) continue
    const net = nodeNetFlow[node.id]
    if (Math.abs(net) > 1e-4) {
      errors.push(
        `Konservasi Aliran Gagal di simpul ${node.code} (ID: ${node.id}): net flow = ${net} kend/jam (arus masuk != arus keluar).`
      )
    }
  }

  // 3. Validasi Nilai Aliran Maksimum terhadap Outflow Source & Inflow Sink
  let sourceTotalOut = 0
  for (const edge of topology.edges) {
    if (edge.from === sourceId) {
      sourceTotalOut += finalEdgeFlows[edge.id] ?? 0
    }
  }

  let sinkTotalIn = 0
  for (const edge of topology.edges) {
    if (edge.to === sinkId) {
      sinkTotalIn += finalEdgeFlows[edge.id] ?? 0
    }
  }

  if (Math.abs(sourceTotalOut - trace.result.maxFlow) > 1e-4) {
    errors.push(
      `Total arus keluar dari Source ${sourceId} (${sourceTotalOut}) tidak sama dengan maxFlow (${trace.result.maxFlow}).`
    )
  }

  if (Math.abs(sinkTotalIn - trace.result.maxFlow) > 1e-4) {
    errors.push(
      `Total arus masuk ke Sink ${sinkId} (${sinkTotalIn}) tidak sama dengan maxFlow (${trace.result.maxFlow}).`
    )
  }

  // 4. Validasi Teorema Min-Cut: Kapasitas Min-Cut == Max Flow
  let minCutCapacitySum = 0
  for (const cutEdgeId of trace.result.minCut) {
    const cap = trace.effectiveCapacity[cutEdgeId] ?? 0
    minCutCapacitySum += cap
  }

  if (Math.abs(minCutCapacitySum - trace.result.maxFlow) > 1e-4) {
    errors.push(
      `Teorema Min-Cut Gagal: Jumlah kapasitas ruas pemotong (${minCutCapacitySum}) != maxFlow (${trace.result.maxFlow}).`
    )
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

