import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { diffIterativeTrace, solveMaxFlow, type IterativeTrace } from './iterative'
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

describe('diffIterativeTrace', () => {
  // graf kecil: jalur kedua harus membatalkan arus A -> D lewat edge balik (sama dengan FIXTURE di tests/test_iterative_ff.py)
  const node = (id: number, code: string) => ({ id, code, label: '', pos: [0, 0] as [number, number] })
  const edge = (id: number, from: number, to: number) => ({ id, from, to, capacity: 1, road: `${from} > ${to}` })
  const smallTopology: Topology = {
    case_id: 'fixture',
    title: '',
    description: '',
    nodes: [node(0, 'S1'), node(1, 'A'), node(2, 'B'), node(3, 'C'), node(4, 'D'), node(5, 'T1')],
    edges: [edge(0, 0, 1), edge(1, 1, 4), edge(2, 4, 5), edge(3, 0, 2), edge(4, 2, 4), edge(5, 1, 3), edge(6, 3, 5)],
    events: []
  }

  // keluaran iterative_ford_fulkerson.py untuk graf di atas (kunci string dan angka float seperti aslinya)
  const pythonTrace = () => JSON.parse(`{"caseId": "fixture", "alpha": 0.0, "pairs": [{"pairId": "S1-T1", "source": 0, "sink": 5,
    "alpha": 0.0, "effectiveCapacity": {"0": 1.0, "1": 1.0, "2": 1.0, "3": 1.0, "4": 1.0, "5": 1.0, "6": 1.0},
    "steps": [
      {"step": 1, "path": [
        {"edgeId": 0, "from": 0, "to": 1, "isBackward": false, "residualBefore": 1.0},
        {"edgeId": 1, "from": 1, "to": 4, "isBackward": false, "residualBefore": 1.0},
        {"edgeId": 2, "from": 4, "to": 5, "isBackward": false, "residualBefore": 1.0}],
       "pathNodes": [0, 1, 4, 5], "bottleneck": 1.0, "totalFlow": 1.0,
       "edgeFlows": {"0": 1.0, "1": 1.0, "2": 1.0, "3": 0.0, "4": 0.0, "5": 0.0, "6": 0.0}},
      {"step": 2, "path": [
        {"edgeId": 3, "from": 0, "to": 2, "isBackward": false, "residualBefore": 1.0},
        {"edgeId": 4, "from": 2, "to": 4, "isBackward": false, "residualBefore": 1.0},
        {"edgeId": 1, "from": 4, "to": 1, "isBackward": true, "residualBefore": 1.0},
        {"edgeId": 5, "from": 1, "to": 3, "isBackward": false, "residualBefore": 1.0},
        {"edgeId": 6, "from": 3, "to": 5, "isBackward": false, "residualBefore": 1.0}],
       "pathNodes": [0, 2, 4, 1, 3, 5], "bottleneck": 1.0, "totalFlow": 2.0,
       "edgeFlows": {"0": 1.0, "1": 0.0, "2": 1.0, "3": 1.0, "4": 1.0, "5": 1.0, "6": 1.0}}],
    "maxFlow": 2.0, "minCut": [0, 3], "sourceSide": [0]}]}`) as IterativeTrace

  it('trace Python sama dengan hitungan browser, termasuk edge balik', () => {
    const trace = pythonTrace()
    const browser = solveMaxFlow(smallTopology, 0, 5)

    expect(diffIterativeTrace(smallTopology, trace)).toEqual([])
    expect(browser.steps[1].path.filter((t) => t.isBackward).map((t) => t.edgeId)).toEqual([1])
    expect(browser.steps).toEqual(trace.pairs[0].steps)
  })

  it('menyebut bagian yang berbeda bila trace tidak cocok', () => {
    const trace = pythonTrace()
    trace.pairs[0].maxFlow = 3
    trace.pairs[0].steps[1].path[2].isBackward = false

    expect(diffIterativeTrace(smallTopology, trace)).toEqual(['S1-T1: max flow berbeda', 'S1-T1: jalur berbeda'])
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
