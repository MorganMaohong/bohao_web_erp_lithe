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
  NText,
  useMessage,
} from 'naive-ui'
import { computed, h, onMounted, reactive, ref, watch } from 'vue'

import {
  cancelInventoryOutbound,
  completeInventoryOutbound,
  deleteInventoryOutboundDetail,
  getInventoryOutboundDetail,
  getInventoryOutboundForm,
  getInventoryOutbounds,
  getTemplateItems,
  getTemplateWarehouses,
  saveInventoryOutbound,
  type InventoryOutboundDetail,
  type InventoryOutboundForm,
  type InventoryOutboundItemDetail,
  type InventoryOutboundPageData,
  type InventoryOutboundQuery,
  type InventoryOutboundRow,
  type TemplateItem,
  type TemplateItemPageData,
  type TemplateItemQuery,
  type TemplateWarehouse,
  type TemplateWarehousePageData,
} from '@/api'

import type { DataTableColumns, FormInst, FormRules, PaginationProps } from 'naive-ui'

defineOptions({
  name: 'InventoryOutbound',
})

const message = useMessage()

const queryFormRef = ref<FormInst>()
const editFormRef = ref<FormInst>()

const loading = ref(false)
const submitting = ref(false)
const detailLoading = ref(false)
const itemLoading = ref(false)

const showEditModal = ref(false)
const showItemPicker = ref(false)
const showDetailDrawer = ref(false)
const activeEditId = ref<string | null>(null)

const pageData = ref<InventoryOutboundPageData>({
  currentPage: 1,
  pageSize: 50,
  count: 0,
  list: [],
  extraData: {
    typeOptions: [],
    statusOptions: [],
    warehouseOptions: [],
  },
})

const query = reactive<InventoryOutboundQuery>({
  currentPage: 1,
  pageSize: 50,
  key: '',
  type: null,
  warehouseUid: null,
  status: null,
})

const warehouseData = ref<TemplateWarehousePageData>({
  currentPage: 1,
  pageSize: 500,
  count: 0,
  list: [],
})

const itemPageData = ref<TemplateItemPageData>({
  currentPage: 1,
  pageSize: 50,
  count: 0,
  list: [],
})

const itemQuery = reactive<TemplateItemQuery>({
  currentPage: 1,
  pageSize: 50,
  key: '',
  warehouseUid: '',
})

const selectedItemKeys = ref<Array<string | number>>([])
const detailData = ref<InventoryOutboundDetail | null>(null)

function createEmptyForm(): InventoryOutboundForm {
  return {
    code: '',
    type: '',
    otherType: '',
    time: Date.now(),
    warehouseUid: '',
    projectUid: '',
    customerName: '',
    handlerName: '',
    remark: '',
    imageList: [],
    detailList: [],
    typeOptions: pageData.value.extraData?.typeOptions || [],
    projectOptions: [],
    warehouse: {},
  }
}

const form = reactive<InventoryOutboundForm>(createEmptyForm())

const editFormRules: FormRules = {
  type: [
    {
      required: true,
      message: '请选择出库类型',
      trigger: ['change', 'blur'],
    },
  ],
  time: [
    {
      required: true,
      type: 'number',
      message: '请选择出库时间',
      trigger: ['change', 'blur'],
    },
  ],
  warehouseUid: [
    {
      required: true,
      message: '请选择出库仓库',
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

const warehouseOptions = computed(() => (warehouseData.value.list || []).map(item => ({
  label: item.name || item.code || '-',
  value: item.uid || '',
})))

const isOtherType = computed(() => String(form.type || '').toUpperCase().includes('OTHER'))

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

function syncForm(data?: Partial<InventoryOutboundForm>) {
  Object.assign(form, createEmptyForm(), data || {}, {
    typeOptions: data?.typeOptions || pageData.value.extraData?.typeOptions || [],
    projectOptions: data?.projectOptions || [],
    detailList: [...(data?.detailList || [])],
    imageList: [...(data?.imageList || [])],
    warehouse: data?.warehouse || {},
  })
}

function normalizeWarehouseSelection() {
  const matchedWarehouse = (warehouseData.value.list || []).find(item => item.uid === form.warehouseUid)
  form.warehouse = matchedWarehouse
    ? {
        uid: matchedWarehouse.uid,
        code: matchedWarehouse.code,
        name: matchedWarehouse.name,
      }
    : {}
}

watch(
  () => form.warehouseUid,
  () => {
    normalizeWarehouseSelection()
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
  if (!form.detailList?.length) {
    message.error('出库明细不能为空')
    return false
  }

  for (const item of form.detailList) {
    if (!Number(item.quantity || 0)) {
      message.error(`【${item.name || '未命名物料'}】出库数量必须大于 0`)
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
    pageData.value = await getInventoryOutbounds({
      ...query,
      key: query.key || '',
      type: query.type || null,
      warehouseUid: query.warehouseUid || null,
      status: query.status || null,
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
    type: null,
    warehouseUid: null,
    status: null,
  })
  loadTableData()
}

async function openCreateModal() {
  activeEditId.value = null
  const payload = await getInventoryOutboundForm()
  syncForm(payload)
  normalizeWarehouseSelection()
  showEditModal.value = true
}

async function openEditModal(row: InventoryOutboundRow) {
  activeEditId.value = row.uid || null
  const payload = await getInventoryOutboundForm(row.uid || undefined)
  syncForm(payload)
  normalizeWarehouseSelection()
  showEditModal.value = true
}

async function submitForm(mode: 'save' | 'complete') {
  await editFormRef.value?.validate()
  if (!ensureDetailListValid()) return
  if (submitting.value) return

  submitting.value = true
  try {
    if (mode === 'save') {
      await saveInventoryOutbound({ ...form, detailList: [...(form.detailList || [])] })
      message.success('出库单已保存')
    } else {
      await completeInventoryOutbound({ ...form, detailList: [...(form.detailList || [])] })
      message.success('出库单已完成')
    }
    showEditModal.value = false
    await loadTableData()
  } finally {
    submitting.value = false
  }
}

async function openDetailDrawer(row: InventoryOutboundRow) {
  if (!row.uid) return
  showDetailDrawer.value = true
  detailLoading.value = true
  try {
    detailData.value = await getInventoryOutboundDetail(row.uid)
  } finally {
    detailLoading.value = false
  }
}

async function handleCancel(row: InventoryOutboundRow) {
  if (!row.uid) return
  await cancelInventoryOutbound(row.uid)
  message.success('出库单已取消')
  loadTableData()
}

async function removeDetailRow(row: InventoryOutboundItemDetail, index: number) {
  if (row.uid) {
    await deleteInventoryOutboundDetail(row.uid)
  }
  form.detailList?.splice(index, 1)
}

async function loadItems() {
  itemLoading.value = true
  try {
    itemPageData.value = await getTemplateItems({
      ...itemQuery,
      warehouseUid: form.warehouseUid || '',
    })
  } finally {
    itemLoading.value = false
  }
}

function resetItemQuery() {
  itemQuery.key = ''
  itemQuery.currentPage = 1
  loadItems()
}

async function openItemPicker() {
  if (!form.warehouseUid) {
    message.warning('请先选择出库仓库')
    return
  }
  selectedItemKeys.value = []
  itemQuery.currentPage = 1
  itemQuery.warehouseUid = form.warehouseUid
  await loadItems()
  showItemPicker.value = true
}

function itemAlreadyExists(uid?: string | null) {
  return (form.detailList || []).some(item => item.itemUid === uid)
}

function appendSelectedItems() {
  const selectedSet = new Set(selectedItemKeys.value.map(value => String(value)))
  const candidates = (itemPageData.value.list || []).filter(item => selectedSet.has(String(item.uid || '')))

  if (!form.detailList) form.detailList = []

  candidates.forEach((item) => {
    if (itemAlreadyExists(item.uid)) return
    form.detailList?.push({
      itemUid: item.uid || '',
      code: item.uid || '',
      name: item.name,
      image: item.image,
      spec: item.spec,
      material: item.material,
      typeName: item.typeName,
      unitName: item.unitName,
      supplierName: item.supplierName,
      purchasePriceWithTax: item.purchasePriceWithTax,
      purchasePriceWithoutTax: item.purchasePriceWithoutTax,
      quantity: 1,
      remark: '',
    })
  })

  showItemPicker.value = false
}

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

const columns = computed<DataTableColumns<InventoryOutboundRow>>(() => [
  { title: '编号', key: 'code', width: 160, ellipsis: { tooltip: true } },
  { title: '仓库', key: 'warehouseName', width: 140, ellipsis: { tooltip: true } },
  { title: '项目', key: 'projectName', width: 160, ellipsis: { tooltip: true } },
  { title: '客户/领用方', key: 'customerName', width: 160, ellipsis: { tooltip: true } },
  { title: '经手人', key: 'handlerName', width: 120, ellipsis: { tooltip: true } },
  { title: '类型', key: 'typeName', width: 120, ellipsis: { tooltip: true } },
  {
    title: '状态',
    key: 'statusName',
    width: 110,
    render: row => h(NTag, { size: 'small', type: statusType(row.status) }, { default: () => row.statusName || '-' }),
  },
  { title: '出库时间', key: 'timeName', width: 180, ellipsis: { tooltip: true } },
  { title: '备注', key: 'remark', minWidth: 220, ellipsis: { tooltip: true } },
  {
    title: '操作',
    key: 'actions',
    fixed: 'right',
    width: 180,
    render: (row) =>
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
                  default: () => '确认取消这张出库单？',
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

const detailColumns = computed<DataTableColumns<InventoryOutboundItemDetail>>(() => [
  {
    title: '物料',
    key: 'name',
    minWidth: 240,
    render: row =>
      h('div', { class: 'outbound-item-cell' }, [
        row.image
          ? h(NImage, {
              src: row.image,
              width: 40,
              height: 40,
              objectFit: 'cover',
              previewDisabled: true,
              class: 'outbound-item-image',
            })
          : h('div', { class: 'outbound-item-image outbound-item-image--empty' }, '无图'),
        h('div', { class: 'min-w-0' }, [
          h('div', { class: 'truncate font-medium text-neutral-900 dark:text-neutral-100' }, row.name || '-'),
          h('div', { class: 'truncate text-xs text-neutral-500 dark:text-neutral-400' }, `${row.spec || '-'} / ${row.material || '-'}`),
        ]),
      ]),
  },
  { title: '类型', key: 'typeName', width: 120, ellipsis: { tooltip: true } },
  { title: '单位', key: 'unitName', width: 80 },
  {
    title: '数量',
    key: 'quantity',
    width: 110,
    render: (row, index) =>
      h(NInputNumber, {
        value: Number(row.quantity || 0),
        min: 0,
        precision: 0,
        onUpdateValue: (value) => {
          form.detailList![index].quantity = value || 0
        },
      }),
  },
  {
    title: '单价(含税)',
    key: 'purchasePriceWithTax',
    width: 120,
    render: (row, index) =>
      h(NInputNumber, {
        value: Number(row.purchasePriceWithTax || 0),
        min: 0,
        precision: 2,
        onUpdateValue: (value) => {
          form.detailList![index].purchasePriceWithTax = value || 0
        },
      }),
  },
  {
    title: '单价(未税)',
    key: 'purchasePriceWithoutTax',
    width: 120,
    render: (row, index) =>
      h(NInputNumber, {
        value: Number(row.purchasePriceWithoutTax || 0),
        min: 0,
        precision: 2,
        onUpdateValue: (value) => {
          form.detailList![index].purchasePriceWithoutTax = value || 0
        },
      }),
  },
  {
    title: '金额(含税)',
    key: 'amountWithTax',
    width: 120,
    render: row => formatMoney(Number(row.quantity || 0) * Number(row.purchasePriceWithTax || 0)),
  },
  {
    title: '备注',
    key: 'remark',
    minWidth: 160,
    render: (row, index) =>
      h(NInput, {
        value: row.remark || '',
        onUpdateValue: (value) => {
          form.detailList![index].remark = value
        },
      }),
  },
  {
    title: '操作',
    key: 'actions',
    width: 90,
    render: (row, index) =>
      h(
        NButton,
        {
          text: true,
          type: 'error',
          onClick: () => removeDetailRow(row, index),
        },
        { default: () => '移除' },
      ),
  },
])

const itemColumns = computed<DataTableColumns<TemplateItem>>(() => [
  {
    type: 'selection',
    multiple: true,
    disabled: row => itemAlreadyExists(row.uid),
  },
  {
    title: '物料',
    key: 'name',
    minWidth: 240,
    render: row =>
      h('div', { class: 'outbound-item-cell' }, [
        row.image
          ? h(NImage, {
              src: row.image,
              width: 36,
              height: 36,
              objectFit: 'cover',
              previewDisabled: true,
              class: 'outbound-item-image',
            })
          : h('div', { class: 'outbound-item-image outbound-item-image--empty' }, '无图'),
        h('div', { class: 'min-w-0' }, [
          h('div', { class: 'truncate font-medium text-neutral-900 dark:text-neutral-100' }, row.name || '-'),
          h('div', { class: 'truncate text-xs text-neutral-500 dark:text-neutral-400' }, `${row.spec || '-'} / ${row.material || '-'}`),
        ]),
      ]),
  },
  { title: '类型', key: 'typeName', width: 120, ellipsis: { tooltip: true } },
  { title: '单位', key: 'unitName', width: 80 },
  { title: '供应商', key: 'supplierName', width: 140, ellipsis: { tooltip: true } },
  {
    title: '库存',
    key: 'quantity',
    width: 100,
    render: row => h(NText, null, { default: () => String(Number(row.purchasePriceWithTax || 0).toFixed(2)) }),
  },
])

const detailViewColumns = computed<DataTableColumns<InventoryOutboundItemDetail>>(() => [
  {
    title: '物料',
    key: 'name',
    minWidth: 240,
    render: row =>
      h('div', { class: 'outbound-item-cell' }, [
        row.image
          ? h(NImage, {
              src: row.image,
              width: 40,
              height: 40,
              objectFit: 'cover',
              previewDisabled: true,
              class: 'outbound-item-image',
            })
          : h('div', { class: 'outbound-item-image outbound-item-image--empty' }, '无图'),
        h('div', { class: 'min-w-0' }, [
          h('div', { class: 'truncate font-medium text-neutral-900 dark:text-neutral-100' }, row.name || '-'),
          h('div', { class: 'truncate text-xs text-neutral-500 dark:text-neutral-400' }, `${row.spec || '-'} / ${row.material || '-'}`),
        ]),
      ]),
  },
  { title: '类型', key: 'typeName', width: 120, ellipsis: { tooltip: true } },
  { title: '单位', key: 'unitName', width: 80 },
  { title: '数量', key: 'quantity', width: 100, render: row => String(Number(row.quantity || 0)) },
  { title: '单价(含税)', key: 'purchasePriceWithTax', width: 120, render: row => formatMoney(row.purchasePriceWithTax) },
  { title: '单价(未税)', key: 'purchasePriceWithoutTax', width: 120, render: row => formatMoney(row.purchasePriceWithoutTax) },
  {
    title: '金额(含税)',
    key: 'amountWithTax',
    width: 120,
    render: row => formatMoney(Number(row.quantity || 0) * Number(row.purchasePriceWithTax || 0)),
  },
  { title: '备注', key: 'remark', minWidth: 180, ellipsis: { tooltip: true } },
])

onMounted(async () => {
  await Promise.all([loadWarehouses(), loadTableData()])
})
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-3 p-3">
    <NCard
      size="small"
      :bordered="false"
      class="outbound-query-card"
    >
      <NForm
        ref="queryFormRef"
        class="outbound-query-form"
      >
        <div class="outbound-query-bar">
          <NFormItem class="outbound-query-item outbound-query-item--keyword">
            <NInput
              v-model:value="query.key"
              clearable
              placeholder="请输入关键字"
              @keydown.enter.prevent="loadTableData"
            />
          </NFormItem>
          <NFormItem class="outbound-query-item">
            <NSelect
              v-model:value="query.warehouseUid"
              clearable
              :options="pageData.extraData?.warehouseOptions || warehouseOptions"
              placeholder="仓库"
            />
          </NFormItem>
          <NFormItem class="outbound-query-item">
            <NSelect
              v-model:value="query.type"
              clearable
              :options="pageData.extraData?.typeOptions || []"
              placeholder="类型"
            />
          </NFormItem>
          <NFormItem class="outbound-query-item">
            <NSelect
              v-model:value="query.status"
              clearable
              :options="pageData.extraData?.statusOptions || []"
              placeholder="状态"
            />
          </NFormItem>
          <NFormItem class="outbound-query-item outbound-query-item--actions">
            <NFlex
              size="small"
              class="outbound-query-actions"
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
                新增出库单
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
        <div class="text-sm text-neutral-500 dark:text-neutral-400">其他出库记录</div>
        <div class="text-sm text-neutral-500 dark:text-neutral-400">草稿可编辑，完成后仅可查看</div>
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
      title="其他出库单"
      class="w-[1120px] max-w-[96vw]"
      :mask-closable="false"
    >
      <div class="flex max-h-[78vh] min-h-0 flex-col gap-4 overflow-hidden">
        <NForm
          ref="editFormRef"
          :model="form"
          :rules="editFormRules"
          label-placement="left"
          label-width="86"
        >
          <div class="grid grid-cols-1 gap-x-4 gap-y-1 md:grid-cols-3">
            <NFormItem label="编号">
              <NInput
                :value="form.code || '自动生成'"
                disabled
              />
            </NFormItem>
            <NFormItem
              label="出库类型"
              path="type"
            >
              <NSelect
                v-model:value="form.type"
                :options="form.typeOptions || []"
                placeholder="请选择类型"
              />
            </NFormItem>
            <NFormItem
              label="出库时间"
              path="time"
            >
              <NDatePicker
                v-model:value="form.time as number"
                type="datetime"
                class="w-full"
              />
            </NFormItem>
            <NFormItem
              v-if="isOtherType"
              label="其他名称"
            >
              <NInput
                v-model:value="form.otherType"
                placeholder="请输入其他类型名称"
              />
            </NFormItem>
            <NFormItem
              label="出库仓库"
              path="warehouseUid"
            >
              <NSelect
                v-model:value="form.warehouseUid"
                :options="warehouseOptions"
                placeholder="选择仓库"
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
            <NFormItem label="客户/领用方">
              <NInput
                v-model:value="form.customerName"
                placeholder="请输入客户或领用方"
              />
            </NFormItem>
            <NFormItem label="经手人">
              <NInput
                v-model:value="form.handlerName"
                placeholder="请输入经手人"
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
                placeholder="补充备注信息"
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
              <div class="text-sm font-medium text-neutral-900 dark:text-neutral-100">出库明细</div>
              <div class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                先选仓库，再把需要出库的物料加进来。
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
            :scroll-x="1380"
            size="small"
          />
        </NCard>

        <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
          <NCard
            size="small"
            embedded
          >
            <div class="text-xs text-neutral-500 dark:text-neutral-400">总数量</div>
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
            完成出库
          </NButton>
        </div>
      </div>
    </NModal>

    <NModal
      v-model:show="showItemPicker"
      preset="card"
      title="选择物料"
      class="w-[980px] max-w-[94vw]"
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
          :scroll-x="980"
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
      :width="960"
      placement="right"
    >
      <NDrawerContent
        title="其他出库详情"
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
            <NDescriptionsItem label="仓库">{{ detailData.warehouseName || '-' }}</NDescriptionsItem>
            <NDescriptionsItem label="类型">{{ detailData.typeName || '-' }}</NDescriptionsItem>
            <NDescriptionsItem label="项目">{{ detailData.projectName || '-' }}</NDescriptionsItem>
            <NDescriptionsItem label="出库时间">{{ detailData.timeName || '-' }}</NDescriptionsItem>
            <NDescriptionsItem label="客户/领用方">{{ detailData.customerName || '-' }}</NDescriptionsItem>
            <NDescriptionsItem label="经手人">{{ detailData.handlerName || '-' }}</NDescriptionsItem>
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
              <div class="text-xs text-neutral-500 dark:text-neutral-400">总数量</div>
              <div class="mt-1 text-xl font-semibold text-neutral-900 dark:text-neutral-50">{{ detailData.totalQuantity || 0 }}</div>
            </NCard>
            <NCard
              size="small"
              embedded
            >
              <div class="text-xs text-neutral-500 dark:text-neutral-400">含税金额</div>
              <div class="mt-1 text-xl font-semibold text-neutral-900 dark:text-neutral-50">
                {{ formatMoney(detailData.totalAmountWithTax) }}
              </div>
            </NCard>
            <NCard
              size="small"
              embedded
            >
              <div class="text-xs text-neutral-500 dark:text-neutral-400">税额</div>
              <div class="mt-1 text-xl font-semibold text-neutral-900 dark:text-neutral-50">
                {{ formatMoney(detailData.totalTaxAmount) }}
              </div>
            </NCard>
            <NCard
              size="small"
              embedded
            >
              <div class="text-xs text-neutral-500 dark:text-neutral-400">图片数</div>
              <div class="mt-1 text-xl font-semibold text-neutral-900 dark:text-neutral-50">
                {{ detailData.imageList?.length || 0 }}
              </div>
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
        <div
          v-else
          class="py-10 text-center text-neutral-500 dark:text-neutral-400"
        >
          {{ detailLoading ? '加载中...' : '暂无详情' }}
        </div>
      </NDrawerContent>
    </NDrawer>
  </div>
</template>

<style scoped>
.outbound-query-form:deep(.n-form-item) {
  margin-bottom: 0;
}

.outbound-query-form:deep(.n-form-item-label) {
  display: none;
}

.outbound-query-card:deep(.n-card__content) {
  padding: 12px 16px;
}

.outbound-query-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.outbound-query-item {
  flex: 1 1 120px;
  min-width: 120px;
}

.outbound-query-item--keyword {
  flex: 1.8 1 220px;
}

.outbound-query-item--actions {
  flex: 0 0 auto;
  min-width: auto;
}

.outbound-query-actions {
  height: 100%;
  align-items: center;
  white-space: nowrap;
  gap: 6px;
}

.outbound-query-actions :deep(.n-button) {
  padding-left: 10px;
  padding-right: 10px;
}

.outbound-item-cell {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.outbound-item-image {
  flex: 0 0 auto;
  overflow: hidden;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.18);
}

.outbound-item-image--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(248, 250, 252);
  color: rgb(148, 163, 184);
  font-size: 12px;
}

:global(.dark) .outbound-item-image--empty {
  background: rgb(51, 65, 85);
  color: rgb(100, 116, 139);
}

@media (max-width: 900px) {
  .outbound-query-item,
  .outbound-query-item--actions {
    flex: 1 1 140px;
    min-width: 140px;
  }

  .outbound-query-item--keyword {
    flex: 1 1 100%;
    min-width: 0;
  }

  .outbound-query-actions {
    align-items: center;
    flex-wrap: wrap;
  }
}
</style>
