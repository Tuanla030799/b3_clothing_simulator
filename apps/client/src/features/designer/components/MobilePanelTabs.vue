<script setup lang="ts">
import { nextTick, useTemplateRef } from 'vue'
import { Button } from '@lituta/ui'

interface PanelTab {
  id: string
  label: string
  /** id of the panel element controlled by this tab. */
  controls: string
}

const props = defineProps<{ tabs: PanelTab[] }>()
const active = defineModel<string>({ required: true })

const listRef = useTemplateRef<HTMLElement>('list')

// Roving tabindex with arrow / Home / End keys (WAI-ARIA tabs pattern, automatic activation).
async function onKeydown(event: KeyboardEvent) {
  const index = props.tabs.findIndex((tab) => tab.id === active.value)
  const last = props.tabs.length - 1
  const next =
    event.key === 'ArrowRight'
      ? index === last
        ? 0
        : index + 1
      : event.key === 'ArrowLeft'
        ? index === 0
          ? last
          : index - 1
        : event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? last
            : -1
  const tab = props.tabs[next]
  if (!tab) return
  event.preventDefault()
  active.value = tab.id
  await nextTick()
  listRef.value?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus()
}
</script>

<template>
  <div
    ref="list"
    role="tablist"
    aria-label="Bảng điều khiển"
    class="grid grid-cols-3 gap-1 rounded-lg border bg-card p-1"
    @keydown="onKeydown"
  >
    <Button
      v-for="tab in tabs"
      :id="`${tab.controls}-tab`"
      :key="tab.id"
      role="tab"
      size="middle"
      :variant="tab.id === active ? 'primary' : 'text'"
      :aria-selected="tab.id === active"
      :aria-controls="tab.controls"
      :tabindex="tab.id === active ? 0 : -1"
      @click="active = tab.id"
    >
      {{ tab.label }}
    </Button>
  </div>
</template>
