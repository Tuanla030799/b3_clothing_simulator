<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'
import { ImagePlus, X } from '@lucide/vue'
import { Button, Flex, FormField, Image, Typography } from '@lituta/ui'
import { errorMessage } from '../api/httpClient'
import { filesApi } from '../api/resources'
import type { FileRef } from '../api/types'

/*
 * Picks and uploads one image (POST /admin/files/upload) and gives the form its file id. The
 * record keeps the file only when the form is saved; an upload left unsaved expires after 5
 * minutes on the server. `current` is the image already saved on the record (for the preview).
 */
const props = defineProps<{
  id: string
  label: string
  description?: string
  error?: string
  required?: boolean
  current?: FileRef | null
  /** Show "Bỏ ảnh" (fields that may be empty). */
  clearable?: boolean
  /** PNG/WebP only (design images must keep transparency). */
  transparent?: boolean
  disabled?: boolean
}>()
const fileId = defineModel<string | null>({ default: null })

const MAX_BYTES = 5 * 1024 * 1024
const accept = computed(() =>
  props.transparent ? 'image/png,image/webp' : 'image/png,image/jpeg,image/webp',
)
const input = useTemplateRef<HTMLInputElement>('input')
const uploaded = ref<FileRef | null>(null)
const uploading = ref(false)
const uploadError = ref<string | null>(null)

// What the field shows: a new upload, else the saved image while the model still points to it.
const preview = computed(() =>
  uploaded.value && uploaded.value.id === fileId.value
    ? uploaded.value
    : props.current && props.current.id === fileId.value
      ? props.current
      : null,
)

async function pick(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  target.value = ''
  if (!file) return
  uploadError.value = null
  if (!accept.value.split(',').includes(file.type)) {
    uploadError.value = props.transparent
      ? 'Chỉ nhận PNG hoặc WebP có nền trong suốt.'
      : 'Chỉ nhận JPEG, PNG hoặc WebP.'
    return
  }
  if (file.size > MAX_BYTES) {
    uploadError.value = 'Ảnh vượt quá 5 MB.'
    return
  }
  uploading.value = true
  try {
    const result = await filesApi.upload(file)
    uploaded.value = result
    fileId.value = result.id
  } catch (error) {
    uploadError.value = errorMessage(error)
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <FormField
    :for="id"
    :label="label"
    :description="description"
    :error="uploadError ?? error"
    :required="required"
  >
    <template #default="{ id: controlId, describedBy }">
      <Flex align="start" gap="middle" wrap>
        <Image
          :src="preview?.url"
          :alt="preview ? label : ''"
          :width="preview?.width"
          :height="preview?.height"
          class="size-28 shrink-0 rounded-md border bg-muted"
        />
        <Flex vertical gap="small" align="start">
          <Button
            :id="controlId"
            variant="default"
            :loading="uploading"
            :disabled="disabled"
            :aria-describedby="describedBy"
            @click="input?.click()"
          >
            <template #icon><ImagePlus /></template>
            {{ preview ? 'Đổi ảnh' : 'Chọn ảnh' }}
          </Button>
          <Button
            v-if="clearable && fileId"
            variant="text"
            size="small"
            :disabled="disabled || uploading"
            @click="fileId = null"
          >
            <template #icon><X /></template>
            Bỏ ảnh
          </Button>
          <Typography v-if="preview" variant="caption">
            {{ preview.width }} × {{ preview.height }} px
          </Typography>
        </Flex>
        <input
          ref="input"
          type="file"
          class="sr-only"
          tabindex="-1"
          aria-hidden="true"
          :accept="accept"
          @change="pick"
        />
      </Flex>
    </template>
  </FormField>
</template>
