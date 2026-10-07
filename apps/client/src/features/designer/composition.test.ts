import { describe, expect, it } from 'vitest'
import { effectScope, nextTick } from 'vue'
import type { ZoneDesign } from './design'
import type { DecodedImage } from './imageFiles'
import { buildProductContent } from './productContent'
import type { TextLayout } from './textLayout'
import type { Background, EmbroideryZone, Product } from './types'
import { useComposition } from './useComposition'
import { useDesigns, type DesignDeps } from './useDesigns'
import { useSelection } from './useSelection'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}
const flush = () => new Promise((r) => setTimeout(r, 0))
const decoded = (width: number, height: number): DecodedImage => ({
  element: { width, height } as HTMLImageElement,
  width,
  height,
})

const chest: EmbroideryZone = {
  id: 'chest',
  name: 'Ngực',
  x: 0.5,
  y: 0.2,
  width: 0.4,
  height: 0.2,
  allowedContent: ['text', 'image'],
}
const back: EmbroideryZone = { ...chest, id: 'back', name: 'Lưng', y: 0.6 }

const layout: TextLayout = { width: 400, height: 100, lines: [{ text: 'Minh', x: 200, y: 80 }] }

describe('shared product content', () => {
  const design: ZoneDesign = Object.freeze({
    text: Object.freeze({
      content: 'Minh',
      fontId: 'dancing-script-600' as const,
      colorId: 'navy',
      transform: Object.freeze({ x: 0.5, y: 0.5, height: 0.5, rotation: 10 }),
    }),
    image: Object.freeze({
      source: Object.freeze({ kind: 'preset' as const, presetId: 'icon' }),
      aspectRatio: 2,
      transform: Object.freeze({ x: 0.25, y: 0.5, height: 0.4, rotation: 0 }),
    }),
  })
  const resources = {
    textLayoutOf: () => layout,
    imageOf: () => decoded(200, 100),
  }

  it('places every designed zone with image below text, relative to the drawn product', () => {
    const zones = buildProductContent(
      [chest, back],
      (id) => (id === 'chest' ? design : undefined),
      { x: 0, y: 0, width: 1000, height: 800 },
      resources,
    )
    const [c, b] = zones
    expect(c!.rect).toEqual({ x: 500, y: 160, width: 400, height: 160 })
    expect(c!.layers.map((l) => l.kind)).toEqual(['image', 'text'])
    const text = c!.layers[1]!
    expect(text.config).toMatchObject({
      x: 200,
      y: 80,
      height: 80,
      width: 320,
      offsetX: 160,
      offsetY: 40,
      rotation: 10,
    })
    const image = c!.layers[0]!
    expect(image.config).toMatchObject({ x: 100, y: 80, height: 64, width: 128 })
    expect(b!.layers).toEqual([])
    // No interaction or editor-only attributes in shared content.
    for (const l of c!.layers) {
      expect(l.config).not.toHaveProperty('draggable')
      expect(l.config).not.toHaveProperty('dragBoundFunc')
    }
  })

  it('keeps design-to-product proportions identical at any drawing size', () => {
    const small = buildProductContent(
      [chest],
      () => design,
      { x: 0, y: 0, width: 200, height: 160 },
      resources,
    )
    const large = buildProductContent(
      [chest],
      () => design,
      { x: 30, y: 40, width: 1000, height: 800 },
      resources,
    )
    const ratio = (zones: typeof small, key: 'x' | 'y' | 'width' | 'height') =>
      (zones[0]!.layers[1]!.config[key] as number) / zones[0]!.rect.width
    for (const key of ['x', 'y', 'width', 'height'] as const) {
      expect(ratio(small, key)).toBeCloseTo(ratio(large, key), 10)
    }
  })

  it('reports layers whose resources are not ready instead of drawing them wrongly', () => {
    const zones = buildProductContent(
      [chest],
      () => design,
      { x: 0, y: 0, width: 100, height: 100 },
      {
        textLayoutOf: () => layout,
        imageOf: () => undefined,
        textReady: () => false,
      },
    )
    expect(zones[0]!.layers).toEqual([])
    expect(zones[0]!.missing).toEqual(['image', 'text'])
  })
})

const product = (id: string, src: string | undefined, categoryId = id): Product => ({
  id,
  name: id,
  categoryId,
  image: { src },
  displayScale: 1,
  embroideryZones: [chest, back],
  provisional: true,
})
const shirt = product('shirt', 'shirt.png', 'shirt')
const hat = { ...product('hat', 'hat.png'), displayScale: 0.5 }
const missing = product('missing', undefined)

const bgs: Background[] = [
  { id: 'wide', name: 'Rộng', image: { src: 'wide.jpg' }, provisional: true },
  { id: 'tall', name: 'Cao', image: { src: 'tall.jpg' }, provisional: true },
  { id: 'broken', name: 'Hỏng', image: { src: 'broken.jpg' }, provisional: true },
]

function setup() {
  const scope = effectScope()
  const pending = new Map<string, ReturnType<typeof deferred<DecodedImage>>>()
  const revoked: string[] = []
  const decode = (url: string) => {
    const d = deferred<DecodedImage>()
    pending.set(url, d)
    return d.promise
  }
  const deps: Partial<DesignDeps> = {
    decodeImage: decode,
    measure: (line) => ({
      left: line.length * 10,
      right: line.length * 10,
      ascent: 80,
      descent: 20,
    }),
    loadFont: async () => true,
    inspectUpload: async () => null,
    createObjectURL: () => 'blob:1',
    revokeObjectURL: (url) => revoked.push(url),
  }
  const ctx = scope.run(() => {
    const selection = useSelection({
      catalog: { products: [shirt, hat, missing], rules: { maxItems: 10, categoryLimits: {} } },
    })
    const designs = useDesigns(selection, deps)
    const composition = useComposition(selection, designs, {
      backgrounds: bgs,
      defaultBackgroundId: 'wide',
      decodeImage: decode,
    })
    return { selection, designs, composition }
  })!
  async function settle(url: string, result: DecodedImage | Error) {
    for (let i = 0; i < 20 && !pending.has(url); i++) await Promise.resolve()
    const d = pending.get(url)
    if (!d) throw new Error(`no pending decode for ${url}`)
    pending.delete(url)
    if (result instanceof Error) d.reject(result)
    else d.resolve(result)
    await flush()
  }
  return { scope, revoked, settle, pending, ...ctx }
}

describe('set composition', () => {
  it('gives repeated products their own placement and survives any decode order', async () => {
    const run = async (order: string[]) => {
      const { selection, composition, settle } = setup()
      selection.add('shirt')
      selection.add('shirt')
      selection.add('hat')
      composition.showSet()
      await nextTick()
      for (const url of order)
        await settle(url, url === 'hat.png' ? decoded(400, 400) : decoded(1024, 768))
      return composition.layout.value
    }
    const a = await run(['shirt.png', 'hat.png', 'wide.jpg'])
    const b = await run(['wide.jpg', 'hat.png', 'shirt.png'])
    expect(a.placements.map((p) => p.instanceId)).toHaveLength(3)
    expect(new Set(a.placements.map((p) => p.instanceId)).size).toBe(3)
    expect(b).toEqual(a)
  })

  it('does not move items when designs change and never mutates designs to render', async () => {
    const { selection, designs, composition, settle } = setup()
    const id = selection.add('shirt').instanceId!
    composition.showSet()
    await nextTick()
    await settle('shirt.png', decoded(1024, 768))
    await settle('wide.jpg', decoded(1200, 600))
    const before = composition.layout.value
    const result = designs.setText(id, 'chest', 'Minh')
    expect(await result).toBe('ok')
    designs.setTextColor(id, 'chest', 'navy')
    await nextTick()
    expect(composition.layout.value).toEqual(before)
    expect(composition.status.value).toBe('ready')
  })

  it('recomputes the layout when items are added or removed and drops removed items', async () => {
    const { selection, composition, settle } = setup()
    const a = selection.add('shirt').instanceId!
    composition.showSet()
    await nextTick()
    await settle('shirt.png', decoded(1024, 768))
    const one = composition.layout.value.placements[0]!
    const b = selection.add('hat').instanceId!
    await nextTick()
    expect(composition.layout.value.placements.map((p) => p.instanceId).sort()).toEqual(
      [a, b].sort(),
    )
    expect(composition.layout.value.placements.find((p) => p.instanceId === a)).not.toEqual(one)
    selection.remove(b)
    await settle('hat.png', decoded(400, 400)) // load finishing after removal
    expect(composition.layout.value.placements.map((p) => p.instanceId)).toEqual([a])
  })

  it('keeps a placeholder placement and reports missing product images', async () => {
    const { selection, composition } = setup()
    const id = selection.add('missing').instanceId!
    composition.showSet()
    await nextTick()
    expect(composition.layout.value.placements.map((p) => p.instanceId)).toEqual([id])
    expect(composition.status.value).toBe('incomplete')
    expect(composition.issues.value[0]).toMatchObject({
      instanceId: id,
      kind: 'product',
      status: 'error',
    })
  })

  it('switches background only after a successful load and keeps the previous one on error', async () => {
    const { selection, composition, settle } = setup()
    selection.add('hat')
    composition.showSet()
    await nextTick()
    await settle('wide.jpg', decoded(1200, 600))
    expect(composition.size.value).toEqual({ width: 1200, height: 600 })

    const failing = composition.selectBackground('broken')
    expect(composition.background.value?.id).toBe('wide') // still the old one while loading
    await settle('broken.jpg', new Error('404'))
    await failing
    expect(composition.background.value?.id).toBe('wide')
    expect(composition.backgroundError.value).toBeTruthy()
  })

  it('ignores an older background load when the customer switches quickly', async () => {
    const { selection, composition, settle } = setup()
    selection.add('hat')
    composition.showSet()
    await nextTick()
    await settle('wide.jpg', decoded(1200, 600))
    const tall = composition.selectBackground('tall')
    const wide = composition.selectBackground('wide')
    await settle('wide.jpg', decoded(1200, 600))
    await settle('tall.jpg', decoded(600, 1200)) // older request finishes last
    await Promise.all([tall, wide])
    expect(composition.background.value?.id).toBe('wide')
    expect(composition.size.value.height).toBe(600)
  })

  it('uses a neutral 4:3 composition when no background can be loaded', async () => {
    const { selection, composition, settle } = setup()
    selection.add('hat')
    composition.showSet()
    await nextTick()
    await settle('wide.jpg', new Error('offline'))
    expect(composition.background.value).toBeNull()
    expect(composition.size.value).toEqual({ width: 1200, height: 900 })
    expect(composition.backgroundError.value).toBeTruthy()
  })

  it('only borrows uploads: leaving the set view keeps them, removal still cleans them', async () => {
    const { scope, selection, designs, composition, revoked, settle } = setup()
    const id = selection.add('shirt').instanceId!
    const upload = designs.setUploadImage(id, 'chest', new File([new Uint8Array([1])], 'logo.png'))
    await settle('blob:1', decoded(100, 100))
    await settle('shirt.png', decoded(1024, 768))
    expect(await upload).toBe('ok')
    composition.showSet()
    await nextTick()
    composition.mode.value = 'item'
    composition.showSet()
    await nextTick()
    expect(revoked).toEqual([])
    expect(designs.imageOf(designs.zoneDesign(id, 'chest')!.image!.source)).toBeDefined()
    selection.remove(id)
    await nextTick()
    expect(revoked).toEqual(['blob:1'])
    scope.stop()
    expect(revoked).toEqual(['blob:1'])
  })
})
