/*
 * Designer domain types. The catalog is loaded from the public API (catalog.ts maps the API
 * DTOs to these shapes), so they describe catalog content only, not editor or composition state.
 *
 * productId vs instanceId: a designer Product is one API product color (one model + one color).
 * Each item added to the gift set is a separate instance with its own `instanceId` and
 * independent design, even when several instances share the same productId.
 */

export type CategoryId = string

export interface Category {
  id: CategoryId
  name: string
  /** Stable, environment-independent key (ids differ between databases). */
  slug: string
}

export interface AssetImage {
  /** Absolute image URL. Undefined when there is no image; the UI shows a placeholder. */
  src?: string
  /** Intrinsic pixel size reported by the API; the decoded size wins if they differ. */
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
  /** API color id: one model + one color. */
  id: string
  /** API product (model) id the color belongs to. */
  productId: string
  /** Slug of that product (product page, details such as sizes and price). */
  productSlug: string
  name: string
  categoryId: CategoryId
  image: AssetImage
  /** Relative display scale inside a composition (1 = reference size). Not a physical size. */
  displayScale: number
  /** Empty when the color is sold without personalization. */
  embroideryZones: EmbroideryZone[]
}

export interface Background {
  id: string
  name: string
  image: AssetImage
}

export interface DesignPreset {
  id: string
  name: string
  image: AssetImage
}

export interface SelectionRules {
  /** Maximum number of selected items in one set (all categories, repeats included). */
  maxItems: number
  /** Per-category limits keyed by category id. Categories without an entry have no own limit. */
  categoryLimits: Partial<Record<CategoryId, number>>
}

/** One place of a template: a rectangle (fractions of the background) for one item of a category. */
export interface TemplateSlot {
  categoryId: CategoryId
  x: number
  y: number
  width: number
  height: number
}

/** Admin-arranged layout of a set on one background; used when the set matches its categories. */
export interface SetTemplate {
  id: string
  name: string
  backgroundId: string
  slots: TemplateSlot[]
}

/** Everything the designer needs from the API, loaded once per visit of the page. */
export interface DesignerCatalog {
  categories: Category[]
  products: Product[]
  rules: SelectionRules
  backgrounds: Background[]
  /** Background shown first in the set view; null lets the first background be used. */
  defaultBackgroundId: string | null
  presets: DesignPreset[]
  /** Hand-arranged layouts; sets without a matching one are arranged automatically. */
  layouts: SetTemplate[]
}
