<script setup lang="ts">
import { computed, type CSSProperties } from 'vue'
import { COL_BREAKPOINTS, GRID_COLUMNS, resolveColLayout, type ColSize } from './grid'
import type { ColElement } from './types'

const props = withDefaults(
  defineProps<{
    /** Rendered element; "li" inside a Row as="ul"/"ol". Default "div". */
    as?: ColElement
    span?: number
    offset?: number
    xs?: ColSize
    sm?: ColSize
    md?: ColSize
    lg?: ColSize
    xl?: ColSize
    xxl?: ColSize
  }>(),
  { as: 'div', span: 24, offset: 0 },
)

/*
 * Responsive behaviour is pure CSS: span/offset/visibility for each breakpoint are written to
 * CSS variables and a static list of Tailwind utilities reads the matching variable inside the
 * Tailwind breakpoint (xxl = 2xl). No window measuring.
 */
const responsiveClasses = [
  'basis-(--col-w-xs) max-w-(--col-w-xs) ms-(--col-ms-xs) [display:var(--col-d-xs)]',
  'sm:basis-(--col-w-sm) sm:max-w-(--col-w-sm) sm:ms-(--col-ms-sm) sm:[display:var(--col-d-sm)]',
  'md:basis-(--col-w-md) md:max-w-(--col-w-md) md:ms-(--col-ms-md) md:[display:var(--col-d-md)]',
  'lg:basis-(--col-w-lg) lg:max-w-(--col-w-lg) lg:ms-(--col-ms-lg) lg:[display:var(--col-d-lg)]',
  'xl:basis-(--col-w-xl) xl:max-w-(--col-w-xl) xl:ms-(--col-ms-xl) xl:[display:var(--col-d-xl)]',
  '2xl:basis-(--col-w-xxl) 2xl:max-w-(--col-w-xxl) 2xl:ms-(--col-ms-xxl) 2xl:[display:var(--col-d-xxl)]',
].join(' ')

const fraction = (columns: number) => `calc(${columns} * 100% / ${GRID_COLUMNS})`

const style = computed<CSSProperties>(() => {
  const layout = resolveColLayout(
    { span: props.span, offset: props.offset },
    { xs: props.xs, sm: props.sm, md: props.md, lg: props.lg, xl: props.xl, xxl: props.xxl },
  )
  const vars: Record<string, string> = {}
  for (const breakpoint of COL_BREAKPOINTS) {
    const { span, offset } = layout[breakpoint]
    vars[`--col-w-${breakpoint}`] = fraction(span)
    vars[`--col-ms-${breakpoint}`] = offset > 0 ? fraction(offset) : '0px'
    vars[`--col-d-${breakpoint}`] = span === 0 ? 'none' : 'block'
  }
  return vars as CSSProperties
})
</script>

<template>
  <component
    :is="as"
    class="min-w-0 shrink-0 grow-0 px-[calc(var(--row-gutter-x,0px)/2)]"
    :class="responsiveClasses"
    :style="style"
  >
    <slot />
  </component>
</template>
