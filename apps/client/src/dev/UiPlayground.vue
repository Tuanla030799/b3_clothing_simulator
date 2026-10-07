<script setup lang="ts">
/*
 * Development-only playground for @lituta/ui. Opened with /?playground during `yarn dev`;
 * never imported by the production entry (see src/main.ts).
 */
import { computed, ref } from 'vue'
import { Heart, Plus, Search, Settings } from '@lucide/vue'
import {
  Button,
  Col,
  Container,
  Dropdown,
  EmptyState,
  Flex,
  FormField,
  Image,
  Row,
  Select,
  Typography,
  type DropdownItem,
  type SelectOption,
  type SelectOptionValue,
} from '@lituta/ui'

// A tiny valid inline SVG so the playground does not depend on product assets.
const okImage =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="120"><rect width="160" height="120" fill="#F3E3DF"/><circle cx="80" cy="60" r="30" fill="#456454"/></svg>',
  )
const okImageAlt =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="120"><rect width="160" height="120" fill="#456454"/><rect x="50" y="30" width="60" height="60" fill="#F3E3DF"/></svg>',
  )
const brokenImage = '/__playground__/missing-image.png'

const imageSources = [okImage, okImageAlt, brokenImage, undefined] as const
const imageIndex = ref(0)
const switchingSrc = computed(() => imageSources[imageIndex.value % imageSources.length])
const imageLog = ref<string[]>([])
function logImage(message: string) {
  imageLog.value = [message, ...imageLog.value].slice(0, 5)
}

// Button
const submitCount = ref(0)
const loading = ref(false)
function simulateLoading() {
  loading.value = true
  setTimeout(() => (loading.value = false), 1500)
}
const clickCount = ref(0)

// FormField
const nameValue = ref('')
const nameError = computed(() => (nameValue.value.length > 20 ? 'Tên tối đa 20 ký tự.' : undefined))

// Select
const mixedOptions: SelectOption[] = [
  { label: 'Số 1 (number)', value: 1 },
  { label: 'Chuỗi "1" (string)', value: '1' },
  { label: 'Số 2 (number)', value: 2 },
  { label: 'Không khả dụng', value: 'disabled', disabled: true },
]
const mixedValue = ref<SelectOptionValue | undefined>(1)
const describeValue = (value: SelectOptionValue | undefined) =>
  value === undefined ? 'undefined' : `${JSON.stringify(value)} (${typeof value})`
const sizeOptions: SelectOption[] = [
  { label: 'Nhỏ', value: 'small' },
  { label: 'Vừa', value: 'middle' },
  { label: 'Lớn', value: 'large' },
]
const sizeValue = ref<SelectOptionValue | undefined>()
const selectLoading = ref(true)

// Dropdown
const dropdownItems: DropdownItem[] = [
  { key: 'duplicate', label: 'Nhân bản' },
  { key: 'rename', label: 'Đổi tên' },
  { key: 'locked', label: 'Không khả dụng', disabled: true },
  { key: 'delete', label: 'Xóa', danger: true },
]
const lastAction = ref('—')
</script>

<template>
  <Container class="py-8">
    <Flex vertical gap="large">
      <header>
        <Typography as="h1" variant="title">UI playground</Typography>
        <Typography variant="caption">
          Chỉ dùng khi phát triển. Kiểm tra các common component của @lituta/ui.
        </Typography>
      </header>

      <!-- Row / Col -->
      <section class="rounded-xl border bg-card p-4" aria-labelledby="pg-grid">
        <Typography id="pg-grid" as="h2" variant="heading">Row / Col</Typography>
        <Typography variant="caption" class="mb-3">
          gutter=[24, 16]; ba cột xs=24, lg=6 / 12 / 6. Tổng span 24 phải nằm trên một hàng ở lg.
        </Typography>
        <Row :gutter="[24, 16]" data-testid="grid-acceptance">
          <Col :xs="24" :lg="6"><div class="rounded-md bg-secondary p-3">xs 24 · lg 6</div></Col>
          <Col :xs="24" :lg="12"><div class="rounded-md bg-secondary p-3">xs 24 · lg 12</div></Col>
          <Col :xs="24" :lg="6"><div class="rounded-md bg-secondary p-3">xs 24 · lg 6</div></Col>
        </Row>

        <Typography variant="caption" class="mt-4 mb-3">
          Offset, kế thừa mobile-first và span=0 (cột thứ ba ẩn từ md).
        </Typography>
        <Row :gutter="16">
          <Col :span="12" :md="{ span: 6, offset: 6 }">
            <div class="rounded-md bg-muted p-3">span 12 · md 6 offset 6</div>
          </Col>
          <Col :span="12" :md="6">
            <div class="rounded-md bg-muted p-3">span 12 · md 6</div>
          </Col>
          <Col :xs="24" :md="0">
            <div class="rounded-md bg-muted p-3">xs 24 · md 0 (ẩn từ md)</div>
          </Col>
        </Row>

        <Typography variant="caption" class="mt-4 mb-3"
          >Row align middle, justify center</Typography
        >
        <Row :gutter="16" align="middle" justify="center">
          <Col :span="6"><div class="h-16 rounded-md bg-muted p-3">cao</div></Col>
          <Col :span="6"><div class="rounded-md bg-muted p-3">thấp</div></Col>
        </Row>
      </section>

      <!-- Flex -->
      <section class="rounded-xl border bg-card p-4" aria-labelledby="pg-flex">
        <Typography id="pg-flex" as="h2" variant="heading" class="mb-3">Flex</Typography>
        <Flex vertical gap="middle">
          <Flex gap="small" align="center">
            <span class="rounded bg-secondary px-3 py-1">ngang</span>
            <span class="rounded bg-secondary px-3 py-3">small gap</span>
            <span class="rounded bg-secondary px-3 py-1">center</span>
          </Flex>
          <Flex vertical :gap="4" class="max-w-xs">
            <span class="rounded bg-secondary px-3 py-1">dọc</span>
            <span class="rounded bg-secondary px-3 py-1">gap 4px</span>
          </Flex>
          <Flex wrap gap="large" justify="space-between" class="max-w-md">
            <span v-for="n in 7" :key="n" class="rounded bg-muted px-4 py-1">wrap {{ n }}</span>
          </Flex>
        </Flex>
      </section>

      <!-- Typography -->
      <section class="rounded-xl border bg-card p-4" aria-labelledby="pg-typography">
        <Typography id="pg-typography" as="h2" variant="heading" class="mb-3">
          Typography
        </Typography>
        <Flex vertical gap="small">
          <Typography as="h3" variant="title">h3 · title — Nguyễn Minh</Typography>
          <Typography as="p" variant="heading">p · heading — Bảo Ngọc</Typography>
          <Typography as="span" variant="subheading">span · subheading — Đậu</Typography>
          <Typography>p · body (mặc định)</Typography>
          <Typography variant="caption" weight="bold" align="right"
            >caption · bold · right</Typography
          >
          <div class="w-48 rounded border p-2">
            <Typography ellipsis>Dòng chữ rất dài sẽ bị cắt bằng dấu ba chấm ở cuối</Typography>
          </div>
        </Flex>
      </section>

      <!-- Button -->
      <section class="rounded-xl border bg-card p-4" aria-labelledby="pg-button">
        <Typography id="pg-button" as="h2" variant="heading" class="mb-3">Button</Typography>
        <Flex vertical gap="middle">
          <Flex wrap gap="small" align="center">
            <Button @click="clickCount++">Primary ({{ clickCount }})</Button>
            <Button variant="default">Default</Button>
            <Button variant="dashed">Dashed</Button>
            <Button variant="text">Text</Button>
            <Button variant="link">Link</Button>
            <Button variant="destructive">Destructive</Button>
          </Flex>
          <Flex wrap gap="small" align="center">
            <Button size="small">Small</Button>
            <Button>Middle</Button>
            <Button size="large">Large</Button>
            <Button variant="default">
              <template #icon><Plus /></template>
              Có icon
            </Button>
            <Button variant="default" aria-label="Cài đặt">
              <template #icon><Settings /></template>
            </Button>
            <Button disabled>Disabled</Button>
            <Button :loading="loading" @click="simulateLoading">
              {{ loading ? 'Đang lưu' : 'Bấm để loading' }}
            </Button>
          </Flex>
          <form class="flex flex-wrap items-center gap-2" @submit.prevent="submitCount++">
            <Button html-type="submit" :loading="loading">Submit form</Button>
            <Button html-type="reset" variant="default">Reset</Button>
            <Typography as="span" variant="caption">Đã submit: {{ submitCount }}</Typography>
          </form>
          <Button block variant="dashed">
            <template #icon><Plus /></template>
            Block
          </Button>
        </Flex>
      </section>

      <!-- Image -->
      <section class="rounded-xl border bg-card p-4" aria-labelledby="pg-image">
        <Typography id="pg-image" as="h2" variant="heading" class="mb-3">Image</Typography>
        <Flex wrap gap="large">
          <figure class="flex flex-col gap-2">
            <Image
              :src="okImage"
              alt="Ảnh hợp lệ"
              :width="160"
              :height="120"
              class="h-30 w-40 rounded-lg"
            />
            <figcaption class="text-sm text-muted-foreground">Tải thành công</figcaption>
          </figure>
          <figure class="flex flex-col gap-2">
            <Image alt="Thiếu nguồn ảnh" class="h-30 w-40 rounded-lg" />
            <figcaption class="text-sm text-muted-foreground">Thiếu src</figcaption>
          </figure>
          <figure class="flex flex-col gap-2">
            <Image :src="brokenImage" alt="Ảnh lỗi" class="h-30 w-40 rounded-lg">
              <template #fallback>
                <span class="text-sm">Không tải được ảnh</span>
              </template>
            </Image>
            <figcaption class="text-sm text-muted-foreground">Lỗi + fallback slot</figcaption>
          </figure>
          <figure class="flex flex-col gap-2">
            <Image
              :src="switchingSrc"
              alt="Ảnh đổi nguồn"
              fit="cover"
              class="h-30 w-40 rounded-lg"
              @load="logImage('load')"
              @error="logImage('error')"
            />
            <figcaption class="flex flex-col gap-1 text-sm text-muted-foreground">
              <Button size="small" variant="default" @click="imageIndex++">
                Đổi nguồn ({{ imageIndex % imageSources.length }})
              </Button>
              <span data-testid="image-log">Sự kiện: {{ imageLog.join(', ') || '—' }}</span>
            </figcaption>
          </figure>
        </Flex>
      </section>

      <!-- FormField + Select -->
      <section class="rounded-xl border bg-card p-4" aria-labelledby="pg-form">
        <Typography id="pg-form" as="h2" variant="heading" class="mb-3"
          >FormField / Select</Typography
        >
        <Row :gutter="[24, 16]">
          <Col :xs="24" :md="12">
            <FormField
              for="pg-name"
              label="Tên thêu"
              description="Tối đa 20 ký tự."
              :error="nameError"
              required
            >
              <template #default="{ id, describedBy, invalid, required }">
                <input
                  :id="id"
                  v-model="nameValue"
                  :aria-describedby="describedBy"
                  :aria-invalid="invalid || undefined"
                  :required="required"
                  class="h-10 rounded-md border border-input bg-card px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-invalid:border-destructive"
                />
              </template>
            </FormField>
          </Col>
          <Col :xs="24" :md="12">
            <FormField
              for="pg-mixed"
              label="Giá trị number / string"
              description='Phân biệt 1 và "1".'
            >
              <template #default="{ id, describedBy, invalid }">
                <Select
                  :id="id"
                  v-model="mixedValue"
                  :options="mixedOptions"
                  :aria-describedby="describedBy"
                  :aria-invalid="invalid || undefined"
                  placeholder="Chọn giá trị"
                  allow-clear
                />
              </template>
            </FormField>
            <Typography variant="caption" class="mt-1" data-testid="mixed-value">
              Giá trị: {{ describeValue(mixedValue) }}
            </Typography>
          </Col>
          <Col :xs="24" :md="8">
            <FormField for="pg-size" label="Kích thước nhỏ">
              <template #default="{ id }">
                <Select
                  :id="id"
                  v-model="sizeValue"
                  :options="sizeOptions"
                  size="small"
                  placeholder="Chọn"
                />
              </template>
            </FormField>
          </Col>
          <Col :xs="24" :md="8">
            <FormField for="pg-disabled" label="Disabled">
              <template #default="{ id }">
                <Select :id="id" :model-value="'middle'" :options="sizeOptions" disabled />
              </template>
            </FormField>
          </Col>
          <Col :xs="24" :md="8">
            <FormField for="pg-loading" label="Loading">
              <template #default="{ id }">
                <Select
                  :id="id"
                  :options="sizeOptions"
                  :loading="selectLoading"
                  size="large"
                  placeholder="Đang tải"
                />
              </template>
            </FormField>
            <Button size="small" variant="link" @click="selectLoading = !selectLoading">
              Bật/tắt loading
            </Button>
          </Col>
          <Col :xs="24" :md="12">
            <FormField for="pg-empty" label="Không có lựa chọn">
              <template #default="{ id }">
                <Select :id="id" :options="[]" placeholder="Trống" />
              </template>
            </FormField>
          </Col>
          <Col :xs="24" :md="12">
            <FormField
              for="pg-slot-label"
              error="Lỗi ưu tiên hơn mô tả."
              description="Không hiển thị"
            >
              <template #label
                >Label qua slot <Heart class="inline size-4" aria-hidden="true"
              /></template>
              <template #default="{ id, describedBy, invalid }">
                <input
                  :id="id"
                  :aria-describedby="describedBy"
                  :aria-invalid="invalid || undefined"
                  class="h-10 rounded-md border border-input bg-card px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-invalid:border-destructive"
                />
              </template>
            </FormField>
          </Col>
        </Row>
      </section>

      <!-- Dropdown -->
      <section class="rounded-xl border bg-card p-4" aria-labelledby="pg-dropdown">
        <Typography id="pg-dropdown" as="h2" variant="heading" class="mb-3">Dropdown</Typography>
        <Flex wrap gap="small" align="center">
          <Dropdown :items="dropdownItems" @select="lastAction = $event">
            <Button variant="default">Click (bottomLeft)</Button>
          </Dropdown>
          <Dropdown
            :items="dropdownItems"
            trigger="hover"
            placement="bottomRight"
            @select="lastAction = $event"
          >
            <Button variant="default">Hover (bottomRight)</Button>
          </Dropdown>
          <Dropdown :items="dropdownItems" placement="topLeft" @select="lastAction = $event">
            <Button variant="default">Top left</Button>
          </Dropdown>
          <Dropdown :items="dropdownItems" disabled @select="lastAction = $event">
            <Button variant="default">Disabled</Button>
          </Dropdown>
          <Typography as="span" variant="caption" data-testid="dropdown-last">
            Đã chọn: {{ lastAction }}
          </Typography>
        </Flex>
      </section>

      <!-- EmptyState -->
      <section class="rounded-xl border bg-card p-4" aria-labelledby="pg-empty-state">
        <Typography id="pg-empty-state" as="h2" variant="heading">EmptyState</Typography>
        <Row :gutter="16">
          <Col :xs="24" :md="12">
            <EmptyState title="Chưa có dữ liệu" />
          </Col>
          <Col :xs="24" :md="12">
            <EmptyState title="Không tìm thấy" description="Thử từ khóa khác.">
              <template #icon><Search /></template>
              Nội dung phụ qua slot mặc định.
              <template #action>
                <Button variant="default" size="small">Hành động</Button>
              </template>
            </EmptyState>
          </Col>
        </Row>
      </section>
    </Flex>
  </Container>
</template>
