<script setup lang="ts">
import type { ContainerSize } from './types'
import { computed } from 'vue'
import { cn } from '../../lib/utils'

const props = withDefaults(
  defineProps<{
    size?: ContainerSize
    fluid?: boolean
  }>(),
  { size: 'xl', fluid: false },
)

// Static class map so Tailwind can discover every max-width utility.
const maxWidthClasses: Record<Exclude<ContainerSize, 'full'>, string> = {
  sm: 'max-w-content-sm',
  md: 'max-w-content-md',
  lg: 'max-w-content-lg',
  xl: 'max-w-content-xl',
}

const classes = computed(() =>
  cn(
    'mx-auto w-full px-4 sm:px-6 lg:px-8',
    !props.fluid && props.size !== 'full' && maxWidthClasses[props.size],
  ),
)
</script>

<template>
  <div :class="classes">
    <slot />
  </div>
</template>
