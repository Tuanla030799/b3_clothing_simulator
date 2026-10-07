<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { Swiper as SwiperInstance } from 'swiper'
import { A11y, Keyboard } from 'swiper/modules'
import { Swiper, SwiperSlide } from 'swiper/vue'
import { ChevronLeft, ChevronRight, Pause, Play } from '@lucide/vue'
import { Button, Container, Flex, Image, Typography } from '@lituta/ui'
import 'swiper/css'
import { homeImage } from '../data/assets'
import { bannerSlides } from '../data/homeData'

const AUTO_DELAY_MS = 6000

const router = useRouter()
const swiper = shallowRef<SwiperInstance | null>(null)
const activeIndex = ref(0)

/*
 * Auto-advance uses our own timer instead of Swiper's autoplay module: it is on unless the visitor
 * prefers reduced motion, restarts after every slide change (also manual ones), and is held while
 * the banner is hovered or contains focus. A visible button pauses it for good (moving content
 * must always be pausable).
 */
const reducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
const playing = ref(!reducedMotion)
const held = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined

function schedule() {
  clearTimeout(timer)
  if (!playing.value || held.value || !swiper.value) return
  timer = setTimeout(() => swiper.value?.slideNext(), AUTO_DELAY_MS)
}

watch([activeIndex, playing, held], schedule)
onMounted(schedule)
onBeforeUnmount(() => clearTimeout(timer))

function onSwiper(instance: SwiperInstance) {
  swiper.value = instance
  schedule()
}

const a11y = {
  slideLabelMessage: 'Slide {{index}} / {{slidesLength}}',
  prevSlideMessage: 'Slide trước',
  nextSlideMessage: 'Slide sau',
  containerMessage: 'Banner giới thiệu',
}
</script>

<template>
  <section
    aria-roledescription="carousel"
    aria-label="Banner giới thiệu"
    class="relative"
    @mouseenter="held = true"
    @mouseleave="held = false"
    @focusin="held = true"
    @focusout="held = false"
  >
    <Swiper
      :modules="[A11y, Keyboard]"
      :slides-per-view="1"
      :speed="500"
      :rewind="true"
      :keyboard="{ enabled: true, onlyInViewport: true }"
      :a11y="a11y"
      @swiper="onSwiper"
      @slide-change="(s: SwiperInstance) => (activeIndex = s.activeIndex)"
    >
      <SwiperSlide v-for="(slide, index) in bannerSlides" :key="slide.id">
        <!-- Slides that are not shown are inert, so their buttons are not reachable by keyboard. -->
        <div
          class="relative aspect-4/5 w-full overflow-hidden bg-muted sm:aspect-video lg:aspect-[16/7]"
          :inert="index !== activeIndex"
        >
          <Image
            :src="homeImage(slide.image)"
            alt=""
            fit="cover"
            :loading="index === 0 ? 'eager' : 'lazy'"
            class="absolute inset-0 size-full"
          >
            <template #fallback>
              <span class="size-full bg-linear-to-br from-secondary via-background to-muted" />
            </template>
          </Image>

          <Container class="absolute inset-0">
            <Flex align="end" class="h-full pb-16 sm:pb-14">
              <Flex
                as="div"
                vertical
                align="start"
                gap="middle"
                class="max-w-md rounded-xl bg-card/90 p-6 shadow-sm backdrop-blur-sm"
              >
                <Typography as="h2" variant="title">{{ slide.title }}</Typography>
                <Typography variant="body">{{ slide.description }}</Typography>
                <Button @click="router.push(slide.cta.to)">{{ slide.cta.label }}</Button>
              </Flex>
            </Flex>
          </Container>
        </div>
      </SwiperSlide>
    </Swiper>

    <!-- Controls sit outside the Swiper element and drive its instance. -->
    <!-- Side arrows only from the sm breakpoint; on phones the banner is swiped or uses the dots. -->
    <div class="pointer-events-none absolute inset-x-4 inset-y-0 z-10 hidden sm:block">
      <Flex align="center" justify="space-between" class="h-full">
        <Button
          class="pointer-events-auto"
          variant="default"
          aria-label="Slide trước"
          @click="swiper?.slidePrev()"
        >
          <template #icon><ChevronLeft /></template>
        </Button>
        <Button
          class="pointer-events-auto"
          variant="default"
          aria-label="Slide sau"
          @click="swiper?.slideNext()"
        >
          <template #icon><ChevronRight /></template>
        </Button>
      </Flex>
    </div>

    <Flex align="center" justify="center" class="absolute inset-x-0 bottom-3 z-10">
      <Flex
        align="center"
        :gap="4"
        class="rounded-full bg-card/90 px-2 py-1 shadow-sm backdrop-blur-sm"
      >
        <Button
          variant="default"
          size="small"
          :aria-label="playing ? 'Tạm dừng tự động chuyển slide' : 'Bật tự động chuyển slide'"
          @click="playing = !playing"
        >
          <template #icon>
            <Pause v-if="playing" />
            <Play v-else />
          </template>
        </Button>
        <Button
          v-for="(slide, index) in bannerSlides"
          :key="slide.id"
          variant="text"
          size="small"
          :aria-label="`Chuyển tới slide ${index + 1}`"
          :aria-current="index === activeIndex ? 'true' : undefined"
          @click="swiper?.slideTo(index)"
        >
          <template #icon>
            <span
              class="size-2.5 rounded-full"
              :class="index === activeIndex ? 'bg-primary' : 'bg-muted-foreground'"
            />
          </template>
        </Button>
      </Flex>
    </Flex>
  </section>
</template>
