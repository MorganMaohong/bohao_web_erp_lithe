import request from '@/utils/request'

export interface InventoryCheckOption {
  label: string
  value: string
  disabled?: boolean
  children?: InventoryCheckOption[]
}

export interface InventoryCheckWarehouse {
  uid?: string | null
  code?: string
  name?: string
}

export interface InventoryCheckItemDetail {
  id?: number | null
  uid?: string | null
  orderUid?: string | null
  itemUid?: string
  code?: string
  name?: string
  image?: string
  spec?: string
  material?: string
  typeName?: string
  unitName?: string
  supplierName?: string
  quantity?: number | null
  profitQuantity?: number | null
  lossQuantity?: number | null
  vatTaxRate?: number | null
  purchasePriceWithTax?: number | null
  purchasePriceWithoutTax?: number | null
  totalQuantity?: number | null
  availableQuantity?: number | null
  remark?: string
}

export interface InventoryCheckQuery {
  currentPage: number
  pageSize: number
  key?: string
}

export interface InventoryCheckQueryData {}

export interface InventoryCheckRow {
  id?: number | null
  uid?: string | null
  code?: string
  type?: string
  typeName?: string
  startTime?: number | string | null
  startTimeName?: string
  endTime?: number | string | null
  endTimeName?: string
  warehouseUid?: string | null
  warehouseName?: string
  remark?: string
  status?: string
  statusName?: string
  createTime?: string
  updateTime?: string
}

export interface InventoryCheckPageData {
  currentPage?: number
  pageSize?: number
  count?: number
  list?: InventoryCheckRow[]
  extraData?: InventoryCheckQueryData
}

export interface InventoryCheckForm extends InventoryCheckRow {
  typeOptions?: InventoryCheckOption[]
  warehouse?: InventoryCheckWarehouse
  imageList?: string[]
  detailList?: InventoryCheckItemDetail[]
}

export interface InventoryCheckDetail extends InventoryCheckForm {
  totalQuantity?: number | null
  totalProfitQuantity?: number | null
  totalLossQuantity?: number | null
}

export async function getInventoryChecks(query: InventoryCheckQuery) {
  const res = await request<InventoryCheckPageData>({
    url: '/inventory/check/select',
    method: 'post',
    data: query,
  })

  return res.data
}

export async function getInventoryCheckForm(uid?: string) {
  const res = await request<InventoryCheckForm>({
    url: uid ? `/inventory/check/form/${uid}` : '/inventory/check/form',
    method: 'post',
  })

  return res.data
}

export async function saveInventoryCheck(data: InventoryCheckForm) {
  const res = await request<void>({
    url: data.uid ? '/inventory/check/update' : '/inventory/check/add',
    method: 'post',
    data,
  })

  return res.data
}

export async function completeInventoryCheck(data: InventoryCheckForm) {
  const res = await request<void>({
    url: '/inventory/check/complete',
    method: 'post',
    data,
  })

  return res.data
}

export async function getInventoryCheckDetail(uid: string) {
  const res = await request<InventoryCheckDetail>({
    url: `/inventory/check/detail/${uid}`,
    method: 'post',
  })

  return res.data
}

export async function cancelInventoryCheck(uid: string) {
  const res = await request<void>({
    url: `/inventory/check/cancel/${uid}`,
    method: 'post',
  })

  return res.data
}

export async function deleteInventoryCheck(uid: string) {
  const res = await request<void>({
    url: `/inventory/check/delete/${uid}`,
    method: 'post',
  })

  return res.data
}

export async function deleteInventoryCheckDetail(uid: string) {
  const res = await request<void>({
    url: `/inventory/check/deleteDetail/${uid}`,
    method: 'post',
  })

  return res.data
}
