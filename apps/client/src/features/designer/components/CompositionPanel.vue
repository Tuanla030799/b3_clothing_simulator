<script setup lang="ts">
import { computed } from 'vue'
import { LayoutGrid, Pencil, RotateCw } from '@lucide/vue'
import { Button, EmptyState, Flex, Image, Typography } from '@lituta/ui'
import { injectComposition, type ResourceIssue } from '../useComposition'
import { injectDesigns } from '../useDesigns'
import { injectSelection } from '../useSelection'

const emit = defineEmits<{ edit: [instanceId: string]; browse: [] }>()

const selection = injectSelection()
const designs = injectDesigns()
const composition = injectComposition()

const issueText = (issue: ResourceIssue) => {
  const what =
    issue.kind === 'product'
      ? 'ảnh sản phẩm'
      : `${issue.kind === 'text' ? 'kiểu chữ' : 'hình'} ở ${issue.zoneName}`
  return `Món ${issue.position} (${issue.productName}): ${issue.status === 'error' ? 'không tải được' : 'đang tải'} ${what}`
}
const errors = computed(() => composition.issues.value.filter((issue) => issue.status === 'error'))

function designSummary(instanceId: string, zoneIds: string[]) {
  let texts = 0
  let images = 0
  for (const zoneId of zoneIds) {
    const design = designs.zoneDesign(instanceId, zoneId)
    if (design?.text) texts++
    if (design?.image) images++
  }
  if (!texts && !images) return 'Chưa cá nhân hóa'
  return [texts && `${texts} chữ`, images && `${images} hình`].filter(Boolean).join(', ')
}
</script>

<template>
  <section aria-labelledby="composition-panel-heading" class="rounded-xl border bg-card p-4">
    <Flex vertical gap="middle">
      <Typography id="composition-panel-heading" as="h2" variant="subheading">Xem cả bộ</Typography>

      <EmptyState
        v-if="composition.status.value === 'empty'"
        title="Bộ đồ đang trống"
        description="Thêm sản phẩm để xem cả bộ trên nền."
      >
        <template #icon><LayoutGrid /></template>
        <template #action>
          <Button variant="default" class="lg:hidden" @click="emit('browse')">Chọn sản phẩm</Button>
        </template>
      </EmptyState>

      <template v-else>
        <div role="status" data-testid="composition-status">
          <Typography v-if="composition.status.value === 'loading'" variant="caption">
            Đang chuẩn bị ảnh và chữ…
          </Typography>
          <Typography v-else-if="composition.status.value === 'ready'" variant="caption">
            Đã sắp xếp {{ selection.entries.value.length }} món trên nền.
          </Typography>
          <div v-else class="rounded-md border border-destructive p-3">
            <Typography variant="body" weight="medium" class="text-destructive">
              Bộ chưa hiển thị đầy đủ.
            </Typography>
            <ul class="mt-1 list-disc ps-5 text-sm">
              <li
                v-for="issue in errors"
                :key="`${issue.instanceId}-${issue.kind}-${issue.zoneName}`"
              >
                {{ issueText(issue) }}
              </li>
            </ul>
            <Button variant="default" size="small" class="mt-2" @click="composition.retry()">
              <template #icon><RotateCw /></template>
              Thử lại
            </Button>
          </div>
        </div>
      </template>

      <div>
        <Typography as="h3" variant="body" weight="semibold">Nền</Typography>
        <Flex
          v-if="composition.backgrounds.length > 1"
          as="ul"
          wrap
          gap="small"
          class="mt-2"
          aria-label="Chọn nền"
        >
          <li v-for="bg in composition.backgrounds" :key="bg.id">
            <!-- Selectable thumbnail tile (Button sizes cannot hold an image). -->
            <button
              type="button"
              class="w-24 rounded-md border p-1 text-xs hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-pressed:border-primary aria-pressed:bg-secondary"
              :disabled="selection.lock.locked.value"
              :aria-pressed="composition.background.value?.id === bg.id"
              :aria-busy="composition.pendingBackgroundId.value === bg.id || undefined"
              @click="composition.selectBackground(bg.id)"
            >
              <Flex vertical align="center" :gap="4">
                <Image
                  :src="bg.image.src"
                  alt=""
                  fit="cover"
                  class="aspect-video w-full rounded-sm"
                />
                {{ bg.name }}
              </Flex>
            </button>
          </li>
        </Flex>
        <Typography v-else variant="caption" class="mt-1">
          {{ composition.backgroundEntry.value?.name ?? 'Nền trơn' }}
        </Typography>
        <p
          v-if="composition.backgroundError.value"
          class="mt-1 text-sm text-destructive"
          role="alert"
        >
          {{ composition.backgroundError.value }}
          {{ composition.background.value ? 'Đang giữ nền trước đó.' : 'Đang dùng nền trơn.' }}
        </p>
        <Button
          v-if="composition.backgroundError.value && !composition.background.value"
          variant="link"
          size="small"
          @click="composition.retry()"
        >
          Tải lại nền
        </Button>
      </div>

      <div v-if="selection.entries.value.length">
        <Typography as="h3" variant="body" weight="semibold">Các món trong bộ</Typography>
        <Flex as="ul" vertical gap="small" class="mt-2">
          <Flex
            v-for="entry in selection.entries.value"
            :key="entry.item.instanceId"
            as="li"
            align="center"
            gap="small"
            class="rounded-md border p-2"
          >
            <div class="min-w-0 flex-1">
              <Typography variant="body" weight="medium">
                Món {{ entry.position }}: {{ entry.product.name }}
              </Typography>
              <Typography variant="caption">
                {{
                  designSummary(
                    entry.item.instanceId,
                    designs.zonesOf(entry.product).map((z) => z.id),
                  )
                }}
              </Typography>
            </div>
            <Button
              variant="default"
              size="small"
              :disabled="selection.lock.locked.value"
              :aria-label="`Chỉnh món ${entry.position}: ${entry.product.name}`"
              @click="emit('edit', entry.item.instanceId)"
            >
              <template #icon><Pencil /></template>
              Chỉnh
            </Button>
          </Flex>
        </Flex>
      </div>
    </Flex>
  </section>
</template>
