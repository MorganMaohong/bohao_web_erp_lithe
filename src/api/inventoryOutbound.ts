import request from '@/utils/request'

export interface InventoryOutboundOption {
  label: string
  value: string
  disabled?: boolean
  children?: InventoryOutboundOption[]
}

export interface InventoryOutboundWarehouse {
  uid?: string | null
  code?: string
  name?: string
}

export interface InventoryOutboundItemDetail {
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
  purchaseOrderDetailUid?: string | null
  bizDetailUid?: string | null
  sourceInDetailUid?: string | null
}

export interface InventoryOutboundQuery {
  currentPage: number
  pageSize: number
  key?: string
  type?: string | null
  warehouseUid?: string | null
  status?: string | null
  purchaseReturnType?: string | null
}

export interface InventoryOutboundQueryData {
  typeOptions?: InventoryOutboundOption[]
  statusOptions?: InventoryOutboundOption[]
  warehouseOptions?: InventoryOutboundOption[]
  purchaseReturnTypeOptions?: InventoryOutboundOption[]
}

export interface InventoryOutboundRow {
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
  inOrderUid?: string | null
  purchaseReturnType?: string | null
  purchaseReturnTypeName?: string
  resendOrderUid?: string | null
  resendOrderUids?: string | null
  totalQuantity?: number | null
  resendOrderCodeList?: string[]
  createTime?: string
  updateTime?: string
}

export interface InventoryOutboundPageData {
  currentPage?: number
  pageSize?: number
  count?: number
  list?: InventoryOutboundRow[]
  extraData?: InventoryOutboundQueryData
}

export interface InventoryOutboundForm extends InventoryOutboundRow {
  typeOptions?: InventoryOutboundOption[]
  projectOptions?: InventoryOutboundOption[]
  warehouse?: InventoryOutboundWarehouse
  imageList?: string[]
  detailList?: InventoryOutboundItemDetail[]
  recordList?: PurchaseReturnRecord[]
}

export interface InventoryOutboundDetail extends InventoryOutboundForm {
  warehouseName?: string
  totalAmountWithTax?: number | null
  totalPurchasePriceWithTax?: number | null
  totalTaxAmount?: number | null
  totalQuantity?: number | null
}

export interface PurchaseReturnRecord {
  uid?: string | null
  code?: string
  purchaseReturnType?: string | null
  purchaseReturnTypeName?: string
  status?: string
  statusName?: string
  time?: number | string
  timeName?: string
  purchaseOrderCode?: string
  totalQuantity?: number | null
  remark?: string
  resendOrderCodeList?: string[]
}

export async function getInventoryOutbounds(query: InventoryOutboundQuery) {
  const res = await request<InventoryOutboundPageData>({
    url: '/inventory/outbound/select',
    method: 'post',
    data: query,
  })

  return res.data
}

export async function getInventoryOutboundForm(uid?: string) {
  const res = await request<InventoryOutboundForm>({
    url: uid ? `/inventory/outbound/form/${uid}` : '/inventory/outbound/form',
    method: 'post',
  })

  return res.data
}

export async function saveInventoryOutbound(data: InventoryOutboundForm) {
  const res = await request<void>({
    url: data.uid ? '/inventory/outbound/update' : '/inventory/outbound/add',
    method: 'post',
    data,
  })

  return res.data
}

export async function completeInventoryOutbound(data: InventoryOutboundForm) {
  const res = await request<void>({
    url: '/inventory/outbound/complete',
    method: 'post',
    data,
  })

  return res.data
}

export async function getInventoryOutboundDetail(uid: string) {
  const res = await request<InventoryOutboundDetail>({
    url: `/inventory/outbound/detail/${uid}`,
    method: 'post',
  })

  return res.data
}

export async function cancelInventoryOutbound(uid: string) {
  const res = await request<void>({
    url: `/inventory/outbound/cancel/${uid}`,
    method: 'post',
  })

  return res.data
}

export async function deleteInventoryOutbound(uid: string) {
  const res = await request<void>({
    url: `/inventory/outbound/delete/${uid}`,
    method: 'post',
  })

  return res.data
}

export async function deleteInventoryOutboundDetail(uid: string) {
  const res = await request<void>({
    url: `/inventory/outbound/deleteDetail/${uid}`,
    method: 'post',
  })

  return res.data
}
