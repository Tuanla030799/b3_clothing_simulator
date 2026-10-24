<script setup lang="ts">
import type { ModalSize } from './types'
import { X } from '@lucide/vue'
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'

/*
 * Modal dialog (reka-ui Dialog): focus is trapped inside and returns to the element that opened
 * it; Escape, the close button and a click on the backdrop close it. The page behind does not
 * scroll. The title names the dialog for assistive technology.
 */
const props = withDefaults(
  defineProps<{
    title: string
    description?: string
    size?: ModalSize
  }>(),
  { description: undefined, size: 'middle' },
)
const open = defineModel<boolean>('open', { default: false })

defineSlots<{
  /** Body; scrolls when it is taller than the viewport. */
  default?: () => unknown
  /** Actions under the body (e.g. buttons), aligned to the end. */
  footer?: () => unknown
}>()

const widths: Record<ModalSize, string> = {
  small: 'max-w-sm',
  middle: 'max-w-lg',
  large: 'max-w-3xl',
}
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay
        class="fixed inset-0 z-(--z-modal) bg-foreground/40 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0"
      />
      <DialogContent
        class="fixed top-1/2 left-1/2 z-(--z-modal) flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border bg-card text-card-foreground shadow-lg focus-visible:outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        :class="widths[props.size]"
        v-bind="description ? {} : { 'aria-describedby': undefined }"
      >
        <div class="flex items-start gap-3 border-b p-4">
          <div class="min-w-0 flex-1">
            <DialogTitle class="text-lg font-semibold">{{ title }}</DialogTitle>
            <DialogDescription v-if="description" class="mt-1 text-sm text-muted-foreground">
              {{ description }}
            </DialogDescription>
          </div>
          <DialogClose
            class="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            aria-label="Đóng"
          >
            <X class="size-4" aria-hidden="true" />
          </DialogClose>
        </div>
        <div class="min-h-0 flex-1 overflow-y-auto p-4">
          <slot />
        </div>
        <div v-if="$slots.footer" class="flex flex-wrap justify-end gap-2 border-t p-4">
          <slot name="footer" />
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
