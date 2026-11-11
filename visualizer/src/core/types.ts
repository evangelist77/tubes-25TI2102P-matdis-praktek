export type NodeType = 'supersource' | 'source' | 'junction' | 'sink' | 'supersink'

export interface NodeDef {
  id: number
  code: string
  label: string
  pos: [number, number] // [lon, lat]
  type?: NodeType
}

export interface EdgeDef {
  id: number
  from: number
  to: number
  capacity: number
  weight?: number
  code?: string
  road: string
  isMarket?: boolean
  isVirtual?: boolean
  closedInMorning?: boolean
}

export interface EventDef {
  step: number
  type: string
  target_edge: [number, number]
  new_capacity: number
  description: string
}

export interface Topology {
  case_id: string
  title: string
  description: string
  nodes: NodeDef[]
  edges: EdgeDef[]
  events: EventDef[]
}

export interface TraceStep {
  step: number
  path: number[] // urutan id edge pada augmenting path
  bottleneck: number // nilai penambahan arus di langkah ini
  totalFlow: number // total arus setelah langkah ini
  edgeFlows: Record<number, number> // arus tiap edge setelah langkah ini
  narrative?: string // action_narrative sesuai GLOSSARY.md
}

export interface TraceResult {
  maxFlow: number
  minCut: number[] // id edge pemotong (edge id)
  sourceSide: number[] // id node di sisi S pada residual graph
}

export interface TraceMeta {
  caseId: string
  source: number
  sink: number
  alpha: number // penyempitan ruas pasar (0 = tanpa pasar)
  pasarActive: boolean // true bila pasar tumpah aktif (alpha > 0)
}

export interface Trace {
  meta: TraceMeta
  effectiveCapacity: Record<number, number> // kapasitas efektif per edge id
  steps: TraceStep[]
  result: TraceResult
}

export interface ManifestEntry {
  source: number
  sink: number
  sourceCode: string
  sinkCode: string
  alpha: number
  filename: string
  label: string
  isDefault?: boolean
}

export interface Manifest {
  /** Penyempitan ruas pasar saat pasar penuh (hasil pengamatan; masih placeholder sampai data CCTV selesai). */
  observedAlpha: number
  runs: ManifestEntry[]
}

/** Rute S -> T (koridor) untuk dipilih di antarmuka. Warna unik per rute. */
export interface RouteDef {
  id: string
  name: string
  fromName: string
  toName: string
  corridor: string
  via: string
  source: string // kode simpul, mis. 'S1'
  sink: string // kode simpul, mis. 'T1'
  color: string
  distanceInfo: string
  edgeIds: number[] // urutan id edge sepanjang rute
}

export interface RoutesFile {
  routes: RouteDef[]
}

/** Bentuk jalan tiap edge: id edge -> daftar titik [lon, lat]. */
export type GeometryMap = Record<number, [number, number][]>

