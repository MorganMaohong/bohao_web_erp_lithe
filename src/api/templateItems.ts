import request from '@/utils/request'

export interface TemplateOption {
  label: string
  value: string
  disabled?: boolean
  children?: TemplateOption[]
}

export interface TemplateItem {
  id?: number | null
  uid?: string | null
  name?: string
  image?: string
  type?: string
  unit?: string
  itemBizType?: string
  spec?: string
  material?: string
  brand?: string
  supplierUid?: string
  remark?: string
  vatTaxRate?: number | null
  taxAmount?: number | null
  purchasePriceWithTax?: number | null
  purchasePriceWithoutTax?: number | null
  salePriceWithTax?: number | null
  salePriceWithoutTax?: number | null
  typeName?: string
  unitName?: string
  supplierName?: string
  itemBizTypeName?: string
  createTime?: string
  updateTime?: string
}

export interface TemplateItemForm extends TemplateItem {
  typeOptions?: TemplateOption[]
  unitOptions?: TemplateOption[]
  supplierOptions?: TemplateOption[]
  itemBizTypeOptions?: TemplateOption[]
}

export interface TemplateItemQuery {
  currentPage: number
  pageSize: number
  key?: string
  type?: string
  unit?: string
  warehouseUid?: string
  itemBizType?: string
}

export interface TemplateItemPageData {
  currentPage?: number
  pageSize?: number
  count?: number
  list?: TemplateItem[]
}

export async function getTemplateItems(query: TemplateItemQuery) {
  const res = await request<TemplateItemPageData>({
    url: '/template/items/select',
    method: 'post',
    data: query,
  })

  return res.data
}

export async function getTemplateItemForm(uid?: string) {
  const res = await request<TemplateItemForm>({
    url: uid ? `/template/items/form/${uid}` : '/template/items/form',
    method: 'post',
  })

  return res.data
}

export async function saveTemplateItem(data: TemplateItemForm) {
  const res = await request<void>({
    url: data.uid ? '/template/items/update' : '/template/items/add',
    method: 'post',
    data,
  })

  return res.data
}

export async function deleteTemplateItem(uid: string) {
  const res = await request<void>({
    url: `/template/items/delete/${uid}`,
    method: 'post',
  })

  return res.data
}
