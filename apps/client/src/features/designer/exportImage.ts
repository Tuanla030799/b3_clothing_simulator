import type KonvaTypes from 'konva'
import { EXPORT } from './data/designOptions'
import type { Size } from './geometry'
import type { SetScene } from './setScene'

/*
 * PNG export of the set: pure sizing/naming helpers, the offscreen Konva renderer and the download
 * helper. The renderer draws the shared SetScene (background layer + set layer, no UI layers) into
 * a detached stage it creates and always destroys; it never touches the preview stage or the DOM.
 */

export type ExportErrorCode =
  'not-ready' | 'invalid-size' | 'resource' | 'font' | 'tainted' | 'blob' | 'render'

export class ExportError extends Error {
  constructor(
    readonly code: ExportErrorCode,
    message?: string,
  ) {
    super(message ?? code)
    this.name = 'ExportError'
  }
}

export const exportErrorMessages: Record<ExportErrorCode, string> = {
  'not-ready': 'Bộ chưa sẵn sàng để tải ảnh.',
  'invalid-size': 'Không xác định được kích thước ảnh. Hãy thử lại.',
  resource: 'Một số ảnh hoặc hình trong bộ không còn dùng được. Hãy kiểm tra lại rồi thử lại.',
  font: 'Chưa tải được kiểu chữ thêu. Hãy thử lại.',
  tainted: 'Trình duyệt không cho phép tạo ảnh từ một hình trong bộ. Hãy thử lại với hình khác.',
  blob: 'Không tạo được file ảnh. Hãy thử lại.',
  render: 'Có lỗi khi tạo ảnh. Bộ đồ của bạn vẫn được giữ nguyên, hãy thử lại.',
}

/** Maps any thrown value to a typed ExportError (SecurityError means a tainted canvas). */
export function toExportError(error: unknown): ExportError {
  if (error instanceof ExportError) return error
  if (error instanceof DOMException && error.name === 'SecurityError') {
    return new ExportError('tainted', error.message)
  }
  if (typeof error === 'object' && error && (error as { name?: string }).name === 'SecurityError') {
    return new ExportError('tainted')
  }
  return new ExportError('render', error instanceof Error ? error.message : undefined)
}

/**
 * Output size from the logical composition size only (never from CSS size, viewport or
 * devicePixelRatio): the long edge is exactly `longEdge`, the other edge is rounded, so the aspect
 * ratio error is below one pixel. Returns null for invalid input.
 */
export function exportSize(logical: Size, longEdge: number = EXPORT.longEdge): Size | null {
  const { width, height } = logical
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null
  if (!Number.isInteger(longEdge) || longEdge < 1 || longEdge > EXPORT.maxEdge) return null
  const scale = longEdge / Math.max(width, height)
  const out = {
    width: width >= height ? longEdge : Math.round(width * scale),
    height: height > width ? longEdge : Math.round(height * scale),
  }
  return out.width >= 1 && out.height >= 1 ? out : null
}

const pad = (value: number, length = 2) => String(value).padStart(length, '0')

/** `lituta-bo-qua-YYYYMMDD-HHmmss.png` in local time. */
export function exportFileName(date: Date): string {
  const day = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`
  const time = `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  return `${EXPORT.fileNamePrefix}-${day}-${time}.png`
}

export interface RenderInput {
  scene: SetScene
  /** Target pixel size; independent of the viewport. */
  size: Size
  /** Fill used when the scene has no background image (the intended neutral background). */
  fallbackFill: string
}

/**
 * Renders the scene to a PNG Blob. The Konva stage is created detached with a 1×1 size (its layer
 * buffers stay tiny whatever the device pixel ratio) and the final canvas is made with an explicit
 * size and pixelRatio 1, so the result is exactly `size` pixels. Everything created here is
 * released in `finally`, on success and on failure.
 */
export async function renderSceneToBlob({ scene, size, fallbackFill }: RenderInput): Promise<Blob> {
  if (!scene.complete) throw new ExportError('resource')
  const { default: Konva } = await import('konva')

  const host = document.createElement('div')
  const stage = new Konva.Stage({ container: host, width: 1, height: 1 })
  let canvas: HTMLCanvasElement | null = null
  try {
    // Uniform scale from logical units. The background fills the whole output (the sub-pixel
    // difference between the scaled height and the rounded height is under one pixel).
    const scale = Math.max(size.width, size.height) / Math.max(scene.size.width, scene.size.height)
    const background = new Konva.Layer({ listening: false, name: 'background' })
    background.add(
      scene.background
        ? new Konva.Image({ image: scene.background, width: size.width, height: size.height })
        : new Konva.Rect({ width: size.width, height: size.height, fill: fallbackFill }),
    )

    const set = new Konva.Layer({ listening: false, name: 'set', scaleX: scale, scaleY: scale })
    for (const item of scene.items) {
      if (!item.image) throw new ExportError('resource')
      const group = new Konva.Group({ id: `set-${item.instanceId}`, x: item.x, y: item.y })
      group.add(new Konva.Image({ image: item.image, width: item.width, height: item.height }))
      for (const zone of item.zones) {
        const zoneGroup = new Konva.Group({
          x: zone.x,
          y: zone.y,
          clip: { x: 0, y: 0, width: zone.width, height: zone.height },
        })
        for (const layer of zone.layers) {
          zoneGroup.add(
            layer.kind === 'image'
              ? new Konva.Image(layer.config as KonvaTypes.ImageConfig)
              : new Konva.Shape(layer.config as KonvaTypes.ShapeConfig),
          )
        }
        group.add(zoneGroup)
      }
      set.add(group)
    }
    stage.add(background, set)

    canvas = stage.toCanvas({
      x: 0,
      y: 0,
      width: size.width,
      height: size.height,
      pixelRatio: 1,
    })
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas!.toBlob(resolve, EXPORT.mimeType),
    )
    if (!blob || blob.size === 0) throw new ExportError('blob')
    return blob
  } finally {
    if (canvas) {
      canvas.width = 0
      canvas.height = 0
    }
    stage.destroy()
  }
}

export interface Downloader {
  /** Starts a browser download of the blob. The object URL is revoked later, not immediately. */
  download(blob: Blob, fileName: string): void
  /** Revokes every URL still alive and cancels pending timers. */
  dispose(): void
  /** Number of download URLs not revoked yet (for diagnostics and tests). */
  pending(): number
}

export interface DownloaderDeps {
  createObjectURL: (blob: Blob) => string
  revokeObjectURL: (url: string) => void
  /** Creates, clicks and removes the anchor. */
  click: (url: string, fileName: string) => void
  setTimeout: (callback: () => void, ms: number) => unknown
  clearTimeout: (handle: unknown) => void
  ttlMs: number
}

export function createDownloader(overrides: Partial<DownloaderDeps> = {}): Downloader {
  const deps: DownloaderDeps = {
    createObjectURL: (blob) => URL.createObjectURL(blob),
    revokeObjectURL: (url) => URL.revokeObjectURL(url),
    click(url, fileName) {
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = fileName
      anchor.rel = 'noopener'
      anchor.style.display = 'none'
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
    },
    setTimeout: (callback, ms) => window.setTimeout(callback, ms),
    clearTimeout: (handle) => window.clearTimeout(handle as number),
    ttlMs: EXPORT.downloadUrlTtlMs,
    ...overrides,
  }
  const live = new Map<string, unknown>()

  const revoke = (url: string) => {
    const timer = live.get(url)
    if (timer === undefined && !live.has(url)) return
    deps.clearTimeout(timer)
    live.delete(url)
    deps.revokeObjectURL(url)
  }

  return {
    download(blob, fileName) {
      const url = deps.createObjectURL(blob)
      live.set(
        url,
        deps.setTimeout(() => revoke(url), deps.ttlMs),
      )
      try {
        deps.click(url, fileName)
      } catch (error) {
        revoke(url)
        throw error
      }
    },
    dispose() {
      for (const url of [...live.keys()]) revoke(url)
    },
    pending: () => live.size,
  }
}
