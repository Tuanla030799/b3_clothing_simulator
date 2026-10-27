<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { ArrowLeft, CloudOff, SearchX, ShoppingCart } from '@lucide/vue'
import { Button, Col, Container, EmptyState, Flex, Image, Link, Row, Typography } from '@lituta/ui'
import { publicCatalog } from '../api/publicCatalog'
import { useRemoteData } from '../api/useRemoteData'
import { useCart } from '../features/cart/cart'
import { categoryRoute, lineage } from '../features/catalog/categoryTree'
import { formatPrice } from '../features/catalog/formatPrice'

const props = defineProps<{ slug: string }>()

const router = useRouter()
const product = useRemoteData((signal) => publicCatalog.product(props.slug, signal))
const categories = useRemoteData((signal) => publicCatalog.categories(signal))

// "Áo › Áo thun": the category and its ancestors, each linking to its product list. Until the
// category list loads (or if it fails) only the product's own category is shown.
const categoryTrail = computed(() => {
  const category = product.data.value?.category
  if (!category) return []
  const chain = lineage(categories.data.value ?? [], category.id)
  return chain.length > 0 ? chain : [category]
})
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

// A product with sizes needs one before it goes to the cart (checkout can still change it).
const sizeId = ref<string | null>(null)
watch(product.data, () => (sizeId.value = null))
const size = computed(
  () => product.data.value?.sizes.find((entry) => entry.id === sizeId.value) ?? null,
)
const sizeError = ref(false)
watch(sizeId, () => (sizeError.value = false))

// Items are designed from the cart (the design tool works on the cart).
const cart = useCart()
const adding = ref(false)
const added = ref<{ ok: boolean; text: string } | null>(null)
watch([colorId, sizeId], () => (added.value = null))

async function addToCart() {
  const detail = product.data.value
  if (!color.value || !detail) return
  if (detail.sizes.length && !size.value) {
    sizeError.value = true
    return
  }
  adding.value = true
  try {
    const result = await cart.add([
      {
        productId: detail.id,
        productSlug: detail.slug,
        colorId: color.value.id,
        sizeId: size.value?.id ?? null,
      },
    ])
    const label = [detail.name, color.value.name, size.value && `size ${size.value.name}`]
      .filter(Boolean)
      .join(' – ')
    added.value = result.ok
      ? { ok: true, text: `Đã thêm ${label} vào giỏ.` }
      : { ok: false, text: `Giỏ hàng đã đủ ${result.limit} món.` }
  } catch {
    added.value = { ok: false, text: 'Chưa thêm được vào giỏ. Vui lòng thử lại.' }
  } finally {
    adding.value = false
  }
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
              <nav aria-label="Danh mục">
                <Flex as="ol" wrap align="center" :gap="4" class="text-sm text-muted-foreground">
                  <li v-for="(category, index) in categoryTrail" :key="category.id">
                    <span v-if="index > 0" aria-hidden="true">› </span>
                    <Link :as="RouterLink" :to="categoryRoute(category.path)">{{
                      category.name
                    }}</Link>
                  </li>
                </Flex>
              </nav>
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
                  <!-- Small round swatches; the chosen color's name is in the heading above. -->
                  <Button
                    v-for="entry in product.data.value.colors"
                    :key="entry.id"
                    size="small"
                    variant="text"
                    :aria-label="entry.name"
                    :title="entry.name"
                    :aria-pressed="entry.id === colorId"
                    @click="colorId = entry.id"
                  >
                    <template #icon>
                      <span
                        class="size-5 rounded-full border border-border bg-muted"
                        :class="
                          entry.id === colorId &&
                          'ring-2 ring-primary ring-offset-2 ring-offset-background'
                        "
                        :style="entry.hexCode ? { backgroundColor: entry.hexCode } : undefined"
                      />
                    </template>
                  </Button>
                </Flex>
              </Flex>
            </section>

            <section v-if="product.data.value.sizes.length" aria-labelledby="size-heading">
              <Flex vertical gap="small">
                <Typography id="size-heading" as="h2" variant="body" weight="semibold">
                  Kích thước: {{ size?.name ?? 'chưa chọn' }}
                </Typography>
                <Flex
                  wrap
                  gap="small"
                  role="group"
                  aria-labelledby="size-heading"
                  :aria-describedby="sizeError ? 'size-error' : undefined"
                >
                  <Button
                    v-for="entry in product.data.value.sizes"
                    :key="entry.id"
                    size="small"
                    :variant="entry.id === sizeId ? 'primary' : 'default'"
                    :aria-pressed="entry.id === sizeId"
                    class="min-w-12"
                    @click="sizeId = entry.id"
                  >
                    {{ entry.name }}
                  </Button>
                </Flex>
                <Typography
                  v-if="sizeError"
                  id="size-error"
                  role="alert"
                  variant="caption"
                  class="text-destructive"
                >
                  Vui lòng chọn kích thước.
                </Typography>
              </Flex>
            </section>

            <Flex vertical gap="small" class="self-start">
              <Button size="large" :disabled="!color" :loading="adding" @click="addToCart()">
                <template #icon><ShoppingCart /></template>
                Thêm vào giỏ hàng
              </Button>
              <Flex v-if="added" role="status" wrap align="center" gap="small">
                <Typography
                  as="span"
                  variant="caption"
                  :class="added.ok ? 'text-primary' : 'text-destructive'"
                >
                  {{ added.text }}
                </Typography>
                <Link v-if="added.ok" :as="RouterLink" to="/gio-hang">Xem giỏ hàng</Link>
              </Flex>
              <Typography variant="caption">
                Thêm các món bạn muốn rồi bấm “Thiết kế” trong giỏ để thêu tên cho cả bộ.
              </Typography>
            </Flex>
          </Flex>
        </Col>
      </Row>
    </Flex>
  </Container>
</template>
