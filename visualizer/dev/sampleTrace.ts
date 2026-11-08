/**
 * ============================================================================
 * DEV-ONLY SAMPLE TRACE GENERATOR
 * PENTING: Berkas ini HANYA untuk kebutuhan pengembangan awal visualizer UI
 * sebelum modul solver Python resmi dari tim (Elang & Hafiz) selesai diekspor.
 * TIDAK DIGUNAKAN DI PRODUKSI.
 * ============================================================================
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Topology, Trace, TraceStep, Manifest, ManifestEntry } from '../src/core/types'
import { validateTrace } from '../src/core/validateTrace'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const TOPOLOGY_PATH = path.resolve(__dirname, '../public/data/topology.json')
const PUBLIC_DATA_DIR = path.resolve(__dirname, '../public/data')

interface ResidualEdge {
  to: number
  capacity: number
  flow: number
  edgeId: number
  isReverse: boolean
  revIndex: number
}

function solveFordFulkerson(
  topology: Topology,
  sourceId: number,
  sinkId: number,
  alpha: number,
  scenario: 'A' | 'B' | 'C'
): Trace {
  // 1. Hitung kapasitas efektif untuk setiap edge berdasarkan alpha & skenario
  const effectiveCapacity: Record<number, number> = {}

  for (const edge of topology.edges) {
    let cap = edge.capacity

    // Ruas pasar tumpah (Jl. Japati, edge #8)
    if (edge.isMarket || edge.id === 8) {
      cap = Math.round(edge.capacity * (1 - alpha))
    }

    // Ruas Singaperbangsa (edge #20, ditutup pagi di skenario A)
    if (edge.id === 20 && scenario === 'A') {
      cap = 0
    }

    effectiveCapacity[edge.id] = cap
  }

  // 2. Bangun Graf Residual
  const adj: Map<number, ResidualEdge[]> = new Map()
  for (const node of topology.nodes) {
    adj.set(node.id, [])
  }

  for (const edge of topology.edges) {
    const cap = effectiveCapacity[edge.id] ?? 0
    const fromList = adj.get(edge.from)!
    const toList = adj.get(edge.to)!

    const forwardIdx = fromList.length
    const reverseIdx = toList.length

    fromList.push({
      to: edge.to,
      capacity: cap,
      flow: 0,
      edgeId: edge.id,
      isReverse: false,
      revIndex: reverseIdx
    })

    toList.push({
      to: edge.from,
      capacity: 0,
      flow: 0,
      edgeId: edge.id,
      isReverse: true,
      revIndex: forwardIdx
    })
  }

  const steps: TraceStep[] = []
  let totalFlow = 0
  let stepIndex = 0

  // 3. Pencarian Jalur Augmentasi (BFS Edmonds-Karp / Ford-Fulkerson)
  while (true) {
    const parentEdge: Map<number, { u: number; edgeIdx: number }> = new Map()
    const visited = new Set<number>([sourceId])
    const queue: number[] = [sourceId]

    while (queue.length > 0) {
      const u = queue.shift()!
      if (u === sinkId) break

      const neighbors = adj.get(u) || []
      for (let i = 0; i < neighbors.length; i++) {
        const edge = neighbors[i]
        const residualCap = edge.capacity - edge.flow
        if (residualCap > 0 && !visited.has(edge.to)) {
          visited.add(edge.to)
          parentEdge.set(edge.to, { u, edgeIdx: i })
          queue.push(edge.to)
        }
      }
    }

    // Jika sink tidak tercapai, tidak ada lagi jalur augmentasi
    if (!parentEdge.has(sinkId)) {
      break
    }

    // Hitung kapasitas leher botol (bottleneck) sepanjang jalur augmentasi
    let bottleneck = Infinity
    let curr = sinkId
    const pathEdgeIds: number[] = []

    while (curr !== sourceId) {
      const { u, edgeIdx } = parentEdge.get(curr)!
      const edge = adj.get(u)![edgeIdx]
      bottleneck = Math.min(bottleneck, edge.capacity - edge.flow)
      curr = u
    }

    // Alirkan bottleneck sepanjang jalur
    curr = sinkId
    while (curr !== sourceId) {
      const { u, edgeIdx } = parentEdge.get(curr)!
      const forwardEdge = adj.get(u)![edgeIdx]
      const backwardEdge = adj.get(forwardEdge.to)![forwardEdge.revIndex]

      forwardEdge.flow += bottleneck
      backwardEdge.flow -= bottleneck

      if (!forwardEdge.isReverse) {
        pathEdgeIds.push(forwardEdge.edgeId)
      }
      curr = u
    }

    pathEdgeIds.reverse()
    totalFlow += bottleneck
    stepIndex++

    // Catat akumulasi arus per edge
    const currentEdgeFlows: Record<number, number> = {}
    for (const edge of topology.edges) {
      const fEdge = adj.get(edge.from)?.find((e) => e.edgeId === edge.id && !e.isReverse)
      currentEdgeFlows[edge.id] = Math.max(0, fEdge?.flow ?? 0)
    }

    // Buat narrative komunikatif sesuai GLOSSARY.md
    const pathRoadNames = pathEdgeIds
      .map((eid) => topology.edges.find((e) => e.id === eid)?.road || `Ruas #${eid}`)
      .join(' → ')

    const narrative = `Langkah #${stepIndex}: Ditemukan rute augmentasi [${pathRoadNames}]. Arus bertambah +${bottleneck} kend/jam. Akumulasi aliran saat ini mencapai ${totalFlow} kend/jam.`

    steps.push({
      step: stepIndex,
      path: pathEdgeIds,
      bottleneck,
      totalFlow,
      edgeFlows: currentEdgeFlows,
      narrative
    })
  }

  // 4. Hitung Min-Cut (Simpul sisi S vs sisi T)
  const sourceSideSet = new Set<number>()
  const queue: number[] = [sourceId]
  sourceSideSet.add(sourceId)

  while (queue.length > 0) {
    const u = queue.shift()!
    const neighbors = adj.get(u) || []
    for (const edge of neighbors) {
      const residualCap = edge.capacity - edge.flow
      if (residualCap > 0 && !sourceSideSet.has(edge.to)) {
        sourceSideSet.add(edge.to)
        queue.push(edge.to)
      }
    }
  }

  const minCut: number[] = []
  for (const edge of topology.edges) {
    if (sourceSideSet.has(edge.from) && !sourceSideSet.has(edge.to)) {
      minCut.push(edge.id)
    }
  }

  return {
    meta: {
      caseId: topology.case_id,
      source: sourceId,
      sink: sinkId,
      alpha,
      scenario
    },
    effectiveCapacity,
    steps,
    result: {
      maxFlow: totalFlow,
      minCut,
      sourceSide: Array.from(sourceSideSet).sort((a, b) => a - b)
    }
  }
}

export function generateAllSampleTraces() {
  console.log('Generating dev-only sample traces from topology.json...')
  const rawTopo = fs.readFileSync(TOPOLOGY_PATH, 'utf-8')
  const topology = JSON.parse(rawTopo) as Topology

  // Pasangan terminal yang diuji
  const pairs = [
    { s: 1, t: 3, sCode: 'S1', tCode: 'T1', label: 'S1 (Pasupati) → T1 (PUSDAI)' },
    { s: 1, t: 4, sCode: 'S1', tCode: 'T2', label: 'S1 (Pasupati) → T2 (Diponegoro)' },
    { s: 2, t: 3, sCode: 'S2', tCode: 'T1', label: 'S2 (Dipatiukur) → T1 (PUSDAI)' },
    { s: 2, t: 4, sCode: 'S2', tCode: 'T2', label: 'S2 (Dipatiukur) → T2 (Diponegoro)' }
  ]

  // Nilai alpha penyempitan pasar
  const alphas: Array<{ alpha: number; scenario: 'A' | 'B' | 'C'; desc: string }> = [
    { alpha: 0.0, scenario: 'C', desc: 'Normal (Tanpa Pasar, alpha=0)' },
    { alpha: 0.25, scenario: 'B', desc: 'Pasar Mulai Bubar (Penyempitan 25%, alpha=0.25)' },
    { alpha: 0.5, scenario: 'A', desc: 'Pasar Penuh Pagi (Penyempitan 50%, alpha=0.5)' },
    { alpha: 0.75, scenario: 'A', desc: 'Pasar Sangat Padat (Penyempitan 75%, alpha=0.75)' }
  ]

  const manifestEntries: ManifestEntry[] = []

  for (const p of pairs) {
    for (const a of alphas) {
      const trace = solveFordFulkerson(topology, p.s, p.t, a.alpha, a.scenario)

      // Validasi konsistensi trace sebelum disimpan
      const validation = validateTrace(topology, trace)
      if (!validation.isValid) {
        console.error(`Validation failed for ${p.sCode}->${p.tCode} alpha=${a.alpha}:`, validation.errors)
        throw new Error(`Invalid sample trace generated: ${p.sCode}->${p.tCode}`)
      }

      const filename = `trace_${p.sCode}_${p.tCode}_a${Math.round(a.alpha * 100)}.json`
      const outPath = path.join(PUBLIC_DATA_DIR, filename)

      fs.writeFileSync(outPath, JSON.stringify(trace, null, 2), 'utf-8')

      manifestEntries.push({
        source: p.s,
        sink: p.t,
        sourceCode: p.sCode,
        sinkCode: p.tCode,
        alpha: a.alpha,
        scenario: a.scenario,
        filename,
        label: `${p.label} [${a.desc}]`
      })
    }
  }

  const manifest: Manifest = { runs: manifestEntries }
  const manifestPath = path.join(PUBLIC_DATA_DIR, 'manifest.json')
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8')

  console.log(`Successfully generated ${manifestEntries.length} sample trace files and manifest.json`)
}

// Eksekusi jika dipanggil langsung
if (process.argv[1] && process.argv[1].endsWith('sampleTrace.ts')) {
  generateAllSampleTraces()
}
