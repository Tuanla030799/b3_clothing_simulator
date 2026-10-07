import { describe, expect, it } from 'vitest'
import { layoutSet, type LayoutItem, type Placement, type SetLayout } from './setLayout'

const options = { paddingRatio: 0.04, gapRatio: 0.025, maxItemFill: 0.75 }

const item = (id: string, aspectRatio: number, displayScale = 1, priority = 0): LayoutItem => ({
  instanceId: id,
  aspectRatio,
  displayScale,
  priority,
})

function assertValid(layout: SetLayout, items: LayoutItem[]) {
  const { width, height } = layout.size
  const minSide = Math.min(width, height)
  const padding = options.paddingRatio * minSide
  const gap = options.gapRatio * minSide
  const eps = 1e-6

  // Every instance exactly once.
  expect(layout.placements.map((p) => p.instanceId).sort()).toEqual(
    items.map((i) => i.instanceId).sort(),
  )
  for (const p of layout.placements) {
    for (const v of [p.x, p.y, p.width, p.height]) expect(Number.isFinite(v)).toBe(true)
    expect(p.width).toBeGreaterThan(0)
    expect(p.height).toBeGreaterThan(0)
    // Inside the padded composition.
    expect(p.x).toBeGreaterThanOrEqual(padding - eps)
    expect(p.y).toBeGreaterThanOrEqual(padding - eps)
    expect(p.x + p.width).toBeLessThanOrEqual(width - padding + eps)
    expect(p.y + p.height).toBeLessThanOrEqual(height - padding + eps)
    // Aspect ratio preserved.
    const source = items.find((i) => i.instanceId === p.instanceId)!
    expect(p.width / p.height).toBeCloseTo(source.aspectRatio, 6)
  }
  // No overlapping boxes, and at least the configured gap between neighbours.
  const ps = layout.placements
  for (let i = 0; i < ps.length; i++) {
    for (let j = i + 1; j < ps.length; j++) {
      expect(separation(ps[i]!, ps[j]!)).toBeGreaterThanOrEqual(gap - eps)
    }
  }
}

/** Largest axis gap between two boxes (negative when they overlap on both axes). */
function separation(a: Placement, b: Placement) {
  const dx = Math.max(b.x - (a.x + a.width), a.x - (b.x + b.width))
  const dy = Math.max(b.y - (a.y + a.height), a.y - (b.y + b.height))
  return Math.max(dx, dy)
}

const catalogLike = [
  item('shirt', 4 / 3, 1, 2),
  item('shirt-long', 4 / 3, 1.1, 2),
  item('towel', 4 / 3, 1, 1),
  item('hat', 4 / 3, 0.5),
  item('bib', 4 / 3, 0.6),
  item('mittens', 4 / 3, 0.4),
]

describe('layoutSet', () => {
  const compositions = {
    landscape: { width: 1200, height: 655 },
    portrait: { width: 1200, height: 1800 },
    square: { width: 1200, height: 1200 },
  }

  it.each(Object.entries(compositions))(
    'places 1–10 mixed items validly on a %s composition',
    (_, size) => {
      for (let n = 1; n <= 10; n++) {
        const items = Array.from({ length: n }, (_, i) => {
          const base = catalogLike[i % catalogLike.length]!
          return { ...base, instanceId: `item-${i + 1}` }
        })
        assertValid(layoutSet(items, size, options), items)
      }
    },
  )

  it('handles tall, wide and square product images and repeated products', () => {
    const items = [
      item('a', 0.4, 1, 2),
      item('b', 0.4, 1, 2), // same product shape twice, separate placements
      item('c', 3),
      item('d', 1, 0.5),
      item('e', 2.5, 0.7),
    ]
    for (const size of Object.values(compositions))
      assertValid(layoutSet(items, size, options), items)
  })

  it('keeps relative sizes from displayScale and priority items first', () => {
    const layout = layoutSet(
      [item('hat', 4 / 3, 0.5), item('shirt', 4 / 3, 1, 2)],
      compositions.landscape,
      options,
    )
    const byId = Object.fromEntries(layout.placements.map((p) => [p.instanceId, p]))
    expect(byId.shirt!.width / byId.hat!.width).toBeCloseTo(2, 6)
  })

  it('is deterministic and independent of anything but its input', () => {
    const items = catalogLike.slice(0, 5)
    const a = layoutSet(items, compositions.landscape, options)
    const b = layoutSet(
      items.map((i) => ({ ...i })),
      compositions.landscape,
      options,
    )
    expect(b).toEqual(a)
  })

  it('caps a single item so it does not fill the whole background', () => {
    const layout = layoutSet([item('only', 4 / 3)], compositions.landscape, options)
    const usable = 655 - 2 * 0.04 * 655
    expect(layout.placements[0]!.height).toBeCloseTo(usable * 0.75, 6)
  })

  it('still places every item when the inputs are degenerate', () => {
    const items = [item('nan', Number.NaN, Number.NaN), item('zero', 0, 0), item('neg', -2, -1)]
    const layout = layoutSet(items, compositions.square, options)
    expect(layout.placements).toHaveLength(3)
    for (const p of layout.placements) {
      expect(p.width).toBeGreaterThan(0)
      expect(Number.isFinite(p.x + p.y + p.width + p.height)).toBe(true)
    }
  })

  it('uses the grid fallback when no row candidate fits, still placing every item', () => {
    // A gap this large leaves no valid row split for 10 items.
    const items = Array.from({ length: 10 }, (_, i) => item(`i${i}`, 4 / 3))
    const layout = layoutSet(items, compositions.square, { ...options, gapRatio: 0.5 })
    expect(layout.strategy).toBe('grid')
    expect(layout.placements).toHaveLength(10)
    const ps = layout.placements
    for (const p of ps) {
      expect(p.x).toBeGreaterThanOrEqual(0)
      expect(p.y).toBeGreaterThanOrEqual(0)
      expect(p.x + p.width).toBeLessThanOrEqual(1200 + 1e-6)
      expect(p.y + p.height).toBeLessThanOrEqual(1200 + 1e-6)
      expect(p.width / p.height).toBeCloseTo(4 / 3, 6)
    }
    for (let i = 0; i < ps.length; i++)
      for (let j = i + 1; j < ps.length; j++)
        expect(separation(ps[i]!, ps[j]!)).toBeGreaterThanOrEqual(0)
  })

  it('keeps every item inside a tiny composition', () => {
    const items = catalogLike.slice(0, 4)
    const layout = layoutSet(items, { width: 10, height: 10 }, options)
    expect(layout.placements).toHaveLength(4)
    expect(layout.placements.every((p) => p.x >= 0 && p.x + p.width <= 10 + 1e-9)).toBe(true)
  })

  it('returns an empty layout for an empty set', () => {
    expect(layoutSet([], compositions.square, options).placements).toEqual([])
  })
})
