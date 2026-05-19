import './assets/main.css'
import 'virtual:svg-icons-register'

import { PiniaColada } from '@pinia/colada'
import { createApp } from 'vue'

import { setupEventBus } from '@/event-bus'
import { setupRouterGuard } from '@/router/guard'
import { pinia } from '@/stores'
import { bootstrapTokenFromUrl } from '@/utils/cache/cookies'
import { checkVersion } from '@/utils/checkVersion'

import App from './App.vue'
import router from './router'

function removeLoader() {
  if (window.loaderElement) {
    window.loaderElement.remove()
    window.loaderElement = null
  }
}

async function setupApp() {
  checkVersion()
  bootstrapTokenFromUrl()

  const app = createApp(App)

  app.use(pinia)
  app.use(PiniaColada, {
    queryOptions: {
      refetchOnWindowFocus: false,
    },
  })

  app.use(router)

  setupRouterGuard(router)

  setupEventBus()

  app.mount('#app')

  try {
    await router.isReady()
  } finally {
    removeLoader()
  }
}

setupApp().catch((error) => {
  console.error('App bootstrap failed:', error)
  removeLoader()
})
