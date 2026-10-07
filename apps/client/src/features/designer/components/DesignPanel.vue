<script setup lang="ts">
import { PenLine } from '@lucide/vue'
import { EmptyState, Flex, Typography } from '@lituta/ui'

// Vietnamese samples used to check the lettering font renders every diacritic.
const letteringSamples = ['Nguyễn Minh', 'Bảo Ngọc', 'Đậu']
</script>

<template>
  <section aria-labelledby="design-panel-heading" class="rounded-xl border bg-card p-4">
    <Flex vertical gap="middle">
      <Typography id="design-panel-heading" as="h2" variant="subheading">Cá nhân hóa</Typography>

      <EmptyState
        title="Chưa có món đang chỉnh"
        description="Sau khi thêm đồ vào bộ, chọn một món để thêm tên hoặc logo vào vùng thêu."
      >
        <template #icon><PenLine /></template>
      </EmptyState>

      <div class="rounded-lg bg-muted p-4">
        <Typography as="h3" variant="caption" weight="medium">Mẫu kiểu chữ thêu</Typography>
        <ul class="mt-2 flex flex-col gap-1">
          <li
            v-for="sample in letteringSamples"
            :key="sample"
            class="font-design text-3xl leading-snug font-semibold text-primary"
          >
            {{ sample }}
          </li>
        </ul>
      </div>
    </Flex>
  </section>
</template>
