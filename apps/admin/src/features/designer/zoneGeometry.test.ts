import { describe, expect, it } from 'vitest'
import { moveZone, newZone, resizeZone, zoneErrors, type ZoneDraft } from './zoneGeometry'

const zone = (overrides: Partial<ZoneDraft> = {}): ZoneDraft => ({
  key: 'nguc-ao',
  name: 'Ngực áo',
  x: 0.4,
  y: 0.2,
  width: 0.2,
  height: 0.1,
  allowText: true,
  allowImage: false,
  sortOrder: 0,
  ...overrides,
})

describe('zoneErrors', () => {
  it('accepts a zone that touches the far edges within the tolerance', () => {
    expect(zoneErrors(zone({ x: 0.8, width: 0.2 + 5e-7, y: 0.9, height: 0.1 }))).toEqual({})
  })

  it('rejects zones outside the image, empty sizes, bad keys, duplicates and no content', () => {
    expect(Object.keys(zoneErrors(zone({ x: 0.9, width: 0.2 })))).toEqual(['width'])
    expect(Object.keys(zoneErrors(zone({ y: -0.1 })))).toEqual(['y'])
    expect(Object.keys(zoneErrors(zone({ height: 0 })))).toEqual(['height'])
    expect(zoneErrors(zone({ key: 'Ngực' })).key).toBeDefined()
    expect(zoneErrors(zone(), ['nguc-ao']).key).toBeDefined()
    expect(zoneErrors(zone({ allowText: false })).allowed).toBeDefined()
    expect(zoneErrors(zone({ x: Number.NaN })).x).toBeDefined()
  })
})

describe('moveZone / resizeZone', () => {
  it('keeps a moved zone inside the image with its size', () => {
    expect(moveZone(zone(), 0.5, -0.5)).toMatchObject({ x: 0.8, y: 0, width: 0.2, height: 0.1 })
  })

  it('resizes from the corner without leaving the image or going below the minimum', () => {
    expect(resizeZone(zone(), 1, 1)).toMatchObject({ x: 0.4, y: 0.2, width: 0.6, height: 0.8 })
    expect(resizeZone(zone(), -1, -1)).toMatchObject({ width: 0.02, height: 0.02 })
  })
})

it('newZone picks an unused key', () => {
  expect(newZone(['vung-1', 'vung-2'], 2).key).toBe('vung-3')
  expect(newZone(['vung-2'], 1).key).toBe('vung-3')
  expect(zoneErrors(newZone([], 0))).toEqual({})
})
