import type { Background, Category, DesignPreset, Product, SelectionRules } from '../types'
import { backgroundImage, designImage, productImage } from './assets'

/*
 * DEVELOPMENT DATA — not the final catalog.
 * Product names, embroidery zones and display scales are provisional placeholders until the real
 * product images and measurements are provided. Do not treat them as real dimensions.
 */

export const SHIRT_CATEGORY_ID = 'shirt'

export const categories: Category[] = [
  { id: SHIRT_CATEGORY_ID, name: 'Áo' },
  { id: 'towel', name: 'Khăn' },
  { id: 'hat', name: 'Mũ' },
  { id: 'bib', name: 'Yếm' },
]

export const selectionRules: SelectionRules = {
  maxItems: 10,
  categoryLimits: { [SHIRT_CATEGORY_ID]: 3 },
}

export const products: Product[] = [
  {
    id: 'shirt-basic-white',
    name: 'Áo cộc tay – Trắng',
    categoryId: SHIRT_CATEGORY_ID,
    image: productImage('shirt-basic-white'),
    displayScale: 1,
    embroideryZones: [
      {
        id: 'chest',
        name: 'Ngực áo',
        x: 0.35,
        y: 0.3,
        width: 0.3,
        height: 0.15,
        allowedContent: ['text', 'image'],
      },
    ],
    provisional: true,
  },
  {
    id: 'shirt-basic-pink',
    name: 'Áo cộc tay – Hồng phấn',
    categoryId: SHIRT_CATEGORY_ID,
    image: productImage('shirt-basic-pink'),
    displayScale: 1,
    embroideryZones: [
      {
        id: 'chest',
        name: 'Ngực áo',
        x: 0.35,
        y: 0.3,
        width: 0.3,
        height: 0.15,
        allowedContent: ['text', 'image'],
      },
    ],
    provisional: true,
  },
  {
    id: 'towel-square-cream',
    name: 'Khăn sữa – Kem',
    categoryId: 'towel',
    image: productImage('towel-square-cream'),
    displayScale: 0.8,
    embroideryZones: [
      {
        id: 'corner',
        name: 'Góc khăn',
        x: 0.6,
        y: 0.7,
        width: 0.3,
        height: 0.2,
        allowedContent: ['text'],
      },
    ],
    provisional: true,
  },
  {
    id: 'hat-beanie-white',
    name: 'Mũ sơ sinh – Trắng',
    categoryId: 'hat',
    image: productImage('hat-beanie-white'),
    displayScale: 0.6,
    embroideryZones: [
      {
        id: 'front',
        name: 'Mặt trước',
        x: 0.3,
        y: 0.55,
        width: 0.4,
        height: 0.2,
        allowedContent: ['text', 'image'],
      },
    ],
    provisional: true,
  },
  {
    id: 'bib-round-pink',
    name: 'Yếm tròn – Hồng phấn',
    categoryId: 'bib',
    image: productImage('bib-round-pink'),
    displayScale: 0.6,
    embroideryZones: [
      {
        id: 'center',
        name: 'Giữa yếm',
        x: 0.3,
        y: 0.4,
        width: 0.4,
        height: 0.25,
        allowedContent: ['text', 'image'],
      },
    ],
    provisional: true,
  },
]

export const backgrounds: Background[] = [
  { id: 'default', name: 'Nền mặc định', image: backgroundImage('default'), provisional: true },
]

/** Used while only one background exists; customers will choose once more are available. */
export const DEFAULT_BACKGROUND_ID = 'default'

export const designPresets: DesignPreset[] = [
  { id: 'heart', name: 'Trái tim', image: designImage('heart'), provisional: true },
  { id: 'star', name: 'Ngôi sao', image: designImage('star'), provisional: true },
]
