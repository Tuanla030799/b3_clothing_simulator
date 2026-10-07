import { describe, expect, it } from 'vitest'
import { effectScope, nextTick } from 'vue'
import type { DecodedImage } from './imageFiles'
import type { Product } from './types'
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

const zone = (id: string) => ({
  id,
  name: id,
  x: 0.25,
  y: 0.25,
  width: 0.5,
  height: 0.5,
  allowedContent: ['text' as const, 'image' as const],
})

const shirt: Product = {
  id: 'shirt',
  name: 'Shirt',
  categoryId: 'shirt',
  image: { src: 'product.png' },
  displayScale: 1,
  embroideryZones: [zone('chest'), zone('back')],
  provisional: true,
}

const decoded = (width = 200, height = 100): DecodedImage => ({
  element: {} as HTMLImageElement,
  width,
  height,
})

/** Test harness: real selection + designs with controllable browser dependencies. */
function setup(overrides: Partial<DesignDeps> = {}) {
  const scope = effectScope()
  const revoked: string[] = []
  const pendingDecodes = new Map<string, ReturnType<typeof deferred<DecodedImage>>>()
  let urlCounter = 0
  const deps: Partial<DesignDeps> = {
    measure: (line) => ({
      left: line.length * 10,
      right: line.length * 10,
      ascent: 80,
      descent: 20,
    }),
    loadFont: async () => true,
    inspectUpload: async () => null,
    createObjectURL: () => `blob:${++urlCounter}`,
    revokeObjectURL: (url) => revoked.push(url),
    decodeImage: (url) => {
      if (url === 'product.png') return Promise.resolve(decoded(1000, 1000))
      const d = deferred<DecodedImage>()
      pendingDecodes.set(url, d)
      return d.promise
    },
    ...overrides,
  }
  const { selection, designs } = scope.run(() => {
    const selection = useSelection({
      catalog: { products: [shirt], rules: { maxItems: 10, categoryLimits: {} } },
    })
    return { selection, designs: useDesigns(selection, deps) }
  })!
  const file = (name = 'logo.png') => new File([new Uint8Array([1])], name)
  /** Resolves the decode of an object URL once it has been requested. */
  async function settle(url: string, result: DecodedImage | Error = decoded()) {
    for (let i = 0; i < 20 && !pendingDecodes.has(url); i++) await Promise.resolve()
    const d = pendingDecodes.get(url)!
    if (result instanceof Error) d.reject(result)
    else d.resolve(result)
    await new Promise((r) => setTimeout(r, 0))
  }
  return { scope, selection, designs, revoked, file, settle }
}

describe('design state', () => {
  it('keeps two instances of the same product independent', async () => {
    const { selection, designs } = setup()
    const a = selection.add('shirt').instanceId!
    const b = selection.add('shirt').instanceId!
    expect(await designs.setText(a, 'chest', 'Minh')).toBe('ok')
    expect(await designs.setText(b, 'chest', 'Ngọc')).toBe('ok')
    designs.setTextColor(b, 'chest', 'navy')

    expect(designs.zoneDesign(a, 'chest')?.text).toMatchObject({
      content: 'Minh',
      colorId: 'dark-brown',
    })
    expect(designs.zoneDesign(b, 'chest')?.text).toMatchObject({ content: 'Ngọc', colorId: 'navy' })
    expect(designs.zoneDesign(a, 'chest')!.text!.transform).not.toBe(
      designs.zoneDesign(b, 'chest')!.text!.transform,
    )
  })

  it('keeps zones independent and survives switching items and zones', async () => {
    const { selection, designs } = setup()
    const a = selection.add('shirt').instanceId!
    await designs.setText(a, 'chest', 'Minh')
    await designs.setText(a, 'back', 'Bảo')
    designs.selectZone('back')
    const b = selection.add('shirt').instanceId!
    expect(designs.currentZone.value?.id).toBe('chest') // new item starts at its first zone
    selection.select(a)
    expect(designs.currentZone.value?.id).toBe('back') // remembered zone restored
    expect(designs.zoneDesign(a, 'chest')?.text?.content).toBe('Minh')
    expect(designs.zoneDesign(a, 'back')?.text?.content).toBe('Bảo')
    expect(designs.zoneDesign(b, 'chest')).toBeUndefined()
  })

  it('removes text without touching the image, and the image without touching the text', async () => {
    const { selection, designs, file, settle } = setup()
    const a = selection.add('shirt').instanceId!
    await designs.setText(a, 'chest', 'Minh')
    const upload = designs.setUploadImage(a, 'chest', file())
    await settle('blob:1')
    expect(await upload).toBe('ok')

    designs.removeText(a, 'chest')
    expect(designs.zoneDesign(a, 'chest')).toMatchObject({ image: expect.anything() })
    expect(designs.zoneDesign(a, 'chest')?.text).toBeUndefined()

    await designs.setText(a, 'chest', 'Minh')
    designs.removeImage(a, 'chest')
    expect(designs.zoneDesign(a, 'chest')?.text?.content).toBe('Minh')
    expect(designs.zoneDesign(a, 'chest')?.image).toBeUndefined()
  })

  it('cleans designs, selection and object URLs when an item is removed by any path', async () => {
    const { selection, designs, revoked, file, settle } = setup()
    const a = selection.add('shirt').instanceId!
    const b = selection.add('shirt').instanceId!
    selection.select(a)
    await designs.setText(a, 'chest', 'Minh')
    const upload = designs.setUploadImage(a, 'chest', file())
    await settle('blob:1')
    await upload
    designs.selectLayer('chest', 'image')

    selection.remove(a)
    await nextTick()
    expect(designs.designs.value[a]).toBeUndefined()
    expect(revoked).toEqual(['blob:1'])
    expect(designs.liveUploadCount()).toBe(0)
    expect(designs.currentLayer.value).toBeNull()
    expect(selection.activeInstanceId.value).toBe(b)
  })

  it('treats blank text as no text and rejects text that cannot fit', async () => {
    const { selection, designs } = setup()
    const a = selection.add('shirt').instanceId!
    expect(await designs.setText(a, 'chest', '   \n ')).toBe('cleared')
    expect(designs.zoneDesign(a, 'chest')).toBeUndefined()

    await designs.setText(a, 'chest', 'Minh')
    expect(await designs.setText(a, 'chest', 'M'.repeat(200))).toBe('too-long')
    expect(designs.zoneDesign(a, 'chest')?.text?.content).toBe('Minh')
  })

  it('shrinks existing text only as much as needed and keeps its placement', async () => {
    const { selection, designs } = setup()
    const a = selection.add('shirt').instanceId!
    await designs.setText(a, 'chest', 'Minh')
    const before = designs.zoneDesign(a, 'chest')!.text!.transform
    await designs.setText(a, 'chest', 'Minhh')
    expect(designs.zoneDesign(a, 'chest')!.text!.transform).toEqual(before)
    await designs.setText(a, 'chest', 'Nguyễn Văn Minh')
    const after = designs.zoneDesign(a, 'chest')!.text!.transform
    expect(after.height).toBeLessThan(before.height)
    expect(after.rotation).toBe(before.rotation)
  })
})

describe('async edits', () => {
  it('does not measure or store text when the font is not ready', async () => {
    let fontOk = false
    const { selection, designs } = setup({ loadFont: async () => fontOk })
    const a = selection.add('shirt').instanceId!
    expect(await designs.setText(a, 'chest', 'Đậu')).toBe('font-error')
    expect(designs.fontStatus.value).toBe('error')
    expect(designs.zoneDesign(a, 'chest')).toBeUndefined()
    fontOk = true
    expect(await designs.setText(a, 'chest', 'Đậu')).toBe('ok')
    expect(designs.fontStatus.value).toBe('ready')
  })

  it('keeps the previous image when a new upload fails', async () => {
    const { selection, designs, revoked, file, settle } = setup()
    const a = selection.add('shirt').instanceId!
    const first = designs.setUploadImage(a, 'chest', file('a.png'))
    await settle('blob:1')
    await first
    const failing = designs.setUploadImage(a, 'chest', file('b.png'))
    await settle('blob:2', new Error('corrupt'))
    expect(await failing).toBe('decode-failed')
    expect(designs.zoneDesign(a, 'chest')?.image?.source).toMatchObject({ fileName: 'a.png' })
    expect(revoked).toEqual(['blob:2'])
  })

  it('keeps the previous image when the file is rejected before decoding', async () => {
    let problem: 'unsupported-type' | null = null
    const { selection, designs, file, settle } = setup({ inspectUpload: async () => problem })
    const a = selection.add('shirt').instanceId!
    const first = designs.setUploadImage(a, 'chest', file('a.png'))
    await settle('blob:1')
    await first
    problem = 'unsupported-type'
    expect(await designs.setUploadImage(a, 'chest', file('x.svg'))).toBe('unsupported-type')
    expect(designs.zoneDesign(a, 'chest')?.image?.source).toMatchObject({ fileName: 'a.png' })
  })

  it('never lets an older load overwrite a newer one', async () => {
    const { selection, designs, revoked, file, settle } = setup()
    const a = selection.add('shirt').instanceId!
    const older = designs.setUploadImage(a, 'chest', file('old.png'))
    const newer = designs.setUploadImage(a, 'chest', file('new.png'))
    await settle('blob:2')
    expect(await newer).toBe('ok')
    await settle('blob:1')
    expect(await older).toBe('stale')
    expect(designs.zoneDesign(a, 'chest')?.image?.source).toMatchObject({ fileName: 'new.png' })
    expect(revoked).toEqual(['blob:1'])
    expect(designs.liveUploadCount()).toBe(1)
  })

  it('attaches a slow load to the item that started it, not the newly active item', async () => {
    const { selection, designs, file, settle } = setup()
    const a = selection.add('shirt').instanceId!
    const upload = designs.setUploadImage(a, 'chest', file())
    const b = selection.add('shirt').instanceId! // b becomes active while a is loading
    await settle('blob:1')
    expect(await upload).toBe('ok')
    expect(selection.activeInstanceId.value).toBe(b)
    expect(designs.zoneDesign(a, 'chest')?.image).toBeDefined()
    expect(designs.zoneDesign(b, 'chest')).toBeUndefined()
  })

  it('does not resurrect a removed item when its load finishes', async () => {
    const { selection, designs, revoked, file, settle } = setup()
    const a = selection.add('shirt').instanceId!
    const upload = designs.setUploadImage(a, 'chest', file())
    selection.remove(a)
    await nextTick()
    await settle('blob:1')
    expect(await upload).toBe('stale')
    expect(designs.designs.value).toEqual({})
    expect(revoked).toEqual(['blob:1'])
    expect(designs.liveUploadCount()).toBe(0)
  })

  it('revokes every object URL it created when the feature unmounts, and nothing else', async () => {
    const { scope, selection, designs, revoked, file, settle } = setup()
    const a = selection.add('shirt').instanceId!
    const upload = designs.setUploadImage(a, 'chest', file())
    await settle('blob:1')
    await upload
    const preset = designs.setPresetImage(a, 'back', 'icon')
    for (let i = 0; i < 5; i++) await Promise.resolve()
    scope.stop()
    expect(revoked).toEqual(['blob:1'])
    void preset
  })
})

describe('transforms', () => {
  it('applies valid transforms and rejects ones that leave the zone or flip', async () => {
    const { selection, designs } = setup()
    const a = selection.add('shirt').instanceId!
    await designs.setText(a, 'chest', 'Minh')
    const t = designs.zoneDesign(a, 'chest')!.text!.transform
    expect(designs.setTransform(a, 'chest', 'text', { ...t, x: 0.4 })).toBe(true)
    expect(designs.setTransform(a, 'chest', 'text', { ...t, x: 0.99 })).toBe(false)
    expect(designs.setTransform(a, 'chest', 'text', { ...t, height: -t.height })).toBe(false)
    expect(designs.setTransform(a, 'chest', 'text', { ...t, height: 0 })).toBe(false)
    expect(designs.zoneDesign(a, 'chest')!.text!.transform.x).toBe(0.4)
  })

  it('uses the same bounds for DOM controls', async () => {
    const { selection, designs } = setup()
    const a = selection.add('shirt').instanceId!
    await designs.setText(a, 'chest', 'Minh')
    const layer = { instanceId: a, zoneId: 'chest', kind: 'text' as const }
    for (let i = 0; i < 50; i++) designs.layerTools.move(layer, 0.05, 0)
    designs.layerTools.resize(layer, 99)
    const limits = designs.layerTools.limits(layer)!
    const t = designs.zoneDesign(a, 'chest')!.text!.transform
    expect(t.height).toBeCloseTo(limits.max)
    expect(designs.layerTools.rotate(layer, 45)).toBe(false) // max size cannot rotate
    expect(designs.layerTools.resize(layer, limits.min)).toBe(true)
    expect(designs.layerTools.rotate(layer, 45)).toBe(true)
  })
})
