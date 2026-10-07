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
