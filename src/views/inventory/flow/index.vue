<script setup lang="ts">
import {
  NButton,
  NCard,
  NDataTable,
  NDescriptions,
  NDescriptionsItem,
  NDrawer,
  NDrawerContent,
  NFlex,
  NForm,
  NFormItem,
  NImage,
  NPagination,
  NSelect,
  NTag,
  useMessage,
} from 'naive-ui'
import { computed, h, onMounted, reactive, ref } from 'vue'

import {
  getInventoryFlowDetail,
  getInventoryFlows,
  type InventoryFlowPageData,
  type InventoryFlowQuery,
  type InventoryFlowRow,
} from '@/api'

import type { DataTableColumns, PaginationProps } from 'naive-ui'

defineOptions({
  name: 'InventoryFlow',
})

const message = useMessage()

const loading = ref(false)
const detailLoading = ref(false)
const showDetailDrawer = ref(false)

const query = reactive<InventoryFlowQuery>({
  key: '',
  warehouseUidList: [],
  supplierUidList: [],
  types: [],
  units: [],
  currentPage: 1,
  pageSize: 50,
})

const pageData = ref<InventoryFlowPageData>({
  currentPage: 1,
  pageSize: 50,
  count: 0,
  list: [],
  extraData: {
    supplierOptions: [],
    typeOptions: [],
    unitOptions: [],
    warehouseOptions: [],
  },
})

const detailData = ref<InventoryFlowRow | null>(null)

const pagination = reactive<PaginationProps>({
  page: 1,
  pageSize: 50,
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

function quantityTagType(value?: number | null) {
  const number = Number(value || 0)
  if (number > 0) return 'success'
  if (number < 0) return 'error'
  return 'default'
}

function formatChangeQuantity(value?: number | null) {
  const number = Number(value || 0)
  if (number > 0) return `+${number}`
  return `${number}`
}

function businessTypeLabel(value?: string) {
  if (!value) return '-'
  const normalized = value.toLowerCase()
  if (normalized.includes('inbound')) return '入库'
  if (normalized.includes('outbound')) return '出库'
  if (normalized.includes('transfer')) return '调拨'
  if (normalized.includes('check')) return '盘点'
  if (normalized.includes('request')) return '领料'
  return value
}

async function loadTableData() {
  loading.value = true
  try {
    pageData.value = await getInventoryFlows({
      ...query,
      key: query.key || '',
    })
    pagination.page = pageData.value.currentPage || 1
    pagination.pageSize = pageData.value.pageSize || 50
    pagination.itemCount = pageData.value.count || 0
  } finally {
    loading.value = false
  }
}

function resetQuery() {
  Object.assign(query, {
    key: '',
    warehouseUidList: [],
    supplierUidList: [],
    types: [],
    units: [],
    currentPage: 1,
    pageSize: 50,
  })
  loadTableData()
}

async function openDetailDrawer(row: InventoryFlowRow) {
  if (!row.uid) {
    message.warning('当前流水缺少详情标识')
    return
  }
  detailLoading.value = true
  showDetailDrawer.value = true
  try {
    detailData.value = await getInventoryFlowDetail(row.uid)
  } finally {
    detailLoading.value = false
  }
}

const columns = computed<DataTableColumns<InventoryFlowRow>>(() => [
  {
    title: '仓库',
    key: 'warehouseName',
    width: 140,
    ellipsis: { tooltip: true },
  },
  {
    title: '物料',
    key: 'itemsName',
    minWidth: 260,
    render: row =>
      h('div', { class: 'flow-item-cell' }, [
        row.itemsImage
          ? h(NImage, {
              src: row.itemsImage,
              width: 44,
              height: 44,
              objectFit: 'cover',
              previewDisabled: true,
              class: 'flow-item-image',
            })
          : h('div', { class: 'flow-item-image flow-item-image--empty' }, '无图'),
        h('div', { class: 'min-w-0' }, [
          h('div', { class: 'truncate font-medium text-neutral-900 dark:text-neutral-100' }, row.itemsName || '-'),
          h(
            'div',
            { class: 'truncate text-xs text-neutral-500 dark:text-neutral-400' },
            `${row.itemsSpec || '-'} / ${row.itemsMaterial || '-'} / ${row.itemsUnitName || '-'}`,
          ),
        ]),
      ]),
  },
  {
    title: '类型',
    key: 'itemsTypeName',
    width: 120,
    ellipsis: { tooltip: true },
  },
  {
    title: '供应商',
    key: 'itemsSupplierName',
    width: 140,
    ellipsis: { tooltip: true },
  },
  {
    title: '业务类型',
    key: 'businessType',
    width: 110,
    render: row => h(NTag, { size: 'small', bordered: false }, { default: () => businessTypeLabel(row.businessType) }),
  },
  {
    title: '变动前',
    key: 'beforeQuantity',
    width: 100,
  },
  {
    title: '变动数量',
    key: 'changeQuantity',
    width: 110,
    render: row =>
      h(
        NTag,
        { size: 'small', type: quantityTagType(row.changeQuantity), bordered: false },
        { default: () => formatChangeQuantity(row.changeQuantity) },
      ),
  },
  {
    title: '变动后',
    key: 'afterQuantity',
    width: 100,
  },
  {
    title: '时间',
    key: 'createTime',
    width: 170,
    ellipsis: { tooltip: true },
  },
  {
    title: '操作',
    key: 'actions',
    fixed: 'right',
    width: 80,
    render: row =>
      h(
        NButton,
        { text: true, type: 'primary', onClick: () => openDetailDrawer(row) },
        { default: () => '详情' },
      ),
  },
])

onMounted(() => {
  loadTableData()
})
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-4 p-4">
    <NCard size="small" :bordered="false">
      <NForm :model="query" label-placement="left" label-width="72">
        <div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <NFormItem label="关键字" class="flow-query-item">
            <n-input
              v-model:value="query.key"
              clearable
              placeholder="名称 / 规格 / 材质"
              @keydown.enter.prevent="loadTableData"
            />
          </NFormItem>
          <NFormItem label="仓库" class="flow-query-item">
            <NSelect
              v-model:value="query.warehouseUidList"
              :options="pageData.extraData?.warehouseOptions || []"
              multiple
              clearable
              placeholder="选择仓库"
            />
          </NFormItem>
          <NFormItem label="供应商" class="flow-query-item">
            <NSelect
              v-model:value="query.supplierUidList"
              :options="pageData.extraData?.supplierOptions || []"
              multiple
              clearable
              placeholder="选择供应商"
            />
          </NFormItem>
          <NFormItem label="类型" class="flow-query-item">
            <NSelect
              v-model:value="query.types"
              :options="pageData.extraData?.typeOptions || []"
              multiple
              clearable
              placeholder="选择类型"
            />
          </NFormItem>
          <NFormItem label="单位" class="flow-query-item">
            <NSelect
              v-model:value="query.units"
              :options="pageData.extraData?.unitOptions || []"
              multiple
              clearable
              placeholder="选择单位"
            />
          </NFormItem>
        </div>
        <div class="mt-3 flex justify-end gap-2">
          <NButton type="primary" attr-type="button" @click="loadTableData">查询</NButton>
          <NButton attr-type="button" @click="resetQuery">重置</NButton>
        </div>
      </NForm>
    </NCard>

    <NCard size="small" :bordered="false" class="flex min-h-0 flex-1 flex-col">
      <div class="mb-3 flex items-center justify-between">
        <div class="text-sm text-neutral-500 dark:text-neutral-400">库存变动流水</div>
        <div class="text-sm text-neutral-500 dark:text-neutral-400">按物料和仓库追踪每次库存变化</div>
      </div>

      <NDataTable
        remote
        flex-height
        :loading="loading"
        :columns="columns"
        :data="pageData.list || []"
        :pagination="false"
        :scroll-x="1330"
        size="small"
      />

      <div class="mt-3 flex justify-end">
        <NPagination v-bind="pagination" :disabled="loading" :prefix="({ itemCount }) => `共 ${itemCount} 条`" />
      </div>
    </NCard>

    <NDrawer v-model:show="showDetailDrawer" :width="760" placement="right">
      <NDrawerContent title="库存流水详情" :native-scrollbar="false">
        <div v-if="detailData" class="flex flex-col gap-4">
          <div class="flex items-start gap-4">
            <div v-if="detailData.itemsImage" class="flow-detail-image-wrap">
              <NImage :src="detailData.itemsImage" width="96" height="96" object-fit="cover" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{{ detailData.itemsName || '-' }}</div>
              <div class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                {{ detailData.itemsSpec || '-' }} / {{ detailData.itemsMaterial || '-' }}
              </div>
            </div>
          </div>

          <NDescriptions bordered :column="2" size="small" label-placement="left">
            <NDescriptionsItem label="仓库">{{ detailData.warehouseName || '-' }}</NDescriptionsItem>
            <NDescriptionsItem label="业务类型">{{ businessTypeLabel(detailData.businessType) }}</NDescriptionsItem>
            <NDescriptionsItem label="供应商">{{ detailData.itemsSupplierName || '-' }}</NDescriptionsItem>
            <NDescriptionsItem label="单位">{{ detailData.itemsUnitName || '-' }}</NDescriptionsItem>
            <NDescriptionsItem label="变动前">{{ detailData.beforeQuantity ?? '-' }}</NDescriptionsItem>
            <NDescriptionsItem label="变动数量">
              <NTag size="small" :type="quantityTagType(detailData.changeQuantity)" :bordered="false">
                {{ formatChangeQuantity(detailData.changeQuantity) }}
              </NTag>
            </NDescriptionsItem>
            <NDescriptionsItem label="变动后">{{ detailData.afterQuantity ?? '-' }}</NDescriptionsItem>
            <NDescriptionsItem label="发生时间">{{ detailData.createTime || '-' }}</NDescriptionsItem>
            <NDescriptionsItem label="业务单据 UID">{{ detailData.businessUid || '-' }}</NDescriptionsItem>
            <NDescriptionsItem label="业务明细 UID">{{ detailData.businessDetailUid || '-' }}</NDescriptionsItem>
            <NDescriptionsItem label="流水 UID" :span="2">{{ detailData.uid || '-' }}</NDescriptionsItem>
          </NDescriptions>
        </div>
      </NDrawerContent>
    </NDrawer>
  </div>
</template>

<style scoped>
.flow-query-item {
  margin-bottom: 0;
}

.flow-item-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.flow-item-image {
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 8px;
}

.flow-item-image--empty,
.flow-detail-image-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
}

.flow-item-image--empty {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  background: rgba(148, 163, 184, 0.12);
  color: rgb(100, 116, 139);
  font-size: 12px;
}

.flow-detail-image-wrap {
  overflow: hidden;
  border-radius: 12px;
}
</style>
