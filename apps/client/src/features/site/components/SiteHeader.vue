<script setup lang="ts">
import { ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { Menu, ShoppingBag, X } from '@lucide/vue'
import { Button, Container, Flex, Link } from '@lituta/ui'
import { brandName, cartLink, navItems } from '../data/siteData'
import type { NavLink } from '../types'

const route = useRoute()
const menuOpen = ref(false)

// Home matches only "/", other items also match their sub-paths.
const isActive = (item: NavLink) =>
  item.to === '/'
    ? route.path === '/'
    : route.path === item.to || route.path.startsWith(`${item.to}/`)

function closeMenu(returnFocus: boolean) {
  if (!menuOpen.value) return
  menuOpen.value = false
  if (returnFocus) document.getElementById('site-menu-toggle')?.focus()
}

watch(
  () => route.fullPath,
  () => closeMenu(false),
)
</script>

<template>
  <header class="border-b bg-card" @keydown.esc="closeMenu(true)">
    <Container>
      <Flex align="center" gap="middle" class="h-16">
        <Link
          :as="RouterLink"
          to="/"
          variant="plain"
          class="text-xl font-semibold tracking-tight text-primary"
        >
          {{ brandName }}
        </Link>

        <nav aria-label="Điều hướng chính" class="ms-4 hidden flex-1 md:block">
          <Flex as="ul" align="center" :gap="4">
            <li v-for="item in navItems" :key="item.id">
              <Link :as="RouterLink" :to="item.to" variant="nav" :active="isActive(item)">
                {{ item.label }}
              </Link>
            </li>
          </Flex>
        </nav>

        <Flex align="center" :gap="4" class="ms-auto md:ms-0">
          <Link
            :as="RouterLink"
            :to="cartLink.to"
            variant="nav"
            :active="isActive(cartLink)"
            class="size-10 p-0"
          >
            <Flex align="center" justify="center" class="size-full">
              <ShoppingBag class="size-5" aria-hidden="true" />
              <span class="sr-only">{{ cartLink.label }}</span>
            </Flex>
          </Link>

          <Button
            id="site-menu-toggle"
            class="md:hidden"
            variant="text"
            :aria-expanded="menuOpen"
            aria-controls="site-mobile-menu"
            :aria-label="menuOpen ? 'Đóng menu' : 'Mở menu'"
            @click="menuOpen = !menuOpen"
          >
            <template #icon>
              <X v-if="menuOpen" />
              <Menu v-else />
            </template>
          </Button>
        </Flex>
      </Flex>
    </Container>

    <nav
      v-if="menuOpen"
      id="site-mobile-menu"
      aria-label="Điều hướng chính"
      class="border-t md:hidden"
    >
      <Container>
        <Flex as="ul" vertical class="py-2">
          <li v-for="item in navItems" :key="item.id">
            <Link
              :as="RouterLink"
              :to="item.to"
              variant="nav"
              :active="isActive(item)"
              class="block py-3 text-base"
            >
              {{ item.label }}
            </Link>
          </li>
        </Flex>
      </Container>
    </nav>
  </header>
</template>
