import type { Directive } from 'vue'

import { useUserStore } from '@/stores'

export const permissionDirective: Directive<HTMLElement, string> = {
  mounted(el, binding) {
    const { legacyUserInfo } = useUserStore()
    const permissions = legacyUserInfo.permissionList || []
    const value = binding.value

    if (value && Array.isArray(permissions)) {
      if (!permissions.includes(value)) {
        el.parentNode?.removeChild(el)
      }
      return
    }

    console.warn('v-permission 需要传入权限码')
  },
}

export function isPermission(value: string) {
  const { legacyUserInfo } = useUserStore()
  const permissions = legacyUserInfo.permissionList || []

  if (value && Array.isArray(permissions)) {
    return permissions.includes(value)
  }

  console.warn('isPermission 需要传入权限码')
  return false
}

export function hasPermission(permission: string, fn?: () => void) {
  const ok = isPermission(permission)

  if (ok && typeof fn === 'function') {
    fn()
  }

  return ok
}
