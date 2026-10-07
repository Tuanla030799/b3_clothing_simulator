<script setup lang="ts">
defineProps<{
  /** Zero-based index of the current step. */
  current: number
}>()

const steps = ['Chọn đồ', 'Cá nhân hóa', 'Xem cả bộ']
</script>

<template>
  <nav aria-label="Các bước thiết kế">
    <ol class="flex items-center gap-2 sm:gap-3">
      <li
        v-for="(step, index) in steps"
        :key="step"
        class="flex min-w-0 items-center gap-2 sm:gap-3"
        :aria-current="index === current ? 'step' : undefined"
      >
        <span
          class="flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
          :class="
            index === current
              ? 'bg-primary text-primary-foreground'
              : 'border border-input bg-card text-muted-foreground'
          "
          aria-hidden="true"
        >
          {{ index + 1 }}
        </span>
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
      </li>
    </ol>
  </nav>
</template>
