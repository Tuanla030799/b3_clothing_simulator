/*
 * Designer domain types. Data is local for now and will later come from the backend, so these
 * shapes describe catalog content only (no editor, history or composition state yet).
 *
 * productId vs instanceId: a Product is a catalog model (one model + one color). A selected item
 * in the gift set will be a separate instance with its own `instanceId` and independent design,
 * even when several instances share the same productId. Instances are introduced in a later phase.
 */

export type CategoryId = string

export interface Category {
  id: CategoryId
  name: string
}

export interface AssetImage {
  /** Resolved asset URL. Undefined while the file has not been provided; UI shows a placeholder. */
  src?: string
  /** Intrinsic pixel size of the real source file. Only set once a real image exists. */
  width?: number
  height?: number
}

export type EmbroideryContent = 'text' | 'image'

/**
 * Rectangular embroidery zone, normalized to the full source image (not the viewport):
 * 0 ≤ x, y and x + width ≤ 1, y + height ≤ 1, origin at the top-left corner.
 */
export interface EmbroideryZone {
  id: string
  name: string
  x: number
  y: number
  width: number
  height: number
  allowedContent: EmbroideryContent[]
}

export interface Product {
  /** Catalog id: one model + one color. Each color is its own product in V1. */
  id: string
  name: string
  categoryId: CategoryId
  image: AssetImage
  /** Relative display scale inside a composition (1 = reference size). Not a physical size. */
  displayScale: number
  embroideryZones: EmbroideryZone[]
  /** True while zones/scale are development placeholders that must be replaced with real data. */
  provisional: boolean
}

export interface Background {
  id: string
  name: string
  image: AssetImage
  provisional: boolean
}

export interface DesignPreset {
  id: string
  name: string
  image: AssetImage
  provisional: boolean
}

export interface SelectionRules {
  /** Maximum number of selected items in one set (all categories, repeats included). */
  maxItems: number
  /** Per-category limits keyed by category id. Categories without an entry have no own limit. */
  categoryLimits: Partial<Record<CategoryId, number>>
}
