<script setup lang="ts">
import type { FormFieldSlotProps } from './types'
import { computed, useSlots } from 'vue'

const props = withDefaults(
  defineProps<{
    label?: string
    /** id of the control rendered in the default slot. */
    for: string
    description?: string
    error?: string
    required?: boolean
  }>(),
  { label: undefined, description: undefined, error: undefined, required: false },
)

defineSlots<{
  default?: (props: FormFieldSlotProps) => unknown
  label?: () => unknown
  description?: () => unknown
  error?: () => unknown
}>()

const slots = useSlots()

const descriptionId = computed(() => `${props.for}-description`)
const errorId = computed(() => `${props.for}-error`)

// Slot content wins over the prop with the same name. Error replaces description.
const showLabel = computed(() => Boolean(slots.label || props.label))
const showError = computed(() => Boolean(slots.error || props.error))
const showDescription = computed(
  () => !showError.value && Boolean(slots.description || props.description),
)

const slotProps = computed<FormFieldSlotProps>(() => ({
  id: props.for,
  describedBy: showError.value
    ? errorId.value
    : showDescription.value
      ? descriptionId.value
      : undefined,
  invalid: showError.value,
  required: props.required,
}))
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label v-if="showLabel" :for="props.for" class="text-sm font-medium text-foreground">
      <slot name="label">{{ label }}</slot>
      <span v-if="required" class="ms-0.5 text-destructive" aria-hidden="true">*</span>
    </label>

    <slot v-bind="slotProps" />

    <p v-if="showError" :id="errorId" class="text-sm text-destructive">
      <slot name="error">{{ error }}</slot>
    </p>
    <p v-else-if="showDescription" :id="descriptionId" class="text-sm text-muted-foreground">
      <slot name="description">{{ description }}</slot>
    </p>
  </div>
</template>
