<script setup lang="ts">
import {
  NAlert,
  NButton,
  NCard,
  NDataTable,
  NDescriptions,
  NDescriptionsItem,
  NDivider,
  NDrawer,
  NDrawerContent,
  NDynamicTags,
  NEmpty,
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
  NSpin,
  NTable,
  NTag,
  NText,
  NDatePicker,
  useMessage,
} from 'naive-ui'
import { computed, h, onMounted, reactive, ref } from 'vue'

import {
  closeProductionPlan,
  deleteProductionPlan,
  getProductionPlanDetail,
  getProductionPlanForm,
  getProductionPlans,
  getTemplateItems,
  getTemplateWarehouses,
  saveProductionPlan,
  type ProductionPlanBomItem,
  type ProductionPlanDetail,
  type ProductionPlanFinishOrderItem,
  type ProductionPlanForm,
  type ProductionPlanIssueOrderItem,
  type ProductionPlanPageData,
  type ProductionPlanProductItem,
  type ProductionPlanQuery,
  type ProductionPlanRow,
  type ProductionPlanStage,
  type TemplateItem,
  type TemplateItemPageData,
  type TemplateWarehousePageData,
} from '@/api'

import type { DataTableColumns, PaginationProps } from 'naive-ui'

defineOptions({
  name: 'ProductPlan',
})

const statusOptions = [
  { label: '审批中', value: 'running' },
  { label: '已完成', value: 'completed' },
  { label: '已驳回', value: 'reject' },
  { label: '已关闭', value: 'closed' },
]

const message = useMessage()

const loading = ref(false)
const submitting = ref(false)
const detailLoading = ref(false)
const optionLoading = ref(false)

const showEditModal = ref(false)
const showDetailDrawer = ref(false)
const showCloseModal = ref(false)

const query = reactive<ProductionPlanQuery>({
  currentPage: 1,
  pageSize: 20,
  key: '',
  status: '',
})

const pageData = ref<ProductionPlanPageData>({
  currentPage: 1,
  pageSize: 20,
  count: 0,
  list: [],
})

const itemPageData = ref<TemplateItemPageData>({
  currentPage: 1,
  pageSize: 500,
  count: 0,
  list: [],
})

const warehousePageData = ref<TemplateWarehousePageData>({
  currentPage: 1,
  pageSize: 500,
  count: 0,
  list: [],
})

const form = reactive<ProductionPlanForm>({
  imageList: [],
  docList: [],
  productList: [],
  productOptions: [],
  warehouseOptions: [],
})

const detailData = ref<ProductionPlanDetail>({
  productList: [],
  bomList: [],
  processList: [],
  issueOrderList: [],
  finishOrderList: [],
  stageList: [],
  imageList: [],
  docList: [],
})

const closeForm = reactive({
  uid: '',
  closeReason: '',
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

const productOptions = computed(() =>
  (itemPageData.value.list || []).map(item => ({
    label: formatItemLabel(item.name, item.spec),
    value: item.uid || '',
  })),
)

const warehouseOptions = computed(() =>
  (warehousePageData.value.list || []).map(item => ({
    label: item.code ? `【${item.code}】${item.name || '-'}` : item.name || '-',
    value: item.uid || '',
  })),
)

const planFormReadonly = computed(() => Boolean(form.uid) && form.canEditPlan === false)

function formatItemLabel(name?: string, spec?: string) {
  if (!name) return '-'
  return spec ? `${name} / ${spec}` : name
}

function formatTime(value?: number | string | null) {
  if (!value) return '-'
  const date = new Date(Number(value))
  if (Number.isNaN(date.getTime())) return String(value)
  const yyyy = date.getFullYear()
  const mm = `${date.getMonth() + 1}`.padStart(2, '0')
  const dd = `${date.getDate()}`.padStart(2, '0')
  const hh = `${date.getHours()}`.padStart(2, '0')
  const mi = `${date.getMinutes()}`.padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
}

function statusType(status?: string | null) {
  const normalized = String(status || '').toLowerCase()
  if (normalized.includes('completed')) return 'success'
  if (normalized.includes('running') || normalized.includes('wait')) return 'warning'
  if (normalized.includes('reject')) return 'error'
  if (normalized.includes('closed')) return 'default'
  return 'default'
}

function stageTagType(stage?: ProductionPlanStage) {
  if (stage?.completed) return 'success'
  if (stage?.current) return 'warning'
  return 'default'
}

function resetForm() {
  Object.assign(form, {
    uid: null,
    name: '',
    startTime: null,
    planCompleteTime: null,
    remark: '',
    imageList: [],
    docList: [],
    productList: [],
    productOptions: productOptions.value,
    warehouseOptions: warehouseOptions.value,
    canEditPlan: true,
  })
}

async function loadBaseOptions() {
  optionLoading.value = true
  try {
    const [items, warehouses] = await Promise.all([
      getTemplateItems({
        currentPage: 1,
        pageSize: 500,
        key: '',
        itemBizType: 'finished_product',
      }),
      getTemplateWarehouses({
        currentPage: 1,
        pageSize: 500,
        key: '',
      }),
    ])
    itemPageData.value = items
    warehousePageData.value = warehouses
  } finally {
    optionLoading.value = false
  }
}

async function loadTableData() {
  loading.value = true
  try {
    pageData.value = await getProductionPlans({
      ...query,
      key: query.key || '',
      status: query.status || '',
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
  })
  loadTableData()
}

function addProductRow() {
  form.productList = form.productList || []
  form.productList.push({ quantity: 1 })
}

function removeProductRow(index: number) {
  form.productList?.splice(index, 1)
}

function handleProductChange(item: ProductionPlanProductItem) {
  const source = (itemPageData.value.list || []).find(v => v.uid === item.itemUid)
  item.name = source?.name
  item.image = source?.image
  item.unit = source?.unit
  item.unitName = source?.unitName
  item.type = source?.type
  item.typeName = source?.typeName
  item.spec = source?.spec
  item.material = source?.material
  item.itemBizType = source?.itemBizType
  item.itemBizTypeName = source?.itemBizTypeName
}

async function openCreateModal() {
  if (!itemPageData.value.list?.length || !warehousePageData.value.list?.length) {
    await loadBaseOptions()
  }
  const payload = await getProductionPlanForm()
  resetForm()
  Object.assign(form, payload, {
    imageList: payload.imageList || [],
    docList: payload.docList || [],
    productList: payload.productList || [],
    productOptions: payload.productOptions || productOptions.value,
    warehouseOptions: payload.warehouseOptions || warehouseOptions.value,
  })
  showEditModal.value = true
}

async function openEditModal(row: ProductionPlanRow) {
  if (!row.uid) return
  if (!itemPageData.value.list?.length || !warehousePageData.value.list?.length) {
    await loadBaseOptions()
  }
  submitting.value = true
  try {
    const payload = await getProductionPlanForm(row.uid)
    resetForm()
    Object.assign(form, payload, {
      imageList: payload.imageList || [],
      docList: payload.docList || [],
      productList: payload.productList || [],
      productOptions: payload.productOptions || productOptions.value,
      warehouseOptions: payload.warehouseOptions || warehouseOptions.value,
    })
    showEditModal.value = true
  } finally {
    submitting.value = false
  }
}

async function openDetailDrawer(row: ProductionPlanRow) {
  if (!row.uid) return
  showDetailDrawer.value = true
  detailLoading.value = true
  try {
    detailData.value = await getProductionPlanDetail(row.uid)
  } finally {
    detailLoading.value = false
  }
}

function validateForm() {
  if (!form.name?.trim()) {
    message.error('请输入计划名称')
    return false
  }
  if (!form.startTime || !form.planCompleteTime) {
    message.error('请选择计划时间')
    return false
  }
  if (!form.productList?.length) {
    message.error('请至少选择一个成品')
    return false
  }
  for (const item of form.productList) {
    if (!item.itemUid || !item.warehouseUid || !item.quantity || Number(item.quantity) <= 0) {
      message.error('请完整填写成品信息')
      return false
    }
  }
  return true
}

async function submitForm() {
  if (!validateForm() || submitting.value) return
  submitting.value = true
  try {
    await saveProductionPlan({
      ...form,
      name: form.name?.trim(),
      remark: form.remark?.trim(),
      productList: [...(form.productList || [])],
      imageList: [...(form.imageList || [])],
      docList: [...(form.docList || [])],
    })
    message.success(form.uid ? '生产计划已更新' : '生产计划已创建')
    showEditModal.value = false
    loadTableData()
  } finally {
    submitting.value = false
  }
}

function openCloseModal(row: ProductionPlanRow) {
  if (!row.uid) return
  closeForm.uid = row.uid
  closeForm.closeReason = ''
  showCloseModal.value = true
}

async function submitClose() {
  if (!closeForm.uid) return
  if (!closeForm.closeReason.trim()) {
    message.error('请填写关闭原因')
    return
  }
  submitting.value = true
  try {
    await closeProductionPlan({
      uid: closeForm.uid,
      closeReason: closeForm.closeReason.trim(),
    })
    message.success('生产计划已关闭')
    showCloseModal.value = false
    showDetailDrawer.value = false
    loadTableData()
  } finally {
    submitting.value = false
  }
}

async function handleDelete(row: ProductionPlanRow) {
  if (!row.uid) return
  await deleteProductionPlan(row.uid)
  message.success('生产计划已删除')
  if (detailData.value.uid === row.uid) {
    showDetailDrawer.value = false
  }
  loadTableData()
}

const columns = computed<DataTableColumns<ProductionPlanDetail>>(() => [
  { title: '计划名称', key: 'name', minWidth: 180, ellipsis: { tooltip: true } },
  {
    title: '审批状态',
    key: 'statusName',
    width: 120,
    render: row => h(NTag, { size: 'small', type: statusType(row.status) }, { default: () => row.statusName || '-' }),
  },
  { title: '当前阶段', key: 'currentStageName', width: 120, ellipsis: { tooltip: true } },
  { title: '当前节点', key: 'currentNodeName', minWidth: 140, ellipsis: { tooltip: true } },
  { title: '开工时间', key: 'startTime', width: 160, render: row => formatTime(row.startTime) },
  { title: '计划完成', key: 'planCompleteTime', width: 160, render: row => formatTime(row.planCompleteTime) },
  { title: '备注', key: 'remark', minWidth: 180, ellipsis: { tooltip: true } },
  {
    title: '操作',
    key: 'actions',
    fixed: 'right',
    width: 250,
    render: row =>
      h(NSpace, { size: 8 }, {
        default: () => [
          h(NButton, { text: true, type: 'primary', onClick: () => openDetailDrawer(row) }, { default: () => '详情' }),
          row.canEditPlan
            ? h(NButton, { text: true, type: 'info', onClick: () => openEditModal(row) }, { default: () => '编辑' })
            : null,
          row.status === 'completed' && !row.inboundCompleted
            ? h(NButton, { text: true, type: 'warning', onClick: () => openCloseModal(row) }, { default: () => '关闭' })
            : null,
          row.status === 'closed'
            ? h(
                NPopconfirm,
                { onPositiveClick: () => handleDelete(row) },
                {
                  trigger: () => h(NButton, { text: true, type: 'error' }, { default: () => '删除' }),
                  default: () => '删除后无法恢复，确定继续？',
                },
              )
            : null,
        ],
      }),
  },
])

const productColumns = computed<DataTableColumns<ProductionPlanProductItem>>(() => [
  {
    title: '成品',
    key: 'name',
    minWidth: 240,
    render: row =>
      h('div', { class: 'plan-item-cell' }, [
        row.image
          ? h(NImage, {
              src: row.image,
              width: 40,
              height: 40,
              objectFit: 'cover',
              previewDisabled: true,
              class: 'plan-item-image',
            })
          : h('div', { class: 'plan-item-image plan-item-image--empty' }, '无图'),
        h('div', { class: 'min-w-0' }, [
          h('div', { class: 'truncate font-medium text-neutral-900 dark:text-neutral-100' }, row.name || '-'),
          h('div', { class: 'truncate text-xs text-neutral-500 dark:text-neutral-400' }, `${row.spec || '-'} / ${row.material || '-'}`),
        ]),
      ]),
  },
  { title: '仓库', key: 'warehouseName', width: 140, ellipsis: { tooltip: true } },
  { title: '单位', key: 'unitName', width: 90 },
  { title: '数量', key: 'quantity', width: 100 },
  { title: '已入库', key: 'inboundQuantity', width: 100 },
])

const bomColumns = computed<DataTableColumns<ProductionPlanBomItem>>(() => [
  { title: '成品', key: 'productName', minWidth: 150, ellipsis: { tooltip: true } },
  { title: '零件', key: 'componentName', minWidth: 150, ellipsis: { tooltip: true } },
  { title: '规格', key: 'componentSpec', minWidth: 140, ellipsis: { tooltip: true } },
  { title: '类型', key: 'componentTypeName', width: 120, ellipsis: { tooltip: true } },
  { title: '单件用量', key: 'perQuantity', width: 100 },
  { title: '计划需求', key: 'requiredQuantity', width: 100 },
  { title: '库存', key: 'stockQuantity', width: 100 },
  { title: '已领料', key: 'issuedQuantity', width: 100 },
])

const issueOrderColumns = computed<DataTableColumns<ProductionPlanIssueOrderItem>>(() => [
  { title: '领料时间', key: 'issueTime', width: 160, render: row => formatTime(row.issueTime) },
  { title: '备注', key: 'remark', minWidth: 160, ellipsis: { tooltip: true } },
  {
    title: '明细数',
    key: 'detailCount',
    width: 100,
    render: row => String(row.detailList?.length || 0),
  },
])

const finishOrderColumns = computed<DataTableColumns<ProductionPlanFinishOrderItem>>(() => [
  { title: '入库时间', key: 'inboundTime', width: 160, render: row => formatTime(row.inboundTime) },
  { title: '备注', key: 'remark', minWidth: 160, ellipsis: { tooltip: true } },
  {
    title: '明细数',
    key: 'detailCount',
    width: 100,
    render: row => String(row.detailList?.length || 0),
  },
])

onMounted(() => {
  loadTableData()
  loadBaseOptions()
  resetForm()
})
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-4 p-4">
    <NCard size="small" :bordered="false">
      <NForm :model="query" label-placement="left" label-width="72">
        <div class="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-4">
          <NFormItem label="计划" class="plan-query-item">
            <NInput v-model:value="query.key" clearable placeholder="计划名称 / 备注" @keydown.enter.prevent="loadTableData" />
          </NFormItem>
          <NFormItem label="状态" class="plan-query-item">
            <NSelect v-model:value="query.status" clearable :options="statusOptions" placeholder="选择状态" />
          </NFormItem>
          <NFormItem class="plan-query-item">
            <NFlex size="small">
              <NButton type="primary" attr-type="button" @click="loadTableData">查询</NButton>
              <NButton attr-type="button" @click="resetQuery">重置</NButton>
            </NFlex>
          </NFormItem>
          <NFormItem class="plan-query-item xl:justify-end">
            <NButton type="primary" attr-type="button" :loading="optionLoading" @click="openCreateModal">新增计划</NButton>
          </NFormItem>
        </div>
      </NForm>
    </NCard>

    <NCard size="small" :bordered="false" class="flex min-h-0 flex-1 flex-col">
      <div class="mb-3 flex items-center justify-between">
        <div class="text-sm text-neutral-500 dark:text-neutral-400">生产计划台账</div>
        <div class="text-sm text-neutral-500 dark:text-neutral-400">跟踪计划审批、执行阶段和成品计划数量</div>
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

    <NModal v-model:show="showEditModal" preset="card" class="w-[1280px] max-w-[96vw]" title="生产计划">
      <NSpin :show="submitting || optionLoading">
        <div class="plan-modal-body">
          <NAlert v-if="planFormReadonly" type="warning" show-icon>
            当前生产计划已进入审批完成后的执行阶段，不允许继续修改计划基础信息。如需处理错误，请先关闭计划后再删除。
          </NAlert>

          <NCard size="small" embedded>
            <NForm label-placement="left" label-width="90">
              <div class="grid grid-cols-1 gap-x-4 gap-y-1 md:grid-cols-2">
                <NFormItem label="计划名称">
                  <NInput v-model:value="form.name" :disabled="planFormReadonly" placeholder="请输入计划名称" />
                </NFormItem>
                <NFormItem label="备注">
                  <NInput v-model:value="form.remark" :disabled="planFormReadonly" placeholder="请输入备注" />
                </NFormItem>
                <NFormItem label="开工时间">
                  <NDatePicker v-model:value="form.startTime as number" type="datetime" class="w-full" :disabled="planFormReadonly" />
                </NFormItem>
                <NFormItem label="计划完成">
                  <NDatePicker v-model:value="form.planCompleteTime as number" type="datetime" class="w-full" :disabled="planFormReadonly" />
                </NFormItem>
              </div>
            </NForm>
          </NCard>

          <NCard size="small" embedded>
            <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <div>
                <div class="mb-2 text-sm font-medium text-neutral-900 dark:text-neutral-100">图片链接</div>
                <NDynamicTags v-model:value="form.imageList" :disabled="planFormReadonly" />
              </div>
              <div>
                <div class="mb-2 text-sm font-medium text-neutral-900 dark:text-neutral-100">文档链接</div>
                <NDynamicTags v-model:value="form.docList" :disabled="planFormReadonly" />
              </div>
            </div>
          </NCard>

          <NCard size="small" embedded>
            <div class="mb-3 flex items-center justify-between">
              <div class="text-sm font-medium text-neutral-900 dark:text-neutral-100">成品列表</div>
              <NButton v-if="!planFormReadonly" type="primary" secondary attr-type="button" @click="addProductRow">新增成品</NButton>
            </div>

            <NTable striped size="small">
              <thead>
                <tr>
                  <th>成品</th>
                  <th>仓库</th>
                  <th>数量</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in form.productList || []" :key="index">
                  <td>
                    <NSelect
                      v-model:value="item.itemUid"
                      :options="productOptions"
                      filterable
                      :consistent-menu-width="false"
                      :disabled="planFormReadonly"
                      @update:value="handleProductChange(item)"
                    />
                  </td>
                  <td>
                    <NSelect
                      v-model:value="item.warehouseUid"
                      :options="warehouseOptions"
                      :consistent-menu-width="false"
                      :disabled="planFormReadonly"
                    />
                  </td>
                  <td>
                    <NInputNumber v-model:value="item.quantity" :min="0.000001" class="w-full" :disabled="planFormReadonly" />
                  </td>
                  <td class="w-[88px]">
                    <NButton v-if="!planFormReadonly" text type="error" @click="removeProductRow(index)">删除</NButton>
                  </td>
                </tr>
                <tr v-if="!(form.productList || []).length">
                  <td colspan="4">
                    <NEmpty description="暂无成品" />
                  </td>
                </tr>
              </tbody>
            </NTable>
          </NCard>
        </div>
      </NSpin>

      <template #footer>
        <div class="flex justify-end gap-2">
          <NButton attr-type="button" @click="showEditModal = false">取消</NButton>
          <NButton v-if="!planFormReadonly" type="primary" attr-type="button" :loading="submitting" @click="submitForm">保存</NButton>
        </div>
      </template>
    </NModal>

    <NDrawer v-model:show="showDetailDrawer" :width="1440" placement="right">
      <NDrawerContent title="生产计划详情" :native-scrollbar="false">
        <NSpin :show="detailLoading">
          <div class="flex flex-col gap-4">
            <NDescriptions bordered :column="2" size="small" label-placement="left">
              <NDescriptionsItem label="计划名称">{{ detailData.name || '-' }}</NDescriptionsItem>
              <NDescriptionsItem label="审批状态">
                <NTag size="small" :type="statusType(detailData.status)">{{ detailData.statusName || '-' }}</NTag>
              </NDescriptionsItem>
              <NDescriptionsItem label="当前阶段">{{ detailData.currentStageName || '-' }}</NDescriptionsItem>
              <NDescriptionsItem label="当前节点">{{ detailData.currentNodeName || '-' }}</NDescriptionsItem>
              <NDescriptionsItem label="开工时间">{{ formatTime(detailData.startTime) }}</NDescriptionsItem>
              <NDescriptionsItem label="计划完成">{{ formatTime(detailData.planCompleteTime) }}</NDescriptionsItem>
              <NDescriptionsItem v-if="detailData.closeReason" label="关闭原因" :span="2">{{ detailData.closeReason }}</NDescriptionsItem>
              <NDescriptionsItem label="备注" :span="2">{{ detailData.remark || '-' }}</NDescriptionsItem>
            </NDescriptions>

            <NCard size="small" embedded>
              <div class="mb-3 flex items-center justify-between">
                <div class="text-sm font-medium text-neutral-900 dark:text-neutral-100">执行阶段</div>
                <div class="flex gap-2">
                  <NButton
                    v-if="detailData.status === 'completed' && !detailData.inboundCompleted"
                    type="warning"
                    secondary
                    attr-type="button"
                    @click="openCloseModal(detailData)"
                  >
                    关闭计划
                  </NButton>
                  <NPopconfirm
                    v-if="detailData.status === 'closed'"
                    @positive-click="handleDelete(detailData)"
                  >
                    <template #trigger>
                      <NButton type="error" secondary attr-type="button">删除计划</NButton>
                    </template>
                    删除后将无法恢复，确定继续？
                  </NPopconfirm>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-3 xl:grid-cols-6">
                <div
                  v-for="item in detailData.stageList || []"
                  :key="item.key"
                  class="rounded border p-3"
                  :class="{
                    'border-green-200 bg-green-50': item.completed,
                    'border-amber-300 bg-amber-50': item.current,
                    'border-slate-200 bg-white': !item.completed && !item.current
                  }"
                >
                  <div class="mb-2">
                    <NTag size="small" :type="stageTagType(item)">
                      {{ item.completed ? '已完成' : item.current ? '进行中' : '未开启' }}
                    </NTag>
                  </div>
                  <div class="font-medium text-neutral-900 dark:text-neutral-100">{{ item.name || '-' }}</div>
                </div>
              </div>
            </NCard>

            <NCard size="small" embedded>
              <div class="mb-3 text-sm font-medium text-neutral-900 dark:text-neutral-100">成品计划</div>
              <NDataTable :columns="productColumns" :data="detailData.productList || []" :pagination="false" :scroll-x="760" size="small" />
            </NCard>

            <NCard size="small" embedded>
              <div class="mb-3 text-sm font-medium text-neutral-900 dark:text-neutral-100">备料 BOM</div>
              <NDataTable :columns="bomColumns" :data="detailData.bomList || []" :pagination="false" :scroll-x="980" size="small" />
            </NCard>

            <NCard size="small" embedded>
              <div class="mb-3 text-sm font-medium text-neutral-900 dark:text-neutral-100">工序记录</div>
              <div v-if="(detailData.processList || []).length" class="space-y-3">
                <div v-for="(process, processIndex) in detailData.processList || []" :key="process.uid || processIndex" class="rounded border border-neutral-200 p-3">
                  <div class="flex items-start justify-between gap-3">
                    <div>
                      <div class="font-medium text-neutral-900 dark:text-neutral-100">
                        {{ process.productName || '-' }} / {{ process.templateName || '-' }} / 数量 {{ process.quantity || 0 }}
                      </div>
                      <div class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                        计划开始：{{ formatTime(process.planStartTime) }} | 计划完成：{{ formatTime(process.planCompleteTime) }}
                      </div>
                      <div class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">备注：{{ process.remark || '-' }}</div>
                    </div>
                    <NTag size="small" :type="process.completed ? 'success' : process.nodeCompleted ? 'warning' : 'default'">
                      {{ process.completed ? '已完成' : process.nodeCompleted ? '节点完成' : '进行中' }}
                    </NTag>
                  </div>
                  <NDivider class="!my-3" />
                  <div class="space-y-2">
                    <div
                      v-for="(node, nodeIndex) in process.nodeList || []"
                      :key="node.uid || `${process.uid || processIndex}-${nodeIndex}`"
                      class="flex items-center justify-between rounded bg-neutral-50 px-3 py-2 dark:bg-neutral-800/60"
                    >
                      <div>
                        <div class="font-medium text-neutral-900 dark:text-neutral-100">{{ node.name || '-' }}</div>
                        <div class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                          负责人：{{ node.leaderName || '-' }} | 预计耗时：{{ node.durationValue || 0 }}{{ node.durationUnit === 'day' ? '天' : '小时' }}
                        </div>
                      </div>
                      <NTag size="small" :type="node.completed ? 'success' : 'warning'">
                        {{ node.completed ? '已完成' : '待处理' }}
                      </NTag>
                    </div>
                  </div>
                </div>
              </div>
              <NEmpty v-else description="暂无工序记录" />
            </NCard>

            <NCard size="small" embedded>
              <div class="mb-3 text-sm font-medium text-neutral-900 dark:text-neutral-100">领料记录</div>
              <NDataTable :columns="issueOrderColumns" :data="detailData.issueOrderList || []" :pagination="false" :scroll-x="520" size="small" />
            </NCard>

            <NCard size="small" embedded>
              <div class="mb-3 text-sm font-medium text-neutral-900 dark:text-neutral-100">完工入库记录</div>
              <NDataTable :columns="finishOrderColumns" :data="detailData.finishOrderList || []" :pagination="false" :scroll-x="520" size="small" />
            </NCard>

            <NCard size="small" embedded>
              <div class="mb-3 text-sm font-medium text-neutral-900 dark:text-neutral-100">附件</div>
              <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div>
                  <div class="mb-2 text-xs text-neutral-500 dark:text-neutral-400">图片</div>
                  <NSpace v-if="(detailData.imageList || []).length">
                    <NImage
                      v-for="(image, index) in detailData.imageList || []"
                      :key="`${image}-${index}`"
                      :src="image"
                      width="72"
                      height="72"
                      object-fit="cover"
                    />
                  </NSpace>
                  <NText v-else depth="3">暂无图片</NText>
                </div>
                <div>
                  <div class="mb-2 text-xs text-neutral-500 dark:text-neutral-400">文档</div>
                  <NSpace v-if="(detailData.docList || []).length" vertical size="small">
                    <a
                      v-for="(doc, index) in detailData.docList || []"
                      :key="`${doc}-${index}`"
                      :href="doc"
                      target="_blank"
                      rel="noreferrer"
                      class="text-sm text-primary-600 hover:underline"
                    >
                      {{ doc }}
                    </a>
                  </NSpace>
                  <NText v-else depth="3">暂无文档</NText>
                </div>
              </div>
            </NCard>
          </div>
        </NSpin>
      </NDrawerContent>
    </NDrawer>

    <NModal v-model:show="showCloseModal" preset="card" class="w-[560px] max-w-[92vw]" title="关闭生产计划">
      <div class="space-y-4">
        <NAlert type="warning" show-icon>关闭后将不允许继续执行该生产计划，且只有关闭后的计划才允许删除。</NAlert>
        <NForm label-placement="left" label-width="80">
          <NFormItem label="关闭原因">
            <NInput v-model:value="closeForm.closeReason" type="textarea" :autosize="{ minRows: 4, maxRows: 6 }" placeholder="请输入关闭原因" />
          </NFormItem>
        </NForm>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <NButton attr-type="button" @click="showCloseModal = false">取消</NButton>
          <NButton type="primary" attr-type="button" :loading="submitting" @click="submitClose">确认关闭</NButton>
        </div>
      </template>
    </NModal>
  </div>
</template>

<style scoped>
.plan-query-item {
  margin-bottom: 0;
}

.plan-modal-body {
  display: flex;
  max-height: 76vh;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
}

.plan-item-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.plan-item-image {
  flex-shrink: 0;
  border-radius: 8px;
  overflow: hidden;
}

.plan-item-image--empty {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  color: #999;
  font-size: 12px;
}
</style>
