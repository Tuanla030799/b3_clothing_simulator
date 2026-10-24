import { createRouter, createWebHistory, type RouterHistory, type RouteRecordRaw } from 'vue-router'
import { session } from './api/client'
import AdminLayout from './layouts/AdminLayout.vue'

declare module 'vue-router' {
  interface RouteMeta {
    /** Page name for the document title and the menu. */
    title?: string
    /** Reachable without signing in (the login page). */
    public?: boolean
  }
}

export const routes: RouteRecordRaw[] = [
  {
    path: '/dang-nhap',
    name: 'login',
    component: () => import('./pages/LoginPage.vue'),
    meta: { title: 'Đăng nhập', public: true },
  },
  {
    path: '/',
    component: AdminLayout,
    children: [
      { path: '', redirect: '/don-hang' },
      {
        path: 'don-hang',
        name: 'orders',
        component: () => import('./pages/OrdersPage.vue'),
        meta: { title: 'Đơn hàng' },
      },
      {
        path: 'don-hang/:id',
        name: 'order',
        component: () => import('./pages/OrderDetailPage.vue'),
        props: true,
        meta: { title: 'Đơn hàng' },
      },
      {
        path: 'san-pham',
        name: 'products',
        component: () => import('./pages/ProductsPage.vue'),
        meta: { title: 'Sản phẩm' },
      },
      {
        path: 'san-pham/noi-bat',
        name: 'featured-products',
        component: () => import('./pages/FeaturedProductsPage.vue'),
        meta: { title: 'Sản phẩm nổi bật' },
      },
      {
        path: 'san-pham/moi',
        name: 'product-new',
        component: () => import('./pages/ProductCreatePage.vue'),
        meta: { title: 'Thêm sản phẩm' },
      },
      {
        path: 'san-pham/:id',
        name: 'product',
        component: () => import('./pages/ProductDetailPage.vue'),
        props: true,
        meta: { title: 'Sản phẩm' },
      },
      {
        path: 'san-pham/:id/thiet-ke',
        name: 'product-design',
        component: () => import('./pages/ProductDesignPage.vue'),
        props: true,
        meta: { title: 'Thiết kế thêu' },
      },
      {
        path: 'san-pham/:id/mau/moi',
        name: 'color-new',
        component: () => import('./pages/ColorPage.vue'),
        props: true,
        meta: { title: 'Thêm màu' },
      },
      {
        path: 'san-pham/:id/mau/:colorId',
        name: 'color',
        component: () => import('./pages/ColorPage.vue'),
        props: true,
        meta: { title: 'Màu sản phẩm' },
      },
      {
        path: 'danh-muc',
        name: 'categories',
        component: () => import('./pages/CategoriesPage.vue'),
        meta: { title: 'Danh mục' },
      },
      {
        path: 'bo-suu-tap',
        name: 'collections',
        component: () => import('./pages/CollectionsPage.vue'),
        meta: { title: 'Bộ sưu tập' },
      },
      {
        path: 'bo-suu-tap/moi',
        name: 'collection-new',
        component: () => import('./pages/CollectionCreatePage.vue'),
        meta: { title: 'Thêm bộ sưu tập' },
      },
      {
        path: 'bo-suu-tap/:id',
        name: 'collection',
        component: () => import('./pages/CollectionDetailPage.vue'),
        props: true,
        meta: { title: 'Bộ sưu tập' },
      },
      {
        path: 'banner',
        name: 'banners',
        component: () => import('./pages/BannersPage.vue'),
        meta: { title: 'Banner' },
      },
      {
        path: 'thiet-ke/nen',
        name: 'backgrounds',
        component: () => import('./pages/DesignAssetsPage.vue'),
        props: { kind: 'backgrounds' },
        meta: { title: 'Nền xem cả bộ' },
      },
      {
        path: 'thiet-ke/hinh-co-san',
        name: 'presets',
        component: () => import('./pages/DesignAssetsPage.vue'),
        props: { kind: 'design-presets' },
        meta: { title: 'Hình có sẵn' },
      },
      {
        path: 'thiet-ke/mau-sap-xep',
        name: 'layouts',
        component: () => import('./pages/DesignLayoutsPage.vue'),
        meta: { title: 'Mẫu sắp xếp' },
      },
      {
        path: 'thiet-ke/mau-sap-xep/tao-moi',
        name: 'layout-create',
        component: () => import('./pages/DesignLayoutEditPage.vue'),
        meta: { title: 'Thêm mẫu sắp xếp' },
      },
      {
        path: 'thiet-ke/mau-sap-xep/:id',
        name: 'layout',
        component: () => import('./pages/DesignLayoutEditPage.vue'),
        props: true,
        meta: { title: 'Sửa mẫu sắp xếp' },
      },
      {
        path: 'thiet-ke/cai-dat',
        name: 'designer-settings',
        component: () => import('./pages/DesignerSettingsPage.vue'),
        meta: { title: 'Giới hạn bộ quà' },
      },
      {
        path: ':pathMatch(.*)*',
        name: 'not-found',
        component: () => import('./pages/NotFoundPage.vue'),
        meta: { title: 'Không tìm thấy trang' },
      },
    ],
  },
]

export function createAdminRouter(
  history: RouterHistory = createWebHistory(import.meta.env.BASE_URL),
) {
  const router = createRouter({ history, routes, scrollBehavior: () => ({ top: 0 }) })
  let restoring: Promise<unknown> | null = null

  router.beforeEach(async (to) => {
    // First navigation: resume a stored session before deciding.
    if (session.status.value === 'unknown') {
      restoring ??= session.restore()
      await restoring
    }
    const signedIn = session.status.value === 'authenticated'
    if (to.meta.public) return signedIn ? (redirectTarget(to.query.redirect) ?? '/') : true
    if (!signedIn) return { name: 'login', query: { redirect: to.fullPath } }
    return true
  })

  router.afterEach((to) => {
    if (typeof document !== 'undefined') {
      document.title = to.meta.title ? `${to.meta.title} – Lituta Admin` : 'Lituta Admin'
    }
  })

  // A session that ends while working (refresh rejected) returns to the login page.
  session.onExpired(() => {
    const current = router.currentRoute.value
    if (!current.meta.public)
      void router.push({ name: 'login', query: { redirect: current.fullPath } })
  })

  return router
}

/** Only in-app paths are accepted as a redirect after login. */
export function redirectTarget(value: unknown): string | null {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')
    ? value
    : null
}
