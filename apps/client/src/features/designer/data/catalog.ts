import type { Background, Category, DesignPreset, Product, SelectionRules } from '../types'
import { backgroundImage, designImage, productImage } from './assets'

/*
 * DEVELOPMENT DATA — not the final catalog.
 * Product images are the user-provided transparent PNG cut-outs in src/assets/products (1448×1086,
 * RGBA); a product id equals its file name without extension (suit.png → "suit"). Names, embroidery
 * zones and display scales are provisional estimates until real product data and measurements
 * exist; zones were placed by eye on these images and are not workshop-approved.
 */

export const SHIRT_CATEGORY_ID = 'shirt'

export const categories: Category[] = [
  { id: SHIRT_CATEGORY_ID, name: 'Áo' },
  { id: 'towel', name: 'Khăn' },
  { id: 'hat', name: 'Mũ' },
  { id: 'bib', name: 'Yếm' },
  { id: 'mittens', name: 'Bao tay' },
]

export const selectionRules: SelectionRules = {
  maxItems: 10,
  categoryLimits: { [SHIRT_CATEGORY_ID]: 3 },
}

// Intrinsic size of the provided product PNGs (all six share it).
const devImageSize = { width: 1448, height: 1086 }

export const products: Product[] = [
  {
    id: 'suit',
    name: 'Bodysuit cộc tay – Trắng',
    categoryId: SHIRT_CATEGORY_ID,
    image: { ...productImage('suit'), ...devImageSize },
    displayScale: 1,
    // Placed by eye on suit.png: chest on the flat fabric right of the diagonal placket, lower body
    // right of the snap line. Provisional — not a workshop-approved embroidery area.
    embroideryZones: [
      {
        id: 'chest',
        name: 'Ngực áo',
        x: 0.45,
        y: 0.24,
        width: 0.2,
        height: 0.13,
        allowedContent: ['text', 'image'],
      },
      {
        id: 'lower',
        name: 'Thân dưới',
        x: 0.43,
        y: 0.5,
        width: 0.19,
        height: 0.12,
        allowedContent: ['text', 'image'],
      },
    ],
    provisional: true,
  },
  {
    id: 'suit-2',
    name: 'Bodysuit dài tay – Trắng',
    categoryId: SHIRT_CATEGORY_ID,
    image: { ...productImage('suit-2'), ...devImageSize },
    displayScale: 1.1,
    embroideryZones: [
      {
        id: 'chest',
        name: 'Ngực áo',
        x: 0.53,
        y: 0.17,
        width: 0.11,
        height: 0.1,
        allowedContent: ['text', 'image'],
      },
    ],
    provisional: true,
  },
  {
    id: 'khan',
    name: 'Khăn choàng có mũ – Trắng',
    categoryId: 'towel',
    image: { ...productImage('khan'), ...devImageSize },
    displayScale: 1,
    embroideryZones: [
      {
        id: 'hood',
        name: 'Mũ khăn',
        x: 0.39,
        y: 0.17,
        width: 0.22,
        height: 0.12,
        allowedContent: ['text', 'image'],
      },
    ],
    provisional: true,
  },
  {
    id: 'mu',
    name: 'Mũ sơ sinh – Trắng',
    categoryId: 'hat',
    image: { ...productImage('mu'), ...devImageSize },
    displayScale: 0.5,
    embroideryZones: [
      {
        id: 'band',
        name: 'Vành mũ',
        x: 0.31,
        y: 0.745,
        width: 0.38,
        height: 0.1,
        allowedContent: ['text'],
      },
    ],
    provisional: true,
  },
  {
    id: 'yem',
    name: 'Yếm – Trắng',
    categoryId: 'bib',
    image: { ...productImage('yem'), ...devImageSize },
    displayScale: 0.6,
    embroideryZones: [
      {
        id: 'center',
        name: 'Giữa yếm',
        x: 0.33,
        y: 0.48,
        width: 0.34,
        height: 0.24,
        allowedContent: ['text', 'image'],
      },
    ],
    provisional: true,
  },
  {
    id: 'bao-tay',
    name: 'Bao tay – Trắng',
    categoryId: 'mittens',
    image: { ...productImage('bao-tay'), ...devImageSize },
    displayScale: 0.4,
    embroideryZones: [
      {
        id: 'front',
        name: 'Mặt bao tay',
        x: 0.52,
        y: 0.32,
        width: 0.2,
        height: 0.13,
        allowedContent: ['text'],
      },
    ],
    provisional: true,
  },
]

export const backgrounds: Background[] = [
  {
    id: 'anh-nen',
    name: 'Nền mặc định',
    image: { ...backgroundImage('anh-nen'), width: 1024, height: 559 },
    provisional: true,
  },
]

/** Used while only one background exists; customers will choose once more are available. */
export const DEFAULT_BACKGROUND_ID = 'anh-nen'

export const designPresets: DesignPreset[] = [
  {
    id: 'icon',
    name: 'Biểu tượng mẫu',
    image: { ...designImage('icon'), width: 1024, height: 768 },
    provisional: true,
  },
]

export function categoryName(id: string): string {
  return categories.find((category) => category.id === id)?.name ?? ''
}
