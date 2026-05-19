import { isEmpty } from 'es-toolkit/compat'

import { routerEventBus } from '@/event-bus'
import { useUserStore } from '@/stores'

import type { Router, RouteRecordRaw } from 'vue-router'

const Layout = () => import('@/layout/index.vue')
const DashboardView = () => import('@/views/dashboard/index.vue')

const dashboardRoute: RouteRecordRaw = {
  path: 'dashboard',
  name: 'DashboardHome',
  component: DashboardView,
  meta: {
    title: '首页',
    icon: 'ph:squares-four',
  },
}

function createLayoutRoute(userRoutes: RouteRecordRaw[], homePath: string) {
  const redirectPath = homePath && homePath !== '/' ? homePath : '/dashboard'

  return {
    path: '/',
    name: 'layout',
    component: Layout,
    redirect: redirectPath,
    children: [
      dashboardRoute,
      ...userRoutes.filter((route) => route.path !== '/dashboard' && route.path !== 'dashboard'),
    ],
  } satisfies RouteRecordRaw
}

function routeSignature(routes: RouteRecordRaw[]) {
  const items: string[] = []

  function walk(list: RouteRecordRaw[], prefix = '') {
    list.forEach((route) => {
      const path = `${prefix}/${String(route.path || '')}`.replace(/\/+/g, '/')
      const componentName =
        route.components
          ? Object.keys(route.components).join(',')
          : typeof route.component === 'function'
            ? 'async'
            : String(route.component || '')

      items.push(`${String(route.name || '')}|${path}|${componentName}`)

      if (Array.isArray(route.children)) {
        walk(route.children, path)
      }
    })
  }

  walk(routes)
  return items.join('::')
}

export function setupRouterGuard(router: Router) {
  const userStore = useUserStore()

  const { cleanup } = userStore
  let layoutRouteSignature = ''

  router.beforeEach(async (to, from) => {
    routerEventBus.emit({ type: 'beforeEach' })

    if (userStore.isCleaningUp) {
      if (to.name === 'signIn') return true
      return { name: 'signIn' }
    }

    if (to.name === 'signIn') {
      if (!userStore.token) {
        return
      } else {
        return userStore.homePath || from.fullPath || '/'
      }
    }

    if (!userStore.token) {
      return {
        name: 'signIn',
        query: {
          r: to.fullPath,
        },
      }
    }

    if (userStore.token && !userStore.hasUserProfile) {
      try {
        await userStore.fetchUserProfile()
      } catch (error) {
        console.error('Error fetching user profile:', error)
        await cleanup(to.fullPath, false)
        return {
          name: 'signIn',
          query: {
            r: to.fullPath,
          },
        }
      }
    }

    if (userStore.token) {
      try {
        if (isEmpty(userStore.userRoute)) {
          await cleanup(undefined, false)
          return {
            name: 'signIn',
          }
        }

        const nextLayoutRoute = createLayoutRoute(userStore.userRoute, userStore.homePath || '/dashboard')
        const nextSignature = routeSignature(nextLayoutRoute.children || [])

        if (!router.hasRoute('layout') || layoutRouteSignature !== nextSignature) {
          if (router.hasRoute('layout')) {
            router.removeRoute('layout')
          }

          router.addRoute(nextLayoutRoute)
          layoutRouteSignature = nextSignature

          return to.fullPath
        }
      } catch (error) {
        console.error('Error resolving user menu or adding route:', error)
        await cleanup()
        return
      }
    }
  })

  router.beforeResolve(() => {})

  router.afterEach(() => {
    routerEventBus.emit({ type: 'afterEach' })
  })
}
