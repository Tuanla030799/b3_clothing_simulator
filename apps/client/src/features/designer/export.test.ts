import { describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick } from 'vue'
import { ExportError, type Downloader, type RenderInput } from './exportImage'
import type { DecodedImage } from './imageFiles'
import type { Background, EmbroideryZone, Product } from './types'
import { useComposition } from './useComposition'
import { useDesigns, type DesignDeps } from './useDesigns'
import { useExport, type ExportDeps } from './useExport'
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

const zone: EmbroideryZone = {
  id: 'chest',
  name: 'Ngực',
  x: 0.3,
  y: 0.3,
  width: 0.4,
  height: 0.2,
  allowedContent: ['text', 'image'],
}
const product = (id: string, src: string | undefined): Product => ({
  id,
  name: id,
  categoryId: id,
  image: { src },
  displayScale: 1,
  embroideryZones: [zone],
  provisional: true,
})
const shirt = product('shirt', 'shirt.png')
const hat = product('hat', 'hat.png')
const noImage = product('missing', undefined)

const bgs: Background[] = [
  { id: 'wide', name: 'Rộng', image: { src: 'wide.jpg' }, provisional: true },
  { id: 'tall', name: 'Cao', image: { src: 'tall.jpg' }, provisional: true },
  { id: 'broken', name: 'Hỏng', image: { src: 'broken.jpg' }, provisional: true },
]
const sizes: Record<string, [number, number]> = {
  'shirt.png': [1024, 768],
  'hat.png': [400, 400],
  'wide.jpg': [1200, 600],
  'tall.jpg': [600, 1200],
}

interface SetupOptions {
  backgrounds?: Background[]
  hold?: string[]
  loadFont?: DesignDeps['loadFont']
  exportDeps?: Partial<ExportDeps>
}

function setup(options: SetupOptions = {}) {
  const scope = effectScope()
  const held = new Map<string, ReturnType<typeof deferred<DecodedImage>>>()
  const revoked: string[] = []
  const decode = (url: string) => {
    if (options.hold?.includes(url)) {
      const d = deferred<DecodedImage>()
      held.set(url, d)
      return d.promise
    }
    const size = url.startsWith('blob:') ? [100, 100] : sizes[url]
    return size ? Promise.resolve(decoded(size[0]!, size[1]!)) : Promise.reject(new Error('404'))
  }
  const download = vi.fn()
  const downloader: Downloader = { download, dispose: vi.fn(), pending: () => 0 }
  const renders: Array<{ input: RenderInput; d: ReturnType<typeof deferred<Blob>> }> = []
  const render = vi.fn((input: RenderInput) => {
    const d = deferred<Blob>()
    renders.push({ input, d })
    return d.promise
  })
  const designDeps: Partial<DesignDeps> = {
    decodeImage: decode,
    measure: (line) => ({
      left: line.length * 10,
      right: line.length * 10,
      ascent: 80,
      descent: 20,
    }),
    loadFont: options.loadFont ?? (async () => true),
    inspectUpload: async () => null,
    createObjectURL: () => 'blob:1',
    revokeObjectURL: (url) => revoked.push(url),
  }
  const ctx = scope.run(() => {
    const selection = useSelection({
      catalog: { products: [shirt, hat, noImage], rules: { maxItems: 10, categoryLimits: {} } },
    })
    const designs = useDesigns(selection, designDeps)
    const composition = useComposition(selection, designs, {
      backgrounds: options.backgrounds ?? bgs,
      defaultBackgroundId: 'wide',
      decodeImage: decode,
    })
    const exporter = useExport(selection, designs, composition, {
      render,
      loadFont: async () => true,
      downloader,
      now: () => new Date(2026, 9, 7, 14, 5, 9),
      fallbackFill: () => '#eeeeee',
      ...options.exportDeps,
    })
    return { selection, designs, composition, exporter }
  })!
  /** Adds items, shows the set view and waits until everything has loaded. */
  async function showSet(...products: string[]) {
    const ids = products.map((id) => ctx.selection.add(id).instanceId!)
    ctx.composition.showSet()
    await nextTick()
    await flush()
    return ids
  }
  return { scope, held, revoked, download, downloader, render, renders, ...ctx, showSet }
}

const pngBlob = () => new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' })

describe('export readiness', () => {
  it('blocks an empty set, also when run() is called directly', async () => {
    const { exporter, render } = setup()
    expect(exporter.block.value).toEqual({ code: 'empty' })
    expect(await exporter.run()).toEqual({ status: 'blocked', reason: 'empty' })
    expect(render).not.toHaveBeenCalled()
  })

  it('only exports from the set view', async () => {
    const { exporter, selection, composition, render } = setup()
    selection.add('shirt')
    expect(composition.mode.value).toBe('item')
    expect(await exporter.run()).toEqual({ status: 'blocked', reason: 'not-set-view' })
    expect(render).not.toHaveBeenCalled()
  })

  it('blocks while resources load and after they fail, then allows once ready', async () => {
    const { exporter, showSet, held, render } = setup({ hold: ['shirt.png'] })
    await showSet('shirt')
    expect(exporter.block.value).toEqual({ code: 'loading' })
    expect(await exporter.run()).toMatchObject({ status: 'blocked', reason: 'loading' })

    held.get('shirt.png')!.reject(new Error('404'))
    await flush()
    expect(exporter.block.value).toEqual({ code: 'resource-error' })
    expect(await exporter.run()).toMatchObject({ status: 'blocked', reason: 'resource-error' })
    expect(render).not.toHaveBeenCalled()
  })

  it('blocks a missing product image instead of exporting a placeholder', async () => {
    const { exporter, showSet, composition, render } = setup()
    const [id] = await showSet('missing')
    expect(composition.layout.value.placements.map((p) => p.instanceId)).toEqual([id])
    expect(exporter.block.value).toEqual({ code: 'resource-error' })
    expect(await exporter.run()).toMatchObject({ status: 'blocked' })
    expect(render).not.toHaveBeenCalled()
  })

  it('blocks when the chosen background failed, even though an older one is still shown', async () => {
    const { exporter, showSet, composition } = setup()
    await showSet('hat')
    expect(exporter.block.value).toBeNull()

    await composition.selectBackground('broken')
    expect(composition.background.value?.id).toBe('wide') // preview keeps the old one
    expect(exporter.block.value).toEqual({ code: 'background-error' })
    expect(await exporter.run()).toMatchObject({ status: 'blocked', reason: 'background-error' })

    await composition.selectBackground('tall') // choosing a working one clears the problem
    expect(exporter.block.value).toBeNull()
    expect(composition.size.value).toEqual({ width: 1200, height: 2400 })
  })

  it('blocks while a background is loading and when the default background cannot load', async () => {
    const loading = setup({ hold: ['wide.jpg'] })
    await loading.showSet('hat')
    expect(loading.exporter.block.value).toEqual({ code: 'loading' })

    const failing = setup({ backgrounds: [bgs[2]!] })
    await failing.showSet('hat')
    expect(failing.exporter.block.value).toEqual({ code: 'background-error' })
  })

  it('exports the neutral fill only when no background is configured at all', async () => {
    const { exporter, showSet, renders } = setup({ backgrounds: [] })
    await showSet('hat')
    expect(exporter.block.value).toBeNull()
    const run = exporter.run()
    await flush()
    expect(renders[0]!.input.scene.background).toBeNull()
    expect(renders[0]!.input.fallbackFill).toBe('#eeeeee')
    renders[0]!.d.resolve(pngBlob())
    expect(await run).toMatchObject({ status: 'started' })
  })

  it('does not export while a text edit is pending or refused', async () => {
    const font = deferred<boolean>()
    let useDeferred = false
    const { exporter, showSet, designs } = setup({
      loadFont: () => (useDeferred ? font.promise : Promise.resolve(true)),
    })
    const [id] = await showSet('shirt')
    expect(await designs.setText(id!, 'chest', 'Minh')).toBe('ok')
    expect(exporter.block.value).toBeNull()

    useDeferred = true
    const edit = designs.setText(id!, 'chest', 'Minh Anh')
    await nextTick()
    expect(exporter.block.value).toEqual({ code: 'pending-edit' }) // not the older "Minh"
    font.resolve(false)
    expect(await edit).toBe('font-error')
    expect(exporter.block.value).toEqual({ code: 'invalid-edit' })
    expect(designs.invalidText(id!, 'chest')).toMatchObject({ content: 'Minh Anh' })

    // Clearing the refused text resolves the conflict.
    designs.removeText(id!, 'chest')
    expect(exporter.block.value).toBeNull()
  })

  it('treats text that does not fit as an unapplied edit', async () => {
    const { exporter, showSet, designs } = setup()
    const [id] = await showSet('shirt')
    await designs.setText(id!, 'chest', 'Minh')
    expect(await designs.setText(id!, 'chest', 'M'.repeat(200))).toBe('too-long')
    expect(exporter.block.value).toEqual({ code: 'invalid-edit' })
    expect(await designs.setText(id!, 'chest', 'Minh Anh')).toBe('ok')
    expect(exporter.block.value).toBeNull()
  })
})

describe('export run', () => {
  it('renders one consistent snapshot, downloads it and leaves all state untouched', async () => {
    const { exporter, showSet, selection, designs, composition, renders, download } = setup()
    const [a, b] = await showSet('shirt', 'shirt')
    await designs.setText(a!, 'chest', 'Nguyễn Minh')
    await designs.setText(b!, 'chest', 'Bảo Ngọc')
    await flush()
    const designBefore = designs.designs.value
    const itemsBefore = selection.items.value
    const layoutBefore = composition.layout.value

    const run = exporter.run()
    await flush()
    expect(renders).toHaveLength(1)
    const { scene, size } = renders[0]!.input
    expect(scene.complete).toBe(true)
    expect(scene.items.map((item) => item.instanceId).sort()).toEqual([a, b].sort())
    expect(scene.items.every((item) => item.zones[0]!.layers.some((l) => l.kind === 'text'))).toBe(
      true,
    )
    expect(scene.size).toEqual(composition.size.value)
    expect(size).toEqual({ width: 2400, height: 1200 }) // 1200 × 600 background, long edge 2400

    renders[0]!.d.resolve(pngBlob())
    const outcome = await run
    expect(outcome).toEqual({
      status: 'started',
      fileName: 'lituta-bo-qua-20261007-140509.png',
      width: 2400,
      height: 1200,
    })
    expect(download).toHaveBeenCalledTimes(1)
    expect(download.mock.calls[0]![1]).toBe('lituta-bo-qua-20261007-140509.png')
    expect(exporter.notice.value).toBe('Đã bắt đầu tải ảnh.')

    // Export never mutates application state.
    expect(designs.designs.value).toBe(designBefore)
    expect(selection.items.value).toBe(itemsBefore)
    expect(composition.layout.value).toEqual(layoutBefore)
    expect(selection.lock.locked.value).toBe(false)
  })

  it('names the file without customer text and sizes it from the logical composition only', async () => {
    const { exporter, showSet, designs, renders, composition } = setup()
    const [id] = await showSet('hat')
    await designs.setText(id!, 'chest', 'Bảo Ngọc')
    await composition.selectBackground('tall')
    const run = exporter.run()
    await flush()
    expect(renders[0]!.input.size).toEqual({ width: 1200, height: 2400 })
    renders[0]!.d.resolve(pngBlob())
    const outcome = await run
    expect(outcome.status === 'started' && outcome.fileName).toMatch(
      /^lituta-bo-qua-\d{8}-\d{6}\.png$/,
    )
    expect(JSON.stringify(outcome)).not.toContain('Bảo')
  })

  it('accepts only one export at a time', async () => {
    const { exporter, showSet, renders, render } = setup()
    await showSet('hat')
    const first = exporter.run()
    const second = exporter.run()
    expect(exporter.exporting.value).toBe(true)
    expect(await second).toEqual({ status: 'blocked', reason: 'exporting' })
    await flush()
    expect(render).toHaveBeenCalledTimes(1)
    renders[0]!.d.resolve(pngBlob())
    expect(await first).toMatchObject({ status: 'started' })
    expect(exporter.exporting.value).toBe(false)
  })

  it('refuses set, design and background changes while exporting, then unlocks', async () => {
    const { exporter, showSet, selection, designs, composition, renders } = setup()
    const [id] = await showSet('shirt')
    await designs.setText(id!, 'chest', 'Minh')
    const run = exporter.run()
    await flush()
    expect(selection.lock.locked.value).toBe(true)

    expect(selection.add('hat')).toMatchObject({ ok: false, reason: { code: 'locked' } })
    expect(selection.canAdd('hat')).toMatchObject({ ok: false })
    selection.remove(id!)
    expect(selection.items.value).toHaveLength(1)
    expect(await designs.setText(id!, 'chest', 'Khác')).toBe('locked')
    expect(await designs.setPresetImage(id!, 'chest', 'icon')).toBe('locked')
    expect(
      await designs.setUploadImage(id!, 'chest', new File([new Uint8Array([1])], 'a.png')),
    ).toBe('locked')
    designs.removeText(id!, 'chest')
    designs.setTextColor(id!, 'chest', 'navy')
    expect(
      designs.setTransform(id!, 'chest', 'text', { x: 0.5, y: 0.5, height: 0.1, rotation: 0 }),
    ).toBe(false)
    await composition.selectBackground('tall')
    expect(composition.background.value?.id).toBe('wide')
    expect(designs.zoneDesign(id!, 'chest')?.text).toMatchObject({
      content: 'Minh',
      colorId: 'dark-brown',
    })

    renders[0]!.d.resolve(pngBlob())
    await run
    expect(selection.lock.locked.value).toBe(false)
    expect(selection.add('hat')).toMatchObject({ ok: true })
  })

  it('always unlocks after a failure, reports it, keeps the set, and a retry works', async () => {
    const { exporter, showSet, selection, designs, renders, download } = setup()
    const [id] = await showSet('shirt')
    await designs.setText(id!, 'chest', 'Minh')
    const before = designs.designs.value

    const failed = exporter.run()
    await flush()
    renders[0]!.d.reject(new Error('boom'))
    const outcome = await failed
    expect(outcome).toMatchObject({ status: 'failed', error: { code: 'render' } })
    expect(exporter.error.value?.code).toBe('render')
    expect(exporter.exporting.value).toBe(false)
    expect(selection.lock.locked.value).toBe(false)
    expect(designs.designs.value).toBe(before)
    expect(download).not.toHaveBeenCalled()

    const retry = exporter.run()
    await flush()
    expect(exporter.error.value).toBeNull()
    renders[1]!.d.resolve(pngBlob())
    expect(await retry).toMatchObject({ status: 'started' })
    expect(download).toHaveBeenCalledTimes(1)
  })

  it('maps a tainted canvas to its own error and never downloads', async () => {
    const { exporter, showSet, renders, download } = setup()
    await showSet('hat')
    const run = exporter.run()
    await flush()
    renders[0]!.d.reject(new DOMException('tainted', 'SecurityError'))
    expect(await run).toMatchObject({ status: 'failed', error: { code: 'tainted' } })
    expect(download).not.toHaveBeenCalled()
  })

  it('refuses to render when the lettering font cannot be confirmed', async () => {
    const { exporter, showSet, designs, render, selection } = setup({
      exportDeps: { loadFont: async () => false },
    })
    const [id] = await showSet('shirt')
    await designs.setText(id!, 'chest', 'Minh')
    const outcome = await exporter.run()
    expect(outcome).toMatchObject({ status: 'failed', error: { code: 'font' } })
    expect(render).not.toHaveBeenCalled()
    expect(selection.lock.locked.value).toBe(false)
  })

  it('does not revoke upload URLs and disposes its downloads on unmount', async () => {
    const { scope, exporter, showSet, designs, revoked, renders, downloader } = setup()
    const [id] = await showSet('shirt')
    expect(
      await designs.setUploadImage(id!, 'chest', new File([new Uint8Array([1])], 'logo.png')),
    ).toBe('ok')
    await flush()
    const run = exporter.run()
    await flush()
    expect(renders[0]!.input.scene.items[0]!.zones[0]!.layers.map((l) => l.kind)).toContain('image')
    renders[0]!.d.resolve(pngBlob())
    await run
    expect(revoked).toEqual([])
    expect(designs.liveUploadCount()).toBe(1)

    scope.stop()
    expect(downloader.dispose).toHaveBeenCalledTimes(1)
  })

  it('does not download or touch state when unmounted during the export, and still unlocks', async () => {
    const { scope, exporter, showSet, selection, renders, download } = setup()
    await showSet('hat')
    const run = exporter.run()
    await flush()
    scope.stop()
    renders[0]!.d.resolve(pngBlob())
    expect(await run).toEqual({ status: 'cancelled' })
    expect(download).not.toHaveBeenCalled()
    expect(exporter.error.value).toBeNull()
    expect(selection.lock.locked.value).toBe(false)
  })

  it('reports a renderer that throws synchronously as a failed export and unlocks', async () => {
    const { exporter, showSet, selection, download } = setup({
      exportDeps: {
        render: () => {
          throw new ExportError('blob')
        },
      },
    })
    await showSet('hat')
    expect(await exporter.run()).toMatchObject({ status: 'failed', error: { code: 'blob' } })
    expect(download).not.toHaveBeenCalled()
    expect(selection.lock.locked.value).toBe(false)
  })
})
