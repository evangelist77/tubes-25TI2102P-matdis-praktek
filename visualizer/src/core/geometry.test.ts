import { describe, expect, it } from 'vitest'
import { boundsOf, pointAlong, polylineLength, strokeForCapacity, type LonLat } from './geometry'

const eastWest: LonLat[] = [
  [107.6, -6.9],
  [107.602, -6.9]
]

describe('geometry', () => {
  it('polylineLength menghitung meter (±222 m untuk 0.002° bujur)', () => {
    expect(polylineLength(eastWest)).toBeGreaterThan(215)
    expect(polylineLength(eastWest)).toBeLessThan(230)
  })

  it('pointAlong di t=0.5 berada di tengah dan menghadap timur (0°)', () => {
    const p = pointAlong(eastWest, 0.5)
    expect(p.lng).toBeCloseTo(107.601, 6)
    expect(p.lat).toBeCloseTo(-6.9, 6)
    expect(Math.abs(p.angleDeg)).toBeLessThan(0.001)
  })

  it('pointAlong mengikuti belokan: separuh panjang L-shape jatuh di sudutnya', () => {
    const l: LonLat[] = [
      [107.6, -6.9],
      [107.6, -6.898], // utara
      [107.602, -6.898] // timur
    ]
    const turn = pointAlong(l, polylineLength([l[0], l[1]]) / polylineLength(l))
    expect(turn.lat).toBeCloseTo(-6.898, 5)
    expect(turn.lng).toBeCloseTo(107.6, 5)
  })

  it('pointAlong ke utara memberi sudut -90° dan batas t dijepit 0..1', () => {
    const north: LonLat[] = [
      [107.6, -6.9],
      [107.6, -6.89]
    ]
    expect(pointAlong(north, 0.5).angleDeg).toBeCloseTo(-90, 3)
    expect(pointAlong(north, 5).lat).toBeCloseTo(-6.89, 6)
    expect(pointAlong([], 0.5)).toEqual({ lat: 0, lng: 0, angleDeg: 0 })
  })

  it('boundsOf mengembalikan kotak batas atau null', () => {
    expect(boundsOf([])).toBeNull()
    expect(boundsOf(eastWest)).toEqual([
      [-6.9, 107.6],
      [-6.9, 107.602]
    ])
  })

  it('strokeForCapacity naik menurut kapasitas dan terjepit di batas', () => {
    expect(strokeForCapacity(0, 1800)).toBe(3)
    expect(strokeForCapacity(1800, 1800)).toBe(8)
    expect(strokeForCapacity(450, 1800)).toBeGreaterThan(3)
    expect(strokeForCapacity(450, 1800)).toBeLessThan(8)
  })
})
