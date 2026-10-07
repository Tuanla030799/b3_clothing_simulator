<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Button, Container, Flex, Typography } from '@lituta/ui'

const router = useRouter()
// Temporary content: the real home sections (banner, commitments, collections, …) come in later
// phases of docs/homepage-plan.md.
</script>

<template>
  <Container class="py-16">
    <Flex vertical gap="large" align="start" class="max-w-2xl">
      <Typography as="h1" variant="title">Thiết kế bộ quà cho bé</Typography>
      <Typography variant="body">
        Chọn sản phẩm, thêm tên hoặc logo vào vùng thêu và xem cả bộ trước khi đặt.
      </Typography>
      <Button size="large" @click="router.push('/thiet-ke')">Bắt đầu thiết kế</Button>
    </Flex>
  </Container>
</template>
