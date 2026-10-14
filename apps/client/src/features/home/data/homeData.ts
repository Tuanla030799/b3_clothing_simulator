import type { Commitment, ProcessStep, Review } from '../types'

/*
 * Fixed home page content that the API does not manage (banners, products and collections come
 * from the API). Neutral texts: no promotions, prices, delivery times or shipping claims.
 */

/** Fixed content (not from the backend): the shop's standing promises. Copy to be confirmed. */
export const commitments: Commitment[] = [
  { id: 'handmade', title: 'Làm thủ công cẩn thận' },
  { id: 'personal', title: 'Cá nhân hóa tên và hình' },
  { id: 'preview', title: 'Xem trước cả bộ' },
  { id: 'gift', title: 'Sẵn sàng để tặng' },
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
