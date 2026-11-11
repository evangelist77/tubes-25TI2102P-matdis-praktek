<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import L from 'leaflet'
import { boundsOf, pointAlong, strokeForCapacity, type LonLat } from '../core/geometry'
import { computeResidualEdges } from '../core/residual'
import { edgeRatio, isSaturatedEdge } from '../core/selectors'
import type { EdgeDef, GeometryMap, NodeDef, Topology } from '../core/types'
import { getFlowRatioColor, themeTokens } from '../theme/tokens'

interface RouteHalo {
  color: string
  edgeIds: number[]
}

const props = withDefaults(
  defineProps<{
    topology: Topology | null
    /** bentuk jalan tiap edge; bila tidak ada, dipakai garis lurus antar simpul */
    geometry?: GeometryMap
    edgeFlows?: Record<number, number>
    effectiveCapacities?: Record<number, number>
    activePath?: number[]
    minCutEdges?: number[]
    sourceSideNodes?: number[]
    sinkSideNodes?: number[]
    selectedEdgeId?: number | null
    residualMode?: boolean
    showBaseMap?: boolean
    /** hanya ruas ini yang digambar (null = semua ruas) */
    visibleEdgeIds?: number[] | null
    /** warna rute: halo berwarna di bawah ruas milik rute */
    halos?: RouteHalo[]
    /** id simpul S dan T yang sedang dipakai (terminal lain diredupkan) */
    activeTerminals?: number[]
    /** false = pasar tidak aktif pada run ini: ruas pasar digambar seperti ruas biasa */
    marketActive?: boolean
  }>(),
  {
    geometry: () => ({}),
    edgeFlows: () => ({}),
    effectiveCapacities: () => ({}),
    activePath: () => [],
    minCutEdges: () => [],
    sourceSideNodes: () => [],
    sinkSideNodes: () => [],
    selectedEdgeId: null,
    residualMode: false,
    showBaseMap: true,
    visibleEdgeIds: null,
    halos: () => [],
    activeTerminals: () => [],
    marketActive: true
  }
)

const emit = defineEmits<{
  (e: 'select-edge', edge: EdgeDef): void
  (e: 'select-node', node: NodeDef): void
}>()

const mapContainer = ref<HTMLDivElement | null>(null)
let mapInstance: L.Map | null = null
let tileLayer: L.TileLayer | null = null
let haloLayer: L.LayerGroup | null = null
let edgeLayer: L.LayerGroup | null = null
let nodeLayer: L.LayerGroup | null = null
let resizeObserver: ResizeObserver | null = null
let lastFitKey = ''

const NEUTRAL = '#94a3b8' // ruas yang belum dialiri
const toLatLng = (p: LonLat): L.LatLngTuple => [p[1], p[0]]
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function edgeLine(edge: EdgeDef, nodeMap: Map<number, NodeDef>): LonLat[] | null {
  const g = props.geometry[edge.id]
  if (g && g.length >= 2) return g
  const a = nodeMap.get(edge.from)
  const b = nodeMap.get(edge.to)
  return a && b ? [a.pos, b.pos] : null
}

function arrowIcon(angleDeg: number, color: string) {
  return L.divIcon({
    className: 'edge-arrow',
    html: `<svg width="16" height="16" viewBox="0 0 16 16" style="transform: rotate(${angleDeg}deg); overflow: visible;">
             <path d="M3 2 L14 8 L3 14 Z" fill="${color}" stroke="white" stroke-width="1.4" stroke-linejoin="round"/>
           </svg>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  })
}

function badgeIcon(text: string, color: string, opts: { muted?: boolean; outline?: boolean } = {}) {
  const bg = opts.outline ? '#ffffff' : color
  const fg = opts.outline ? color : '#ffffff'
  return L.divIcon({
    className: 'edge-flow-badge',
    html: `<div style="background:${bg}; color:${fg}; border:1.5px solid ${color}; border-radius:9999px; padding:1px 7px; display:inline-block; width:max-content; font-size:11px; font-weight:700; line-height:16px; white-space:nowrap; box-shadow:0 1px 3px rgba(0,0,0,.28); opacity:${opts.muted ? 0.75 : 1}; transform: translate(-50%, -50%);">${text}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0]
  })
}

function terminalIcon(node: NodeDef, active: boolean) {
  const isSource = node.type === 'source'
  const color = isSource ? themeTokens.colors.nodes.source : themeTokens.colors.nodes.sink
  const text = isSource ? `${node.code} · Masuk` : `${node.code} · Keluar`
  return L.divIcon({
    className: 'terminal-pill',
    html: `<div style="background:${color}; color:#fff; border:2px solid #fff; border-radius:9999px; padding:3px 10px; display:inline-block; width:max-content; font-size:12px; font-weight:800; white-space:nowrap; box-shadow:0 2px 6px rgba(0,0,0,.35); opacity:${active ? 1 : 0.45}; transform: translate(-50%, -130%);">${text}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0]
  })
}

function initMap() {
  if (!mapContainer.value) return
  mapInstance = L.map(mapContainer.value, {
    center: [-6.8992, 107.6185],
    zoom: 15,
    zoomControl: true,
    attributionControl: false
  })
  tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    referrerPolicy: 'origin-when-cross-origin'
  })
  if (props.showBaseMap) tileLayer.addTo(mapInstance)

  haloLayer = L.layerGroup().addTo(mapInstance)
  edgeLayer = L.layerGroup().addTo(mapInstance)
  nodeLayer = L.layerGroup().addTo(mapInstance)

  // peta harus dihitung ulang ukurannya saat tata letak berubah
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => mapInstance?.invalidateSize())
    resizeObserver.observe(mapContainer.value)
  }
  renderGraph()
}

function fitToVisible(nodeMap: Map<number, NodeDef>) {
  if (!mapInstance || !props.topology) return
  const key = props.visibleEdgeIds ? props.visibleEdgeIds.join(',') : 'all'
  if (key === lastFitKey) return
  lastFitKey = key
  const pts: LonLat[] = []
  for (const edge of props.topology.edges) {
    if (edge.isVirtual) continue
    if (props.visibleEdgeIds && !props.visibleEdgeIds.includes(edge.id)) continue
    const line = edgeLine(edge, nodeMap)
    if (line) pts.push(...line)
  }
  const b = boundsOf(pts)
  if (b) mapInstance.fitBounds(b, { padding: [60, 60], maxZoom: 17 })
}

function tooltipHtml(edge: EdgeDef, from: NodeDef, to: NodeDef, flow: number, capacity: number, color: string) {
  const pct = Math.round(edgeRatio(flow, capacity) * 100)
  const tags = [
    edge.isMarket && props.marketActive ? '<span style="color:#c2410c;font-weight:800">[PASAR TUMPAH]</span>' : '',
    edge.closedInMorning && capacity === 0 ? '<span style="color:#dc2626;font-weight:800">[DITUTUP]</span>' : ''
  ]
    .filter(Boolean)
    .join(' ')
  return `<div style="padding:2px 4px;max-width:260px">
      <div style="font-weight:700;font-size:13px">${tags} ${esc(edge.road)}</div>
      <div style="font-size:11px;color:#57534e;font-family:monospace;margin-top:2px">${esc(from.code)} → ${esc(to.code)}</div>
      <div style="margin-top:4px;font-size:12px">Arus <b>${flow}</b> / kapasitas <b>${capacity}</b> kend/jam
        <span style="margin-left:4px;padding:1px 6px;border-radius:4px;background:${color};color:#fff;font-weight:700;font-size:11px">${pct}%</span></div>
    </div>`
}

function renderEdges(nodeMap: Map<number, NodeDef>) {
  if (!edgeLayer || !haloLayer || !props.topology) return
  const visible = props.visibleEdgeIds ? new Set(props.visibleEdgeIds) : null
  const maxCap = Math.max(1, ...props.topology.edges.filter((e) => !e.isVirtual).map((e) => e.capacity))

  const inHalo = new Map<number, string>() // id edge -> warna halo (rute terakhir menang)
  for (const h of props.halos) for (const id of h.edgeIds) inHalo.set(id, h.color)

  const residualList = props.residualMode
    ? computeResidualEdges(props.topology.edges, props.edgeFlows, props.effectiveCapacities)
    : []
  const forwardResidualIds = new Set(residualList.filter((r) => !r.isBackward).map((r) => r.originalEdgeId))

  for (const edge of props.topology.edges) {
    if (edge.isVirtual) continue
    if (visible && !visible.has(edge.id)) continue
    const line = edgeLine(edge, nodeMap)
    const from = nodeMap.get(edge.from)
    const to = nodeMap.get(edge.to)
    if (!line || !from || !to) continue

    const flow = props.edgeFlows[edge.id] ?? 0
    const capacity = props.effectiveCapacities[edge.id] ?? edge.capacity
    const latlngs = line.map(toLatLng)
    const isClosed = capacity === 0
    const isAugmenting = props.activePath.includes(edge.id)
    const isMinCut = props.minCutEdges.includes(edge.id)
    const isGhost = props.residualMode && !forwardResidualIds.has(edge.id)
    const baseWeight = strokeForCapacity(capacity || edge.capacity, maxCap)

    // --- warna & gaya
    const isMarketNow = !!edge.isMarket && props.marketActive
    const isContext = props.halos.length > 0 && !inHalo.has(edge.id) && flow === 0 && visible === null
    let color = flow > 0 ? getFlowRatioColor(flow, capacity) : isContext ? '#b8c2d1' : NEUTRAL
    let weight = isContext ? Math.max(2.5, baseWeight * 0.7) : baseWeight
    let dash: string | undefined
    let opacity = isContext ? 0.7 : 0.95

    if (isClosed) {
      color = '#78716c'
      dash = '2, 8'
      weight = 3
      opacity = 0.9
    } else if (isGhost) {
      color = '#a8a29e'
      dash = '3, 6'
      opacity = 0.55
    } else if (isMinCut) {
      color = themeTokens.colors.edges.minCut
      weight = baseWeight + 2
      dash = '8, 6'
    } else if (isAugmenting) {
      color = themeTokens.colors.edges.augmentingPath
      weight = baseWeight + 3
    } else if (isSaturatedEdge(flow, capacity)) {
      color = themeTokens.colors.ratio.saturated
      weight = baseWeight + 1
    }
    if (props.selectedEdgeId === edge.id) weight += 3

    // --- halo warna rute (di bawah garis)
    const haloColor = inHalo.get(edge.id)
    if (haloColor) {
      haloLayer.addLayer(
        L.polyline(latlngs, { color: haloColor, weight: weight + 10, opacity: 0.4, lineCap: 'round', interactive: false })
      )
    }
    // --- selubung putih agar garis kontras di atas peta
    edgeLayer.addLayer(L.polyline(latlngs, { color: '#ffffff', weight: weight + 3, opacity: 0.85, lineCap: 'round', interactive: false }))

    const core = L.polyline(latlngs, { color, weight, opacity, dashArray: dash, lineCap: 'round' })
    core.bindTooltip(tooltipHtml(edge, from, to, flow, capacity, color), { className: 'custom-edge-tooltip', sticky: true })
    core.on('click', () => emit('select-edge', edge))
    edgeLayer.addLayer(core)

    // --- panah arah di 70% panjang ruas
    const arrow = pointAlong(line, 0.7)
    edgeLayer.addLayer(
      L.marker([arrow.lat, arrow.lng], { icon: arrowIcon(arrow.angleDeg, color), interactive: false, keyboard: false })
    )

    // --- label hanya untuk ruas yang relevan agar peta tidak penuh
    const relevant = !!haloColor || flow > 0 || isAugmenting || isMarketNow || isClosed || visible !== null
    if (!relevant) continue
    const mid = pointAlong(line, [0.35, 0.5, 0.65][edge.id % 3])
    let text: string
    if (isClosed) text = 'TUTUP · 0'
    else if (props.residualMode) text = isGhost ? 'sisa 0' : `sisa ${capacity - flow}`
    else text = flow > 0 ? `${flow} / ${capacity}` : `${capacity}`
    if (isMarketNow && !isClosed) text = `PASAR · ${text}`
    edgeLayer.addLayer(
      L.marker([mid.lat, mid.lng], {
        icon: badgeIcon(text, isMarketNow ? '#c2410c' : color, { muted: isGhost, outline: flow === 0 && !isMarketNow }),
        interactive: false
      })
    )
  }

  // edge balik residual (arus yang dapat dibatalkan)
  for (const res of residualList.filter((r) => r.isBackward)) {
    if (visible && !visible.has(res.originalEdgeId)) continue
    const orig = props.topology.edges.find((e) => e.id === res.originalEdgeId)
    const a = nodeMap.get(res.from)
    const b = nodeMap.get(res.to)
    if (!orig || !a || !b) continue
    const line = edgeLine(orig, nodeMap)
    if (!line) continue
    const reversed = [...line].reverse()
    const color = themeTokens.colors.edges.residualBack
    const pl = L.polyline(reversed.map(toLatLng), { color, weight: 3, opacity: 0.9, dashArray: '6, 5' })
    pl.bindTooltip(`<div style="padding:2px 4px"><b>Edge balik: ${esc(res.road)}</b><br/>Arus yang dapat dibatalkan: <b>${res.residualCapacity}</b> kend/jam</div>`, {
      className: 'custom-edge-tooltip',
      sticky: true
    })
    edgeLayer.addLayer(pl)
    const arrow = pointAlong(reversed, 0.55)
    edgeLayer.addLayer(L.marker([arrow.lat, arrow.lng], { icon: arrowIcon(arrow.angleDeg, color), interactive: false }))
    const lbl = pointAlong(reversed, 0.78)
    edgeLayer.addLayer(L.marker([lbl.lat, lbl.lng], { icon: badgeIcon(`↩ ${res.residualCapacity}`, color), interactive: false }))
  }
}

function renderNodes(nodeMap: Map<number, NodeDef>) {
  if (!nodeLayer || !props.topology) return
  const visible = props.visibleEdgeIds ? new Set(props.visibleEdgeIds) : null
  const touched = new Set<number>()
  if (visible) {
    for (const e of props.topology.edges) {
      if (visible.has(e.id)) {
        touched.add(e.from)
        touched.add(e.to)
      }
    }
  }

  for (const node of nodeMap.values()) {
    if (node.type === 'supersource' || node.type === 'supersink') continue
    const isTerminal = node.type === 'source' || node.type === 'sink'
    if (visible && !touched.has(node.id)) continue

    if (isTerminal) {
      const active = props.activeTerminals.length === 0 || props.activeTerminals.includes(node.id)
      const marker = L.marker(toLatLng(node.pos), { icon: terminalIcon(node, active), zIndexOffset: 1000 })
      marker.bindTooltip(`<b>${esc(node.code)}</b><br/>${esc(node.label)}`, { direction: 'top', offset: [0, -24] })
      marker.on('click', () => emit('select-node', node))
      nodeLayer.addLayer(marker)
      // titik pasti lokasi terminal
      nodeLayer.addLayer(
        L.circleMarker(toLatLng(node.pos), {
          radius: 5,
          fillColor: node.type === 'source' ? themeTokens.colors.nodes.source : themeTokens.colors.nodes.sink,
          color: '#fff',
          weight: 2,
          fillOpacity: 1,
          interactive: false
        })
      )
      continue
    }

    const isS = props.sourceSideNodes.includes(node.id)
    const isT = props.sinkSideNodes.includes(node.id)
    const circle = L.circleMarker(toLatLng(node.pos), {
      radius: isS || isT ? 7 : 5.5,
      fillColor: isT ? '#fde68a' : '#ffffff',
      color: isS ? themeTokens.colors.partition.source : isT ? themeTokens.colors.partition.sink : '#57534e',
      weight: isS || isT ? 3.5 : 2,
      fillOpacity: 1
    })
    const side = isS
      ? '<div style="color:#2563eb;font-weight:700;font-size:11px;margin-top:2px">Sisi S (masih terjangkau di residual graph)</div>'
      : isT
        ? '<div style="color:#a16207;font-weight:700;font-size:11px;margin-top:2px">Sisi T (tidak terjangkau dari S)</div>'
        : ''
    circle.bindTooltip(`<div style="padding:2px 4px"><b style="font-family:monospace">${esc(node.code)}</b><div style="font-size:12px;color:#57534e">${esc(node.label)}</div>${side}</div>`, {
      className: 'custom-node-tooltip',
      direction: 'top',
      offset: [0, -6]
    })
    circle.on('click', () => emit('select-node', node))
    nodeLayer.addLayer(circle)
  }
}

function renderGraph() {
  if (!mapInstance || !edgeLayer || !haloLayer || !nodeLayer || !props.topology) return
  haloLayer.clearLayers()
  edgeLayer.clearLayers()
  nodeLayer.clearLayers()
  const nodeMap = new Map<number, NodeDef>(props.topology.nodes.map((n) => [n.id, n]))
  renderEdges(nodeMap)
  renderNodes(nodeMap)
  fitToVisible(nodeMap)
}

watch(
  () => [
    props.topology,
    props.geometry,
    props.edgeFlows,
    props.effectiveCapacities,
    props.activePath,
    props.minCutEdges,
    props.sourceSideNodes,
    props.sinkSideNodes,
    props.selectedEdgeId,
    props.residualMode,
    props.visibleEdgeIds,
    props.halos,
    props.activeTerminals,
    props.marketActive
  ],
  renderGraph,
  { deep: true }
)

watch(
  () => props.showBaseMap,
  (show) => {
    if (!mapInstance || !tileLayer) return
    if (show) tileLayer.addTo(mapInstance)
    else mapInstance.removeLayer(tileLayer)
  }
)

onMounted(initMap)
onUnmounted(() => {
  resizeObserver?.disconnect()
  mapInstance?.remove()
  mapInstance = null
})
</script>

<template>
  <div class="relative w-full h-full min-h-[420px]" :class="showBaseMap ? '' : 'schematic-bg'">
    <div ref="mapContainer" class="w-full h-full z-0"></div>
    <slot />
  </div>
</template>
