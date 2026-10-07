import { describe, expect, it } from 'vitest'
import {
  boxInsideRect,
  clampPosition,
  containRect,
  fitCentered,
  fitsInZone,
  isValidZone,
  layerBoxSize,
  maxLayerHeight,
  moveLayer,
  normalizeRotation,
  resizeLayer,
  rotateLayer,
  zoneFrame,
  zoneRect,
  type LayerTransform,
} from './geometry'

const image = { width: 1024, height: 768 }
const zone = { x: 0.47, y: 0.27, width: 0.18, height: 0.14 }
const frame = zoneFrame(image, zone) // ≈ 184 × 107.5

describe('preview placement', () => {
  it('letterboxes a contained image and places zones on the drawn image only', () => {
    // 4:3 image in a wide container: horizontal bars.
    const drawn = containRect({ width: 800, height: 300 }, image)
    expect(drawn).toMatchObject({ x: 200, y: 0, width: 400, height: 300 })
    expect(zoneRect(drawn, zone)).toEqual({
      x: 200 + 0.47 * 400,
      y: 0.27 * 300,
      width: 0.18 * 400,
      height: 0.14 * 300,
    })

    // Tall container: vertical bars.
    const tall = containRect({ width: 300, height: 600 }, image)
    expect(tall.x).toBe(0)
    expect(tall.y).toBeCloseTo((600 - 225) / 2)
  })

  it('keeps zone-relative positions identical across preview sizes', () => {
    const t: LayerTransform = { x: 0.3, y: 0.6, height: 0.4, rotation: 15 }
    const relative = (container: { width: number; height: number }) => {
      const rect = zoneRect(containRect(container, image), zone)
      const cx = rect.x + t.x * rect.width
      const cy = rect.y + t.y * rect.height
      return [(cx - rect.x) / rect.width, (cy - rect.y) / rect.height, rect.width / rect.height]
    }
    const a = relative({ width: 550, height: 412 })
    for (const size of [
      { width: 302, height: 226 },
      { width: 671, height: 503 },
      { width: 550, height: 412 },
    ]) {
      const b = relative(size)
      b.forEach((value, i) => expect(value).toBeCloseTo(a[i]!, 10))
    }
  })

  it('flags zones outside the image instead of moving them', () => {
    expect(isValidZone(zone)).toBe(true)
    expect(isValidZone({ x: 0.9, y: 0, width: 0.2, height: 0.1 })).toBe(false)
    expect(isValidZone({ x: 0, y: 0, width: 0, height: 0.1 })).toBe(false)
    expect(isValidZone({ x: -0.1, y: 0, width: 0.2, height: 0.1 })).toBe(false)
  })
})

describe('layer bounds', () => {
  const aspect = 4 // wide text-like box

  it('fits a centred layer at the configured share of the largest size', () => {
    const t = fitCentered(aspect, frame, 0.8)
    expect(t).toMatchObject({ x: 0.5, y: 0.5, rotation: 0 })
    expect(fitsInZone(t, aspect, frame)).toBe(true)
    expect(fitsInZone({ ...t, height: t.height / 0.8 }, aspect, frame)).toBe(true)
    expect(fitsInZone({ ...t, height: (t.height / 0.8) * 1.01 }, aspect, frame)).toBe(false)
  })

  it('accounts for rotation: a box that fits flat can stop fitting when rotated', () => {
    const t: LayerTransform = {
      x: 0.5,
      y: 0.5,
      height: maxLayerHeight(aspect, 0, frame),
      rotation: 0,
    }
    expect(fitsInZone(t, aspect, frame)).toBe(true)
    expect(fitsInZone({ ...t, rotation: 20 }, aspect, frame)).toBe(false)
    expect(maxLayerHeight(aspect, 20, frame)).toBeLessThan(t.height)
    expect(
      fitsInZone({ ...t, rotation: 20, height: maxLayerHeight(aspect, 20, frame) }, aspect, frame),
    ).toBe(true)
  })

  it('clamps dragging to the zone edge including the rotated extents', () => {
    const t: LayerTransform = { x: 0.5, y: 0.5, height: 0.2, rotation: 30 }
    const moved = moveLayer(t, 5, -5, aspect, frame)!
    expect(fitsInZone(moved, aspect, frame)).toBe(true)
    const box = layerBoxSize(moved, aspect, frame)
    const halfW =
      (box.width * Math.cos(Math.PI / 6) + box.height * Math.sin(Math.PI / 6)) / 2 / frame.width
    expect(moved.x).toBeCloseTo(1 - halfW)
  })

  it('limits resizing to [min, max] and never produces zero or negative sizes', () => {
    const t: LayerTransform = { x: 0.5, y: 0.5, height: 0.3, rotation: 0 }
    const max = maxLayerHeight(aspect, 0, frame)
    expect(resizeLayer(t, 10, 0.1, aspect, frame)!.height).toBeCloseTo(max)
    expect(resizeLayer(t, -1, 0.1, aspect, frame)!.height).toBe(0.1)
    expect(resizeLayer(t, 0, 0.1, aspect, frame)!.height).toBe(0.1)
    expect(fitsInZone({ ...t, height: 0 }, aspect, frame)).toBe(false)
    expect(fitsInZone({ ...t, height: -0.2 }, aspect, frame)).toBe(false)
    // Minimum larger than anything that fits: rejected.
    expect(resizeLayer(t, 0.5, 2, aspect, frame)).toBeNull()
  })

  it('rejects a rotation that cannot fit, and moves the centre when it can', () => {
    const big: LayerTransform = {
      x: 0.5,
      y: 0.5,
      height: maxLayerHeight(aspect, 0, frame),
      rotation: 0,
    }
    expect(rotateLayer(big, 45, aspect, frame)).toBeNull()

    const nearEdge: LayerTransform = { x: 0.8, y: 0.5, height: 0.15, rotation: 0 }
    const rotated = rotateLayer(nearEdge, 25, aspect, frame)!
    expect(rotated.rotation).toBe(25)
    expect(fitsInZone(rotated, aspect, frame)).toBe(true)
  })

  it('handles narrow zones and extreme aspect ratios', () => {
    const narrow = zoneFrame(image, { x: 0, y: 0, width: 0.02, height: 0.5 })
    for (const a of [0.05, 1, 20]) {
      const t = fitCentered(a, narrow, 1)
      expect(t.height).toBeGreaterThan(0)
      expect(fitsInZone(t, a, narrow)).toBe(true)
      expect(clampPosition({ ...t, x: 5, y: -5 }, a, narrow)).not.toBeNull()
    }
  })

  it('normalizes rotation without flipping', () => {
    expect(normalizeRotation(190)).toBe(-170)
    expect(normalizeRotation(-180)).toBe(180)
    expect(normalizeRotation(720 + 15)).toBe(15)
  })

  it('validates transformer boxes by their rotated corners', () => {
    const rect = { x: 0, y: 0, width: 100, height: 50 }
    expect(boxInsideRect({ x: 10, y: 10, width: 60, height: 20, rotation: 0 }, rect)).toBe(true)
    expect(
      boxInsideRect({ x: 10, y: 10, width: 60, height: 20, rotation: Math.PI / 4 }, rect),
    ).toBe(false)
    expect(boxInsideRect({ x: 10, y: 10, width: -60, height: 20, rotation: 0 }, rect)).toBe(false)
    expect(boxInsideRect({ x: 10, y: 10, width: 0, height: 20, rotation: 0 }, rect)).toBe(false)
  })
})
