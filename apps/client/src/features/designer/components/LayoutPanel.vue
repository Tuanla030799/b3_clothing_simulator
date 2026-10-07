<script setup lang="ts">
import { LayoutGrid } from '@lucide/vue'
import { Button, EmptyState, Flex, Typography } from '@lituta/ui'
import SelectionSummary from './SelectionSummary.vue'

const emit = defineEmits<{ browse: [] }>()
</script>

<template>
  <section aria-labelledby="layout-panel-heading" class="rounded-xl border bg-card p-4">
    <Flex vertical gap="middle">
      <Typography id="layout-panel-heading" as="h2" variant="subheading">Bố cục</Typography>
      <SelectionSummary :selected-category-ids="[]" />
      <EmptyState
        title="Chưa có món nào để sắp xếp"
        description="Thêm đồ vào bộ rồi sắp xếp chúng trên nền."
      >
        <template #icon><LayoutGrid /></template>
        <template #action>
          <Button variant="default" @click="emit('browse')">Chọn sản phẩm</Button>
        </template>
      </EmptyState>
    </Flex>
  </section>
</template>
