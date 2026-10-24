<script setup lang="ts">
import { Palette } from '@lucide/vue'

/** Round swatch of a palette color; "multi" (no hex) shows a palette icon instead. */
defineProps<{ hexCode: string | null }>()
</script>

<template>
  <span
    class="inline-flex size-5 shrink-0 items-center justify-center rounded-full border bg-card text-muted-foreground"
    :style="hexCode ? { backgroundColor: hexCode } : undefined"
    aria-hidden="true"
  >
    <Palette v-if="!hexCode" class="size-3.5" />
  </span>
</template>
