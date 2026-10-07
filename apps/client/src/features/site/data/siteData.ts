import type { Announcement, NavLink, SiteFooterData } from '../types'

/*
 * MOCK DATA — replaced by backend/admin data later. Texts are neutral placeholders (no promotions,
 * prices or shipping claims). Links go to routes that exist; pages not built yet show a
 * "coming soon" page.
 */

export const brandName = 'Lituta'

export const announcement: Announcement = {
  id: 'welcome',
  text: 'Chào mừng bạn đến với Lituta — đồ sơ sinh thêu tên theo thiết kế của bạn.',
}

export const navItems: NavLink[] = [
  { id: 'home', label: 'Trang chủ', to: '/' },
  { id: 'products', label: 'Sản phẩm', to: '/san-pham' },
  { id: 'collections', label: 'Bộ sưu tập', to: '/bo-suu-tap' },
  { id: 'order-lookup', label: 'Tra cứu đơn hàng', to: '/tra-cuu-don-hang' },
]

export const cartLink: NavLink = { id: 'cart', label: 'Giỏ hàng', to: '/gio-hang' }

export const footer: SiteFooterData = {
  description: 'Đồ sơ sinh được cá nhân hóa tên và hình theo ý bạn, xem trước cả bộ trước khi đặt.',
  columns: [
    {
      id: 'shop',
      title: 'Mua sắm',
      links: [
        { id: 'products', label: 'Sản phẩm', to: '/san-pham' },
        { id: 'collections', label: 'Bộ sưu tập', to: '/bo-suu-tap' },
        { id: 'designer', label: 'Thiết kế bộ quà', to: '/thiet-ke' },
      ],
    },
    {
      id: 'help',
      title: 'Hỗ trợ',
      links: [
        { id: 'order-lookup', label: 'Tra cứu đơn hàng', to: '/tra-cuu-don-hang' },
        { id: 'contact', label: 'Liên hệ', to: '/lien-he' },
      ],
    },
    {
      id: 'about',
      title: 'Về chúng tôi',
      links: [{ id: 'story', label: 'Câu chuyện', to: '/ve-chung-toi' }],
    },
  ],
  // Platform home pages as placeholders; real profile URLs come from the backend later.
  socials: [
    { id: 'facebook', label: 'Facebook', href: 'https://www.facebook.com/' },
    { id: 'instagram', label: 'Instagram', href: 'https://www.instagram.com/' },
    { id: 'tiktok', label: 'TikTok', href: 'https://www.tiktok.com/' },
  ],
}
