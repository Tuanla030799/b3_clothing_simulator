import { createRouter, createWebHistory, type RouterHistory, type RouteRecordRaw } from 'vue-router'
import ComingSoonPage from './pages/ComingSoonPage.vue'
import NotFoundPage from './pages/NotFoundPage.vue'

declare module 'vue-router' {
  interface RouteMeta {
    /** Page name used for the document title and the "coming soon" page. */
    title?: string
    /** Hide the site footer (used by the full-screen design tool). */
    hideFooter?: boolean
  }
}

// Menu targets that do not exist yet share one placeholder page.
const comingSoon = [
  { path: '/lien-he', title: 'Liên hệ' },
  { path: '/ve-chung-toi', title: 'Về chúng tôi' },
]

export const routes: RouteRecordRaw[] = [
  // Loaded on demand so Swiper stays out of the bundle of other pages (e.g. the design tool).
  { path: '/', name: 'home', component: () => import('./pages/HomePage.vue') },
  {
    path: '/thiet-ke',
    name: 'designer',
    // Loaded on demand: the design tool (and Konva) is not part of the home page bundle.
    component: () => import('./pages/DesignerPage.vue'),
    // Designs the cart; `?bo-suu-tap=<slug>` designs one collection instead and `?buoc=dat-hang`
    // opens the checkout right away (the cart's "Đặt hàng").
    props: (route) => ({
      collectionSlug:
        typeof route.query['bo-suu-tap'] === 'string' ? route.query['bo-suu-tap'] : undefined,
      checkout: route.query.buoc === 'dat-hang',
    }),
    meta: { title: 'Thiết kế bộ quà', hideFooter: true },
  },
  {
    path: '/tra-cuu-don-hang',
    name: 'order-lookup',
    component: () => import('./pages/OrderLookupPage.vue'),
    meta: { title: 'Tra cứu đơn hàng' },
  },
  {
    path: '/gio-hang',
    name: 'cart',
    component: () => import('./pages/CartPage.vue'),
    meta: { title: 'Giỏ hàng' },
  },
  {
    path: '/don-hang/:id',
    name: 'order',
    component: () => import('./pages/OrderPage.vue'),
    props: true,
    meta: { title: 'Đơn hàng' },
  },
  // Catalog pages read the public API; each is its own chunk.
  {
    path: '/san-pham',
    name: 'products',
    component: () => import('./pages/ProductsPage.vue'),
    meta: { title: 'Sản phẩm' },
    // Old filter links (?danh-muc=<slug>) moved to /danh-muc/<path>; every old category is a root.
    beforeEnter: (to) => {
      const old = to.query['danh-muc']
      const path = (Array.isArray(old) ? old[0] : old)?.trim()
      if (!path) return true
      const query = { ...to.query }
      delete query['danh-muc']
      return { name: 'category', params: { path: path.split('/') }, query, replace: true }
    },
  },
  {
    // Products of a category and its descendants: /danh-muc/ao/ao-thun (the category path).
    path: '/danh-muc/:path+',
    name: 'category',
    component: () => import('./pages/ProductsPage.vue'),
    meta: { title: 'Sản phẩm' },
  },
  {
    path: '/san-pham/:slug',
    name: 'product',
    component: () => import('./pages/ProductDetailPage.vue'),
    props: true,
    meta: { title: 'Sản phẩm' },
  },
  {
    path: '/bo-suu-tap',
    name: 'collections',
    component: () => import('./pages/CollectionsPage.vue'),
    meta: { title: 'Bộ sưu tập' },
  },
  {
    path: '/bo-suu-tap/:slug',
    name: 'collection',
    component: () => import('./pages/CollectionPage.vue'),
    props: true,
    meta: { title: 'Bộ sưu tập' },
  },
  ...comingSoon.map(({ path, title }) => ({
    path,
    name: path.slice(1),
    component: ComingSoonPage,
    meta: { title },
  })),
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: NotFoundPage,
    meta: { title: 'Không tìm thấy trang' },
  },
]

export function createAppRouter(
  history: RouterHistory = createWebHistory(import.meta.env.BASE_URL),
) {
  const router = createRouter({
    history,
    routes,
    scrollBehavior: (_to, _from, saved) => saved ?? { top: 0 },
  })

  // Document title: "<page> – <default title>"; the home page keeps the default one.
  const baseTitle = typeof document === 'undefined' ? '' : document.title
  router.afterEach((to) => {
    if (typeof document === 'undefined') return
    document.title = to.meta.title ? `${to.meta.title} – ${baseTitle}` : baseTitle
  })

  return router
}
