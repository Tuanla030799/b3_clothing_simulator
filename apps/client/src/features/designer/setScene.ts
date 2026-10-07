import { type Size } from './geometry'
import type { DecodedImage } from './imageFiles'
import { buildProductContent, type ContentLayer, type ContentResources } from './productContent'
import type { ZoneDesign } from './design'
import type { Placement } from './setLayout'
import type { EmbroideryZone } from './types'

/*
 * The one description of "the whole set on its background" in logical composition units. The
 * preview canvas and the PNG exporter both consume it, so they cannot disagree about positions or
 * content. It is plain data plus decoded images; building it never changes designs or resources.
 *
 * Item content comes from buildProductContent (shared with the item editor). Konva-specific
 * attributes live in each layer's `config`; this module does not import Konva.
 */

export interface SceneZone {
  zoneId: string
  /** Zone rect in the item's own coordinates (origin = item top-left). */
  x: number
  y: number
  width: number
  height: number
  /** Image layer first, then text, positioned relative to the zone origin. */
  layers: ContentLayer[]
}

export interface SceneItem {
  instanceId: string
  position: number
  name: string
  /** Item box in logical composition units. */
  x: number
  y: number
  width: number
  height: number
  /** Decoded product image; null while it is missing (preview shows a labelled placeholder). */
  image: HTMLImageElement | null
  zones: SceneZone[]
  /** True when some layer of this item could not be drawn (resource not ready). */
  incomplete: boolean
}

export interface SetScene {
  size: Size
  /** Decoded background; null means the neutral fill. */
  background: HTMLImageElement | null
  items: SceneItem[]
  /** Every item has its product image and every designed layer is drawable. */
  complete: boolean
}

export interface SceneItemSource {
  instanceId: string
  position: number
  name: string
  zones: readonly EmbroideryZone[]
  productImage: DecodedImage | null
  designOf: (zoneId: string) => ZoneDesign | undefined
}

export interface SceneInput {
  size: Size
  background: DecodedImage | null
  placements: readonly Placement[]
  sources: readonly SceneItemSource[]
  resources: ContentResources
}

export function buildSetScene(input: SceneInput): SetScene {
  const byId = new Map(input.sources.map((source) => [source.instanceId, source]))
  const items: SceneItem[] = []
  const seen = new Set<string>()

  for (const placement of input.placements) {
    const source = byId.get(placement.instanceId)
    if (!source || seen.has(placement.instanceId)) continue
    seen.add(placement.instanceId)

    const drawn = { x: 0, y: 0, width: placement.width, height: placement.height }
    const content = source.productImage
      ? buildProductContent(source.zones, source.designOf, drawn, input.resources)
      : []
    items.push({
      instanceId: source.instanceId,
      position: source.position,
      name: source.name,
      x: placement.x,
      y: placement.y,
      width: placement.width,
      height: placement.height,
      image: source.productImage?.element ?? null,
      zones: content.map(({ zone, rect, layers }) => ({
        zoneId: zone.id,
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        layers,
      })),
      incomplete: !source.productImage || content.some((zone) => zone.missing.length > 0),
    })
  }

  // Each source must appear exactly once for the scene to describe the whole set.
  const complete =
    items.length === input.sources.length &&
    seen.size === input.sources.length &&
    items.every((item) => !item.incomplete)

  return { size: input.size, background: input.background?.element ?? null, items, complete }
}
