<script setup lang="ts">
import type { FlexAlign, FlexElement, FlexJustify, FlexGap } from './types'
import { computed, type CSSProperties } from 'vue'
import { cn } from '../../lib/utils'

const props = withDefaults(
  defineProps<{
    /** Rendered element; use ul/ol/li/nav for lists and landmarks. Default "div". */
    as?: FlexElement
    vertical?: boolean
    align?: FlexAlign
    justify?: FlexJustify
    gap?: FlexGap
    wrap?: boolean
  }>(),
  { as: 'div', vertical: false, align: 'stretch', justify: 'start', gap: 0, wrap: false },
)

const alignClasses: Record<FlexAlign, string> = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
  baseline: 'items-baseline',
}

const justifyClasses: Record<FlexJustify, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  'space-between': 'justify-between',
  'space-around': 'justify-around',
  'space-evenly': 'justify-evenly',
}

// small = 8px, middle = 16px, large = 24px.
const gapClasses: Record<Exclude<FlexGap, number>, string> = {
  small: 'gap-2',
  middle: 'gap-4',
  large: 'gap-6',
}

const classes = computed(() =>
  cn(
    'flex',
    props.vertical ? 'flex-col' : 'flex-row',
    props.wrap ? 'flex-wrap' : 'flex-nowrap',
    alignClasses[props.align],
    justifyClasses[props.justify],
    typeof props.gap === 'string' && gapClasses[props.gap],
  ),
)

const style = computed<CSSProperties | undefined>(() =>
  typeof props.gap === 'number' && props.gap > 0 ? { gap: `${props.gap}px` } : undefined,
)
</script>

<template>
  <component :is="as" :class="classes" :style="style">
    <slot />
  </component>
</template>
