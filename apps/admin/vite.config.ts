import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  // Public path, with trailing slash; `/` when served from its own subdomain.
  base: process.env.BASE_PATH || '/',
  plugins: [vue(), tailwindcss()],
  // The client uses 5173; the API must list this origin in CORS_ORIGINS.
  server: { port: 5174, strictPort: true },
  preview: { port: 4174 },
})
