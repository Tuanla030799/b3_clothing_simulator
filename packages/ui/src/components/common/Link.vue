<script setup lang="ts">
import type { Component } from 'vue'
import { computed } from 'vue'
import { cn } from '../../lib/utils'
import type { LinkVariant } from './types'

const props = withDefaults(
  defineProps<{
    /**
     * Element or component rendered. Defaults to a native `<a>`. Pass a router link component
     * (e.g. `RouterLink`) to navigate without a page load; its own props (`to`…) go through as
     * attributes, so this package never depends on a router.
     */
    as?: string | Component
    variant?: LinkVariant
    /** Marks the link of the current page: `aria-current="page"` (and highlight for "nav"). */
    active?: boolean
    /** Opens in a new tab with `rel="noopener noreferrer"` and a hidden notice for screen readers. */
    external?: boolean
    /** Hidden text announced for external links. */
    externalLabel?: string
  }>(),
  {
    as: 'a',
    variant: 'text',
    active: false,
    external: false,
    externalLabel: '(mở trong tab mới)',
  },
)

const base =
  'rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'

const variantClasses: Record<LinkVariant, string> = {
  // Inline link inside text.
  text: 'text-primary underline underline-offset-4 hover:no-underline',
  // Menu item: pill with an active state.
  nav: 'rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-muted hover:text-foreground',
  // On a primary-colored background (footer).
  inverse:
    'text-sm text-primary-foreground/85 underline-offset-4 hover:text-primary-foreground hover:underline focus-visible:outline-primary-foreground',
  // No visual style (logo, icon links); color and layout come from class.
  plain: '',
}

const classes = computed(() =>
  cn(
    base,
    variantClasses[props.variant],
    props.variant === 'nav' && props.active && 'bg-secondary text-foreground',
  ),
)
</script>

<template>
  <component
    :is="as"
    :class="classes"
    :aria-current="active ? 'page' : undefined"
    :target="external ? '_blank' : undefined"
    :rel="external ? 'noopener noreferrer' : undefined"
  >
    <slot />
    <span v-if="external" class="sr-only"> {{ externalLabel }}</span>
  </component>
</template>
