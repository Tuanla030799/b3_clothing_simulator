<script setup lang="ts">
import type { DropdownItem, DropdownPlacement, DropdownTrigger } from './types'
import { computed, onBeforeUnmount, ref } from 'vue'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'

const props = withDefaults(
  defineProps<{
    items: DropdownItem[]
    trigger?: DropdownTrigger
    placement?: DropdownPlacement
    disabled?: boolean
  }>(),
  { trigger: 'click', placement: 'bottomLeft', disabled: false },
)

const emit = defineEmits<{ select: [key: string] }>()

defineSlots<{
  /** A single focusable element (usually a Button). It becomes the menu trigger. */
  default?: () => unknown
}>()

const placements: Record<DropdownPlacement, { side: 'top' | 'bottom'; align: 'start' | 'end' }> = {
  bottomLeft: { side: 'bottom', align: 'start' },
  bottomRight: { side: 'bottom', align: 'end' },
  topLeft: { side: 'top', align: 'start' },
  topRight: { side: 'top', align: 'end' },
}
const position = computed(() => placements[props.placement])

const open = ref(false)
// Whether the current open state came from mouse hover (no focus move in that case).
const openedByHover = ref(false)
let closeTimer: ReturnType<typeof setTimeout> | undefined

const isHover = computed(() => props.trigger === 'hover')

function cancelClose() {
  clearTimeout(closeTimer)
  closeTimer = undefined
}

// Set while a mouse press on a hover-opened trigger is being handled.
let ignoreCloseFromTriggerPress = false

function setOpen(value: boolean) {
  if (!value && ignoreCloseFromTriggerPress) return
  cancelClose()
  if (value && props.disabled) return
  if (!value) openedByHover.value = false
  open.value = value
}

/*
 * Hover mode only reacts to mouse pointers. Touch and pen keep the click/tap behaviour of the
 * underlying menu, and the keyboard keeps Enter / Space / ArrowDown on the trigger.
 */
function onPointerEnter(event: PointerEvent) {
  if (!isHover.value || event.pointerType !== 'mouse' || props.disabled) return
  cancelClose()
  if (!open.value) {
    openedByHover.value = true
    open.value = true
  }
}

function onPointerLeave(event: PointerEvent) {
  if (!isHover.value || event.pointerType !== 'mouse' || !openedByHover.value) return
  cancelClose()
  closeTimer = setTimeout(() => setOpen(false), 150)
}

// A mouse click on a hover-opened trigger must not toggle the menu closed again.
function onTriggerPointerDownCapture(event: PointerEvent) {
  if (isHover.value && event.pointerType === 'mouse' && open.value && openedByHover.value) {
    ignoreCloseFromTriggerPress = true
    setTimeout(() => (ignoreCloseFromTriggerPress = false))
  }
}

function onOpenAutoFocus(event: Event) {
  if (openedByHover.value) event.preventDefault()
}

function onCloseAutoFocus(event: Event) {
  if (openedByHover.value) event.preventDefault()
}

function onSelect(item: DropdownItem) {
  if (item.disabled) return
  emit('select', item.key)
}

onBeforeUnmount(cancelClose)
</script>

<template>
  <DropdownMenu :open="open" :modal="!isHover" @update:open="setOpen">
    <span
      class="inline-flex"
      @pointerenter="onPointerEnter"
      @pointerleave="onPointerLeave"
      @pointerdown.capture="onTriggerPointerDownCapture"
    >
      <DropdownMenuTrigger as-child :disabled="disabled">
        <slot />
      </DropdownMenuTrigger>
    </span>
    <DropdownMenuContent
      :side="position.side"
      :align="position.align"
      class="min-w-40 rounded-md"
      @pointerenter="onPointerEnter"
      @pointerleave="onPointerLeave"
      @open-auto-focus="onOpenAutoFocus"
      @close-auto-focus="onCloseAutoFocus"
    >
      <DropdownMenuItem
        v-for="item in items"
        :key="item.key"
        :disabled="item.disabled"
        :variant="item.danger ? 'destructive' : 'default'"
        :text-value="item.label"
        @select="onSelect(item)"
      >
        {{ item.label }}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
