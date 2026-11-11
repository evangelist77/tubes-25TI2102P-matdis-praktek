import { describe, expect, it } from 'vitest'
import {
  cutCapacity,
  describeCondition,
  describeStep,
  routesForPair,
  runForCondition,
  describeBottlenecks,
  edgeRatio,
  findDefaultRun,
  isSaturatedEdge,
  pickRunForPair,
  runsForPair,
  sinkSideNodeIds
} from './selectors'
import type { Manifest, Topology, Trace } from './types'

const topology: Topology = {
  case_id: 't',
  title: '',
  description: '',
  nodes: [
    { id: 0, code: 'S*', label: '', pos: [0, 0], type: 'supersource' },
    { id: 1, code: 'S1', label: '', pos: [0, 0], type: 'source' },
    { id: 2, code: 'A', label: '', pos: [0, 0], type: 'junction' },
    { id: 3, code: 'T1', label: '', pos: [0, 0], type: 'sink' },
    { id: 4, code: 'T*', label: '', pos: [0, 0], type: 'supersink' }
  ],
  edges: [
    { id: 0, from: 1, to: 2, capacity: 10, road: 'Jl. A' },
    { id: 1, from: 2, to: 3, capacity: 6, road: 'Jl. B', isMarket: true }
  ],
  events: []
}

const trace: Trace = {
  meta: { caseId: 't', source: 1, sink: 3, alpha: 0.5, pasarActive: true },
  effectiveCapacity: { 0: 10, 1: 0 },
  steps: [],
  result: { maxFlow: 0, minCut: [1, 0], sourceSide: [1, 2] }
}

const manifest: Manifest = {
  observedAlpha: 0.5,
  runs: [
    { source: 1, sink: 3, sourceCode: 'S1', sinkCode: 'T1', alpha: 0.5, filename: 'b.json', label: 'b' },
    { source: 1, sink: 3, sourceCode: 'S1', sinkCode: 'T1', alpha: 0, filename: 'a.json', label: 'a', isDefault: true },
    { source: 2, sink: 3, sourceCode: 'S2', sinkCode: 'T1', alpha: 0.5, filename: 'c.json', label: 'c' }
  ]
}

describe('selectors', () => {
  it('edgeRatio aman untuk kapasitas 0', () => {
    expect(edgeRatio(5, 10)).toBe(0.5)
    expect(edgeRatio(5, 0)).toBe(0)
  })

  it('isSaturatedEdge hanya true bila kapasitas > 0 dan arus penuh', () => {
    expect(isSaturatedEdge(10, 10)).toBe(true)
    expect(isSaturatedEdge(9, 10)).toBe(false)
    expect(isSaturatedEdge(0, 0)).toBe(false)
  })

  it('cutCapacity menjumlahkan kapasitas efektif ruas pemotong', () => {
    expect(cutCapacity([0, 1], { 0: 10, 1: 6 })).toBe(16)
    expect(cutCapacity([], {})).toBe(0)
  })

  it('sinkSideNodeIds mengabaikan simpul virtual dan sisi S', () => {
    expect(sinkSideNodeIds(topology, [1, 2])).toEqual([3])
  })

  it('runsForPair mengurutkan menurut alpha dan memfilter pasangan', () => {
    expect(runsForPair(manifest, 'S1', 'T1').map((r) => r.alpha)).toEqual([0, 0.5])
  })

  it('findDefaultRun memakai isDefault, lalu run pertama', () => {
    expect(findDefaultRun(manifest)?.filename).toBe('a.json')
    expect(findDefaultRun({ observedAlpha: 0.5, runs: [manifest.runs[0]] })?.filename).toBe('b.json')
    expect(findDefaultRun({ observedAlpha: 0.5, runs: [] })).toBeNull()
  })

  it('pickRunForPair mempertahankan alpha bila ada, jika tidak run pertama', () => {
    expect(pickRunForPair(manifest, 'S2', 'T1', 0.5)?.filename).toBe('c.json')
    expect(pickRunForPair(manifest, 'S2', 'T1', 0.9)?.filename).toBe('c.json')
    expect(pickRunForPair(manifest, 'S2', 'T2', 0)).toBeNull()
  })

  it('describeBottlenecks menandai ruas tutup/pasar dan mengurutkan kapasitas', () => {
    const info = describeBottlenecks(topology, trace)
    expect(info[0]).toMatchObject({ edgeId: 0, capacity: 10, isClosed: false })
    expect(info[1]).toMatchObject({ edgeId: 1, capacity: 0, isClosed: true, isMarket: true })
  })

  it('describeCondition: hanya alpha 0 dan observedAlpha yang berbasis data', () => {
    expect(describeCondition(0, 0.5).key).toBe('normal')
    expect(describeCondition(0.5, 0.5).key).toBe('pasar')
    expect(describeCondition(0.3, 0.5).key).toBe('simulasi')
  })

  it('runForCondition memilih alpha 0 atau observedAlpha', () => {
    expect(runForCondition(manifest, 'S1', 'T1', 'normal')?.filename).toBe('a.json')
    expect(runForCondition(manifest, 'S1', 'T1', 'pasar')?.filename).toBe('b.json')
    expect(runForCondition(manifest, 'S2', 'T1', 'normal')).toBeNull()
  })

  it('routesForPair memfilter rute menurut pasangan S dan T', () => {
    const routes = [
      { id: 'a', source: 'S1', sink: 'T1' },
      { id: 'b', source: 'S1', sink: 'T2' },
      { id: 'c', source: 'S1', sink: 'T1' }
    ] as never
    expect(routesForPair(routes, 'S1', 'T1').map((r) => r.id)).toEqual(['a', 'c'])
  })

  it('describeStep menurunkan ruas, sisa kapasitas, dan bottleneck dari selisih arus', () => {
    const t: Trace = {
      meta: { caseId: 't', source: 1, sink: 3, alpha: 0, pasarActive: false },
      effectiveCapacity: { 0: 10, 1: 6 },
      steps: [
        { step: 1, path: [0, 1], bottleneck: 6, totalFlow: 6, edgeFlows: { 0: 6, 1: 6 } }
      ],
      result: { maxFlow: 6, minCut: [1], sourceSide: [1, 2] }
    }
    const d = describeStep(topology, t, 1)!
    expect(d).toMatchObject({ step: 1, totalBefore: 0, totalAfter: 6, bottleneck: 6 })
    expect(d.rows.map((r) => [r.edgeId, r.residualBefore, r.isBottleneck])).toEqual([
      [0, 10, false],
      [1, 6, true]
    ])
    expect(describeStep(topology, t, 2)).toBeNull()
  })
})
