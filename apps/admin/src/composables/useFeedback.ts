import { App } from 'ant-design-vue'
import { errorMessage } from '../api/httpClient'

/** Toast messages and confirmations themed by the app's ConfigProvider. */
export function useFeedback() {
  const { message, modal } = App.useApp()
  return {
    success: (text: string) => void message.success(text),
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
  }
}
