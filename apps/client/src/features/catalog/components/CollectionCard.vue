<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { Gift } from '@lucide/vue'
import { Flex, Image, Link } from '@lituta/ui'
import type { PublicCollection } from '../../../api/publicCatalog'

defineProps<{ collection: PublicCollection }>()
</script>

<template>
  <Link :as="RouterLink" :to="`/bo-suu-tap/${collection.slug}`" variant="plain" class="group block">
    <div class="relative aspect-3/4 overflow-hidden rounded-xl bg-muted">
      <Image
        :src="collection.image?.url"
        alt=""
        fit="cover"
        class="absolute inset-0 size-full transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none motion-reduce:transform-none"
      >
        <template #fallback>
          <Flex
            align="center"
            justify="center"
            class="size-full bg-linear-to-br from-secondary via-background to-muted"
          >
            <Gift class="size-10 text-primary/70" aria-hidden="true" />
          </Flex>
        </template>
      </Image>
      <!-- Light label strip keeps the name readable over any image. -->
      <p
        class="absolute inset-x-0 bottom-0 bg-card/90 px-3 py-2 text-center text-sm font-semibold backdrop-blur-sm"
      >
        {{ collection.name }}
      </p>
    </div>
  </Link>
</template>
