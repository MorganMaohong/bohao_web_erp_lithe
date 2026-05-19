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
  NSelect,
  NSpace,
  NSpin,
  NTag,
  useMessage,
} from 'naive-ui'
import { computed, h, onMounted, reactive, ref } from 'vue'

import {
  completeInventoryInbound,
  getInventoryInboundDetail,
  getInventoryInboundForm,
  getInventoryInbounds,
  getTemplateWarehouses,
  type InventoryInboundDetail,
  type InventoryInboundForm,
  type InventoryInboundItemDetail,
  type InventoryInboundPageData,
  type InventoryInboundQuery,
  type InventoryInboundRow,
  type TemplateWarehousePageData,
} from '@/api'

import type { DataTableColumns, PaginationProps } from 'naive-ui'

defineOptions({
  name: 'PurchaseInbound',
})

const PURCHASE_INBOUND = 'purchase_inbound'
const WAIT_COMPLETE = 'wait_complete'

const message = useMessage()

const loading = ref(false)
const submitting = ref(false)
const detailLoading = ref(false)

const showHandleModal = ref(false)
const showDetailDrawer = ref(false)

const query = reactive<InventoryInboundQuery>({
  currentPage: 1,
  pageSize: 20,
  key: '',
  status: null,
  warehouseUid: null,
  type: PURCHASE_INBOUND,
})

const pageData = ref<InventoryInboundPageData>({
  currentPage: 1,
  pageSize: 20,
  count: 0,
  list: [],
  extraData: {
    typeOptions: [],
    statusOptions: [],
    warehouseOptions: [],
  },
})

const formData = ref<InventoryInboundForm>({
  detailList: [],
})

const detailData = ref<InventoryInboundDetail>({
  detailList: [],
  imageList: [],
})

const warehouseData = ref<TemplateWarehousePageData>({
  currentPage: 1,
  pageSize: 500,
  count: 0,
  list: [],
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

const warehouseOptions = computed(() =>
  (warehouseData.value.list || []).map(item => ({
    label: item.code ? `【${item.code}】${item.name || '-'}` : item.name || '-',
    value: item.uid || '',
  })),
)

function statusType(status?: string | null) {
  const normalized = String(status || '').toLowerCase()
  if (normalized.includes('wait')) return 'warning'
  if (normalized.includes('complete')) return 'success'
  if (normalized.includes('cancel')) return 'default'
  return 'default'
}

function canHandle(row?: InventoryInboundRow) {
  return row?.status === WAIT_COMPLETE
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
    pageData.value = await getInventoryInbounds({
      ...query,
      key: query.key || '',
      warehouseUid: query.warehouseUid || null,
      status: query.status || null,
      type: PURCHASE_INBOUND,
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
    warehouseUid: null,
    type: PURCHASE_INBOUND,
  })
  loadTableData()
}

async function openHandleModal(row: InventoryInboundRow) {
  if (!row.uid) return
  submitting.value = true
  try {
    if (!warehouseData.value.list?.length) {
      await loadWarehouses()
    }
    formData.value = await getInventoryInboundForm(row.uid)
    showHandleModal.value = true
  } finally {
    submitting.value = false
  }
}

async function openDetailDrawer(row: InventoryInboundRow) {
  if (!row.uid) return
  showDetailDrawer.value = true
  detailLoading.value = true
  try {
    detailData.value = await getInventoryInboundDetail(row.uid)
  } finally {
    detailLoading.value = false
  }
}

function useAllInbound() {
  ;(formData.value.detailList || []).forEach(item => {
    item.quantity = Number(item.availableQuantity || 0)
  })
}

function validateForm() {
  if (!formData.value.warehouseUid) {
    message.error('请选择入库仓库')
    return false
  }
  const list = (formData.value.detailList || []).filter(item => Number(item.quantity || 0) > 0)
  if (!list.length) {
    message.error('请至少填写一条入库数量')
    return false
  }
  for (const item of list) {
    const quantity = Number(item.quantity || 0)
    const available = Number(item.availableQuantity || 0)
    if (quantity <= 0 || quantity > available) {
      message.error(`【${item.name || '物料'}】入库数量不能超过剩余可入库数量`)
      return false
    }
  }
  formData.value.detailList = list
  formData.value.type = PURCHASE_INBOUND
  return true
}

async function confirmInbound() {
  if (!validateForm() || submitting.value) return
  submitting.value = true
  try {
    await completeInventoryInbound(formData.value)
    message.success('采购入库成功')
    showHandleModal.value = false
    loadTableData()
  } finally {
    submitting.value = false
  }
}

const columns = computed<DataTableColumns<InventoryInboundRow>>(() => [
  { title: '采购入库单号', key: 'code', minWidth: 170, ellipsis: { tooltip: true } },
  { title: '采购订单', key: 'purchaseOrderCode', minWidth: 170, ellipsis: { tooltip: true } },
  { title: '仓库', key: 'warehouseName', minWidth: 140, ellipsis: { tooltip: true } },
  { title: '入库时间', key: 'timeName', minWidth: 170, ellipsis: { tooltip: true } },
  {
    title: '状态',
    key: 'statusName',
    width: 100,
    render: row => h(NTag, { size: 'small', type: statusType(row.status) }, { default: () => row.statusName || '-' }),
  },
  { title: '备注', key: 'remark', minWidth: 220, ellipsis: { tooltip: true } },
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
            ? h(NButton, { text: true, type: 'info', onClick: () => openHandleModal(row) }, { default: () => '入库' })
            : null,
        ],
      }),
  },
])

const formColumns = computed<DataTableColumns<InventoryInboundItemDetail>>(() => [
  { title: '物料名称', key: 'name', minWidth: 160, ellipsis: { tooltip: true } },
  { title: '规格型号', key: 'spec', minWidth: 150, ellipsis: { tooltip: true } },
  { title: '单位', key: 'unitName', width: 90 },
  { title: '订单数量', key: 'totalQuantity', width: 110 },
  { title: '剩余可入库', key: 'availableQuantity', width: 110 },
  {
    title: '本次入库',
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

const detailColumns = computed<DataTableColumns<InventoryInboundItemDetail>>(() => [
  { title: '物料名称', key: 'name', minWidth: 160, ellipsis: { tooltip: true } },
  { title: '规格型号', key: 'spec', minWidth: 150, ellipsis: { tooltip: true } },
  { title: '单位', key: 'unitName', width: 90 },
  { title: '入库数量', key: 'quantity', width: 110 },
  { title: '已退货数量', key: 'returnedQuantity', width: 110 },
])

onMounted(() => {
  loadTableData()
  loadWarehouses()
})
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-4 p-4">
    <NCard size="small" :bordered="false">
      <NForm :model="query" label-placement="left" label-width="72">
        <div class="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-4">
          <NFormItem label="关键字" class="purchase-query-item">
            <NInput v-model:value="query.key" clearable placeholder="入库单号 / 备注" @keydown.enter.prevent="loadTableData" />
          </NFormItem>
          <NFormItem label="仓库" class="purchase-query-item">
            <NSelect v-model:value="query.warehouseUid" clearable :options="warehouseOptions" placeholder="选择仓库" />
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
        <div class="text-sm text-neutral-500 dark:text-neutral-400">采购入库列表</div>
        <div class="text-sm text-neutral-500 dark:text-neutral-400">处理采购订单到货入库，控制每次实际入库数量</div>
      </div>

      <NDataTable
        remote
        flex-height
        :loading="loading"
        :columns="columns"
        :data="pageData.list || []"
        :pagination="false"
        :scroll-x="1180"
        size="small"
      />

      <div class="mt-3 flex justify-end">
        <NPagination v-bind="pagination" :disabled="loading" :prefix="({ itemCount }) => `共 ${itemCount} 条`" />
      </div>
    </NCard>

    <NModal v-model:show="showHandleModal" preset="card" class="w-[1280px] max-w-[96vw]" title="采购入库执行">
      <div class="purchase-modal-body">
        <NCard size="small" embedded>
          <NForm label-placement="left" label-width="90">
            <div class="grid grid-cols-1 gap-x-4 gap-y-1 md:grid-cols-3">
              <NFormItem label="入库单号">
                <NInput :value="formData.code || ''" disabled />
              </NFormItem>
              <NFormItem label="入库时间">
                <NDatePicker v-model:value="formData.time as number" type="datetime" class="w-full" />
              </NFormItem>
              <NFormItem label="入库仓库">
                <NSelect v-model:value="formData.warehouseUid" :options="warehouseOptions" clearable placeholder="选择仓库" />
              </NFormItem>
              <NFormItem label="采购订单" class="md:col-span-3">
                <NInput :value="formData.purchaseOrderCode || '-'" disabled />
              </NFormItem>
              <NFormItem label="备注" class="md:col-span-3">
                <NInput v-model:value="formData.remark" type="textarea" :autosize="{ minRows: 2, maxRows: 4 }" />
              </NFormItem>
            </div>
          </NForm>
        </NCard>

        <NCard size="small" embedded>
          <template #header-extra>
            <NButton type="primary" secondary attr-type="button" @click="useAllInbound">全部入库</NButton>
          </template>
          <NDataTable :columns="formColumns" :data="formData.detailList || []" :pagination="false" :scroll-x="860" size="small" />
        </NCard>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <NButton attr-type="button" @click="showHandleModal = false">取消</NButton>
          <NButton type="primary" attr-type="button" :loading="submitting" @click="confirmInbound">确定入库</NButton>
        </div>
      </template>
    </NModal>

    <NDrawer v-model:show="showDetailDrawer" :width="1180" placement="right">
      <NDrawerContent title="采购入库详情" :native-scrollbar="false">
        <NSpin :show="detailLoading">
          <div class="flex flex-col gap-4">
            <NDescriptions bordered :column="3" size="small" label-placement="left">
              <NDescriptionsItem label="入库单号">{{ detailData.code || '-' }}</NDescriptionsItem>
              <NDescriptionsItem label="采购订单">{{ detailData.purchaseOrderCode || '-' }}</NDescriptionsItem>
              <NDescriptionsItem label="状态">
                <NTag size="small" :type="statusType(detailData.status)">{{ detailData.statusName || '-' }}</NTag>
              </NDescriptionsItem>
              <NDescriptionsItem label="仓库">{{ detailData.warehouseName || '-' }}</NDescriptionsItem>
              <NDescriptionsItem label="入库时间">{{ detailData.timeName || '-' }}</NDescriptionsItem>
              <NDescriptionsItem label="备注">{{ detailData.remark || '-' }}</NDescriptionsItem>
            </NDescriptions>

            <NDataTable :columns="detailColumns" :data="detailData.detailList || []" :pagination="false" :scroll-x="760" size="small" />
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
