import { type CategoryNode, depthOf, lineageIds } from '../catalog/categoryTree'
import type { Size } from './geometry'
import type { LayoutItem, Placement, SetLayout } from './setLayout'
import type { SetTemplate, TemplateSlot } from './types'

/*
 * Hand-arranged layouts ("mẫu sắp xếp") configured by the admin for one background.
 *
 * A slot takes an item of its category or of any descendant (categories form a tree, API
 * docs/category-tree-contract.md §7). A template serves a set when every item gets its own slot:
 * the deepest slots choose first (then slot order), each taking the first unplaced item of its
 * branch in selection order. A deeper slot's branch is inside a shallower one's, so narrowest
 * first always finds an assignment when one exists; with leaf-only slots this is the plain
 * "same categories and counts, filled in order" rule. When several templates of the background
 * match, the most specific one (largest sum of slot levels) wins, then the template order.
 * Each item is fitted inside its slot rectangle without distortion and centred, so the admin
 * decides where and how large every item is; displayScale is not used. Slots are fractions of
 * the background image.
 */

type TemplateItem = LayoutItem & { categoryId: string }

/** The item of each slot (by slot index), or null when the items do not fit the slots exactly. */
export function assignSlots<T extends { categoryId: string }>(
  slots: readonly TemplateSlot[],
  items: readonly T[],
  categories: readonly CategoryNode[] = [],
): (T | undefined)[] | null {
  if (slots.length !== items.length) return null
  const branches = items.map((item) => lineageIds(categories, item.categoryId))
  const order = slots
    .map((slot, index) => ({ index, depth: depthOf(categories, slot.categoryId) }))
    .sort((a, b) => b.depth - a.depth || a.index - b.index)
  const assigned: (T | undefined)[] = Array.from({ length: slots.length })
  const used = new Set<number>()
  for (const { index } of order) {
    const categoryId = slots[index]!.categoryId
    const pick = branches.findIndex((branch, i) => !used.has(i) && branch.includes(categoryId))
    if (pick === -1) return null
    used.add(pick)
    assigned[index] = items[pick]
  }
  return assigned
}

/** The template for this background that serves the set, if any (see the comment above). */
export function matchTemplate(
  templates: readonly SetTemplate[],
  backgroundId: string | null,
  items: readonly { categoryId: string }[],
  categories: readonly CategoryNode[] = [],
): SetTemplate | null {
  if (!backgroundId || items.length === 0) return null
  let best: { template: SetTemplate; score: number } | null = null
  for (const template of templates) {
    if (template.backgroundId !== backgroundId) continue
    if (assignSlots(template.slots, items, categories) === null) continue
    const score = template.slots.reduce(
      (sum, slot) => sum + depthOf(categories, slot.categoryId),
      0,
    )
    if (best === null || score > best.score) best = { template, score }
  }
  return best?.template ?? null
}

export function layoutFromTemplate(
  template: SetTemplate,
  items: readonly TemplateItem[],
  size: Size,
  categories: readonly CategoryNode[] = [],
): SetLayout {
  const assigned = assignSlots(template.slots, items, categories) ?? []
  const placements: Placement[] = []
  for (const [index, slot] of template.slots.entries()) {
    const item = assigned[index]
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
