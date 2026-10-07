import type { Size } from './geometry'

/*
 * Automatic set layout (pure and deterministic; no randomness).
 *
 * Size convention: an item's base box has the product image aspect ratio a = width / height and
 * a "visual size" s = displayScale, measured as the geometric-mean side √(width·height):
 *   baseWidth = s·√a, baseHeight = s/√a
 * One common factor u scales every base box, so relative sizes always follow displayScale and no
 * image is distorted. Pixel sizes of the source files are never used as physical sizes.
 *
 * Heuristic: items are ordered by layout priority (configuration), then by visual size, then by the
 * order they were added. Every split of that order into consecutive rows (1–n rows, ≤ 512
 * candidates for 10 items) is evaluated; each gets the largest u that fits all rows inside the
 * padded composition with gaps. The best score wins: larger u, penalised by uneven row widths.
 * Inside a row the most important item is centred and the others alternate right/left. Rows and
 * items are centred. Bounding boxes never overlap by construction. If no candidate is valid, a
 * plain grid fallback still places every item.
 */

export interface LayoutItem {
  instanceId: string
  aspectRatio: number
  displayScale: number
  priority: number
}

export interface Placement {
  instanceId: string
  /** Top-left corner and size in logical composition units. */
  x: number
  y: number
  width: number
  height: number
}

export interface SetLayout {
  size: Size
  placements: Placement[]
  strategy: 'rows' | 'grid'
}

export interface LayoutOptions {
  paddingRatio: number
  gapRatio: number
  maxItemFill: number
}

interface Box {
  item: LayoutItem
  w: number
  h: number
}

const positive = (value: number, fallback: number) =>
  Number.isFinite(value) && value > 0 ? value : fallback

function baseBox(item: LayoutItem): Box {
  const a = positive(item.aspectRatio, 1)
  const s = positive(item.displayScale, 1)
  return { item, w: s * Math.sqrt(a), h: s / Math.sqrt(a) }
}

/** All splits of `count` items into consecutive non-empty rows, in a fixed order. */
function* rowSplits(count: number): Generator<number[]> {
  for (let mask = 0; mask < 1 << (count - 1); mask++) {
    const sizes: number[] = []
    let run = 1
    for (let i = 0; i < count - 1; i++) {
      if (mask & (1 << i)) {
        sizes.push(run)
        run = 1
      } else run++
    }
    sizes.push(run)
    yield sizes
  }
}

function centreOut<T>(row: T[]): T[] {
  const arranged: T[] = []
  row.forEach((entry, i) => (i % 2 === 1 ? arranged.push(entry) : arranged.unshift(entry)))
  return arranged
}

export function layoutSet(items: LayoutItem[], size: Size, options: LayoutOptions): SetLayout {
  if (items.length === 0) return { size, placements: [], strategy: 'rows' }

  const minSide = Math.min(size.width, size.height)
  let padding = options.paddingRatio * minSide
  const gap = options.gapRatio * minSide
  if (size.width - 2 * padding <= 0 || size.height - 2 * padding <= 0) padding = 0
  const availW = size.width - 2 * padding
  const availH = size.height - 2 * padding

  const boxes = items
    .map((item, index) => ({ box: baseBox(item), index }))
    .sort(
      (a, b) =>
        b.box.item.priority - a.box.item.priority ||
        b.box.w * b.box.h - a.box.w * a.box.h ||
        a.index - b.index,
    )
    .map(({ box }) => box)
  const tallest = Math.max(...boxes.map((box) => box.h))

  let best: { rows: Box[][]; u: number; score: number } | null = null
  for (const sizes of rowSplits(boxes.length)) {
    const rows: Box[][] = []
    let start = 0
    for (const count of sizes) {
      rows.push(boxes.slice(start, start + count))
      start += count
    }
    const widths = rows.map((row) => row.reduce((sum, box) => sum + box.w, 0))
    const heights = rows.map((row) => Math.max(...row.map((box) => box.h)))
    const uWidth = Math.min(...rows.map((row, i) => (availW - gap * (row.length - 1)) / widths[i]!))
    const uHeight = (availH - gap * (rows.length - 1)) / heights.reduce((a, b) => a + b, 0)
    const uCap = (options.maxItemFill * availH) / tallest
    const u = Math.min(uWidth, uHeight, uCap)
    if (!(u > 0) || !Number.isFinite(u)) continue

    const rowSpans = rows.map((row, i) => widths[i]! * u + gap * (row.length - 1))
    const imbalance = 1 - Math.min(...rowSpans) / Math.max(...rowSpans)
    const score = u * (1 - 0.2 * imbalance)
    if (!best || score > best.score + 1e-9) best = { rows, u, score }
  }

  if (!best) return gridFallback(boxes, size, padding, gap)

  const { rows, u } = best
  const rowHeights = rows.map((row) => Math.max(...row.map((box) => box.h)) * u)
  const blockHeight = rowHeights.reduce((a, b) => a + b, 0) + gap * (rows.length - 1)
  let y = padding + (availH - blockHeight) / 2
  const placements: Placement[] = []
  rows.forEach((row, r) => {
    const rowHeight = rowHeights[r]!
    const span = row.reduce((sum, box) => sum + box.w * u, 0) + gap * (row.length - 1)
    let x = padding + (availW - span) / 2
    for (const box of centreOut(row)) {
      const width = box.w * u
      const height = box.h * u
      placements.push({
        instanceId: box.item.instanceId,
        x,
        y: y + (rowHeight - height) / 2,
        width,
        height,
      })
      x += width + gap
    }
    y += rowHeight + gap
  })
  return { size, placements, strategy: 'rows' }
}

/** Always places every item: equal grid cells, each item contained (aspect kept) in its cell. */
function gridFallback(boxes: Box[], size: Size, padding: number, gap: number): SetLayout {
  const n = boxes.length
  const availW = Math.max(size.width - 2 * padding, 1)
  const availH = Math.max(size.height - 2 * padding, 1)
  const cols = Math.max(1, Math.ceil(Math.sqrt((n * availW) / availH)))
  const rowsCount = Math.ceil(n / cols)
  const g = Math.min(gap, availW / (cols * 4), availH / (rowsCount * 4))
  const cellW = (availW - g * (cols - 1)) / cols
  const cellH = (availH - g * (rowsCount - 1)) / rowsCount
  const placements = boxes.map((box, i) => {
    const aspect = box.w / box.h
    const width = Math.min(cellW, cellH * aspect)
    const height = width / aspect
    const col = i % cols
    const row = Math.floor(i / cols)
    return {
      instanceId: box.item.instanceId,
      x: padding + col * (cellW + g) + (cellW - width) / 2,
      y: padding + row * (cellH + g) + (cellH - height) / 2,
      width,
      height,
    }
  })
  return { size, placements, strategy: 'grid' }
}
