<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import L from 'leaflet'
import type { Topology, NodeDef, EdgeDef } from '../core/types'
import { getFlowRatioColor, getNodeColor, themeTokens } from '../theme/tokens'

const props = withDefaults(
  defineProps<{
    topology: Topology | null
    edgeFlows?: Record<number, number>
    effectiveCapacities?: Record<number, number>
    activePath?: number[]
    minCutEdges?: number[]
    sourceSideNodes?: number[]
    selectedEdgeId?: number | null
  }>(),
  {
    edgeFlows: () => ({}),
    effectiveCapacities: () => ({}),
    activePath: () => [],
    minCutEdges: () => [],
    sourceSideNodes: () => [],
    selectedEdgeId: null
  }
)

const emit = defineEmits<{
  (e: 'select-edge', edge: EdgeDef): void
  (e: 'select-node', node: NodeDef): void
}>()

const mapContainer = ref<HTMLDivElement | null>(null)
let mapInstance: L.Map | null = null
let edgeLayerGroup: L.LayerGroup | null = null
let nodeLayerGroup: L.LayerGroup | null = null

// Hitung titik tengah dan offset busur agar edge dua arah/berdampingan tidak tumpang tindih
function calculateMidpoint(
  pos1: [number, number],
  pos2: [number, number],
  offsetFactor = 0.00008
): [number, number] {
  const [lat1, lng1] = [pos1[1], pos1[0]]
  const [lat2, lng2] = [pos2[1], pos2[0]]

  const midLat = (lat1 + lat2) / 2
  const midLng = (lng1 + lng2) / 2

  const dLat = lat2 - lat1
  const dLng = lng2 - lng1
  const len = Math.hypot(dLat, dLng) || 1

  // Normal vector tegak lurus
  const normLat = -dLng / len
  const normLng = dLat / len

  return [midLat + normLat * offsetFactor, midLng + normLng * offsetFactor]
}

function initMap() {
  if (!mapContainer.value) return

  // Pusat kawasan Gasibu - Monju
  mapInstance = L.map(mapContainer.value, {
    center: [-6.8992, 107.6185],
    zoom: 15,
    zoomControl: true,
    attributionControl: false
  })

  // OpenStreetMap Tile Layer dengan Referrer Policy origin-when-cross-origin
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    referrerPolicy: 'origin-when-cross-origin'
  }).addTo(mapInstance)

  edgeLayerGroup = L.layerGroup().addTo(mapInstance)
  nodeLayerGroup = L.layerGroup().addTo(mapInstance)

  renderGraph()
}

function renderGraph() {
  if (!mapInstance || !edgeLayerGroup || !nodeLayerGroup || !props.topology) return

  edgeLayerGroup.clearLayers()
  nodeLayerGroup.clearLayers()

  const nodeMap = new Map<number, NodeDef>()
  for (const n of props.topology.nodes) {
    nodeMap.set(n.id, n)
  }

  // 1. Gambar Edges (Ruas Jalan)
  for (const edge of props.topology.edges) {
    const fromNode = nodeMap.get(edge.from)
    const toNode = nodeMap.get(edge.to)
    if (!fromNode || !toNode) continue

    const latlngFrom: [number, number] = [fromNode.pos[1], fromNode.pos[0]]
    const latlngTo: [number, number] = [toNode.pos[1], toNode.pos[0]]

    const flow = props.edgeFlows[edge.id] ?? 0
    const capacity = props.effectiveCapacities[edge.id] ?? edge.capacity

    const isAugmenting = props.activePath.includes(edge.id)
    const isMinCut = props.minCutEdges.includes(edge.id)
    const isSaturated = capacity > 0 && flow >= capacity
    const isSelected = props.selectedEdgeId === edge.id

    // Penentuan Gaya Visual
    let strokeColor = getFlowRatioColor(flow, capacity)
    let weight: number = themeTokens.strokeWeights.default
    let dashArray: string | undefined = undefined

    if (edge.isVirtual) {
      strokeColor = '#a8a29e'
      dashArray = '4, 6'
      weight = 2
    } else if (isMinCut) {
      strokeColor = themeTokens.colors.edges.minCut
      weight = themeTokens.strokeWeights.minCut
      dashArray = '6, 6'
    } else if (isAugmenting) {
      strokeColor = themeTokens.colors.edges.augmentingPath
      weight = themeTokens.strokeWeights.augmenting
    } else if (isSaturated) {
      strokeColor = themeTokens.colors.ratio.saturated
      weight = themeTokens.strokeWeights.saturated
    } else if (edge.isMarket) {
      strokeColor = themeTokens.colors.edges.marketSpecial
      weight = 4
    }

    if (isSelected) {
      weight += 3
    }

    const polyline = L.polyline([latlngFrom, latlngTo], {
      color: strokeColor,
      weight,
      opacity: edge.isVirtual ? 0.6 : 0.9,
      dashArray
    })

    // Tooltip detail ruas
    const ratioPercent = capacity > 0 ? Math.round((flow / capacity) * 100) : 0
    const marketBadge = edge.isMarket ? '<span class="text-orange-600 font-bold">[PASAR TUMPAH] </span>' : ''
    const closedBadge = edge.closedInMorning && capacity === 0 ? '<span class="text-red-600 font-bold">[DITUTUP] </span>' : ''

    polyline.bindTooltip(
      `
      <div class="p-1">
        <div class="font-bold text-xs">${marketBadge}${closedBadge}${edge.road}</div>
        <div class="text-[11px] text-stone-600 font-mono mt-0.5">
          ${fromNode.code} → ${toNode.code}
        </div>
        <div class="mt-1 text-xs">
          Arus: <span class="font-semibold">${flow}</span> / <span class="font-semibold">${capacity}</span> kend/jam
          <span class="ml-1 text-[10px] px-1.5 py-0.5 rounded font-bold" style="background-color: ${strokeColor}; color: #ffffff;">
            ${ratioPercent}%
          </span>
        </div>
      </div>
      `,
      { className: 'custom-edge-tooltip', sticky: true }
    )

    polyline.on('click', () => {
      emit('select-edge', edge)
    })

    edgeLayerGroup.addLayer(polyline)

    // Indikator Panah Aliran di tengah edge
    if (!edge.isVirtual) {
      const midPoint = calculateMidpoint(fromNode.pos, toNode.pos)
      const arrowIcon = L.divIcon({
        className: 'edge-flow-badge',
        html: `
          <div style="background-color: ${strokeColor}; color: white; border-radius: 9999px; padding: 1px 5px; font-size: 9px; font-weight: 700; white-space: nowrap; box-shadow: 0 1px 3px rgba(0,0,0,0.3); border: 1px solid white;">
            ${flow > 0 ? `${flow}/${capacity}` : `${capacity}`}
          </div>
        `,
        iconSize: [40, 16],
        iconAnchor: [20, 8]
      })
      const marker = L.marker(midPoint, { icon: arrowIcon, interactive: false })
      edgeLayerGroup.addLayer(marker)
    }
  }

  // 2. Gambar Nodes (Simpul Persimpangan & Terminal)
  for (const node of props.topology.nodes) {
    const latlng: [number, number] = [node.pos[1], node.pos[0]]
    const isSourceSide = props.sourceSideNodes.includes(node.id)

    let fillColor = getNodeColor(node.type)
    let radius = 7

    if (node.type === 'supersource' || node.type === 'supersink') {
      radius = 9
    } else if (node.type === 'source' || node.type === 'sink') {
      radius = 8
    }

    const circle = L.circleMarker(latlng, {
      radius,
      fillColor,
      color: isSourceSide ? '#2563eb' : '#ffffff',
      weight: isSourceSide ? 3 : 2,
      opacity: 1,
      fillOpacity: 0.95
    })

    circle.bindTooltip(
      `
      <div class="p-1">
        <div class="font-bold text-xs font-mono">${node.code}</div>
        <div class="text-[11px] text-stone-600">${node.label}</div>
        ${isSourceSide ? '<div class="text-[10px] text-blue-600 font-semibold mt-0.5">Sisi Sumber (S-Cut)</div>' : ''}
      </div>
      `,
      { className: 'custom-node-tooltip', direction: 'top', offset: [0, -6] }
    )

    circle.on('click', () => {
      emit('select-node', node)
    })

    nodeLayerGroup.addLayer(circle)
  }
}

watch(
  () => [
    props.topology,
    props.edgeFlows,
    props.effectiveCapacities,
    props.activePath,
    props.minCutEdges,
    props.sourceSideNodes,
    props.selectedEdgeId
  ],
  () => {
    renderGraph()
  },
  { deep: true }
)

onMounted(() => {
  initMap()
})

onUnmounted(() => {
  if (mapInstance) {
    mapInstance.remove()
    mapInstance = null
  }
})
</script>

<template>
  <div class="relative w-full h-full min-h-[450px]">
    <div ref="mapContainer" class="w-full h-full z-0"></div>

    <!-- Map Floating Controls & Legend Overlay -->
    <div class="absolute bottom-4 right-4 z-[400] bg-white/95 backdrop-blur-sm border border-stone-200 rounded-lg p-2.5 shadow-lg text-xs space-y-2 pointer-events-auto max-w-[220px]">
      <div class="font-bold text-stone-800 text-[11px] uppercase tracking-wider pb-1 border-b border-stone-200">
        Legenda Graf Aliran
      </div>
      
      <!-- Simpul -->
      <div class="space-y-1">
        <div class="text-[10px] font-semibold text-stone-500 uppercase">Simpul:</div>
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full inline-block" :style="{ backgroundColor: themeTokens.colors.nodes.source }"></span>
          <span>Source (S1, S2)</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full inline-block" :style="{ backgroundColor: themeTokens.colors.nodes.sink }"></span>
          <span>Sink (T1, T2)</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full inline-block" :style="{ backgroundColor: themeTokens.colors.nodes.junction }"></span>
          <span>Simpang Jalan</span>
        </div>
      </div>

      <!-- Ruas -->
      <div class="space-y-1 pt-1 border-t border-stone-100">
        <div class="text-[10px] font-semibold text-stone-500 uppercase">Status Ruas:</div>
        <div class="flex items-center gap-2">
          <span class="w-4 h-1 rounded inline-block" :style="{ backgroundColor: themeTokens.colors.ratio.low }"></span>
          <span>Lancar (Arus 0 - 30%)</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-4 h-1 rounded inline-block" :style="{ backgroundColor: themeTokens.colors.ratio.high }"></span>
          <span>Padat (60% - 85%)</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-4 h-1.5 rounded inline-block" :style="{ backgroundColor: themeTokens.colors.ratio.saturated }"></span>
          <span>Jenuh (100% Kapasitas)</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-4 h-1.5 rounded inline-block" :style="{ backgroundColor: themeTokens.colors.edges.marketSpecial }"></span>
          <span class="font-semibold text-orange-700">Pasar Tumpah (Japati)</span>
        </div>
      </div>
    </div>
  </div>
</template>
