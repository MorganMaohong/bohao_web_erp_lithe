import request from '@/utils/request'

export interface InventoryRequestOption {
  label: string
  value: string
  disabled?: boolean
  children?: InventoryRequestOption[]
}

export interface InventoryRequestWarehouse {
  uid?: string | null
  code?: string
  name?: string
}

export interface InventoryRequestItemDetail {
  id?: number | null
  uid?: string | null
  orderUid?: string | null
  itemUid?: string
  outOrderDetailUid?: string | null
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
  quantity?: number | null
  issuedQuantity?: number | null
  totalQuantity?: number | null
  availableQuantity?: number | null
  issueQuantity?: number | string | null
  remark?: string
}

export interface InventoryRequestIssueSubmitItem {
  detailUid?: string | null
  quantity?: number | null
}

export interface InventoryRequestIssueForm {
  uid?: string | null
  comment?: string
  detailList?: InventoryRequestIssueSubmitItem[]
}

export interface InventoryRequestQuery {
  currentPage: number
  pageSize: number
  key?: string
  status?: string | null
  warehouseUid?: string | null
  usageType?: string | null
  bizType?: string | null
}

export interface InventoryRequestQueryData {
  statusOptions?: InventoryRequestOption[]
  usageTypeOptions?: InventoryRequestOption[]
  bizTypeOptions?: InventoryRequestOption[]
  warehouseOptions?: InventoryRequestOption[]
}

export interface InventoryRequestRow {
  id?: number | null
  uid?: string | null
  code?: string
  applyTime?: number | string | null
  applyTimeName?: string
  expectTime?: number | string | null
  expectTimeName?: string
  warehouseUid?: string | null
  warehouseName?: string
  usageType?: string | null
  usageTypeName?: string
  bizType?: string | null
  bizTypeName?: string
  bizUid?: string | null
  bizName?: string
  status?: string | null
  statusName?: string
  currentNodeName?: string
  totalQuantity?: number | null
  remark?: string
  createTime?: string
  updateTime?: string
}

export interface InventoryRequestPageData {
  currentPage?: number
  pageSize?: number
  count?: number
  list?: InventoryRequestRow[]
  extraData?: InventoryRequestQueryData
}

export interface InventoryRequestForm extends InventoryRequestRow {
  warehouse?: InventoryRequestWarehouse
  detailList?: InventoryRequestItemDetail[]
  usageTypeOptions?: InventoryRequestOption[]
  bizTypeOptions?: InventoryRequestOption[]
  bizObjectOptions?: InventoryRequestOption[]
  warehouseOptions?: InventoryRequestOption[]
}

export interface InventoryRequestDetail extends InventoryRequestForm {
  flowSchema?: Record<string, any>
}

export async function getInventoryRequests(query: InventoryRequestQuery) {
  const res = await request<InventoryRequestPageData>({
    url: '/inventory/material-request/select',
    method: 'post',
    data: query,
  })

  return res.data
}

export async function getInventoryRequestForm(uid?: string) {
  const res = await request<InventoryRequestForm>({
    url: uid ? `/inventory/material-request/form/${uid}` : '/inventory/material-request/form',
    method: 'post',
  })

  return res.data
}

export async function saveInventoryRequest(data: InventoryRequestForm) {
  const res = await request<void>({
    url: data.uid ? '/inventory/material-request/update' : '/inventory/material-request/add',
    method: 'post',
    data,
  })

  return res.data
}

export async function getInventoryRequestDetail(uid: string) {
  const res = await request<InventoryRequestDetail>({
    url: `/inventory/material-request/detail/${uid}`,
    method: 'post',
  })

  return res.data
}

export async function getInventoryRequestIssueList(query: InventoryRequestQuery) {
  const res = await request<InventoryRequestPageData>({
    url: '/inventory/material-request/issue-select',
    method: 'post',
    data: query,
  })

  return res.data
}

export async function getInventoryRequestIssueDetail(uid: string) {
  const res = await request<InventoryRequestDetail>({
    url: `/inventory/material-request/issue-detail/${uid}`,
    method: 'post',
  })

  return res.data
}

export async function partialIssueInventoryRequest(data: InventoryRequestIssueForm) {
  const res = await request<void>({
    url: '/inventory/material-request/issue/partial',
    method: 'post',
    data,
  })

  return res.data
}

export async function issueAllInventoryRequest(data: InventoryRequestIssueForm) {
  const res = await request<void>({
    url: '/inventory/material-request/issue/all',
    method: 'post',
    data,
  })

  return res.data
}

export async function unableIssueInventoryRequest(data: InventoryRequestIssueForm) {
  const res = await request<void>({
    url: '/inventory/material-request/issue/unable',
    method: 'post',
    data,
  })

  return res.data
}

export async function deleteInventoryRequest(uid: string) {
  const res = await request<void>({
    url: `/inventory/material-request/delete/${uid}`,
    method: 'post',
  })

  return res.data
}

export async function deleteInventoryRequestDetail(uid: string) {
  const res = await request<void>({
    url: `/inventory/material-request/deleteDetail/${uid}`,
    method: 'post',
  })

  return res.data
}

export async function getInventoryUsageTypeOptions() {
  const res = await request<InventoryRequestOption[]>({
    url: '/inventory/common/usageTypeOptions',
    method: 'post',
  })

  return res.data
}

export async function getInventoryBizTypeOptions() {
  const res = await request<InventoryRequestOption[]>({
    url: '/inventory/common/bizTypeOptions',
    method: 'post',
  })

  return res.data
}

export async function getInventoryBizObjectOptions(bizType?: string | null) {
  if (!bizType) return []

  const res = await request<InventoryRequestOption[]>({
    url: `/inventory/common/bizObjectOptions/${bizType}`,
    method: 'post',
  })

  return res.data
}
