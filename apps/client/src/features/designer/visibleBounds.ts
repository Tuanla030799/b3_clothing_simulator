import type { NormalizedZone } from './geometry'
import type { DecodedImage } from './imageFiles'

/*
 * The visible part of a transparent product image: the bounding box of its non-transparent pixels,
 * as fractions (0–1) of the whole image. The set layout arranges these boxes instead of the full
 * image frames, so the empty margin around a product does not become a gap between items. Zones and
 * designs stay relative to the full image; only placement uses the visible box.
 */

/** Longer side of the scan bitmap; the box is a layout hint, so a small scan is accurate enough. */
const SCAN_EDGE = 256
/** Alpha (0–255) above which a pixel counts as visible; ignores faint shadows and fringes. */
const ALPHA_THRESHOLD = 24

export const FULL_IMAGE: NormalizedZone = { x: 0, y: 0, width: 1, height: 1 }

/** Bounding box of the visible pixels in a scan; the full image when nothing is visible. */
export function boundsOfAlpha(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): NormalizedZone {
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3]! > ALPHA_THRESHOLD) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < minX || maxY < minY) return FULL_IMAGE
  return {
    x: minX / width,
    y: minY / height,
    width: (maxX - minX + 1) / width,
    height: (maxY - minY + 1) / height,
  }
}

/**
 * Measures a decoded image. Falls back to the full image when pixels cannot be read (no canvas,
 * tainted canvas), so layout never fails because of this optimisation.
 */
export function measureVisibleBounds(image: DecodedImage): NormalizedZone {
  try {
    const scale = Math.min(1, SCAN_EDGE / Math.max(image.width, image.height))
    const width = Math.max(1, Math.round(image.width * scale))
    const height = Math.max(1, Math.round(image.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) return FULL_IMAGE
    context.drawImage(image.element, 0, 0, width, height)
    return boundsOfAlpha(context.getImageData(0, 0, width, height).data, width, height)
  } catch {
    return FULL_IMAGE
  }
}
