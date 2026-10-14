/** Slug rule of the API: lowercase letters/digits separated by single hyphens. */
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

/**
 * Suggests a slug from a Vietnamese name ("Áo thun Đỏ" → "ao-thun-do"). The API never derives
 * slugs itself, so this is only a starting value the admin can edit; changing a slug later
 * breaks the old URL.
 */
export function suggestSlug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
    .replace(/-+$/, '')
}
