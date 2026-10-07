import { describe, expect, it } from 'vitest'
import {
  backgrounds,
  categories,
  DEFAULT_BACKGROUND_ID,
  designPresets,
  products,
  selectionRules,
} from './catalog'

// Invariants every catalog revision must keep (local data now, backend data later).
describe('designer catalog invariants', () => {
  const categoryIds = new Set(categories.map((category) => category.id))

  it('uses unique ids', () => {
    for (const list of [categories, products, backgrounds, designPresets]) {
      const ids = list.map((entry) => entry.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  it('references existing categories by id', () => {
    for (const product of products) expect(categoryIds).toContain(product.categoryId)
    for (const id of Object.keys(selectionRules.categoryLimits)) expect(categoryIds).toContain(id)
  })

  it('keeps every embroidery zone inside its normalized source image', () => {
    for (const product of products) {
      const zoneIds = product.embroideryZones.map((zone) => zone.id)
      expect(new Set(zoneIds).size, product.id).toBe(zoneIds.length)

      for (const zone of product.embroideryZones) {
        const label = `${product.id}/${zone.id}`
        expect(zone.x, label).toBeGreaterThanOrEqual(0)
        expect(zone.y, label).toBeGreaterThanOrEqual(0)
        expect(zone.width, label).toBeGreaterThan(0)
        expect(zone.height, label).toBeGreaterThan(0)
        expect(zone.x + zone.width, label).toBeLessThanOrEqual(1)
        expect(zone.y + zone.height, label).toBeLessThanOrEqual(1)
        expect(zone.allowedContent.length, label).toBeGreaterThan(0)
      }
    }
  })

  it('has positive limits that do not exceed the total limit', () => {
    expect(selectionRules.maxItems).toBeGreaterThan(0)
    for (const limit of Object.values(selectionRules.categoryLimits)) {
      expect(limit).toBeGreaterThan(0)
      expect(limit).toBeLessThanOrEqual(selectionRules.maxItems)
    }
  })

  it('has a default background', () => {
    expect(backgrounds.map((background) => background.id)).toContain(DEFAULT_BACKGROUND_ID)
  })
})
