import type { DecodedImage } from './imageFiles'
import type { ImageSource } from './design'
import type { Size } from './geometry'
import type { SceneInput } from './setScene'
import type { Placement } from './setLayout'
import type { TextLayout } from './textLayout'
import type { Designs } from './useDesigns'
import type { Selection } from './useSelection'

/*
 * Captures everything needed to draw the set at one moment: product/design images, text layouts and
 * font readiness are resolved into plain lookups, and designs are referenced through the immutable
 * DesignState object of that moment. The live preview calls this on every change; the exporter calls
 * it once to take its snapshot, so nothing that happens later (loads finishing, edits) can change
 * what is rendered. It reads state and never writes any.
 */

const imageKey = (source: ImageSource) =>
  source.kind === 'preset' ? `preset:${source.presetId}` : `upload:${source.uploadId}`

export interface SceneFrame {
  size: Size
  background: DecodedImage | null
  placements: readonly Placement[]
}

export function captureSceneInput(
  selection: Selection,
  designs: Designs,
  frame: SceneFrame,
): SceneInput {
  const state = designs.designs.value
  const layouts = new Map<string, TextLayout | null>()
  const fonts = new Map<string, boolean>()
  const images = new Map<string, DecodedImage | undefined>()

  const sources = selection.entries.value.map(({ item, product, position }) => {
    const zones = designs.zonesOf(product)
    const itemDesigns = state[item.instanceId]
    for (const zone of zones) {
      const design = itemDesigns?.[zone.id]
      if (design?.text && !layouts.has(design.text.content)) {
        const content = design.text.content
        layouts.set(content, designs.textLayoutOf(content))
        fonts.set(content, designs.fontState(content) === 'ready')
      }
      if (design?.image) {
        const key = imageKey(design.image.source)
        if (!images.has(key)) images.set(key, designs.imageOf(design.image.source))
      }
    }
    const productState = designs.productImageState(product)
    return {
      instanceId: item.instanceId,
      position,
      name: product.name,
      zones,
      productImage: productState?.status === 'ready' ? productState.image : null,
      designOf: (zoneId: string) => itemDesigns?.[zoneId],
    }
  })

  return {
    size: { ...frame.size },
    background: frame.background,
    placements: frame.placements.map((placement) => ({ ...placement })),
    sources,
    resources: {
      textLayoutOf: (content) => layouts.get(content) ?? null,
      imageOf: (source) => images.get(imageKey(source)),
      // Text is drawn only when the lettering font was confirmed for exactly that content.
      textReady: (content) => fonts.get(content) === true,
    },
  }
}
