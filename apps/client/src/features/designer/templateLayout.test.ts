import { describe, expect, it } from 'vitest'
import { layoutFromTemplate, matchTemplate } from './templateLayout'
import type { SetTemplate } from './types'

const slot = (categoryId: string, x: number) => ({ categoryId, x, y: 0.1, width: 0.2, height: 0.4 })
const template = (overrides: Partial<SetTemplate> = {}): SetTemplate => ({
  id: 't',
  name: 'T',
  backgroundId: 'bg',
  slots: [slot('shirt', 0.1), slot('shirt', 0.4), slot('bib', 0.7)],
  ...overrides,
})
const cats = (...ids: string[]) => ids.map((categoryId) => ({ categoryId }))

describe('matchTemplate', () => {
  it('matches the same categories and counts in any order, on its background only', () => {
    const t = template()
    expect(matchTemplate([t], 'bg', cats('bib', 'shirt', 'shirt'))).toBe(t)
    expect(matchTemplate([t], 'other', cats('bib', 'shirt', 'shirt'))).toBeNull()
    expect(matchTemplate([t], null, cats('bib', 'shirt', 'shirt'))).toBeNull()
  })

  it('does not match a different count or category', () => {
    const t = template()
    expect(matchTemplate([t], 'bg', cats('shirt', 'shirt'))).toBeNull()
    expect(matchTemplate([t], 'bg', cats('shirt', 'bib', 'bib'))).toBeNull()
    expect(matchTemplate([t], 'bg', cats('shirt', 'shirt', 'bib', 'bib'))).toBeNull()
    expect(matchTemplate([t], 'bg', [])).toBeNull()
  })
})

describe('layoutFromTemplate', () => {
  const size = { width: 1000, height: 500 }
  const item = (instanceId: string, categoryId: string, aspectRatio: number) => ({
    instanceId,
    categoryId,
    aspectRatio,
    displayScale: 1,
    priority: 0,
  })

  it('fills the slots of a category in selection order and fits items without distortion', () => {
    const layout = layoutFromTemplate(
      template(),
      [item('s1', 'shirt', 1), item('b', 'bib', 4), item('s2', 'shirt', 1)],
      size,
    )
    expect(layout.strategy).toBe('template')
    const byId = Object.fromEntries(layout.placements.map((p) => [p.instanceId, p]))
    // Slot 1 is 200×200 px: a square item fills it; the first shirt takes the first shirt slot.
    expect(byId.s1).toMatchObject({ x: 100, y: 50, width: 200, height: 200 })
    expect(byId.s2!.x).toBe(400)
    // Slot 3 is 200×200 px: a 4:1 item is limited by width and centred vertically.
    expect(byId.b).toMatchObject({ x: 700, width: 200, height: 50 })
    expect(byId.b!.y).toBe(50 + (200 - 50) / 2)
  })

  it('never leaves its slot', () => {
    const layout = layoutFromTemplate(template(), [item('a', 'shirt', 0.25)], size)
    expect(layout.placements.every((p) => p.width <= 200 && p.height <= 200)).toBe(true)
  })
})
