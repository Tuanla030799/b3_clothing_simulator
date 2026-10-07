<script setup lang="ts">
import { Flex, Typography } from '@lituta/ui'

defineProps<{
  /** Small uppercase label above the title. */
  label: string
  title: string
  /** id of the heading element, for aria-labelledby on the section. */
  headingId?: string
}>()
</script>

<template>
  <Flex vertical align="center" gap="small" class="text-center">
    <p class="text-xs font-semibold tracking-widest text-primary uppercase">{{ label }}</p>
    <Typography :id="headingId" as="h2" variant="title">{{ title }}</Typography>
  </Flex>
</template>
