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

describe('templates of parent categories', () => {
  // apparel > shirt > tee, apparel > bib.
  const tree = [
    { id: 'apparel', parentId: null },
    { id: 'shirt', parentId: 'apparel' },
    { id: 'tee', parentId: 'shirt' },
    { id: 'bib', parentId: 'apparel' },
  ]

  it('lets a slot take any item of its branch', () => {
    const t = template({ slots: [slot('apparel', 0.1), slot('apparel', 0.4), slot('bib', 0.7)] })
    expect(matchTemplate([t], 'bg', cats('tee', 'bib', 'shirt'), tree)).toBe(t)
    expect(matchTemplate([t], 'bg', cats('tee', 'tee', 'tee'), tree)).toBeNull()
    // Without the tree a parent slot only takes items of exactly that category.
    expect(matchTemplate([t], 'bg', cats('tee', 'bib', 'shirt'))).toBeNull()
  })

  it("fills the deepest slots first so a broad slot does not take a narrow slot's item", () => {
    const t = template({ slots: [slot('apparel', 0.1), slot('bib', 0.4)] })
    // In selection order the bib comes first; the bib slot still gets it.
    const items = [
      { instanceId: 'b', categoryId: 'bib', aspectRatio: 1, displayScale: 1, priority: 0 },
      { instanceId: 't', categoryId: 'tee', aspectRatio: 1, displayScale: 1, priority: 0 },
    ]
    expect(matchTemplate([t], 'bg', items, tree)).toBe(t)
    const layout = layoutFromTemplate(t, items, { width: 1000, height: 500 }, tree)
    expect(layout.placements.map((p) => [p.instanceId, Math.round(p.x)])).toEqual([
      ['t', 100],
      ['b', 400],
    ])
  })

  it('prefers the most specific matching template, then the template order', () => {
    const broad = template({ id: 'broad', slots: [slot('apparel', 0.1), slot('apparel', 0.5)] })
    const narrow = template({ id: 'narrow', slots: [slot('shirt', 0.1), slot('bib', 0.5)] })
    const twin = template({ id: 'twin', slots: [slot('bib', 0.1), slot('shirt', 0.5)] })
    expect(matchTemplate([broad, narrow, twin], 'bg', cats('tee', 'bib'), tree)?.id).toBe('narrow')
    expect(matchTemplate([broad, twin, narrow], 'bg', cats('tee', 'bib'), tree)?.id).toBe('twin')
    expect(matchTemplate([broad, narrow], 'bg', cats('bib', 'bib'), tree)?.id).toBe('broad')
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
