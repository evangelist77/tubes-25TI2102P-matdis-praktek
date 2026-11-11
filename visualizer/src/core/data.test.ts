/**
 * Uji integritas data: setiap kali topologi/trace/manifest di-generate ulang,
 * `npm test` memastikan semuanya konsisten dan lolos validateTrace.
 */
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import type { GeometryMap, Manifest, RoutesFile, Topology, Trace } from './types'
import { validateTrace } from './validateTrace'

const dataDir = path.resolve(__dirname, '../../public/data')
const read = <T>(f: string) => JSON.parse(fs.readFileSync(path.join(dataDir, f), 'utf-8')) as T

describe('data publik', () => {
  const topology = read<Topology>('topology.json')
  const manifest = read<Manifest>('manifest.json')

  it('topologi: id edge unik, ujung edge ada, ruas pasar dan ruas tutup bertanda', () => {
    const nodeIds = new Set(topology.nodes.map((n) => n.id))
    const edgeIds = topology.edges.map((e) => e.id)
    expect(new Set(edgeIds).size).toBe(edgeIds.length)
    for (const e of topology.edges) {
      expect(nodeIds.has(e.from)).toBe(true)
      expect(nodeIds.has(e.to)).toBe(true)
    }
    expect(topology.edges.some((e) => e.isMarket)).toBe(true)
    expect(topology.edges.some((e) => e.closedInMorning)).toBe(true)
  })

  it('manifest memiliki tepat satu run default dan semua file trace ada', () => {
    expect(manifest.runs.filter((r) => r.isDefault)).toHaveLength(1)
    for (const run of manifest.runs) {
      expect(fs.existsSync(path.join(dataDir, run.filename)), run.filename).toBe(true)
    }
  })

  it('semua trace valid (kapasitas, konservasi arus, min-cut = max flow)', () => {
    for (const run of manifest.runs) {
      const result = validateTrace(topology, read<Trace>(run.filename))
      expect(result.isValid, `${run.filename}: ${result.errors.join('; ')}`).toBe(true)
    }
  })

  it('manifest punya observedAlpha dan run tanpa pasar + pasar penuh untuk setiap pasangan', () => {
    expect(manifest.observedAlpha).toBeGreaterThan(0)
    const pairs = new Set(manifest.runs.map((r) => `${r.sourceCode}>${r.sinkCode}`))
    expect(pairs.size).toBe(4)
    for (const p of pairs) {
      const alphas = manifest.runs.filter((r) => `${r.sourceCode}>${r.sinkCode}` === p).map((r) => r.alpha)
      expect(alphas, p).toContain(0)
      expect(alphas, p).toContain(manifest.observedAlpha)
    }
  })

  it('geometri: setiap ruas asli punya bentuk jalan minimal 2 titik', () => {
    const geometry = read<GeometryMap>('geometry.json')
    for (const e of topology.edges.filter((x) => !x.isVirtual)) {
      expect(geometry[e.id]?.length, `edge #${e.id} ${e.road}`).toBeGreaterThanOrEqual(2)
    }
  })

  it('rute: urutan edge bersambung dari S ke T dan warna tiap rute unik', () => {
    const { routes } = read<RoutesFile>('routes.json')
    const edge = new Map(topology.edges.map((e) => [e.id, e]))
    const code = new Map(topology.nodes.map((n) => [n.id, n.code]))
    expect(routes).toHaveLength(8)
    expect(new Set(routes.map((r) => r.color)).size).toBe(routes.length)
    for (const r of routes) {
      for (let i = 0; i < r.edgeIds.length - 1; i++) {
        expect(edge.get(r.edgeIds[i])!.to, `${r.id} sambungan ${i}`).toBe(edge.get(r.edgeIds[i + 1])!.from)
      }
      expect(code.get(edge.get(r.edgeIds[0])!.from)).toBe(r.source)
      expect(code.get(edge.get(r.edgeIds[r.edgeIds.length - 1])!.to)).toBe(r.sink)
    }
  })
})
