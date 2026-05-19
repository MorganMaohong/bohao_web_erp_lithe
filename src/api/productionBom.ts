import request from '@/utils/request'

export interface ProductionBomOption {
  label: string
  value: string
  disabled?: boolean
}

export interface ProductionBomItem {
  uid?: string | null
  componentItemUid?: string | null
  name?: string
  image?: string
  type?: string
  typeName?: string
  unit?: string
  unitName?: string
  spec?: string
  material?: string
  quantity?: number | null
  remark?: string
  totalQuantity?: number | null
  availableQuantity?: number | null
}

export interface ProductionBomForm {
  productItemUid?: string | null
  productName?: string
  detailList?: ProductionBomItem[]
  componentOptions?: ProductionBomOption[]
}

export interface ProductionBomProductRow {
  uid?: string | null
  name?: string
  image?: string
  typeName?: string
  unitName?: string
  bomCount?: number | null
  updateTime?: string
}

export interface ProductionBomQuery {
  currentPage: number
  pageSize: number
  key?: string
}

export interface ProductionBomPageData {
  currentPage?: number
  pageSize?: number
  count?: number
  list?: ProductionBomProductRow[]
}

export async function getProductionBoms(query: ProductionBomQuery) {
  const res = await request<ProductionBomPageData>({
    url: '/production/bom/select',
    method: 'post',
    data: query,
  })

  return res.data
}

export async function getProductionBomForm(productItemUid: string) {
  const res = await request<ProductionBomForm>({
    url: `/production/bom/form/${productItemUid}`,
    method: 'post',
  })

  return res.data
}

export async function saveProductionBom(data: ProductionBomForm) {
  const res = await request<void>({
    url: '/production/bom/update',
    method: 'post',
    data,
  })

  return res.data
}
