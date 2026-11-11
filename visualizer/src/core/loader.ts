import type { GeometryMap, Manifest, RoutesFile, Topology, Trace } from './types'

/** URL berkas data publik; mengikuti `base` Vite agar tetap benar bila nanti dihosting di sub-path. */
export function dataUrl(name: string): string {
  const base = import.meta.env.BASE_URL ?? '/'
  const prefix = base.endsWith('/') ? base : `${base}/`
  return `${prefix}data/${name}`
}

async function fetchJson<T>(url: string, what: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Gagal memuat ${what} dari ${url} (HTTP ${response.status})`)
  }
  return (await response.json()) as T
}

export function loadTopology(url = dataUrl('topology.json')): Promise<Topology> {
  return fetchJson<Topology>(url, 'topologi graf')
}

export function loadManifest(url = dataUrl('manifest.json')): Promise<Manifest> {
  return fetchJson<Manifest>(url, 'manifest')
}

export function loadRoutes(url = dataUrl('routes.json')): Promise<RoutesFile> {
  return fetchJson<RoutesFile>(url, 'daftar rute')
}

export function loadGeometry(url = dataUrl('geometry.json')): Promise<GeometryMap> {
  return fetchJson<GeometryMap>(url, 'geometri jalan')
}

const traceCache = new Map<string, Promise<Trace>>()

/** Memuat satu trace; hasilnya di-cache supaya panel perbandingan tidak mengunduh ulang. */
export function loadTrace(filename: string): Promise<Trace> {
  const url = filename.startsWith('/') ? filename : dataUrl(filename)
  let cached = traceCache.get(url)
  if (!cached) {
    cached = fetchJson<Trace>(url, 'trace').catch((err) => {
      traceCache.delete(url) // jangan menyimpan kegagalan
      throw err
    })
    traceCache.set(url, cached)
  }
  return cached
}
