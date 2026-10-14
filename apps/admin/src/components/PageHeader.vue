<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { ArrowLeft } from '@lucide/vue'
import { Flex, Link, Typography } from '@lituta/ui'

defineProps<{
  title: string
  description?: string
  /** Parent page (path and label) shown as a back link above the title. */
  back?: { to: string; label: string }
}>()
defineSlots<{ actions?: () => unknown }>()
</script>

<template>
  <Flex vertical gap="small" class="mb-6">
    <Link v-if="back" :as="RouterLink" :to="back.to" class="self-start">
      <Flex as="span" align="center" :gap="4">
        <ArrowLeft class="size-4" aria-hidden="true" />
        {{ back.label }}
      </Flex>
    </Link>
    <Flex align="center" justify="space-between" wrap gap="middle">
      <Flex vertical :gap="4" class="min-w-0">
        <Typography as="h1" variant="title">{{ title }}</Typography>
        <Typography v-if="description" variant="caption">{{ description }}</Typography>
      </Flex>
      <Flex v-if="$slots.actions" align="center" wrap gap="small">
        <slot name="actions" />
      </Flex>
    </Flex>
  </Flex>
</template>
