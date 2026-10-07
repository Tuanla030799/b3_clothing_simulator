import { computed, inject, onScopeDispose, provide, ref, type InjectionKey } from 'vue'
import { EXPORT } from './data/designOptions'
import {
  createDownloader,
  ExportError,
  exportFileName,
  exportSize,
  renderSceneToBlob,
  toExportError,
  type Downloader,
  type RenderInput,
} from './exportImage'
import { captureSceneInput } from './sceneInput'
import { buildSetScene } from './setScene'
import { loadDesignFont } from './textLayout'
import type { Composition, ExportBlockCode } from './useComposition'
import type { Designs } from './useDesigns'
import type { Selection } from './useSelection'

/*
 * "Tải ảnh": export the whole set as a PNG.
 *
 * Flow of run(): check readiness → take the edit lock (before the first await) → confirm the fonts
 * → re-check → snapshot the scene (plain data and decoded images of that moment) → render → start
 * the download → release the lock in `finally`. While the lock is held the gift set, designs and
 * background cannot change (their mutation functions refuse), so the PNG always equals the preview
 * the customer saw when pressing the button.
 *
 * Ownership: the exporter only borrows decoded images from useDesigns/useComposition (it never
 * revokes upload URLs). It owns the temporary stage/canvas (released by the renderer), the Blob
 * and the download object URL (revoked later by the downloader and on unmount).
 */

export type ExportBlock = { code: ExportBlockCode | 'not-set-view' | 'exporting' }

export type ExportOutcome =
  | { status: 'started'; fileName: string; width: number; height: number }
  | { status: 'blocked'; reason: ExportBlock['code'] }
  | { status: 'failed'; error: ExportError }
  | { status: 'cancelled' }

export interface ExportDeps {
  render: (input: RenderInput) => Promise<Blob>
  loadFont: (text: string) => Promise<boolean>
  downloader: Downloader
  now: () => Date
  fallbackFill: () => string
}

function themeFill(): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue('--muted').trim()
  return value || '#f3eee7'
}

export const exportBlockMessages: Record<ExportBlock['code'], string> = {
  empty: 'Chưa chọn sản phẩm nào.',
  'not-set-view': 'Chuyển sang “Cả bộ” để tải ảnh.',
  loading: 'Đang tải ảnh và chữ…',
  'resource-error': 'Có ảnh hoặc kiểu chữ chưa tải được. Hãy thử lại.',
  'background-error': 'Chưa tải được nền đã chọn. Hãy thử lại hoặc chọn nền khác.',
  'pending-edit': 'Đang áp dụng thay đổi…',
  'invalid-edit': 'Có nội dung chữ chưa hợp lệ. Hãy sửa hoặc xóa trước khi tải ảnh.',
  layout: 'Bố cục chưa sẵn sàng.',
  exporting: 'Đang tạo ảnh…',
}

export function useExport(
  selection: Selection,
  designs: Designs,
  composition: Composition,
  overrides: Partial<ExportDeps> = {},
) {
  const deps: ExportDeps = {
    render: renderSceneToBlob,
    loadFont: (text) => loadDesignFont(text),
    downloader: createDownloader(),
    now: () => new Date(),
    fallbackFill: themeFill,
    ...overrides,
  }

  const exporting = ref(false)
  const error = ref<ExportError | null>(null)
  const notice = ref<string | null>(null)
  let disposed = false
  let noticeTimer: ReturnType<typeof setTimeout> | undefined

  /** The single readiness check used by the button, the status text and run() itself. */
  const block = computed<ExportBlock | null>(() => {
    if (exporting.value) return { code: 'exporting' }
    if (composition.mode.value !== 'set') {
      return selection.entries.value.length === 0 ? { code: 'empty' } : { code: 'not-set-view' }
    }
    const readiness = composition.exportReadiness.value
    return readiness.ok ? null : { code: readiness.code }
  })

  const canExport = computed(() => block.value === null)

  function setNotice(message: string | null) {
    clearTimeout(noticeTimer)
    notice.value = message
    if (message) noticeTimer = setTimeout(() => (notice.value = null), 8000)
  }

  async function run(): Promise<ExportOutcome> {
    const blocked = block.value
    if (blocked) return { status: 'blocked', reason: blocked.code }

    const release = selection.lock.acquire()
    if (!release) return { status: 'blocked', reason: 'exporting' }
    // Set before the first await so a second call cannot start.
    exporting.value = true
    error.value = null
    setNotice(null)

    try {
      // Confirm the lettering font for every text now; never render with a fallback font.
      const texts = new Set<string>()
      for (const zones of Object.values(designs.designs.value)) {
        for (const zone of Object.values(zones)) if (zone.text) texts.add(zone.text.content)
      }
      for (const content of texts) {
        if (!(await deps.loadFont(content))) throw new ExportError('font')
      }
      if (disposed) return { status: 'cancelled' }

      // The lock keeps the state still; check again anyway, then take the snapshot.
      const readiness = composition.exportReadiness.value
      if (!readiness.ok) throw new ExportError('not-ready', readiness.code)
      const input = captureSceneInput(selection, designs, {
        size: composition.size.value,
        background: composition.background.value?.image ?? null,
        placements: composition.layout.value.placements,
      })
      const scene = buildSetScene(input)
      if (!scene.complete) throw new ExportError('resource')
      if (composition.backgrounds.length > 0 && !scene.background) {
        throw new ExportError('resource')
      }

      const size = exportSize(scene.size, EXPORT.longEdge)
      if (!size) throw new ExportError('invalid-size')

      const blob = await deps.render({ scene, size, fallbackFill: deps.fallbackFill() })
      if (disposed) return { status: 'cancelled' }

      const fileName = exportFileName(deps.now())
      deps.downloader.download(blob, fileName)
      setNotice('Đã bắt đầu tải ảnh.')
      return { status: 'started', fileName, width: size.width, height: size.height }
    } catch (caught) {
      const failure = toExportError(caught)
      if (!disposed) error.value = failure
      return { status: 'failed', error: failure }
    } finally {
      release()
      if (!disposed) exporting.value = false
    }
  }

  onScopeDispose(() => {
    disposed = true
    clearTimeout(noticeTimer)
    deps.downloader.dispose()
  })

  return {
    exporting,
    block,
    canExport,
    error,
    notice,
    run,
    clearError() {
      error.value = null
    },
  }
}

export type Export = ReturnType<typeof useExport>

const exportKey: InjectionKey<Export> = Symbol('designer-export')

export function provideExport(value: Export) {
  provide(exportKey, value)
}

export function injectExport(): Export {
  const value = inject(exportKey)
  if (!value) throw new Error('injectExport() requires provideExport()')
  return value
}
