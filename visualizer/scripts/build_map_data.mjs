/**
 * Membangun geometri jalan dan daftar rute untuk visualizer dari data web tim (graph/index.html).
 *
 *  - public/data/geometry.json : { "<edgeId>": [[lon, lat], ...] }  bentuk jalan sebenarnya tiap ruas
 *  - public/data/routes.json   : delapan rute S -> T (nama, koridor, warna, daftar id edge)
 *
 * Ruas yang di YAML dirantai (FIX-1..4) tidak punya segmen sendiri di web lama; geometrinya dipotong
 * dari segmen yang melewati kedua simpulnya.
 */
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const dataDir = path.join(root, 'public/data')
const graphHtml = path.resolve(root, '../graph/index.html')

const topology = JSON.parse(fs.readFileSync(path.join(dataDir, 'topology.json'), 'utf8'))
const html = fs.readFileSync(graphHtml, 'utf8')

// --- ambil objek GRAPH_DATA dari index.html lama
const start = html.indexOf('const GRAPH_DATA = ')
if (start < 0) throw new Error('GRAPH_DATA tidak ditemukan di graph/index.html')
let i = html.indexOf('{', start)
let depth = 0
let j = i
for (; j < html.length; j++) {
  if (html[j] === '{') depth++
  else if (html[j] === '}' && --depth === 0) break
}
const graph = vm.runInNewContext('(' + html.slice(i, j + 1) + ')')

const nodeByCode = new Map(topology.nodes.map((n) => [n.code, n]))
const R = 111320
const toXY = (lat, lng, lat0) => [lng * R * Math.cos((lat0 * Math.PI) / 180), lat * R]

function nearestOnPolyline(poly, lat, lng) {
  let best = { dist: Infinity, s: 0, point: poly[0], seg: 0 }
  let acc = 0
  for (let k = 0; k < poly.length - 1; k++) {
    const [ax, ay] = toXY(poly[k][0], poly[k][1], lat)
    const [bx, by] = toXY(poly[k + 1][0], poly[k + 1][1], lat)
    const [px, py] = toXY(lat, lng, lat)
    const dx = bx - ax
    const dy = by - ay
    const len2 = dx * dx + dy * dy || 1
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2))
    const d = Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
    const segLen = Math.sqrt(len2)
    if (d < best.dist) {
      best = {
        dist: d,
        s: acc + t * segLen,
        seg: k,
        t,
        point: [poly[k][0] + (poly[k + 1][0] - poly[k][0]) * t, poly[k][1] + (poly[k + 1][1] - poly[k][1]) * t]
      }
    }
    acc += segLen
  }
  return best
}

function slicePolyline(poly, a, b) {
  const pts = [a.point]
  for (let k = a.seg + 1; k <= b.seg; k++) pts.push(poly[k])
  pts.push(b.point)
  return pts
}

const segByPair = new Map(graph.segments.map((s) => [`${s.fromNode} -> ${s.toNode}`, s]))
const round = (n) => Math.round(n * 1e6) / 1e6

const geometry = {}
const report = { direct: 0, sliced: 0, straight: 0 }
for (const edge of topology.edges) {
  if (edge.isVirtual) continue
  const [uCode, vCode] = edge.code.split(' -> ')
  const u = nodeByCode.get(uCode)
  const v = nodeByCode.get(vCode)
  let latlng = null

  const direct = segByPair.get(edge.code)
  if (direct) {
    latlng = direct.coords
    report.direct++
  } else {
    let bestCand = null
    for (const seg of graph.segments) {
      const a = nearestOnPolyline(seg.coords, u.pos[1], u.pos[0])
      const b = nearestOnPolyline(seg.coords, v.pos[1], v.pos[0])
      if (a.dist < 40 && b.dist < 40 && a.s < b.s - 5) {
        const cost = a.dist + b.dist
        if (!bestCand || cost < bestCand.cost) bestCand = { cost, seg, a, b }
      }
    }
    if (bestCand) {
      latlng = slicePolyline(bestCand.seg.coords, bestCand.a, bestCand.b)
      report.sliced++
      console.log(`  dipotong dari ${bestCand.seg.id}: ${edge.code}`)
    }
  }
  if (!latlng) {
    latlng = [
      [u.pos[1], u.pos[0]],
      [v.pos[1], v.pos[0]]
    ]
    report.straight++
    console.warn(`  PERINGATAN: tidak ada geometri untuk ${edge.code}, dipakai garis lurus`)
  }
  geometry[edge.id] = latlng.map(([lat, lng]) => [round(lng), round(lat)])
}

// --- rute: urutan simpul web lama -> urutan id edge di topologi (rantai FIX dikembangkan)
const edgeByCode = new Map(topology.edges.filter((e) => !e.isVirtual).map((e) => [e.code, e]))
const outgoing = new Map()
for (const e of edgeByCode.values()) {
  const [u] = e.code.split(' -> ')
  if (!outgoing.has(u)) outgoing.set(u, [])
  outgoing.get(u).push(e)
}

function edgesBetween(u, v) {
  const direct = edgeByCode.get(`${u} -> ${v}`)
  if (direct) return [direct]
  // rantai hingga 3 ruas (ruas yang dirantai FIX-n)
  const queue = [{ node: u, path: [] }]
  while (queue.length) {
    const { node, path: p } = queue.shift()
    if (p.length >= 3) continue
    for (const e of outgoing.get(node) ?? []) {
      const next = e.code.split(' -> ')[1]
      if (next === v) return [...p, e]
      queue.push({ node: next, path: [...p, e] })
    }
  }
  throw new Error(`Tidak ada ruas dari ${u} ke ${v} di topologi`)
}

const routes = graph.paths.map((p) => {
  const edgeIds = []
  for (let k = 0; k < p.nodeIds.length - 1; k++) {
    for (const e of edgesBetween(p.nodeIds[k], p.nodeIds[k + 1])) edgeIds.push(e.id)
  }
  return {
    id: p.id,
    name: p.name,
    fromName: p.fromName,
    toName: p.toName,
    corridor: p.corridor,
    via: p.via,
    source: p.source,
    sink: p.sink,
    color: p.color,
    distanceInfo: p.distanceInfo,
    edgeIds
  }
})

fs.writeFileSync(path.join(dataDir, 'geometry.json'), JSON.stringify(geometry))
fs.writeFileSync(path.join(dataDir, 'routes.json'), JSON.stringify({ routes }, null, 2))
console.log(
  `geometry.json: ${Object.keys(geometry).length} ruas (langsung ${report.direct}, dipotong ${report.sliced}, garis lurus ${report.straight}); routes.json: ${routes.length} rute`
)
