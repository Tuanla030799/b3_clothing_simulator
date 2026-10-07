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
