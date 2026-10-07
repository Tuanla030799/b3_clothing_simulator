import {
  computed,
  inject,
  onScopeDispose,
  provide,
  ref,
  shallowRef,
  watch,
  type InjectionKey,
} from 'vue'
import { backgrounds as catalogBackgrounds, DEFAULT_BACKGROUND_ID } from './data/catalog'
import { COMPOSITION } from './data/designOptions'
import type { LayerKind } from './design'
import { decodeImage as decodeImageDefault, type DecodedImage } from './imageFiles'
import { captureSceneInput } from './sceneInput'
import { layoutSet, type LayoutItem, type SetLayout } from './setLayout'
import { buildSetScene } from './setScene'
import type { Background, Product } from './types'
import type { Designs } from './useDesigns'
import type { Selection } from './useSelection'

/*
 * "Xem cả bộ": view mode, background choice, derived layout and resource readiness.
 *
 * Ownership: product images, preset images, fonts and upload object URLs belong to useDesigns.
 * The composition only borrows them (never creates or revokes object URLs). The only resources it
 * owns are decoded background images (bundled asset URLs, nothing to revoke).
 *
 * The layout is derived, not stored: it depends only on the selected items (order, product
 * aspect ratio, displayScale, category priority) and the composition size. Designs, decode order
 * and the viewport never change placements.
 */

export type ViewMode = 'item' | 'set'

export interface ResourceIssue {
  instanceId: string
  position: number
  productName: string
  kind: 'product' | LayerKind
  zoneName?: string
  status: 'loading' | 'error'
}

export type ExportBlockCode =
  | 'empty'
  | 'loading'
  | 'resource-error'
  | 'background-error'
  | 'pending-edit'
  | 'invalid-edit'
  | 'layout'

export type ExportReadiness = { ok: true } | { ok: false; code: ExportBlockCode }

export interface CompositionOptions {
  backgrounds?: Background[]
  defaultBackgroundId?: string
  decodeImage?: (url: string) => Promise<DecodedImage>
}

export function useComposition(
  selection: Selection,
  designs: Designs,
  options: CompositionOptions = {},
) {
  const backgrounds = options.backgrounds ?? catalogBackgrounds
  const defaultBackgroundId = options.defaultBackgroundId ?? DEFAULT_BACKGROUND_ID
  const decodeImage = options.decodeImage ?? decodeImageDefault

  const mode = ref<ViewMode>('item')

  // --- background: switch only after the new image decoded; latest request wins ---
  const background = shallowRef<{ id: string; image: DecodedImage } | null>(null)
  const pendingBackgroundId = ref<string | null>(null)
  const backgroundError = ref<string | null>(null)
  // The background the customer (or the default) asked for; it can differ from the one shown
  // while it loads or after it failed. Export requires the shown one to be the requested one.
  const requestedBackgroundId = ref<string | null>(null)
  let backgroundToken = 0

  async function selectBackground(id: string) {
    if (selection.lock.locked.value) return
    const entry = backgrounds.find((bg) => bg.id === id)
    const token = ++backgroundToken
    requestedBackgroundId.value = id
    pendingBackgroundId.value = id
    backgroundError.value = null
    let image: DecodedImage | null = null
    try {
      if (entry?.image.src) image = await decodeImage(entry.image.src)
    } catch {
      image = null
    }
    if (token !== backgroundToken) return
    pendingBackgroundId.value = null
    if (image) background.value = { id, image }
    else backgroundError.value = 'Không tải được ảnh nền này.'
  }

  /** Loads the default background once, when the set view is first shown. */
  function ensureBackground() {
    if (requestedBackgroundId.value) return
    const first = backgrounds.find((bg) => bg.id === defaultBackgroundId) ?? backgrounds[0]
    if (first) void selectBackground(first.id)
  }

  const size = computed(() => {
    const image = background.value?.image
    if (!image) return { ...COMPOSITION.fallbackSize }
    const width = COMPOSITION.logicalWidth
    return { width, height: (width * image.height) / image.width }
  })

  // --- layout (derived) ---

  function aspectOf(product: Product): number {
    const state = designs.productImageState(product)
    if (state?.status === 'ready') return state.image.width / state.image.height
    const { width, height } = product.image
    return width && height ? width / height : COMPOSITION.placeholderAspect
  }

  const layoutItems = computed<LayoutItem[]>(() =>
    selection.entries.value.map(({ item, product }) => ({
      instanceId: item.instanceId,
      aspectRatio: aspectOf(product),
      displayScale: product.displayScale,
      priority: COMPOSITION.categoryPriority[product.categoryId] ?? 0,
    })),
  )

  const layout = computed<SetLayout>(() =>
    layoutSet(layoutItems.value, size.value, {
      paddingRatio: COMPOSITION.paddingRatio,
      gapRatio: COMPOSITION.gapRatio,
      maxItemFill: COMPOSITION.maxItemFill,
    }),
  )

  /** The whole set as drawable data; the preview canvas renders exactly this. */
  const scene = computed(() =>
    buildSetScene(
      captureSceneInput(selection, designs, {
        size: size.value,
        background: background.value?.image ?? null,
        placements: layout.value.placements,
      }),
    ),
  )

  // --- resources (borrowed from useDesigns) ---

  const issues = computed<ResourceIssue[]>(() => {
    const list: ResourceIssue[] = []
    for (const { item, product, position } of selection.entries.value) {
      const base = { instanceId: item.instanceId, position, productName: product.name }
      const productState = designs.productImageState(product)
      if (!product.image.src || productState?.status === 'error') {
        list.push({ ...base, kind: 'product', status: 'error' })
      } else if (productState?.status !== 'ready') {
        list.push({ ...base, kind: 'product', status: 'loading' })
      }
      for (const zone of designs.zonesOf(product)) {
        const design = designs.zoneDesign(item.instanceId, zone.id)
        if (design?.image) {
          const state = designs.designImageState(design.image.source)
          if (state !== 'ready')
            list.push({ ...base, kind: 'image', zoneName: zone.name, status: state })
        }
        if (design?.text) {
          const state = designs.fontState(design.text.content)
          if (state !== 'ready') {
            list.push({
              ...base,
              kind: 'text',
              zoneName: zone.name,
              status: state === 'error' ? 'error' : 'loading',
            })
          }
        }
      }
    }
    return list
  })

  const status = computed<'empty' | 'loading' | 'ready' | 'incomplete'>(() => {
    if (selection.entries.value.length === 0) return 'empty'
    if (issues.value.some((issue) => issue.status === 'error')) return 'incomplete'
    if (issues.value.length > 0 || (pendingBackgroundId.value && !background.value))
      return 'loading'
    return 'ready'
  })

  /**
   * Whether the set can be exported right now. The same answer feeds the download button and the
   * export function. A background that was chosen but failed to load blocks the export (the
   * previous or fallback background is never exported silently); no configured backgrounds at all
   * means the neutral fill is the intended background.
   */
  const exportReadiness = computed<ExportReadiness>(() => {
    const entries = selection.entries.value
    if (entries.length === 0) return { ok: false, code: 'empty' }
    if (designs.hasInvalidTextEdits.value) return { ok: false, code: 'invalid-edit' }
    if (designs.hasPendingEdits.value) return { ok: false, code: 'pending-edit' }

    if (backgrounds.length > 0) {
      if (backgroundError.value) return { ok: false, code: 'background-error' }
      const shown = background.value
      if (!shown || pendingBackgroundId.value || shown.id !== requestedBackgroundId.value) {
        return { ok: false, code: 'loading' }
      }
    }

    if (issues.value.some((issue) => issue.status === 'error')) {
      return { ok: false, code: 'resource-error' }
    }
    if (issues.value.length > 0) return { ok: false, code: 'loading' }

    // Every instance has exactly one placement, and no placement refers to a removed item.
    const placed = layout.value.placements.map((p) => p.instanceId).sort()
    const expected = entries.map((entry) => entry.item.instanceId).sort()
    const same = placed.length === expected.length && placed.every((id, i) => id === expected[i])
    if (!same || new Set(placed).size !== placed.length) return { ok: false, code: 'layout' }
    return { ok: true }
  })

  /** Starts loading everything the selected items need (shared caches; no duplicate decodes). */
  function prepare() {
    ensureBackground()
    for (const { item, product } of selection.entries.value) {
      void designs.loadProductImage(product)
      for (const zone of designs.zonesOf(product)) {
        const design = designs.zoneDesign(item.instanceId, zone.id)
        if (design?.image) designs.ensureDesignImage(design.image.source)
        if (design?.text) designs.ensureFont(design.text.content)
      }
    }
  }

  function retry() {
    if (selection.lock.locked.value) return
    if (backgroundError.value && !pendingBackgroundId.value) {
      const id = requestedBackgroundId.value
      if (id) void selectBackground(id)
    }
    prepare()
  }

  // Prepare while the set view is shown, and again whenever items or designs change.
  watch(
    [mode, () => selection.entries.value, () => designs.designs.value],
    () => {
      if (mode.value === 'set') prepare()
    },
    { immediate: true },
  )

  onScopeDispose(() => {
    backgroundToken++
    background.value = null
  })

  return {
    mode,
    showSet: () => (mode.value = 'set'),
    editItem(instanceId: string) {
      if (selection.lock.locked.value) return
      selection.select(instanceId)
      mode.value = 'item'
    },
    backgrounds,
    background: computed(() => background.value),
    backgroundEntry: computed(() => backgrounds.find((bg) => bg.id === background.value?.id)),
    pendingBackgroundId: computed(() => pendingBackgroundId.value),
    backgroundError: computed(() => backgroundError.value),
    selectBackground,
    size,
    layout,
    scene,
    issues,
    status,
    exportReadiness,
    retry,
  }
}

export type Composition = ReturnType<typeof useComposition>

const compositionKey: InjectionKey<Composition> = Symbol('designer-composition')

export function provideComposition(composition: Composition) {
  provide(compositionKey, composition)
}

export function injectComposition(): Composition {
  const composition = inject(compositionKey)
  if (!composition) throw new Error('injectComposition() requires provideComposition()')
  return composition
}
