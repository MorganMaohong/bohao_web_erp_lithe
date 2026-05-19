<script setup lang="ts">
import {
  NButton,
  NCard,
  NCollapseTransition,
  NDataTable,
  NDescriptions,
  NDescriptionsItem,
  NDrawer,
  NDrawerContent,
  NFlex,
  NImage,
  NInput,
  NPagination,
  NProgress,
  NSelect,
  NTag,
} from 'naive-ui'
import { computed, h, onMounted, reactive, ref, watch } from 'vue'

import {
  getInventoryOverview,
  getInventoryOverviewDetail,
  type InventoryOverviewPageData,
  type InventoryOverviewQuery,
  type InventoryOverviewRow,
} from '@/api'
import { toRefsPreferencesStore } from '@/stores'

import type { DataTableColumns, PaginationProps } from 'naive-ui'

defineOptions({
  name: 'InventoryOverview',
})

const { isDark } = toRefsPreferencesStore()
const loading = ref(false)
const showDetail = ref(false)
const detailLoading = ref(false)
const detailData = ref<InventoryOverviewRow | null>(null)
const showAdvancedFilters = ref(false)

const pageData = ref<InventoryOverviewPageData>({
  list: [],
  count: 0,
  currentPage: 1,
  pageSize: 50,
  extraData: {
    supplierOptions: [],
    typeOptions: [],
    unitOptions: [],
    warehouseOptions: [],
  },
})

const query = reactive<InventoryOverviewQuery>({
  key: '',
  supplierUidList: [],
  types: [],
  units: [],
  warehouseUidList: [],
  currentPage: 1,
  pageSize: 50,
})

async function loadTableData() {
  loading.value = true
  try {
    pageData.value = await getInventoryOverview({ ...query })
  } finally {
    loading.value = false
  }
}

function resetQuery() {
  Object.assign(query, {
    key: '',
    supplierUidList: [],
    types: [],
    units: [],
    warehouseUidList: [],
    currentPage: 1,
    pageSize: 50,
  })
  loadTableData()
}

async function openDetail(row: InventoryOverviewRow) {
  showDetail.value = true
  detailLoading.value = true
  detailData.value = row
  try {
    if (row.uid) {
      detailData.value = await getInventoryOverviewDetail(row.uid)
    }
  } finally {
    detailLoading.value = false
  }
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

function normalizeNumber(value?: number | null) {
  return Number(value || 0)
}

function formatDecimal(value?: number | null, digits = 2) {
  return normalizeNumber(value).toFixed(digits)
}

function ratioPercent(total?: number | null, available?: number | null) {
  const denominator = normalizeNumber(total)
  if (!denominator) return 0
  return Math.max(0, Math.min(100, Number(((normalizeNumber(available) / denominator) * 100).toFixed(1))))
}

const overviewStats = computed(() => {
  const list = pageData.value.list || []
  const warehouseSet = new Set(list.map(item => item.warehouseUid || item.warehouseName || '').filter(Boolean))
  const supplierSet = new Set(list.map(item => item.supplierUid || item.supplierName || '').filter(Boolean))
  const totalQuantity = list.reduce((sum, item) => sum + normalizeNumber(item.totalQuantity ?? item.quantity), 0)
  const availableQuantity = list.reduce((sum, item) => sum + normalizeNumber(item.availableQuantity), 0)
  const shortageCount = list.filter(item => normalizeNumber(item.availableQuantity) <= 0).length
  const lowAvailableCount = list.filter((item) => {
    const total = normalizeNumber(item.totalQuantity ?? item.quantity)
    const available = normalizeNumber(item.availableQuantity)
    return total > 0 && available > 0 && available / total <= 0.2
  }).length

  return [
    {
      label: '当前页 SKU',
      value: String(list.length),
      hint: `覆盖 ${warehouseSet.size} 个仓库`,
    },
    {
      label: '库存总量',
      value: formatDecimal(totalQuantity, 0),
      hint: `可用 ${formatDecimal(availableQuantity, 0)}`,
    },
    {
      label: '供应商数',
      value: String(supplierSet.size),
      hint: '基于当前筛选结果',
    },
    {
      label: '风险库存',
      value: String(shortageCount + lowAvailableCount),
      hint: `缺货 ${shortageCount}，偏低 ${lowAvailableCount}`,
    },
  ]
})

const columns = computed<DataTableColumns<InventoryOverviewRow>>(() => [
  {
    title: '仓库',
    key: 'warehouseName',
    width: 150,
    ellipsis: { tooltip: true },
  },
  {
    title: '物料',
    key: 'name',
    minWidth: 220,
    render: (row) =>
      h(
        'div',
        { class: 'inventory-item-cell' },
        [
          row.image
            ? h(NImage, {
                src: row.image,
                width: 44,
                height: 44,
                objectFit: 'cover',
                class: 'inventory-item-image',
                previewDisabled: true,
              })
            : h('div', { class: 'inventory-item-image inventory-item-image--empty' }, '无图'),
          h('div', { class: 'inventory-item-meta' }, [
            h('div', { class: 'inventory-item-name' }, row.name || '-'),
            h('div', { class: 'inventory-item-sub' }, [row.spec || '-', row.material || '-'].join(' / ')),
          ]),
        ],
      ),
  },
  {
    title: '类型',
    key: 'typeName',
    width: 140,
    ellipsis: { tooltip: true },
  },
  {
    title: '供应商',
    key: 'supplierName',
    width: 160,
    ellipsis: { tooltip: true },
  },
  {
    title: '单位',
    key: 'unitName',
    width: 90,
  },
  {
    title: '库存数量',
    key: 'totalQuantity',
    width: 120,
    render: (row) => formatDecimal(row.totalQuantity ?? row.quantity, 0),
  },
  {
    title: '可用库存',
    key: 'availableQuantity',
    width: 120,
    render: (row) => formatDecimal(row.availableQuantity, 0),
  },
  {
    title: '可用率',
    key: 'availabilityRatio',
    width: 180,
    render: (row) => {
      const percent = ratioPercent(row.totalQuantity ?? row.quantity, row.availableQuantity)
      return h(NProgress, {
        type: 'line',
        percentage: percent,
        indicatorPlacement: 'inside',
        height: 16,
        processing: false,
        color: percent <= 20 ? '#ef4444' : percent <= 50 ? '#f59e0b' : '#16a34a',
      })
    },
  },
  {
    title: '单价(含税)',
    key: 'purchasePriceWithTax',
    width: 120,
    render: (row) => formatDecimal(row.purchasePriceWithTax),
  },
  {
    title: '状态',
    key: 'status',
    width: 110,
    render: (row) => {
      const total = normalizeNumber(row.totalQuantity ?? row.quantity)
      const available = normalizeNumber(row.availableQuantity)
      const type = available <= 0 ? 'error' : total > 0 && available / total <= 0.2 ? 'warning' : 'success'
      const label = available <= 0 ? '缺货' : total > 0 && available / total <= 0.2 ? '偏低' : '正常'
      return h(NTag, { size: 'small', type }, { default: () => label })
    },
  },
  {
    title: '操作',
    key: 'actions',
    fixed: 'right',
    width: 100,
    render: (row) =>
      h(
        NButton,
        {
          text: true,
          type: 'primary',
          onClick: () => openDetail(row),
        },
        { default: () => '详情' },
      ),
  },
])

onMounted(() => {
  loadTableData()
})
</script>

<template>
  <div
    class="inventory-overview-page"
    :class="{ 'inventory-overview-page--dark': isDark }"
  >
    <NCard
      size="small"
      :bordered="false"
      class="inventory-overview-card shadow-sm"
    >
      <div class="inventory-overview-content">
        <section class="inventory-overview-query">
          <div class="inventory-overview-query-main">
            <div class="inventory-overview-basic-filters">
              <NInput
                v-model:value="query.key"
                clearable
                placeholder="名称 / 规格 / 材质"
                @keydown.enter.prevent="loadTableData"
              />
              <NSelect
                v-model:value="query.warehouseUidList"
                :options="pageData.extraData?.warehouseOptions || []"
                multiple
                clearable
                placeholder="选择仓库"
              />
            </div>
            <NFlex
              :wrap="true"
              size="small"
            >
              <NButton
                type="primary"
                @click="loadTableData"
              >
                查询
              </NButton>
              <NButton @click="resetQuery">重置</NButton>
              <NButton @click="showAdvancedFilters = !showAdvancedFilters">
                {{ showAdvancedFilters ? '收起高级筛选' : '高级筛选' }}
              </NButton>
            </NFlex>
          </div>

          <NCollapseTransition :show="showAdvancedFilters">
            <div class="inventory-overview-advanced-filters">
              <NSelect
                v-model:value="query.supplierUidList"
                :options="pageData.extraData?.supplierOptions || []"
                multiple
                clearable
                placeholder="选择供应商"
              />
              <NSelect
                v-model:value="query.types"
                :options="pageData.extraData?.typeOptions || []"
                multiple
                clearable
                placeholder="物料类型"
              />
              <NSelect
                v-model:value="query.units"
                :options="pageData.extraData?.unitOptions || []"
                multiple
                clearable
                placeholder="单位"
              />
            </div>
          </NCollapseTransition>
        </section>

        <section class="inventory-overview-stats inventory-overview-stats--compact">
          <article
            v-for="item in overviewStats"
            :key="item.label"
            class="inventory-stat inventory-stat--compact"
          >
            <div class="inventory-stat-label">{{ item.label }}</div>
            <div class="inventory-stat-inline">
              <span class="inventory-stat-value inventory-stat-value--compact">{{ item.value }}</span>
              <span class="inventory-stat-hint inventory-stat-hint--compact">{{ item.hint }}</span>
            </div>
          </article>
        </section>

        <div class="inventory-overview-table-wrap">
          <NDataTable
            remote
            flex-height
            class="inventory-overview-table"
            :columns="columns"
            :data="pageData.list || []"
            :loading="loading"
            :pagination="false"
            :scroll-x="1700"
            :single-line="false"
            size="small"
          />
        </div>

        <footer class="inventory-overview-footer">
          <NPagination
            v-bind="pagination"
            :disabled="loading"
            :prefix="({ itemCount }) => `共 ${itemCount} 条`"
          />
        </footer>
      </div>
    </NCard>

    <NDrawer
      v-model:show="showDetail"
      :width="420"
      placement="right"
    >
      <NDrawerContent
        title="库存详情"
        :native-scrollbar="false"
      >
        <div
          v-if="detailData"
          class="inventory-detail"
        >
          <div class="inventory-detail-head">
            <NImage
              v-if="detailData.image"
              :src="detailData.image"
              width="88"
              height="88"
              object-fit="cover"
              class="inventory-detail-image"
            />
            <div class="inventory-detail-title">
              <div class="inventory-detail-name">{{ detailData.name || '-' }}</div>
              <div class="inventory-detail-sub">{{ detailData.spec || '-' }} / {{ detailData.material || '-' }}</div>
            </div>
          </div>

          <NDescriptions
            label-placement="left"
            bordered
            :column="1"
            size="small"
          >
            <NDescriptionsItem label="仓库">{{ detailData.warehouseName || '-' }}</NDescriptionsItem>
            <NDescriptionsItem label="供应商">{{ detailData.supplierName || '-' }}</NDescriptionsItem>
            <NDescriptionsItem label="物料类型">{{ detailData.typeName || '-' }}</NDescriptionsItem>
            <NDescriptionsItem label="单位">{{ detailData.unitName || '-' }}</NDescriptionsItem>
            <NDescriptionsItem label="库存数量">{{ formatDecimal(detailData.totalQuantity ?? detailData.quantity, 0) }}</NDescriptionsItem>
            <NDescriptionsItem label="可用库存">{{ formatDecimal(detailData.availableQuantity, 0) }}</NDescriptionsItem>
            <NDescriptionsItem label="采购单价(含税)">{{ formatDecimal(detailData.purchasePriceWithTax) }}</NDescriptionsItem>
            <NDescriptionsItem label="采购单价(未税)">{{ formatDecimal(detailData.purchasePriceWithoutTax) }}</NDescriptionsItem>
            <NDescriptionsItem label="税率">{{ formatDecimal(detailData.vatTaxRate, 0) }}%</NDescriptionsItem>
          </NDescriptions>
        </div>
        <div
          v-else-if="detailLoading"
          class="inventory-detail-empty"
        >
          加载中...
        </div>
        <div
          v-else
          class="inventory-detail-empty"
        >
          暂无详情
        </div>
      </NDrawerContent>
    </NDrawer>
  </div>
</template>

<style scoped>
.inventory-overview-page {
  --inventory-panel-bg: #fff;
  --inventory-panel-bg-soft: rgba(248, 250, 252, 0.85);
  --inventory-panel-border: rgba(148, 163, 184, 0.16);
  --inventory-text-main: rgb(15, 23, 42);
  --inventory-text-strong: rgb(30, 41, 59);
  --inventory-text-muted: rgb(100, 116, 139);
  --inventory-text-faint: rgb(148, 163, 184);
  --inventory-image-empty-bg: rgb(248, 250, 252);
  height: 100%;
  min-height: 0;
  padding: 12px;
  overflow: hidden;
  box-sizing: border-box;
}

.inventory-overview-page--dark {
  --inventory-panel-bg: rgb(30, 41, 59);
  --inventory-panel-bg-soft: rgba(30, 41, 59, 0.88);
  --inventory-panel-border: rgba(148, 163, 184, 0.18);
  --inventory-text-main: rgb(241, 245, 249);
  --inventory-text-strong: rgb(226, 232, 240);
  --inventory-text-muted: rgb(148, 163, 184);
  --inventory-text-faint: rgb(100, 116, 139);
  --inventory-image-empty-bg: rgb(51, 65, 85);
}

.inventory-overview-card {
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.inventory-overview-card:deep(.n-card__content),
.inventory-overview-card:deep(.n-card-content) {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.inventory-overview-content {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  gap: 12px;
}

.inventory-overview-query {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.inventory-overview-query-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.inventory-overview-basic-filters {
  display: grid;
  flex: 1 1 auto;
  grid-template-columns: minmax(220px, 1.4fr) minmax(220px, 1fr);
  gap: 12px;
}

.inventory-overview-advanced-filters {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  padding-top: 2px;
}

.inventory-overview-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.inventory-stat {
  min-width: 0;
  padding: 14px 16px;
  border: 1px solid var(--inventory-panel-border);
  border-radius: 8px;
  background: var(--inventory-panel-bg-soft);
}

.inventory-stat-label {
  color: var(--inventory-text-muted);
  font-size: 12px;
  white-space: nowrap;
}

.inventory-stat-value {
  margin-top: 6px;
  font-size: 26px;
  line-height: 1.15;
  font-weight: 600;
  color: var(--inventory-text-main);
}

.inventory-stat-hint {
  margin-top: 4px;
  color: var(--inventory-text-muted);
  font-size: 12px;
}

.inventory-overview-stats--compact {
  gap: 10px;
}

.inventory-stat--compact {
  padding: 10px 12px;
  background: var(--inventory-panel-bg);
}

.inventory-stat-inline {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-top: 4px;
  min-width: 0;
}

.inventory-stat-value--compact {
  margin-top: 0;
  font-size: 20px;
  flex: 0 0 auto;
}

.inventory-stat-hint--compact {
  margin-top: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.inventory-overview-table-wrap {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

.inventory-overview-table {
  height: 100%;
  min-height: 0;
}

.inventory-overview-footer {
  flex: 0 0 auto;
  display: flex;
  justify-content: flex-end;
}

.inventory-item-cell {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.inventory-item-image {
  flex: 0 0 auto;
  overflow: hidden;
  border-radius: 8px;
  border: 1px solid var(--inventory-panel-border);
}

.inventory-item-image--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--inventory-image-empty-bg);
  color: var(--inventory-text-faint);
  font-size: 12px;
}

.inventory-item-meta {
  min-width: 0;
}

.inventory-item-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
  color: var(--inventory-text-strong);
}

.inventory-item-sub {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--inventory-text-muted);
  font-size: 12px;
}

.inventory-detail {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.inventory-detail-head {
  display: flex;
  gap: 14px;
  align-items: center;
}

.inventory-detail-image {
  overflow: hidden;
  border-radius: 10px;
  border: 1px solid var(--inventory-panel-border);
}

.inventory-detail-title {
  min-width: 0;
}

.inventory-detail-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--inventory-text-main);
}

.inventory-detail-sub {
  margin-top: 4px;
  color: var(--inventory-text-muted);
}

.inventory-detail-empty {
  padding: 40px 0;
  text-align: center;
  color: var(--inventory-text-muted);
}

@media (max-width: 1400px) {
  .inventory-overview-query-main {
    align-items: stretch;
    flex-direction: column;
  }

  .inventory-overview-basic-filters {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .inventory-overview-advanced-filters {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .inventory-overview-basic-filters,
  .inventory-overview-advanced-filters,
  .inventory-overview-stats,
  .inventory-overview-stats--compact {
    grid-template-columns: 1fr;
  }

  .inventory-stat-inline {
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }
}
</style>
