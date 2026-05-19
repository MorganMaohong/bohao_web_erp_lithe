<script setup lang="ts">
import {
  NButton,
  NCard,
  NDataTable,
  NEmpty,
  NFlex,
  NForm,
  NFormItem,
  NImage,
  NInput,
  NInputNumber,
  NModal,
  NPagination,
  NSelect,
  NSpace,
  NSpin,
  NTable,
  NTag,
  useMessage,
} from 'naive-ui'
import { computed, h, reactive, ref } from 'vue'

import {
  getProductionBomForm,
  getProductionBoms,
  getTemplateItems,
  saveProductionBom,
  type ProductionBomForm,
  type ProductionBomItem,
  type ProductionBomPageData,
  type ProductionBomProductRow,
  type ProductionBomQuery,
  type TemplateItem,
  type TemplateItemPageData,
} from '@/api'

import type { DataTableColumns, PaginationProps } from 'naive-ui'

defineOptions({
  name: 'ProductBom',
})

const message = useMessage()

const loading = ref(false)
const submitting = ref(false)
const optionLoading = ref(false)
const showEditModal = ref(false)

const query = reactive<ProductionBomQuery>({
  currentPage: 1,
  pageSize: 20,
  key: '',
})

const pageData = ref<ProductionBomPageData>({
  currentPage: 1,
  pageSize: 20,
  count: 0,
  list: [],
})

const componentItems = ref<TemplateItemPageData>({
  currentPage: 1,
  pageSize: 500,
  count: 0,
  list: [],
})

const form = reactive<ProductionBomForm>({
  productItemUid: null,
  productName: '',
  detailList: [],
  componentOptions: [],
})

const pagination = reactive<PaginationProps>({
  page: 1,
  pageSize: 20,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [20, 50, 100],
  onUpdatePage(page) {
    query.currentPage = page
    loadTableData()
  },
  onUpdatePageSize(pageSize) {
    query.pageSize = pageSize
    query.currentPage = 1
    loadTableData()
  },
})

const componentMap = computed<Record<string, TemplateItem>>(() =>
  Object.fromEntries((componentItems.value.list || []).filter(item => item.uid).map(item => [item.uid as string, item])),
)

function formatItemLabel(name?: string, spec?: string) {
  if (!name) return '-'
  return spec ? `${name} / ${spec}` : name
}

async function loadComponentOptions() {
  optionLoading.value = true
  try {
    componentItems.value = await getTemplateItems({
      currentPage: 1,
      pageSize: 500,
      key: '',
      itemBizType: 'component',
    })
  } finally {
    optionLoading.value = false
  }
}

async function loadTableData() {
  loading.value = true
  try {
    pageData.value = await getProductionBoms({
      ...query,
      key: query.key || '',
    })
    pagination.page = pageData.value.currentPage || 1
    pagination.pageSize = pageData.value.pageSize || 20
    pagination.itemCount = pageData.value.count || 0
  } finally {
    loading.value = false
  }
}

function resetQuery() {
  Object.assign(query, {
    currentPage: 1,
    pageSize: 20,
    key: '',
  })
  loadTableData()
}

async function openEditModal(row: ProductionBomProductRow) {
  if (!row.uid) return
  if (!componentItems.value.list?.length) {
    await loadComponentOptions()
  }
  submitting.value = true
  try {
    const payload = await getProductionBomForm(row.uid)
    Object.assign(form, {
      productItemUid: payload.productItemUid || row.uid,
      productName: payload.productName || row.name || '',
      detailList: payload.detailList || [],
      componentOptions: payload.componentOptions || [],
    })
    showEditModal.value = true
  } finally {
    submitting.value = false
  }
}

function addDetailRow() {
  form.detailList = form.detailList || []
  form.detailList.push({ quantity: 1 })
}

function removeDetailRow(index: number) {
  form.detailList?.splice(index, 1)
}

function handleComponentChange(item: ProductionBomItem) {
  const source =
    componentMap.value[item.componentItemUid || ''] ||
    componentItems.value.list?.find(v => v.uid === item.componentItemUid)
  item.name = source?.name
  item.image = source?.image
  item.type = source?.type
  item.typeName = source?.typeName
  item.unit = source?.unit
  item.unitName = source?.unitName
  item.spec = source?.spec
  item.material = source?.material
}

function validateForm() {
  if (!form.productItemUid) {
    message.error('成品不能为空')
    return false
  }
  for (const item of form.detailList || []) {
    if (!item.componentItemUid) {
      message.error('请选择零件物料')
      return false
    }
    if (!item.quantity || Number(item.quantity) <= 0) {
      message.error('BOM 用量必须大于 0')
      return false
    }
  }
  return true
}

async function submitForm() {
  if (!validateForm() || submitting.value) return
  submitting.value = true
  try {
    await saveProductionBom({
      productItemUid: form.productItemUid,
      productName: form.productName,
      detailList: [...(form.detailList || [])],
      componentOptions: form.componentOptions,
    })
    message.success('BOM 已保存')
    showEditModal.value = false
    loadTableData()
  } finally {
    submitting.value = false
  }
}

const columns = computed<DataTableColumns<ProductionBomProductRow>>(() => [
  {
    title: '成品',
    key: 'name',
    minWidth: 240,
    render: row =>
      h('div', { class: 'bom-item-cell' }, [
        row.image
          ? h(NImage, {
              src: row.image,
              width: 40,
              height: 40,
              objectFit: 'cover',
              previewDisabled: true,
              class: 'bom-item-image',
            })
          : h('div', { class: 'bom-item-image bom-item-image--empty' }, '无图'),
        h('div', { class: 'min-w-0' }, [
          h('div', { class: 'truncate font-medium text-neutral-900 dark:text-neutral-100' }, row.name || '-'),
          h('div', { class: 'truncate text-xs text-neutral-500 dark:text-neutral-400' }, row.typeName || '-'),
        ]),
      ]),
  },
  { title: '单位', key: 'unitName', width: 100, ellipsis: { tooltip: true } },
  { title: 'BOM 数量', key: 'bomCount', width: 120 },
  { title: '更新时间', key: 'updateTime', minWidth: 170, ellipsis: { tooltip: true } },
  {
    title: '操作',
    key: 'actions',
    fixed: 'right',
    width: 120,
    render: row => h(NButton, { text: true, type: 'primary', onClick: () => openEditModal(row) }, { default: () => '编辑 BOM' }),
  },
])

loadTableData()
loadComponentOptions()
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-4 p-4">
    <NCard size="small" :bordered="false">
      <NForm :model="query" label-placement="left" label-width="72">
        <div class="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-4">
          <NFormItem label="成品" class="bom-query-item">
            <NInput v-model:value="query.key" clearable placeholder="成品名称" @keydown.enter.prevent="loadTableData" />
          </NFormItem>
          <NFormItem class="bom-query-item">
            <NFlex size="small">
              <NButton type="primary" attr-type="button" @click="loadTableData">查询</NButton>
              <NButton attr-type="button" @click="resetQuery">重置</NButton>
            </NFlex>
          </NFormItem>
        </div>
      </NForm>
    </NCard>

    <NCard size="small" :bordered="false" class="flex min-h-0 flex-1 flex-col">
      <div class="mb-3 flex items-center justify-between">
        <div class="text-sm text-neutral-500 dark:text-neutral-400">生产 BOM 台账</div>
        <div class="text-sm text-neutral-500 dark:text-neutral-400">按成品维护零件物料与标准用量</div>
      </div>

      <NDataTable
        remote
        flex-height
        :loading="loading"
        :columns="columns"
        :data="pageData.list || []"
        :pagination="false"
        :scroll-x="860"
        size="small"
      />

      <div class="mt-3 flex justify-end">
        <NPagination v-bind="pagination" :disabled="loading" :prefix="({ itemCount }) => `共 ${itemCount} 条`" />
      </div>
    </NCard>

    <NModal v-model:show="showEditModal" preset="card" class="w-[1160px] max-w-[96vw]" title="编辑生产 BOM">
      <NSpin :show="submitting || optionLoading">
        <div class="bom-modal-body">
          <NCard size="small" embedded>
            <div class="flex items-center justify-between gap-3">
              <div>
                <div class="text-xs text-neutral-500 dark:text-neutral-400">当前成品</div>
                <div class="text-base font-medium text-neutral-900 dark:text-neutral-100">{{ form.productName || '-' }}</div>
              </div>
              <NTag size="small" type="info">BOM {{ (form.detailList || []).length }} 项</NTag>
            </div>
          </NCard>

          <NCard size="small" embedded>
            <div class="mb-3 flex items-center justify-between">
              <div class="text-sm font-medium text-neutral-900 dark:text-neutral-100">BOM 明细</div>
              <NButton type="primary" secondary attr-type="button" @click="addDetailRow">新增零件</NButton>
            </div>

            <NTable striped size="small" class="bom-detail-table">
              <thead>
                <tr>
                  <th class="w-[220px]">零件</th>
                  <th class="w-[250px]">零件信息</th>
                  <th class="w-[110px]">单位</th>
                  <th class="w-[120px]">单件用量</th>
                  <th>备注</th>
                  <th class="w-[80px]">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in form.detailList || []" :key="item.uid || index">
                  <td>
                    <NSelect
                      v-model:value="item.componentItemUid"
                      :options="form.componentOptions"
                      clearable
                      filterable
                      :consistent-menu-width="false"
                      @update:value="handleComponentChange(item)"
                    />
                  </td>
                  <td>
                    <div class="bom-item-cell">
                      <NImage
                        v-if="item.image"
                        :src="item.image"
                        width="40"
                        height="40"
                        object-fit="cover"
                        preview-disabled
                        class="bom-item-image"
                      />
                      <div v-else class="bom-item-image bom-item-image--empty">无图</div>
                      <div class="min-w-0">
                        <div class="truncate font-medium text-neutral-900 dark:text-neutral-100">{{ item.name || '-' }}</div>
                        <div class="truncate text-xs text-neutral-500 dark:text-neutral-400">
                          {{ item.spec || '-' }} / {{ item.material || '-' }}
                        </div>
                        <div class="truncate text-xs text-neutral-500 dark:text-neutral-400">{{ item.typeName || '-' }}</div>
                      </div>
                    </div>
                  </td>
                  <td>{{ item.unitName || '-' }}</td>
                  <td>
                    <NInputNumber v-model:value="item.quantity" :min="0.000001" class="w-full" />
                  </td>
                  <td>
                    <NInput v-model:value="item.remark" placeholder="备注" />
                  </td>
                  <td>
                    <NButton text type="error" @click="removeDetailRow(index)">删除</NButton>
                  </td>
                </tr>
                <tr v-if="!(form.detailList || []).length">
                  <td colspan="6">
                    <NEmpty description="暂无 BOM 明细" />
                  </td>
                </tr>
              </tbody>
            </NTable>
          </NCard>
        </div>
      </NSpin>

      <template #footer>
        <div class="flex justify-end gap-2">
          <NButton attr-type="button" @click="showEditModal = false">取消</NButton>
          <NButton type="primary" attr-type="button" :loading="submitting" @click="submitForm">保存</NButton>
        </div>
      </template>
    </NModal>
  </div>
</template>

<style scoped>
.bom-query-item {
  margin-bottom: 0;
}

.bom-modal-body {
  display: flex;
  max-height: 76vh;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
}

.bom-item-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.bom-item-image {
  flex-shrink: 0;
  border-radius: 8px;
  overflow: hidden;
}

.bom-item-image--empty {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  color: #999;
  font-size: 12px;
}
</style>
