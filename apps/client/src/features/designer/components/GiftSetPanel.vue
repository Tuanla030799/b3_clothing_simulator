<script setup lang="ts">
import { nextTick, useTemplateRef } from 'vue'
import { Check, Shirt, Trash2 } from '@lucide/vue'
import { Button, EmptyState, Flex, Image, Typography } from '@lituta/ui'
import { categoryName } from '../data/catalog'
import { injectSelection } from '../useSelection'

const emit = defineEmits<{ browse: [] }>()

const selection = injectSelection()
const listRef = useTemplateRef<HTMLElement>('list')

/*
 * After removing an item, keep keyboard focus in the list: move it to the remove button now at the
 * same position (or the last one), or to the panel heading when the set becomes empty.
 */
async function remove(instanceId: string, index: number) {
  selection.remove(instanceId)
  await nextTick()
  const buttons = listRef.value?.querySelectorAll<HTMLElement>('[data-remove]') ?? []
  const target = buttons[Math.min(index, buttons.length - 1)]
  if (target) target.focus()
  else document.getElementById('gift-set-heading')?.focus()
}
</script>

<template>
  <section aria-labelledby="gift-set-heading" class="rounded-xl border bg-card p-4">
    <Flex vertical gap="middle">
      <Typography
        id="gift-set-heading"
        as="h2"
        variant="subheading"
        tabindex="-1"
        class="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        Bộ đồ đã chọn
      </Typography>

      <EmptyState
        v-if="selection.entries.value.length === 0"
        title="Bộ đồ đang trống"
        description="Bấm nút + ở danh sách sản phẩm để thêm món vào bộ."
      >
        <template #icon><Shirt /></template>
        <template #action>
          <Button variant="default" class="lg:hidden" @click="emit('browse')">
            Chọn sản phẩm
          </Button>
        </template>
      </EmptyState>

      <ul
        v-else
        ref="list"
        class="grid grid-cols-1 gap-2 sm:grid-cols-2"
        aria-label="Các món trong bộ"
      >
        <li
          v-for="(entry, index) in selection.entries.value"
          :key="entry.item.instanceId"
          class="flex items-center gap-1 rounded-lg border p-1.5"
          :class="
            entry.item.instanceId === selection.activeInstanceId.value
              ? 'border-primary bg-secondary/40'
              : ''
          "
        >
          <!-- Card body selects the item; the remove button is a separate sibling control. -->
          <button
            type="button"
            class="flex min-w-0 flex-1 items-center gap-3 rounded-md p-1 text-left hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            :disabled="selection.lock.locked.value"
            :aria-current="entry.item.instanceId === selection.activeInstanceId.value || undefined"
            @click="selection.select(entry.item.instanceId)"
          >
            <Image
              :src="entry.product.image.src"
              alt=""
              :width="entry.product.image.width"
              :height="entry.product.image.height"
              class="aspect-4/3 w-14 shrink-0 rounded-md bg-muted"
            />
            <span class="flex min-w-0 flex-col">
              <span class="text-xs text-muted-foreground">
                Món {{ entry.position }} · {{ categoryName(entry.product.categoryId) }}
              </span>
              <span class="text-sm font-medium">{{ entry.product.name }}</span>
              <span
                v-if="entry.item.instanceId === selection.activeInstanceId.value"
                class="flex items-center gap-1 text-xs font-semibold text-primary"
              >
                <Check class="size-3.5" aria-hidden="true" />
                Đang chỉnh
              </span>
            </span>
          </button>
          <Button
            data-remove
            :disabled="selection.lock.locked.value"
            variant="text"
            size="small"
            :aria-label="`Xóa món ${entry.position}: ${entry.product.name}`"
            @click="remove(entry.item.instanceId, index)"
          >
            <template #icon><Trash2 /></template>
          </Button>
        </li>
      </ul>
    </Flex>
  </section>
</template>
