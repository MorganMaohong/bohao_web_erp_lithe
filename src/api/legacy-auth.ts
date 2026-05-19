import request from '@/utils/request'

export interface LegacyLoginData {
  username: string
  password: string
  dPassword: string
  captcha: string
  check?: boolean
  isEncrypted: boolean
}

export interface LegacyLoginInfo {
  accessToken: string
  wxMpAuthUrl?: string
  sysHomePageRouter?: string
  erpHomePageRouter?: string
}

export interface LegacyMenu {
  uid?: string
  title?: string
  name?: string
  redirect?: string
  icon?: string
  version?: string
  type?: 'catalog' | 'page' | 'button' | 'link'
  sort?: number
  link?: string
  path?: string
  component?: string
  parentUid?: string
  visible?: boolean
  multiLevel?: boolean
  linkType?: boolean
  systemType?: string
}

export interface LegacyUserInfo {
  uid?: string
  username?: string
  name?: string
  headImage?: string
  deptLabel?: string
  postLabel?: string
  jobName?: string
  roleList?: string[]
  permissionList?: string[]
  menuList?: LegacyMenu[]
}

const LEGACY_AUTH_API = {
  login: '/login',
  logout: '/logout',
  userInfo: '/user/userInfo/web/erp',
}

export async function signInLegacy(data: LegacyLoginData) {
  const response = await request<LegacyLoginInfo>({
    url: LEGACY_AUTH_API.login,
    method: 'POST',
    data,
  })

  return response.data
}

export async function signOutLegacy() {
  await request({
    url: LEGACY_AUTH_API.logout,
    method: 'POST',
  })
}

export async function fetchLegacyUserInfo() {
  const response = await request<LegacyUserInfo>({
    url: LEGACY_AUTH_API.userInfo,
    method: 'POST',
  })

  return response.data
}
