import { describe, expect, it } from 'vitest'
import {
  createDownloader,
  ExportError,
  exportFileName,
  exportSize,
  renderSceneToBlob,
  toExportError,
} from './exportImage'
import { buildSetScene, type SceneInput } from './setScene'

describe('exportSize', () => {
  const ratioError = (
    logical: { width: number; height: number },
    out: { width: number; height: number },
  ) => Math.abs(out.height - (logical.height * out.width) / logical.width)

  it.each([
    ['landscape', { width: 1200, height: 655 }, { width: 2400, height: 1310 }],
    ['portrait', { width: 1200, height: 1800 }, { width: 1600, height: 2400 }],
    ['square', { width: 1200, height: 1200 }, { width: 2400, height: 2400 }],
    ['odd ratio', { width: 1200, height: 487.3 }, { width: 2400, height: 975 }],
  ])('makes the long edge exactly 2400 px for a %s composition', (_, logical, expected) => {
    const out = exportSize(logical)!
    expect(out).toEqual(expected)
    expect(Math.max(out.width, out.height)).toBe(2400)
    expect(ratioError(logical, out)).toBeLessThanOrEqual(1)
  })

  it('rejects invalid sizes instead of producing a canvas', () => {
    for (const bad of [
      { width: 0, height: 100 },
      { width: -5, height: 100 },
      { width: Number.NaN, height: 100 },
      { width: Infinity, height: 100 },
    ]) {
      expect(exportSize(bad)).toBeNull()
    }
    expect(exportSize({ width: 100, height: 100 }, 0)).toBeNull()
    expect(exportSize({ width: 100, height: 100 }, 99999)).toBeNull()
    // A short edge that would round to 0 px is refused rather than producing an empty canvas.
    expect(exportSize({ width: 100000, height: 1 }, 100)).toBeNull()
  })
})

describe('exportFileName', () => {
  it('uses local time and contains no customer content', () => {
    expect(exportFileName(new Date(2026, 0, 5, 3, 4, 9))).toBe('lituta-bo-qua-20260105-030409.png')
    expect(exportFileName(new Date(2026, 11, 31, 23, 59, 59))).toBe(
      'lituta-bo-qua-20261231-235959.png',
    )
  })
})

describe('toExportError', () => {
  it('maps SecurityError to a tainted-canvas error and keeps typed errors', () => {
    expect(toExportError(new DOMException('x', 'SecurityError')).code).toBe('tainted')
    const typed = new ExportError('font')
    expect(toExportError(typed)).toBe(typed)
    expect(toExportError(new Error('boom')).code).toBe('render')
    expect(toExportError('weird').code).toBe('render')
  })
})

describe('createDownloader', () => {
  function setup() {
    const timers = new Map<number, () => void>()
    let nextTimer = 1
    const clicked: Array<[string, string]> = []
    const revoked: string[] = []
    let n = 0
    const downloader = createDownloader({
      createObjectURL: () => `blob:${++n}`,
      revokeObjectURL: (url) => revoked.push(url),
      click: (url, name) => clicked.push([url, name]),
      setTimeout: (cb) => {
        timers.set(nextTimer, cb)
        return nextTimer++
      },
      clearTimeout: (h) => timers.delete(h as number),
      ttlMs: 60_000,
    })
    return { downloader, timers, clicked, revoked }
  }

  it('does not revoke the URL when the download starts, but after its time limit', () => {
    const { downloader, timers, clicked, revoked } = setup()
    downloader.download(new Blob(['x']), 'a.png')
    expect(clicked).toEqual([['blob:1', 'a.png']])
    expect(revoked).toEqual([])
    expect(downloader.pending()).toBe(1)
    ;[...timers.values()][0]!()
    expect(revoked).toEqual(['blob:1'])
    expect(downloader.pending()).toBe(0)
  })

  it('does not accumulate URLs: unmount revokes what is left once and cancels timers', () => {
    const { downloader, timers, revoked } = setup()
    downloader.download(new Blob(['x']), 'a.png')
    downloader.download(new Blob(['y']), 'b.png')
    expect(downloader.pending()).toBe(2)
    downloader.dispose()
    downloader.dispose()
    expect(revoked).toEqual(['blob:1', 'blob:2'])
    expect(timers.size).toBe(0)
    expect(downloader.pending()).toBe(0)
  })

  it('revokes immediately when starting the download fails', () => {
    const revoked: string[] = []
    const downloader = createDownloader({
      createObjectURL: () => 'blob:9',
      revokeObjectURL: (url) => revoked.push(url),
      click: () => {
        throw new Error('blocked')
      },
      setTimeout: () => 1,
      clearTimeout: () => {},
    })
    expect(() => downloader.download(new Blob(['x']), 'a.png')).toThrow('blocked')
    expect(revoked).toEqual(['blob:9'])
    expect(downloader.pending()).toBe(0)
  })
})

describe('set scene (shared by preview and export)', () => {
  const img = (w: number, h: number) => ({
    element: { width: w, height: h } as HTMLImageElement,
    width: w,
    height: h,
  })
  const zone = {
    id: 'z',
    name: 'Z',
    x: 0.2,
    y: 0.2,
    width: 0.4,
    height: 0.2,
    allowedContent: ['text' as const],
  }
  const placement = (id: string, x: number) => ({
    instanceId: id,
    x,
    y: 50,
    width: 400,
    height: 300,
  })
  const source = (id: string, withImage = true) => ({
    instanceId: id,
    position: 1,
    name: id,
    zones: [zone],
    productImage: withImage ? img(1024, 768) : null,
    designOf: () => undefined,
  })
  const input = (
    sources: SceneInput['sources'],
    placements: SceneInput['placements'],
  ): SceneInput => ({
    size: { width: 1200, height: 600 },
    background: img(1200, 600),
    placements,
    sources,
    resources: { textLayoutOf: () => null, imageOf: () => undefined },
  })

  it('is complete only when every item appears once with its product image', () => {
    const ok = buildSetScene(
      input([source('a'), source('b')], [placement('a', 10), placement('b', 500)]),
    )
    expect(ok.complete).toBe(true)
    expect(ok.items.map((i) => i.instanceId)).toEqual(['a', 'b'])

    expect(buildSetScene(input([source('a'), source('b')], [placement('a', 10)])).complete).toBe(
      false,
    )
    expect(buildSetScene(input([source('a', false)], [placement('a', 10)])).complete).toBe(false)
    // A placement for a removed item is ignored; a repeated placement counts once.
    const extra = buildSetScene(
      input([source('a')], [placement('a', 10), placement('gone', 200), placement('a', 300)]),
    )
    expect(extra.items).toHaveLength(1)
    expect(extra.complete).toBe(true)
  })

  it('refuses to render an incomplete scene', async () => {
    const scene = buildSetScene(input([source('a', false)], [placement('a', 10)]))
    await expect(
      renderSceneToBlob({ scene, size: { width: 2400, height: 1200 }, fallbackFill: '#fff' }),
    ).rejects.toMatchObject({ code: 'resource' })
  })
})
