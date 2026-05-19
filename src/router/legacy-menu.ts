import type { LegacyMenu } from '@/api/legacy-auth'
import type { MenuOption } from '@/router/interface'

const FALLBACK_ICON = 'ph:squares-four'
const ROUTE_CONTAINER_COMPONENT = 'route-container/index'
const PLACEHOLDER_COMPONENT = 'migration-placeholder/index'

function normalizeIcon(icon?: string) {
  return icon || FALLBACK_ICON
}

function normalizePath(path?: string, parentPath?: string) {
  if (!path) return parentPath || '/'
  if (path.startsWith('/')) return path

  const base = parentPath ? parentPath.replace(/\/$/, '') : ''
  return `${base}/${path}`.replace(/\/+/g, '/')
}

function normalizeRedirect(redirect?: string, parentPath?: string) {
  if (!redirect) return undefined
  return normalizePath(redirect, parentPath)
}

function normalizeComponent(component?: string, hasChildren = false) {
  if (hasChildren) {
    return ROUTE_CONTAINER_COMPONENT
  }

  if (!component || component === 'Layout') {
    return PLACEHOLDER_COMPONENT
  }

  const normalized = component.replace(/^\/+/, '').replace(/\/index(?:\.vue)?$/, '')
  return normalized ? `${normalized}/index` : PLACEHOLDER_COMPONENT
}

function createRouteName(item: LegacyMenu, fallbackKey: string) {
  return item.name || item.uid || item.path || fallbackKey
}

function buildTree(menuList: LegacyMenu[]) {
  const sortedList = [...menuList].sort((a, b) => (a.sort || 0) - (b.sort || 0))
  const map = new Map<string, LegacyMenu & { children: LegacyMenu[] }>()
  const tree: Array<LegacyMenu & { children: LegacyMenu[] }> = []

  sortedList.forEach((item, index) => {
    const fallbackKey = `menu-${index + 1}`
    map.set(item.uid || createRouteName(item, fallbackKey), { ...item, children: [] })
  })

  sortedList.forEach((item, index) => {
    const fallbackKey = `menu-${index + 1}`
    const itemKey = item.uid || createRouteName(item, fallbackKey)
    const current = map.get(itemKey)
    if (!current) return

    const parent = item.parentUid ? map.get(item.parentUid) : undefined
    if (parent && parent.uid !== current.uid) {
      parent.children.push(current)
      return
    }

    tree.push(current)
  })

  return tree
}

function convertMenuNode(
  item: LegacyMenu & { children?: LegacyMenu[] },
  parentPath?: string,
): MenuOption | null {
  if (item.type === 'button') return null

  const path = normalizePath(item.path, parentPath)
  const children = item.children
    ?.map((child) => convertMenuNode(child as LegacyMenu & { children?: LegacyMenu[] }, path))
    .filter((child): child is MenuOption => Boolean(child))

  const hasChildren = Array.isArray(children) && children.length > 0
  const component = normalizeComponent(item.component, hasChildren)
  const redirect = normalizeRedirect(item.redirect, path)
  const defaultRedirect = hasChildren ? children?.[0]?.path : undefined
  const title = item.title || item.name || path

  return {
    path,
    name: createRouteName(item, path.replace(/[^\w]+/g, '-').replace(/^-|-$/g, '') || 'menu'),
    label: title,
    icon: normalizeIcon(item.icon),
    redirect: redirect || defaultRedirect,
    component,
    show: item.visible !== true,
    meta: {
      title,
      icon: normalizeIcon(item.icon),
      componentName: !hasChildren ? item.name || item.uid || path : undefined,
      keepAlive: false,
      showTab: item.visible !== true && !hasChildren,
    },
    children,
  }
}

export function adaptLegacyMenus(menuList: LegacyMenu[] = []): MenuOption[] {
  return buildTree(menuList)
    .map((item) => convertMenuNode(item))
    .filter((item): item is MenuOption => Boolean(item))
}
