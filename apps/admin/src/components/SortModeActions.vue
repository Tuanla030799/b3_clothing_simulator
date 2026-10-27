<script setup lang="ts">
import { ArrowDownUp } from '@lucide/vue'
import { Button } from '@lituta/ui'

/*
 * Header actions of a sortable list (useSortMode): "Sắp xếp" outside the mode, "Lưu thứ tự" and
 * "Hủy" inside it. Other header actions should be hidden while `active`.
 */
defineProps<{
  active: boolean
  loading?: boolean
  saving?: boolean
  dirty?: boolean
  /** Sorting is unavailable (e.g. an empty list or a filter is on). */
  disabled?: boolean
}>()
const emit = defineEmits<{ start: []; save: []; cancel: [] }>()
</script>

<template>
  <template v-if="active">
    <Button variant="default" :disabled="saving" @click="emit('cancel')">Hủy</Button>
    <Button :loading="saving" :disabled="!dirty" @click="emit('save')">Lưu thứ tự</Button>
  </template>
  <Button v-else variant="default" :loading="loading" :disabled="disabled" @click="emit('start')">
    <template #icon><ArrowDownUp /></template>
    Sắp xếp
  </Button>
</template>
