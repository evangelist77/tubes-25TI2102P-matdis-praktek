import { describe, expect, it } from 'vitest'
import { getFlowRatioColor, getNodeColor, themeTokens } from './tokens'

describe('Theme Tokens & Color Scale', () => {
  it('correctly maps node types to theme colors', () => {
    expect(getNodeColor('supersource')).toBe(themeTokens.colors.nodes.supersource)
    expect(getNodeColor('source')).toBe(themeTokens.colors.nodes.source)
    expect(getNodeColor('sink')).toBe(themeTokens.colors.nodes.sink)
    expect(getNodeColor('supersink')).toBe(themeTokens.colors.nodes.supersink)
    expect(getNodeColor('junction')).toBe(themeTokens.colors.nodes.junction)
  })

  it('correctly returns flow ratio colors', () => {
    // 0 flow -> low
    expect(getFlowRatioColor(0, 500)).toBe(themeTokens.colors.ratio.low)
    // 50% flow -> moderate
    expect(getFlowRatioColor(250, 500)).toBe(themeTokens.colors.ratio.moderate)
    // 80% flow -> high
    expect(getFlowRatioColor(400, 500)).toBe(themeTokens.colors.ratio.high)
    // 90% flow -> critical
    expect(getFlowRatioColor(450, 500)).toBe(themeTokens.colors.ratio.critical)
    // 100% flow -> saturated
    expect(getFlowRatioColor(500, 500)).toBe(themeTokens.colors.ratio.saturated)
    // Closed road (capacity 0)
    expect(getFlowRatioColor(0, 0)).toBe(themeTokens.colors.edges.closed)
  })
})
