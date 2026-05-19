import request from '@/utils/request'

export interface TemplateCustomerOption {
  label: string
  value: string
  disabled?: boolean
}

export interface TemplateCustomer {
  id?: number | null
  uid?: string | null
  code?: string
  name?: string
  contactName?: string
  contactPhone?: string
  remark?: string
  category?: string
  level?: string
  settlement?: string
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
}

export interface TemplateCustomerForm extends TemplateCustomer {
  categoryOptions?: TemplateCustomerOption[]
  levelOptions?: TemplateCustomerOption[]
  settlementOptions?: TemplateCustomerOption[]
}

export interface TemplateCustomerQuery {
  currentPage: number
  pageSize: number
  name?: string
}

export interface TemplateCustomerPageData {
  currentPage?: number
  pageSize?: number
  count?: number
  list?: TemplateCustomer[]
}

export async function getTemplateCustomers(query: TemplateCustomerQuery) {
  const res = await request<TemplateCustomerPageData>({
    url: '/template/customer/select',
    method: 'post',
    data: query,
  })

  return res.data
}

export async function getTemplateCustomerForm(uid?: string) {
  const res = await request<TemplateCustomerForm>({
    url: uid ? `/template/customer/form/${uid}` : '/template/customer/form',
    method: 'post',
  })

  return res.data
}

export async function saveTemplateCustomer(data: TemplateCustomerForm) {
  const res = await request<void>({
    url: data.uid ? '/template/customer/update' : '/template/customer/add',
    method: 'post',
    data,
  })

  return res.data
}

export async function deleteTemplateCustomer(uid: string) {
  const res = await request<void>({
    url: `/template/customer/delete/${uid}`,
    method: 'post',
  })

  return res.data
}
