<script setup lang="ts">
/*
 * Development-only test harness: the real designer page with generated backgrounds (wide, tall,
 * square and one that fails to load). The images are created at runtime; nothing here is part of
 * the catalog or of the production bundle.
 */
import DesignerPage from '../pages/DesignerPage.vue'
import type { Background } from '../features/designer/types'

function generated(width: number, height: number, color: string, label: string): string {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')!
  context.fillStyle = color
  context.fillRect(0, 0, width, height)
  context.fillStyle = 'rgba(0,0,0,0.35)'
  context.font = `${Math.round(Math.min(width, height) / 10)}px sans-serif`
  context.fillText(label, 24, Math.round(Math.min(width, height) / 8))
  return canvas.toDataURL('image/png')
}

const backgrounds: Background[] = [
  {
    id: 'h-wide',
    name: 'Nền ngang',
    image: { src: generated(1200, 600, '#cfe3d4', '1200×600') },
    provisional: true,
  },
  {
    id: 'h-tall',
    name: 'Nền dọc',
    image: { src: generated(600, 1200, '#f3d7cf', '600×1200') },
    provisional: true,
  },
  {
    id: 'h-square',
    name: 'Nền vuông',
    image: { src: generated(900, 900, '#d7d3f3', '900×900') },
    provisional: true,
  },
  {
    id: 'h-broken',
    name: 'Nền lỗi',
    image: { src: '/__harness__/missing-background.png' },
    provisional: true,
  },
]
</script>

<template>
  <DesignerPage :backgrounds="backgrounds" default-background-id="h-wide" />
</template>
