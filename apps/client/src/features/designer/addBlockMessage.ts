import { categoryName } from './data/catalog'
import type { AddBlockReason } from './selection'

/** Short customer-facing reason for a blocked add. Numbers come from the rules in the reason. */
export function addBlockMessage(reason: AddBlockReason): string {
  switch (reason.code) {
    case 'max-items':
      return `Bộ đã đủ ${reason.limit} món`
    case 'category-limit':
      return `Tối đa ${reason.limit} món loại ${categoryName(reason.categoryId).toLowerCase()}`
    case 'unknown-product':
      return 'Sản phẩm không còn trong danh mục'
    case 'locked':
      return 'Đang tạo ảnh, vui lòng đợi'
  }
}
