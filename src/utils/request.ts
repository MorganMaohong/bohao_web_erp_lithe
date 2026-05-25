import axios, { type AxiosRequestConfig, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { createDiscreteApi } from 'naive-ui'

import { requestEventBus } from '@/event-bus'
import { getToken } from '@/utils/cache/cookies'

const { message } = createDiscreteApi(['message'])

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_BASE_API || '/api',
  timeout: 50_000,
  headers: {
    'Content-Type': 'application/json;charset=utf-8',
  },
})

axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    config.headers['x-client-system'] = 'erplite'
    const accessToken = getToken()
    if (accessToken) {
      config.headers['x-token'] = accessToken
      config.headers.satoken = accessToken
    }
    requestEventBus.emit({ type: 'request' })
    return config
  },
  (error) => {
    requestEventBus.emit({ type: 'requestError', error })
    return Promise.reject(error)
  },
)

axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    requestEventBus.emit({ type: 'response', data: response.data })

    if (response.config.responseType === 'blob') {
      return response
    }

    if (response.data && response.data.code !== undefined) {
      const { code, msg } = response.data

      if (code === 0) {
        if (msg) message.success(msg)
        return response.data
      }

      if (code === 501) {
        requestEventBus.emit({ type: 'unauthorized', code })
        return Promise.reject(new Error(msg || 'Unauthorized'))
      }

      if (code === 502 || code === -1) {
        if (msg) message.error(msg)
        return response.data
      }

      message.error(msg || '系统出错')
      return Promise.reject(new Error(msg || 'Error'))
    }

    return response.data
  },
  (error) => {
    const code = error.response?.data?.code
    requestEventBus.emit({ type: 'responseError', error, code })
    if (code === 501) {
      requestEventBus.emit({ type: 'unauthorized', code })
    } else {
      message.error(error.response?.data?.msg || '服务器异常，请稍后再试')
    }
    return Promise.reject(error)
  },
)

export async function request<T = unknown>(config: AxiosRequestConfig) {
  const response = await axiosInstance.request<ResponseBody<T>>(config)
  return response as unknown as ResponseBody<T>
}

export { axiosInstance }

export default request
