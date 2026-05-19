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
  NStatistic,
  NTag,
  useMessage,
} from 'naive-ui'
import { computed, h, onMounted, reactive, ref } from 'vue'

import {
  createPurchaseApplyOrder,
  deletePurchaseApply,
  getPurchaseApplyDetail,
  getPurchaseApplyForm,
  getPurchaseApplies,
  getTemplateItems,
  savePurchaseApply,
  type PurchaseApplyDetail,
  type PurchaseApplyForm,
  type PurchaseApplyItemDetail,
  type PurchaseApplyPageData,
  type PurchaseApplyQuery,
  type PurchaseApplyRow,
  type TemplateItem,
  type TemplateItemPageData,
} from '@/api'

import type { DataTableColumns, PaginationProps } from 'naive-ui'

defineOptions({
  name: 'PurchaseApply',
})

const message = useMessage()

const loading = ref(false)
const submitting = ref(false)
const detailLoading = ref(false)
const creatingOrder = ref(false)
const itemLoading = ref(false)

const showEditModal = ref(false)
const showItemsModal = ref(false)
const showDetailDrawer = ref(false)

const query = reactive<PurchaseApplyQuery>({
  currentPage: 1,
  pageSize: 20,
  name: '',
})

const pageData = ref<PurchaseApplyPageData>({
  currentPage: 1,
  pageSize: 20,
  count: 0,
  list: [],
  extraData: {},
})

const itemQuery = reactive({
  currentPage: 1,
  pageSize: 50,
  key: '',
})

const itemPageData = ref<TemplateItemPageData>({
  currentPage: 1,
  pageSize: 50,
  count: 0,
  list: [],
})

const selectedItemKeys = ref<Array<string | number>>([])
const detailData = ref<PurchaseApplyDetail | null>(null)

function createEmptyForm(): PurchaseApplyForm {
  return {
    code: '',
    address: '',
    applyTime: Date.now(),
    expectTime: null,
    sourceType: null,
    warehouseUid: null,
    remark: '',
    detailList: [],
    sourceTypeOptions: [],
    warehouseOptions: [],
    supplierOptions: [],
  }
}

const form = reactive<PurchaseApplyForm>(createEmptyForm())

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

const itemPagination = reactive<PaginationProps>({
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

const totalQuantity = computed(() =>
  (form.detailList || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0),
)

const totalAmountWithTax = computed(() =>
  (form.detailList || []).reduce(
    (sum, item) => sum + calcAmountWithTax(item.purchasePriceWithTax, item.quantity),
    0,
  ),
)

function syncForm(data?: Partial<PurchaseApplyForm>) {
  Object.assign(form, createEmptyForm(), data || {}, {
    detailList: [...(data?.detailList || [])],
    sourceTypeOptions: data?.sourceTypeOptions || [],
    warehouseOptions: data?.warehouseOptions || [],
    supplierOptions: data?.supplierOptions || [],
  })
}

function formatMoney(value?: number | null) {
  const number = Number(value || 0)
  return number.toFixed(2)
}

function calcPriceWithoutTax(priceWithTax?: number | null, taxRate?: number | null) {
  const price = Number(priceWithTax || 0)
  const rate = Number(taxRate || 0)
  if (!price) return 0
  return price / (1 + rate / 100)
}

function calcTaxAmount(priceWithTax?: number | null, taxRate?: number | null, quantity?: number | null) {
  const qty = Number(quantity || 0)
  const withTax = Number(priceWithTax || 0) * qty
  const withoutTax = calcPriceWithoutTax(priceWithTax, taxRate) * qty
  return withTax - withoutTax
}

function calcAmountWithTax(priceWithTax?: number | null, quantity?: number | null) {
  return Number(priceWithTax || 0) * Number(quantity || 0)
}

function calcAmountWithoutTax(priceWithTax?: number | null, taxRate?: number | null, quantity?: number | null) {
  return calcPriceWithoutTax(priceWithTax, taxRate) * Number(quantity || 0)
}

function ensureFormValid() {
  if (!form.sourceType) {
    message.error('请选择需求来源')
    return false
  }
  if (!form.detailList?.length) {
    message.error('采购明细不能为空')
    return false
  }
  for (const item of form.detailList) {
    if (!item.quantity || Number(item.quantity) <= 0) {
      message.error(`【${item.name || '物料'}】采购数量必须大于 0`)
      return false
    }
  }
  return true
}

function statusType(status?: string | null) {
  const normalized = String(status || '').toLowerCase()
  if (normalized.includes('reject') || normalized.includes('cancel')) return 'error'
  if (normalized.includes('done') || normalized.includes('complete') || normalized.includes('pass')) return 'success'
  if (normalized.includes('wait') || normalized.includes('audit') || normalized.includes('process')) return 'warning'
  return 'default'
}

async function loadTableData() {
  loading.value = true
  try {
    pageData.value = await getPurchaseApplies({
      ...query,
      name: query.name || '',
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
    name: '',
  })
  loadTableData()
}

async function loadItems() {
  itemLoading.value = true
  try {
    itemPageData.value = await getTemplateItems({
      currentPage: itemQuery.currentPage,
      pageSize: itemQuery.pageSize,
      key: itemQuery.key || '',
    })
    itemPagination.page = itemPageData.value.currentPage || 1
    itemPagination.pageSize = itemPageData.value.pageSize || 50
    itemPagination.itemCount = itemPageData.value.count || 0
  } finally {
    itemLoading.value = false
  }
}

function resetItemQuery() {
  Object.assign(itemQuery, {
    currentPage: 1,
    pageSize: 50,
    key: '',
  })
  loadItems()
}

async function openCreateModal() {
  const payload = await getPurchaseApplyForm()
  syncForm(payload)
  showEditModal.value = true
}

async function openEditModal(row: PurchaseApplyRow) {
  const payload = await getPurchaseApplyForm(row.uid || undefined)
  syncForm(payload)
  showEditModal.value = true
}

async function submitForm() {
  if (!ensureFormValid()) return
  submitting.value = true
  try {
    await savePurchaseApply({
      ...form,
      detailList: [...(form.detailList || [])],
    })
    message.success('采购申请已提交')
    showEditModal.value = false
    loadTableData()
  } finally {
    submitting.value = false
  }
}

async function openDetailDrawer(row: PurchaseApplyRow) {
  if (!row.uid) return
  detailLoading.value = true
  showDetailDrawer.value = true
  try {
    detailData.value = await getPurchaseApplyDetail(row.uid)
  } finally {
    detailLoading.value = false
  }
}

async function removeOrder(row: PurchaseApplyRow) {
  if (!row.uid) return
  await deletePurchaseApply(row.uid)
  message.success('采购申请已撤回')
  loadTableData()
}

async function createPurchaseOrderFromDetail() {
  if (!detailData.value?.uid || creatingOrder.value) return
  creatingOrder.value = true
  try {
    const res = await createPurchaseApplyOrder(detailData.value.uid)
    message.success(`采购订单处理完成，新增 ${res?.createdCount || 0} 张，跳过 ${res?.skippedCount || 0} 张`)
    detailData.value = await getPurchaseApplyDetail(detailData.value.uid)
    loadTableData()
  } finally {
    creatingOrder.value = false
  }
}

function openItemsModal() {
  selectedItemKeys.value = []
  showItemsModal.value = true
  itemQuery.currentPage = 1
  loadItems()
}

function appendSelectedItems() {
  const selectedRows = (itemPageData.value.list || []).filter(row => selectedItemKeys.value.includes(row.uid || ''))
  if (!selectedRows.length) {
    showItemsModal.value = false
    return
  }

  const currentMap = new Map((form.detailList || []).map(item => [item.itemUid, item]))
  selectedRows.forEach((row: TemplateItem) => {
    if (!row.uid) return
    if (currentMap.has(row.uid)) return
    currentMap.set(row.uid, {
      uid: null,
      itemUid: row.uid,
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
      vatTaxRate: row.vatTaxRate,
      purchasePriceWithTax: row.purchasePriceWithTax,
      purchasePriceWithoutTax: row.purchasePriceWithoutTax,
      quantity: 1,
      totalQuantity: null,
      availableQuantity: null,
      remark: row.remark,
    })
  })
  form.detailList = Array.from(currentMap.values())
  selectedItemKeys.value = []
  showItemsModal.value = false
}

function removeDetailRow(index: number) {
  form.detailList?.splice(index, 1)
}

const columns = computed<DataTableColumns<PurchaseApplyRow>>(() => [
  { title: '申请编号', key: 'code', minWidth: 180, ellipsis: { tooltip: true } },
  { title: '类型', key: 'sourceTypeName', width: 120, ellipsis: { tooltip: true } },
  { title: '申请时间', key: 'applyTimeName', width: 160, ellipsis: { tooltip: true } },
  { title: '到货时间', key: 'expectTimeName', width: 160, ellipsis: { tooltip: true } },
  {
    title: '流程状态',
    key: 'statusName',
    width: 120,
    render: row => h(NTag, { size: 'small', type: statusType(row.status) }, { default: () => row.statusName || '-' }),
  },
  { title: '当前节点', key: 'currentNodeName', width: 140, ellipsis: { tooltip: true } },
  { title: '备注', key: 'remark', minWidth: 220, ellipsis: { tooltip: true } },
  {
    title: '操作',
    key: 'actions',
    fixed: 'right',
    width: 220,
    render: row =>
      h(NSpace, { size: 8 }, {
        default: () => [
          h(NButton, { text: true, type: 'primary', onClick: () => openDetailDrawer(row) }, { default: () => '详情' }),
          h(NButton, { text: true, type: 'info', onClick: () => openEditModal(row) }, { default: () => '编辑' }),
          h(
            NPopconfirm,
            { onPositiveClick: () => removeOrder(row) },
            {
              trigger: () => h(NButton, { text: true, type: 'error' }, { default: () => '撤回' }),
              default: () => '确定撤回当前采购申请吗？',
            },
          ),
        ],
      }),
  },
])

const detailColumns = computed<DataTableColumns<PurchaseApplyItemDetail>>(() => [
  {
    title: '物料',
    key: 'name',
    minWidth: 220,
    render: row =>
      h('div', { class: 'purchase-item-cell' }, [
        row.image
          ? h(NImage, {
              src: row.image,
              width: 40,
              height: 40,
              objectFit: 'cover',
              previewDisabled: true,
              class: 'purchase-item-image',
            })
          : h('div', { class: 'purchase-item-image purchase-item-image--empty' }, '无图'),
        h('div', { class: 'min-w-0' }, [
          h('div', { class: 'truncate font-medium text-neutral-900 dark:text-neutral-100' }, row.name || '-'),
          h('div', { class: 'truncate text-xs text-neutral-500 dark:text-neutral-400' }, `${row.spec || '-'} / ${row.material || '-'}`),
        ]),
      ]),
  },
  {
    title: '预期供应商',
    key: 'supplierUid',
    minWidth: 180,
    render: (row, index) =>
      h(NSelect, {
        value: row.supplierUid || null,
        options: form.supplierOptions || [],
        placeholder: '选择供应商',
        onUpdateValue: value => {
          form.detailList![index].supplierUid = value
          const match = (form.supplierOptions || []).find(item => item.value === value)
          form.detailList![index].supplierName = match?.label || ''
        },
      }),
  },
  { title: '可用库存', key: 'availableQuantity', width: 100 },
  {
    title: '采购数量',
    key: 'quantity',
    width: 120,
    render: (row, index) =>
      h(NInputNumber, {
        value: Number(row.quantity || 0),
        min: 1,
        precision: 2,
        onUpdateValue: value => {
          form.detailList![index].quantity = value || 1
        },
      }),
  },
  { title: '类型', key: 'typeName', width: 120, ellipsis: { tooltip: true } },
  { title: '单位', key: 'unitName', width: 90 },
  { title: '含税单价', key: 'purchasePriceWithTax', width: 110, render: row => formatMoney(row.purchasePriceWithTax) },
  { title: '税率(%)', key: 'vatTaxRate', width: 90 },
  {
    title: '税额',
    key: 'taxAmount',
    width: 110,
    render: row => formatMoney(calcTaxAmount(row.purchasePriceWithTax, row.vatTaxRate, row.quantity)),
  },
  {
    title: '含税小计',
    key: 'amountWithTax',
    width: 120,
    render: row => formatMoney(calcAmountWithTax(row.purchasePriceWithTax, row.quantity)),
  },
  {
    title: '备注',
    key: 'remark',
    minWidth: 160,
    render: (row, index) =>
      h(NInput, {
        value: row.remark || '',
        placeholder: '备注',
        onUpdateValue: value => {
          form.detailList![index].remark = value
        },
      }),
  },
  {
    title: '操作',
    key: 'actions',
    fixed: 'right',
    width: 80,
    render: (_row, index) =>
      h(NButton, { text: true, type: 'error', onClick: () => removeDetailRow(index) }, { default: () => '删除' }),
  },
])

const itemColumns = computed<DataTableColumns<TemplateItem>>(() => [
  { type: 'selection', multiple: true },
  { title: '名称', key: 'name', minWidth: 160, ellipsis: { tooltip: true } },
  { title: '供应商', key: 'supplierName', minWidth: 140, ellipsis: { tooltip: true } },
  { title: '类型', key: 'typeName', width: 120, ellipsis: { tooltip: true } },
  { title: '单位', key: 'unitName', width: 90 },
  { title: '税率(%)', key: 'vatTaxRate', width: 90 },
  { title: '含税单价', key: 'purchasePriceWithTax', width: 120, render: row => formatMoney(row.purchasePriceWithTax) },
  {
    title: '参考税额',
    key: 'taxAmount',
    width: 110,
    render: row => formatMoney(calcTaxAmount(row.purchasePriceWithTax, row.vatTaxRate, 1)),
  },
  { title: '不含税单价', key: 'purchasePriceWithoutTax', width: 130, render: row => formatMoney(row.purchasePriceWithoutTax) },
  { title: '规格', key: 'spec', width: 120, ellipsis: { tooltip: true } },
  { title: '材质', key: 'material', width: 120, ellipsis: { tooltip: true } },
])

const detailViewColumns = computed<DataTableColumns<PurchaseApplyItemDetail>>(() => [
  { title: '名称', key: 'name', minWidth: 160, ellipsis: { tooltip: true } },
  { title: '供应商', key: 'supplierName', minWidth: 140, ellipsis: { tooltip: true } },
  { title: '类型', key: 'typeName', width: 120, ellipsis: { tooltip: true } },
  { title: '单位', key: 'unitName', width: 90 },
  { title: '规格', key: 'spec', width: 120, ellipsis: { tooltip: true } },
  { title: '材质', key: 'material', width: 120, ellipsis: { tooltip: true } },
  { title: '采购数量', key: 'quantity', width: 100 },
  { title: '含税单价', key: 'purchasePriceWithTax', width: 110, render: row => formatMoney(row.purchasePriceWithTax) },
  { title: '税率(%)', key: 'vatTaxRate', width: 90 },
  { title: '不含税单价', key: 'priceWithoutTax', width: 120, render: row => formatMoney(row.purchasePriceWithoutTax || calcPriceWithoutTax(row.purchasePriceWithTax, row.vatTaxRate)) },
  { title: '税额', key: 'taxAmount', width: 100, render: row => formatMoney(calcTaxAmount(row.purchasePriceWithTax, row.vatTaxRate, row.quantity)) },
  { title: '含税小计', key: 'amountWithTax', width: 120, render: row => formatMoney(calcAmountWithTax(row.purchasePriceWithTax, row.quantity)) },
  { title: '不含税小计', key: 'amountWithoutTax', width: 130, render: row => formatMoney(calcAmountWithoutTax(row.purchasePriceWithTax, row.vatTaxRate, row.quantity)) },
  { title: '可用库存', key: 'availableQuantity', width: 100 },
  { title: '备注', key: 'remark', minWidth: 160, ellipsis: { tooltip: true } },
])

onMounted(() => {
  loadTableData()
})
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-4 p-4">
    <NCard size="small" :bordered="false">
      <NForm :model="query" label-placement="left" label-width="72">
        <div class="grid grid-cols-1 gap-3 md:grid-cols-[minmax(260px,420px)_auto]">
          <NFormItem label="名称" class="purchase-query-item">
            <NInput v-model:value="query.name" clearable placeholder="申请编号 / 物料 / 备注" @keydown.enter.prevent="loadTableData" />
          </NFormItem>
          <NFormItem class="purchase-query-item">
            <NFlex size="small">
              <NButton type="primary" attr-type="button" @click="loadTableData">查询</NButton>
              <NButton attr-type="button" @click="resetQuery">重置</NButton>
            </NFlex>
          </NFormItem>
        </div>
        <div class="mt-3 flex justify-end">
          <NButton type="primary" secondary attr-type="button" @click="openCreateModal">新增申请</NButton>
        </div>
      </NForm>
    </NCard>

    <NCard size="small" :bordered="false" class="flex min-h-0 flex-1 flex-col">
      <div class="mb-3 flex items-center justify-between">
        <div class="text-sm text-neutral-500 dark:text-neutral-400">采购申请列表</div>
        <div class="text-sm text-neutral-500 dark:text-neutral-400">发起采购需求并在流程完成后补生成采购订单</div>
      </div>

      <NDataTable
        remote
        flex-height
        :loading="loading"
        :columns="columns"
        :data="pageData.list || []"
        :pagination="false"
        :scroll-x="1300"
        size="small"
      />

      <div class="mt-3 flex justify-end">
        <NPagination v-bind="pagination" :disabled="loading" :prefix="({ itemCount }) => `共 ${itemCount} 条`" />
      </div>
    </NCard>

    <NModal v-model:show="showEditModal" preset="card" class="w-[1380px] max-w-[96vw]" title="采购申请">
      <div class="flex max-h-[84vh] min-h-0 flex-col gap-4 overflow-hidden xl:flex-row">
        <div class="min-h-0 flex-1 overflow-auto">
          <div class="grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr]">
            <NCard size="small" embedded :bordered="false">
              <NForm label-placement="left" label-width="100">
                <div class="grid grid-cols-1 gap-x-4 gap-y-1 md:grid-cols-2">
                  <NFormItem label="编码">
                    <NInput :value="form.code || '自动生成编码'" disabled />
                  </NFormItem>
                  <NFormItem label="申请日期">
                    <NDatePicker v-model:value="form.applyTime as number" type="date" class="w-full" />
                  </NFormItem>
                  <NFormItem label="到货需求日期">
                    <NDatePicker v-model:value="form.expectTime as number | null" type="date" class="w-full" clearable />
                  </NFormItem>
                  <NFormItem label="需求来源">
                    <NSelect v-model:value="form.sourceType" :options="form.sourceTypeOptions || []" placeholder="请选择需求来源" />
                  </NFormItem>
                  <NFormItem label="到货地址" class="md:col-span-2">
                    <NInput v-model:value="form.address" placeholder="请输入到货地址" />
                  </NFormItem>
                  <NFormItem label="备注" class="md:col-span-2">
                    <NInput v-model:value="form.remark" type="textarea" :autosize="{ minRows: 2, maxRows: 4 }" placeholder="请输入备注" />
                  </NFormItem>
                </div>
              </NForm>
            </NCard>

            <NCard size="small" embedded :bordered="false">
              <div class="grid grid-cols-1 gap-3">
                <NStatistic label="明细数量" :value="form.detailList?.length || 0" />
                <NStatistic label="采购总数" :value="totalQuantity" />
                <NStatistic label="含税金额" :value="formatMoney(totalAmountWithTax)" />
              </div>
            </NCard>
          </div>

          <NCard size="small" embedded :bordered="false" class="mt-4">
            <div class="mb-3 flex items-center justify-between">
              <div>
                <div class="text-sm font-medium text-neutral-900 dark:text-neutral-100">采购物料明细</div>
                <div class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">可从物料主数据中挑选采购项，再调整供应商和数量。</div>
              </div>
              <NButton type="primary" secondary attr-type="button" @click="openItemsModal">添加物料</NButton>
            </div>

            <NDataTable :columns="detailColumns" :data="form.detailList || []" :pagination="false" :scroll-x="1760" size="small" />
          </NCard>
        </div>

        <NCard size="small" embedded :bordered="false" class="xl:w-[320px]">
          <div class="text-sm font-medium text-neutral-900 dark:text-neutral-100">流程说明</div>
          <div class="mt-3 space-y-3 text-sm text-neutral-600 dark:text-neutral-300">
            <div class="rounded-lg bg-neutral-100 px-4 py-3 dark:bg-neutral-800">采购申请提交后进入审批流程。</div>
            <div class="rounded-lg bg-neutral-100 px-4 py-3 dark:bg-neutral-800">流程完成后可在详情中补生成采购订单。</div>
            <div class="rounded-lg bg-neutral-100 px-4 py-3 dark:bg-neutral-800">系统会按供应商拆单并跳过已生成部分。</div>
          </div>
        </NCard>
      </div>

      <template #footer>
        <NFlex justify="end">
          <NButton attr-type="button" @click="showEditModal = false">取消</NButton>
          <NButton type="primary" attr-type="button" :loading="submitting" @click="submitForm">确定</NButton>
        </NFlex>
      </template>
    </NModal>

    <NModal v-model:show="showItemsModal" preset="card" class="w-[1160px] max-w-[96vw]" title="物料信息">
      <div class="flex max-h-[74vh] min-h-0 flex-col gap-3">
        <div class="grid grid-cols-1 gap-3 md:grid-cols-[minmax(220px,1fr)_auto]">
          <NInput v-model:value="itemQuery.key" clearable placeholder="名称 / 规格 / 材质" @keydown.enter.prevent="loadItems" />
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
          :scroll-x="1380"
          size="small"
          @update:checked-row-keys="selectedItemKeys = $event"
        />

        <div class="flex items-center justify-between gap-3">
          <NPagination v-bind="itemPagination" :disabled="itemLoading" :prefix="({ itemCount }) => `共 ${itemCount} 条`" />
          <div class="flex gap-2">
            <NButton attr-type="button" @click="showItemsModal = false">取消</NButton>
            <NButton type="primary" attr-type="button" @click="appendSelectedItems">确定</NButton>
          </div>
        </div>
      </div>
    </NModal>

    <NDrawer v-model:show="showDetailDrawer" :width="1280" placement="right">
      <NDrawerContent title="采购申请详情" :native-scrollbar="false">
        <div v-if="detailData" class="flex flex-col gap-4">
          <NDescriptions bordered :column="2" size="small" label-placement="left">
            <NDescriptionsItem label="申请单号">{{ detailData.code || '-' }}</NDescriptionsItem>
            <NDescriptionsItem label="流程状态">
              <NTag size="small" :type="statusType(detailData.status)">{{ detailData.statusName || '-' }}</NTag>
            </NDescriptionsItem>
            <NDescriptionsItem label="申请日期">{{ detailData.applyTimeName || '-' }}</NDescriptionsItem>
            <NDescriptionsItem label="到货日期">{{ detailData.expectTimeName || '-' }}</NDescriptionsItem>
            <NDescriptionsItem label="需求来源">{{ detailData.sourceTypeName || '-' }}</NDescriptionsItem>
            <NDescriptionsItem label="当前节点">{{ detailData.currentNodeName || '-' }}</NDescriptionsItem>
            <NDescriptionsItem label="到货地址" :span="2">{{ detailData.address || '-' }}</NDescriptionsItem>
            <NDescriptionsItem label="备注" :span="2">{{ detailData.remark || '-' }}</NDescriptionsItem>
          </NDescriptions>

          <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
            <NCard size="small" embedded>
              <div class="text-xs text-neutral-500 dark:text-neutral-400">采购订单</div>
              <div class="mt-1 text-xl font-semibold text-neutral-900 dark:text-neutral-50">{{ detailData.purchaseOrderCount || 0 }} 张</div>
            </NCard>
            <NCard size="small" embedded>
              <div class="text-xs text-neutral-500 dark:text-neutral-400">是否可补生成</div>
              <div class="mt-1 text-xl font-semibold text-neutral-900 dark:text-neutral-50">{{ detailData.canCreatePurchaseOrder ? '可生成' : '不可生成' }}</div>
            </NCard>
            <NCard size="small" embedded>
              <div class="text-xs text-neutral-500 dark:text-neutral-400">操作</div>
              <div class="mt-2">
                <NButton type="primary" secondary :disabled="!detailData.canCreatePurchaseOrder" :loading="creatingOrder" @click="createPurchaseOrderFromDetail">
                  补生成采购订单
                </NButton>
              </div>
            </NCard>
          </div>

          <NDataTable :loading="detailLoading" :columns="detailViewColumns" :data="detailData.detailList || []" :pagination="false" :scroll-x="1820" size="small" />
        </div>
      </NDrawerContent>
    </NDrawer>
  </div>
</template>

<style scoped>
.purchase-query-item {
  margin-bottom: 0;
}

.purchase-item-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.purchase-item-image {
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 8px;
}

.purchase-item-image--empty {
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
