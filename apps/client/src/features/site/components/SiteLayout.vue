<script setup lang="ts">
import { nextTick, useTemplateRef, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Flex, Link } from '@lituta/ui'
import AnnouncementBar from './AnnouncementBar.vue'
import SiteFooter from './SiteFooter.vue'
import SiteHeader from './SiteHeader.vue'

const route = useRoute()
const main = useTemplateRef<HTMLElement>('main')

// Skip link and route changes move focus to the content (the router already scrolls to the top).
function focusMain() {
  main.value?.focus({ preventScroll: true })
}

watch(
  () => route.path,
  async () => {
    await nextTick()
    focusMain()
  },
)
</script>

<template>
  <Flex vertical class="min-h-dvh">
    <Link
      variant="plain"
      href="#main-content"
      class="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-card focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-md"
      @click.prevent="focusMain"
    >
      Bỏ qua điều hướng
    </Link>
    <AnnouncementBar />
    <SiteHeader />
    <main id="main-content" ref="main" tabindex="-1" class="flex-1 outline-none">
      <slot />
    </main>
    <SiteFooter v-if="!route.meta.hideFooter" />
  </Flex>
</template>
