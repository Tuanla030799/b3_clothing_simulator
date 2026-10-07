<script setup lang="ts">
import type { ImageFit, ImageLoading } from './types'
import { computed, onMounted, ref, useTemplateRef, watch } from 'vue'
import { ImageOff } from '@lucide/vue'
import { cn } from '../../lib/utils'

type ImageStatus = 'loading' | 'loaded' | 'error'

const props = withDefaults(
  defineProps<{
    src?: string
    /** Required. Use "" for purely decorative images. */
    alt: string
    width?: number
    height?: number
    fit?: ImageFit
    loading?: ImageLoading
  }>(),
  { src: undefined, width: undefined, height: undefined, fit: 'contain', loading: 'lazy' },
)

const emit = defineEmits<{
  load: [event: Event]
  error: [event: Event]
}>()

defineSlots<{
  fallback?: () => unknown
  loading?: () => unknown
}>()

const imgRef = useTemplateRef<HTMLImageElement>('img')
const hasSource = computed(() => Boolean(props.src))
const status = ref<ImageStatus>(hasSource.value ? 'loading' : 'error')

// A new source always starts from a clean loading state.
watch(
  () => props.src,
  (src) => {
    status.value = src ? 'loading' : 'error'
  },
)

/*
 * The <img> is keyed by src, so a source change mounts a fresh element. The guard below also
 * ignores events whose element no longer represents the current source.
 */
function isCurrent(event: Event) {
  const target = event.target as HTMLImageElement | null
  return Boolean(props.src) && target?.getAttribute('src') === props.src
}

function onLoad(event: Event) {
  if (!isCurrent(event)) return
  status.value = 'loaded'
  emit('load', event)
}

function onError(event: Event) {
  if (!isCurrent(event)) return
  status.value = 'error'
  emit('error', event)
}

// Images served from cache can complete before listeners observe them.
onMounted(() => {
  const img = imgRef.value
  if (img?.complete && img.naturalWidth > 0 && status.value === 'loading') {
    status.value = 'loaded'
  }
})

const fitClass = computed(() => (props.fit === 'cover' ? 'object-cover' : 'object-contain'))
</script>

<template>
  <span class="relative block overflow-hidden" :data-status="status">
    <!--
      The image stays rendered (only visually transparent) while loading so native lazy
      loading can still trigger.
    -->
    <img
      v-if="hasSource && status !== 'error'"
      ref="img"
      :key="src"
      :src="src"
      :alt="alt"
      :width="width"
      :height="height"
      :loading="loading"
      decoding="async"
      :class="cn('block size-full', fitClass, status === 'loading' && 'opacity-0')"
      @load="onLoad"
      @error="onError"
    />

    <span
      v-if="status === 'loading'"
      class="absolute inset-0 flex items-center justify-center"
      aria-hidden="true"
    >
      <slot name="loading">
        <span class="size-full animate-pulse bg-muted" />
      </slot>
    </span>

    <span
      v-if="status === 'error'"
      class="flex size-full min-h-12 items-center justify-center bg-muted text-muted-foreground"
      :role="alt ? 'img' : undefined"
      :aria-label="alt || undefined"
      :aria-hidden="alt ? undefined : 'true'"
    >
      <slot name="fallback">
        <ImageOff class="size-6" aria-hidden="true" />
      </slot>
    </span>
  </span>
</template>
