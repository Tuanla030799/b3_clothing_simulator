<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import FormFooter from '../components/FormFooter.vue'
import PageHeader from '../components/PageHeader.vue'
import { useLeaveGuard } from '../composables/useLeaveGuard'
import CollectionForm from '../features/catalog/CollectionForm.vue'

const router = useRouter()
const form = ref<InstanceType<typeof CollectionForm> | null>(null)
const { allowLeave } = useLeaveGuard(() => Boolean(form.value?.dirty))

function created() {
  allowLeave()
  void router.push('/bo-suu-tap')
}
</script>

<template>
  <PageHeader
    title="Thêm bộ sưu tập"
    description="Sau khi tạo, mở bộ sưu tập trong danh sách để thêm sản phẩm."
    :back="{ to: '/bo-suu-tap', label: 'Danh sách bộ sưu tập' }"
  />
  <section aria-label="Thông tin bộ sưu tập" class="max-w-3xl rounded-xl border bg-card p-4">
    <CollectionForm ref="form" :collection="null" @saved="created" />
    <FormFooter
      class="mt-4"
      submit-label="Tạo bộ sưu tập"
      cancel-to="/bo-suu-tap"
      :saving="form?.saving"
      @submit="form?.save()"
    />
  </section>
</template>
