<script setup lang="ts">
import type { RowAlign, RowJustify } from './types'
import { computed, type CSSProperties } from 'vue'
import { cn } from '../../lib/utils'
import { normalizeGutter, type RowGutter } from './grid'

const props = withDefaults(
  defineProps<{
    gutter?: RowGutter
    align?: RowAlign
    justify?: RowJustify
    wrap?: boolean
  }>(),
  { gutter: 0, align: 'top', justify: 'start', wrap: true },
)

const alignClasses: Record<RowAlign, string> = {
  top: 'items-start',
  middle: 'items-center',
  bottom: 'items-end',
  stretch: 'items-stretch',
}

const justifyClasses: Record<RowJustify, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  'space-between': 'justify-between',
  'space-around': 'justify-around',
}

const classes = computed(() =>
  cn(
    // Horizontal gutter: columns get half the gutter as inline padding, the row cancels the
    // outer halves with a negative margin. Widths stay exact percentages of 24, so spans that
    // add up to 24 always fit on one line.
    'flex min-w-0 -mx-[calc(var(--row-gutter-x)/2)] gap-y-(--row-gutter-y)',
    props.wrap ? 'flex-wrap' : 'flex-nowrap',
    alignClasses[props.align],
    justifyClasses[props.justify],
  ),
)

const style = computed<CSSProperties>(() => {
  const [x, y] = normalizeGutter(props.gutter)
  // Always set both variables so nested rows never inherit an outer gutter.
  return { '--row-gutter-x': `${x}px`, '--row-gutter-y': `${y}px` } as CSSProperties
})
</script>

<template>
  <div :class="classes" :style="style">
    <slot />
  </div>
</template>
