import request from '@/utils/request'

export interface ProductionPlanOption {
  label: string
  value: string
  disabled?: boolean
}

export interface ProductionPlanProductItem {
  itemUid?: string | null
  name?: string
  image?: string
  warehouseUid?: string | null
  warehouseName?: string
  unit?: string
  unitName?: string
  type?: string
  typeName?: string
  spec?: string
  material?: string
  itemBizType?: string
  itemBizTypeName?: string
  stockQuantity?: number | null
  quantity?: number | null
  inboundQuantity?: number | null
}

export interface ProductionPlanBomItem {
  uid?: string | null
  productItemUid?: string | null
  productName?: string
  productImage?: string
  productType?: string
  productTypeName?: string
  productSpec?: string
  productMaterial?: string
  productItemBizType?: string
  productItemBizTypeName?: string
  componentItemUid?: string | null
  componentName?: string
  componentImage?: string
  componentType?: string
  componentTypeName?: string
  componentSpec?: string
  componentMaterial?: string
  componentItemBizType?: string
  componentItemBizTypeName?: string
  unit?: string
  unitName?: string
  perQuantity?: number | null
  requiredQuantity?: number | null
  stockQuantity?: number | null
  availableQuantity?: number | null
  issuedQuantity?: number | null
  remark?: string
}

export interface ProductionPlanProcessNodeItem {
  uid?: string | null
  name?: string
  leaderUid?: string | null
  leaderName?: string
  durationValue?: number | null
  durationUnit?: string
  startRule?: string
  sort?: number | null
  remark?: string
  completed?: boolean
  actualCompleteTime?: number | null
  reworkTime?: number | null
  imageList?: string[]
}

export interface ProductionPlanProcessItem {
  uid?: string | null
  productItemUid?: string | null
  productName?: string
  templateUid?: string | null
  templateName?: string
  quantity?: number | null
  remark?: string
  nodeCompleted?: boolean
  completed?: boolean
  planStartTime?: number | null
  planCompleteTime?: number | null
  actualCompleteTime?: number | null
  nodeList?: ProductionPlanProcessNodeItem[]
}

export interface ProductionPlanIssueDetailItem {
  bomUid?: string | null
  componentItemUid?: string | null
  componentName?: string
  componentImage?: string
  componentSpec?: string
  componentMaterial?: string
  componentTypeName?: string
  stockQuantity?: number | null
  availableQuantity?: number | null
  requiredQuantity?: number | null
  issuedQuantity?: number | null
  warehouseUid?: string | null
  warehouseName?: string
  quantity?: number | null
  remark?: string
}

export interface ProductionPlanIssueOrderItem {
  uid?: string | null
  issueTime?: number | null
  remark?: string
  detailList?: ProductionPlanIssueDetailItem[]
}

export interface ProductionPlanFinishDetailItem {
  productItemUid?: string | null
  productName?: string
  productImage?: string
  productSpec?: string
  productMaterial?: string
  productTypeName?: string
  planQuantity?: number | null
  inboundQuantity?: number | null
  availableInboundQuantity?: number | null
  warehouseUid?: string | null
  warehouseName?: string
  quantity?: number | null
  remark?: string
}

export interface ProductionPlanFinishOrderItem {
  uid?: string | null
  inboundTime?: number | null
  remark?: string
  detailList?: ProductionPlanFinishDetailItem[]
}

export interface ProductionPlanStage {
  key?: string
  name?: string
  completed?: boolean
  current?: boolean
}

export interface ProductionPlanFlowSchema {
  flowType?: string
  [key: string]: any
}

export interface ProductionPlanRow {
  id?: number | null
  uid?: string | null
  name?: string
  startTime?: number | null
  planCompleteTime?: number | null
  images?: string
  docs?: string
  remark?: string
  closeReason?: string
  flowInstanceUid?: string | null
  status?: string
  statusName?: string
  currentNodeUid?: string | null
  currentNodeName?: string
  currentStage?: string
  currentStageName?: string
  materialPrepared?: boolean
  materialIssued?: boolean
  processCompleted?: boolean
  finished?: boolean
  inboundCompleted?: boolean
  canEditPlan?: boolean
  createTime?: string
  updateTime?: string
}

export interface ProductionPlanForm extends ProductionPlanRow {
  imageList?: string[]
  docList?: string[]
  productList?: ProductionPlanProductItem[]
  productOptions?: ProductionPlanOption[]
  warehouseOptions?: ProductionPlanOption[]
}

export interface ProductionPlanDetail extends ProductionPlanForm {
  bomList?: ProductionPlanBomItem[]
  processList?: ProductionPlanProcessItem[]
  issueOrderList?: ProductionPlanIssueOrderItem[]
  finishOrderList?: ProductionPlanFinishOrderItem[]
  stageList?: ProductionPlanStage[]
  flowSchema?: ProductionPlanFlowSchema
}

export interface ProductionPlanQuery {
  currentPage: number
  pageSize: number
  key?: string
  status?: string
}

export interface ProductionPlanPageData {
  currentPage?: number
  pageSize?: number
  count?: number
  list?: ProductionPlanDetail[]
}

export interface ProductionPlanCloseForm {
  uid?: string | null
  closeReason?: string
}

export async function getProductionPlans(query: ProductionPlanQuery) {
  const res = await request<ProductionPlanPageData>({
    url: '/production/plan/select',
    method: 'post',
    data: query,
  })

  return res.data
}

export async function getProductionPlanForm(uid?: string) {
  const res = await request<ProductionPlanForm>({
    url: uid ? `/production/plan/form/${uid}` : '/production/plan/form',
    method: 'post',
  })

  return res.data
}

export async function saveProductionPlan(data: ProductionPlanForm) {
  const res = await request<void>({
    url: data.uid ? '/production/plan/update' : '/production/plan/add',
    method: 'post',
    data,
  })

  return res.data
}

export async function getProductionPlanDetail(uid: string) {
  const res = await request<ProductionPlanDetail>({
    url: `/production/plan/detail/${uid}`,
    method: 'post',
  })

  return res.data
}

export async function closeProductionPlan(data: ProductionPlanCloseForm) {
  const res = await request<void>({
    url: '/production/plan/close',
    method: 'post',
    data,
  })

  return res.data
}

export async function deleteProductionPlan(uid: string) {
  const res = await request<void>({
    url: `/production/plan/delete/${uid}`,
    method: 'post',
  })

  return res.data
}
