<script setup lang="ts">
import { Flex } from '@lituta/ui'

defineProps<{
  /** Zero-based index of the current step. */
  current: number
}>()

const steps = ['Chọn đồ', 'Cá nhân hóa', 'Xem cả bộ']
</script>

<template>
  <nav aria-label="Các bước thiết kế">
    <Flex as="ol" align="center" gap="small">
      <Flex
        v-for="(step, index) in steps"
        :key="step"
        as="li"
        align="center"
        gap="small"
        class="min-w-0"
        :aria-current="index === current ? 'step' : undefined"
      >
        <Flex
          as="span"
          align="center"
          justify="center"
          class="size-6 shrink-0 rounded-full text-xs font-semibold"
          :class="
            index === current
              ? 'bg-primary text-primary-foreground'
              : 'border border-input bg-card text-muted-foreground'
          "
          aria-hidden="true"
        >
          {{ index + 1 }}
        </Flex>
        <span
          class="truncate text-sm"
          :class="index === current ? 'font-semibold text-foreground' : 'text-muted-foreground'"
        >
          {{ step }}
        </span>
        <span
          v-if="index < steps.length - 1"
          class="hidden h-px w-6 bg-border sm:block lg:w-10"
          aria-hidden="true"
        />
      </Flex>
    </Flex>
  </nav>
</template>
