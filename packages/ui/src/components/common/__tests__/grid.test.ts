import { describe, expect, it } from 'vitest'
import { normalizeGutter, resolveColLayout } from '../grid'

describe('resolveColLayout', () => {
  it('inherits span and offset independently from the nearest smaller breakpoint', () => {
    const layout = resolveColLayout(
      { span: 24, offset: 0 },
      { md: { span: 12 }, lg: { offset: 6 }, xl: 8 },
    )
    expect(layout.xs).toEqual({ span: 24, offset: 0 })
    expect(layout.sm).toEqual({ span: 24, offset: 0 })
    expect(layout.md).toEqual({ span: 12, offset: 0 })
    expect(layout.lg).toEqual({ span: 12, offset: 6 })
    expect(layout.xl).toEqual({ span: 8, offset: 6 })
    expect(layout.xxl).toEqual({ span: 8, offset: 6 })
  })

  it('lets xs override the base span and supports span 0', () => {
    const layout = resolveColLayout({ span: 24, offset: 0 }, { xs: 0, lg: 6 })
    expect(layout.xs.span).toBe(0)
    expect(layout.md.span).toBe(0)
    expect(layout.lg.span).toBe(6)
  })

  it('clamps out-of-range values to integers within the 24-column grid', () => {
    const layout = resolveColLayout({ span: 30, offset: 40 }, { md: 6.4, lg: { span: -2 } })
    expect(layout.xs).toEqual({ span: 24, offset: 23 })
    expect(layout.md.span).toBe(6)
    expect(layout.lg.span).toBe(0)
  })
})

describe('normalizeGutter', () => {
  it('treats a number as horizontal gutter and a tuple as [horizontal, vertical]', () => {
    expect(normalizeGutter(16)).toEqual([16, 0])
    expect(normalizeGutter([24, 16])).toEqual([24, 16])
  })
})
