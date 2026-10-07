<script setup lang="ts">
import { SearchX } from '@lucide/vue'
import { useRouter } from 'vue-router'
import { Button, Container, EmptyState } from '@lituta/ui'

const router = useRouter()
</script>

<template>
  <Container class="py-16">
    <EmptyState
      title="Không tìm thấy trang"
      description="Đường dẫn không tồn tại hoặc đã được đổi."
    >
      <template #icon><SearchX /></template>
      <template #action>
        <Button @click="router.push('/')">Về trang chủ</Button>
      </template>
    </EmptyState>
  </Container>
</template>
