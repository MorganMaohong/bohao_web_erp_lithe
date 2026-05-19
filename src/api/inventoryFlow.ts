import request from '@/utils/request'

export interface InventoryFlowOption {
  label: string
  value: string
  disabled?: boolean
  children?: InventoryFlowOption[]
}

export interface InventoryFlowRow {
  id?: number | null
  uid?: string | null
  itemUid?: string
  warehouseUid?: string
  warehouseName?: string
  changeQuantity?: number | null
  beforeQuantity?: number | null
  afterQuantity?: number | null
  businessType?: string
  businessUid?: string
  businessDetailUid?: string
  itemsName?: string
  itemsType?: string
  itemsTypeName?: string
  itemsUnit?: string
  itemsUnitName?: string
  itemsImage?: string
  itemsSpec?: string
  itemsMaterial?: string
  itemsSupplierUid?: string
  itemsSupplierName?: string
  createTime?: string
  updateTime?: string
}

export interface InventoryFlowQuery {
  key?: string
  warehouseUidList?: string[]
  supplierUidList?: string[]
  types?: string[]
  units?: string[]
  currentPage: number
  pageSize: number
}

export interface InventoryFlowQueryData {
  typeOptions?: InventoryFlowOption[]
  warehouseOptions?: InventoryFlowOption[]
  supplierOptions?: InventoryFlowOption[]
  unitOptions?: InventoryFlowOption[]
}

export interface InventoryFlowPageData {
  list?: InventoryFlowRow[]
  count?: number
  currentPage?: number
  pageSize?: number
  extraData?: InventoryFlowQueryData
}

export async function getInventoryFlows(query: InventoryFlowQuery) {
  const res = await request<InventoryFlowPageData>({
    url: '/inventory/flow/select',
    method: 'post',
    data: query,
  })

  return res.data
}

export async function getInventoryFlowDetail(uid: string) {
  const res = await request<InventoryFlowRow>({
    url: `/inventory/flow/detail/${uid}`,
    method: 'post',
  })

  return res.data
}
