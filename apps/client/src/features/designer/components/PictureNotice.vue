<script setup lang="ts">
import { computed } from 'vue'
import { TriangleAlert } from '@lucide/vue'
import { Flex, Typography } from '@lituta/ui'
import { injectSelection } from '../useSelection'

/*
 * Shown when the order has more items than the set picture can hold (picture limits from the
 * designer config). The other items are still designed and sent with the order.
 */
const selection = injectSelection()
const total = computed(() => selection.entries.value.length)
const drawn = computed(() => selection.pictureEntries.value.length)
</script>

<template>
  <Flex
    v-if="drawn < total"
    align="start"
    :gap="8"
    role="note"
    class="rounded-lg border border-accent bg-accent/40 p-3 text-accent-foreground"
  >
    <TriangleAlert class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
    <Typography as="span" variant="caption" class="text-inherit">
      Ảnh cả bộ chỉ có {{ drawn }}/{{ total }} món (tối đa {{ selection.rules.maxItems }} món và
      giới hạn theo loại). Các món còn lại vẫn được thiết kế và gửi kèm đơn, chỉ không có trong ảnh.
    </Typography>
  </Flex>
</template>
