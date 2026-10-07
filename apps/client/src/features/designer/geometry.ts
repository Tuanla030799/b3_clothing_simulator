/*
 * Pure geometry for embroidery zones and design layers.
 *
 * Coordinate spaces:
 * - Source image: intrinsic pixels of the decoded product image.
 * - Zone: EmbroideryZone x/y/width/height are fractions (0–1) of the full source image.
 * - Layer transform (stored design data): relative to its zone, independent of any viewport.
 *     x, y      centre of the layer as a fraction of the zone width / height
 *     height    layer box height as a fraction of the zone height
 *     rotation  degrees, clockwise, normalized to (-180, 180]
 *   The box width follows from the layer aspect ratio (width / height of the content).
 * - Preview: the image is fitted with "contain" into the canvas; zones are placed on the drawn
 *   image (including letterbox offsets), never on the empty container.
 */

export interface Size {
  width: number
  height: number
}

export interface Rect extends Size {
  x: number
  y: number
}

export interface LayerTransform {
  x: number
  y: number
  height: number
  rotation: number
}

export interface NormalizedZone {
  x: number
  y: number
  width: number
  height: number
}

const EPSILON = 1e-6

export function normalizeRotation(degrees: number): number {
  const r = ((((degrees + 180) % 360) + 360) % 360) - 180
  return r === -180 ? 180 : r
}

/** True when the zone is a non-empty rectangle inside the source image. */
export function isValidZone(zone: NormalizedZone): boolean {
  const values = [zone.x, zone.y, zone.width, zone.height]
  return (
    values.every(Number.isFinite) &&
    zone.x >= 0 &&
    zone.y >= 0 &&
    zone.width > 0 &&
    zone.height > 0 &&
    zone.x + zone.width <= 1 + EPSILON &&
    zone.y + zone.height <= 1 + EPSILON
  )
}

/** Image drawn with object-fit: contain inside a container, centred (letterboxed). */
export function containRect(container: Size, image: Size): Rect & { scale: number } {
  const scale = Math.min(container.width / image.width, container.height / image.height)
  const width = image.width * scale
  const height = image.height * scale
  return {
    x: (container.width - width) / 2,
    y: (container.height - height) / 2,
    width,
    height,
    scale,
  }
}

/** Zone rectangle in the coordinates of the drawn image rect. */
export function zoneRect(drawnImage: Rect, zone: NormalizedZone): Rect {
  return {
    x: drawnImage.x + zone.x * drawnImage.width,
    y: drawnImage.y + zone.y * drawnImage.height,
    width: zone.width * drawnImage.width,
    height: zone.height * drawnImage.height,
  }
}

/** Zone size in source-image pixels; only its aspect ratio matters to layer geometry. */
export function zoneFrame(image: Size, zone: NormalizedZone): Size {
  return { width: zone.width * image.width, height: zone.height * image.height }
}

/** Half extents of the axis-aligned bounding box of a rotated box. */
export function rotatedHalfExtents(width: number, height: number, rotation: number) {
  const rad = (rotation * Math.PI) / 180
  const cos = Math.abs(Math.cos(rad))
  const sin = Math.abs(Math.sin(rad))
  return {
    halfWidth: (width * cos + height * sin) / 2,
    halfHeight: (width * sin + height * cos) / 2,
  }
}

/** Layer box size in the frame's units. */
export function layerBoxSize(transform: LayerTransform, aspectRatio: number, frame: Size): Size {
  const height = transform.height * frame.height
  return { width: height * aspectRatio, height }
}

/** Largest layer height (fraction of zone height) that fits the zone at a rotation. */
export function maxLayerHeight(aspectRatio: number, rotation: number, frame: Size): number {
  const rad = (rotation * Math.PI) / 180
  const cos = Math.abs(Math.cos(rad))
  const sin = Math.abs(Math.sin(rad))
  // Box height H (in frame units) must satisfy H·(a·cos + sin) ≤ W and H·(a·sin + cos) ≤ Hz.
  const byWidth = frame.width / (aspectRatio * cos + sin)
  const byHeight = frame.height / (aspectRatio * sin + cos)
  return Math.min(byWidth, byHeight) / frame.height
}

/** The whole rotated layer box lies inside the zone. */
export function fitsInZone(transform: LayerTransform, aspectRatio: number, frame: Size): boolean {
  if (!(transform.height > 0) || !(aspectRatio > 0)) return false
  const box = layerBoxSize(transform, aspectRatio, frame)
  const { halfWidth, halfHeight } = rotatedHalfExtents(box.width, box.height, transform.rotation)
  const cx = transform.x * frame.width
  const cy = transform.y * frame.height
  return (
    cx - halfWidth >= -EPSILON * frame.width &&
    cx + halfWidth <= frame.width * (1 + EPSILON) &&
    cy - halfHeight >= -EPSILON * frame.height &&
    cy + halfHeight <= frame.height * (1 + EPSILON)
  )
}

/**
 * Moves the centre to the closest valid position. Returns null when the layer is too large
 * to fit at its rotation anywhere in the zone.
 */
export function clampPosition(
  transform: LayerTransform,
  aspectRatio: number,
  frame: Size,
): LayerTransform | null {
  if (transform.height > maxLayerHeight(aspectRatio, transform.rotation, frame) + EPSILON) {
    return null
  }
  const box = layerBoxSize(transform, aspectRatio, frame)
  const { halfWidth, halfHeight } = rotatedHalfExtents(box.width, box.height, transform.rotation)
  const minX = halfWidth / frame.width
  const minY = halfHeight / frame.height
  return {
    ...transform,
    x: Math.min(Math.max(transform.x, minX), Math.max(minX, 1 - minX)),
    y: Math.min(Math.max(transform.y, minY), Math.max(minY, 1 - minY)),
  }
}

/** Centred, unrotated placement at a share of the largest size that fits. */
export function fitCentered(aspectRatio: number, frame: Size, fill: number): LayerTransform {
  return { x: 0.5, y: 0.5, height: maxLayerHeight(aspectRatio, 0, frame) * fill, rotation: 0 }
}

export function moveLayer(
  transform: LayerTransform,
  dx: number,
  dy: number,
  aspectRatio: number,
  frame: Size,
): LayerTransform | null {
  return clampPosition(
    { ...transform, x: transform.x + dx, y: transform.y + dy },
    aspectRatio,
    frame,
  )
}

/**
 * Sets the layer height, limited to [minHeight, largest fitting height] at the current rotation,
 * then keeps the box inside the zone. Returns null when even minHeight cannot fit.
 */
export function resizeLayer(
  transform: LayerTransform,
  height: number,
  minHeight: number,
  aspectRatio: number,
  frame: Size,
): LayerTransform | null {
  const max = maxLayerHeight(aspectRatio, transform.rotation, frame)
  if (max + EPSILON < minHeight) return null
  const next = Math.min(Math.max(height, minHeight), max)
  return clampPosition({ ...transform, height: next }, aspectRatio, frame)
}

/** Rotates in place, moving the centre if needed. Rejects (null) when the box cannot fit. */
export function rotateLayer(
  transform: LayerTransform,
  rotation: number,
  aspectRatio: number,
  frame: Size,
): LayerTransform | null {
  return clampPosition({ ...transform, rotation: normalizeRotation(rotation) }, aspectRatio, frame)
}

export interface CanvasBox {
  x: number
  y: number
  width: number
  height: number
  /** Radians, as used by Konva's Transformer boundBoxFunc. */
  rotation: number
}

/** All corners of a rotated box (top-left corner at x/y) lie inside the rect. */
export function boxInsideRect(box: CanvasBox, rect: Rect, tolerance = 0.5): boolean {
  if (!(box.width > 0) || !(box.height > 0)) return false
  const cos = Math.cos(box.rotation)
  const sin = Math.sin(box.rotation)
  const corners = [
    [0, 0],
    [box.width, 0],
    [box.width, box.height],
    [0, box.height],
  ].map(([u, v]) => [box.x + u! * cos - v! * sin, box.y + u! * sin + v! * cos] as const)
  return corners.every(
    ([px, py]) =>
      px >= rect.x - tolerance &&
      px <= rect.x + rect.width + tolerance &&
      py >= rect.y - tolerance &&
      py <= rect.y + rect.height + tolerance,
  )
}
