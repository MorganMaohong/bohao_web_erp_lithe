import request from '@/utils/request'

export interface TemplateSupplierOption {
  label: string
  value: string
  disabled?: boolean
}

export interface TemplateSupplier {
  id?: number | null
  uid?: string | null
  code?: string
  name?: string
  taxNo?: string
  bankName?: string
  bankAccountName?: string
  bankAccountNo?: string
  contactName?: string
  contactPhone?: string
  remark?: string
  category?: string
  level?: string
  settlement?: string
  settlementMethod?: string
  address?: string
  area?: string
  creditLimit?: number | null
  startTime?: number | null
  endTime?: number | null
  categoryName?: string
  levelName?: string
  settlementName?: string
  startTimeName?: string
  endTimeName?: string
  createTime?: string
  updateTime?: string
}

export interface TemplateSupplierForm extends TemplateSupplier {
  categoryOptions?: TemplateSupplierOption[]
  levelOptions?: TemplateSupplierOption[]
  settlementOptions?: TemplateSupplierOption[]
}

export interface TemplateSupplierQuery {
  currentPage: number
  pageSize: number
  name?: string
}

export interface TemplateSupplierPageData {
  currentPage?: number
  pageSize?: number
  count?: number
  list?: TemplateSupplier[]
}

export async function getTemplateSuppliers(query: TemplateSupplierQuery) {
  const res = await request<TemplateSupplierPageData>({
    url: '/template/supplier/select',
    method: 'post',
    data: query,
  })

  return res.data
}

export async function getTemplateSupplierForm(uid?: string) {
  const res = await request<TemplateSupplierForm>({
    url: uid ? `/template/supplier/form/${uid}` : '/template/supplier/form',
    method: 'post',
  })

  return res.data
}

export async function saveTemplateSupplier(data: TemplateSupplierForm) {
  const res = await request<void>({
    url: data.uid ? '/template/supplier/update' : '/template/supplier/add',
    method: 'post',
    data,
  })

  return res.data
}

export async function deleteTemplateSupplier(uid: string) {
  const res = await request<void>({
    url: `/template/supplier/delete/${uid}`,
    method: 'post',
  })

  return res.data
}
