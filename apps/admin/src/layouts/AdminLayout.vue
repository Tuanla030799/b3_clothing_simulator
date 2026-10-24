<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { LogOut, Menu as MenuIcon } from '@lucide/vue'
import { Drawer, Menu } from 'ant-design-vue'
import type { ItemType } from 'ant-design-vue'
import { Button, Flex, Typography } from '@lituta/ui'
import { session } from '../api/client'

const route = useRoute()
const router = useRouter()
const drawerOpen = ref(false)

// Menu keys are route paths; the longest matching prefix is the selected item.
const items: ItemType[] = [
  { key: '/don-hang', label: 'Đơn hàng' },
  {
    key: 'catalog',
    label: 'Danh mục sản phẩm',
    type: 'group',
    children: [
      { key: '/san-pham', label: 'Sản phẩm' },
      { key: '/san-pham/noi-bat', label: 'Sản phẩm nổi bật' },
      { key: '/danh-muc', label: 'Danh mục' },
      { key: '/bo-suu-tap', label: 'Bộ sưu tập' },
      { key: '/banner', label: 'Banner trang chủ' },
    ],
  },
  {
    key: 'designer',
    label: 'Công cụ thiết kế',
    type: 'group',
    children: [
      { key: '/thiet-ke/nen', label: 'Nền xem cả bộ' },
      { key: '/thiet-ke/hinh-co-san', label: 'Hình có sẵn' },
      { key: '/thiet-ke/mau-sap-xep', label: 'Mẫu sắp xếp' },
      { key: '/thiet-ke/cai-dat', label: 'Giới hạn bộ quà' },
    ],
  },
]
const keys = [
  '/don-hang',
  '/san-pham',
  '/san-pham/noi-bat',
  '/danh-muc',
  '/bo-suu-tap',
  '/banner',
  '/thiet-ke/nen',
  '/thiet-ke/hinh-co-san',
  '/thiet-ke/mau-sap-xep',
  '/thiet-ke/cai-dat',
]
const selectedKeys = computed(() => {
  const match = keys
    .filter((key) => route.path === key || route.path.startsWith(`${key}/`))
    .sort((a, b) => b.length - a.length)[0]
  return match ? [match] : []
})

function navigate({ key }: { key: string | number }) {
  drawerOpen.value = false
  void router.push(String(key))
}

async function logout() {
  await session.logout()
  void router.push({ name: 'login' })
}
</script>

<template>
  <Flex class="min-h-dvh">
    <aside class="hidden w-60 shrink-0 border-e bg-card lg:block" aria-label="Điều hướng quản trị">
      <Flex vertical class="sticky top-0 h-dvh">
        <Typography as="p" variant="subheading" class="px-6 py-5 text-primary">
          Lituta Admin
        </Typography>
        <nav class="flex-1 overflow-y-auto">
          <Menu mode="inline" :items="items" :selected-keys="selectedKeys" @click="navigate" />
        </nav>
      </Flex>
    </aside>

    <Drawer
      :open="drawerOpen"
      placement="left"
      :width="260"
      title="Lituta Admin"
      @close="drawerOpen = false"
    >
      <nav aria-label="Điều hướng quản trị">
        <Menu mode="inline" :items="items" :selected-keys="selectedKeys" @click="navigate" />
      </nav>
    </Drawer>

    <Flex vertical class="min-w-0 flex-1">
      <header class="border-b bg-card">
        <Flex align="center" justify="space-between" gap="middle" class="h-14 px-4 lg:px-8">
          <Button class="lg:hidden" variant="text" aria-label="Mở menu" @click="drawerOpen = true">
            <template #icon><MenuIcon /></template>
          </Button>
          <Flex align="center" gap="small" class="ms-auto">
            <Typography as="span" variant="caption">{{ session.user.value?.name }}</Typography>
            <Button variant="default" size="small" @click="logout">
              <template #icon><LogOut /></template>
              Đăng xuất
            </Button>
          </Flex>
        </Flex>
      </header>
      <main class="min-w-0 flex-1 p-4 lg:p-8">
        <RouterView />
      </main>
    </Flex>
  </Flex>
</template>
