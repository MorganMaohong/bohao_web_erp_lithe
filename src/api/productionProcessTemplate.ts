import request from '@/utils/request'

export interface ProductionProcessTemplateOption {
  label: string
  value: string
  disabled?: boolean
}

export interface ProductionProcessTemplateNode {
  uid?: string | null
  name?: string
  leaderUid?: string | null
  leaderName?: string
  durationValue?: number | null
  durationUnit?: string
  durationUnitName?: string
  startRule?: string
  startRuleName?: string
  sort?: number | null
  remark?: string
}

export interface ProductionProcessTemplateForm {
  uid?: string | null
  name?: string
  category?: string
  remark?: string
  categoryOptions?: ProductionProcessTemplateOption[]
  leaderOptions?: ProductionProcessTemplateOption[]
  durationUnitOptions?: ProductionProcessTemplateOption[]
  startRuleOptions?: ProductionProcessTemplateOption[]
  nodeList?: ProductionProcessTemplateNode[]
}

export interface ProductionProcessTemplateRow {
  uid?: string | null
  name?: string
  category?: string
  remark?: string
  nodeCount?: number | null
  createTime?: string
}

export interface ProductionProcessTemplateQuery {
  currentPage: number
  pageSize: number
  key?: string
}

export interface ProductionProcessTemplatePageData {
  currentPage?: number
  pageSize?: number
  count?: number
  list?: ProductionProcessTemplateRow[]
}

export async function getProductionProcessTemplates(query: ProductionProcessTemplateQuery) {
  const res = await request<ProductionProcessTemplatePageData>({
    url: '/production/process-template/select',
    method: 'post',
    data: query,
  })

  return res.data
}

export async function getProductionProcessTemplateForm(uid?: string) {
  const res = await request<ProductionProcessTemplateForm>({
    url: uid ? `/production/process-template/form/${uid}` : '/production/process-template/form',
    method: 'post',
  })

  return res.data
}

export async function saveProductionProcessTemplate(data: ProductionProcessTemplateForm) {
  const res = await request<void>({
    url: data.uid ? '/production/process-template/update' : '/production/process-template/add',
    method: 'post',
    data,
  })

  return res.data
}

export async function deleteProductionProcessTemplate(uid: string) {
  const res = await request<void>({
    url: `/production/process-template/delete/${uid}`,
    method: 'post',
  })

  return res.data
}

export async function copyProductionProcessTemplate(uid: string) {
  const res = await request<void>({
    url: `/production/process-template/copy/${uid}`,
    method: 'post',
  })

  return res.data
}
