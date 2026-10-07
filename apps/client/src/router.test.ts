import { createMemoryHistory } from 'vue-router'
import { describe, expect, it } from 'vitest'
import { createAppRouter } from './router'
import { cartLink, footer, navItems } from './features/site/data/siteData'

describe('router and site links', () => {
  const router = createAppRouter(createMemoryHistory())
  const linkTargets = [
    ...navItems,
    cartLink,
    ...footer.columns.flatMap((column) => column.links),
  ].map((link) => link.to)

  it('resolves every menu, cart and footer link to a real page (no link falls into not-found)', () => {
    for (const to of linkTargets) {
      expect(router.resolve(to).name, to).not.toBe('not-found')
    }
  })

  it('sends unknown paths to the not-found page', () => {
    expect(router.resolve('/khong-ton-tai').name).toBe('not-found')
  })

  it('keeps the design tool on its own route without the site footer', () => {
    const designer = router.resolve('/thiet-ke')
    expect(designer.name).toBe('designer')
    expect(designer.meta.hideFooter).toBe(true)
  })
})
