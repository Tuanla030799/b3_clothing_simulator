import { createMemoryHistory } from 'vue-router'
import { describe, expect, it } from 'vitest'
import { createAppRouter } from '../../router'
import { homeImage } from './data/assets'
import { products } from '../designer/data/catalog'
import {
  bannerSlides,
  commitments,
  featuredProductIds,
  processSteps,
  reviews,
  seasonalCollections,
} from './data/homeData'

describe('home page data', () => {
  const router = createAppRouter(createMemoryHistory())

  it('points every banner button at a real page', () => {
    for (const slide of bannerSlides) {
      expect(router.resolve(slide.cta.to).name, slide.cta.to).not.toBe('not-found')
    }
  })

  it('shows only products that exist in the catalog, without duplicates', () => {
    const catalogIds = new Set(products.map((product) => product.id))
    for (const id of featuredProductIds) expect(catalogIds, id).toContain(id)
    expect(new Set(featuredProductIds).size).toBe(featuredProductIds.length)
  })

  it('points every seasonal collection at a page that resolves', () => {
    for (const collection of seasonalCollections) {
      expect(router.resolve(collection.to).name, collection.to).toBe('collection')
    }
  })

  it('uses unique ids so slides and items can be keyed safely', () => {
    for (const list of [bannerSlides, commitments, seasonalCollections, processSteps, reviews]) {
      const ids = list.map((entry) => entry.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  it('has no image for a missing file name, so the placeholder is shown instead of a broken request', () => {
    expect(homeImage(undefined)).toBeUndefined()
    expect(homeImage('does-not-exist')).toBeUndefined()
  })

  it('keeps review ratings as whole numbers from 1 to 5 and flags placeholder reviews', () => {
    for (const review of reviews) {
      expect(Number.isInteger(review.rating), review.id).toBe(true)
      expect(review.rating).toBeGreaterThanOrEqual(1)
      expect(review.rating).toBeLessThanOrEqual(5)
      expect(review.text.trim().length).toBeGreaterThan(0)
    }
    // The mock set is placeholder content, so every review must carry the sample flag.
    expect(reviews.every((review) => review.isSample)).toBe(true)
  })
})
