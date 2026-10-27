<script setup lang="ts">
import { ArrowDown, ArrowUp, GripVertical } from '@lucide/vue'
import { Button, Flex } from '@lituta/ui'

/*
 * Order cell of a table in sorting mode (useSortMode): a drag handle for the mouse/touch and
 * up/down buttons for the keyboard. `drag: false` keeps only the buttons (lists where a flat
 * drag position is ambiguous, such as a tree).
 */
withDefaults(
  defineProps<{
    /** Row name, for the buttons' accessible names. */
    label: string
    first: boolean
    last: boolean
    disabled?: boolean
    drag?: boolean
  }>(),
  { disabled: false, drag: true },
)
const emit = defineEmits<{ up: []; down: [] }>()
</script>

<template>
  <Flex align="center" :gap="2">
    <span
      v-if="drag"
      class="row-drag-handle flex size-8 items-center justify-center rounded text-muted-foreground"
      :class="disabled ? 'cursor-not-allowed opacity-40' : 'cursor-grab active:cursor-grabbing'"
      title="Kéo để sắp xếp"
      aria-hidden="true"
    >
      <GripVertical class="size-4" />
    </span>
    <Button
      size="small"
      variant="text"
      :aria-label="`Đưa ${label} lên`"
      :disabled="disabled || first"
      @click="emit('up')"
    >
      <template #icon><ArrowUp /></template>
    </Button>
    <Button
      size="small"
      variant="text"
      :aria-label="`Đưa ${label} xuống`"
      :disabled="disabled || last"
      @click="emit('down')"
    >
      <template #icon><ArrowDown /></template>
    </Button>
  </Flex>
</template>
