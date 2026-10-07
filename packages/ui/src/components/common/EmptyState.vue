<script setup lang="ts">
import { useSlots } from 'vue'
import { Inbox } from '@lucide/vue'

defineProps<{
  title: string
  description?: string
}>()

defineSlots<{
  icon?: () => unknown
  default?: () => unknown
  action?: () => unknown
}>()

const slots = useSlots()
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-3 px-4 py-8 text-center">
    <span
      class="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground [&_svg]:size-6"
      aria-hidden="true"
    >
      <slot name="icon"><Inbox /></slot>
    </span>
    <div class="flex max-w-sm flex-col gap-1">
      <p class="text-base font-semibold text-foreground">{{ title }}</p>
      <p v-if="description" class="text-sm text-muted-foreground">{{ description }}</p>
    </div>
    <div v-if="slots.default" class="w-full max-w-sm text-sm text-muted-foreground">
      <slot />
    </div>
    <div v-if="slots.action" class="flex flex-wrap items-center justify-center gap-2">
      <slot name="action" />
    </div>
  </div>
</template>
