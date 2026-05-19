<script setup lang="ts">
import {
  NButton,
  NCard,
  NDataTable,
  NDatePicker,
  NDescriptions,
  NDescriptionsItem,
  NDrawer,
  NDrawerContent,
  NFlex,
  NForm,
  NFormItem,
  NImage,
  NInput,
  NInputNumber,
  NModal,
  NPagination,
  NPopconfirm,
  NSelect,
  NSpace,
  NTag,
  useMessage,
} from 'naive-ui'
import { computed, h, onMounted, reactive, ref, watch } from 'vue'

import {
  deleteInventoryRequest,
  deleteInventoryRequestDetail,
  getInventoryBizObjectOptions,
  getInventoryBizTypeOptions,
  getInventoryOverview,
  getInventoryRequestDetail,
  getInventoryRequestForm,
  getInventoryRequests,
  getInventoryUsageTypeOptions,
  getTemplateWarehouses,
  saveInventoryRequest,
  type InventoryOverviewPageData,
  type InventoryOverviewQuery,
  type InventoryOverviewRow,
  type InventoryRequestDetail,
  type InventoryRequestForm,
  type InventoryRequestItemDetail,
  type InventoryRequestOption,
  type InventoryRequestPageData,
  type InventoryRequestQuery,
  type InventoryRequestRow,
  type TemplateWarehousePageData,
} from '@/api'

import type { DataTableColumns, PaginationProps } from 'naive-ui'

defineOptions({
  name: 'InventoryRequest',
})

const message = useMessage()

const loading = ref(false)
const submitting = ref(false)
const detailLoading = ref(false)
const itemLoading = ref(false)
const optionLoading = ref(false)

const showEditModal = ref(false)
const showItemPicker = ref(false)
const showDetailDrawer = ref(false)

const pageData = ref<InventoryRequestPageData>({
  currentPage: 1,
  pageSize: 20,
  count: 0,
  list: [],
  extraData: {
    statusOptions: [],
    usageTypeOptions: [],
    bizTypeOptions: [],
    warehouseOptions: [],
  },
})

const query = reactive<InventoryRequestQuery>({
  currentPage: 1,
  pageSize: 20,
  key: '',
  status: null,
  warehouseUid: null,
  usageType: null,
  bizType: null,
})

const warehouseData = ref<TemplateWarehousePageData>({
  currentPage: 1,
  pageSize: 500,
  count: 0,
  list: [],
})

const itemPageData = ref<InventoryOverviewPageData>({
  currentPage: 1,
  pageSize: 50,
  count: 0,
  list: [],
})

const itemQuery = reactive<InventoryOverviewQuery>({
  currentPage: 1,
  pageSize: 50,
  key: '',
  warehouseUidList: [],
})

const selectedItemKeys = ref<Array<string | number>>([])
const detailData = ref<InventoryRequestDetail | null>(null)

function createEmptyForm(): InventoryRequestForm {
  return {
    code: '',
    applyTime: Date.now(),
    expectTime: null,
    warehouseUid: null,
    usageType: null,
    bizType: null,
    bizUid: null,
    bizName: '',
    remark: '',
    detailList: [],
    warehouse: {},
    usageTypeOptions: [],
    bizTypeOptions: [],
    bizObjectOptions: [],
    warehouseOptions: [],
  }
}

const form = reactive<InventoryRequestForm>(createEmptyForm())

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

watch(
  pageData,
  (value) => {
    pagination.page = value.currentPage || 1
    pagination.pageSize = value.pageSize || 20
    pagination.itemCount = value.count || 0
  },
  { immediate: true },
)

const itemPickerPagination = reactive<PaginationProps>({
  page: 1,
  pageSize: 50,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [20, 50, 100],
  onUpdatePage(page) {
    itemQuery.currentPage = page
    loadItems()
  },
  onUpdatePageSize(pageSize) {
    itemQuery.pageSize = pageSize
    itemQuery.currentPage = 1
    loadItems()
  },
})

watch(
  itemPageData,
  (value) => {
    itemPickerPagination.page = value.currentPage || 1
    itemPickerPagination.pageSize = value.pageSize || 50
    itemPickerPagination.itemCount = value.count || 0
  },
  { immediate: true },
)

const totalQuantity = computed(() =>
  (form.detailList || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0),
)

const isResubmit = computed(() => Boolean(form.uid && String(form.status || '').toLowerCase().includes('reject')))

const warehouseOptions = computed(() => (warehouseData.value.list || []).map(item => ({
  label: item.name || item.code || '-',
  value: item.uid || '',
})))

function syncForm(data?: Partial<InventoryRequestForm>) {
  Object.assign(form, createEmptyForm(), data || {}, {
    detailList: [...(data?.detailList || [])],
    usageTypeOptions: data?.usageTypeOptions || [],
    bizTypeOptions: data?.bizTypeOptions || [],
    bizObjectOptions: data?.bizObjectOptions || [],
    warehouseOptions: data?.warehouseOptions || [],
    warehouse: data?.warehouse || {},
  })
  syncWarehouseSelection()
}

function syncWarehouseSelection() {
  const warehouse = (warehouseData.value.list || []).find(item => item.uid === form.warehouseUid)
  form.warehouse = warehouse
    ? {
        uid: warehouse.uid,
        code: warehouse.code,
        name: warehouse.name,
      }
    : (form.warehouse || {})
}

watch(
  () => warehouseData.value.list,
  () => {
    syncWarehouseSelection()
  },
)

watch(
  () => form.bizUid,
  (value) => {
    const match = (form.bizObjectOptions || []).find(item => item.value === value)
    form.bizName = match?.label || ''
  },
)

function statusType(status?: string | null) {
  const normalized = String(status || '').toLowerCase()
  if (normalized.includes('reject')) return 'error'
  if (normalized.includes('pass') || normalized.includes('complete') || normalized.includes('done')) return 'success'
  if (normalized.includes('wait') || normalized.includes('process') || normalized.includes('audit')) return 'warning'
  return 'default'
}

function ensureDetailListValid() {
  if (!form.warehouseUid) {
    message.error('请选择领料仓库')
    return false
  }
  if (!form.usageType) {
    message.error('请选择用途类型')
    return false
  }
  if (!form.bizType) {
    message.error('请选择业务对象类型')
    return false
  }
  if (form.bizType !== 'none' && !form.bizUid) {
    message.error('请选择业务对象')
    return false
  }
  if (!form.detailList?.length) {
    message.error('请至少添加一条领料明细')
    return false
  }

  for (const item of form.detailList) {
    const quantity = Number(item.quantity || 0)
    if (!item.itemUid || quantity <= 0) {
      message.error('请完整填写领料明细数量')
      return false
    }
  }

  return true
}

async function loadCommonOptions() {
  optionLoading.value = true
  try {
    const [usageTypeOptions, bizTypeOptions] = await Promise.all([
      getInventoryUsageTypeOptions(),
      getInventoryBizTypeOptions(),
    ])
    if (!(pageData.value.extraData)) pageData.value.extraData = {}
    pageData.value.extraData.usageTypeOptions = usageTypeOptions
    pageData.value.extraData.bizTypeOptions = bizTypeOptions
  } finally {
    optionLoading.value = false
  }
}

async function loadWarehouses() {
  warehouseData.value = await getTemplateWarehouses({
    currentPage: 1,
    pageSize: 500,
    key: '',
  })
  if (!(pageData.value.extraData)) pageData.value.extraData = {}
  pageData.value.extraData.warehouseOptions = warehouseOptions.value
}

async function loadTableData() {
  loading.value = true
  try {
    pageData.value = await getInventoryRequests({
      ...query,
      key: query.key || '',
    })
    if (!pageData.value.extraData?.usageTypeOptions?.length || !pageData.value.extraData?.bizTypeOptions?.length) {
      await loadCommonOptions()
    }
    if (!pageData.value.extraData?.warehouseOptions?.length) {
      pageData.value.extraData = {
        ...(pageData.value.extraData || {}),
        warehouseOptions: warehouseOptions.value,
      }
    }
  } finally {
    loading.value = false
  }
}

function resetQuery() {
  Object.assign(query, {
    currentPage: 1,
    pageSize: 20,
    key: '',
    status: null,
    warehouseUid: null,
    usageType: null,
    bizType: null,
  })
  loadTableData()
}

async function loadItems() {
  itemLoading.value = true
  try {
    itemPageData.value = await getInventoryOverview({
      ...itemQuery,
      key: itemQuery.key || '',
      warehouseUidList: form.warehouseUid ? [form.warehouseUid] : [],
    })
  } finally {
    itemLoading.value = false
  }
}

function resetItemQuery() {
  Object.assign(itemQuery, {
    currentPage: 1,
    pageSize: 50,
    key: '',
    warehouseUidList: form.warehouseUid ? [form.warehouseUid] : [],
  })
  loadItems()
}

function handleWarehouseChange(value: string | null) {
  const previousValue = form.warehouseUid
  form.warehouseUid = value
  syncWarehouseSelection()
  if (previousValue && previousValue !== value) {
    form.detailList = []
    selectedItemKeys.value = []
  }
}

async function handleBizTypeChange(value: string | null) {
  form.bizType = value
  form.bizUid = null
  form.bizName = ''
  form.bizObjectOptions = []

  if (!value || value === 'none') return

  form.bizObjectOptions = await getInventoryBizObjectOptions(value)
}

async function openCreateModal() {
  const payload = await getInventoryRequestForm()
  syncForm(payload)
  if (!form.usageTypeOptions?.length || !form.bizTypeOptions?.length) {
    form.usageTypeOptions = pageData.value.extraData?.usageTypeOptions || await getInventoryUsageTypeOptions()
    form.bizTypeOptions = pageData.value.extraData?.bizTypeOptions || await getInventoryBizTypeOptions()
  }
  showEditModal.value = true
}

async function openEditModal(row: InventoryRequestRow) {
  const payload = await getInventoryRequestForm(row.uid || undefined)
  syncForm(payload)
  if (form.bizType && form.bizType !== 'none' && !form.bizObjectOptions?.length) {
    form.bizObjectOptions = await getInventoryBizObjectOptions(form.bizType)
  }
  if (!form.usageTypeOptions?.length) form.usageTypeOptions = pageData.value.extraData?.usageTypeOptions || []
  if (!form.bizTypeOptions?.length) form.bizTypeOptions = pageData.value.extraData?.bizTypeOptions || []
  showEditModal.value = true
}

async function submitForm() {
  if (!ensureDetailListValid()) return

  submitting.value = true
  try {
    await saveInventoryRequest({
      ...form,
      detailList: [...(form.detailList || [])],
    })
    message.success(isResubmit.value ? '重新提交成功，已再次发起审批流程' : '提交成功')
    showEditModal.value = false
    loadTableData()
  } finally {
    submitting.value = false
  }
}

async function openDetailDrawer(row: InventoryRequestRow) {
  if (!row.uid) return
  detailLoading.value = true
  showDetailDrawer.value = true
  try {
    detailData.value = await getInventoryRequestDetail(row.uid)
  } finally {
    detailLoading.value = false
  }
}

async function handleDelete(row: InventoryRequestRow) {
  if (!row.uid) return
  await deleteInventoryRequest(row.uid)
  message.success('领料申请已删除')
  loadTableData()
}

function openItemPicker() {
  if (!form.warehouseUid) {
    message.error('请先选择领料仓库')
    return
  }
  selectedItemKeys.value = []
  showItemPicker.value = true
  itemQuery.currentPage = 1
  itemQuery.warehouseUidList = [form.warehouseUid]
  loadItems()
}

function appendSelectedItems() {
  const selectedRows = (itemPageData.value.list || []).filter(row => selectedItemKeys.value.includes(row.uid || ''))
  if (!selectedRows.length) {
    showItemPicker.value = false
    return
  }

  const currentMap = new Map((form.detailList || []).map(item => [item.itemUid, item]))
  selectedRows.forEach((row) => {
    if (!row.itemUid) return
    const existing = currentMap.get(row.itemUid)
    if (existing) {
      existing.totalQuantity = row.totalQuantity
      existing.availableQuantity = row.availableQuantity
      return
    }
    currentMap.set(row.itemUid, {
      itemUid: row.itemUid,
      name: row.name,
      image: row.image,
      type: row.type,
      typeName: row.typeName,
      unit: row.unit,
      unitName: row.unitName,
      spec: row.spec,
      material: row.material,
      supplierUid: row.supplierUid,
      supplierName: row.supplierName,
      quantity: 1,
      totalQuantity: row.totalQuantity,
      availableQuantity: row.availableQuantity,
      remark: '',
    })
  })
  form.detailList = Array.from(currentMap.values())
  selectedItemKeys.value = []
  showItemPicker.value = false
}

async function removeDetailRow(row: InventoryRequestItemDetail, index: number) {
  if (!row.uid) {
    form.detailList?.splice(index, 1)
    return
  }
  await deleteInventoryRequestDetail(row.uid)
  form.detailList?.splice(index, 1)
}

const columns = computed<DataTableColumns<InventoryRequestRow>>(() => [
  { title: '申请单号', key: 'code', width: 180, ellipsis: { tooltip: true } },
  { title: '领料仓库', key: 'warehouseName', width: 140, ellipsis: { tooltip: true } },
  { title: '用途类型', key: 'usageTypeName', width: 120, ellipsis: { tooltip: true } },
  { title: '关联对象', key: 'bizName', minWidth: 160, ellipsis: { tooltip: true } },
  {
    title: '状态',
    key: 'statusName',
    width: 120,
    render: row => h(NTag, { size: 'small', type: statusType(row.status) }, { default: () => row.statusName || '-' }),
  },
  { title: '当前节点', key: 'currentNodeName', width: 150, ellipsis: { tooltip: true } },
  { title: '总数量', key: 'totalQuantity', width: 90 },
  { title: '申请时间', key: 'applyTimeName', width: 180, ellipsis: { tooltip: true } },
  {
    title: '操作',
    key: 'actions',
    fixed: 'right',
    width: 220,
    render: row =>
      h(NSpace, { size: 8 }, {
        default: () => [
          h(
            NButton,
            { text: true, type: 'primary', onClick: () => openDetailDrawer(row) },
            { default: () => '详情' },
          ),
          String(row.status || '').toLowerCase().includes('reject')
            ? h(
                NButton,
                { text: true, type: 'info', onClick: () => openEditModal(row) },
                { default: () => '重新提交' },
              )
            : null,
          String(row.status || '').toLowerCase().includes('reject')
            ? h(
                NPopconfirm,
                { onPositiveClick: () => handleDelete(row) },
                {
                  trigger: () => h(NButton, { text: true, type: 'error' }, { default: () => '删除' }),
                  default: () => '确定删除当前领料申请吗？',
                },
              )
            : null,
        ],
      }),
  },
])

const detailColumns = computed<DataTableColumns<InventoryRequestItemDetail>>(() => [
  {
    title: '物料',
    key: 'name',
    minWidth: 240,
    render: row =>
      h('div', { class: 'request-item-cell' }, [
        row.image
          ? h(NImage, {
              src: row.image,
              width: 40,
              height: 40,
              objectFit: 'cover',
              previewDisabled: true,
              class: 'request-item-image',
            })
          : h('div', { class: 'request-item-image request-item-image--empty' }, '无图'),
        h('div', { class: 'min-w-0' }, [
          h('div', { class: 'truncate font-medium text-neutral-900 dark:text-neutral-100' }, row.name || '-'),
          h('div', { class: 'truncate text-xs text-neutral-500 dark:text-neutral-400' }, `${row.spec || '-'} / ${row.material || '-'}`),
        ]),
      ]),
  },
  { title: '类型', key: 'typeName', width: 120, ellipsis: { tooltip: true } },
  { title: '单位', key: 'unitName', width: 80 },
  { title: '可用库存', key: 'availableQuantity', width: 110 },
  {
    title: '申请数量',
    key: 'quantity',
    width: 120,
    render: (row, index) =>
      h(NInputNumber, {
        value: Number(row.quantity || 0),
        min: 1,
        precision: 2,
        onUpdateValue: (value) => {
          form.detailList![index].quantity = value || 1
        },
      }),
  },
  {
    title: '备注',
    key: 'remark',
    minWidth: 160,
    render: (row, index) =>
      h(NInput, {
        value: row.remark || '',
        placeholder: '备注',
        onUpdateValue: (value) => {
          form.detailList![index].remark = value
        },
      }),
  },
  {
    title: '操作',
    key: 'actions',
    fixed: 'right',
    width: 80,
    render: (row, index) =>
      h(
        NButton,
        { text: true, type: 'error', onClick: () => removeDetailRow(row, index) },
        { default: () => '删除' },
      ),
  },
])

const itemColumns = computed<DataTableColumns<InventoryOverviewRow>>(() => [
  { type: 'selection', multiple: true },
  { title: '名称', key: 'name', minWidth: 180, ellipsis: { tooltip: true } },
  { title: '规格', key: 'spec', width: 140, ellipsis: { tooltip: true } },
  { title: '材质', key: 'material', width: 120, ellipsis: { tooltip: true } },
  { title: '类型', key: 'typeName', width: 120, ellipsis: { tooltip: true } },
  { title: '单位', key: 'unitName', width: 80 },
  { title: '可用库存', key: 'availableQuantity', width: 110 },
  { title: '供应商', key: 'supplierName', minWidth: 140, ellipsis: { tooltip: true } },
])

const detailViewColumns = computed<DataTableColumns<InventoryRequestItemDetail>>(() => [
  { title: '名称', key: 'name', minWidth: 180, ellipsis: { tooltip: true } },
  { title: '规格', key: 'spec', width: 120, ellipsis: { tooltip: true } },
  { title: '材质', key: 'material', width: 120, ellipsis: { tooltip: true } },
  { title: '类型', key: 'typeName', width: 120, ellipsis: { tooltip: true } },
  { title: '单位', key: 'unitName', width: 80 },
  { title: '申请数量', key: 'quantity', width: 100 },
  { title: '已出库', key: 'issuedQuantity', width: 100 },
  { title: '可用库存', key: 'availableQuantity', width: 110 },
  { title: '备注', key: 'remark', minWidth: 160, ellipsis: { tooltip: true } },
])

onMounted(async () => {
  await Promise.all([loadWarehouses(), loadCommonOptions()])
  loadTableData()
})
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-4 p-4">
    <NCard size="small" :bordered="false">
      <NForm :model="query" label-placement="left" label-width="72">
        <div class="grid grid-cols-1 gap-3 md:grid-cols-4">
          <NFormItem label="搜索" class="request-query-item">
            <NInput v-model:value="query.key" clearable placeholder="单号/备注/关联对象" @keydown.enter.prevent="loadTableData" />
          </NFormItem>
          <NFormItem label="状态" class="request-query-item">
            <NSelect v-model:value="query.status" :options="pageData.extraData?.statusOptions || []" clearable placeholder="状态" />
          </NFormItem>
          <NFormItem label="领料仓库" class="request-query-item">
            <NSelect v-model:value="query.warehouseUid" :options="pageData.extraData?.warehouseOptions || []" clearable placeholder="领料仓库" />
          </NFormItem>
          <NFormItem label="用途类型" class="request-query-item">
            <NSelect v-model:value="query.usageType" :options="pageData.extraData?.usageTypeOptions || []" clearable placeholder="用途类型" />
          </NFormItem>
        </div>
        <div class="mt-3 flex items-center justify-between gap-3 flex-wrap">
          <NFlex size="small">
            <NButton type="primary" attr-type="button" @click="loadTableData">查询</NButton>
            <NButton attr-type="button" @click="resetQuery">重置</NButton>
          </NFlex>
          <NButton type="primary" secondary attr-type="button" @click="openCreateModal">我要领料</NButton>
        </div>
      </NForm>
    </NCard>

    <NCard size="small" :bordered="false" class="flex min-h-0 flex-1 flex-col">
      <div class="mb-3 flex items-center justify-between">
        <div class="text-sm text-neutral-500 dark:text-neutral-400">领料申请记录</div>
        <div class="text-sm text-neutral-500 dark:text-neutral-400">驳回后可重新提交或删除</div>
      </div>

      <NDataTable
        remote
        flex-height
        :loading="loading"
        :columns="columns"
        :data="pageData.list || []"
        :pagination="false"
        :scroll-x="1450"
        size="small"
      />

      <div class="mt-3 flex justify-end">
        <NPagination v-bind="pagination" :disabled="loading" :prefix="({ itemCount }) => `共 ${itemCount} 条`" />
      </div>
    </NCard>

    <NModal v-model:show="showEditModal" preset="card" class="w-[1260px] max-w-[96vw]" :title="isResubmit ? '重新提交领料申请' : '领料申请'">
      <div class="flex max-h-[82vh] min-h-0 flex-col gap-4 overflow-hidden">
        <div class="grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr]">
          <NCard size="small" embedded :bordered="false">
            <NForm label-placement="left" label-width="92">
              <div class="grid grid-cols-1 gap-x-4 gap-y-1 md:grid-cols-2">
                <NFormItem label="申请单号">
                  <NInput :value="form.code || '自动生成申请单号'" disabled />
                </NFormItem>
                <NFormItem label="领料仓库">
                  <NSelect :value="form.warehouseUid" :options="warehouseOptions" placeholder="请选择领料仓库" @update:value="handleWarehouseChange" />
                </NFormItem>
                <NFormItem label="用途类型">
                  <NSelect v-model:value="form.usageType" :options="form.usageTypeOptions || pageData.extraData?.usageTypeOptions || []" placeholder="请选择用途类型" />
                </NFormItem>
                <NFormItem label="业务对象类型">
                  <NSelect
                    :value="form.bizType"
                    :options="form.bizTypeOptions || pageData.extraData?.bizTypeOptions || []"
                    placeholder="请选择业务对象类型"
                    @update:value="handleBizTypeChange"
                  />
                </NFormItem>
                <NFormItem label="业务对象">
                  <NSelect
                    v-model:value="form.bizUid"
                    :options="form.bizObjectOptions || []"
                    placeholder="请选择业务对象"
                    :disabled="!form.bizType || form.bizType === 'none'"
                    filterable
                  />
                </NFormItem>
                <NFormItem label="申请时间">
                  <NDatePicker v-model:value="form.applyTime as number" type="datetime" class="w-full" />
                </NFormItem>
                <NFormItem label="期望时间">
                  <NDatePicker v-model:value="form.expectTime as number | null" type="datetime" clearable class="w-full" />
                </NFormItem>
                <NFormItem label="备注" class="md:col-span-2">
                  <NInput v-model:value="form.remark" type="textarea" :autosize="{ minRows: 2, maxRows: 4 }" placeholder="请输入备注" />
                </NFormItem>
              </div>
            </NForm>
          </NCard>

          <NCard size="small" embedded :bordered="false">
            <div class="text-sm font-medium text-neutral-900 dark:text-neutral-100">申请概览</div>
            <div class="mt-4 grid grid-cols-1 gap-3">
              <div class="rounded-lg bg-neutral-100 px-4 py-3 dark:bg-neutral-800">
                <div class="text-xs text-neutral-500 dark:text-neutral-400">明细数量</div>
                <div class="mt-1 text-2xl font-semibold">{{ form.detailList?.length || 0 }}</div>
              </div>
              <div class="rounded-lg bg-neutral-100 px-4 py-3 dark:bg-neutral-800">
                <div class="text-xs text-neutral-500 dark:text-neutral-400">申请总数</div>
                <div class="mt-1 text-2xl font-semibold">{{ totalQuantity }}</div>
              </div>
              <div class="rounded-lg bg-neutral-100 px-4 py-3 dark:bg-neutral-800">
                <div class="text-xs text-neutral-500 dark:text-neutral-400">说明</div>
                <div class="mt-1 text-sm text-neutral-600 dark:text-neutral-300">提交后会进入审批流程，被驳回后可重新编辑并提交。</div>
              </div>
            </div>
          </NCard>
        </div>

        <NCard size="small" embedded :bordered="false">
          <div class="mb-3 flex items-center justify-between">
            <div>
              <div class="text-sm font-medium text-neutral-900 dark:text-neutral-100">领料物料明细</div>
              <div class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">先选仓库，再把要领的物料加入明细并填写数量。</div>
            </div>
            <NButton type="primary" secondary attr-type="button" @click="openItemPicker">添加物料</NButton>
          </div>

          <NDataTable :columns="detailColumns" :data="form.detailList || []" :pagination="false" :scroll-x="1180" size="small" />
        </NCard>

        <div class="flex justify-end gap-2">
          <NButton attr-type="button" @click="showEditModal = false">取消</NButton>
          <NButton type="primary" attr-type="button" :loading="submitting" @click="submitForm">
            {{ isResubmit ? '重新提交审批' : '提交申请' }}
          </NButton>
        </div>
      </div>
    </NModal>

    <NModal v-model:show="showItemPicker" preset="card" class="w-[1180px] max-w-[96vw]" title="选择物料">
      <div class="flex max-h-[72vh] min-h-0 flex-col gap-3">
        <div class="grid grid-cols-1 gap-3 md:grid-cols-[minmax(220px,1fr)_auto]">
          <NInput v-model:value="itemQuery.key" clearable placeholder="名称/规格/材质" @keydown.enter.prevent="loadItems" />
          <NFlex size="small">
            <NButton type="primary" attr-type="button" @click="loadItems">查询</NButton>
            <NButton attr-type="button" @click="resetItemQuery">重置</NButton>
          </NFlex>
        </div>

        <NDataTable
          remote
          flex-height
          :row-key="row => row.uid || ''"
          :loading="itemLoading"
          :columns="itemColumns"
          :data="itemPageData.list || []"
          :pagination="false"
          :checked-row-keys="selectedItemKeys"
          :scroll-x="1100"
          @update:checked-row-keys="selectedItemKeys = $event"
        />

        <div class="flex items-center justify-between gap-3">
          <NPagination v-bind="itemPickerPagination" :disabled="itemLoading" :prefix="({ itemCount }) => `共 ${itemCount} 条`" />
          <div class="flex gap-2">
            <NButton attr-type="button" @click="showItemPicker = false">取消</NButton>
            <NButton type="primary" attr-type="button" @click="appendSelectedItems">确定添加</NButton>
          </div>
        </div>
      </div>
    </NModal>

    <NDrawer v-model:show="showDetailDrawer" :width="1040" placement="right">
      <NDrawerContent title="领料申请详情" :native-scrollbar="false">
        <div v-if="detailData" class="flex flex-col gap-4">
          <NDescriptions bordered :column="2" size="small" label-placement="left">
            <NDescriptionsItem label="申请单号">{{ detailData.code || '-' }}</NDescriptionsItem>
            <NDescriptionsItem label="流程状态">
              <NTag size="small" :type="statusType(detailData.status)">{{ detailData.statusName || '-' }}</NTag>
            </NDescriptionsItem>
            <NDescriptionsItem label="申请时间">{{ detailData.applyTimeName || '-' }}</NDescriptionsItem>
            <NDescriptionsItem label="期望时间">{{ detailData.expectTimeName || '-' }}</NDescriptionsItem>
            <NDescriptionsItem label="领料仓库">{{ detailData.warehouseName || '-' }}</NDescriptionsItem>
            <NDescriptionsItem label="当前节点">{{ detailData.currentNodeName || '-' }}</NDescriptionsItem>
            <NDescriptionsItem label="用途类型">{{ detailData.usageTypeName || '-' }}</NDescriptionsItem>
            <NDescriptionsItem label="业务类型">{{ detailData.bizTypeName || '-' }}</NDescriptionsItem>
            <NDescriptionsItem label="关联对象" :span="2">{{ detailData.bizName || '-' }}</NDescriptionsItem>
            <NDescriptionsItem label="备注" :span="2">{{ detailData.remark || '-' }}</NDescriptionsItem>
          </NDescriptions>

          <div class="grid grid-cols-2 gap-3 md:grid-cols-3">
            <NCard size="small" embedded>
              <div class="text-xs text-neutral-500 dark:text-neutral-400">明细数量</div>
              <div class="mt-1 text-xl font-semibold text-neutral-900 dark:text-neutral-50">{{ detailData.detailList?.length || 0 }}</div>
            </NCard>
            <NCard size="small" embedded>
              <div class="text-xs text-neutral-500 dark:text-neutral-400">申请总数</div>
              <div class="mt-1 text-xl font-semibold text-neutral-900 dark:text-neutral-50">{{ detailData.totalQuantity || 0 }}</div>
            </NCard>
            <NCard size="small" embedded>
              <div class="text-xs text-neutral-500 dark:text-neutral-400">状态</div>
              <div class="mt-1 text-xl font-semibold text-neutral-900 dark:text-neutral-50">{{ detailData.currentNodeName || '-' }}</div>
            </NCard>
          </div>

          <NDataTable :loading="detailLoading" :columns="detailViewColumns" :data="detailData.detailList || []" :pagination="false" :scroll-x="1180" size="small" />
        </div>
      </NDrawerContent>
    </NDrawer>
  </div>
</template>

<style scoped>
.request-query-item {
  margin-bottom: 0;
}

.request-item-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.request-item-image {
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 8px;
}

.request-item-image--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: rgba(148, 163, 184, 0.12);
  color: rgb(100, 116, 139);
  font-size: 12px;
}
</style>
