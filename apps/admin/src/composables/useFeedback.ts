import { App } from 'ant-design-vue'
import { errorMessage } from '../api/httpClient'

/** Toast messages and confirmations themed by the app's ConfigProvider. */
export function useFeedback() {
  const { message, modal } = App.useApp()
  return {
    success: (text: string) => void message.success(text),
    /** A problem found before calling the API (the form shows the details). */
    warning: (text: string) => void message.warning(text, 5),
    /** Shows the Vietnamese message for an API failure (or any error). */
    error: (error: unknown) => void message.error(errorMessage(error), 6),
    confirmDelete: (title: string, content: string, onOk: () => Promise<unknown>) =>
      modal.confirm({
        title,
        content,
        okText: 'Xóa',
        okButtonProps: { danger: true },
        cancelText: 'Hủy',
        onOk,
      }),
    /** Asks before leaving a page with unsaved changes; resolves true to leave. */
    confirmLeave: () =>
      new Promise<boolean>((resolve) =>
        modal.confirm({
          title: 'Rời trang khi chưa lưu?',
          content: 'Các thay đổi chưa lưu sẽ bị mất.',
          okText: 'Rời trang',
          cancelText: 'Ở lại',
          onOk: () => resolve(true),
          onCancel: () => resolve(false),
        }),
      ),
  }
}
