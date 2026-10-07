import type { BannerSlide, Commitment, SeasonalCollection } from '../types'

/*
 * MOCK DATA — replaced by backend/admin data later. Neutral placeholder texts: no promotions,
 * prices, delivery times or shipping claims.
 */

export const bannerSlides: BannerSlide[] = [
  {
    id: 'personal',
    title: 'Quà sơ sinh mang tên bé',
    description: 'Thêu tên hoặc logo theo ý bạn lên từng món trong bộ.',
    cta: { label: 'Bắt đầu thiết kế', to: '/thiet-ke' },
    image: 'banner-1',
  },
  {
    id: 'preview',
    title: 'Xem cả bộ trước khi đặt',
    description: 'Sắp xếp các món lên nền và xem trước toàn bộ quà tặng.',
    cta: { label: 'Xem sản phẩm', to: '/san-pham' },
    image: 'banner-2',
  },
  {
    id: 'seasonal',
    title: 'Quà tặng cho từng dịp',
    description: 'Khám phá các bộ sưu tập quà tặng theo mùa trong năm.',
    cta: { label: 'Xem bộ sưu tập', to: '/bo-suu-tap' },
    image: 'banner-3',
  },
]

/** Fixed content (not from the backend): the shop's standing promises. Copy to be confirmed. */
export const commitments: Commitment[] = [
  { id: 'handmade', title: 'Làm thủ công cẩn thận' },
  { id: 'personal', title: 'Cá nhân hóa tên và hình' },
  { id: 'preview', title: 'Xem trước cả bộ' },
  { id: 'gift', title: 'Sẵn sàng để tặng' },
]

/** Catalog product ids shown in "Sản phẩm nổi bật"; ids missing from the catalog are skipped. */
export const featuredProductIds = ['suit', 'suit-2', 'khan', 'mu', 'yem', 'bao-tay']

/** Mock seasonal collections (no images yet: placeholders are shown). */
export const seasonalCollections: SeasonalCollection[] = [
  { id: 'giang-sinh', name: 'Giáng sinh', to: '/bo-suu-tap/giang-sinh' },
  { id: 'tet', name: 'Tết', to: '/bo-suu-tap/tet' },
  { id: 'trung-thu', name: 'Trung thu', to: '/bo-suu-tap/trung-thu' },
  { id: 'mua-he', name: 'Mùa hè', to: '/bo-suu-tap/mua-he' },
  { id: 'mua-thu', name: 'Mùa thu', to: '/bo-suu-tap/mua-thu' },
  { id: 'mua-dong', name: 'Mùa đông', to: '/bo-suu-tap/mua-dong' },
]
