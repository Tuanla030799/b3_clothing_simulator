import type { BannerSlide, Commitment, ProcessStep, Review, SeasonalCollection } from '../types'

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

/** Steps of the buying flow (wording to be confirmed). Images are optional placeholders. */
export const processSteps: ProcessStep[] = [
  {
    id: 'choose',
    title: 'Chọn sản phẩm',
    description: 'Chọn những món bạn thích từ danh mục đồ sơ sinh.',
    image: 'process-1',
  },
  {
    id: 'options',
    title: 'Chọn màu và kích cỡ',
    description: 'Chọn màu sắc và kích cỡ phù hợp với bé.',
    image: 'process-2',
  },
  {
    id: 'design',
    title: 'Thiết kế nếu muốn',
    description: 'Thêm tên hoặc logo vào vùng thêu và xem trước cả bộ.',
    image: 'process-3',
  },
  {
    id: 'order',
    title: 'Xác nhận đặt hàng',
    description: 'Nhập thông tin nhận hàng và xác nhận đơn của bạn.',
    image: 'process-4',
  },
]

/**
 * MOCK reviews: placeholder content, every card is labelled "Dữ liệu mẫu" while `isSample` is true.
 * No average rating or review count is shown because no real numbers exist.
 */
export const reviews: Review[] = [
  {
    id: 'sample-1',
    author: 'Khách hàng mẫu 1',
    rating: 5,
    text: 'Nội dung đánh giá mẫu: bộ quà được thêu tên gọn gàng, đóng gói cẩn thận.',
    product: 'Bodysuit',
    isSample: true,
  },
  {
    id: 'sample-2',
    author: 'Khách hàng mẫu 2',
    rating: 5,
    text: 'Nội dung đánh giá mẫu: xem trước cả bộ giúp mình chọn được kiểu chữ ưng ý.',
    product: 'Khăn choàng',
    isSample: true,
  },
  {
    id: 'sample-3',
    author: 'Khách hàng mẫu 3',
    rating: 4,
    text: 'Nội dung đánh giá mẫu: chất vải mềm, phù hợp làm quà cho bé sơ sinh.',
    product: 'Mũ sơ sinh',
    isSample: true,
  },
]
