<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Button, Container, Flex, Typography } from '@lituta/ui'
import { publicCatalog } from '../../../api/publicCatalog'
import { useRemoteData } from '../../../api/useRemoteData'
import HomeBanner from './HomeBanner.vue'

/*
 * Top of the home page: the active banners from the API. Until they arrive a block of the same
 * height is reserved; without banners (none active, or the request failed) a short fixed
 * introduction is shown instead, so the page never starts with an error. Other sections report
 * connection problems with a retry.
 */
const router = useRouter()
const banners = useRemoteData((signal) => publicCatalog.banners(signal))
</script>

<template>
  <HomeBanner v-if="banners.data.value?.length" :banners="banners.data.value" />

  <div
    v-else-if="banners.loading.value"
    class="aspect-4/5 w-full bg-muted sm:aspect-video lg:aspect-[16/7]"
    role="status"
    aria-label="Đang tải banner"
  />

  <section v-else aria-labelledby="hero-heading" class="bg-secondary/40 py-16 lg:py-24">
    <Container>
      <Flex vertical align="start" gap="middle" class="max-w-xl">
        <Typography id="hero-heading" as="h2" variant="title">Quà sơ sinh mang tên bé</Typography>
        <Typography variant="body">
          Thêu tên hoặc logo theo ý bạn lên từng món, rồi xem trước cả bộ quà.
        </Typography>
        <Button @click="router.push('/thiet-ke')">Bắt đầu thiết kế</Button>
      </Flex>
    </Container>
  </section>
</template>
