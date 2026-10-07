import { createApp } from 'vue'
import App from './App.vue'
import { createAppRouter } from './router'
import './styles/main.css'

async function bootstrap() {
  // Development-only UI playground: open /?playground while running `yarn dev`.
  // import.meta.env.DEV is statically false in production builds, so this branch and the
  // playground chunk are removed from the bundle.
  if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('playground')) {
    const { default: UiPlayground } = await import('./dev/UiPlayground.vue')
    createApp(UiPlayground).mount('#app')
    return
  }

  // Development-only harness with generated backgrounds of several aspect ratios (one of them
  // fails to load): open /?harness=backgrounds. Not part of the production bundle either.
  if (
    import.meta.env.DEV &&
    new URLSearchParams(window.location.search).get('harness') === 'backgrounds'
  ) {
    const { default: BackgroundHarness } = await import('./dev/BackgroundHarness.vue')
    createApp(BackgroundHarness).mount('#app')
    return
  }

  createApp(App).use(createAppRouter()).mount('#app')
}

void bootstrap()
