import type { ZoneRect } from './zoneGeometry'
import { MIN_ZONE_SIDE, round4 } from './zoneGeometry'

/*
 * Real product previews in the set-layout editor. The client fits each item inside its slot by
 * the item's *visible* box (non-transparent pixels of its transparent design image), centred and
 * without distortion; the editor uses the same rule so what the admin sees is what customers get.
 *
 * Proportions: `aspect` is width / height of the visible box in image pixels. Slots are fractions
 * of the background, so converting needs the background size in pixels (`bg`).
 */

export interface Size {
  width: number
  height: number
}

export const FULL_IMAGE: ZoneRect = { x: 0, y: 0, width: 1, height: 1 }

/** Same thresholds as the client's visibleBounds.ts. */
const SCAN_EDGE = 256
const ALPHA_THRESHOLD = 24

export function boundsOfAlpha(data: Uint8ClampedArray, width: number, height: number): ZoneRect {
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
 * Visible box of an image URL. Loaded with CORS (the API allows the admin origin); when pixels
 * cannot be read the whole image is used, so the preview never fails because of this.
 */
export function measureVisible(url: string): Promise<ZoneRect> {
  return new Promise((resolve) => {
    const image = new window.Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => {
      try {
        const scale = Math.min(1, SCAN_EDGE / Math.max(image.naturalWidth, image.naturalHeight))
        const width = Math.max(1, Math.round(image.naturalWidth * scale))
        const height = Math.max(1, Math.round(image.naturalHeight * scale))
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const context = canvas.getContext('2d', { willReadFrequently: true })
        if (!context) return resolve(FULL_IMAGE)
        context.drawImage(image, 0, 0, width, height)
        resolve(boundsOfAlpha(context.getImageData(0, 0, width, height).data, width, height))
      } catch {
        resolve(FULL_IMAGE)
      }
    }
    image.onerror = () => resolve(FULL_IMAGE)
    image.src = url
  })
}

/** Width / height of the visible part of an image, in pixels. */
export function visibleAspect(image: Size, visible: ZoneRect): number {
  return (image.width * visible.width) / (image.height * visible.height)
}

/** The item box inside a slot: contained, centred, aspect kept (all in background fractions). */
export function fitInSlot(slot: ZoneRect, aspect: number, bg: Size): ZoneRect {
  const slotW = slot.width * bg.width
  const slotH = slot.height * bg.height
  const width = Math.min(slotW, slotH * aspect)
  const height = width / aspect
  return {
    x: slot.x + (slotW - width) / 2 / bg.width,
    y: slot.y + (slotH - height) / 2 / bg.height,
    width: width / bg.width,
    height: height / bg.height,
  }
}

/** Where to draw the whole image so that its visible box lands on `box`. */
export function fullImageRect(box: ZoneRect, visible: ZoneRect): ZoneRect {
  const width = box.width / visible.width
  const height = box.height / visible.height
  return { x: box.x - visible.x * width, y: box.y - visible.y * height, width, height }
}

/** Shrinks the slot to the item it shows, so no empty space is left around the product. */
export function snapSlot(slot: ZoneRect, aspect: number, bg: Size): ZoneRect {
  const fitted = fitInSlot(slot, aspect, bg)
  return {
    x: round4(fitted.x),
    y: round4(fitted.y),
    width: round4(fitted.width),
    height: round4(fitted.height),
  }
}

/**
 * Corner resize that keeps the product's proportions: the width follows the drag and the height
 * follows the width; both stay inside the background and above the minimum side.
 */
export function resizeKeepingAspect(
  start: ZoneRect,
  dx: number,
  aspect: number,
  bg: Size,
): ZoneRect {
  const ratio = bg.width / (aspect * bg.height) // height fraction per width fraction
  const maxWidth = Math.min(1 - start.x, (1 - start.y) / ratio)
  const minWidth = Math.max(MIN_ZONE_SIDE, MIN_ZONE_SIDE / ratio)
  const width = Math.min(maxWidth, Math.max(minWidth, start.width + dx))
  return { ...start, width: round4(width), height: round4(width * ratio) }
}
