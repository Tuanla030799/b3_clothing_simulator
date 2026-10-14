/*
 * Shapes of the fixed home page content (banners, products and collections come from the API).
 * Image fields are file names (without extension) resolved by data/assets.ts; a missing file shows
 * a placeholder.
 */

export interface Commitment {
  id: string
  title: string
}

export interface ProcessStep {
  id: string
  title: string
  description: string
  /** File name in assets/home; optional, a placeholder is shown when missing. */
  image?: string
}

export interface Review {
  id: string
  author: string
  /** Whole number from 1 to 5. */
  rating: number
  text: string
  /** Product the review is about, shown as small print. */
  product?: string
  /** True for placeholder content: the card is labelled "Dữ liệu mẫu" until real data replaces it. */
  isSample: boolean
}
