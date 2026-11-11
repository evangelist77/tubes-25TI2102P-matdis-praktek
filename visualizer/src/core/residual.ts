/**
 * Komputasi Residual Graph dari state aliran saat ini.
 * Digunakan untuk mode tampilan residual (toggle).
 *
 * Residual graph terdiri dari:
 * - Forward edges: kapasitas sisa = kapasitas efektif - arus
 * - Backward edges: kapasitas = arus yang sudah melewati edge tersebut
 */

export interface ResidualEdge {
  /** ID edge asli */
  originalEdgeId: number
  from: number
  to: number
  /** Kapasitas residual (sisa untuk forward, arus untuk backward) */
  residualCapacity: number
  /** Apakah ini backward edge (edge balik) */
  isBackward: boolean
  /** Nama jalan asli (untuk tooltip) */
  road: string
}

/**
 * Hitung daftar residual edges berdasarkan topologi, arus saat ini,
 * dan kapasitas efektif.
 */
export function computeResidualEdges(
  edges: { id: number; from: number; to: number; capacity: number; road: string; isVirtual?: boolean }[],
  edgeFlows: Record<number, number>,
  effectiveCapacities: Record<number, number>
): ResidualEdge[] {
  const result: ResidualEdge[] = []

  for (const edge of edges) {
    // Lewati edge virtual (S*, T*)
    if (edge.isVirtual) continue

    const flow = edgeFlows[edge.id] ?? 0
    const capacity = effectiveCapacities[edge.id] ?? edge.capacity

    // Forward edge: kapasitas sisa = capacity - flow
    const forwardResidual = capacity - flow
    if (forwardResidual > 0) {
      result.push({
        originalEdgeId: edge.id,
        from: edge.from,
        to: edge.to,
        residualCapacity: forwardResidual,
        isBackward: false,
        road: edge.road
      })
    }

    // Backward edge: kapasitas = flow (bisa "dikembalikan")
    if (flow > 0) {
      result.push({
        originalEdgeId: edge.id,
        from: edge.to,   // arah balik
        to: edge.from,   // arah balik
        residualCapacity: flow,
        isBackward: true,
        road: `${edge.road} (balik)`
      })
    }
  }

  return result
}

/**
 * Hitung total kapasitas residual keluar dari sebuah node.
 * Berguna untuk menampilkan informasi di tooltip node.
 */
export function residualOutCapacity(
  nodeId: number,
  residualEdges: ResidualEdge[]
): number {
  return residualEdges
    .filter((e) => e.from === nodeId)
    .reduce((sum, e) => sum + e.residualCapacity, 0)
}

