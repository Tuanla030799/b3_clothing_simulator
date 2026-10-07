<script setup lang="ts">
import type { ButtonVariant, ButtonSize, ButtonHtmlType } from './types'
import { computed, useSlots } from 'vue'
import { cva } from 'class-variance-authority'
import { LoaderCircle } from '@lucide/vue'
import { cn } from '../../lib/utils'

const props = withDefaults(
  defineProps<{
    variant?: ButtonVariant
    size?: ButtonSize
    loading?: boolean
    disabled?: boolean
    htmlType?: ButtonHtmlType
    block?: boolean
  }>(),
  {
    variant: 'primary',
    size: 'middle',
    loading: false,
    disabled: false,
    htmlType: 'button',
    block: false,
  },
)

const emit = defineEmits<{ click: [event: MouseEvent] }>()
const slots = useSlots()

const buttonVariants = cva(
  [
    'inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap',
    'transition-colors select-none',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
    'disabled:cursor-not-allowed disabled:opacity-50',
    'aria-busy:cursor-progress',
    '[&_svg]:pointer-events-none [&_svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/85',
        default: 'border border-input bg-card text-foreground hover:bg-muted',
        dashed: 'border border-dashed border-input bg-card text-foreground hover:bg-muted',
        text: 'text-foreground hover:bg-muted',
        link: 'text-primary underline-offset-4 hover:underline',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      },
      size: {
        small: 'h-8 px-3 text-sm [&_svg]:size-4',
        middle: 'h-10 px-4 text-sm [&_svg]:size-4',
        large: 'h-12 px-6 text-base [&_svg]:size-5',
      },
      iconOnly: { true: '', false: '' },
    },
    compoundVariants: [
      { variant: 'link', class: 'h-auto px-0' },
      { iconOnly: true, size: 'small', class: 'w-8 px-0' },
      { iconOnly: true, size: 'middle', class: 'w-10 px-0' },
      { iconOnly: true, size: 'large', class: 'w-12 px-0' },
    ],
  },
)

const hasIcon = computed(() => Boolean(slots.icon) || props.loading)
const iconOnly = computed(() => hasIcon.value && !slots.default)

const classes = computed(() =>
  cn(
    buttonVariants({ variant: props.variant, size: props.size, iconOnly: iconOnly.value }),
    props.block && 'flex w-full',
  ),
)

/*
 * While loading the button stays focusable (no native disabled) so focus and the accessible
 * name are kept, but every activation is swallowed, including native form submission.
 */
function onClick(event: MouseEvent) {
  if (props.loading || props.disabled) {
    event.preventDefault()
    event.stopImmediatePropagation()
    return
  }
  emit('click', event)
}
</script>

<template>
  <button
    :type="htmlType"
    :class="classes"
    :disabled="disabled || undefined"
    :aria-busy="loading || undefined"
    :aria-disabled="loading || undefined"
    @click="onClick"
  >
    <LoaderCircle v-if="loading" class="animate-spin" aria-hidden="true" />
    <span v-else-if="slots.icon" class="inline-flex" aria-hidden="true">
      <slot name="icon" />
    </span>
    <slot />
  </button>
</template>
