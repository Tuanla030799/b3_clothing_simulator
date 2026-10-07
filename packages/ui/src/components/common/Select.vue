<script setup lang="ts">
import type { SelectOption, SelectOptionValue, SelectSize } from './types'
import { computed, ref } from 'vue'
import { LoaderCircle, X } from '@lucide/vue'
import type { AcceptableValue } from 'reka-ui'
import { cn } from '../../lib/utils'
import {
  Select as SelectRoot,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue as SelectValueText,
} from '../ui/select'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    modelValue?: SelectOptionValue
    options: SelectOption[]
    placeholder?: string
    disabled?: boolean
    loading?: boolean
    allowClear?: boolean
    size?: SelectSize
  }>(),
  {
    modelValue: undefined,
    placeholder: undefined,
    disabled: false,
    loading: false,
    allowClear: false,
    size: 'middle',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: SelectOptionValue | undefined]
}>()

const open = ref(false)

// Loading blocks value changes the same way disabled does.
const locked = computed(() => props.disabled || props.loading)
const hasValue = computed(() => props.modelValue !== undefined)
const showClear = computed(() => props.allowClear && hasValue.value && !locked.value)

// Strict identity: 1 and "1" are different options.
const byIdentity = (a: AcceptableValue, b: AcceptableValue) => a === b

function onUpdate(value: AcceptableValue) {
  if (locked.value) return
  if (typeof value === 'string' || typeof value === 'number') emit('update:modelValue', value)
}

const triggerRef = ref<InstanceType<typeof SelectTrigger> | null>(null)

function clear() {
  emit('update:modelValue', undefined)
  // Return focus to the control after the clear button disappears.
  const el = (triggerRef.value as { $el?: HTMLElement } | null)?.$el
  el?.focus()
}

const sizeClasses: Record<SelectSize, string> = {
  small: 'h-8 text-sm',
  middle: 'h-10 text-sm',
  large: 'h-12 text-base',
}
</script>

<template>
  <div class="relative w-full">
    <SelectRoot
      v-model:open="open"
      :model-value="modelValue"
      :disabled="locked"
      :by="byIdentity"
      @update:model-value="onUpdate"
    >
      <SelectTrigger
        ref="triggerRef"
        v-bind="$attrs"
        :aria-busy="loading || undefined"
        :class="
          cn(
            'w-full rounded-md border-input bg-card text-foreground shadow-none',
            'focus-visible:border-ring focus-visible:ring-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
            'data-[placeholder]:text-muted-foreground',
            sizeClasses[size],
          )
        "
      >
        <SelectValueText :placeholder="placeholder" />
        <!-- Reserves room left of the chevron for the clear button / spinner overlay. -->
        <span v-if="showClear || loading" class="ms-auto w-6 shrink-0" aria-hidden="true" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem
          v-for="option in options"
          :key="`${typeof option.value}:${option.value}`"
          :value="option.value"
          :disabled="option.disabled"
        >
          {{ option.label }}
        </SelectItem>
        <p v-if="options.length === 0" class="px-2 py-3 text-center text-sm text-muted-foreground">
          Không có lựa chọn
        </p>
      </SelectContent>
    </SelectRoot>

    <!-- Siblings of the trigger, never nested inside it (no button inside button). -->
    <span
      v-if="loading"
      class="pointer-events-none absolute inset-y-0 end-9 flex w-6 items-center justify-center text-muted-foreground"
      role="status"
    >
      <LoaderCircle class="size-4 animate-spin" aria-hidden="true" />
      <span class="sr-only">Đang tải</span>
    </span>
    <button
      v-else-if="showClear"
      type="button"
      class="absolute inset-y-0 end-9 my-auto flex size-6 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
      aria-label="Xóa lựa chọn"
      @click="clear"
    >
      <X class="size-4" aria-hidden="true" />
    </button>
  </div>
</template>
