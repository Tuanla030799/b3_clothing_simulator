import { createApp } from 'vue'
import App from './App.vue'
import './styles/main.css'

async function bootstrap() {
  // Development-only UI playground: open /?playground while running `npm run dev`.
  // import.meta.env.DEV is statically false in production builds, so this branch and the
  // playground chunk are removed from the bundle.
  if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('playground')) {
    const { default: UiPlayground } = await import('./dev/UiPlayground.vue')
    createApp(UiPlayground).mount('#app')
    return
  }

  createApp(App).mount('#app')
}

void bootstrap()
