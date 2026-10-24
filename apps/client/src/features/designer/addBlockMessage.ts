import type { AddBlockReason } from './selection'

/** Short customer-facing reason for a blocked add. Numbers come from the rules in the reason. */
export function addBlockMessage(reason: AddBlockReason): string {
  switch (reason.code) {
    case 'max-items':
      return `Đơn đã đủ ${reason.limit} món`
    case 'unknown-product':
      return 'Sản phẩm không còn trong danh mục'
    case 'locked':
      return 'Đang tạo ảnh, vui lòng đợi'
  }
}
