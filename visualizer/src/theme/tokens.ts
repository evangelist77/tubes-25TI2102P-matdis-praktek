/**
 * Design Tokens: Tema Pasar Tumpah & Visualisasi Graf Aliran
 * Dibuat modular dan dapat dipakai bersama oleh seluruh anggota tim.
 */
export const themeTokens = {
  colors: {
    // Brand & Identitas Kasus
    terracotta: '#c2410c', // Oranye bata pasar tumpah
    kunyit: '#d97706',     // Kuning kunyit / rempah
    hijauDaun: '#15803d',  // Hijau daun
    krem: '#fef3c7',       // Krem dasar hangat
    warmGray: '#78716c',

    // Node Types
    nodes: {
      supersource: '#ea580c',
      source: '#0284c7',
      junction: '#475569',
      sink: '#059669',
      supersink: '#16a34a'
    },

    // Gradasi Rasio Flow / Kapasitas (f / c)
    ratio: {
      low: '#10b981',       // 0% - 30% (Lancar)
      moderate: '#84cc16',  // 31% - 60% (Sedang)
      high: '#eab308',      // 61% - 85% (Padat)
      critical: '#f97316',  // 86% - 99% (Sangat Padat)
      saturated: '#ef4444'  // 100% (Jenuh / Bottleneck)
    },

    // Status Ruas Khusus
    edges: {
      defaultNormal: '#64748b',
      marketSpecial: '#ea580c',
      closed: '#94a3b8',
      augmentingPath: '#2563eb',
      minCut: '#dc2626',
      residualBack: '#8b5cf6'
    },

    // Background & Surface
    surface: {
      bgApp: '#fffdfa',
      bgCard: '#ffffff',
      bgPanel: '#fbfaf8',
      borderSubtle: '#e7e5e4',
      borderFocus: '#d97706',
      textPrimary: '#1c1917',
      textSecondary: '#57534e',
      textMuted: '#a8a29e'
    }
  },

  // Ketebalan busur graf berdasarkan rasio kepenuhan
  strokeWeights: {
    default: 3,
    augmenting: 6,
    saturated: 5,
    minCut: 4
  }
} as const

export function getFlowRatioColor(flow: number, capacity: number): string {
  if (capacity <= 0) return themeTokens.colors.edges.closed
  const ratio = flow / capacity
  if (ratio >= 1.0) return themeTokens.colors.ratio.saturated
  if (ratio >= 0.85) return themeTokens.colors.ratio.critical
  if (ratio >= 0.6) return themeTokens.colors.ratio.high
  if (ratio >= 0.3) return themeTokens.colors.ratio.moderate
  return themeTokens.colors.ratio.low
}

export function getNodeColor(type?: string): string {
  switch (type) {
    case 'supersource':
      return themeTokens.colors.nodes.supersource
    case 'source':
      return themeTokens.colors.nodes.source
    case 'sink':
      return themeTokens.colors.nodes.sink
    case 'supersink':
      return themeTokens.colors.nodes.supersink
    default:
      return themeTokens.colors.nodes.junction
  }
}
