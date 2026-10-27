<script setup lang="ts">
import { computed, ref, shallowRef, useTemplateRef, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { Plus, Trash2 } from '@lucide/vue'
import { Select as AntSelect, Spin, Table, Tag } from 'ant-design-vue'
import { Button, Col, EmptyState, Flex, Link, Row, Typography } from '@lituta/ui'
import { errorMessage } from '../api/httpClient'
import { collectionsApi, productsApi } from '../api/resources'
import type { Collection, CollectionMember } from '../api/types'
import FormFooter from '../components/FormFooter.vue'
import PageHeader from '../components/PageHeader.vue'
import ReorderHandle from '../components/ReorderHandle.vue'
import SortModeActions from '../components/SortModeActions.vue'
import { useFeedback } from '../composables/useFeedback'
import { useLeaveGuard } from '../composables/useLeaveGuard'
import { usePagedTable } from '../composables/usePagedTable'
import { sortModeColumns, useSortMode } from '../composables/useSortMode'
import CollectionForm from '../features/catalog/CollectionForm.vue'
import { formatPrice } from '../utils/format'

const props = defineProps<{ id: string }>()
const router = useRouter()
const feedback = useFeedback()

const collection = shallowRef<Collection | null>(null)
const loadError = ref<string | null>(null)
async function load() {
  loadError.value = null
  try {
    collection.value = await collectionsApi.get(props.id)
  } catch (error) {
    loadError.value = errorMessage(error)
  }
}

const members = usePagedTable(
  (page, pageSize) => collectionsApi.members(props.id, { page, pageSize }),
  100,
)
watch(
  () => props.id,
  () => {
    void load()
    void members.reload(true)
  },
  { immediate: true },
)

const infoForm = ref<InstanceType<typeof CollectionForm> | null>(null)
const { allowLeave } = useLeaveGuard(() => Boolean(infoForm.value?.dirty))

// Sorting mode: rows move locally and "Lưu thứ tự" saves the whole order at once.
const sort = useSortMode({
  container: useTemplateRef<HTMLElement>('membersWrap'),
  loadAll: () => collectionsApi.allMembers(props.id),
  save: (ids) => collectionsApi.reorderMembers(props.id, ids),
  reload: () => members.reload(),
  rowId: (member) => member.product.id,
})
// Another collection opened in the same page leaves the sorting mode.
watch(
  () => props.id,
  () => sort.cancel(),
)

// --- add a product (searched on the server) ---
const searchOptions = ref<{ label: string; value: string }[]>([])
const searching = ref(false)
const picked = ref<string | undefined>()
const adding = ref(false)
let searchRequest = 0

async function search(q: string) {
  const current = ++searchRequest
  searching.value = true
  try {
    const page = await productsApi.list({ q: q.trim() || undefined, pageSize: 20 })
    if (current !== searchRequest) return
    searchOptions.value = page.entries.map((product) => ({
      label: `${product.name}${product.isActive ? '' : ' (nháp/ẩn)'}`,
      value: product.id,
    }))
  } catch (error) {
    feedback.error(error)
  } finally {
    if (current === searchRequest) searching.value = false
  }
}
void search('')

async function add() {
  if (!picked.value) return
  adding.value = true
  try {
    await collectionsApi.addMember(props.id, picked.value)
    picked.value = undefined
    feedback.success('Đã thêm sản phẩm.')
    void members.reload()
    void load()
  } catch (error) {
    feedback.error(error)
  } finally {
    adding.value = false
  }
}

function removeMember(member: CollectionMember) {
  const collectionId = props.id
  feedback.confirmDelete(
    `Bỏ “${member.product.name}” khỏi bộ sưu tập?`,
    'Sản phẩm vẫn còn trong danh mục.',
    async () => {
      try {
        await collectionsApi.removeMember(collectionId, member.product.id)
        void members.reload()
        void load()
      } catch (error) {
        feedback.error(error)
      }
    },
  )
}

function infoSaved(saved: Collection) {
  collection.value = saved
  allowLeave()
  void router.push('/bo-suu-tap')
}

function removeCollection() {
  if (!collection.value) return
  const current = collection.value
  feedback.confirmDelete(
    `Xóa bộ sưu tập “${current.name}”?`,
    'Sản phẩm không bị ảnh hưởng.',
    async () => {
      try {
        await collectionsApi.remove(current.id)
        feedback.success('Đã xóa bộ sưu tập.')
        allowLeave()
        void router.push('/bo-suu-tap')
      } catch (error) {
        feedback.error(error)
      }
    },
  )
}

const columns = computed(() =>
  sortModeColumns<CollectionMember>(
    [
      { title: 'STT', key: 'number', width: 70 },
      { title: 'Thứ tự', key: 'order', width: 120 },
      { title: 'Sản phẩm', key: 'product' },
      { title: 'Giá', key: 'price', width: 130 },
      { title: 'Trang khách', key: 'public', width: 130 },
      { title: '', key: 'actions', width: 80, align: 'right', fixed: 'right' },
    ],
    sort.active.value,
  ),
)
</script>

<template>
  <PageHeader
    :title="collection?.name ?? 'Bộ sưu tập'"
    :description="collection ? `/${collection.slug}` : undefined"
    :back="{ to: '/bo-suu-tap', label: 'Danh sách bộ sưu tập' }"
  />

  <EmptyState v-if="loadError" title="Chưa tải được bộ sưu tập" :description="loadError">
    <template #action>
      <Button @click="load()">Thử lại</Button>
    </template>
  </EmptyState>

  <Spin v-else :spinning="!collection">
    <Row v-if="collection" :gutter="[24, 24]">
      <Col :xs="24" :lg="16">
        <Flex vertical gap="large">
          <section aria-labelledby="info-heading" class="rounded-xl border bg-card p-4">
            <Flex vertical gap="middle">
              <Typography id="info-heading" as="h2" variant="subheading">Thông tin</Typography>
              <CollectionForm ref="infoForm" :collection="collection" @saved="infoSaved" />
              <FormFooter
                submit-label="Lưu thông tin"
                :saving="infoForm?.saving"
                :dirty="infoForm?.dirty"
                @submit="infoForm?.save()"
                @reset="infoForm?.reset()"
              />
            </Flex>
          </section>

          <section aria-labelledby="members-heading" class="rounded-xl border bg-card p-4">
            <Flex vertical gap="middle">
              <Flex align="center" justify="space-between" wrap gap="small">
                <Typography id="members-heading" as="h2" variant="subheading">
                  Sản phẩm ({{ collection?.productCount ?? 0 }})
                </Typography>
                <Flex wrap gap="small">
                  <SortModeActions
                    :active="sort.active.value"
                    :loading="sort.loading.value"
                    :saving="sort.saving.value"
                    :dirty="sort.dirty.value"
                    :disabled="members.rows.value.length === 0"
                    @start="sort.start()"
                    @save="sort.save()"
                    @cancel="sort.cancel()"
                  />
                </Flex>
              </Flex>
              <form v-if="!sort.active.value" class="max-w-xl" @submit.prevent="add">
                <Flex gap="small">
                  <AntSelect
                    v-model:value="picked"
                    show-search
                    :filter-option="false"
                    :options="searchOptions"
                    :loading="searching"
                    placeholder="Tìm sản phẩm để thêm"
                    :not-found-content="searching ? undefined : 'Không tìm thấy sản phẩm'"
                    aria-label="Sản phẩm cần thêm"
                    class="min-w-0 flex-1"
                    @search="search"
                  />
                  <Button html-type="submit" size="small" :disabled="!picked" :loading="adding">
                    <template #icon><Plus /></template>
                    Thêm
                  </Button>
                </Flex>
              </form>

              <div ref="membersWrap">
                <Table
                  row-key="createdAt"
                  :columns="columns"
                  :data-source="sort.active.value ? sort.rows.value : members.rows.value"
                  :loading="members.loading.value || sort.loading.value"
                  :pagination="sort.active.value ? false : members.pagination.value"
                  :scroll="{ x: 770 }"
                  @change="members.onChange"
                >
                  <template #bodyCell="{ column, record, index }">
                    <template v-if="column.key === 'number'">{{
                      sort.active.value ? index + 1 : members.rowNumber(index)
                    }}</template>
                    <template v-else-if="column.key === 'order'">
                      <ReorderHandle
                        :label="record.product.name"
                        :first="index === 0"
                        :last="index === sort.rows.value.length - 1"
                        :disabled="sort.saving.value"
                        @up="sort.moveBy(index, -1)"
                        @down="sort.moveBy(index, 1)"
                      />
                    </template>
                    <template v-else-if="column.key === 'product'">
                      <Link :as="RouterLink" :to="`/san-pham/${record.product.id}`">{{
                        record.product.name
                      }}</Link>
                    </template>
                    <template v-else-if="column.key === 'price'">{{
                      formatPrice(record.product.price)
                    }}</template>
                    <template v-else-if="column.key === 'public'">
                      <Tag :color="record.product.isPublic ? 'green' : 'default'">
                        {{ record.product.isPublic ? 'Đang hiện' : 'Không hiện' }}
                      </Tag>
                    </template>
                    <template v-else-if="column.key === 'actions'">
                      <Button
                        size="small"
                        variant="text"
                        @click="removeMember(record as CollectionMember)"
                        >Bỏ</Button
                      >
                    </template>
                  </template>
                </Table>
              </div>
            </Flex>
          </section>
        </Flex>
      </Col>

      <Col :xs="24" :lg="8">
        <Flex vertical gap="large" class="lg:sticky lg:top-4">
          <section aria-labelledby="visibility-heading" class="rounded-xl border bg-card p-4">
            <Flex vertical gap="small">
              <Typography id="visibility-heading" as="h2" variant="subheading">
                Hiển thị
              </Typography>
              <Flex wrap gap="small">
                <Tag :color="collection.isActive ? 'green' : 'default'">
                  {{ collection.isActive ? 'Đang hiện' : 'Đang ẩn' }}
                </Tag>
                <Tag v-if="collection.isFeatured" color="gold">Nổi bật</Tag>
                <Tag>{{ collection.productCount }} sản phẩm</Tag>
              </Flex>
              <Typography variant="caption">
                Bộ sưu tập nổi bật và đang hiện xuất hiện trên trang chủ. Đổi trong phần Thông tin.
              </Typography>
            </Flex>
          </section>

          <section aria-labelledby="danger-heading" class="rounded-xl border bg-card p-4">
            <Flex vertical gap="middle">
              <Typography id="danger-heading" as="h2" variant="subheading">
                Xóa bộ sưu tập
              </Typography>
              <Typography variant="caption">
                Chỉ xóa bộ sưu tập và danh sách thành viên; sản phẩm không bị ảnh hưởng.
              </Typography>
              <Button variant="destructive" class="self-start" @click="removeCollection">
                <template #icon><Trash2 /></template>
                Xóa bộ sưu tập
              </Button>
            </Flex>
          </section>
        </Flex>
      </Col>
    </Row>
  </Spin>
</template>
