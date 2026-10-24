<script setup lang="ts">
import { computed } from 'vue'
import { Plus, Trash2 } from '@lucide/vue'
import { Button, Col, Flex, FormField, Row, Select, Typography } from '@lituta/ui'
import type { PaletteColor } from '../../api/types'
import ImageUploadField from '../../components/ImageUploadField.vue'

/** A color being added with a new product (sent in the same create request). */
export interface NewColorRow {
  /** Local key for v-for and element ids. */
  uid: number
  colorKey: string | undefined
  displayImageFileId: string | null
  designImageFileId: string | null
}

/*
 * The colors of a product being created: palette color and its two images per row. Errors are
 * keyed `${index}.colorKey`, `${index}.displayImageFileId`, `${index}.designImageFileId`.
 */
const props = defineProps<{
  palette: readonly PaletteColor[]
  errors: Record<string, string>
}>()
const rows = defineModel<NewColorRow[]>({ required: true })

let nextUid = 0
function add() {
  rows.value = [
    ...rows.value,
    { uid: nextUid++, colorKey: undefined, displayImageFileId: null, designImageFileId: null },
  ]
}
function remove(uid: number) {
  rows.value = rows.value.filter((row) => row.uid !== uid)
}

// A palette color can be picked once; the other rows' picks are disabled.
function options(row: NewColorRow) {
  const taken = new Set(
    rows.value.filter((other) => other.uid !== row.uid).map((other) => other.colorKey),
  )
  return props.palette.map((color) => ({
    label: color.name,
    value: color.key,
    disabled: taken.has(color.key),
  }))
}
const full = computed(() => rows.value.length >= props.palette.length)
</script>

<template>
  <Flex vertical gap="middle">
    <Typography v-if="rows.length === 0" variant="caption">
      Chưa có màu. Có thể thêm ngay hoặc sau khi tạo; cần ít nhất một màu đang bán để bật bán.
    </Typography>
    <section
      v-for="(row, index) in rows"
      :key="row.uid"
      :aria-label="`Màu ${index + 1}`"
      class="rounded-lg border p-3"
    >
      <Row :gutter="[16, 16]">
        <Col :xs="24" :md="8">
          <Flex vertical gap="small">
            <FormField
              :for="`new-color-${row.uid}`"
              label="Màu"
              :error="errors[`${index}.colorKey`]"
              required
            >
              <template #default="{ id }">
                <Select
                  :id="id"
                  v-model="row.colorKey"
                  :options="options(row)"
                  placeholder="Chọn màu"
                  size="small"
                />
              </template>
            </FormField>
            <Button
              variant="text"
              size="small"
              class="self-start"
              :aria-label="`Bỏ màu ${index + 1}`"
              @click="remove(row.uid)"
            >
              <template #icon><Trash2 /></template>
              Bỏ màu này
            </Button>
          </Flex>
        </Col>
        <Col :xs="24" :sm="12" :md="8">
          <ImageUploadField
            :id="`new-color-${row.uid}-display`"
            v-model="row.displayImageFileId"
            label="Ảnh hiển thị"
            :error="errors[`${index}.displayImageFileId`]"
            required
          />
        </Col>
        <Col :xs="24" :sm="12" :md="8">
          <ImageUploadField
            :id="`new-color-${row.uid}-design`"
            v-model="row.designImageFileId"
            label="Ảnh thiết kế (nền trong suốt)"
            :error="errors[`${index}.designImageFileId`]"
            transparent
            required
          />
        </Col>
      </Row>
    </section>
    <Button variant="dashed" class="self-start" :disabled="full" @click="add">
      <template #icon><Plus /></template>
      Thêm màu
    </Button>
  </Flex>
</template>
