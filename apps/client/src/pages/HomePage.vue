<script setup lang="ts">
import CommitmentsBar from '../features/home/components/CommitmentsBar.vue'
import FeaturedProducts from '../features/home/components/FeaturedProducts.vue'
import HomeBanner from '../features/home/components/HomeBanner.vue'
import ProcessSection from '../features/home/components/ProcessSection.vue'
import ReviewsSection from '../features/home/components/ReviewsSection.vue'
import SeasonalCollections from '../features/home/components/SeasonalCollections.vue'
</script>

<template>
  <h1 class="sr-only">Thiết kế bộ quà cho bé</h1>
  <HomeBanner />
  <CommitmentsBar />
  <FeaturedProducts />
  <SeasonalCollections />
  <ProcessSection />
  <ReviewsSection />
</template>
