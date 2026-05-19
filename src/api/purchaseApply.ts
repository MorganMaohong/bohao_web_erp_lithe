import request from '@/utils/request'

export interface PurchaseApplyOption {
  label: string
  value: string
  disabled?: boolean
  children?: PurchaseApplyOption[]
}

export interface PurchaseApplyItemDetail {
  id?: number | null
  uid?: string | null
  code?: string
  itemUid?: string
  quantity?: number | null
  orderUid?: string | null
  name?: string
  image?: string
  type?: string
  typeName?: string
  unit?: string
  unitName?: string
  spec?: string
  material?: string
  supplierUid?: string | null
  supplierName?: string
  vatTaxRate?: number | null
  purchasePriceWithTax?: number | null
  purchasePriceWithoutTax?: number | null
  totalQuantity?: number | null
  availableQuantity?: number | null
  remark?: string
}

export interface PurchaseApplyForm {
  id?: number | null
  uid?: string | null
  code?: string
  address?: string
  applyTime?: number | null
  expectTime?: number | null
  sourceType?: string | null
  warehouseUid?: string | null
  remark?: string
  flowInstanceUid?: string | null
  status?: string | null
  currentNodeUid?: string | null
  sourceTypeOptions?: PurchaseApplyOption[]
  detailList?: PurchaseApplyItemDetail[]
  warehouseOptions?: PurchaseApplyOption[]
  supplierOptions?: PurchaseApplyOption[]
}

export interface PurchaseApplyRow extends PurchaseApplyForm {
  statusName?: string
  currentNodeName?: string
  sourceTypeName?: string
  expectTimeName?: string
  applyTimeName?: string
  createTime?: string
  updateTime?: string
}

export interface PurchaseApplyDetail extends PurchaseApplyRow {
  allowEditPrice?: boolean
  canEditPrice?: boolean
  canCreatePurchaseOrder?: boolean
  purchaseOrderCount?: number
  flowSchema?: Record<string, any>
}

export interface PurchaseApplyQuery {
  currentPage: number
  pageSize: number
  name?: string
}

export interface PurchaseApplyQueryData {}

export interface PurchaseApplyPageData {
  currentPage?: number
  pageSize?: number
  count?: number
  list?: PurchaseApplyRow[]
  extraData?: PurchaseApplyQueryData
}

export async function getPurchaseApplies(query: PurchaseApplyQuery) {
  const res = await request<PurchaseApplyPageData>({
    url: '/purchase/apply/select',
    method: 'post',
    data: query,
  })

  return res.data
}

export async function getPurchaseApplyForm(uid?: string) {
  const res = await request<PurchaseApplyForm>({
    url: uid ? `/purchase/apply/form/${uid}` : '/purchase/apply/form',
    method: 'post',
  })

  return res.data
}

export async function savePurchaseApply(data: PurchaseApplyForm) {
  const res = await request<void>({
    url: data.uid ? '/purchase/apply/update' : '/purchase/apply/add',
    method: 'post',
    data,
  })

  return res.data
}

export async function deletePurchaseApply(uid: string) {
  const res = await request<void>({
    url: `/purchase/apply/delete/${uid}`,
    method: 'post',
  })

  return res.data
}

export async function getPurchaseApplyDetail(uid: string) {
  const res = await request<PurchaseApplyDetail>({
    url: `/purchase/apply/detail/${uid}`,
    method: 'post',
  })

  return res.data
}

export async function createPurchaseApplyOrder(uid: string) {
  const res = await request<{ createdCount?: number; skippedCount?: number; orderUids?: string[] }>({
    url: `/purchase/apply/order/create/${uid}`,
    method: 'post',
  })

  return res.data
}
