import request from '@/utils/request'

export interface TemplateWarehouse {
  id?: number | null
  uid?: string | null
  code?: string
  name?: string
  image?: string
  address?: string
  area?: string
  remark?: string
  createTime?: string
  updateTime?: string
}

export interface TemplateWarehouseForm extends TemplateWarehouse {}

export interface TemplateWarehouseQuery {
  currentPage: number
  pageSize: number
  key?: string
}

export interface TemplateWarehousePageData {
  currentPage?: number
  pageSize?: number
  count?: number
  list?: TemplateWarehouse[]
}

export async function getTemplateWarehouses(query: TemplateWarehouseQuery) {
  const res = await request<TemplateWarehousePageData>({
    url: '/template/warehouse/select',
    method: 'post',
    data: query,
  })

  return res.data
}

export async function getTemplateWarehouseForm(uid?: string) {
  const res = await request<TemplateWarehouseForm>({
    url: uid ? `/template/warehouse/form/${uid}` : '/template/warehouse/form',
    method: 'post',
  })

  return res.data
}

export async function saveTemplateWarehouse(data: TemplateWarehouseForm) {
  const res = await request<void>({
    url: data.uid ? '/template/warehouse/update' : '/template/warehouse/add',
    method: 'post',
    data,
  })

  return res.data
}

export async function deleteTemplateWarehouse(uid: string) {
  const res = await request<void>({
    url: `/template/warehouse/delete/${uid}`,
    method: 'post',
  })

  return res.data
}
