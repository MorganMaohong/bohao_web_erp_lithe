import { useStorage } from '@vueuse/core'
import { acceptHMRUpdate, defineStore, storeToRefs } from 'pinia'
import { computed } from 'vue'

import {
  fetchLegacyUserInfo,
  signInLegacy,
  signOutLegacy,
  type LegacyLoginData,
  type LegacyLoginInfo,
  type LegacyUserInfo,
} from '@/api/legacy-auth'
import CacheKey from '@/constants/cache-key'
import router from '@/router'
import { resolveMenu, resolveRoute } from '@/router/helper'
import { adaptLegacyMenus } from '@/router/legacy-menu'
import { getToken, removeToken, setToken } from '@/utils/cache/cookies'

import { useTabsStore } from './tabs'
import { pinia } from '.'

import type { UserInfo } from '@/api'
import type { MenuOption } from '@/router/interface'

const userInfo: UserInfo = {
  avatar: '',
  id: 0,
  name: '',
  role: 'user',
  token: null,
  menu: [],
}

const emptyLegacyUserInfo: LegacyUserInfo = {
  headImage: '',
  menuList: [],
  name: '',
  permissionList: [],
  roleList: [],
  uid: '',
  username: '',
}

const emptyLoginInfo: LegacyLoginInfo = {
  accessToken: '',
  erpHomePageRouter: '',
  sysHomePageRouter: '',
  wxMpAuthUrl: '',
}

function normalizeLandingPath(path?: string | null) {
  const value = String(path || '').trim()
  if (!value || value === '/' || value === '/login' || value === '/sign-in') {
    return ''
  }
  return value.startsWith('/') ? value : `/${value}`
}

function pickRenderableMenu(menu: UserInfo['menu']): MenuOption[] {
  return menu.filter((item) => {
    if (!('path' in item) || !('label' in item)) return false

    const rawType = 'type' in item ? item.type : undefined
    return !rawType || rawType === 'group' || rawType === 'divider'
  }) as MenuOption[]
}

export const useUserStore = defineStore('userStore', () => {
  const token = useStorage<string | null>(`${CacheKey.STORAGE_PREFIX}-token`, getToken() || null)
  const user = useStorage<UserInfo>(`${CacheKey.STORAGE_PREFIX}-user`, userInfo)
  const legacyUserInfo = useStorage<LegacyUserInfo>(`${CacheKey.STORAGE_PREFIX}-legacy-user-info`, emptyLegacyUserInfo)
  const loginInfo = useStorage<LegacyLoginInfo>(`${CacheKey.STORAGE_PREFIX}-login-info`, emptyLoginInfo)
  const isCleaningUp = computed(() => Boolean(loginInfo.value.accessToken === '__cleaning__'))

  const tabsStore = useTabsStore()

  function syncLegacyUser(profile: LegacyUserInfo) {
    const adaptedMenu = adaptLegacyMenus(profile.menuList || [])

    legacyUserInfo.value = profile
    user.value = {
      avatar: profile.headImage || '',
      id: Number(profile.uid) || 0,
      name: profile.name || profile.username || '未命名用户',
      role: profile.roleList?.includes('admin') ? 'admin' : 'user',
      token: token.value,
      menu: adaptedMenu,
    }
  }

  if (
    token.value &&
    (legacyUserInfo.value.username || legacyUserInfo.value.uid || legacyUserInfo.value.menuList)
  ) {
    syncLegacyUser(legacyUserInfo.value)
  }

  async function fetchUserProfile() {
    if (!token.value || isCleaningUp.value) {
      throw new Error('User session is not available')
    }

    const profile = await fetchLegacyUserInfo()
    syncLegacyUser(profile)
    return profile
  }

  async function userSignIn(data: LegacyLoginData) {
    const res = await signInLegacy(data)
    const accessToken = res.accessToken?.trim()

    if (!accessToken) {
      throw new Error('未获取到有效的登录凭证')
    }

    setToken(accessToken, Boolean(data.check))
    token.value = accessToken
    loginInfo.value = {
      ...res,
      accessToken,
    }

    await fetchUserProfile()
  }

  async function userSignOut() {
    if (isCleaningUp.value) return
    try {
      await signOutLegacy()
    } finally {
      await cleanup()
    }
  }

  async function cleanup(redirectPath?: string, navigate = true) {
    if (isCleaningUp.value && !navigate) return
    loginInfo.value = {
      ...emptyLoginInfo,
      accessToken: '__cleaning__',
    }

    removeToken()
    token.value = null
    user.value = userInfo
    legacyUserInfo.value = emptyLegacyUserInfo
    tabsStore.clearTabs()
    tabsStore.setTabActivePath('')

    if (router.hasRoute('layout')) {
      router.removeRoute('layout')
    }

    if (navigate) {
      try {
        await router.replace({
          name: 'signIn',
          ...(redirectPath ? { query: { r: redirectPath } } : {}),
        })
      } finally {
        loginInfo.value = emptyLoginInfo
      }
      return
    }

    loginInfo.value = emptyLoginInfo
  }

  const effectiveMenu = computed(() => pickRenderableMenu(user.value.menu))
  const userMenu = computed(() => resolveMenu(effectiveMenu.value))
  const userRoute = computed(() => resolveRoute(effectiveMenu.value))

  const homePath = computed(() => {
    if (effectiveMenu.value.some((item) => 'path' in item && item.path === '/dashboard')) {
      return '/dashboard'
    }

    const candidates = [
      loginInfo.value.erpHomePageRouter,
      loginInfo.value.sysHomePageRouter,
      ...effectiveMenu.value.map((item) => ('path' in item ? item.path : '')),
    ]

    const resolvedPath = candidates
      .map((item) => normalizeLandingPath(item))
      .find((item) => Boolean(item))

    return resolvedPath || '/dashboard'
  })

  const hasUserProfile = computed(() => {
    return Boolean(legacyUserInfo.value.username || legacyUserInfo.value.menuList?.length)
  })

  return {
    user,
    token,
    loginInfo,
    legacyUserInfo,
    isCleaningUp,
    homePath,
    hasUserProfile,
    effectiveMenu,
    userMenu,
    userRoute,
    fetchUserProfile,
    userSignIn,
    userSignOut,
    cleanup,
  }
})

export function toRefsUserStore() {
  return {
    ...storeToRefs(useUserStore(pinia)),
  }
}

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useUserStore, import.meta.hot))
}
