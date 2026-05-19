import request from '@/utils/request'

export interface InventoryInboundOption {
  label: string
  value: string
  disabled?: boolean
  children?: InventoryInboundOption[]
}

export interface InventoryInboundWarehouse {
  uid?: string | null
  code?: string
  name?: string
}

export interface InventoryInboundItemDetail {
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
  returnedQuantity?: number | null
  purchasePriceWithTax?: number | null
  purchasePriceWithoutTax?: number | null
  totalQuantity?: number | null
  availableQuantity?: number | null
  remark?: string
  batchNo?: string
}

export interface InventoryInboundQuery {
  currentPage: number
  pageSize: number
  key?: string
  type?: string | null
  warehouseUid?: string | null
  status?: string | null
}

export interface InventoryInboundQueryData {
  typeOptions?: InventoryInboundOption[]
  statusOptions?: InventoryInboundOption[]
  warehouseOptions?: InventoryInboundOption[]
}

export interface InventoryInboundRow {
  id?: number | null
  uid?: string | null
  code?: string
  type?: string
  otherType?: string
  typeName?: string
  time?: number | string
  timeName?: string
  warehouseUid?: string
  warehouseName?: string
  projectUid?: string
  projectName?: string
  customerName?: string
  sourcePartyName?: string
  handlerName?: string
  remark?: string
  status?: string
  statusName?: string
  purchaseOrderUid?: string | null
  purchaseOrderCode?: string
  createTime?: string
  updateTime?: string
}

export interface InventoryInboundPageData {
  currentPage?: number
  pageSize?: number
  count?: number
  list?: InventoryInboundRow[]
  extraData?: InventoryInboundQueryData
}

export interface InventoryInboundForm extends InventoryInboundRow {
  typeOptions?: InventoryInboundOption[]
  projectOptions?: InventoryInboundOption[]
  warehouse?: InventoryInboundWarehouse
  imageList?: string[]
  detailList?: InventoryInboundItemDetail[]
}

export interface InventoryInboundDetail extends InventoryInboundForm {
  warehouseName?: string
  totalAmountWithTax?: number | null
  totalPurchasePriceWithTax?: number | null
  totalTaxAmount?: number | null
  totalQuantity?: number | null
}

export async function getInventoryInbounds(query: InventoryInboundQuery) {
  const res = await request<InventoryInboundPageData>({
    url: '/inventory/inbound/select',
    method: 'post',
    data: query,
  })

  return res.data
}

export async function getInventoryInboundForm(uid?: string) {
  const res = await request<InventoryInboundForm>({
    url: uid ? `/inventory/inbound/form/${uid}` : '/inventory/inbound/form',
    method: 'post',
  })

  return res.data
}

export async function saveInventoryInbound(data: InventoryInboundForm) {
  const res = await request<void>({
    url: data.uid ? '/inventory/inbound/update' : '/inventory/inbound/add',
    method: 'post',
    data,
  })

  return res.data
}

export async function completeInventoryInbound(data: InventoryInboundForm) {
  const res = await request<void>({
    url: '/inventory/inbound/complete',
    method: 'post',
    data,
  })

  return res.data
}

export async function getInventoryInboundDetail(uid: string) {
  const res = await request<InventoryInboundDetail>({
    url: `/inventory/inbound/detail/${uid}`,
    method: 'post',
  })

  return res.data
}

export async function cancelInventoryInbound(uid: string) {
  const res = await request<void>({
    url: `/inventory/inbound/cancel/${uid}`,
    method: 'post',
  })

  return res.data
}

export async function deleteInventoryInbound(uid: string) {
  const res = await request<void>({
    url: `/inventory/inbound/delete/${uid}`,
    method: 'post',
  })

  return res.data
}

export async function deleteInventoryInboundDetail(uid: string) {
  const res = await request<void>({
    url: `/inventory/inbound/deleteDetail/${uid}`,
    method: 'post',
  })

  return res.data
}
