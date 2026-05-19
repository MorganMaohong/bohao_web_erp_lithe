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
  NInput,
  NInputNumber,
  NModal,
  NPagination,
  NRadio,
  NRadioGroup,
  NSpace,
  NSelect,
  NSpin,
  NTag,
  useMessage,
} from 'naive-ui'
import { computed, h, onMounted, reactive, ref } from 'vue'

import {
  completeInventoryOutbound,
  getInventoryOutboundDetail,
  getInventoryOutboundForm,
  getInventoryOutbounds,
  type InventoryOutboundDetail,
  type InventoryOutboundForm,
  type InventoryOutboundItemDetail,
  type InventoryOutboundPageData,
  type InventoryOutboundQuery,
  type InventoryOutboundRow,
  type PurchaseReturnRecord,
} from '@/api'

import type { DataTableColumns, PaginationProps } from 'naive-ui'

defineOptions({
  name: 'PurchaseReturn',
})

const PURCHASE_RETURN = 'purchase_return'
const WAIT_COMPLETE = 'wait_complete'
const REFUND = 'refund'
const RESEND = 'resend'

const message = useMessage()

const loading = ref(false)
const submitting = ref(false)
const detailLoading = ref(false)

const showHandleModal = ref(false)
const showDetailDrawer = ref(false)

const query = reactive<InventoryOutboundQuery>({
  currentPage: 1,
  pageSize: 20,
  key: '',
  status: null,
  purchaseReturnType: null,
  warehouseUid: null,
  type: PURCHASE_RETURN,
})

const pageData = ref<InventoryOutboundPageData>({
  currentPage: 1,
  pageSize: 20,
  count: 0,
  list: [],
  extraData: {
    typeOptions: [],
    statusOptions: [],
    warehouseOptions: [],
    purchaseReturnTypeOptions: [],
  },
})

const formData = ref<InventoryOutboundForm>({
    detailList: [],
    recordList: [],
    purchaseReturnType: REFUND,
})

const detailData = ref<InventoryOutboundDetail>({
  detailList: [],
  imageList: [],
  recordList: [],
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

function statusType(status?: string | null) {
  const normalized = String(status || '').toLowerCase()
  if (normalized.includes('wait')) return 'warning'
  if (normalized.includes('complete')) return 'success'
  if (normalized.includes('cancel')) return 'default'
  return 'default'
}

function canHandle(row?: InventoryOutboundRow) {
  return row?.status === WAIT_COMPLETE
}

function formatCodeList(list?: string[]) {
  return (list || []).filter(Boolean).join('、') || '-'
}

function getResendOrderUid(index: number) {
  const uids = String(detailData.value.resendOrderUids || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
  return uids[index]
}

async function loadTableData() {
  loading.value = true
  try {
    pageData.value = await getInventoryOutbounds({
      ...query,
      key: query.key || '',
      status: query.status || null,
      purchaseReturnType: query.purchaseReturnType || null,
      warehouseUid: query.warehouseUid || null,
      type: PURCHASE_RETURN,
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
    status: null,
    purchaseReturnType: null,
    warehouseUid: null,
    type: PURCHASE_RETURN,
  })
  loadTableData()
}

async function openHandleModal(row: InventoryOutboundRow) {
  if (!row.uid) return
  submitting.value = true
  try {
    formData.value = await getInventoryOutboundForm(row.uid)
    if (!formData.value.purchaseReturnType) {
      formData.value.purchaseReturnType = REFUND
    }
    showHandleModal.value = true
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

function validateForm() {
  if (!formData.value.purchaseReturnType) {
    message.error('请选择退货方式')
    return false
  }
  const list = (formData.value.detailList || []).filter(item => Number(item.quantity || 0) > 0)
  if (!list.length) {
    message.error('请至少填写一条退货数量')
    return false
  }
  for (const item of list) {
    const quantity = Number(item.quantity || 0)
    const available = Number(item.availableQuantity || 0)
    if (quantity <= 0 || quantity > available) {
      message.error(`【${item.name || '物料'}】退货数量不能超过最大可退数量`)
      return false
    }
  }
  formData.value.detailList = list
  formData.value.type = PURCHASE_RETURN
  return true
}

async function confirmReturn() {
  if (!validateForm() || submitting.value) return
  submitting.value = true
  try {
    await completeInventoryOutbound(formData.value)
    message.success('采购退货成功')
    showHandleModal.value = false
    loadTableData()
  } finally {
    submitting.value = false
  }
}

const columns = computed<DataTableColumns<InventoryOutboundRow>>(() => [
  { title: '采购退货单号', key: 'code', minWidth: 170, ellipsis: { tooltip: true } },
  { title: '采购订单', key: 'purchaseOrderCode', minWidth: 170, ellipsis: { tooltip: true } },
  { title: '退货方式', key: 'purchaseReturnTypeName', width: 120, ellipsis: { tooltip: true } },
  { title: '本次退货数量', key: 'totalQuantity', width: 120 },
  {
    title: '补发订单',
    key: 'resendOrderCodeList',
    minWidth: 200,
    render: row => formatCodeList(row.resendOrderCodeList),
  },
  { title: '退货时间', key: 'timeName', minWidth: 170, ellipsis: { tooltip: true } },
  {
    title: '状态',
    key: 'statusName',
    width: 100,
    render: row => h(NTag, { size: 'small', type: statusType(row.status) }, { default: () => row.statusName || '-' }),
  },
  {
    title: '操作',
    key: 'actions',
    fixed: 'right',
    width: 160,
    render: row =>
      h(NSpace, { size: 8 }, {
        default: () => [
          h(NButton, { text: true, type: 'primary', onClick: () => openDetailDrawer(row) }, { default: () => '详情' }),
          canHandle(row)
            ? h(NButton, { text: true, type: 'info', onClick: () => openHandleModal(row) }, { default: () => '退货' })
            : null,
        ],
      }),
  },
])

const recordColumns = computed<DataTableColumns<PurchaseReturnRecord>>(() => [
  { title: '退货单号', key: 'code', minWidth: 160, ellipsis: { tooltip: true } },
  { title: '退货方式', key: 'purchaseReturnTypeName', width: 120, ellipsis: { tooltip: true } },
  { title: '退货数量', key: 'totalQuantity', width: 110 },
  { title: '时间', key: 'timeName', minWidth: 170, ellipsis: { tooltip: true } },
  {
    title: '补发订单',
    key: 'resendOrderCodeList',
    minWidth: 180,
    render: row => formatCodeList(row.resendOrderCodeList),
  },
])

const formColumns = computed<DataTableColumns<InventoryOutboundItemDetail>>(() => [
  { title: '物料名称', key: 'name', minWidth: 160, ellipsis: { tooltip: true } },
  { title: '规格型号', key: 'spec', minWidth: 150, ellipsis: { tooltip: true } },
  { title: '单位', key: 'unitName', width: 90 },
  { title: '确认到货', key: 'totalQuantity', width: 110 },
  { title: '剩余可退', key: 'availableQuantity', width: 110 },
  {
    title: '本次退货',
    key: 'quantity',
    width: 140,
    render: (row, index) =>
      h(NInputNumber, {
        value: Number(row.quantity || 0),
        min: 0,
        max: Number(row.availableQuantity || 0),
        precision: 2,
        onUpdateValue: value => {
          formData.value.detailList![index].quantity = value || 0
        },
      }),
  },
])

const detailColumns = computed<DataTableColumns<InventoryOutboundItemDetail>>(() => [
  { title: '物料名称', key: 'name', minWidth: 160, ellipsis: { tooltip: true } },
  { title: '规格型号', key: 'spec', minWidth: 150, ellipsis: { tooltip: true } },
  { title: '单位', key: 'unitName', width: 90 },
  { title: '退货数量', key: 'quantity', width: 110 },
])

onMounted(() => {
  loadTableData()
})
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-4 p-4">
    <NCard size="small" :bordered="false">
      <NForm :model="query" label-placement="left" label-width="72">
        <div class="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-4">
          <NFormItem label="关键字" class="purchase-query-item">
            <NInput v-model:value="query.key" clearable placeholder="退货单号 / 备注" @keydown.enter.prevent="loadTableData" />
          </NFormItem>
          <NFormItem label="退货方式" class="purchase-query-item">
            <NSelect v-model:value="query.purchaseReturnType" clearable :options="pageData.extraData?.purchaseReturnTypeOptions || []" placeholder="选择退货方式" />
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
        <div class="text-sm text-neutral-500 dark:text-neutral-400">采购退货列表</div>
        <div class="text-sm text-neutral-500 dark:text-neutral-400">处理采购到货后的退货退款或补发重发</div>
      </div>

      <NDataTable
        remote
        flex-height
        :loading="loading"
        :columns="columns"
        :data="pageData.list || []"
        :pagination="false"
        :scroll-x="1320"
        size="small"
      />

      <div class="mt-3 flex justify-end">
        <NPagination v-bind="pagination" :disabled="loading" :prefix="({ itemCount }) => `共 ${itemCount} 条`" />
      </div>
    </NCard>

    <NModal v-model:show="showHandleModal" preset="card" class="w-[1400px] max-w-[96vw]" title="采购退货执行">
      <div class="purchase-modal-body">
        <NCard size="small" embedded>
          <NForm label-placement="left" label-width="100">
            <div class="grid grid-cols-1 gap-x-4 gap-y-1 md:grid-cols-2">
              <NFormItem label="退货单号">
                <NInput :value="formData.code || ''" disabled />
              </NFormItem>
              <NFormItem label="退货时间">
                <NDatePicker v-model:value="formData.time as number" type="datetime" class="w-full" />
              </NFormItem>
              <NFormItem label="退货方式" class="md:col-span-2">
                <NRadioGroup v-model:value="formData.purchaseReturnType">
                  <NSpace>
                    <NRadio :value="REFUND">退货退款</NRadio>
                    <NRadio :value="RESEND">重新补发</NRadio>
                  </NSpace>
                </NRadioGroup>
              </NFormItem>
              <NFormItem label="备注" class="md:col-span-2">
                <NInput v-model:value="formData.remark" type="textarea" :autosize="{ minRows: 2, maxRows: 4 }" />
              </NFormItem>
            </div>
          </NForm>
        </NCard>

        <NCard v-if="(formData.recordList || []).length" size="small" embedded>
          <div class="mb-3 text-sm font-medium text-neutral-900 dark:text-neutral-100">历史退货记录</div>
          <NDataTable :columns="recordColumns" :data="formData.recordList || []" :pagination="false" :scroll-x="780" size="small" />
        </NCard>

        <NCard size="small" embedded>
          <NDataTable :columns="formColumns" :data="formData.detailList || []" :pagination="false" :scroll-x="860" size="small" />
        </NCard>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <NButton attr-type="button" @click="showHandleModal = false">取消</NButton>
          <NButton type="primary" attr-type="button" :loading="submitting" @click="confirmReturn">确定退货</NButton>
        </div>
      </template>
    </NModal>

    <NDrawer v-model:show="showDetailDrawer" :width="1280" placement="right">
      <NDrawerContent title="采购退货详情" :native-scrollbar="false">
        <NSpin :show="detailLoading">
          <div class="flex flex-col gap-4">
            <NDescriptions bordered :column="3" size="small" label-placement="left">
              <NDescriptionsItem label="退货单号">{{ detailData.code || '-' }}</NDescriptionsItem>
              <NDescriptionsItem label="采购订单">{{ detailData.purchaseOrderCode || '-' }}</NDescriptionsItem>
              <NDescriptionsItem label="退货方式">{{ detailData.purchaseReturnTypeName || '-' }}</NDescriptionsItem>
              <NDescriptionsItem label="退货时间">{{ detailData.timeName || '-' }}</NDescriptionsItem>
              <NDescriptionsItem label="补发订单">
                <span v-if="(detailData.resendOrderCodeList || []).length">
                  {{ formatCodeList(detailData.resendOrderCodeList) }}
                </span>
                <span v-else>-</span>
              </NDescriptionsItem>
              <NDescriptionsItem label="补发订单 UID">
                <span v-if="(detailData.resendOrderCodeList || []).length">
                  {{ (detailData.resendOrderCodeList || []).map((_code, index) => getResendOrderUid(index)).filter(Boolean).join('、') || '-' }}
                </span>
                <span v-else>-</span>
              </NDescriptionsItem>
            </NDescriptions>

            <NCard v-if="(detailData.recordList || []).length" size="small" embedded>
              <div class="mb-3 text-sm font-medium text-neutral-900 dark:text-neutral-100">退货操作记录</div>
              <NDataTable :columns="recordColumns" :data="detailData.recordList || []" :pagination="false" :scroll-x="780" size="small" />
            </NCard>

            <NDataTable :columns="detailColumns" :data="detailData.detailList || []" :pagination="false" :scroll-x="620" size="small" />
          </div>
        </NSpin>
      </NDrawerContent>
    </NDrawer>
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
</style>
