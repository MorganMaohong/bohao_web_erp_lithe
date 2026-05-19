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
  cancelInventoryCheck,
  completeInventoryCheck,
  deleteInventoryCheckDetail,
  getInventoryCheckDetail,
  getInventoryCheckForm,
  getInventoryChecks,
  getInventoryOverview,
  getTemplateWarehouses,
  saveInventoryCheck,
  type InventoryCheckDetail,
  type InventoryCheckForm,
  type InventoryCheckItemDetail,
  type InventoryCheckPageData,
  type InventoryCheckQuery,
  type InventoryCheckRow,
  type InventoryOverviewPageData,
  type InventoryOverviewQuery,
  type InventoryOverviewRow,
  type TemplateWarehousePageData,
} from '@/api'

import type { DataTableColumns, FormInst, FormRules, PaginationProps } from 'naive-ui'

defineOptions({
  name: 'InventoryCheck',
})

const message = useMessage()

const editFormRef = ref<FormInst>()

const loading = ref(false)
const submitting = ref(false)
const detailLoading = ref(false)
const itemLoading = ref(false)

const showEditModal = ref(false)
const showItemPicker = ref(false)
const showDetailDrawer = ref(false)

const pageData = ref<InventoryCheckPageData>({
  currentPage: 1,
  pageSize: 50,
  count: 0,
  list: [],
})

const query = reactive<InventoryCheckQuery>({
  currentPage: 1,
  pageSize: 50,
  key: '',
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
const detailData = ref<InventoryCheckDetail | null>(null)

function createEmptyForm(): InventoryCheckForm {
  return {
    code: '',
    type: '',
    startTime: Date.now(),
    endTime: null,
    warehouseUid: null,
    remark: '',
    imageList: [],
    detailList: [],
    typeOptions: [],
    warehouse: {},
  }
}

const form = reactive<InventoryCheckForm>(createEmptyForm())

const editFormRules: FormRules = {
  type: [
    {
      required: true,
      message: '请选择盘点类型',
      trigger: ['change', 'blur'],
    },
  ],
  warehouseUid: [
    {
      required: true,
      message: '请选择盘点仓库',
      trigger: ['change', 'blur'],
    },
  ],
}

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

watch(
  pageData,
  (value) => {
    pagination.page = value.currentPage || 1
    pagination.pageSize = value.pageSize || 50
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

const warehouseOptions = computed(() => (warehouseData.value.list || []).map(item => ({
  label: item.name || item.code || '-',
  value: item.uid || '',
})))

const totalQuantity = computed(() =>
  (form.detailList || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0),
)

const totalProfitQuantity = computed(() =>
  (form.detailList || []).reduce((sum, item) => sum + profitQuantity(item), 0),
)

const totalLossQuantity = computed(() =>
  (form.detailList || []).reduce((sum, item) => sum + lossQuantity(item), 0),
)

function syncForm(data?: Partial<InventoryCheckForm>) {
  Object.assign(form, createEmptyForm(), data || {}, {
    typeOptions: data?.typeOptions || [],
    detailList: [...(data?.detailList || [])],
    imageList: [...(data?.imageList || [])],
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

function statusType(status?: string) {
  const normalized = String(status || '').toUpperCase()
  if (normalized.includes('WAIT')) return 'warning'
  if (normalized.includes('COMPLETE')) return 'success'
  if (normalized.includes('CANCEL')) return 'default'
  return 'default'
}

function profitQuantity(row: InventoryCheckItemDetail) {
  const stock = Number(row.totalQuantity || 0)
  const input = Number(row.quantity || 0)
  return Math.max(input - stock, 0)
}

function lossQuantity(row: InventoryCheckItemDetail) {
  const stock = Number(row.totalQuantity || 0)
  const input = Number(row.quantity || 0)
  return Math.max(stock - input, 0)
}

function ensureDetailListValid() {
  if (!form.warehouseUid) {
    message.error('请先选择盘点仓库')
    return false
  }

  if (!form.detailList?.length) {
    message.error('盘点明细不能为空')
    return false
  }

  for (const item of form.detailList) {
    if (item.quantity === undefined || item.quantity === null || Number(item.quantity) < 0) {
      message.error(`【${item.name || '未命名物料'}】实盘数量不能小于 0`)
      return false
    }
  }

  return true
}

async function loadWarehouses() {
  warehouseData.value = await getTemplateWarehouses({
    currentPage: 1,
    pageSize: 500,
    key: '',
  })
}

async function loadTableData() {
  loading.value = true
  try {
    pageData.value = await getInventoryChecks({
      ...query,
      key: query.key || '',
    })
  } finally {
    loading.value = false
  }
}

function resetQuery() {
  Object.assign(query, {
    currentPage: 1,
    pageSize: 50,
    key: '',
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

async function openCreateModal() {
  const payload = await getInventoryCheckForm()
  syncForm(payload)
  showEditModal.value = true
}

async function openEditModal(row: InventoryCheckRow) {
  const payload = await getInventoryCheckForm(row.uid || undefined)
  syncForm(payload)
  showEditModal.value = true
}

async function submitForm(mode: 'save' | 'complete') {
  await editFormRef.value?.validate()
  if (!ensureDetailListValid()) return

  submitting.value = true
  try {
    const payload = {
      ...form,
      detailList: (form.detailList || []).map(item => ({
        ...item,
        profitQuantity: profitQuantity(item),
        lossQuantity: lossQuantity(item),
      })),
    }
    if (mode === 'save') {
      await saveInventoryCheck(payload)
      message.success('盘点单已保存')
    } else {
      await completeInventoryCheck(payload)
      message.success('盘点单已完成')
    }
    showEditModal.value = false
    loadTableData()
  } finally {
    submitting.value = false
  }
}

async function openDetailDrawer(row: InventoryCheckRow) {
  if (!row.uid) return
  detailLoading.value = true
  showDetailDrawer.value = true
  try {
    detailData.value = await getInventoryCheckDetail(row.uid)
  } finally {
    detailLoading.value = false
  }
}

async function handleCancel(row: InventoryCheckRow) {
  if (!row.uid) return
  await cancelInventoryCheck(row.uid)
  message.success('盘点单已取消')
  loadTableData()
}

function openItemPicker() {
  if (!form.warehouseUid) {
    message.warning('请先选择盘点仓库')
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

  const existing = new Set((form.detailList || []).map(item => item.itemUid))
  const newItems: InventoryCheckItemDetail[] = selectedRows
    .filter(item => item.itemUid && !existing.has(item.itemUid))
    .map(item => ({
      uid: null,
      itemUid: item.itemUid,
      code: item.uid || undefined,
      name: item.name,
      image: item.image,
      spec: item.spec,
      material: item.material,
      typeName: item.typeName,
      unitName: item.unitName,
      supplierName: item.supplierName,
      quantity: 0,
      profitQuantity: 0,
      lossQuantity: 0,
      vatTaxRate: item.vatTaxRate,
      purchasePriceWithTax: item.purchasePriceWithTax,
      purchasePriceWithoutTax: item.purchasePriceWithoutTax,
      totalQuantity: item.totalQuantity,
      availableQuantity: item.availableQuantity,
    }))

  form.detailList = [...(form.detailList || []), ...newItems]
  selectedItemKeys.value = []
  showItemPicker.value = false
}

async function removeDetailRow(row: InventoryCheckItemDetail, index: number) {
  if (!row.uid) {
    form.detailList?.splice(index, 1)
    return
  }

  await deleteInventoryCheckDetail(row.uid)
  form.detailList?.splice(index, 1)
}

const columns = computed<DataTableColumns<InventoryCheckRow>>(() => [
  { title: '编号', key: 'code', width: 160, ellipsis: { tooltip: true } },
  { title: '盘点仓库', key: 'warehouseName', width: 160, ellipsis: { tooltip: true } },
  { title: '类型', key: 'typeName', width: 140, ellipsis: { tooltip: true } },
  {
    title: '状态',
    key: 'statusName',
    width: 110,
    render: row => h(NTag, { size: 'small', type: statusType(row.status) }, { default: () => row.statusName || '-' }),
  },
  { title: '开始时间', key: 'startTimeName', width: 180, ellipsis: { tooltip: true } },
  { title: '结束时间', key: 'endTimeName', width: 180, ellipsis: { tooltip: true } },
  { title: '备注', key: 'remark', minWidth: 220, ellipsis: { tooltip: true } },
  {
    title: '操作',
    key: 'actions',
    fixed: 'right',
    width: 180,
    render: row =>
      h(NSpace, { size: 8 }, {
        default: () => [
          String(row.status || '').toUpperCase().includes('WAIT')
            ? h(
                NButton,
                { text: true, type: 'primary', onClick: () => openEditModal(row) },
                { default: () => '编辑' },
              )
            : h(
                NButton,
                { text: true, type: 'primary', onClick: () => openDetailDrawer(row) },
                { default: () => '详情' },
              ),
          String(row.status || '').toUpperCase().includes('WAIT')
            ? h(
                NPopconfirm,
                { onPositiveClick: () => handleCancel(row) },
                {
                  trigger: () => h(NButton, { text: true, type: 'warning' }, { default: () => '取消' }),
                  default: () => '确认取消这张盘点单？',
                },
              )
            : null,
        ],
      }),
  },
])

const detailColumns = computed<DataTableColumns<InventoryCheckItemDetail>>(() => [
  {
    title: '物料',
    key: 'name',
    minWidth: 240,
    render: row =>
      h('div', { class: 'check-item-cell' }, [
        row.image
          ? h(NImage, {
              src: row.image,
              width: 40,
              height: 40,
              objectFit: 'cover',
              previewDisabled: true,
              class: 'check-item-image',
            })
          : h('div', { class: 'check-item-image check-item-image--empty' }, '无图'),
        h('div', { class: 'min-w-0' }, [
          h('div', { class: 'truncate font-medium text-neutral-900 dark:text-neutral-100' }, row.name || '-'),
          h('div', { class: 'truncate text-xs text-neutral-500 dark:text-neutral-400' }, `${row.spec || '-'} / ${row.material || '-'}`),
        ]),
      ]),
  },
  { title: '供应商', key: 'supplierName', width: 140, ellipsis: { tooltip: true } },
  { title: '类型', key: 'typeName', width: 120, ellipsis: { tooltip: true } },
  { title: '单位', key: 'unitName', width: 80 },
  { title: '库存数量', key: 'totalQuantity', width: 110 },
  {
    title: '实盘数量',
    key: 'quantity',
    width: 120,
    render: (row, index) =>
      h(NInputNumber, {
        value: Number(row.quantity || 0),
        min: 0,
        precision: 2,
        onUpdateValue: (value) => {
          form.detailList![index].quantity = value || 0
        },
      }),
  },
  {
    title: '盘盈数量',
    key: 'profitQuantity',
    width: 120,
    render: row => h('span', {}, profitQuantity(row)),
  },
  {
    title: '盘亏数量',
    key: 'lossQuantity',
    width: 120,
    render: row => h('span', {}, lossQuantity(row)),
  },
  {
    title: '备注',
    key: 'remark',
    minWidth: 160,
    render: (row, index) =>
      h(NInput, {
        value: row.remark || '',
        placeholder: '明细备注',
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
        {
          text: true,
          type: 'error',
          onClick: () => removeDetailRow(row, index),
        },
        { default: () => '删除' },
      ),
  },
])

const itemColumns = computed<DataTableColumns<InventoryOverviewRow>>(() => [
  {
    type: 'selection',
    multiple: true,
  },
  { title: '名称', key: 'name', minWidth: 180, ellipsis: { tooltip: true } },
  { title: '供应商', key: 'supplierName', width: 140, ellipsis: { tooltip: true } },
  { title: '类型', key: 'typeName', width: 120, ellipsis: { tooltip: true } },
  { title: '单位', key: 'unitName', width: 80 },
  { title: '规格', key: 'spec', width: 120, ellipsis: { tooltip: true } },
  { title: '材质', key: 'material', width: 120, ellipsis: { tooltip: true } },
  { title: '库存数量', key: 'totalQuantity', width: 110 },
  { title: '可用库存', key: 'availableQuantity', width: 110 },
])

const detailViewColumns = computed<DataTableColumns<InventoryCheckItemDetail>>(() => [
  { title: '名称', key: 'name', minWidth: 180, ellipsis: { tooltip: true } },
  { title: '供应商', key: 'supplierName', width: 140, ellipsis: { tooltip: true } },
  { title: '类型', key: 'typeName', width: 120, ellipsis: { tooltip: true } },
  { title: '单位', key: 'unitName', width: 80 },
  { title: '库存数量', key: 'totalQuantity', width: 110 },
  { title: '实盘数量', key: 'quantity', width: 110 },
  { title: '盘盈数量', key: 'profitQuantity', width: 110 },
  { title: '盘亏数量', key: 'lossQuantity', width: 110 },
  { title: '备注', key: 'remark', minWidth: 160, ellipsis: { tooltip: true } },
])

onMounted(async () => {
  await loadWarehouses()
  loadTableData()
})
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-4 p-4">
    <NCard
      size="small"
      :bordered="false"
    >
      <NForm
        :model="query"
        label-placement="left"
        label-width="72"
      >
        <div class="grid grid-cols-1 gap-3 md:grid-cols-[minmax(260px,420px)_auto]">
          <NFormItem
            label="关键字"
            class="check-query-item"
          >
            <NInput
              v-model:value="query.key"
              clearable
              placeholder="请输入名称"
              @keydown.enter.prevent="loadTableData"
            />
          </NFormItem>
          <NFormItem class="check-query-item check-query-item--actions">
            <NFlex
              size="small"
              class="check-query-actions"
            >
              <NButton
                type="primary"
                attr-type="button"
                @click="loadTableData"
              >
                查询
              </NButton>
              <NButton
                attr-type="button"
                @click="resetQuery"
              >
                重置
              </NButton>
              <NButton
                type="primary"
                secondary
                attr-type="button"
                @click="openCreateModal"
              >
                新增盘点单
              </NButton>
            </NFlex>
          </NFormItem>
        </div>
      </NForm>
    </NCard>

    <NCard
      size="small"
      :bordered="false"
      class="flex min-h-0 flex-1 flex-col"
    >
      <div class="mb-3 flex items-center justify-between">
        <div class="text-sm text-neutral-500 dark:text-neutral-400">库存盘点记录</div>
        <div class="text-sm text-neutral-500 dark:text-neutral-400">草稿可编辑，完成后仅可查看</div>
      </div>

      <NDataTable
        remote
        flex-height
        :loading="loading"
        :columns="columns"
        :data="pageData.list || []"
        :pagination="false"
        :scroll-x="1500"
        size="small"
      />

      <div class="mt-3 flex justify-end">
        <NPagination
          v-bind="pagination"
          :disabled="loading"
          :prefix="({ itemCount }) => `共 ${itemCount} 条`"
        />
      </div>
    </NCard>

    <NModal
      v-model:show="showEditModal"
      preset="card"
      title="盘点单据信息"
      class="w-[1180px] max-w-[96vw]"
      :mask-closable="false"
    >
      <div class="flex max-h-[80vh] min-h-0 flex-col gap-4 overflow-hidden">
        <NForm
          ref="editFormRef"
          :model="form"
          :rules="editFormRules"
          label-placement="left"
          label-width="92"
        >
          <div class="grid grid-cols-1 gap-x-4 gap-y-1 md:grid-cols-3">
            <NFormItem label="编号">
              <NInput
                :value="form.code || '自动生成'"
                disabled
              />
            </NFormItem>
            <NFormItem
              label="盘点类型"
              path="type"
            >
              <NSelect
                v-model:value="form.type"
                :options="form.typeOptions || []"
                placeholder="请选择类型"
              />
            </NFormItem>
            <NFormItem label="盘点开始时间">
              <NDatePicker
                v-model:value="form.startTime as number"
                type="datetime"
                class="w-full"
              />
            </NFormItem>
            <NFormItem label="盘点结束时间">
              <NDatePicker
                v-model:value="form.endTime as number | null"
                type="datetime"
                clearable
                class="w-full"
              />
            </NFormItem>
            <NFormItem
              label="盘点仓库"
              path="warehouseUid"
            >
              <NSelect
                :value="form.warehouseUid"
                :options="warehouseOptions"
                placeholder="选择盘点仓库"
                @update:value="handleWarehouseChange"
              />
            </NFormItem>
            <NFormItem
              label="备注"
              class="md:col-span-3"
            >
              <NInput
                v-model:value="form.remark"
                type="textarea"
                :autosize="{ minRows: 2, maxRows: 4 }"
                placeholder="补充盘点说明"
              />
            </NFormItem>
          </div>
        </NForm>

        <NCard
          size="small"
          embedded
          :bordered="false"
        >
          <div class="mb-3 flex items-center justify-between">
            <div>
              <div class="text-sm font-medium text-neutral-900 dark:text-neutral-100">盘点明细</div>
              <div class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                先选择盘点仓库，再把需要盘点的物料加进来。
              </div>
            </div>
            <NButton
              type="primary"
              secondary
              attr-type="button"
              @click="openItemPicker"
            >
              添加物料
            </NButton>
          </div>

          <NDataTable
            :columns="detailColumns"
            :data="form.detailList || []"
            :pagination="false"
            :scroll-x="1560"
            size="small"
          />
        </NCard>

        <div class="grid grid-cols-2 gap-3 md:grid-cols-3">
          <NCard size="small" embedded>
            <div class="text-xs text-neutral-500 dark:text-neutral-400">实盘总数</div>
            <div class="mt-1 text-xl font-semibold text-neutral-900 dark:text-neutral-50">{{ totalQuantity }}</div>
          </NCard>
          <NCard size="small" embedded>
            <div class="text-xs text-neutral-500 dark:text-neutral-400">盘盈总数</div>
            <div class="mt-1 text-xl font-semibold text-neutral-900 dark:text-neutral-50">{{ totalProfitQuantity }}</div>
          </NCard>
          <NCard size="small" embedded>
            <div class="text-xs text-neutral-500 dark:text-neutral-400">盘亏总数</div>
            <div class="mt-1 text-xl font-semibold text-neutral-900 dark:text-neutral-50">{{ totalLossQuantity }}</div>
          </NCard>
        </div>

        <div class="flex justify-end gap-2">
          <NButton
            attr-type="button"
            @click="showEditModal = false"
          >
            关闭
          </NButton>
          <NButton
            type="primary"
            secondary
            attr-type="button"
            :loading="submitting"
            @click="submitForm('save')"
          >
            保存草稿
          </NButton>
          <NButton
            type="primary"
            attr-type="button"
            :loading="submitting"
            @click="submitForm('complete')"
          >
            完成盘点
          </NButton>
        </div>
      </div>
    </NModal>

    <NModal
      v-model:show="showItemPicker"
      preset="card"
      title="选择盘点物料"
      class="w-[1080px] max-w-[96vw]"
    >
      <div class="flex max-h-[72vh] min-h-0 flex-col gap-3">
        <div class="grid grid-cols-1 gap-3 md:grid-cols-[minmax(220px,1fr)_auto]">
          <NInput
            v-model:value="itemQuery.key"
            clearable
            placeholder="名称 / 规格 / 材质"
            @keydown.enter.prevent="loadItems"
          />
          <NFlex size="small">
            <NButton
              type="primary"
              attr-type="button"
              @click="loadItems"
            >
              查询
            </NButton>
            <NButton
              attr-type="button"
              @click="resetItemQuery"
            >
              重置
            </NButton>
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
          :scroll-x="1280"
          @update:checked-row-keys="selectedItemKeys = $event"
        />

        <div class="flex items-center justify-between gap-3">
          <NPagination
            v-bind="itemPickerPagination"
            :disabled="itemLoading"
            :prefix="({ itemCount }) => `共 ${itemCount} 条`"
          />
          <div class="flex gap-2">
            <NButton
              attr-type="button"
              @click="showItemPicker = false"
            >
              取消
            </NButton>
            <NButton
              type="primary"
              attr-type="button"
              @click="appendSelectedItems"
            >
              加入明细
            </NButton>
          </div>
        </div>
      </div>
    </NModal>

    <NDrawer
      v-model:show="showDetailDrawer"
      :width="980"
      placement="right"
    >
      <NDrawerContent
        title="盘点详情"
        :native-scrollbar="false"
      >
        <div
          v-if="detailData"
          class="flex flex-col gap-4"
        >
          <NDescriptions
            bordered
            :column="2"
            size="small"
            label-placement="left"
          >
            <NDescriptionsItem label="编号">{{ detailData.code || '-' }}</NDescriptionsItem>
            <NDescriptionsItem label="状态">
              <NTag size="small" :type="statusType(detailData.status)">{{ detailData.statusName || '-' }}</NTag>
            </NDescriptionsItem>
            <NDescriptionsItem label="盘点类型">{{ detailData.typeName || '-' }}</NDescriptionsItem>
            <NDescriptionsItem label="盘点仓库">{{ detailData.warehouseName || '-' }}</NDescriptionsItem>
            <NDescriptionsItem label="开始时间">{{ detailData.startTimeName || '-' }}</NDescriptionsItem>
            <NDescriptionsItem label="结束时间">{{ detailData.endTimeName || '-' }}</NDescriptionsItem>
            <NDescriptionsItem label="备注" :span="2">{{ detailData.remark || '-' }}</NDescriptionsItem>
          </NDescriptions>

          <div class="grid grid-cols-2 gap-3 md:grid-cols-3">
            <NCard size="small" embedded>
              <div class="text-xs text-neutral-500 dark:text-neutral-400">实盘总数</div>
              <div class="mt-1 text-xl font-semibold text-neutral-900 dark:text-neutral-50">{{ detailData.totalQuantity || 0 }}</div>
            </NCard>
            <NCard size="small" embedded>
              <div class="text-xs text-neutral-500 dark:text-neutral-400">盘盈总数</div>
              <div class="mt-1 text-xl font-semibold text-neutral-900 dark:text-neutral-50">{{ detailData.totalProfitQuantity || 0 }}</div>
            </NCard>
            <NCard size="small" embedded>
              <div class="text-xs text-neutral-500 dark:text-neutral-400">盘亏总数</div>
              <div class="mt-1 text-xl font-semibold text-neutral-900 dark:text-neutral-50">{{ detailData.totalLossQuantity || 0 }}</div>
            </NCard>
          </div>

          <NDataTable
            :loading="detailLoading"
            :columns="detailViewColumns"
            :data="detailData.detailList || []"
            :pagination="false"
            :scroll-x="1200"
            size="small"
          />
        </div>
      </NDrawerContent>
    </NDrawer>
  </div>
</template>

<style scoped>
.check-query-item {
  margin-bottom: 0;
}

.check-query-item--actions :deep(.n-form-item-blank) {
  justify-content: flex-end;
}

.check-query-actions {
  width: 100%;
  justify-content: flex-end;
}

.check-item-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.check-item-image {
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 8px;
}

.check-item-image--empty {
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
