<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { ArrowLeft, Check, CloudOff, PenLine, SearchX } from '@lucide/vue'
import { Button, Col, Container, EmptyState, Flex, Image, Link, Row, Typography } from '@lituta/ui'
import { publicCatalog } from '../api/publicCatalog'
import { useRemoteData } from '../api/useRemoteData'
import { formatPrice } from '../features/catalog/formatPrice'

const props = defineProps<{ slug: string }>()

const router = useRouter()
const product = useRemoteData((signal) => publicCatalog.product(props.slug, signal))
// The same page component is reused when only the slug changes.
watch(
  () => props.slug,
  () => void product.reload(),
)

const colorId = ref<string | null>(null)
watch(product.data, (data) => (colorId.value = data?.colors[0]?.id ?? null))
const color = computed(
  () => product.data.value?.colors.find((entry) => entry.id === colorId.value) ?? null,
)

// The designer adds the chosen color to a new set (see DesignerWorkspace).
function design() {
  if (color.value) void router.push({ path: '/thiet-ke', query: { mau: color.value.id } })
}
</script>

<template>
  <Container class="py-10 lg:py-12">
    <Flex vertical gap="large">
      <Link :as="RouterLink" to="/san-pham" class="self-start">
        <Flex as="span" align="center" :gap="4">
          <ArrowLeft class="size-4" aria-hidden="true" />
          Tất cả sản phẩm
        </Flex>
      </Link>

      <EmptyState
        v-if="product.notFound.value"
        title="Không tìm thấy sản phẩm"
        description="Sản phẩm không tồn tại hoặc đã ngừng bán."
      >
        <template #icon><SearchX /></template>
        <template #action>
          <Button @click="router.push('/san-pham')">Xem sản phẩm khác</Button>
        </template>
      </EmptyState>

      <EmptyState
        v-else-if="product.error.value && !product.loading.value"
        title="Chưa tải được sản phẩm"
        :description="product.error.value"
      >
        <template #icon><CloudOff /></template>
        <template #action>
          <Button @click="product.reload()">Thử lại</Button>
        </template>
      </EmptyState>

      <Typography
        v-else-if="!product.data.value || product.data.value.slug !== slug"
        variant="caption"
        role="status"
      >
        Đang tải sản phẩm…
      </Typography>

      <Row v-else :gutter="[32, 24]">
        <Col :xs="24" :md="12">
          <Image
            :src="color?.displayImage.url"
            :alt="color ? `${product.data.value.name} – ${color.name}` : product.data.value.name"
            :width="color?.displayImage.width"
            :height="color?.displayImage.height"
            class="aspect-square w-full rounded-xl bg-secondary/50"
          />
        </Col>

        <Col :xs="24" :md="12">
          <Flex vertical gap="large">
            <Flex vertical gap="small">
              <Typography variant="caption">{{ product.data.value.category.name }}</Typography>
              <Typography as="h1" variant="title">{{ product.data.value.name }}</Typography>
              <Typography variant="subheading" class="text-primary">
                {{ formatPrice(product.data.value.price) }}
              </Typography>
              <Typography v-if="product.data.value.description" class="whitespace-pre-line">
                {{ product.data.value.description }}
              </Typography>
            </Flex>

            <section v-if="product.data.value.colors.length" aria-labelledby="color-heading">
              <Flex vertical gap="small">
                <Typography id="color-heading" as="h2" variant="body" weight="semibold">
                  Màu: {{ color?.name }}
                </Typography>
                <Flex wrap gap="small" role="group" aria-labelledby="color-heading">
                  <Button
                    v-for="entry in product.data.value.colors"
                    :key="entry.id"
                    size="small"
                    :variant="entry.id === colorId ? 'primary' : 'default'"
                    :aria-pressed="entry.id === colorId"
                    @click="colorId = entry.id"
                  >
                    <template #icon>
                      <span
                        v-if="entry.hexCode"
                        class="size-3 rounded-full border border-border"
                        :style="{ backgroundColor: entry.hexCode }"
                      />
                      <Check v-else-if="entry.id === colorId" />
                    </template>
                    {{ entry.name }}
                  </Button>
                </Flex>
              </Flex>
            </section>

            <section v-if="product.data.value.sizes.length" aria-labelledby="size-heading">
              <Flex vertical gap="small">
                <Typography id="size-heading" as="h2" variant="body" weight="semibold">
                  Kích thước có sẵn
                </Typography>
                <Flex as="ul" wrap gap="small" aria-labelledby="size-heading">
                  <li
                    v-for="size in product.data.value.sizes"
                    :key="size.id"
                    class="rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground"
                  >
                    {{ size.name }}
                  </li>
                </Flex>
                <Typography variant="caption">Chọn kích thước khi đặt hàng.</Typography>
              </Flex>
            </section>

            <Button size="large" :disabled="!color" class="self-start" @click="design()">
              <template #icon><PenLine /></template>
              Thiết kế với màu này
            </Button>
          </Flex>
        </Col>
      </Row>
    </Flex>
  </Container>
</template>
