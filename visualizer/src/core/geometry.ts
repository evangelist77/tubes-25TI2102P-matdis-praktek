/**
 * Helper geometri murni untuk menggambar ruas jalan di peta.
 * Koordinat masukan berformat [lon, lat] (sama dengan topology.json / geometry.json).
 */
export type LonLat = [number, number]

export interface PointOnLine {
  lat: number
  lng: number
  /** sudut putar CSS (derajat, searah jarum jam) untuk ikon yang awalnya menghadap timur */
  angleDeg: number
}

const R = 111320 // meter per derajat lintang

function segmentLength(a: LonLat, b: LonLat): number {
  const lat0 = (a[1] * Math.PI) / 180
  return Math.hypot((b[0] - a[0]) * R * Math.cos(lat0), (b[1] - a[1]) * R)
}

/** Panjang polyline dalam meter. */
export function polylineLength(line: LonLat[]): number {
  let total = 0
  for (let i = 0; i < line.length - 1; i++) total += segmentLength(line[i], line[i + 1])
  return total
}

/** Titik pada fraksi `t` (0..1) sepanjang polyline beserta arah garis di titik itu. */
export function pointAlong(line: LonLat[], t: number): PointOnLine {
  if (line.length === 0) return { lat: 0, lng: 0, angleDeg: 0 }
  if (line.length === 1) return { lat: line[0][1], lng: line[0][0], angleDeg: 0 }

  const total = polylineLength(line) || 1
  const target = Math.min(1, Math.max(0, t)) * total
  let acc = 0
  for (let i = 0; i < line.length - 1; i++) {
    const a = line[i]
    const b = line[i + 1]
    const len = segmentLength(a, b)
    if (acc + len >= target || i === line.length - 2) {
      const f = len === 0 ? 0 : Math.min(1, Math.max(0, (target - acc) / len))
      const lat0 = (a[1] * Math.PI) / 180
      const angleDeg = -(Math.atan2(b[1] - a[1], (b[0] - a[0]) * Math.cos(lat0)) * 180) / Math.PI
      return { lat: a[1] + (b[1] - a[1]) * f, lng: a[0] + (b[0] - a[0]) * f, angleDeg }
    }
    acc += len
  }
  const last = line[line.length - 1]
  return { lat: last[1], lng: last[0], angleDeg: 0 }
}

/** Kotak batas [[latMin, lngMin], [latMax, lngMax]] dari banyak titik, atau null bila kosong. */
export function boundsOf(points: LonLat[]): [[number, number], [number, number]] | null {
  if (points.length === 0) return null
  let latMin = Infinity
  let latMax = -Infinity
  let lngMin = Infinity
  let lngMax = -Infinity
  for (const [lng, lat] of points) {
    latMin = Math.min(latMin, lat)
    latMax = Math.max(latMax, lat)
    lngMin = Math.min(lngMin, lng)
    lngMax = Math.max(lngMax, lng)
  }
  return [
    [latMin, lngMin],
    [latMax, lngMax]
  ]
}

/** Ketebalan garis (px) yang naik halus menurut kapasitas, agar ruas besar tampak lebih tebal. */
export function strokeForCapacity(capacity: number, maxCapacity: number, min = 3, max = 8): number {
  if (maxCapacity <= 0 || capacity <= 0) return min
  return min + (max - min) * Math.sqrt(Math.min(1, capacity / maxCapacity))
}
