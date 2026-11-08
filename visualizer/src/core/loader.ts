import type { Manifest, Topology, Trace } from './types'

export async function loadTopology(url = '/data/topology.json'): Promise<Topology> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Gagal memuat topologi graf dari ${url} (HTTP ${response.status})`)
  }
  return (await response.json()) as Topology
}

export async function loadManifest(url = '/data/manifest.json'): Promise<Manifest> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Gagal memuat manifest dari ${url} (HTTP ${response.status})`)
  }
  return (await response.json()) as Manifest
}

export async function loadTrace(filename: string): Promise<Trace> {
  const url = filename.startsWith('/') ? filename : `/data/${filename}`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Gagal memuat trace dari ${url} (HTTP ${response.status})`)
  }
  return (await response.json()) as Trace
}
