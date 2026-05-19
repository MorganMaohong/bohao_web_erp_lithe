import request from '@/utils/request'

export interface InventoryTransferOption {
  label: string
  value: string
  disabled?: boolean
  children?: InventoryTransferOption[]
}

export interface InventoryTransferWarehouse {
  uid?: string | null
  code?: string
  name?: string
}

export interface InventoryTransferItemDetail {
  id?: number | null
  uid?: string | null
  orderUid?: string | null
  transferOrderUid?: string | null
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
  vatTaxRate?: number | null
  purchasePriceWithTax?: number | null
  purchasePriceWithoutTax?: number | null
  totalQuantity?: number | null
  availableQuantity?: number | null
  remark?: string
  batchNo?: string
}

export interface InventoryTransferQuery {
  currentPage: number
  pageSize: number
  name?: string
}

export interface InventoryTransferQueryData {}

export interface InventoryTransferRow {
  id?: number | null
  uid?: string | null
  code?: string
  type?: string
  typeName?: string
  applyTime?: number | string
  applyTimeName?: string
  expectTime?: number | string | null
  expectTimeName?: string
  outWarehouseUid?: string | null
  outWarehouseName?: string
  inWarehouseUid?: string | null
  inWarehouseName?: string
  projectUid?: string | null
  projectName?: string
  receiveUserName?: string
  receiveTime?: number | string | null
  receiveTimeName?: string
  receiveRemark?: string
  remark?: string
  outOrderUid?: string | null
  inOrderUid?: string | null
  status?: string
  statusName?: string
  createTime?: string
  updateTime?: string
}

export interface InventoryTransferPageData {
  currentPage?: number
  pageSize?: number
  count?: number
  list?: InventoryTransferRow[]
  extraData?: InventoryTransferQueryData
}

export interface InventoryTransferForm extends InventoryTransferRow {
  typeOptions?: InventoryTransferOption[]
  projectOptions?: InventoryTransferOption[]
  inWarehouse?: InventoryTransferWarehouse
  outWarehouse?: InventoryTransferWarehouse
  imageList?: string[]
  detailList?: InventoryTransferItemDetail[]
}

export interface InventoryTransferDetail extends InventoryTransferForm {
  totalQuantity?: number | null
  totalPurchasePriceWithTax?: number | null
  totalAmountWithTax?: number | null
  totalAmountWithoutTax?: number | null
  totalTaxAmount?: number | null
}

export async function getInventoryTransfers(query: InventoryTransferQuery) {
  const res = await request<InventoryTransferPageData>({
    url: '/inventory/transfer/select',
    method: 'post',
    data: query,
  })

  return res.data
}

export async function getInventoryTransferForm(uid?: string) {
  const res = await request<InventoryTransferForm>({
    url: uid ? `/inventory/transfer/form/${uid}` : '/inventory/transfer/form',
    method: 'post',
  })

  return res.data
}

export async function saveInventoryTransfer(data: InventoryTransferForm) {
  const res = await request<void>({
    url: data.uid ? '/inventory/transfer/update' : '/inventory/transfer/add',
    method: 'post',
    data,
  })

  return res.data
}

export async function completeInventoryTransfer(data: InventoryTransferForm) {
  const res = await request<void>({
    url: '/inventory/transfer/complete',
    method: 'post',
    data,
  })

  return res.data
}

export async function getInventoryTransferDetail(uid: string) {
  const res = await request<InventoryTransferDetail>({
    url: `/inventory/transfer/detail/${uid}`,
    method: 'post',
  })

  return res.data
}

export async function cancelInventoryTransfer(uid: string) {
  const res = await request<void>({
    url: `/inventory/transfer/cancel/${uid}`,
    method: 'post',
  })

  return res.data
}

export async function deleteInventoryTransfer(uid: string) {
  const res = await request<void>({
    url: `/inventory/transfer/delete/${uid}`,
    method: 'post',
  })

  return res.data
}

export async function deleteInventoryTransferDetail(uid: string) {
  const res = await request<void>({
    url: `/inventory/transfer/deleteDetail/${uid}`,
    method: 'post',
  })

  return res.data
}
