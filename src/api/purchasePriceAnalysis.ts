import request from '@/utils/request'

export interface PurchasePriceCompareItem {
  orderDetailUid?: string | null
  itemUid?: string | null
  itemName?: string
  supplierUid?: string | null
  quantity?: number | null
  vatTaxRate?: number | null
  purchasePriceWithTax?: number | null
}

export interface PurchasePriceCompareQuery {
  orderUid?: string | null
  detailList?: PurchasePriceCompareItem[]
}

export interface PurchasePriceCompareRow {
  orderDetailUid?: string | null
  itemUid?: string | null
  itemName?: string
  supplierUid?: string | null
  supplierName?: string
  currentPurchasePriceWithTax?: number | null
  currentPurchasePriceWithoutTax?: number | null
  currentVatTaxRate?: number | null
  historyCount?: number | null
  sameSupplierHistoryCount?: number | null
  lastSameSupplierPriceWithTax?: number | null
  lastSameSupplierPriceWithoutTax?: number | null
  lastSameSupplierVatTaxRate?: number | null
  lastSameSupplierOrderUid?: string | null
  lastSameSupplierOrderCode?: string
  lastSameSupplierTimeName?: string
  avgSameSupplierPriceWithTax?: number | null
  avgSameSupplierPriceWithoutTax?: number | null
  minHistoryPriceWithTax?: number | null
  minHistoryPriceWithoutTax?: number | null
  avgHistoryPriceWithTax?: number | null
  avgHistoryPriceWithoutTax?: number | null
  maxHistoryPriceWithTax?: number | null
  maxHistoryPriceWithoutTax?: number | null
  minHistorySupplierUid?: string | null
  minHistorySupplierName?: string
  minHistoryOrderUid?: string | null
  minHistoryOrderCode?: string
  currentVsAvgRate?: number | null
  currentVsMinRate?: number | null
  currentVsAvgWithoutTaxRate?: number | null
  currentVsMinWithoutTaxRate?: number | null
  priceReasonRequired?: boolean
  priceReasonTip?: string
  compareBaseName?: string
  warningLevel?: 'default' | 'normal' | 'warning' | 'danger' | 'success'
  warningText?: string
}

export interface PurchasePriceHistoryQuery {
  orderUid?: string | null
  itemUid?: string | null
  supplierUid?: string | null
  currentPage?: number
  pageSize?: number
}

export interface PurchasePriceHistoryOption {
  label: string
  value: string
  disabled?: boolean
}

export interface PurchasePriceHistoryRow {
  orderUid?: string | null
  orderCode?: string
  orderStatus?: string
  orderStatusName?: string
  orderTimeName?: string
  itemUid?: string | null
  itemName?: string
  supplierUid?: string | null
  supplierName?: string
  quantity?: number | null
  vatTaxRate?: number | null
  purchasePriceWithTax?: number | null
  purchasePriceWithoutTax?: number | null
  totalAmountWithTax?: number | null
  totalAmountWithoutTax?: number | null
}

export interface PurchasePriceHistoryResult {
  itemUid?: string | null
  itemName?: string
  supplierUid?: string | null
  supplierOptions?: PurchasePriceHistoryOption[]
  list?: PurchasePriceHistoryRow[]
  count?: number
}

export async function getPurchasePriceCompare(data: PurchasePriceCompareQuery) {
  const res = await request<PurchasePriceCompareRow[]>({
    url: '/purchase/price/compare',
    method: 'post',
    data,
  })

  return res.data
}

export async function getPurchasePriceHistory(data: PurchasePriceHistoryQuery) {
  const res = await request<PurchasePriceHistoryResult>({
    url: '/purchase/price/history',
    method: 'post',
    data,
  })

  return res.data
}
