<script setup lang="ts">
import { computed } from 'vue'
import { Clock } from '@lucide/vue'
import { useRoute, useRouter } from 'vue-router'
import { Button, Container, EmptyState } from '@lituta/ui'

// Shared placeholder for menu targets that are not built yet; the title comes from the route.
const route = useRoute()
const router = useRouter()
const title = computed(() => route.meta.title ?? 'Trang này')
</script>

<template>
  <Container class="py-16">
    <EmptyState :title="`${title} sắp ra mắt`" description="Phần này đang được xây dựng.">
      <template #icon><Clock /></template>
      <template #action>
        <Button variant="default" @click="router.push('/')">Về trang chủ</Button>
        <Button @click="router.push('/thiet-ke')">Thiết kế bộ quà</Button>
      </template>
    </EmptyState>
  </Container>
</template>
