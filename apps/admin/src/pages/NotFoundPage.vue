<script setup lang="ts">
import { useRouter } from 'vue-router'
import { SearchX } from '@lucide/vue'
import { Button, EmptyState } from '@lituta/ui'

const router = useRouter()
</script>

<template>
  <EmptyState title="Không tìm thấy trang" description="Đường dẫn không tồn tại.">
    <template #icon><SearchX /></template>
    <template #action>
      <Button @click="router.push('/')">Về trang đơn hàng</Button>
    </template>
  </EmptyState>
</template>
