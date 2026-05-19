import request from '@/utils/request'

export interface TemplateDictionaryOption {
  label: string
  value: string
  disabled?: boolean
  children?: TemplateDictionaryOption[]
}

export interface TemplateDictionary {
  id?: number | null
  uid?: string | null
  type?: string
  name?: string
  remark?: string
  sort?: number | null
  enabled?: boolean
  parentUid?: string | null
  typeName?: string
  children?: TemplateDictionary[]
  createTime?: string
  updateTime?: string
}

export interface TemplateDictionaryForm extends TemplateDictionary {
  treeOptions?: TemplateDictionaryOption[]
  typeOptions?: TemplateDictionaryOption[]
}

export interface TemplateDictionaryQuery {
  name?: string
}

export interface TemplateDictionarySortPayload {
  newSort?: number | null
  oldSort?: number | null
  newUid?: string | null
  oldUid?: string | null
}

export async function getTemplateDictionaries(query: TemplateDictionaryQuery) {
  const res = await request<TemplateDictionary[]>({
    url: '/template/dictionary/select',
    method: 'post',
    data: query,
  })

  return res.data
}

export async function getTemplateDictionaryForm(uid?: string) {
  const res = await request<TemplateDictionaryForm>({
    url: uid ? `/template/dictionary/form/${uid}` : '/template/dictionary/form',
    method: 'post',
  })

  return res.data
}

export async function saveTemplateDictionary(data: TemplateDictionaryForm) {
  const res = await request<void>({
    url: data.uid ? '/template/dictionary/update' : '/template/dictionary/add',
    method: 'post',
    data,
  })

  return res.data
}

export async function deleteTemplateDictionary(uid: string) {
  const res = await request<void>({
    url: `/template/dictionary/delete/${uid}`,
    method: 'post',
  })

  return res.data
}

export async function updateTemplateDictionarySort(data: TemplateDictionarySortPayload) {
  const res = await request<void>({
    url: '/template/dictionary/updateSort',
    method: 'post',
    data,
  })

  return res.data
}
