import { describe, expect, it } from 'vitest'
import {
  boundsOfAlpha,
  fitInSlot,
  fullImageRect,
  resizeKeepingAspect,
  snapSlot,
  visibleAspect,
} from './layoutPreview'

const bg = { width: 1000, height: 500 }

describe('layout preview geometry', () => {
  it('finds the visible box of a scan', () => {
    const data = new Uint8ClampedArray(10 * 10 * 4)
    for (let y = 2; y <= 5; y++) for (let x = 3; x <= 4; x++) data[(y * 10 + x) * 4 + 3] = 255
    expect(boundsOfAlpha(data, 10, 10)).toEqual({ x: 0.3, y: 0.2, width: 0.2, height: 0.4 })
  })

  it('fits an item inside its slot like the client, centred and undistorted', () => {
    // Slot is 200×200 px; a 2:1 item becomes 200×100 px, centred vertically.
    const box = fitInSlot({ x: 0.1, y: 0.2, width: 0.2, height: 0.4 }, 2, bg)
    expect(box.width).toBeCloseTo(0.2)
    expect(box.height).toBeCloseTo(0.2)
    expect(box.y).toBeCloseTo(0.3)
  })

  it('snaps a slot to the product so no empty space is left', () => {
    expect(snapSlot({ x: 0.1, y: 0.2, width: 0.2, height: 0.4 }, 2, bg)).toEqual({
      x: 0.1,
      y: 0.3,
      width: 0.2,
      height: 0.2,
    })
  })

  it('draws the whole image so its visible box covers the item box', () => {
    const rect = fullImageRect(
      { x: 0.5, y: 0.5, width: 0.2, height: 0.1 },
      {
        x: 0.25,
        y: 0.5,
        width: 0.5,
        height: 0.25,
      },
    )
    expect(rect).toEqual({ x: 0.4, y: 0.3, width: 0.4, height: 0.4 })
  })

  it('keeps the proportions when resizing and stays inside the background', () => {
    const aspect = visibleAspect({ width: 400, height: 400 }, { x: 0, y: 0, width: 1, height: 1 })
    const grown = resizeKeepingAspect({ x: 0.1, y: 0.1, width: 0.2, height: 0.4 }, 0.1, aspect, bg)
    // Square in pixels: 0.3 of 1000 px wide = 300 px → 0.6 of 500 px high.
    expect(grown).toMatchObject({ width: 0.3, height: 0.6 })
    const capped = resizeKeepingAspect({ x: 0.1, y: 0.5, width: 0.2, height: 0.4 }, 0.5, aspect, bg)
    expect(capped.y + capped.height).toBeLessThanOrEqual(1)
  })
})
