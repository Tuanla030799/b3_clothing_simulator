/*
 * Home page data shapes. Content is mock data served from local files until the backend/admin
 * exists; components only depend on these shapes. Image fields are file names (without extension)
 * resolved by data/assets.ts; a missing file shows a placeholder.
 */

export interface BannerSlide {
  id: string
  title: string
  description: string
  cta: { label: string; to: string }
  /** File name in assets/home, e.g. "banner-1". Optional: missing image shows a placeholder. */
  image?: string
}

export interface Commitment {
  id: string
  title: string
}

export interface SeasonalCollection {
  id: string
  name: string
  /** File name in assets/home; optional, a placeholder is shown when missing. */
  image?: string
  /** Router path of the collection page. */
  to: string
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
