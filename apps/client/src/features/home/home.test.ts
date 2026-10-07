import { createMemoryHistory } from 'vue-router'
import { describe, expect, it } from 'vitest'
import { createAppRouter } from '../../router'
import { homeImage } from './data/assets'
import { bannerSlides, commitments } from './data/homeData'

describe('home page data', () => {
  const router = createAppRouter(createMemoryHistory())

  it('points every banner button at a real page', () => {
    for (const slide of bannerSlides) {
      expect(router.resolve(slide.cta.to).name, slide.cta.to).not.toBe('not-found')
    }
  })

  it('uses unique ids so slides and items can be keyed safely', () => {
    for (const list of [bannerSlides, commitments]) {
      const ids = list.map((entry) => entry.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  it('has no image for a missing file name, so the placeholder is shown instead of a broken request', () => {
    expect(homeImage(undefined)).toBeUndefined()
    expect(homeImage('does-not-exist')).toBeUndefined()
  })
})
