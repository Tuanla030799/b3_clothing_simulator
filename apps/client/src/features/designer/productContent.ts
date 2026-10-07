import type Konva from 'konva'
import { textColors } from './data/designOptions'
import type { ImageSource, LayerKind, ZoneDesign } from './design'
import { zoneRect, type LayerTransform, type Rect } from './geometry'
import type { DecodedImage } from './imageFiles'
import { designFontCss, REFERENCE_FONT_SIZE, type TextLayout } from './textLayout'
import type { EmbroideryZone } from './types'

/*
 * The one formula that turns stored designs into drawable layers. The item editor and the set
 * composition both call it, so a design always looks the same in both.
 *
 * Coordinates: `drawn` is where the product image is drawn (any unit). Each zone becomes a rect on
 * that image; each layer is centred at (x·zoneWidth, y·zoneHeight) inside its zone, with
 * height = transform.height·zoneHeight, width = height·aspect, rotated around its centre.
 * Image layers are listed before text layers (image below text).
 */

export interface ContentLayer {
  kind: LayerKind
  zoneId: string
  transform: LayerTransform
  width: number
  height: number
  /** Konva attributes relative to the zone origin (no interaction attributes). */
  config: Record<string, unknown>
}

export interface ContentZone {
  zone: EmbroideryZone
  /** Zone rect in the coordinates of `drawn`. */
  rect: Rect
  layers: ContentLayer[]
  /** Layers that have design data but cannot be drawn yet (resource not ready). */
  missing: LayerKind[]
}

export interface ContentResources {
  textLayoutOf: (content: string) => TextLayout | null
  imageOf: (source: ImageSource) => DecodedImage | undefined
  /** When provided, text is drawn only if this returns true (font confirmed for the content). */
  textReady?: (content: string) => boolean
}

export function textColorValue(colorId: string): string {
  return textColors.find((color) => color.id === colorId)?.value ?? textColors[0]!.value
}

export function textSceneFunc(layout: TextLayout, color: string, height: number) {
  const scale = height / layout.height
  return (context: Konva.Context) => {
    context.save()
    context.scale(scale, scale)
    context.setAttr('font', designFontCss(REFERENCE_FONT_SIZE))
    context.setAttr('textAlign', 'center')
    context.setAttr('textBaseline', 'alphabetic')
    context.setAttr('fillStyle', color)
    for (const line of layout.lines) context.fillText(line.text, line.x, line.y)
    context.restore()
  }
}

function placement(rect: Rect, transform: LayerTransform, width: number, height: number) {
  return {
    x: transform.x * rect.width,
    y: transform.y * rect.height,
    width,
    height,
    offsetX: width / 2,
    offsetY: height / 2,
    rotation: transform.rotation,
    scaleX: 1,
    scaleY: 1,
  }
}

export function buildProductContent(
  zones: readonly EmbroideryZone[],
  designOf: (zoneId: string) => ZoneDesign | undefined,
  drawn: Rect,
  resources: ContentResources,
): ContentZone[] {
  return zones.map((zone) => {
    const rect = zoneRect(drawn, zone)
    const design = designOf(zone.id)
    const layers: ContentLayer[] = []
    const missing: LayerKind[] = []

    if (design?.image) {
      const decoded = resources.imageOf(design.image.source)
      const height = design.image.transform.height * rect.height
      const width = height * design.image.aspectRatio
      if (decoded) {
        layers.push({
          kind: 'image',
          zoneId: zone.id,
          transform: design.image.transform,
          width,
          height,
          config: {
            ...placement(rect, design.image.transform, width, height),
            image: decoded.element,
          },
        })
      } else {
        missing.push('image')
      }
    }

    if (design?.text) {
      const { content, colorId, transform } = design.text
      const ready = resources.textReady ? resources.textReady(content) : true
      const layout = ready ? resources.textLayoutOf(content) : null
      if (layout) {
        const height = transform.height * rect.height
        const width = (height * layout.width) / layout.height
        layers.push({
          kind: 'text',
          zoneId: zone.id,
          transform,
          width,
          height,
          config: {
            ...placement(rect, transform, width, height),
            sceneFunc: textSceneFunc(layout, textColorValue(colorId), height),
          },
        })
      } else {
        missing.push('text')
      }
    }

    return { zone, rect, layers, missing }
  })
}
