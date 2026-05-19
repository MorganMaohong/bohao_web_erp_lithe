import request from '@/utils/request'

export interface TemplateUnitOption {
  label: string
  value: string
  disabled?: boolean
  children?: TemplateUnitOption[]
}

export interface TemplateUnit {
  id?: number | null
  uid?: string | null
  code?: string
  name?: string
  category?: string
  precisionScale?: number | null
  baseUnitUid?: string | null
  baseUnitName?: string
  convertRate?: number | null
  enabled?: boolean
  parentUid?: string | null
  sort?: number | null
  remark?: string
}

export interface TemplateUnitForm extends TemplateUnit {
  unitOptions?: TemplateUnitOption[]
}

export interface TemplateUnitQuery {
  currentPage: number
  pageSize: number
  key?: string
  category?: string
  enabled?: boolean | null
}

export interface TemplateUnitPageData {
  currentPage?: number
  pageSize?: number
  count?: number
  list?: TemplateUnit[]
}

export async function getTemplateUnits(query: TemplateUnitQuery) {
  const res = await request<TemplateUnitPageData>({
    url: '/template/unit/select',
    method: 'post',
    data: query,
  })

  return res.data
}

export async function getTemplateUnitForm(uid?: string) {
  const res = await request<TemplateUnitForm>({
    url: uid ? `/template/unit/form/${uid}` : '/template/unit/form',
    method: 'post',
  })

  return res.data
}

export async function getTemplateUnitOptions() {
  const res = await request<TemplateUnitOption[]>({
    url: '/template/unit/options',
    method: 'post',
  })

  return res.data
}

export async function saveTemplateUnit(data: TemplateUnitForm) {
  const res = await request<void>({
    url: data.uid ? '/template/unit/update' : '/template/unit/add',
    method: 'post',
    data,
  })

  return res.data
}

export async function deleteTemplateUnit(uid: string) {
  const res = await request<void>({
    url: `/template/unit/delete/${uid}`,
    method: 'post',
  })

  return res.data
}
