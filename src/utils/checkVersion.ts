import packageJson from '@/../package.json'
import CacheKey from '@/constants/cache-key'

export function checkVersion() {
  const storageKey = `${CacheKey.STORAGE_PREFIX}-version`
  const currentVersion = packageJson.version
  const storedVersion = localStorage.getItem(storageKey)

  if (storedVersion !== currentVersion) {
    ;[
      CacheKey.TOKEN,
      `${CacheKey.STORAGE_PREFIX}-token`,
      `${CacheKey.STORAGE_PREFIX}-user`,
      `${CacheKey.STORAGE_PREFIX}-legacy-user-info`,
      `${CacheKey.STORAGE_PREFIX}-login-info`,
      CacheKey.LAYOUT,
      CacheKey.PREFERENCES,
    ].forEach((key) => {
      localStorage.removeItem(key)
      sessionStorage.removeItem(key)
    })

    localStorage.setItem(storageKey, currentVersion)
    window.location.reload()
  }
}
