import type { Topology } from './types'

export async function loadTopology(url = '/data/topology.json'): Promise<Topology> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Gagal memuat topologi graf dari ${url} (HTTP ${response.status})`)
  }
  const data = (await response.json()) as Topology
  return data
}

