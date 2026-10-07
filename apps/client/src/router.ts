import { createRouter, createWebHistory, type RouterHistory, type RouteRecordRaw } from 'vue-router'
import ComingSoonPage from './pages/ComingSoonPage.vue'
import HomePage from './pages/HomePage.vue'
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
  { path: '/san-pham', title: 'Sản phẩm' },
  { path: '/bo-suu-tap', title: 'Bộ sưu tập' },
  { path: '/tra-cuu-don-hang', title: 'Tra cứu đơn hàng' },
  { path: '/gio-hang', title: 'Giỏ hàng' },
  { path: '/lien-he', title: 'Liên hệ' },
  { path: '/ve-chung-toi', title: 'Về chúng tôi' },
]

export const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: HomePage },
  {
    path: '/thiet-ke',
    name: 'designer',
    // Loaded on demand: the design tool (and Konva) is not part of the home page bundle.
    component: () => import('./pages/DesignerPage.vue'),
    meta: { title: 'Thiết kế bộ quà', hideFooter: true },
  },
  // Collection pages share the placeholder until they are built.
  {
    path: '/bo-suu-tap/:slug',
    name: 'collection',
    component: ComingSoonPage,
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
