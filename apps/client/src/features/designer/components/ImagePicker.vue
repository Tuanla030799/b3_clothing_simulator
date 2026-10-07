<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue'
import { Move, Trash2, Upload } from '@lucide/vue'
import { Button, Flex, Image, Typography } from '@lituta/ui'
import { designPresets } from '../data/catalog'
import { UPLOAD_LIMITS } from '../data/designOptions'
import { uploadErrorMessages } from '../imageFiles'
import { injectDesigns, type ImageResult } from '../useDesigns'

const props = defineProps<{ instanceId: string; zoneId: string }>()

const designs = injectDesigns()
const image = computed(() => designs.zoneDesign(props.instanceId, props.zoneId)?.image)
const pending = computed(() => designs.isImagePending(props.instanceId, props.zoneId))
const fileInput = useTemplateRef<HTMLInputElement>('file')
const error = ref<string | null>(null)

watch(
  () => [props.instanceId, props.zoneId],
  () => (error.value = null),
)

const messages: Partial<Record<ImageResult, string>> = {
  ...uploadErrorMessages,
  'no-image': 'Chưa tải được ảnh sản phẩm.',
}

async function handle(run: () => Promise<ImageResult>) {
  const { instanceId, zoneId } = props
  error.value = null
  const result = await run()
  if (result === 'stale') return
  // The result belongs to the item/zone that started it; only report when it is still shown.
  const stillShown = instanceId === props.instanceId && zoneId === props.zoneId
  if (result === 'ok') {
    if (stillShown) designs.selectLayer(zoneId, 'image')
  } else if (stillShown) {
    error.value = messages[result] ?? uploadErrorMessages['decode-failed']
  }
}

function pickPreset(presetId: string) {
  void handle(() => designs.setPresetImage(props.instanceId, props.zoneId, presetId))
}

function onFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (file) void handle(() => designs.setUploadImage(props.instanceId, props.zoneId, file))
}

const isSelected = computed(() => {
  const layer = designs.currentLayer.value
  return layer?.zoneId === props.zoneId && layer.kind === 'image'
})

const limitsText = `PNG, JPEG hoặc WebP · tối đa ${UPLOAD_LIMITS.maxBytes / 1024 / 1024} MB, ${UPLOAD_LIMITS.maxDimension} × ${UPLOAD_LIMITS.maxDimension} điểm ảnh.`
</script>

<template>
  <section aria-labelledby="image-picker-heading">
    <Flex vertical gap="small">
      <Typography id="image-picker-heading" as="h3" variant="body" weight="semibold">
        Hình / logo
      </Typography>

      <Flex v-if="designPresets.length" as="ul" wrap gap="small" aria-label="Hình có sẵn">
        <li v-for="preset in designPresets" :key="preset.id">
          <!-- Selectable image tile (Button sizes cannot hold a thumbnail). -->
          <button
            type="button"
            class="block rounded-md border p-1 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50 aria-pressed:border-primary aria-pressed:bg-secondary"
            :aria-pressed="image?.source.kind === 'preset' && image.source.presetId === preset.id"
            :aria-label="`Dùng hình ${preset.name}`"
            :disabled="!preset.image.src"
            @click="pickPreset(preset.id)"
          >
            <Image :src="preset.image.src" alt="" class="aspect-4/3 w-16 rounded-sm" />
          </button>
        </li>
      </Flex>

      <input
        ref="file"
        type="file"
        class="sr-only"
        accept="image/png,image/jpeg,image/webp"
        tabindex="-1"
        aria-hidden="true"
        @change="onFile"
      />
      <Flex wrap gap="small" align="center">
        <Button variant="default" size="small" :loading="pending" @click="fileInput?.click()">
          <template #icon><Upload /></template>
          {{ image ? 'Thay bằng ảnh từ máy' : 'Tải ảnh từ máy' }}
        </Button>
        <Button
          v-if="image"
          variant="default"
          size="small"
          :aria-pressed="isSelected"
          @click="designs.selectLayer(zoneId, isSelected ? null : 'image')"
        >
          <template #icon><Move /></template>
          Chỉnh vị trí hình
        </Button>
        <Button
          v-if="image"
          variant="text"
          size="small"
          @click="designs.removeImage(instanceId, zoneId)"
        >
          <template #icon><Trash2 /></template>
          Xóa hình
        </Button>
      </Flex>
      <Typography variant="caption">{{ limitsText }}</Typography>
      <Typography
        v-if="image?.source.kind === 'upload'"
        variant="caption"
        ellipsis
        data-testid="image-file-name"
      >
        Đang dùng: {{ image.source.fileName }}
      </Typography>
      <p v-if="error" class="text-sm text-destructive" role="alert">{{ error }}</p>
    </Flex>
  </section>
</template>
