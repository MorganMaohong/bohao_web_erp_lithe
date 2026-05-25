import './assets/main.css'
import 'virtual:svg-icons-register'

import { PiniaColada } from '@pinia/colada'
import { createApp } from 'vue'

import { permissionDirective } from '@/directives/permission'
import { setupEventBus } from '@/event-bus'
import { setupRouterGuard } from '@/router/guard'
import { pinia, useUserStore } from '@/stores'
import { syncBootstrapSession } from '@/utils/cache/cookies'
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

  const app = createApp(App)

  app.use(pinia)

  const bootstrapToken = syncBootstrapSession()
  if (bootstrapToken) {
    useUserStore(pinia).token = bootstrapToken
  }

  app.directive('permission', permissionDirective)
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
