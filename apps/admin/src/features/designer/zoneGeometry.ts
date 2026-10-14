/*
 * Embroidery zone rules of the API (designer-contract.md): an axis-aligned rectangle in fractions
 * (0–1) of the color's design image, origin top-left, fully inside the image (1e-6 tolerance on the
 * far edges), with at least one allowed content type and a stable key.
 */

export interface ZoneRect {
  x: number
  y: number
  width: number
  height: number
}

export interface ZoneDraft extends ZoneRect {
  key: string
  name: string
  allowText: boolean
  allowImage: boolean
  sortOrder: number
}

export const ZONE_KEY_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/
export const MAX_ZONES_PER_COLOR = 10
/** Smallest side the editor creates by dragging (a fraction of the image). */
export const MIN_ZONE_SIDE = 0.02
const EPSILON = 1e-6

export type ZoneErrors = Partial<Record<keyof ZoneDraft | 'allowed', string>>

export function zoneErrors(zone: ZoneDraft, otherKeys: readonly string[] = []): ZoneErrors {
  const errors: ZoneErrors = {}
  if (!ZONE_KEY_PATTERN.test(zone.key)) errors.key = 'Chữ thường không dấu, số, gạch nối.'
  else if (zone.key.length > 50) errors.key = 'Tối đa 50 ký tự.'
  else if (otherKeys.includes(zone.key)) errors.key = 'Mã vùng đã có trong màu này.'
  if (!zone.name.trim()) errors.name = 'Nhập tên vùng.'
  else if (zone.name.trim().length > 100) errors.name = 'Tối đa 100 ký tự.'

  const finite = [zone.x, zone.y, zone.width, zone.height].every(Number.isFinite)
  if (!finite) errors.x = 'Nhập đủ tọa độ.'
  else {
    if (zone.x < 0) errors.x = 'Không được âm.'
    if (zone.y < 0) errors.y = 'Không được âm.'
    if (zone.width <= 0) errors.width = 'Phải lớn hơn 0.'
    else if (zone.x + zone.width > 1 + EPSILON) errors.width = 'Vùng vượt mép phải của ảnh.'
    if (zone.height <= 0) errors.height = 'Phải lớn hơn 0.'
    else if (zone.y + zone.height > 1 + EPSILON) errors.height = 'Vùng vượt mép dưới của ảnh.'
  }
  if (!zone.allowText && !zone.allowImage) errors.allowed = 'Cho phép ít nhất chữ hoặc hình.'
  return errors
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
/** Four decimals: about a tenth of a pixel on a 2000 px image. */
export const round4 = (value: number) => Math.round(value * 10_000) / 10_000

/** Moves a zone by (dx, dy) image fractions, kept inside the image. */
export function moveZone(rect: ZoneRect, dx: number, dy: number): ZoneRect {
  return {
    ...rect,
    x: round4(clamp(rect.x + dx, 0, 1 - rect.width)),
    y: round4(clamp(rect.y + dy, 0, 1 - rect.height)),
  }
}

/** Resizes from the bottom-right corner, kept inside the image and above the minimum side. */
export function resizeZone(rect: ZoneRect, dx: number, dy: number): ZoneRect {
  return {
    ...rect,
    width: round4(clamp(rect.width + dx, MIN_ZONE_SIDE, 1 - rect.x)),
    height: round4(clamp(rect.height + dy, MIN_ZONE_SIDE, 1 - rect.y)),
  }
}

/** A new zone in the middle of the image with a key not used yet (vung-1, vung-2, …). */
export function newZone(existingKeys: readonly string[], sortOrder: number): ZoneDraft {
  let n = existingKeys.length + 1
  while (existingKeys.includes(`vung-${n}`)) n++
  return {
    key: `vung-${n}`,
    name: `Vùng ${n}`,
    x: 0.4,
    y: 0.4,
    width: 0.2,
    height: 0.15,
    allowText: true,
    allowImage: true,
    sortOrder,
  }
}
