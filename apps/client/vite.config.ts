import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  // Public path, with trailing slash: `/` on its own domain (Cloudflare), the repository path on
  // GitHub Pages (set by the deploy workflow).
  base: process.env.BASE_PATH || '/',
  plugins: [vue(), tailwindcss()],
  // The admin uses 5174; the API must list this origin in CORS_ORIGINS.
  server: { port: 5173, strictPort: true },
})
