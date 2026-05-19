<script setup lang="ts">
import {
  NAlert,
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
  cancelInventoryTransfer,
  completeInventoryTransfer,
  deleteInventoryTransferDetail,
  getInventoryOverview,
  getInventoryTransferDetail,
  getInventoryTransferForm,
  getInventoryTransfers,
  getTemplateWarehouses,
  saveInventoryTransfer,
  type InventoryOverviewPageData,
  type InventoryOverviewQuery,
  type InventoryOverviewRow,
  type InventoryTransferDetail,
  type InventoryTransferForm,
  type InventoryTransferItemDetail,
  type InventoryTransferPageData,
  type InventoryTransferQuery,
  type InventoryTransferRow,
  type TemplateWarehouse,
  type TemplateWarehousePageData,
} from '@/api'

import type { DataTableColumns, FormInst, FormRules, PaginationProps } from 'naive-ui'

defineOptions({
  name: 'InventoryTransfer',
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

const pageData = ref<InventoryTransferPageData>({
  currentPage: 1,
  pageSize: 50,
  count: 0,
  list: [],
})

const query = reactive<InventoryTransferQuery>({
  currentPage: 1,
  pageSize: 50,
  name: '',
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
const detailData = ref<InventoryTransferDetail | null>(null)

function createEmptyForm(): InventoryTransferForm {
  return {
    code: '',
    type: '',
    applyTime: Date.now(),
    expectTime: null,
    outWarehouseUid: null,
    inWarehouseUid: null,
    projectUid: null,
    remark: '',
    receiveUserName: '',
    receiveTime: null,
    receiveRemark: '',
    imageList: [],
    detailList: [],
    typeOptions: [],
    projectOptions: [],
    inWarehouse: {},
    outWarehouse: {},
  }
}

const form = reactive<InventoryTransferForm>(createEmptyForm())

const editFormRules: FormRules = {
  type: [
    {
      required: true,
      message: '请选择调拨类型',
      trigger: ['change', 'blur'],
    },
  ],
  applyTime: [
    {
      required: true,
      type: 'number',
      message: '请选择申请时间',
      trigger: ['change', 'blur'],
    },
  ],
  outWarehouseUid: [
    {
      required: true,
      message: '请选择调出仓库',
      trigger: ['change', 'blur'],
    },
  ],
  inWarehouseUid: [
    {
      required: true,
      message: '请选择调入仓库',
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

const outWarehouseOptions = computed(() =>
  warehouseOptions.value.map(option => ({
    ...option,
    disabled: Boolean(form.inWarehouseUid && option.value === form.inWarehouseUid),
  })),
)

const inWarehouseOptions = computed(() =>
  warehouseOptions.value.map(option => ({
    ...option,
    disabled: Boolean(form.outWarehouseUid && option.value === form.outWarehouseUid),
  })),
)

const totalQuantity = computed(() =>
  (form.detailList || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0),
)

const totalAmountWithTax = computed(() =>
  (form.detailList || []).reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.purchasePriceWithTax || 0),
    0,
  ),
)

const totalAmountWithoutTax = computed(() =>
  (form.detailList || []).reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.purchasePriceWithoutTax || 0),
    0,
  ),
)

const totalTaxAmount = computed(() => Number((totalAmountWithTax.value - totalAmountWithoutTax.value).toFixed(2)))

function syncForm(data?: Partial<InventoryTransferForm>) {
  Object.assign(form, createEmptyForm(), data || {}, {
    typeOptions: data?.typeOptions || [],
    projectOptions: data?.projectOptions || [],
    detailList: [...(data?.detailList || [])],
    imageList: [...(data?.imageList || [])],
    inWarehouse: data?.inWarehouse || {},
    outWarehouse: data?.outWarehouse || {},
  })
  syncWarehouseSelection()
}

function syncWarehouseSelection() {
  const warehouseMap = new Map((warehouseData.value.list || []).map(item => [item.uid, item]))
  const inWarehouse = warehouseMap.get(form.inWarehouseUid || '')
  const outWarehouse = warehouseMap.get(form.outWarehouseUid || '')

  form.inWarehouse = inWarehouse
    ? {
        uid: inWarehouse.uid,
        code: inWarehouse.code,
        name: inWarehouse.name,
      }
    : (form.inWarehouse || {})

  form.outWarehouse = outWarehouse
    ? {
        uid: outWarehouse.uid,
        code: outWarehouse.code,
        name: outWarehouse.name,
      }
    : (form.outWarehouse || {})
}

watch(
  () => warehouseData.value.list,
  () => {
    syncWarehouseSelection()
  },
)

function formatMoney(value?: number | null) {
  return Number(value || 0).toFixed(2)
}

function statusType(status?: string) {
  const normalized = String(status || '').toUpperCase()
  if (normalized.includes('WAIT')) return 'warning'
  if (normalized.includes('COMPLETE')) return 'success'
  if (normalized.includes('CANCEL')) return 'default'
  return 'default'
}

function ensureDetailListValid() {
  if (!form.outWarehouseUid) {
    message.error('请先选择调出仓库')
    return false
  }

  if (form.outWarehouseUid && form.inWarehouseUid && form.outWarehouseUid === form.inWarehouseUid) {
    message.error('调出仓库和调入仓库不能相同')
    return false
  }

  if (!form.detailList?.length) {
    message.error('调拨明细不能为空')
    return false
  }

  for (const item of form.detailList) {
    const quantity = Number(item.quantity || 0)
    const availableQuantity = Number(item.availableQuantity || 0)
    if (!quantity) {
      message.error(`【${item.name || '未命名物料'}】调拨数量必须大于 0`)
      return false
    }
    if (availableQuantity > 0 && quantity > availableQuantity) {
      message.error(`【${item.name || '未命名物料'}】调拨数量不能超过可用库存`)
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
    pageData.value = await getInventoryTransfers({
      ...query,
      name: query.name || '',
    })
  } finally {
    loading.value = false
  }
}

function resetQuery() {
  Object.assign(query, {
    currentPage: 1,
    pageSize: 50,
    name: '',
  })
  loadTableData()
}

async function loadItems() {
  itemLoading.value = true
  try {
    itemPageData.value = await getInventoryOverview({
      ...itemQuery,
      key: itemQuery.key || '',
      warehouseUidList: form.outWarehouseUid ? [form.outWarehouseUid] : [],
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
    warehouseUidList: form.outWarehouseUid ? [form.outWarehouseUid] : [],
  })
  loadItems()
}

function handleOutWarehouseChange(value: string | null) {
  if (value && value === form.inWarehouseUid) {
    message.error('调出仓库和调入仓库不能相同')
    return
  }

  const previousValue = form.outWarehouseUid
  form.outWarehouseUid = value
  syncWarehouseSelection()

  if (previousValue && previousValue !== value) {
    form.detailList = []
    selectedItemKeys.value = []
  }
}

function handleInWarehouseChange(value: string | null) {
  if (value && value === form.outWarehouseUid) {
    message.error('调出仓库和调入仓库不能相同')
    return
  }

  form.inWarehouseUid = value
  syncWarehouseSelection()
}

async function openCreateModal() {
  const payload = await getInventoryTransferForm()
  syncForm(payload)
  showEditModal.value = true
}

async function openEditModal(row: InventoryTransferRow) {
  const payload = await getInventoryTransferForm(row.uid || undefined)
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
      detailList: [...(form.detailList || [])],
    }
    if (mode === 'save') {
      await saveInventoryTransfer(payload)
      message.success('调拨单已保存')
    } else {
      await completeInventoryTransfer(payload)
      message.success('调拨单已提交')
    }
    showEditModal.value = false
    loadTableData()
  } finally {
    submitting.value = false
  }
}

async function openDetailDrawer(row: InventoryTransferRow) {
  if (!row.uid) return
  detailLoading.value = true
  showDetailDrawer.value = true
  try {
    detailData.value = await getInventoryTransferDetail(row.uid)
  } finally {
    detailLoading.value = false
  }
}

async function handleCancel(row: InventoryTransferRow) {
  if (!row.uid) return
  await cancelInventoryTransfer(row.uid)
  message.success('调拨单已取消')
  loadTableData()
}

function openItemPicker() {
  if (!form.outWarehouseUid) {
    message.warning('请先选择调出仓库')
    return
  }
  selectedItemKeys.value = []
  showItemPicker.value = true
  itemQuery.currentPage = 1
  itemQuery.warehouseUidList = [form.outWarehouseUid]
  loadItems()
}

function appendSelectedItems() {
  const selectedRows = (itemPageData.value.list || []).filter(row => selectedItemKeys.value.includes(row.uid || ''))
  if (!selectedRows.length) {
    showItemPicker.value = false
    return
  }

  const existing = new Set((form.detailList || []).map(item => item.itemUid))
  const newItems: InventoryTransferItemDetail[] = selectedRows
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
      quantity: 1,
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

async function removeDetailRow(row: InventoryTransferItemDetail, index: number) {
  if (!row.uid) {
    form.detailList?.splice(index, 1)
    return
  }

  await deleteInventoryTransferDetail(row.uid)
  form.detailList?.splice(index, 1)
}

const columns = computed<DataTableColumns<InventoryTransferRow>>(() => [
  { title: '编号', key: 'code', width: 160, ellipsis: { tooltip: true } },
  { title: '调出仓库', key: 'outWarehouseName', width: 150, ellipsis: { tooltip: true } },
  { title: '调入仓库', key: 'inWarehouseName', width: 150, ellipsis: { tooltip: true } },
  { title: '项目', key: 'projectName', width: 160, ellipsis: { tooltip: true } },
  { title: '类型', key: 'typeName', width: 140, ellipsis: { tooltip: true } },
  {
    title: '状态',
    key: 'statusName',
    width: 110,
    render: row => h(NTag, { size: 'small', type: statusType(row.status) }, { default: () => row.statusName || '-' }),
  },
  { title: '申请时间', key: 'applyTimeName', width: 180, ellipsis: { tooltip: true } },
  { title: '期望到货', key: 'expectTimeName', width: 180, ellipsis: { tooltip: true } },
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
                  default: () => '确认取消这张调拨单？',
                },
              )
            : null,
          !String(row.status || '').toUpperCase().includes('WAIT')
            ? h(
                NButton,
                { text: true, type: 'primary', onClick: () => openDetailDrawer(row) },
                { default: () => '明细' },
              )
            : null,
        ],
      }),
  },
])

const detailColumns = computed<DataTableColumns<InventoryTransferItemDetail>>(() => [
  {
    title: '物料',
    key: 'name',
    minWidth: 240,
    render: row =>
      h('div', { class: 'transfer-item-cell' }, [
        row.image
          ? h(NImage, {
              src: row.image,
              width: 40,
              height: 40,
              objectFit: 'cover',
              previewDisabled: true,
              class: 'transfer-item-image',
            })
          : h('div', { class: 'transfer-item-image transfer-item-image--empty' }, '无图'),
        h('div', { class: 'min-w-0' }, [
          h('div', { class: 'truncate font-medium text-neutral-900 dark:text-neutral-100' }, row.name || '-'),
          h('div', { class: 'truncate text-xs text-neutral-500 dark:text-neutral-400' }, `${row.spec || '-'} / ${row.material || '-'}`),
        ]),
      ]),
  },
  { title: '供应商', key: 'supplierName', width: 140, ellipsis: { tooltip: true } },
  { title: '类型', key: 'typeName', width: 120, ellipsis: { tooltip: true } },
  { title: '单位', key: 'unitName', width: 80 },
  {
    title: '税率%',
    key: 'vatTaxRate',
    width: 110,
    render: (row, index) =>
      h(NInputNumber, {
        value: Number(row.vatTaxRate || 0),
        min: 0,
        precision: 2,
        onUpdateValue: (value) => {
          form.detailList![index].vatTaxRate = value || 0
        },
      }),
  },
  {
    title: '含税单价',
    key: 'purchasePriceWithTax',
    width: 130,
    render: (row, index) =>
      h(NInputNumber, {
        value: Number(row.purchasePriceWithTax || 0),
        min: 0,
        precision: 4,
        onUpdateValue: (value) => {
          form.detailList![index].purchasePriceWithTax = value || 0
        },
      }),
  },
  {
    title: '未税单价',
    key: 'purchasePriceWithoutTax',
    width: 130,
    render: (row, index) =>
      h(NInputNumber, {
        value: Number(row.purchasePriceWithoutTax || 0),
        min: 0,
        precision: 4,
        onUpdateValue: (value) => {
          form.detailList![index].purchasePriceWithoutTax = value || 0
        },
      }),
  },
  { title: '库存数量', key: 'totalQuantity', width: 110 },
  { title: '可用库存', key: 'availableQuantity', width: 110 },
  {
    title: '调拨数量',
    key: 'quantity',
    width: 120,
    render: (row, index) =>
      h(NInputNumber, {
        value: Number(row.quantity || 0),
        min: 0,
        precision: 2,
        max: Number(row.availableQuantity || 0) || undefined,
        onUpdateValue: (value) => {
          form.detailList![index].quantity = value || 0
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
  { title: '税率%', key: 'vatTaxRate', width: 90 },
  { title: '含税单价', key: 'purchasePriceWithTax', width: 120 },
  { title: '未税单价', key: 'purchasePriceWithoutTax', width: 120 },
  { title: '规格', key: 'spec', width: 120, ellipsis: { tooltip: true } },
  { title: '材质', key: 'material', width: 120, ellipsis: { tooltip: true } },
  { title: '库存数量', key: 'totalQuantity', width: 110 },
  { title: '可用库存', key: 'availableQuantity', width: 110 },
])

const detailViewColumns = computed<DataTableColumns<InventoryTransferItemDetail>>(() => [
  { title: '名称', key: 'name', minWidth: 180, ellipsis: { tooltip: true } },
  { title: '供应商', key: 'supplierName', width: 140, ellipsis: { tooltip: true } },
  { title: '类型', key: 'typeName', width: 120, ellipsis: { tooltip: true } },
  { title: '单位', key: 'unitName', width: 80 },
  { title: '税率%', key: 'vatTaxRate', width: 90 },
  { title: '含税单价', key: 'purchasePriceWithTax', width: 120 },
  { title: '未税单价', key: 'purchasePriceWithoutTax', width: 120 },
  { title: '调拨数量', key: 'quantity', width: 110 },
  { title: '规格', key: 'spec', width: 120, ellipsis: { tooltip: true } },
  { title: '材质', key: 'material', width: 120, ellipsis: { tooltip: true } },
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
            class="transfer-query-item"
          >
            <NInput
              v-model:value="query.name"
              clearable
              placeholder="请输入名称"
              @keydown.enter.prevent="loadTableData"
            />
          </NFormItem>
          <NFormItem class="transfer-query-item transfer-query-item--actions">
            <NFlex
              size="small"
              class="transfer-query-actions"
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
                新增调拨单
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
        <div class="text-sm text-neutral-500 dark:text-neutral-400">库存调拨记录</div>
        <div class="text-sm text-neutral-500 dark:text-neutral-400">草稿可编辑，提交后仅可查看</div>
      </div>

      <NDataTable
        remote
        flex-height
        :loading="loading"
        :columns="columns"
        :data="pageData.list || []"
        :pagination="false"
        :scroll-x="1600"
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
      title="调拨单"
      class="w-[1180px] max-w-[96vw]"
      :mask-closable="false"
    >
      <div class="flex max-h-[80vh] min-h-0 flex-col gap-4 overflow-hidden">
        <NAlert
          type="info"
          :show-icon="false"
        >
          调拨应由调出仓库发起，货物到达后再由调入仓库确认收货。
        </NAlert>

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
              label="调拨类型"
              path="type"
            >
              <NSelect
                v-model:value="form.type"
                :options="form.typeOptions || []"
                placeholder="请选择类型"
              />
            </NFormItem>
            <NFormItem
              label="申请时间"
              path="applyTime"
            >
              <NDatePicker
                v-model:value="form.applyTime as number"
                type="datetime"
                class="w-full"
              />
            </NFormItem>
            <NFormItem label="期望到货">
              <NDatePicker
                v-model:value="form.expectTime as number | null"
                type="datetime"
                clearable
                class="w-full"
              />
            </NFormItem>
            <NFormItem
              label="调出仓库"
              path="outWarehouseUid"
            >
              <NSelect
                :value="form.outWarehouseUid"
                :options="outWarehouseOptions"
                placeholder="选择调出仓库"
                @update:value="handleOutWarehouseChange"
              />
            </NFormItem>
            <NFormItem
              label="调入仓库"
              path="inWarehouseUid"
            >
              <NSelect
                :value="form.inWarehouseUid"
                :options="inWarehouseOptions"
                placeholder="选择调入仓库"
                @update:value="handleInWarehouseChange"
              />
            </NFormItem>
            <NFormItem label="关联项目">
              <NSelect
                v-model:value="form.projectUid"
                clearable
                filterable
                :options="form.projectOptions || []"
                placeholder="选择项目"
              />
            </NFormItem>
            <NFormItem
              label="备注"
              class="md:col-span-2"
            >
              <NInput
                v-model:value="form.remark"
                type="textarea"
                :autosize="{ minRows: 2, maxRows: 4 }"
                placeholder="补充调拨说明"
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
              <div class="text-sm font-medium text-neutral-900 dark:text-neutral-100">调拨明细</div>
              <div class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                先选择调出仓库，再把需要调拨的物料加进来。
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
            :scroll-x="1680"
            size="small"
          />
        </NCard>

        <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
          <NCard
            size="small"
            embedded
          >
            <div class="text-xs text-neutral-500 dark:text-neutral-400">调拨总数</div>
            <div class="mt-1 text-xl font-semibold text-neutral-900 dark:text-neutral-50">{{ totalQuantity }}</div>
          </NCard>
          <NCard
            size="small"
            embedded
          >
            <div class="text-xs text-neutral-500 dark:text-neutral-400">含税金额</div>
            <div class="mt-1 text-xl font-semibold text-neutral-900 dark:text-neutral-50">{{ formatMoney(totalAmountWithTax) }}</div>
          </NCard>
          <NCard
            size="small"
            embedded
          >
            <div class="text-xs text-neutral-500 dark:text-neutral-400">未税金额</div>
            <div class="mt-1 text-xl font-semibold text-neutral-900 dark:text-neutral-50">{{ formatMoney(totalAmountWithoutTax) }}</div>
          </NCard>
          <NCard
            size="small"
            embedded
          >
            <div class="text-xs text-neutral-500 dark:text-neutral-400">税额</div>
            <div class="mt-1 text-xl font-semibold text-neutral-900 dark:text-neutral-50">{{ formatMoney(totalTaxAmount) }}</div>
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
            提交调拨
          </NButton>
        </div>
      </div>
    </NModal>

    <NModal
      v-model:show="showItemPicker"
      preset="card"
      title="选择调拨物料"
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
          :scroll-x="1400"
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
      :width="1040"
      placement="right"
    >
      <NDrawerContent
        title="调拨详情"
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
              <NTag
                size="small"
                :type="statusType(detailData.status)"
              >
                {{ detailData.statusName || '-' }}
              </NTag>
            </NDescriptionsItem>
            <NDescriptionsItem label="调拨类型">{{ detailData.typeName || '-' }}</NDescriptionsItem>
            <NDescriptionsItem label="关联项目">{{ detailData.projectName || '-' }}</NDescriptionsItem>
            <NDescriptionsItem label="调出仓库">{{ detailData.outWarehouseName || '-' }}</NDescriptionsItem>
            <NDescriptionsItem label="调入仓库">{{ detailData.inWarehouseName || '-' }}</NDescriptionsItem>
            <NDescriptionsItem label="申请时间">{{ detailData.applyTimeName || '-' }}</NDescriptionsItem>
            <NDescriptionsItem label="期望到货">{{ detailData.expectTimeName || '-' }}</NDescriptionsItem>
            <NDescriptionsItem label="收货人">{{ detailData.receiveUserName || '-' }}</NDescriptionsItem>
            <NDescriptionsItem label="收货时间">{{ detailData.receiveTimeName || '-' }}</NDescriptionsItem>
            <NDescriptionsItem
              label="收货说明"
              :span="2"
            >
              {{ detailData.receiveRemark || '-' }}
            </NDescriptionsItem>
            <NDescriptionsItem
              label="备注"
              :span="2"
            >
              {{ detailData.remark || '-' }}
            </NDescriptionsItem>
          </NDescriptions>

          <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
            <NCard
              size="small"
              embedded
            >
              <div class="text-xs text-neutral-500 dark:text-neutral-400">调拨总数</div>
              <div class="mt-1 text-xl font-semibold text-neutral-900 dark:text-neutral-50">{{ detailData.totalQuantity || 0 }}</div>
            </NCard>
            <NCard
              size="small"
              embedded
            >
              <div class="text-xs text-neutral-500 dark:text-neutral-400">含税金额</div>
              <div class="mt-1 text-xl font-semibold text-neutral-900 dark:text-neutral-50">
                {{ formatMoney(detailData.totalPurchasePriceWithTax || detailData.totalAmountWithTax) }}
              </div>
            </NCard>
            <NCard
              size="small"
              embedded
            >
              <div class="text-xs text-neutral-500 dark:text-neutral-400">未税金额</div>
              <div class="mt-1 text-xl font-semibold text-neutral-900 dark:text-neutral-50">{{ formatMoney(detailData.totalAmountWithoutTax) }}</div>
            </NCard>
            <NCard
              size="small"
              embedded
            >
              <div class="text-xs text-neutral-500 dark:text-neutral-400">税额</div>
              <div class="mt-1 text-xl font-semibold text-neutral-900 dark:text-neutral-50">{{ formatMoney(detailData.totalTaxAmount) }}</div>
            </NCard>
          </div>

          <NDataTable
            :loading="detailLoading"
            :columns="detailViewColumns"
            :data="detailData.detailList || []"
            :pagination="false"
            :scroll-x="1280"
            size="small"
          />
        </div>
      </NDrawerContent>
    </NDrawer>
  </div>
</template>

<style scoped>
.transfer-query-item {
  margin-bottom: 0;
}

.transfer-query-item--actions :deep(.n-form-item-blank) {
  justify-content: flex-end;
}

.transfer-query-actions {
  width: 100%;
  justify-content: flex-end;
}

.transfer-item-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.transfer-item-image {
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 8px;
}

.transfer-item-image--empty {
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
