<script setup lang="ts">
import { computed } from 'vue'
import { RotateCw } from '@lucide/vue'
import { Button, Flex, Typography } from '@lituta/ui'
import { exportErrorMessages } from '../exportImage'
import { injectComposition } from '../useComposition'
import { exportBlockMessages, injectExport } from '../useExport'

/*
 * Why the download button is (not) available, plus the result of the last export. The id is
 * referenced by the button's aria-describedby; the text stays visible on mobile (no tooltip).
 */

const exporter = injectExport()
const composition = injectComposition()

const reason = computed(() => {
  const block = exporter.block.value
  return block ? exportBlockMessages[block.code] : null
})
// Loading/failed resources can be retried from here without going to the set panel.
const retryable = computed(() => {
  const code = exporter.block.value?.code
  return code === 'resource-error' || code === 'background-error'
})
</script>

<template>
  <Flex id="export-status" vertical :gap="4" data-testid="export-status">
    <p
      v-if="exporter.error.value"
      class="text-sm font-medium text-destructive"
      role="alert"
      data-testid="export-error"
    >
      {{ exportErrorMessages[exporter.error.value.code] }}
    </p>
    <p v-else-if="exporter.notice.value && !reason" class="text-sm text-primary" role="status">
      {{ exporter.notice.value }}
    </p>
    <Typography v-if="reason" variant="caption" role="status">{{ reason }}</Typography>
    <Flex v-if="exporter.error.value || retryable" wrap gap="small">
      <Button
        v-if="exporter.error.value"
        size="small"
        variant="default"
        :disabled="!exporter.canExport.value"
        @click="exporter.run()"
      >
        <template #icon><RotateCw /></template>
        Thử tải lại
      </Button>
      <Button v-if="retryable" size="small" variant="default" @click="composition.retry()">
        Tải lại tài nguyên
      </Button>
    </Flex>
  </Flex>
</template>
