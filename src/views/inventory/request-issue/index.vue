<script setup lang="ts">
import {
  NAlert,
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
  NInput,
  NModal,
  NPagination,
  NPopconfirm,
  NSelect,
  NSpace,
  NTag,
  useMessage,
} from 'naive-ui'
import { computed, h, onMounted, reactive, ref } from 'vue'

import {
  getInventoryRequestIssueDetail,
  getInventoryRequestIssueList,
  issueAllInventoryRequest,
  partialIssueInventoryRequest,
  unableIssueInventoryRequest,
  type InventoryRequestDetail,
  type InventoryRequestIssueForm,
  type InventoryRequestItemDetail,
  type InventoryRequestPageData,
  type InventoryRequestQuery,
  type InventoryRequestRow,
} from '@/api'

import type { DataTableColumns, PaginationProps } from 'naive-ui'

defineOptions({
  name: 'InventoryRequestIssue',
})

const message = useMessage()

const loading = ref(false)
const submitting = ref(false)
const detailLoading = ref(false)

const showIssueModal = ref(false)
const showDetailDrawer = ref(false)
const issueMode = ref<'partial' | 'all' | 'unable'>('partial')

const query = reactive<InventoryRequestQuery>({
  currentPage: 1,
  pageSize: 20,
  key: '',
  warehouseUid: null,
  usageType: null,
})

const pageData = ref<InventoryRequestPageData>({
  currentPage: 1,
  pageSize: 20,
  count: 0,
  list: [],
  extraData: {
    warehouseOptions: [],
    usageTypeOptions: [],
  },
})

const detailData = ref<InventoryRequestDetail>({
  detailList: [],
})

const issueForm = reactive<InventoryRequestIssueForm>({
  uid: null,
  comment: '',
  detailList: [],
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

const remainQuantity = (row: InventoryRequestItemDetail) =>
  Math.max(Number(row.quantity || 0) - Number(row.issuedQuantity || 0), 0)

function issueTitle() {
  if (issueMode.value === 'all') return '全部出库'
  if (issueMode.value === 'unable') return '无法出库'
  return '部分出库'
}

function statusType(status?: string | null) {
  const normalized = String(status || '').toLowerCase()
  if (normalized.includes('part')) return 'warning'
  if (normalized.includes('wait') || normalized.includes('approve') || normalized.includes('pass')) return 'info'
  return 'default'
}

function parseIssueQuantity(row: InventoryRequestItemDetail) {
  if (row.issueQuantity === undefined || row.issueQuantity === null || row.issueQuantity === '') return 0
  return Number(row.issueQuantity)
}

function validateIssueQuantity(row: InventoryRequestItemDetail, showTip = true) {
  const current = parseIssueQuantity(row)
  const remain = remainQuantity(row)
  if (!Number.isFinite(current)) {
    if (showTip) message.error(`【${row.name || '物料'}】本次出库数量格式不正确`)
    return false
  }
  if (current < 0) {
    if (showTip) message.error(`【${row.name || '物料'}】本次出库数量不能小于 0`)
    return false
  }
  if (current > remain) {
    if (showTip) message.error(`【${row.name || '物料'}】本次出库数量不能超过剩余可出库数量 ${remain}`)
    return false
  }
  return true
}

async function loadTableData() {
  loading.value = true
  try {
    pageData.value = await getInventoryRequestIssueList({
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
    warehouseUid: null,
    usageType: null,
  })
  loadTableData()
}

async function openDetailDrawer(row: InventoryRequestRow) {
  if (!row.uid) return
  detailLoading.value = true
  showDetailDrawer.value = true
  try {
    detailData.value = await getInventoryRequestIssueDetail(row.uid)
  } finally {
    detailLoading.value = false
  }
}

async function openIssueModal(uid: string, mode: 'partial' | 'all' | 'unable') {
  issueMode.value = mode
  detailData.value = await getInventoryRequestIssueDetail(uid)
  issueForm.uid = uid
  issueForm.comment = ''
  issueForm.detailList = []
  ;(detailData.value.detailList || []).forEach((item) => {
    item.issueQuantity = mode === 'all' ? String(remainQuantity(item)) : undefined
  })
  showIssueModal.value = true
}

async function confirmIssueAll(row: InventoryRequestRow) {
  if (!row.uid) return
  await openIssueModal(row.uid, 'all')
}

async function confirmUnable(row: InventoryRequestRow) {
  if (!row.uid) return
  await openIssueModal(row.uid, 'unable')
}

async function submitIssue() {
  if (!issueForm.uid) return
  if (issueMode.value === 'unable' && !issueForm.comment) {
    message.error('请填写无法出库原因')
    return
  }

  submitting.value = true
  try {
    if (issueMode.value === 'all') {
      await issueAllInventoryRequest(issueForm)
    } else if (issueMode.value === 'unable') {
      await unableIssueInventoryRequest(issueForm)
    } else {
      const detailList = (detailData.value.detailList || [])
        .filter(item => parseIssueQuantity(item) > 0)
        .map(item => ({
          detailUid: item.uid,
          quantity: parseIssueQuantity(item),
        }))

      if (!detailList.length) {
        message.error('请至少填写一条本次出库数量')
        return
      }

      for (const item of detailData.value.detailList || []) {
        if (!validateIssueQuantity(item)) return
      }

      await partialIssueInventoryRequest({
        ...issueForm,
        detailList,
      })
    }

    message.success('操作成功')
    showIssueModal.value = false
    await loadTableData()
  } finally {
    submitting.value = false
  }
}

const columns = computed<DataTableColumns<InventoryRequestRow>>(() => [
  { title: '申请单号', key: 'code', minWidth: 160, ellipsis: { tooltip: true } },
  { title: '领料仓库', key: 'warehouseName', minWidth: 140, ellipsis: { tooltip: true } },
  { title: '用途类型', key: 'usageTypeName', minWidth: 140, ellipsis: { tooltip: true } },
  { title: '业务类型', key: 'bizTypeName', minWidth: 130, ellipsis: { tooltip: true } },
  { title: '关联对象', key: 'bizName', minWidth: 180, ellipsis: { tooltip: true } },
  { title: '申请总量', key: 'totalQuantity', width: 110 },
  {
    title: '状态',
    key: 'statusName',
    width: 120,
    render: row => h(NTag, { size: 'small', type: statusType(row.status) }, { default: () => row.statusName || '-' }),
  },
  { title: '期望时间', key: 'expectTimeName', minWidth: 160, ellipsis: { tooltip: true } },
  {
    title: '操作',
    key: 'actions',
    fixed: 'right',
    width: 280,
    render: row =>
      h(NSpace, { size: 8 }, {
        default: () => [
          h(NButton, { text: true, type: 'primary', onClick: () => row.uid && openIssueModal(row.uid, 'partial') }, { default: () => '部分出库' }),
          h(
            NPopconfirm,
            {
              onPositiveClick: () => confirmIssueAll(row),
            },
            {
              trigger: () => h(NButton, { text: true, type: 'success' }, { default: () => '全部出库' }),
              default: () => '将按剩余未出库数量一次性生成正式出库单并扣减库存，确认继续？',
            },
          ),
          h(NButton, { text: true, type: 'warning', onClick: () => confirmUnable(row) }, { default: () => '无法出库' }),
          h(NButton, { text: true, onClick: () => openDetailDrawer(row) }, { default: () => '详情' }),
        ],
      }),
  },
])

const issueColumns = computed<DataTableColumns<InventoryRequestItemDetail>>(() => [
  { title: '物料名称', key: 'name', minWidth: 180, ellipsis: { tooltip: true } },
  { title: '规格', key: 'spec', minWidth: 130, ellipsis: { tooltip: true } },
  { title: '材质', key: 'material', minWidth: 120, ellipsis: { tooltip: true } },
  { title: '单位', key: 'unitName', width: 90 },
  { title: '申请数量', key: 'quantity', width: 110 },
  { title: '已出库', key: 'issuedQuantity', width: 110 },
  { title: '可用库存', key: 'availableQuantity', width: 110 },
  {
    title: '剩余可出库',
    key: 'remainQuantity',
    width: 120,
    render: (row: InventoryRequestItemDetail) => remainQuantity(row),
  },
  issueMode.value !== 'unable'
    ? {
        title: '本次出库',
        key: 'issueQuantity',
        width: 150,
        render: (row: InventoryRequestItemDetail) =>
          issueMode.value === 'all'
            ? h('span', {}, String(row.issueQuantity || 0))
            : h(NInput, {
                value: row.issueQuantity as string | undefined,
                placeholder: '请输入数量',
                onUpdateValue: value => {
                  row.issueQuantity = value
                },
                onBlur: () => validateIssueQuantity(row),
              }),
      }
    : null,
  { title: '备注', key: 'remark', minWidth: 180, ellipsis: { tooltip: true } },
].filter(Boolean) as DataTableColumns<InventoryRequestItemDetail>)

const detailColumns = computed<DataTableColumns<InventoryRequestItemDetail>>(() => [
  { title: '物料名称', key: 'name', minWidth: 180, ellipsis: { tooltip: true } },
  { title: '规格', key: 'spec', minWidth: 130, ellipsis: { tooltip: true } },
  { title: '材质', key: 'material', minWidth: 120, ellipsis: { tooltip: true } },
  { title: '单位', key: 'unitName', width: 90 },
  { title: '申请数量', key: 'quantity', width: 110 },
  { title: '已出库', key: 'issuedQuantity', width: 110 },
  { title: '可用库存', key: 'availableQuantity', width: 110 },
  {
    title: '剩余可出库',
    key: 'remainQuantity',
    width: 120,
    render: row => remainQuantity(row),
  },
  { title: '备注', key: 'remark', minWidth: 180, ellipsis: { tooltip: true } },
])

onMounted(() => {
  loadTableData()
})
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-4 p-4">
    <NCard size="small" :bordered="false">
      <NForm :model="query" inline label-placement="left" :show-feedback="false" class="request-issue-search">
        <NFormItem label="关键词">
          <NInput v-model:value="query.key" placeholder="申请单号 / 用途 / 备注" clearable />
        </NFormItem>
        <NFormItem label="领料仓库">
          <NSelect
            v-model:value="query.warehouseUid"
            :options="pageData.extraData?.warehouseOptions || []"
            placeholder="请选择仓库"
            filterable
            clearable
            class="w-[180px]"
          />
        </NFormItem>
        <NFormItem label="用途类型">
          <NSelect
            v-model:value="query.usageType"
            :options="pageData.extraData?.usageTypeOptions || []"
            placeholder="请选择用途"
            clearable
            class="w-[180px]"
          />
        </NFormItem>
        <NFormItem>
          <NFlex size="small">
            <NButton type="primary" attr-type="button" @click="loadTableData">查询</NButton>
            <NButton attr-type="button" @click="resetQuery">重置</NButton>
          </NFlex>
        </NFormItem>
      </NForm>
    </NCard>

    <NCard size="small" :bordered="false" class="flex min-h-0 flex-1 flex-col">
      <div class="mb-3 flex items-center justify-between">
        <div class="text-sm text-neutral-500 dark:text-neutral-400">领料出库执行</div>
        <div class="text-sm text-neutral-500 dark:text-neutral-400">支持部分出库、全部出库、无法出库</div>
      </div>

      <NDataTable
        remote
        flex-height
        :loading="loading"
        :columns="columns"
        :data="pageData.list || []"
        :pagination="false"
        :scroll-x="1560"
        size="small"
      />

      <div class="mt-3 flex justify-end">
        <NPagination v-bind="pagination" :disabled="loading" :prefix="({ itemCount }) => `共 ${itemCount} 条`" />
      </div>
    </NCard>

    <NModal v-model:show="showIssueModal" preset="card" class="w-[1100px] max-w-[96vw]" :title="issueTitle()">
      <NAlert v-if="issueMode === 'all'" type="success" :show-icon="false" class="mb-3">
        全部出库会按剩余未出库数量扣减库存，若库存不足会直接提示。
      </NAlert>
      <NAlert v-else-if="issueMode === 'unable'" type="warning" :show-icon="false" class="mb-3">
        无法出库会关闭当前领料申请，请填写原因，方便后续追踪。
      </NAlert>

      <NDescriptions bordered :column="4" size="small" title="领料申请信息">
        <NDescriptionsItem label="申请单号">{{ detailData.code || '-' }}</NDescriptionsItem>
        <NDescriptionsItem label="领料仓库">{{ detailData.warehouseName || '-' }}</NDescriptionsItem>
        <NDescriptionsItem label="用途类型">{{ detailData.usageTypeName || '-' }}</NDescriptionsItem>
        <NDescriptionsItem label="关联对象">{{ detailData.bizName || '-' }}</NDescriptionsItem>
        <NDescriptionsItem label="备注" :span="4">{{ detailData.remark || '-' }}</NDescriptionsItem>
      </NDescriptions>

      <div class="mt-4">
        <NDataTable :columns="issueColumns" :data="detailData.detailList || []" :pagination="false" :scroll-x="1250" size="small" />
      </div>

      <NFormItem :label="issueMode === 'unable' ? '无法出库原因' : '出库说明'" class="mt-4">
        <NInput
          v-model:value="issueForm.comment"
          type="textarea"
          :placeholder="issueMode === 'unable' ? '请填写无法出库原因' : '请输入本次出库说明'"
        />
      </NFormItem>

      <template #footer>
        <NFlex justify="end">
          <NButton attr-type="button" @click="showIssueModal = false">取消</NButton>
          <NButton type="primary" attr-type="button" :loading="submitting" @click="submitIssue">确定</NButton>
        </NFlex>
      </template>
    </NModal>

    <NDrawer v-model:show="showDetailDrawer" :width="1100" placement="right">
      <NDrawerContent title="领料申请详情" :native-scrollbar="false">
        <NDescriptions bordered :column="4" size="small" title="基础信息">
          <NDescriptionsItem label="申请单号">{{ detailData.code || '-' }}</NDescriptionsItem>
          <NDescriptionsItem label="状态">{{ detailData.statusName || '-' }}</NDescriptionsItem>
          <NDescriptionsItem label="领料仓库">{{ detailData.warehouseName || '-' }}</NDescriptionsItem>
          <NDescriptionsItem label="申请总量">{{ detailData.totalQuantity || 0 }}</NDescriptionsItem>
          <NDescriptionsItem label="用途类型">{{ detailData.usageTypeName || '-' }}</NDescriptionsItem>
          <NDescriptionsItem label="业务类型">{{ detailData.bizTypeName || '-' }}</NDescriptionsItem>
          <NDescriptionsItem label="关联对象">{{ detailData.bizName || '-' }}</NDescriptionsItem>
          <NDescriptionsItem label="期望时间">{{ detailData.expectTimeName || '-' }}</NDescriptionsItem>
          <NDescriptionsItem label="备注" :span="4">{{ detailData.remark || '-' }}</NDescriptionsItem>
        </NDescriptions>

        <div class="mt-4">
          <NDataTable :loading="detailLoading" :columns="detailColumns" :data="detailData.detailList || []" :pagination="false" :scroll-x="1150" size="small" />
        </div>
      </NDrawerContent>
    </NDrawer>
  </div>
</template>

<style scoped>
.request-issue-search {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  align-items: center;
}
</style>
