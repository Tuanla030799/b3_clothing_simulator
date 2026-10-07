<script setup lang="ts">
import type {
  TypographyElement,
  TypographyVariant,
  TypographyWeight,
  TypographyAlign,
} from './types'
import { computed } from 'vue'
import { cn } from '../../lib/utils'

const props = withDefaults(
  defineProps<{
    as?: TypographyElement
    variant?: TypographyVariant
    weight?: TypographyWeight
    align?: TypographyAlign
    ellipsis?: boolean
  }>(),
  { as: 'p', variant: 'body', weight: undefined, align: undefined, ellipsis: false },
)

const variantClasses: Record<TypographyVariant, string> = {
  title: 'text-2xl leading-tight font-semibold tracking-tight sm:text-3xl',
  heading: 'text-xl leading-snug font-semibold',
  subheading: 'text-base leading-snug font-medium',
  body: 'text-base leading-relaxed',
  caption: 'text-sm leading-normal text-muted-foreground',
}

const weightClasses: Record<TypographyWeight, string> = {
  regular: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
}

const alignClasses: Record<TypographyAlign, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
}

const classes = computed(() =>
  cn(
    variantClasses[props.variant],
    props.weight && weightClasses[props.weight],
    props.align && alignClasses[props.align],
    // Single-line ellipsis; block-level so truncation also works on <span>.
    props.ellipsis && 'block truncate',
  ),
)
</script>

<template>
  <component :is="as" :class="classes">
    <slot />
  </component>
</template>
