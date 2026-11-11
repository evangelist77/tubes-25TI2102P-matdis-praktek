import { describe, expect, it } from 'vitest'
import { computeResidualEdges, residualOutCapacity } from './residual'

const edges = [
  { id: 0, from: 1, to: 2, capacity: 10, road: 'A' },
  { id: 1, from: 2, to: 3, capacity: 4, road: 'B' },
  { id: 2, from: 0, to: 1, capacity: 1e5, road: 'virtual', isVirtual: true }
]

describe('computeResidualEdges', () => {
  it('menghasilkan edge maju (sisa) dan edge balik (arus), melewati edge virtual', () => {
    const r = computeResidualEdges(edges, { 0: 4, 1: 4 }, {})
    // ruas A: sisa 6 (maju) + balik 4 ; ruas B jenuh: tanpa edge maju, balik 4
    expect(r.filter((e) => !e.isBackward).map((e) => [e.originalEdgeId, e.residualCapacity])).toEqual([[0, 6]])
    expect(r.filter((e) => e.isBackward).map((e) => [e.originalEdgeId, e.residualCapacity])).toEqual([
      [0, 4],
      [1, 4]
    ])
    expect(r.some((e) => e.originalEdgeId === 2)).toBe(false)
  })

  it('memakai kapasitas efektif bila diberikan', () => {
    const r = computeResidualEdges(edges, { 0: 0 }, { 0: 3 })
    expect(r.find((e) => e.originalEdgeId === 0)?.residualCapacity).toBe(3)
  })

  it('residualOutCapacity menjumlahkan sisa keluar dari simpul', () => {
    const r = computeResidualEdges(edges, { 0: 4, 1: 4 }, {})
    // dari simpul 2 hanya ada edge balik ruas A (2→1) sebesar 4; ruas B jenuh sehingga tidak punya edge maju
    expect(residualOutCapacity(2, r)).toBe(4)
  })
})
