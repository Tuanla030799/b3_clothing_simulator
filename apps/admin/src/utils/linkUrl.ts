/**
 * Client-side version of the API link rule for banners (README "Link rules"): empty, an internal
 * path with exactly one leading slash, or an absolute https URL without credentials; no
 * whitespace, control characters or backslashes. The API checks again.
 */
export function linkUrlProblem(value: string): string | null {
  const link = value.trim()
  if (!link) return null
  // eslint-disable-next-line no-control-regex
  if (/[\s\u0000-\u001f\u007f\\]/.test(link)) return 'Không được có khoảng trắng hoặc dấu \\.'
  if (link.length > 2048) return 'Tối đa 2048 ký tự.'
  if (link.startsWith('/')) {
    return link.startsWith('//') ? 'Đường dẫn trong trang bắt đầu bằng một dấu /.' : null
  }
  if (!link.startsWith('https://')) return 'Dùng đường dẫn bắt đầu bằng / hoặc https://.'
  try {
    const url = new URL(link)
    if (url.username || url.password) return 'Liên kết không được chứa tài khoản.'
    if (!url.hostname.includes('.') && !url.hostname.startsWith('['))
      return 'Tên miền không hợp lệ.'
    return null
  } catch {
    return 'Liên kết không hợp lệ.'
  }
}
