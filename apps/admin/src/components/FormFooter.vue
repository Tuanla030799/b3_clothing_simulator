<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { Save, Undo2 } from '@lucide/vue'
import { Button, Flex, Link } from '@lituta/ui'

/*
 * Actions under a page form. Creating: cancel link + submit. Editing: undo + submit, both only
 * while there are unsaved changes.
 */
defineProps<{
  submitLabel: string
  saving?: boolean
  dirty?: boolean
  /** Creating a record: show a cancel link to this path instead of undo. */
  cancelTo?: string
}>()
const emit = defineEmits<{ submit: []; reset: [] }>()
</script>

<template>
  <Flex justify="end" align="center" gap="middle">
    <Link v-if="cancelTo" :as="RouterLink" :to="cancelTo">Hủy</Link>
    <Button v-else variant="default" :disabled="!dirty || saving" @click="emit('reset')">
      <template #icon><Undo2 /></template>
      Hoàn tác
    </Button>
    <Button :disabled="!cancelTo && !dirty" :loading="saving" @click="emit('submit')">
      <template #icon><Save /></template>
      {{ submitLabel }}
    </Button>
  </Flex>
</template>
