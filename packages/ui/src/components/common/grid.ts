/** Number of columns in a Row. */
export const GRID_COLUMNS = 24

export type ColBreakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'

/** Mobile-first order; xs is the base (no media query), xxl maps to Tailwind `2xl`. */
export const COL_BREAKPOINTS: readonly ColBreakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl']

export type ColSize = number | { span?: number; offset?: number }

export type RowGutter = number | [number, number]

export interface ResolvedColLayout {
  span: number
  offset: number
}

function clampInt(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, Math.round(value)))
}

/**
 * Resolves span/offset for every breakpoint. Each breakpoint inherits span and offset
 * independently from the nearest smaller breakpoint unless it overrides them.
 */
export function resolveColLayout(
  base: { span: number; offset: number },
  sizes: Partial<Record<ColBreakpoint, ColSize | undefined>>,
): Record<ColBreakpoint, ResolvedColLayout> {
  let span = clampInt(base.span, 0, GRID_COLUMNS)
  let offset = clampInt(base.offset, 0, GRID_COLUMNS - 1)
  const result = {} as Record<ColBreakpoint, ResolvedColLayout>

  for (const breakpoint of COL_BREAKPOINTS) {
    const size = sizes[breakpoint]
    if (typeof size === 'number') {
      span = clampInt(size, 0, GRID_COLUMNS)
    } else if (size) {
      if (size.span !== undefined) span = clampInt(size.span, 0, GRID_COLUMNS)
      if (size.offset !== undefined) offset = clampInt(size.offset, 0, GRID_COLUMNS - 1)
    }
    result[breakpoint] = { span, offset }
  }

  return result
}

export function normalizeGutter(gutter: RowGutter): [number, number] {
  const [x, y] = Array.isArray(gutter) ? gutter : [gutter, 0]
  return [Math.max(0, x), Math.max(0, y)]
}
