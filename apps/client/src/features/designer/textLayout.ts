import { DESIGN_FONT } from './data/designOptions'

/*
 * Text layout for the lettering font. The box is computed from the real ink bounds of every line
 * (canvas measureText actualBoundingBox*), so stacked Vietnamese diacritics (ễ, ậ, Ọ) and script
 * swashes are inside the box and never cropped. Lines are centred; line breaks are kept exactly
 * as typed and the text is never re-wrapped.
 */

/** Font size used to measure; layouts scale linearly to any other size. */
export const REFERENCE_FONT_SIZE = 100

export interface LineMetrics {
  /** Ink extent left / right of the line centre. */
  left: number
  right: number
  /** Ink extent above / below the baseline. */
  ascent: number
  descent: number
}

export interface TextLayout {
  /** Box size at REFERENCE_FONT_SIZE. */
  width: number
  height: number
  /** Line centre x and baseline y inside the box, at REFERENCE_FONT_SIZE. */
  lines: { text: string; x: number; y: number }[]
}

export function designFontCss(sizePx: number): string {
  return `${DESIGN_FONT.weight} ${sizePx}px "${DESIGN_FONT.family}"`
}

export function hasVisibleText(content: string): boolean {
  return content.trim().length > 0
}

/** Returns null for blank text. `measure` is called at REFERENCE_FONT_SIZE with centred text. */
export function layoutText(
  content: string,
  measure: (line: string) => LineMetrics,
): TextLayout | null {
  if (!hasVisibleText(content)) return null
  const size = REFERENCE_FONT_SIZE
  const advance = size * DESIGN_FONT.lineHeight
  const padding = size * 0.08

  const raw = content.split('\n')
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  raw.forEach((line, index) => {
    if (!hasVisibleText(line)) return
    const m = measure(line)
    const baseline = index * advance
    minX = Math.min(minX, -m.left)
    maxX = Math.max(maxX, m.right)
    minY = Math.min(minY, baseline - m.ascent)
    maxY = Math.max(maxY, baseline + m.descent)
  })

  return {
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
    lines: raw.map((text, index) => ({
      text,
      x: -minX + padding,
      y: index * advance - minY + padding,
    })),
  }
}

let measureContext: CanvasRenderingContext2D | null = null

/** Browser measurement with the lettering font. Call only after the font has loaded. */
export function measureWithCanvas(line: string): LineMetrics {
  measureContext ??= document.createElement('canvas').getContext('2d')
  if (!measureContext) throw new Error('Canvas 2D context is not available')
  measureContext.font = designFontCss(REFERENCE_FONT_SIZE)
  measureContext.textAlign = 'center'
  measureContext.textBaseline = 'alphabetic'
  const m = measureContext.measureText(line)
  return {
    left: m.actualBoundingBoxLeft,
    right: m.actualBoundingBoxRight,
    ascent: m.actualBoundingBoxAscent,
    descent: m.actualBoundingBoxDescent,
  }
}

/**
 * Loads the lettering font faces needed for `text` (unicode-range subsets included) and confirms
 * they are really loaded. Resolves false instead of letting the browser fall back silently.
 */
export async function loadDesignFont(text: string, fonts: FontFaceSet = document.fonts) {
  const css = designFontCss(REFERENCE_FONT_SIZE)
  try {
    const faces = await fonts.load(css, text)
    return (
      faces.length > 0 && faces.every((face) => face.status === 'loaded') && fonts.check(css, text)
    )
  } catch {
    return false
  }
}
