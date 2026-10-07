<script setup lang="ts">
import CommitmentsBar from '../features/home/components/CommitmentsBar.vue'
import FeaturedProducts from '../features/home/components/FeaturedProducts.vue'
import HomeBanner from '../features/home/components/HomeBanner.vue'
import SeasonalCollections from '../features/home/components/SeasonalCollections.vue'
// Process and reviews sections come in phase H4 of docs/homepage-plan.md.
</script>

<template>
  <h1 class="sr-only">Thiết kế bộ quà cho bé</h1>
  <HomeBanner />
  <CommitmentsBar />
  <FeaturedProducts />
  <SeasonalCollections />
</template>
