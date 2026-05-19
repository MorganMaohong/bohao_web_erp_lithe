const SYSTEM_NAME = 'bohao-web-erp-lithe'

class CacheKey {
  static readonly STORAGE_PREFIX = SYSTEM_NAME
  static readonly TOKEN = 'erplite-x-token'
  static readonly LAYOUT = `${SYSTEM_NAME}-layout`
  static readonly PREFERENCES = `${SYSTEM_NAME}-preferences`
}

export default CacheKey
