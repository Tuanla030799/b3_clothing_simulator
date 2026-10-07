import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/b3_clothing_simulator/',
  plugins: [vue(), tailwindcss()],
})
