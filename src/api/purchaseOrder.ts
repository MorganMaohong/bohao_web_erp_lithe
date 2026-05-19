import request from '@/utils/request'

export interface PurchaseOrderOption {
  label: string
  value: string
  disabled?: boolean
}

export interface PurchaseOrderInboundRow {
  id?: number | null
  uid?: string | null
  code?: string
  type?: string
  otherType?: string
  time?: number | null
  timeName?: string
  warehouseUid?: string
  warehouseName?: string
  remark?: string
  status?: string
  statusName?: string
  purchaseOrderUid?: string
  totalQuantity?: number | null
}

export interface PurchaseOrderDetailRow {
  id?: number | null
  uid?: string | null
  code?: string
  itemUid?: string | null
  quantity?: number | null
  applyQuantity?: number | null
  orderUid?: string | null
  name?: string
  image?: string
  spec?: string
  material?: string
  unitName?: string
  typeName?: string
  supplierUid?: string | null
  supplierName?: string
  vatTaxRate?: number | null
  purchasePriceWithTax?: number | null
  purchasePriceWithoutTax?: number | null
  inboundQuantity?: number | null
  returnQuantity?: number | null
  availableInboundQuantity?: number | null
  availableReturnQuantity?: number | null
  priceCompareReason?: string
  remark?: string
}

export interface PurchaseOrderRow {
  id?: number | null
  uid?: string | null
  code?: string
  supplierUid?: string | null
  supplierName?: string
  orderType?: string
  orderTypeName?: string
  status?: string
  statusName?: string
  totalAmount?: number | null
  totalAmountWithoutTax?: number | null
  applyOrderUid?: string | null
  applyOrderCode?: string
  sourceOrderUid?: string | null
  sourceOrderCode?: string
  remark?: string
  expectTime?: number | null
  expectTimeName?: string
  flowInstanceUid?: string | null
  currentNodeUid?: string | null
  currentNodeName?: string
  createTime?: string
  updateTime?: string
}

export interface PurchaseOrderForm extends PurchaseOrderRow {
  detailList?: PurchaseOrderDetailRow[]
}

export interface PurchaseOrderDetail extends PurchaseOrderRow {
  applyOrderStatus?: string
  applyOrderStatusName?: string
  applyRemark?: string
  totalInboundQuantity?: number | null
  totalReturnQuantity?: number | null
  availableInboundQuantity?: number | null
  availableReturnQuantity?: number | null
  canInbound?: boolean
  canReturn?: boolean
  flowSchema?: Record<string, any>
  inboundOrderList?: PurchaseOrderInboundRow[]
  detailList?: PurchaseOrderDetailRow[]
}

export interface PurchaseOrderQuery {
  currentPage: number
  pageSize: number
  key?: string
  status?: string
  orderType?: string
  scene?: string
}

export interface PurchaseOrderQueryData {
  statusOptions?: PurchaseOrderOption[]
  supplierOptions?: PurchaseOrderOption[]
  orderTypeOptions?: PurchaseOrderOption[]
}

export interface PurchaseOrderPageData {
  currentPage?: number
  pageSize?: number
  count?: number
  list?: PurchaseOrderRow[]
  extraData?: PurchaseOrderQueryData
}

export async function getPurchaseOrders(query: PurchaseOrderQuery) {
  const res = await request<PurchaseOrderPageData>({
    url: '/purchase/order/select',
    method: 'post',
    data: query,
  })

  return res.data
}

export async function getPurchaseOrderForm(uid: string) {
  const res = await request<PurchaseOrderForm>({
    url: `/purchase/order/form/${uid}`,
    method: 'post',
  })

  return res.data
}

export async function confirmPurchaseOrder(data: PurchaseOrderForm) {
  const res = await request<void>({
    url: '/purchase/order/confirm',
    method: 'post',
    data,
  })

  return res.data
}

export async function getPurchaseOrderDetail(uid: string) {
  const res = await request<PurchaseOrderDetail>({
    url: `/purchase/order/detail/${uid}`,
    method: 'post',
  })

  return res.data
}
