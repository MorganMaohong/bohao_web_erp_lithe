import request from '@/utils/request'

export interface InventoryOverviewOption {
  label: string
  value: string
  disabled?: boolean
  children?: InventoryOverviewOption[]
}

export interface InventoryOverviewRow {
  id?: number | null
  uid?: string | null
  itemUid?: string
  warehouseUid?: string
  quantity?: number
  name?: string
  type?: string
  typeName?: string
  unit?: string
  unitName?: string
  image?: string
  spec?: string
  material?: string
  warehouseName?: string
  supplierUid?: string
  supplierName?: string
  vatTaxRate?: number
  purchasePriceWithTax?: number
  purchasePriceWithoutTax?: number
  totalQuantity?: number
  availableQuantity?: number
  createTime?: string
  updateTime?: string
}

export interface InventoryOverviewQuery {
  key?: string
  warehouseUidList?: string[]
  supplierUidList?: string[]
  types?: string[]
  units?: string[]
  currentPage: number
  pageSize: number
}

export interface InventoryOverviewQueryData {
  typeOptions?: InventoryOverviewOption[]
  warehouseOptions?: InventoryOverviewOption[]
  supplierOptions?: InventoryOverviewOption[]
  unitOptions?: InventoryOverviewOption[]
}

export interface InventoryOverviewPageData {
  list?: InventoryOverviewRow[]
  count?: number
  currentPage?: number
  pageSize?: number
  extraData?: InventoryOverviewQueryData
}

export async function getInventoryOverview(query: InventoryOverviewQuery) {
  const res = await request<InventoryOverviewPageData>({
    url: '/inventory/overview/select',
    method: 'post',
    data: query,
  })

  return res.data
}

export async function getInventoryOverviewDetail(uid: string) {
  const res = await request<InventoryOverviewRow>({
    url: `/inventory/overview/detail/${uid}`,
    method: 'post',
  })

  return res.data
}
