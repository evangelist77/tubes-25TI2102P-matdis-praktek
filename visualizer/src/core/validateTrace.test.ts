import { describe, expect, it } from 'vitest'
import { validateTrace } from './validateTrace'
import type { Topology, Trace } from './types'

describe('validateTrace', () => {
  const dummyTopology: Topology = {
    case_id: 'test_case',
    title: 'Test',
    description: 'Test',
    nodes: [
      { id: 1, code: 'S1', label: 'Source', pos: [0, 0], type: 'source' },
      { id: 5, code: 'V5', label: 'Mid', pos: [1, 1], type: 'junction' },
      { id: 3, code: 'T1', label: 'Sink', pos: [2, 2], type: 'sink' }
    ],
    edges: [
      { id: 0, from: 1, to: 5, capacity: 500, road: 'Jalan A' },
      { id: 1, from: 5, to: 3, capacity: 400, road: 'Jalan B' }
    ],
    events: []
  }

  it('validates a mathematically consistent trace', () => {
    const validTrace: Trace = {
      meta: { caseId: 'test_case', source: 1, sink: 3, alpha: 0, scenario: 'C' },
      effectiveCapacity: { 0: 500, 1: 400 },
      steps: [
        {
          step: 1,
          path: [0, 1],
          bottleneck: 400,
          totalFlow: 400,
          edgeFlows: { 0: 400, 1: 400 },
          narrative: 'Aliran 400 dialirkan melalui Jalan A dan Jalan B.'
        }
      ],
      result: {
        maxFlow: 400,
        minCut: [1], // Edge #1 adalah bottleneck (kapasitas 400)
        sourceSide: [1, 5]
      }
    }

    const validation = validateTrace(dummyTopology, validTrace)
    expect(validation.isValid).toBe(true)
    expect(validation.errors).toHaveLength(0)
  })

  it('detects capacity violation when flow exceeds capacity', () => {
    const invalidTrace: Trace = {
      meta: { caseId: 'test_case', source: 1, sink: 3, alpha: 0, scenario: 'C' },
      effectiveCapacity: { 0: 500, 1: 400 },
      steps: [
        {
          step: 1,
          path: [0, 1],
          bottleneck: 450,
          totalFlow: 450,
          edgeFlows: { 0: 450, 1: 450 }, // 450 > capacity 400 on edge 1!
          narrative: 'Aliran melebihi kapasitas.'
        }
      ],
      result: {
        maxFlow: 450,
        minCut: [1],
        sourceSide: [1, 5]
      }
    }

    const validation = validateTrace(dummyTopology, invalidTrace)
    expect(validation.isValid).toBe(false)
    expect(validation.errors.some((e) => e.includes('melebihi kapasitas'))).toBe(true)
  })

  it('detects flow conservation violation at junction', () => {
    const invalidTrace: Trace = {
      meta: { caseId: 'test_case', source: 1, sink: 3, alpha: 0, scenario: 'C' },
      effectiveCapacity: { 0: 500, 1: 400 },
      steps: [
        {
          step: 1,
          path: [0],
          bottleneck: 300,
          totalFlow: 300,
          edgeFlows: { 0: 300, 1: 100 }, // in = 300, out = 100 at node 5 -> net != 0!
          narrative: 'Bocor di simpul 5.'
        }
      ],
      result: {
        maxFlow: 300,
        minCut: [0],
        sourceSide: [1]
      }
    }

    const validation = validateTrace(dummyTopology, invalidTrace)
    expect(validation.isValid).toBe(false)
    expect(validation.errors.some((e) => e.includes('Konservasi Aliran Gagal'))).toBe(true)
  })

  it('detects min-cut theorem violation when cut capacity != max flow', () => {
    const invalidTrace: Trace = {
      meta: { caseId: 'test_case', source: 1, sink: 3, alpha: 0, scenario: 'C' },
      effectiveCapacity: { 0: 500, 1: 400 },
      steps: [
        {
          step: 1,
          path: [0, 1],
          bottleneck: 400,
          totalFlow: 400,
          edgeFlows: { 0: 400, 1: 400 },
          narrative: 'Aliran 400.'
        }
      ],
      result: {
        maxFlow: 400,
        minCut: [0], // Edge #0 has capacity 500, but maxFlow is 400 -> mismatch!
        sourceSide: [1]
      }
    }

    const validation = validateTrace(dummyTopology, invalidTrace)
    expect(validation.isValid).toBe(false)
    expect(validation.errors.some((e) => e.includes('Teorema Min-Cut Gagal'))).toBe(true)
  })
})
