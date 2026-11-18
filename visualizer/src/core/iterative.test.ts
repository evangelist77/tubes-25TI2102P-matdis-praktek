import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { solveMaxFlow } from './iterative'
import { validateTrace } from './validateTrace'
import type { Topology, Trace } from './types'

const topology: Topology = {
  case_id: 'iterative-test',
  title: '',
  description: '',
  nodes: [
    { id: 0, code: 'S*', label: '', pos: [0, 0], type: 'supersource' },
    { id: 1, code: 'S1', label: '', pos: [0, 0], type: 'source' },
    { id: 2, code: 'S2', label: '', pos: [0, 0], type: 'source' },
    { id: 3, code: 'A', label: '', pos: [0, 0], type: 'junction' },
    { id: 4, code: 'T1', label: '', pos: [0, 0], type: 'sink' },
    { id: 5, code: 'T*', label: '', pos: [0, 0], type: 'supersink' }
  ],
  edges: [
    { id: 0, from: 0, to: 1, capacity: 20, road: 'S* → S1', isVirtual: true },
    { id: 1, from: 0, to: 2, capacity: 20, road: 'S* → S2', isVirtual: true },
    { id: 2, from: 1, to: 3, capacity: 5, road: 'S1 → A' },
    { id: 3, from: 2, to: 3, capacity: 5, road: 'S2 → A' },
    { id: 4, from: 3, to: 4, capacity: 7, road: 'A → T1', isMarket: true },
    { id: 5, from: 4, to: 5, capacity: 20, road: 'T1 → T*', isVirtual: true },
    { id: 6, from: 1, to: 2, capacity: 3, road: 'closed road', closedInMorning: true }
  ],
  events: []
}

describe('solveMaxFlow', () => {
  it('finds a shared multi-terminal maximum flow and a matching min-cut', () => {
    const result = solveMaxFlow(topology, 0, 5)
    const cutCapacity = result.minCut.reduce((sum, id) => sum + result.effectiveCapacity[id], 0)

    expect(result.maxFlow).toBe(7)
    expect(cutCapacity).toBe(result.maxFlow)
    expect(result.steps[result.steps.length - 1]?.edgeFlows[4]).toBe(7)
    expect(result.steps.every((step) => step.edgeFlows[4] <= result.effectiveCapacity[4])).toBe(true)
  })

  it('applies market narrowing and morning closure to the shared network', () => {
    const result = solveMaxFlow(topology, 0, 5, 0.5)

    expect(result.effectiveCapacity[4]).toBe(4)
    expect(result.effectiveCapacity[6]).toBe(0)
    expect(result.maxFlow).toBe(4)
  })

  it('produces a trace accepted by the existing capacity, conservation, and min-cut validator', () => {
    const result = solveMaxFlow(topology, 0, 5)
    const trace: Trace = {
      meta: { caseId: topology.case_id, source: result.source, sink: result.sink, alpha: 0, pasarActive: false },
      effectiveCapacity: result.effectiveCapacity,
      steps: result.steps.map(({ step, path, bottleneck, totalFlow, edgeFlows }) => ({
        step,
        path: path.map((traversal) => traversal.edgeId),
        bottleneck,
        totalFlow,
        edgeFlows
      })),
      result: { maxFlow: result.maxFlow, minCut: result.minCut, sourceSide: result.sourceSide }
    }

    expect(validateTrace(topology, trace).isValid).toBe(true)
  })
})

describe('Gasibu terminal pairs', () => {
  const gasibuTopology = JSON.parse(
    readFileSync(resolve('public/data/topology.json'), 'utf8')
  ) as Topology

  it('keeps all pairs playable normally and explains pairs blocked by the full-market closures', () => {
    const pairs = [
      { source: 1, sink: 3 },
      { source: 1, sink: 4 },
      { source: 2, sink: 3 },
      { source: 2, sink: 4 }
    ]

    for (const pair of pairs) {
      const normal = solveMaxFlow(gasibuTopology, pair.source, pair.sink, 0)
      expect(normal.maxFlow).toBeGreaterThan(0)
      expect(normal.steps.length).toBeGreaterThan(0)
    }

    for (const pair of [pairs[0], pairs[2]]) {
      const market = solveMaxFlow(gasibuTopology, pair.source, pair.sink, 1)
      expect(market.maxFlow).toBe(0)
      expect(market.steps).toHaveLength(0)
    }
  })
})
