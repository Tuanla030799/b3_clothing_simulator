import type { AssetImage } from '../types'

/*
 * Asset files are discovered at build time, so a missing file never becomes a broken import or
 * request. Naming convention: <entity id>.<png|webp|jpg|jpeg|avif>. File names are normalized to
 * ids (lower case, spaces/underscores → "-"), so products/Bodysuit_dai_tay.jpeg resolves the
 * product id "bodysuit-dai-tay".
 */
type AssetMap = Record<string, string>

const products = import.meta.glob<string>('../../../assets/products/*.{png,webp,jpg,jpeg,avif}', {
  eager: true,
  import: 'default',
  query: '?url',
})
const backgrounds = import.meta.glob<string>(
  '../../../assets/backgrounds/*.{png,webp,jpg,jpeg,avif}',
  { eager: true, import: 'default', query: '?url' },
)
const designs = import.meta.glob<string>('../../../assets/designs/*.{png,webp,jpg,jpeg,avif,svg}', {
  eager: true,
  import: 'default',
  query: '?url',
})

function toAssetId(baseName: string): string {
  return baseName
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
}

function indexById(files: AssetMap): Map<string, string> {
  const byId = new Map<string, string>()
  for (const [path, url] of Object.entries(files)) {
    const fileName = path.split('/').pop() ?? ''
    byId.set(toAssetId(fileName.replace(/\.[^.]+$/, '')), url)
  }
  return byId
}

const productUrls = indexById(products)
const backgroundUrls = indexById(backgrounds)
const designUrls = indexById(designs)

/** Intrinsic sizes are not read here; record them in the catalog entry next to the image. */
export const productImage = (id: string): AssetImage => ({ src: productUrls.get(id) })
export const backgroundImage = (id: string): AssetImage => ({ src: backgroundUrls.get(id) })
export const designImage = (id: string): AssetImage => ({ src: designUrls.get(id) })
