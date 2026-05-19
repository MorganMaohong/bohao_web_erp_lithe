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
  NEmpty,
  NFlex,
  NForm,
  NFormItem,
  NGrid,
  NGi,
  NInput,
  NInputNumber,
  NModal,
  NPagination,
  NSelect,
  NSpace,
  NSpin,
  NTag,
  useMessage,
} from 'naive-ui'
import { computed, h, onMounted, reactive, ref, watch } from 'vue'

import {
  confirmPurchaseOrder,
  getPurchaseOrderDetail,
  getPurchaseOrderForm,
  getPurchaseOrders,
  getPurchasePriceCompare,
  getPurchasePriceHistory,
  type PurchaseOrderDetail,
  type PurchaseOrderDetailRow,
  type PurchaseOrderForm,
  type PurchaseOrderPageData,
  type PurchaseOrderQuery,
  type PurchaseOrderRow,
  type PurchasePriceCompareRow,
  type PurchasePriceHistoryQuery,
  type PurchasePriceHistoryResult,
} from '@/api'

import type { DataTableColumns, PaginationProps } from 'naive-ui'

defineOptions({
  name: 'PurchaseOrder',
})

const WAIT_CONFIRM = 'wait_confirm'
const REJECT = 'reject'

const message = useMessage()

const loading = ref(false)
const detailLoading = ref(false)
const submitting = ref(false)
const priceCompareLoading = ref(false)
const priceHistoryLoading = ref(false)

const showDetailDrawer = ref(false)
const showConfirmModal = ref(false)
const showPriceHistoryModal = ref(false)

const query = reactive<PurchaseOrderQuery>({
  currentPage: 1,
  pageSize: 20,
  key: '',
  status: '',
  orderType: '',
  scene: '',
})

const pageData = ref<PurchaseOrderPageData>({
  currentPage: 1,
  pageSize: 20,
  count: 0,
  list: [],
  extraData: {
    statusOptions: [],
    supplierOptions: [],
    orderTypeOptions: [],
  },
})

const detailData = ref<PurchaseOrderDetail>({
  detailList: [],
  inboundOrderList: [],
})

const confirmData = ref<PurchaseOrderForm>({
  detailList: [],
})

const priceCompareList = ref<PurchasePriceCompareRow[]>([])
const priceHistoryQuery = reactive<PurchasePriceHistoryQuery>({
  currentPage: 1,
  pageSize: 20,
  orderUid: null,
  itemUid: null,
  supplierUid: null,
})
const priceHistoryData = ref<PurchasePriceHistoryResult>({
  list: [],
  supplierOptions: [],
  count: 0,
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

const priceHistoryPagination = reactive<PaginationProps>({
  page: 1,
  pageSize: 20,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [20, 50, 100],
  onUpdatePage(page) {
    priceHistoryQuery.currentPage = page
    loadPriceHistory()
  },
  onUpdatePageSize(pageSize) {
    priceHistoryQuery.pageSize = pageSize
    priceHistoryQuery.currentPage = 1
    loadPriceHistory()
  },
})

let priceCompareTimer: number | undefined

const priceCompareMap = computed<Record<string, PurchasePriceCompareRow>>(() =>
  Object.fromEntries(
    (priceCompareList.value || [])
      .filter(item => item.orderDetailUid)
      .map(item => [item.orderDetailUid as string, item]),
  ),
)

function formatMoney(value?: number | null) {
  return Number(value || 0).toFixed(2)
}

function calcPriceWithoutTax(priceWithTax?: number | null, taxRate?: number | null) {
  const price = Number(priceWithTax || 0)
  const rate = Number(taxRate || 0)
  if (!price) return 0
  return price / (1 + rate / 100)
}

function calcTaxAmount(priceWithTax?: number | null, taxRate?: number | null, quantity?: number | null) {
  const withTax = Number(priceWithTax || 0) * Number(quantity || 0)
  const withoutTax = calcPriceWithoutTax(priceWithTax, taxRate) * Number(quantity || 0)
  return withTax - withoutTax
}

function calcAmountWithTax(priceWithTax?: number | null, quantity?: number | null) {
  return Number(priceWithTax || 0) * Number(quantity || 0)
}

function calcAmountWithoutTax(priceWithTax?: number | null, taxRate?: number | null, quantity?: number | null) {
  return calcPriceWithoutTax(priceWithTax, taxRate) * Number(quantity || 0)
}

function statusType(status?: string | null) {
  const normalized = String(status || '').toLowerCase()
  if (normalized.includes('reject') || normalized.includes('cancel') || normalized.includes('close')) return 'error'
  if (normalized.includes('done') || normalized.includes('complete') || normalized.includes('finish') || normalized.includes('pass')) return 'success'
  if (normalized.includes('wait') || normalized.includes('confirm') || normalized.includes('process') || normalized.includes('audit')) return 'warning'
  return 'default'
}

function warningTagType(level?: string) {
  if (level === 'danger') return 'error'
  if (level === 'warning') return 'warning'
  if (level === 'success') return 'success'
  if (level === 'normal') return 'info'
  return 'default'
}

function formatDiffPercent(value: unknown) {
  const num = Number(value)
  if (!Number.isFinite(num)) return '-'
  return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`
}

function canConfirm(row?: PurchaseOrderRow) {
  return row?.status === WAIT_CONFIRM || row?.status === REJECT
}

async function loadTableData() {
  loading.value = true
  try {
    pageData.value = await getPurchaseOrders({
      ...query,
      key: query.key || '',
      status: query.status || '',
      orderType: query.orderType || '',
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
    status: '',
    orderType: '',
    scene: '',
  })
  loadTableData()
}

async function openDetailDrawer(row: PurchaseOrderRow) {
  if (!row.uid) return
  detailLoading.value = true
  showDetailDrawer.value = true
  try {
    detailData.value = await getPurchaseOrderDetail(row.uid)
  } finally {
    detailLoading.value = false
  }
}

async function openConfirmModal(row: PurchaseOrderRow) {
  if (!row.uid) return
  submitting.value = true
  showConfirmModal.value = true
  priceCompareList.value = []
  try {
    confirmData.value = await getPurchaseOrderForm(row.uid)
    await loadPriceCompare()
  } finally {
    submitting.value = false
  }
}

async function loadPriceCompare() {
  if (!confirmData.value.uid) return
  priceCompareLoading.value = true
  try {
    priceCompareList.value =
      (await getPurchasePriceCompare({
        orderUid: confirmData.value.uid,
        detailList: (confirmData.value.detailList || []).map(item => ({
          orderDetailUid: item.uid,
          itemUid: item.itemUid,
          itemName: item.name,
          supplierUid: item.supplierUid || confirmData.value.supplierUid,
          quantity: item.quantity,
          vatTaxRate: item.vatTaxRate,
          purchasePriceWithTax: item.purchasePriceWithTax,
        })),
      })) || []
  } finally {
    priceCompareLoading.value = false
  }
}

function scheduleLoadPriceCompare() {
  if (!showConfirmModal.value || !confirmData.value.uid) return
  if (priceCompareTimer) window.clearTimeout(priceCompareTimer)
  priceCompareTimer = window.setTimeout(() => {
    loadPriceCompare()
  }, 500)
}

function getPriceCompare(row: PurchaseOrderDetailRow) {
  return row.uid ? priceCompareMap.value[row.uid] : undefined
}

function priceReasonRequired(row: PurchaseOrderDetailRow) {
  return Boolean(getPriceCompare(row)?.priceReasonRequired)
}

function priceReasonTip(row: PurchaseOrderDetailRow) {
  return getPriceCompare(row)?.priceReasonTip || '价格波动较大，请填写说明'
}

function syncPurchasePriceRows(rows: PurchaseOrderDetailRow[]) {
  rows.forEach(item => {
    item.purchasePriceWithoutTax = calcPriceWithoutTax(item.purchasePriceWithTax, item.vatTaxRate)
  })
}

function validateConfirmForm() {
  if (!confirmData.value.detailList?.length) {
    message.error('采购订单明细不能为空')
    return false
  }
  syncPurchasePriceRows(confirmData.value.detailList)
  for (const item of confirmData.value.detailList) {
    if (!item.quantity || Number(item.quantity) <= 0) {
      message.error(`【${item.name || '物料'}】到货数量必须大于 0`)
      return false
    }
    if (!item.purchasePriceWithTax || Number(item.purchasePriceWithTax) <= 0) {
      message.error(`【${item.name || '物料'}】含税单价必须大于 0`)
      return false
    }
    if (item.vatTaxRate == null || Number(item.vatTaxRate) < 0) {
      message.error(`【${item.name || '物料'}】税率不能为空`)
      return false
    }
    if (priceReasonRequired(item) && !item.priceCompareReason?.trim()) {
      message.error(`【${item.name || '物料'}】价格波动较大，请填写价格说明`)
      return false
    }
  }
  return true
}

async function submitConfirm() {
  if (!validateConfirmForm() || submitting.value) return
  submitting.value = true
  try {
    await confirmPurchaseOrder(confirmData.value)
    message.success('采购订单已提交审批')
    showConfirmModal.value = false
    loadTableData()
    if (detailData.value.uid === confirmData.value.uid) {
      detailData.value = await getPurchaseOrderDetail(confirmData.value.uid as string)
    }
  } finally {
    submitting.value = false
  }
}

async function loadPriceHistory() {
  if (!priceHistoryQuery.itemUid) return
  priceHistoryLoading.value = true
  try {
    priceHistoryData.value = (await getPurchasePriceHistory({ ...priceHistoryQuery })) || {
      list: [],
      supplierOptions: [],
      count: 0,
    }
    priceHistoryPagination.page = priceHistoryQuery.currentPage || 1
    priceHistoryPagination.pageSize = priceHistoryQuery.pageSize || 20
    priceHistoryPagination.itemCount = priceHistoryData.value.count || 0
  } finally {
    priceHistoryLoading.value = false
  }
}

function openPriceHistory(row: PurchaseOrderDetailRow) {
  priceHistoryQuery.orderUid = confirmData.value.uid || null
  priceHistoryQuery.itemUid = row.itemUid || null
  priceHistoryQuery.supplierUid = row.supplierUid || confirmData.value.supplierUid || null
  priceHistoryQuery.currentPage = 1
  priceHistoryQuery.pageSize = 20
  priceHistoryData.value = { list: [], supplierOptions: [], count: 0 }
  showPriceHistoryModal.value = true
  loadPriceHistory()
}

function priceHistorySupplierChange() {
  priceHistoryQuery.currentPage = 1
  loadPriceHistory()
}

watch(
  () =>
    showConfirmModal.value
      ? JSON.stringify(
          (confirmData.value.detailList || []).map(item => ({
            uid: item.uid,
            itemUid: item.itemUid,
            supplierUid: item.supplierUid || confirmData.value.supplierUid,
            quantity: item.quantity,
            vatTaxRate: item.vatTaxRate,
            purchasePriceWithTax: item.purchasePriceWithTax,
          })),
        )
      : '',
  () => {
    scheduleLoadPriceCompare()
  },
)

onMounted(() => {
  loadTableData()
})

const columns = computed<DataTableColumns<PurchaseOrderRow>>(() => [
  { title: '订单编号', key: 'code', minWidth: 170, ellipsis: { tooltip: true } },
  { title: '订单类型', key: 'orderTypeName', width: 110, ellipsis: { tooltip: true } },
  { title: '申请单号', key: 'applyOrderCode', minWidth: 170, ellipsis: { tooltip: true } },
  { title: '来源订单', key: 'sourceOrderCode', minWidth: 170, ellipsis: { tooltip: true } },
  { title: '供应商', key: 'supplierName', minWidth: 140, ellipsis: { tooltip: true } },
  { title: '含税金额', key: 'totalAmount', width: 120, render: row => formatMoney(row.totalAmount) },
  { title: '预计到货', key: 'expectTimeName', width: 120, ellipsis: { tooltip: true } },
  {
    title: '状态',
    key: 'statusName',
    width: 110,
    render: row => h(NTag, { size: 'small', type: statusType(row.status) }, { default: () => row.statusName || '-' }),
  },
  { title: '创建时间', key: 'createTime', width: 170, ellipsis: { tooltip: true } },
  {
    title: '操作',
    key: 'actions',
    fixed: 'right',
    width: 170,
    render: row =>
      h(NSpace, { size: 8 }, {
        default: () => [
          h(NButton, { text: true, type: 'primary', onClick: () => openDetailDrawer(row) }, { default: () => '详情' }),
          canConfirm(row)
            ? h(NButton, { text: true, type: 'info', onClick: () => openConfirmModal(row) }, { default: () => '确认订单' })
            : null,
        ],
      }),
  },
])

const detailColumns = computed<DataTableColumns<PurchaseOrderDetailRow>>(() => [
  { title: '物料名称', key: 'name', minWidth: 160, ellipsis: { tooltip: true } },
  { title: '规格型号', key: 'spec', minWidth: 150, ellipsis: { tooltip: true } },
  { title: '单位', key: 'unitName', width: 90 },
  { title: '申请数量', key: 'applyQuantity', width: 100 },
  { title: '到货数量', key: 'quantity', width: 100 },
  { title: '已入库', key: 'inboundQuantity', width: 100 },
  { title: '已退货', key: 'returnQuantity', width: 100 },
  { title: '可入库', key: 'availableInboundQuantity', width: 100 },
  { title: '可退货', key: 'availableReturnQuantity', width: 100 },
  { title: '含税单价', key: 'purchasePriceWithTax', width: 110, render: row => formatMoney(row.purchasePriceWithTax) },
  { title: '税率(%)', key: 'vatTaxRate', width: 90 },
  { title: '不含税单价', key: 'priceWithoutTax', width: 120, render: row => formatMoney(row.purchasePriceWithoutTax || calcPriceWithoutTax(row.purchasePriceWithTax, row.vatTaxRate)) },
  { title: '税额', key: 'taxAmount', width: 110, render: row => formatMoney(calcTaxAmount(row.purchasePriceWithTax, row.vatTaxRate, row.quantity)) },
  { title: '含税小计', key: 'amountWithTax', width: 120, render: row => formatMoney(calcAmountWithTax(row.purchasePriceWithTax, row.quantity)) },
])

const inboundColumns = computed<DataTableColumns<any>>(() => [
  { title: '入库单号', key: 'code', minWidth: 170, ellipsis: { tooltip: true } },
  { title: '仓库', key: 'warehouseName', minWidth: 120, ellipsis: { tooltip: true } },
  { title: '入库时间', key: 'timeName', minWidth: 160, ellipsis: { tooltip: true } },
  { title: '入库总数', key: 'totalQuantity', width: 110 },
  { title: '状态', key: 'statusName', width: 100, render: row => h(NTag, { size: 'small', type: statusType(row.status) }, { default: () => row.statusName || '-' }) },
])

const confirmColumns = computed<DataTableColumns<PurchaseOrderDetailRow>>(() => [
  { title: '物料名称', key: 'name', minWidth: 150, ellipsis: { tooltip: true } },
  { title: '规格型号', key: 'spec', minWidth: 140, ellipsis: { tooltip: true } },
  { title: '单位', key: 'unitName', width: 90 },
  { title: '申请数量', key: 'applyQuantity', width: 100 },
  {
    title: '到货数量',
    key: 'quantity',
    width: 120,
    render: (row, index) =>
      h(NInputNumber, {
        value: Number(row.quantity || 0),
        min: 1,
        precision: 2,
        onUpdateValue: value => {
          confirmData.value.detailList![index].quantity = value || 1
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
        min: 0.0001,
        precision: 4,
        onUpdateValue: value => {
          confirmData.value.detailList![index].purchasePriceWithTax = value || 0
        },
      }),
  },
  {
    title: '税率(%)',
    key: 'vatTaxRate',
    width: 110,
    render: (row, index) =>
      h(NInputNumber, {
        value: Number(row.vatTaxRate || 0),
        min: 0,
        max: 100,
        precision: 2,
        onUpdateValue: value => {
          confirmData.value.detailList![index].vatTaxRate = value || 0
        },
      }),
  },
  { title: '不含税单价', key: 'priceWithoutTax', width: 130, render: row => formatMoney(calcPriceWithoutTax(row.purchasePriceWithTax, row.vatTaxRate)) },
  { title: '税额', key: 'taxAmount', width: 110, render: row => formatMoney(calcTaxAmount(row.purchasePriceWithTax, row.vatTaxRate, row.quantity)) },
  { title: '含税小计', key: 'amountWithTax', width: 120, render: row => formatMoney(calcAmountWithTax(row.purchasePriceWithTax, row.quantity)) },
  { title: '不含税小计', key: 'amountWithoutTax', width: 130, render: row => formatMoney(calcAmountWithoutTax(row.purchasePriceWithTax, row.vatTaxRate, row.quantity)) },
  {
    title: '历史比价',
    key: 'priceCompare',
    width: 320,
    render: row => {
      const compare = getPriceCompare(row)
      if (compare?.historyCount) {
        return h('div', { class: 'price-compare-cell' }, [
          h('div', {}, `同供应商最近含税：${formatMoney(compare.lastSameSupplierPriceWithTax)} ${compare.lastSameSupplierOrderCode || ''}`),
          h('div', {}, `同供应商最近不含税：${formatMoney(compare.lastSameSupplierPriceWithoutTax)}`),
          h('div', { class: 'flex items-center gap-1' }, [
            h('span', {}, `不含税均价：${formatMoney(compare.avgHistoryPriceWithoutTax)}`),
            h(NTag, { size: 'small', type: warningTagType(compare.warningLevel) }, { default: () => formatDiffPercent(compare.currentVsAvgWithoutTaxRate) }),
          ]),
          h('div', {}, `历史最低不含税：${formatMoney(compare.minHistoryPriceWithoutTax)} ${compare.minHistorySupplierName || ''}`),
          h('div', { class: 'flex items-center gap-2' }, [
            h(NTag, { size: 'small', type: warningTagType(compare.warningLevel) }, { default: () => compare.warningText || '价格提示' }),
            h(NButton, { text: true, size: 'tiny', type: 'primary', onClick: () => openPriceHistory(row) }, { default: () => '查看记录' }),
          ]),
        ])
      }
      return h('div', { class: 'flex items-center justify-center gap-2' }, [
        h(NTag, { size: 'small' }, { default: () => '暂无历史价格' }),
        h(NButton, { text: true, size: 'tiny', type: 'primary', onClick: () => openPriceHistory(row) }, { default: () => '查看记录' }),
      ])
    },
  },
  {
    title: '价格说明',
    key: 'priceCompareReason',
    width: 240,
    render: (row, index) =>
      h('div', { class: 'price-reason-cell' }, [
        h(NInput, {
          value: row.priceCompareReason || '',
          placeholder: priceReasonRequired(row) ? '必填：说明本次价格波动原因' : '选填',
          maxlength: 150,
          onUpdateValue: value => {
            confirmData.value.detailList![index].priceCompareReason = value
          },
        }),
        priceReasonRequired(row)
          ? h('div', { class: 'price-reason-tip' }, priceReasonTip(row))
          : null,
      ]),
  },
  {
    title: '明细备注',
    key: 'remark',
    width: 180,
    render: (row, index) =>
      h(NInput, {
        value: row.remark || '',
        maxlength: 100,
        onUpdateValue: value => {
          confirmData.value.detailList![index].remark = value
        },
      }),
  },
])

const priceHistoryColumns = computed<DataTableColumns<any>>(() => [
  { title: '订单编号', key: 'orderCode', minWidth: 150, ellipsis: { tooltip: true } },
  { title: '供应商', key: 'supplierName', minWidth: 150, ellipsis: { tooltip: true } },
  { title: '订单状态', key: 'orderStatusName', width: 110, ellipsis: { tooltip: true } },
  { title: '订单时间', key: 'orderTimeName', width: 120, ellipsis: { tooltip: true } },
  { title: '数量', key: 'quantity', width: 100 },
  { title: '税率(%)', key: 'vatTaxRate', width: 100 },
  { title: '含税单价', key: 'purchasePriceWithTax', width: 120, render: row => formatMoney(row.purchasePriceWithTax) },
  { title: '不含税单价', key: 'purchasePriceWithoutTax', width: 130, render: row => formatMoney(row.purchasePriceWithoutTax) },
  { title: '含税小计', key: 'totalAmountWithTax', width: 120, render: row => formatMoney(row.totalAmountWithTax) },
  { title: '不含税小计', key: 'totalAmountWithoutTax', width: 130, render: row => formatMoney(row.totalAmountWithoutTax) },
])
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-4 p-4">
    <NCard size="small" :bordered="false">
      <NForm :model="query" label-placement="left" label-width="72">
        <div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <NFormItem label="关键字" class="purchase-query-item">
            <NInput v-model:value="query.key" clearable placeholder="订单编号 / 备注" @keydown.enter.prevent="loadTableData" />
          </NFormItem>
          <NFormItem label="订单类型" class="purchase-query-item">
            <NSelect v-model:value="query.orderType" clearable :options="pageData.extraData?.orderTypeOptions || []" placeholder="选择订单类型" />
          </NFormItem>
          <NFormItem label="状态" class="purchase-query-item">
            <NSelect v-model:value="query.status" clearable :options="pageData.extraData?.statusOptions || []" placeholder="选择状态" />
          </NFormItem>
          <NFormItem class="purchase-query-item">
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
        <div class="text-sm text-neutral-500 dark:text-neutral-400">采购订单列表</div>
        <div class="text-sm text-neutral-500 dark:text-neutral-400">支持待确认订单审批前复核价格、数量与历史采购价格</div>
      </div>

      <NDataTable
        remote
        flex-height
        :loading="loading"
        :columns="columns"
        :data="pageData.list || []"
        :pagination="false"
        :scroll-x="1460"
        size="small"
      />

      <div class="mt-3 flex justify-end">
        <NPagination v-bind="pagination" :disabled="loading" :prefix="({ itemCount }) => `共 ${itemCount} 条`" />
      </div>
    </NCard>

    <NDrawer v-model:show="showDetailDrawer" :width="1320" placement="right">
      <NDrawerContent title="采购订单详情" :native-scrollbar="false">
        <NSpin :show="detailLoading">
          <div class="flex flex-col gap-4">
            <NDescriptions bordered :column="2" size="small" label-placement="left">
              <NDescriptionsItem label="订单编号">{{ detailData.code || '-' }}</NDescriptionsItem>
              <NDescriptionsItem label="订单类型">{{ detailData.orderTypeName || '-' }}</NDescriptionsItem>
              <NDescriptionsItem label="状态">
                <NTag size="small" :type="statusType(detailData.status)">{{ detailData.statusName || '-' }}</NTag>
              </NDescriptionsItem>
              <NDescriptionsItem label="供应商">{{ detailData.supplierName || '-' }}</NDescriptionsItem>
              <NDescriptionsItem label="申请单号">{{ detailData.applyOrderCode || '-' }}</NDescriptionsItem>
              <NDescriptionsItem label="来源订单">{{ detailData.sourceOrderCode || '-' }}</NDescriptionsItem>
              <NDescriptionsItem label="预计到货">{{ detailData.expectTimeName || '-' }}</NDescriptionsItem>
              <NDescriptionsItem label="申请状态">{{ detailData.applyOrderStatusName || '-' }}</NDescriptionsItem>
              <NDescriptionsItem label="备注" :span="2">{{ detailData.remark || '-' }}</NDescriptionsItem>
            </NDescriptions>

            <NDataTable :columns="detailColumns" :data="detailData.detailList || []" :pagination="false" :scroll-x="1760" size="small" />

            <NCard v-if="detailData.inboundOrderList?.length" size="small" embedded>
              <div class="mb-3 text-sm font-medium text-neutral-900 dark:text-neutral-100">相关采购入库</div>
              <NDataTable :columns="inboundColumns" :data="detailData.inboundOrderList || []" :pagination="false" :scroll-x="760" size="small" />
            </NCard>

            <NCard v-else size="small" embedded>
              <NEmpty description="暂无相关采购入库" />
            </NCard>
          </div>
        </NSpin>
      </NDrawerContent>
    </NDrawer>

    <NModal v-model:show="showConfirmModal" preset="card" class="w-[1440px] max-w-[96vw]" title="确认采购订单">
      <NSpin :show="submitting">
        <div class="purchase-modal-body">
          <NCard size="small" embedded>
            <NForm label-placement="left" label-width="90">
              <NGrid :cols="3" x-gap="12">
                <NGi>
                  <NFormItem label="订单编号">
                    <NInput :value="confirmData.code || ''" disabled />
                  </NFormItem>
                </NGi>
                <NGi>
                  <NFormItem label="订单类型">
                    <NInput :value="confirmData.orderTypeName || ''" disabled />
                  </NFormItem>
                </NGi>
                <NGi>
                  <NFormItem label="预计到货">
                    <NDatePicker v-model:value="confirmData.expectTime as number | null" type="date" clearable class="w-full" />
                  </NFormItem>
                </NGi>
              </NGrid>
              <NFormItem label="备注">
                <NInput v-model:value="confirmData.remark" type="textarea" maxlength="200" show-count />
              </NFormItem>
            </NForm>
          </NCard>

          <NCard size="small" embedded>
            <template #header-extra>
              <NButton size="small" tertiary type="info" :loading="priceCompareLoading" @click="loadPriceCompare">刷新历史价格</NButton>
            </template>
            <NAlert type="info" show-icon class="mb-3">
              历史价格仅统计审批通过及后续状态的采购订单，不包含当前订单、待审批和驳回订单。
            </NAlert>
            <NDataTable
              :loading="priceCompareLoading"
              :columns="confirmColumns"
              :data="confirmData.detailList || []"
              :pagination="false"
              :scroll-x="2580"
              size="small"
            />
          </NCard>
        </div>
      </NSpin>

      <template #footer>
        <div class="flex justify-end gap-2">
          <NButton attr-type="button" @click="showConfirmModal = false">取消</NButton>
          <NButton type="primary" attr-type="button" :loading="submitting" @click="submitConfirm">提交审批</NButton>
        </div>
      </template>
    </NModal>

    <NModal v-model:show="showPriceHistoryModal" preset="card" class="w-[1100px] max-w-[96vw]" title="物料历史采购记录">
      <div class="purchase-modal-body">
        <NCard size="small" embedded>
          <div class="history-toolbar">
            <div>
              <div class="history-title">{{ priceHistoryData.itemName || '物料' }}</div>
              <div class="history-subtitle">默认展示当前供应商，可切换查看其他供应商历史价格。</div>
            </div>
            <NSelect
              v-model:value="priceHistoryQuery.supplierUid"
              clearable
              class="w-[260px]"
              placeholder="全部供应商"
              :options="priceHistoryData.supplierOptions || []"
              @update:value="priceHistorySupplierChange"
            />
          </div>
          <NDataTable
            :loading="priceHistoryLoading"
            :columns="priceHistoryColumns"
            :data="priceHistoryData.list || []"
            :pagination="false"
            :scroll-x="1220"
            size="small"
          />
          <div class="mt-3 flex justify-end">
            <NPagination v-bind="priceHistoryPagination" :disabled="priceHistoryLoading" />
          </div>
        </NCard>
      </div>
    </NModal>
  </div>
</template>

<style scoped>
.purchase-query-item {
  margin-bottom: 0;
}

.purchase-modal-body {
  display: flex;
  max-height: 76vh;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
}

.price-compare-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
  font-size: 12px;
  line-height: 1.5;
}

.price-reason-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: left;
}

.price-reason-tip {
  color: #d97706;
  font-size: 12px;
  line-height: 1.4;
}

.history-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.history-title {
  color: #1f2937;
  font-weight: 600;
}

.history-subtitle {
  margin-top: 4px;
  color: #6b7280;
  font-size: 12px;
}
</style>
