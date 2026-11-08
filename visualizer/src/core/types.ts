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
  alpha: number
  scenario: 'A' | 'B' | 'C'
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
  scenario: 'A' | 'B' | 'C'
  filename: string
  label: string
}

export interface Manifest {
  runs: ManifestEntry[]
}
