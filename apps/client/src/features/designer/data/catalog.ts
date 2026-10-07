import type { Background, Category, DesignPreset, Product, SelectionRules } from '../types'
import { backgroundImage, designImage, productImage } from './assets'

/*
 * DEVELOPMENT DATA — not the final catalog.
 * Images are the user-provided development files in src/assets (1024×768 JPEG with the checkerboard
 * drawn into the pixels, i.e. not a real transparent cut-out). Product names, embroidery zones and
 * display scales are provisional estimates until real product data and measurements exist.
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

// Intrinsic size of the provided development images.
const devImageSize = { width: 1024, height: 768 }

export const products: Product[] = [
  {
    id: 'bodysuit',
    name: 'Bodysuit cộc tay – Trắng',
    categoryId: SHIRT_CATEGORY_ID,
    image: { ...productImage('bodysuit'), ...devImageSize },
    displayScale: 1,
    // Calibrated against Bodysuit.jpeg (1024×768) for acceptance testing: the chest zone sits on
    // the flat fabric right of the diagonal placket; the lower zone right of the snap line.
    // Still provisional — not a workshop-approved embroidery area.
    embroideryZones: [
      {
        id: 'chest',
        name: 'Ngực áo',
        x: 0.47,
        y: 0.27,
        width: 0.18,
        height: 0.14,
        allowedContent: ['text', 'image'],
      },
      {
        id: 'lower',
        name: 'Thân dưới',
        x: 0.41,
        y: 0.5,
        width: 0.2,
        height: 0.13,
        allowedContent: ['text', 'image'],
      },
    ],
    provisional: true,
  },
  {
    id: 'bodysuit-dai-tay',
    name: 'Bodysuit dài tay – Trắng',
    categoryId: SHIRT_CATEGORY_ID,
    image: { ...productImage('bodysuit-dai-tay'), ...devImageSize },
    displayScale: 1.1,
    embroideryZones: [
      {
        id: 'chest',
        name: 'Ngực áo',
        x: 0.4,
        y: 0.22,
        width: 0.2,
        height: 0.12,
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
        x: 0.38,
        y: 0.17,
        width: 0.24,
        height: 0.14,
        allowedContent: ['text', 'image'],
      },
    ],
    provisional: true,
  },
  {
    id: 'hat',
    name: 'Mũ sơ sinh – Trắng',
    categoryId: 'hat',
    image: { ...productImage('hat'), ...devImageSize },
    displayScale: 0.5,
    embroideryZones: [
      {
        id: 'band',
        name: 'Vành mũ',
        x: 0.32,
        y: 0.7,
        width: 0.36,
        height: 0.11,
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
        x: 0.35,
        y: 0.4,
        width: 0.3,
        height: 0.25,
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
        x: 0.47,
        y: 0.35,
        width: 0.25,
        height: 0.2,
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
