import { describe, expect, it } from 'vitest'
import { homeImage } from './data/assets'
import { commitments, processSteps, reviews } from './data/homeData'

describe('home page data', () => {
  it('uses unique ids so slides and items can be keyed safely', () => {
    for (const list of [commitments, processSteps, reviews]) {
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
