import {
  computed,
  inject,
  onScopeDispose,
  provide,
  ref,
  shallowReactive,
  shallowRef,
  watch,
  type InjectionKey,
} from 'vue'
import { designPresets } from './data/catalog'
import { DEFAULT_TEXT_COLOR_ID, DESIGN_FONT, LAYER_LIMITS } from './data/designOptions'
import {
  emptyDesigns,
  getZoneDesign,
  removeInstanceDesigns,
  setLayer,
  uploadIdsOf,
  type DesignState,
  type ImageDesign,
  type ImageSource,
  type LayerKind,
  type TextDesign,
} from './design'
import {
  clampPosition,
  fitCentered,
  fitsInZone,
  isValidZone,
  maxLayerHeight,
  moveLayer,
  resizeLayer,
  rotateLayer,
  zoneFrame,
  type LayerTransform,
  type Size,
} from './geometry'
import {
  decodeImage as decodeImageDefault,
  dimensionsAllowed,
  inspectUpload as inspectUploadDefault,
  type DecodedImage,
  type UploadError,
} from './imageFiles'
import {
  hasVisibleText,
  layoutText,
  loadDesignFont,
  measureWithCanvas,
  REFERENCE_FONT_SIZE,
  type LineMetrics,
  type TextLayout,
} from './textLayout'
import type { EmbroideryZone, Product } from './types'
import type { Selection } from './useSelection'

export interface DesignDeps {
  decodeImage: (url: string) => Promise<DecodedImage>
  inspectUpload: (file: Blob) => Promise<UploadError | null>
  createObjectURL: (file: Blob) => string
  revokeObjectURL: (url: string) => void
  loadFont: (text: string) => Promise<boolean>
  measure: (line: string) => LineMetrics
}

const defaultDeps = (): DesignDeps => ({
  decodeImage: decodeImageDefault,
  inspectUpload: inspectUploadDefault,
  createObjectURL: (file) => URL.createObjectURL(file),
  revokeObjectURL: (url) => URL.revokeObjectURL(url),
  loadFont: (text) => loadDesignFont(text),
  measure: measureWithCanvas,
})

/** Result of an async edit. 'stale' = a newer edit or a removal superseded it; nothing changed. */
export type TextResult =
  | 'ok'
  | 'cleared'
  | 'stale'
  | 'font-error'
  | 'too-long'
  | 'no-image'
  /** Refused because an image is being exported. */
  | 'locked'
export type ImageResult = 'ok' | 'stale' | 'no-image' | 'locked' | UploadError

export interface ActiveLayer {
  instanceId: string
  zoneId: string
  kind: LayerKind
}

type ProductImageState =
  { status: 'loading' } | { status: 'ready'; image: DecodedImage } | { status: 'error' }

/**
 * Personalization state of the gift set: design data per instance/zone plus runtime resources.
 * One independent state per call; DesignerPage calls it next to useSelection.
 */
export function useDesigns(selection: Selection, overrides: Partial<DesignDeps> = {}) {
  const deps = { ...defaultDeps(), ...overrides }

  const designs = shallowRef<DesignState>(emptyDesigns)
  // UI selection (not design data): remembered zone per instance and the layer being edited.
  const activeZones = shallowRef<Readonly<Record<string, string>>>({})
  const activeLayer = shallowRef<ActiveLayer | null>(null)
  const fontStatus = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')

  // Runtime resources.
  const uploads = new Map<string, { url: string; image: DecodedImage }>()
  const presetImages = new Map<string, Promise<DecodedImage>>()
  const loadedPresets = shallowReactive(new Map<string, DecodedImage>())
  const presetErrors = shallowReactive(new Set<string>())
  // Lettering font readiness per text content (unicode-range subsets differ per text).
  const fontStates = shallowReactive(new Map<string, 'loading' | 'ready' | 'error'>())
  const productImages = shallowReactive(new Map<string, ProductImageState>())
  const productImageRequests = new Map<string, Promise<DecodedImage | null>>()
  const pendingImages = shallowReactive(new Set<string>())
  // Text edits being processed, and edits refused (too long, font error…) whose draft the customer
  // still sees: neither may be exported as if the stored (older) text were final.
  const pendingTexts = shallowReactive(new Set<string>())
  const invalidTexts = shallowReactive(new Map<string, { content: string; result: TextResult }>())
  const lock = selection.lock
  const tokens = new Map<string, number>()
  const textLayouts = new Map<string, TextLayout>()
  let tokenCounter = 0
  let uploadCounter = 0

  const targetKey = (instanceId: string, zoneId: string, kind: LayerKind) =>
    `${instanceId}|${zoneId}|${kind}`
  const nextToken = (key: string) => {
    const token = ++tokenCounter
    tokens.set(key, token)
    return token
  }
  const isCurrent = (key: string, token: number, instanceId: string) =>
    tokens.get(key) === token &&
    selection.items.value.some((item) => item.instanceId === instanceId)

  function entryOf(instanceId: string) {
    return selection.entries.value.find((entry) => entry.item.instanceId === instanceId)
  }

  function zonesOf(product: Product): EmbroideryZone[] {
    return product.embroideryZones.filter((zone) => {
      if (isValidZone(zone)) return true
      if (import.meta.env.DEV) {
        console.warn(`[designer] Ignoring invalid embroidery zone ${product.id}/${zone.id}`, zone)
      }
      return false
    })
  }

  function zoneOf(instanceId: string, zoneId: string) {
    const entry = entryOf(instanceId)
    const zone = entry && zonesOf(entry.product).find((z) => z.id === zoneId)
    return entry && zone ? { product: entry.product, zone } : null
  }

  // --- product images (decoded size is the render and geometry source) ---

  function loadProductImage(product: Product): Promise<DecodedImage | null> {
    const src = product.image.src
    if (!src) return Promise.resolve(null)
    const existing = productImageRequests.get(src)
    if (existing) return existing
    productImages.set(src, { status: 'loading' })
    const request = deps.decodeImage(src).then(
      (image) => {
        const { width, height } = product.image
        if (
          import.meta.env.DEV &&
          width &&
          height &&
          (width !== image.width || height !== image.height)
        ) {
          console.warn(
            `[designer] ${product.id}: catalog size ${width}×${height} differs from decoded ` +
              `${image.width}×${image.height}; using the decoded size.`,
          )
        }
        productImages.set(src, { status: 'ready', image })
        return image
      },
      () => {
        productImages.set(src, { status: 'error' })
        productImageRequests.delete(src)
        return null
      },
    )
    productImageRequests.set(src, request)
    return request
  }

  function productImageState(product: Product): ProductImageState | undefined {
    return product.image.src ? productImages.get(product.image.src) : undefined
  }

  /** Zone size in decoded source pixels; null until the product image is decoded. */
  function frameOf(product: Product, zone: EmbroideryZone): Size | null {
    const state = productImageState(product)
    return state?.status === 'ready' ? zoneFrame(state.image, zone) : null
  }

  // --- text measurement ---

  function textLayoutOf(content: string): TextLayout | null {
    const cached = textLayouts.get(content)
    if (cached) return cached
    const layout = layoutText(content, deps.measure)
    if (layout) textLayouts.set(content, layout)
    return layout
  }

  /** Smallest box height (fraction of zone height) that keeps the font at its minimum size. */
  const minTextHeight = (layout: TextLayout) =>
    (LAYER_LIMITS.minFontSize * layout.height) / REFERENCE_FONT_SIZE

  function layerAspect(design: TextDesign | ImageDesign | undefined, kind: LayerKind) {
    if (!design) return null
    if (kind === 'image') return (design as ImageDesign).aspectRatio
    const layout = textLayoutOf((design as TextDesign).content)
    return layout ? layout.width / layout.height : null
  }

  function minHeightOf(design: TextDesign | ImageDesign, kind: LayerKind) {
    if (kind === 'image') return LAYER_LIMITS.minImageHeight
    const layout = textLayoutOf((design as TextDesign).content)
    return layout ? minTextHeight(layout) : LAYER_LIMITS.minImageHeight
  }

  // --- text ---

  async function setText(
    instanceId: string,
    zoneId: string,
    content: string,
    colorId?: string,
  ): Promise<TextResult> {
    if (lock.locked.value) return 'locked'
    const key = targetKey(instanceId, zoneId, 'text')
    const token = nextToken(key)
    pendingTexts.add(key)
    let result: TextResult = 'stale'
    try {
      result = await applyText(instanceId, zoneId, content, colorId, key, token)
    } finally {
      // Only the latest edit of this target settles its state.
      if (tokens.get(key) === token) {
        pendingTexts.delete(key)
        if (result === 'ok' || result === 'cleared') invalidTexts.delete(key)
        else if (result === 'font-error' || result === 'too-long' || result === 'no-image') {
          invalidTexts.set(key, { content, result })
        }
      }
    }
    return result
  }

  async function applyText(
    instanceId: string,
    zoneId: string,
    content: string,
    colorId: string | undefined,
    key: string,
    token: number,
  ): Promise<TextResult> {
    const target = zoneOf(instanceId, zoneId)
    if (!target) return 'stale'
    const existing = getZoneDesign(designs.value, instanceId, zoneId)?.text
    const color = colorId ?? existing?.colorId ?? DEFAULT_TEXT_COLOR_ID

    if (!hasVisibleText(content)) {
      // Blank text: keep nothing renderable.
      designs.value = setLayer(designs.value, instanceId, zoneId, 'text', undefined)
      return 'cleared'
    }

    fontStatus.value = 'loading'
    const [fontReady, image] = await Promise.all([
      deps.loadFont(content),
      loadProductImage(target.product),
    ])
    fontStatus.value = fontReady ? 'ready' : 'error'
    if (fontReady) fontStates.set(content, 'ready')
    if (!isCurrent(key, token, instanceId)) return 'stale'
    if (!fontReady) return 'font-error'
    if (!image) return 'no-image'

    const layout = textLayoutOf(content)
    if (!layout) return 'cleared'
    const frame = zoneFrame(image, target.zone)
    const aspect = layout.width / layout.height
    const minHeight = minTextHeight(layout)

    let transform: LayerTransform | null
    if (existing) {
      // Keep the customer's placement; shrink only as much as needed to stay inside the zone.
      const max = maxLayerHeight(aspect, existing.transform.rotation, frame)
      transform =
        max + 1e-9 < minHeight
          ? null
          : clampPosition(
              { ...existing.transform, height: Math.min(existing.transform.height, max) },
              aspect,
              frame,
            )
    } else {
      const placed = fitCentered(aspect, frame, LAYER_LIMITS.initialFill)
      const max = maxLayerHeight(aspect, 0, frame)
      transform =
        placed.height >= minHeight
          ? placed
          : max >= minHeight
            ? { ...placed, height: minHeight }
            : null
    }
    if (!transform) return 'too-long'

    const text: TextDesign = { content, fontId: DESIGN_FONT.id, colorId: color, transform }
    designs.value = setLayer(designs.value, instanceId, zoneId, 'text', text)
    return 'ok'
  }

  function setTextColor(instanceId: string, zoneId: string, colorId: string) {
    if (lock.locked.value) return
    const text = getZoneDesign(designs.value, instanceId, zoneId)?.text
    if (!text || text.colorId === colorId) return
    designs.value = setLayer(designs.value, instanceId, zoneId, 'text', { ...text, colorId })
  }

  function removeText(instanceId: string, zoneId: string) {
    if (lock.locked.value) return
    const key = targetKey(instanceId, zoneId, 'text')
    nextToken(key)
    pendingTexts.delete(key)
    invalidTexts.delete(key)
    designs.value = setLayer(designs.value, instanceId, zoneId, 'text', undefined)
    clearActiveLayer(instanceId, zoneId, 'text')
  }

  // --- images ---

  function releaseUpload(uploadId: string) {
    const upload = uploads.get(uploadId)
    if (!upload) return
    uploads.delete(uploadId)
    deps.revokeObjectURL(upload.url)
  }

  function presetImage(presetId: string): Promise<DecodedImage> {
    let request = presetImages.get(presetId)
    if (!request) {
      const src = designPresets.find((preset) => preset.id === presetId)?.image.src
      presetErrors.delete(presetId)
      request = src
        ? deps.decodeImage(src).then((image) => {
            loadedPresets.set(presetId, image)
            return image
          })
        : Promise.reject(new Error(`Unknown preset ${presetId}`))
      request.catch(() => {
        presetImages.delete(presetId)
        presetErrors.add(presetId)
      })
      presetImages.set(presetId, request)
    }
    return request
  }

  /** Decoded image of a design source, if available. */
  function imageOf(source: ImageSource): DecodedImage | undefined {
    return source.kind === 'preset'
      ? loadedPresets.get(source.presetId)
      : uploads.get(source.uploadId)?.image
  }

  /**
   * Resource state of a design image, for read-only consumers (the set composition). Uploads are
   * owned here: a missing upload is reported, never recreated, and consumers never revoke URLs.
   */
  function designImageState(source: ImageSource): 'ready' | 'loading' | 'error' {
    if (imageOf(source)) return 'ready'
    if (source.kind === 'upload') return 'error'
    return presetErrors.has(source.presetId) ? 'error' : 'loading'
  }

  /** Starts (or retries) loading a preset image; uploads are already decoded or missing. */
  function ensureDesignImage(source: ImageSource) {
    if (source.kind === 'preset' && !loadedPresets.has(source.presetId)) {
      void presetImage(source.presetId).catch(() => {})
    }
  }

  function fontState(content: string) {
    return fontStates.get(content)
  }

  /** Loads the lettering font for a text (once); errors can be retried by calling again. */
  function ensureFont(content: string) {
    const state = fontStates.get(content)
    if (state === 'ready' || state === 'loading') return
    fontStates.set(content, 'loading')
    void deps.loadFont(content).then(
      (ok) => fontStates.set(content, ok ? 'ready' : 'error'),
      () => fontStates.set(content, 'error'),
    )
  }

  function commitImage(
    instanceId: string,
    zoneId: string,
    frame: Size,
    source: ImageSource,
    image: DecodedImage,
  ) {
    const previous = getZoneDesign(designs.value, instanceId, zoneId)?.image
    const aspectRatio = image.width / image.height
    const design: ImageDesign = {
      source,
      aspectRatio,
      transform: fitCentered(aspectRatio, frame, LAYER_LIMITS.initialFill),
    }
    designs.value = setLayer(designs.value, instanceId, zoneId, 'image', design)
    // Release the replaced upload only after the new image is in place.
    if (previous?.source.kind === 'upload') releaseUpload(previous.source.uploadId)
  }

  async function runImageTask(
    instanceId: string,
    zoneId: string,
    task: () => Promise<{ source: ImageSource; image: DecodedImage } | ImageResult>,
    discard: (result: { source: ImageSource }) => void,
  ): Promise<ImageResult> {
    if (lock.locked.value) return 'locked'
    const key = targetKey(instanceId, zoneId, 'image')
    const token = nextToken(key)
    const target = zoneOf(instanceId, zoneId)
    if (!target) return 'stale'
    pendingImages.add(key)
    try {
      const [result, productImage] = await Promise.all([task(), loadProductImage(target.product)])
      if (typeof result === 'string') return isCurrent(key, token, instanceId) ? result : 'stale'
      if (!isCurrent(key, token, instanceId) || !productImage) {
        discard(result)
        return productImage ? 'stale' : 'no-image'
      }
      commitImage(
        instanceId,
        zoneId,
        zoneFrame(productImage, target.zone),
        result.source,
        result.image,
      )
      return 'ok'
    } finally {
      if (tokens.get(key) === token) pendingImages.delete(key)
    }
  }

  function setPresetImage(instanceId: string, zoneId: string, presetId: string) {
    return runImageTask(
      instanceId,
      zoneId,
      async () => {
        try {
          return { source: { kind: 'preset', presetId }, image: await presetImage(presetId) }
        } catch {
          return 'decode-failed'
        }
      },
      () => {},
    )
  }

  function setUploadImage(instanceId: string, zoneId: string, file: File) {
    return runImageTask(
      instanceId,
      zoneId,
      async () => {
        const problem = await deps.inspectUpload(file)
        if (problem) return problem
        const url = deps.createObjectURL(file)
        try {
          const image = await deps.decodeImage(url)
          if (!dimensionsAllowed(image.width, image.height)) {
            deps.revokeObjectURL(url)
            return 'dimensions-too-large'
          }
          const uploadId = `upload-${++uploadCounter}`
          uploads.set(uploadId, { url, image })
          return { source: { kind: 'upload', uploadId, fileName: file.name }, image }
        } catch {
          deps.revokeObjectURL(url)
          return 'decode-failed'
        }
      },
      (result) => {
        if (result.source.kind === 'upload') releaseUpload(result.source.uploadId)
      },
    )
  }

  function removeImage(instanceId: string, zoneId: string) {
    if (lock.locked.value) return
    nextToken(targetKey(instanceId, zoneId, 'image'))
    pendingImages.delete(targetKey(instanceId, zoneId, 'image'))
    const previous = getZoneDesign(designs.value, instanceId, zoneId)?.image
    designs.value = setLayer(designs.value, instanceId, zoneId, 'image', undefined)
    if (previous?.source.kind === 'upload') releaseUpload(previous.source.uploadId)
    clearActiveLayer(instanceId, zoneId, 'image')
  }

  // --- transforms (canvas and DOM controls share these rules) ---

  /** Applies a transform if it is valid for the layer; returns false and changes nothing otherwise. */
  function setTransform(
    instanceId: string,
    zoneId: string,
    kind: LayerKind,
    transform: LayerTransform,
  ): boolean {
    if (lock.locked.value) return false
    const target = zoneOf(instanceId, zoneId)
    const layer = getZoneDesign(designs.value, instanceId, zoneId)?.[kind]
    const frame = target && frameOf(target.product, target.zone)
    const aspect = layerAspect(layer, kind)
    if (!layer || !frame || aspect === null) return false
    if (transform.height + 1e-9 < minHeightOf(layer, kind)) return false
    if (!fitsInZone(transform, aspect, frame)) return false
    designs.value = setLayer(designs.value, instanceId, zoneId, kind, {
      ...layer,
      transform,
    } as never)
    return true
  }

  type TransformStep = (
    current: LayerTransform,
    aspect: number,
    frame: Size,
    minHeight: number,
  ) => LayerTransform | null

  function editLayer(layer: ActiveLayer, step: TransformStep): boolean {
    const target = zoneOf(layer.instanceId, layer.zoneId)
    const design = getZoneDesign(designs.value, layer.instanceId, layer.zoneId)?.[layer.kind]
    const frame = target && frameOf(target.product, target.zone)
    const aspect = layerAspect(design, layer.kind)
    if (!design || !frame || aspect === null) return false
    const next = step(design.transform, aspect, frame, minHeightOf(design, layer.kind))
    return next ? setTransform(layer.instanceId, layer.zoneId, layer.kind, next) : false
  }

  const layerTools = {
    move: (layer: ActiveLayer, dx: number, dy: number) =>
      editLayer(layer, (t, a, f) => moveLayer(t, dx, dy, a, f)),
    resize: (layer: ActiveLayer, height: number) =>
      editLayer(layer, (t, a, f, min) => resizeLayer(t, height, min, a, f)),
    rotate: (layer: ActiveLayer, rotation: number) =>
      editLayer(layer, (t, a, f) => rotateLayer(t, rotation, a, f)),
    center: (layer: ActiveLayer) =>
      editLayer(layer, (t, a, f) => clampPosition({ ...t, x: 0.5, y: 0.5 }, a, f)),
    /** Size limits of the layer at its current rotation, for DOM controls. */
    limits(layer: ActiveLayer) {
      const target = zoneOf(layer.instanceId, layer.zoneId)
      const design = getZoneDesign(designs.value, layer.instanceId, layer.zoneId)?.[layer.kind]
      const frame = target && frameOf(target.product, target.zone)
      const aspect = layerAspect(design, layer.kind)
      if (!design || !frame || aspect === null) return null
      return {
        min: minHeightOf(design, layer.kind),
        max: maxLayerHeight(aspect, design.transform.rotation, frame),
      }
    },
  }

  // --- UI selection ---

  const activeInstanceId = computed(() => selection.activeInstanceId.value)

  const activeZones$ = computed(() => {
    const entry = selection.activeEntry.value
    return entry ? zonesOf(entry.product) : []
  })

  /** Remembered zone of the active item if still valid, otherwise its first zone. */
  const currentZone = computed(() => {
    const id = activeInstanceId.value
    const zones = activeZones$.value
    if (!id) return null
    return zones.find((zone) => zone.id === activeZones.value[id]) ?? zones[0] ?? null
  })

  /** Selected layer, only when it belongs to the active item and still exists. */
  const currentLayer = computed<ActiveLayer | null>(() => {
    const layer = activeLayer.value
    if (!layer || layer.instanceId !== activeInstanceId.value) return null
    return getZoneDesign(designs.value, layer.instanceId, layer.zoneId)?.[layer.kind] ? layer : null
  })

  function selectZone(zoneId: string) {
    const id = activeInstanceId.value
    if (!id || !activeZones$.value.some((zone) => zone.id === zoneId)) return
    activeZones.value = { ...activeZones.value, [id]: zoneId }
    if (activeLayer.value?.zoneId !== zoneId) activeLayer.value = null
  }

  function selectLayer(zoneId: string, kind: LayerKind | null) {
    const id = activeInstanceId.value
    if (!id) return
    selectZone(zoneId)
    activeLayer.value =
      kind && getZoneDesign(designs.value, id, zoneId)?.[kind]
        ? { instanceId: id, zoneId, kind }
        : null
  }

  function clearActiveLayer(instanceId: string, zoneId: string, kind: LayerKind) {
    const layer = activeLayer.value
    if (layer?.instanceId === instanceId && layer.zoneId === zoneId && layer.kind === kind) {
      activeLayer.value = null
    }
  }

  // --- cleanup for every removal path (watching the selection, not the remove button) ---

  function disposeInstance(instanceId: string) {
    for (const uploadId of uploadIdsOf(designs.value, instanceId)) releaseUpload(uploadId)
    designs.value = removeInstanceDesigns(designs.value, instanceId)
    for (const key of [...tokens.keys()]) if (key.startsWith(`${instanceId}|`)) tokens.delete(key)
    for (const key of [...pendingImages])
      if (key.startsWith(`${instanceId}|`)) pendingImages.delete(key)
    for (const key of [...pendingTexts])
      if (key.startsWith(`${instanceId}|`)) pendingTexts.delete(key)
    for (const key of [...invalidTexts.keys()])
      if (key.startsWith(`${instanceId}|`)) invalidTexts.delete(key)
    if (instanceId in activeZones.value) {
      const next = { ...activeZones.value }
      delete next[instanceId]
      activeZones.value = next
    }
    if (activeLayer.value?.instanceId === instanceId) activeLayer.value = null
  }

  watch(
    () => selection.items.value.map((item) => item.instanceId),
    (ids, previous) => {
      const remaining = new Set(ids)
      for (const id of previous ?? []) if (!remaining.has(id)) disposeInstance(id)
    },
  )

  onScopeDispose(() => {
    for (const uploadId of [...uploads.keys()]) releaseUpload(uploadId)
    tokens.clear()
  })

  return {
    designs: computed(() => designs.value),
    fontStatus: computed(() => fontStatus.value),
    currentZone,
    currentLayer,
    zonesOf,
    selectZone,
    selectLayer,
    zoneDesign: (instanceId: string, zoneId: string) =>
      getZoneDesign(designs.value, instanceId, zoneId),
    isImagePending: (instanceId: string, zoneId: string) =>
      pendingImages.has(targetKey(instanceId, zoneId, 'image')),
    /** True while the set cannot be edited (an image is being exported). */
    locked: lock.locked,
    /** True while a text or image edit is still being processed. */
    hasPendingEdits: computed(() => pendingImages.size > 0 || pendingTexts.size > 0),
    /** Text edits that were refused; their draft is still shown, the stored text is older. */
    hasInvalidTextEdits: computed(() => invalidTexts.size > 0),
    invalidText: (instanceId: string, zoneId: string) =>
      invalidTexts.get(targetKey(instanceId, zoneId, 'text')),
    setText,
    setTextColor,
    removeText,
    setPresetImage,
    setUploadImage,
    removeImage,
    setTransform,
    layerTools,
    loadProductImage,
    productImageState,
    frameOf,
    textLayoutOf,
    imageOf,
    designImageState,
    ensureDesignImage,
    fontState,
    ensureFont,
    /** Number of live object URLs created for uploads (for diagnostics and tests). */
    liveUploadCount: () => uploads.size,
  }
}

export type Designs = ReturnType<typeof useDesigns>

const designsKey: InjectionKey<Designs> = Symbol('designer-designs')

export function provideDesigns(designs: Designs) {
  provide(designsKey, designs)
}

export function injectDesigns(): Designs {
  const designs = inject(designsKey)
  if (!designs) throw new Error('injectDesigns() requires provideDesigns() in an ancestor')
  return designs
}
