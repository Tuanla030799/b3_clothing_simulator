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

  it('opens product and collection pages by slug', () => {
    expect(router.resolve('/san-pham').name).toBe('products')
    expect(router.resolve('/san-pham/bodysuit-cotton')).toMatchObject({
      name: 'product',
      params: { slug: 'bodysuit-cotton' },
    })
    expect(router.resolve('/bo-suu-tap').name).toBe('collections')
    expect(router.resolve('/bo-suu-tap/giang-sinh')).toMatchObject({
      name: 'collection',
      params: { slug: 'giang-sinh' },
    })
  })

  it('lists the products of a category by its path and redirects old filter links', async () => {
    expect(router.resolve('/danh-muc/ao/ao-thun')).toMatchObject({
      name: 'category',
      params: { path: ['ao', 'ao-thun'] },
    })
    const memory = createAppRouter(createMemoryHistory())
    await memory.push('/san-pham?danh-muc=ao&q=thun')
    expect(memory.currentRoute.value).toMatchObject({
      name: 'category',
      fullPath: '/danh-muc/ao?q=thun',
    })
    await memory.push('/san-pham?q=thun')
    expect(memory.currentRoute.value.name).toBe('products')
  })

  it('designs the cart by default, or one collection, and can open the checkout', () => {
    const route = router.resolve('/thiet-ke?bo-suu-tap=mua-he')
    const props = route.matched[0]!.props.default as (r: typeof route) => object
    expect(props(route)).toEqual({ collectionSlug: 'mua-he', checkout: false })
    expect(props(router.resolve('/thiet-ke'))).toEqual({
      collectionSlug: undefined,
      checkout: false,
    })
    expect(props(router.resolve('/thiet-ke?buoc=dat-hang'))).toMatchObject({ checkout: true })
    expect(router.resolve('/gio-hang').name).toBe('cart')
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
