<script setup lang="ts">
import CommitmentsBar from '../features/home/components/CommitmentsBar.vue'
import FeaturedProducts from '../features/home/components/FeaturedProducts.vue'
import HomeHero from '../features/home/components/HomeHero.vue'
import ProcessSection from '../features/home/components/ProcessSection.vue'
import ReviewsSection from '../features/home/components/ReviewsSection.vue'
import SeasonalCollections from '../features/home/components/SeasonalCollections.vue'
</script>

<template>
  <h1 class="sr-only">Thiết kế bộ quà cho bé</h1>
  <HomeHero />
  <CommitmentsBar />
  <FeaturedProducts />
  <SeasonalCollections />
  <ProcessSection />
  <ReviewsSection />
</template>
