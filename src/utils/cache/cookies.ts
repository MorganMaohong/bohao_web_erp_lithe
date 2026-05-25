import CacheKey from '@/constants/cache-key'

const TOKEN_QUERY_KEYS = ['accessToken', 'token', 'x-token']
const TOKEN_COOKIE_PATH = '/'
const LEGACY_TOKEN_KEYS = ['x-token', 'erp-x-token', 'erplite-x-token']

function normalizeToken(token?: string | null) {
  if (!token) return ''
  const value = token.trim()
  return value && value !== 'undefined' && value !== 'null' ? value : ''
}

function readCookieToken(key: string) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${escaped}=([^;]*)`))
  return normalizeToken(match?.[1] ? decodeURIComponent(match[1]) : '')
}

function readTokenFromUrl() {
  const searchParams = new URLSearchParams(window.location.search)
  for (const key of TOKEN_QUERY_KEYS) {
    const token = normalizeToken(searchParams.get(key))
    if (token) return token
  }

  const hashQueryIndex = window.location.hash.indexOf('?')
  if (hashQueryIndex === -1) return ''

  const hashParams = new URLSearchParams(window.location.hash.substring(hashQueryIndex + 1))
  for (const key of TOKEN_QUERY_KEYS) {
    const token = normalizeToken(hashParams.get(key))
    if (token) return token
  }

  return ''
}

function removeTokenFromUrl() {
  const url = new URL(window.location.href)
  let changed = false

  TOKEN_QUERY_KEYS.forEach((key) => {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key)
      changed = true
    }
  })

  const hashQueryIndex = url.hash.indexOf('?')
  if (hashQueryIndex !== -1) {
    const hashPath = url.hash.substring(0, hashQueryIndex)
    const hashParams = new URLSearchParams(url.hash.substring(hashQueryIndex + 1))
    TOKEN_QUERY_KEYS.forEach((key) => {
      if (hashParams.has(key)) {
        hashParams.delete(key)
        changed = true
      }
    })
    const nextHashQuery = hashParams.toString()
    url.hash = nextHashQuery ? `${hashPath}?${nextHashQuery}` : hashPath
  }

  if (changed) {
    window.history.replaceState(window.history.state, document.title, url.toString())
  }
}

function clearLegacyStorage() {
  LEGACY_TOKEN_KEYS.forEach((key) => {
    if (key === CacheKey.TOKEN) return
    document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${TOKEN_COOKIE_PATH}`
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)
  })
}

function readLegacyToken() {
  for (const key of LEGACY_TOKEN_KEYS) {
    const fromStorage =
      normalizeToken(localStorage.getItem(key)) || normalizeToken(sessionStorage.getItem(key))
    if (fromStorage) return fromStorage

    const fromCookie = readCookieToken(key)
    if (fromCookie) return fromCookie
  }
  return ''
}

export function migrateLegacyTokenStorage() {
  if (getToken()) return ''

  const legacyToken = readLegacyToken()
  if (!legacyToken) return ''

  const rememberMe = LEGACY_TOKEN_KEYS.some((key) => Boolean(localStorage.getItem(key)))
  setToken(legacyToken, rememberMe)
  return legacyToken
}

export const getToken = () => {
  return (
    normalizeToken(localStorage.getItem(CacheKey.TOKEN)) ||
    normalizeToken(sessionStorage.getItem(CacheKey.TOKEN)) ||
    ''
  )
}

export const setToken = (token: string, rememberMe = false) => {
  const value = normalizeToken(token)
  if (!value) return

  if (rememberMe) {
    localStorage.setItem(CacheKey.TOKEN, value)
    sessionStorage.removeItem(CacheKey.TOKEN)
  } else {
    sessionStorage.setItem(CacheKey.TOKEN, value)
    localStorage.removeItem(CacheKey.TOKEN)
  }

  clearLegacyStorage()
}

export const removeToken = () => {
  localStorage.removeItem(CacheKey.TOKEN)
  sessionStorage.removeItem(CacheKey.TOKEN)
  clearLegacyStorage()
}

export const bootstrapTokenFromUrl = () => {
  const token = readTokenFromUrl()
  if (!token) return ''
  setToken(token, true)
  removeTokenFromUrl()
  return token
}

/** URL SSO + 旧版 erp token 迁移，返回当前有效 token */
export function syncBootstrapSession() {
  migrateLegacyTokenStorage()
  const urlToken = bootstrapTokenFromUrl()
  return urlToken || getToken()
}
