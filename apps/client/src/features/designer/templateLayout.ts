import type { Size } from './geometry'
import type { LayoutItem, Placement, SetLayout } from './setLayout'
import type { SetTemplate } from './types'

/*
 * Hand-arranged layouts ("mẫu sắp xếp") configured by the admin for one background.
 *
 * A template serves a set when the set has exactly the template's categories and counts. Items
 * fill the slots of their category in order (selection order → slot order). Each item is fitted
 * inside its slot rectangle without distortion and centred, so the admin decides where and how
 * large every item is; displayScale is not used. Slots are fractions of the background image.
 */

type TemplateItem = LayoutItem & { categoryId: string }

const countByCategory = (ids: readonly string[]) => {
  const counts = new Map<string, number>()
  for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1)
  return counts
}

/** The template for this background whose slots match the set's categories exactly, if any. */
export function matchTemplate(
  templates: readonly SetTemplate[],
  backgroundId: string | null,
  items: readonly { categoryId: string }[],
): SetTemplate | null {
  if (!backgroundId || items.length === 0) return null
  const wanted = countByCategory(items.map((item) => item.categoryId))
  return (
    templates.find((template) => {
      if (template.backgroundId !== backgroundId || template.slots.length !== items.length) {
        return false
      }
      const have = countByCategory(template.slots.map((slot) => slot.categoryId))
      return have.size === wanted.size && [...wanted].every(([id, n]) => have.get(id) === n)
    }) ?? null
  )
}

export function layoutFromTemplate(
  template: SetTemplate,
  items: readonly TemplateItem[],
  size: Size,
): SetLayout {
  const queues = new Map<string, TemplateItem[]>()
  for (const item of items)
    queues.set(item.categoryId, [...(queues.get(item.categoryId) ?? []), item])

  const placements: Placement[] = []
  for (const slot of template.slots) {
    const item = queues.get(slot.categoryId)?.shift()
    if (!item) continue
    const box = {
      x: slot.x * size.width,
      y: slot.y * size.height,
      width: slot.width * size.width,
      height: slot.height * size.height,
    }
    const aspect = Number.isFinite(item.aspectRatio) && item.aspectRatio > 0 ? item.aspectRatio : 1
    const width = Math.min(box.width, box.height * aspect)
    const height = width / aspect
    placements.push({
      instanceId: item.instanceId,
      x: box.x + (box.width - width) / 2,
      y: box.y + (box.height - height) / 2,
      width,
      height,
    })
  }
  return { size, placements, strategy: 'template' }
}
