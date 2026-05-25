import { useEventBus } from '@vueuse/core'

import { useDiscreteApi } from '@/composables'
import router from '@/router'
import { useUserStore } from '@/stores'

import type { AxiosError } from 'axios'

export type RequestEventPayload =
  | { type: 'request' }
  | { type: 'requestError'; error: AxiosError<unknown, unknown> }
  | { type: 'response'; data: ResponseBody<unknown> }
  | { type: 'responseError'; error: AxiosError<ResponseBody<unknown>, unknown>; code?: number }
  | { type: 'unauthorized'; code?: number }

export const requestEventBus = useEventBus<RequestEventPayload>('request')

export function useRequestEventBus() {
  const { message: messageApi } = useDiscreteApi()
  const { cleanup } = useUserStore()
  let handlingUnauthorized = false

  requestEventBus.on(async (event) => {
    const currentPath = router.currentRoute.value.path
    switch (event.type) {
      case 'request':
        break

      case 'requestError':
        messageApi.error(`requestError: ${event.error.message}`)
        break

      case 'response':
        if (event.data.code === 201) {
          messageApi.success(event.data.message || event.data.msg || '操作成功')
        }

        break

      case 'responseError':
        if (event.code === 401 || event.code === 501) {
          if (handlingUnauthorized) break
          handlingUnauthorized = true
          messageApi.error('登录失效，请重新登录')
          await cleanup(currentPath)
          window.setTimeout(() => {
            handlingUnauthorized = false
          }, 1000)
        } else {
          messageApi.error(`${event.error.response?.data?.message || event.error.message}`)
        }

        break

      case 'unauthorized':
        if (handlingUnauthorized) break
        handlingUnauthorized = true
        messageApi.error('登录失效，请重新登录')
        if (currentPath !== '/sign-in') {
          await cleanup(router.currentRoute.value.fullPath)
        } else {
          await cleanup(undefined, false)
        }
        window.setTimeout(() => {
          handlingUnauthorized = false
        }, 1000)

        break

      default:
        break
    }
  })
}
