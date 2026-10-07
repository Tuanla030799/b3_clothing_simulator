/*
 * Images of the home page, found by file name (without extension) in src/assets/home. Files are
 * discovered at build time, so a missing file never becomes a broken import or request.
 * src/assets/home/_reference holds git-ignored reference images for local mockups; a file with the
 * same name directly in src/assets/home takes precedence.
 */
const files = import.meta.glob<string>('../../../assets/home/**/*.{png,jpg,jpeg,webp,avif}', {
  eager: true,
  import: 'default',
  query: '?url',
})

const byName = new Map<string, string>()
// Reference files first, so committed files override them.
const entries = Object.entries(files).sort(
  ([a], [b]) => Number(b.includes('/_reference/')) - Number(a.includes('/_reference/')),
)
for (const [path, url] of entries) {
  const name = (path.split('/').pop() ?? '').replace(/\.[^.]+$/, '')
  byName.set(name, url)
}

export function homeImage(name: string | undefined): string | undefined {
  return name ? byName.get(name) : undefined
}
