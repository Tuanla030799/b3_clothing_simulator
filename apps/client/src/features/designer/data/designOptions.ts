/*
 * Personalization options (local configuration).
 * Text colors are preview colors for the design only — not confirmed embroidery thread colors.
 */

export interface TextColor {
  id: string
  name: string
  value: string
}

export const textColors: TextColor[] = [
  { id: 'dark-brown', name: 'Nâu đậm', value: '#4a3426' },
  { id: 'navy', name: 'Xanh navy', value: '#1f2d4d' },
  { id: 'dark-green', name: 'Xanh lá đậm', value: '#2f5233' },
  { id: 'earth-pink', name: 'Hồng đất', value: '#b5655e' },
  { id: 'white', name: 'Trắng', value: '#ffffff' },
]

export const DEFAULT_TEXT_COLOR_ID = 'dark-brown'

/** The only lettering font in V1 (Dancing Script 600, bundled by the client). */
export const DESIGN_FONT = {
  id: 'dancing-script-600',
  family: 'Dancing Script',
  weight: 600,
  /** Line advance as a multiple of the font size for multi-line text. */
  lineHeight: 1.3,
} as const

export type DesignFontId = typeof DESIGN_FONT.id

/**
 * Upload limits. Files are decoded in the browser only, so the limits protect mobile memory:
 * a 4096×4096 RGBA bitmap already needs ~64 MB, and iOS Safari caps canvas areas near 16.7 MP.
 */
export const UPLOAD_LIMITS = {
  maxBytes: 10 * 1024 * 1024,
  maxDimension: 4096,
  maxPixels: 4096 * 4096,
  /** Detected from file signatures, not from the extension or the browser-reported type. */
  types: ['image/png', 'image/jpeg', 'image/webp'] as const,
}

/** Minimum sizes as fractions of the zone height. */
export const LAYER_LIMITS = {
  /** Smallest image height. */
  minImageHeight: 0.1,
  /** Smallest font size for text; text that cannot fit at this size is rejected. */
  minFontSize: 0.1,
  /** Share of the largest fitting size used when a layer is placed for the first time. */
  initialFill: 0.8,
}

/*
 * Set composition (development configuration).
 * - Logical composition width is fixed; height follows the decoded background aspect ratio.
 * - Without a usable background a neutral 4:3 composition is used (provisional).
 * - categoryPriority only orders items in the layout (higher = earlier rows / centre), it never
 *   changes limits or sizes.
 * - Padding/gap are fractions of the shorter composition side.
 * - maxItemFill caps how tall the tallest item may be relative to the usable height, so a single
 *   item does not fill the whole background.
 */
export const COMPOSITION = {
  logicalWidth: 1200,
  fallbackSize: { width: 1200, height: 900 },
  /** Aspect (width / height) used for a product whose image is missing (placeholder only). */
  placeholderAspect: 4 / 3,
  paddingRatio: 0.04,
  gapRatio: 0.025,
  maxItemFill: 0.75,
  categoryPriority: { shirt: 2, towel: 1 } as Partial<Record<string, number>>,
}

/*
 * Image export (technical configuration). The PNG is raster output of the preview scene, not a
 * machine-embroidery file and not higher-detail than its source images.
 */
export const EXPORT = {
  /** Longer side of the PNG in pixels; the other side follows the composition aspect ratio. */
  longEdge: 2400,
  mimeType: 'image/png',
  /** `<prefix>-YYYYMMDD-HHmmss.png`; never contains customer names or embroidery text. */
  fileNamePrefix: 'lituta-bo-qua',
  /** How long a download object URL stays valid before it is revoked. */
  downloadUrlTtlMs: 60_000,
  /** Largest allowed side, as a guard against absurd configuration. */
  maxEdge: 8192,
}
