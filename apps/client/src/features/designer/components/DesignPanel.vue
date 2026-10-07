<script setup lang="ts">
import { computed } from 'vue'
import { PenLine } from '@lucide/vue'
import { Button, EmptyState, Flex, Typography } from '@lituta/ui'
import { categoryName } from '../data/catalog'
import { injectDesigns } from '../useDesigns'
import { injectSelection } from '../useSelection'
import ImagePicker from './ImagePicker.vue'
import LayerControls from './LayerControls.vue'
import TextEditor from './TextEditor.vue'

const selection = injectSelection()
const designs = injectDesigns()
const active = computed(() => selection.activeEntry.value)
const zones = computed(() => (active.value ? designs.zonesOf(active.value.product) : []))
const zone = computed(() => designs.currentZone.value)

// Vietnamese samples of the lettering font.
const letteringSamples = ['Nguyễn Minh', 'Bảo Ngọc', 'Đậu']
</script>

<template>
  <section aria-labelledby="design-panel-heading" class="rounded-xl border bg-card p-4">
    <Flex vertical gap="middle">
      <Typography id="design-panel-heading" as="h2" variant="subheading">Cá nhân hóa</Typography>

      <template v-if="!active">
        <EmptyState
          title="Chưa có món đang chỉnh"
          description="Thêm đồ vào bộ rồi chọn một món để thêm tên hoặc logo vào vùng thêu."
        >
          <template #icon><PenLine /></template>
        </EmptyState>
        <div class="rounded-lg bg-muted p-4">
          <Typography as="h3" variant="caption" weight="medium">Mẫu kiểu chữ thêu</Typography>
          <ul class="mt-2 flex flex-col gap-1">
            <li
              v-for="sample in letteringSamples"
              :key="sample"
              class="font-design text-3xl leading-snug font-semibold text-primary"
            >
              {{ sample }}
            </li>
          </ul>
        </div>
      </template>

      <Flex v-else vertical gap="middle" data-testid="design-active">
        <div>
          <Typography variant="caption">
            Món {{ active.position }} · {{ categoryName(active.product.categoryId) }}
          </Typography>
          <Typography as="h3" variant="body" weight="semibold">
            {{ active.product.name }}
          </Typography>
        </div>

        <EmptyState
          v-if="!zone"
          title="Món này chưa hỗ trợ cá nhân hóa"
          description="Sản phẩm chưa có vùng thêu."
        />

        <!-- Disabled natively while an image is being created (the edit functions also refuse). -->
        <fieldset v-else :disabled="designs.locked.value" class="m-0 min-w-0 border-0 p-0">
          <Flex vertical gap="middle">
            <div>
              <Typography as="span" variant="caption" weight="medium">Vùng thêu</Typography>
              <Flex
                v-if="zones.length > 1"
                wrap
                gap="small"
                class="mt-1"
                role="group"
                aria-label="Chọn vùng thêu"
              >
                <Button
                  v-for="option in zones"
                  :key="option.id"
                  size="small"
                  :variant="option.id === zone.id ? 'primary' : 'default'"
                  :aria-pressed="option.id === zone.id"
                  @click="designs.selectZone(option.id)"
                >
                  {{ option.name }}
                </Button>
              </Flex>
              <Typography v-else variant="body" weight="medium">{{ zone.name }}</Typography>
            </div>

            <TextEditor
              v-if="zone.allowedContent.includes('text')"
              :instance-id="active.item.instanceId"
              :zone-id="zone.id"
            />
            <ImagePicker
              v-if="zone.allowedContent.includes('image')"
              :instance-id="active.item.instanceId"
              :zone-id="zone.id"
            />
            <LayerControls v-if="designs.currentLayer.value" :layer="designs.currentLayer.value" />
            <Typography v-else variant="caption">
              Chọn chữ hoặc hình trên ảnh để kéo, đổi kích thước và xoay.
            </Typography>
          </Flex>
        </fieldset>
      </Flex>
    </Flex>
  </section>
</template>
