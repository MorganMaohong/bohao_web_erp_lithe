<script setup lang="ts">
import {
  NButton,
  NCard,
  NDataTable,
  NEmpty,
  NFlex,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NModal,
  NPagination,
  NPopconfirm,
  NSelect,
  NSpin,
  NTable,
  NTag,
  useMessage,
} from 'naive-ui'
import { computed, h, reactive, ref } from 'vue'

import {
  copyProductionProcessTemplate,
  deleteProductionProcessTemplate,
  getProductionProcessTemplateForm,
  getProductionProcessTemplates,
  saveProductionProcessTemplate,
  type ProductionProcessTemplateForm,
  type ProductionProcessTemplateNode,
  type ProductionProcessTemplatePageData,
  type ProductionProcessTemplateQuery,
  type ProductionProcessTemplateRow,
} from '@/api'

import type { DataTableColumns, PaginationProps } from 'naive-ui'

defineOptions({
  name: 'ProductProcessTemplate',
})

const message = useMessage()

const loading = ref(false)
const submitting = ref(false)
const showEditModal = ref(false)

const query = reactive<ProductionProcessTemplateQuery>({
  currentPage: 1,
  pageSize: 20,
  key: '',
})

const pageData = ref<ProductionProcessTemplatePageData>({
  currentPage: 1,
  pageSize: 20,
  count: 0,
  list: [],
})

const form = reactive<ProductionProcessTemplateForm>({
  uid: null,
  name: '',
  category: '',
  remark: '',
  categoryOptions: [],
  leaderOptions: [],
  durationUnitOptions: [],
  startRuleOptions: [],
  nodeList: [],
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

function resetForm() {
  Object.assign(form, {
    uid: null,
    name: '',
    category: '',
    remark: '',
    categoryOptions: [],
    leaderOptions: [],
    durationUnitOptions: [],
    startRuleOptions: [],
    nodeList: [],
  })
}

async function loadTableData() {
  loading.value = true
  try {
    pageData.value = await getProductionProcessTemplates({
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
  })
  loadTableData()
}

async function openCreateModal() {
  submitting.value = true
  try {
    const payload = await getProductionProcessTemplateForm()
    resetForm()
    Object.assign(form, {
      ...payload,
      nodeList: payload.nodeList || [],
      categoryOptions: payload.categoryOptions || [],
      leaderOptions: payload.leaderOptions || [],
      durationUnitOptions: payload.durationUnitOptions || [],
      startRuleOptions: payload.startRuleOptions || [],
    })
    showEditModal.value = true
  } finally {
    submitting.value = false
  }
}

async function openEditModal(row: ProductionProcessTemplateRow) {
  if (!row.uid) return
  submitting.value = true
  try {
    const payload = await getProductionProcessTemplateForm(row.uid)
    resetForm()
    Object.assign(form, {
      ...payload,
      nodeList: payload.nodeList || [],
      categoryOptions: payload.categoryOptions || [],
      leaderOptions: payload.leaderOptions || [],
      durationUnitOptions: payload.durationUnitOptions || [],
      startRuleOptions: payload.startRuleOptions || [],
    })
    showEditModal.value = true
  } finally {
    submitting.value = false
  }
}

function addNode() {
  form.nodeList = form.nodeList || []
  form.nodeList.push({
    sort: (form.nodeList.length || 0) + 1,
    durationValue: 1,
  })
}

function removeNode(index: number) {
  form.nodeList?.splice(index, 1)
  ;(form.nodeList || []).forEach((node, nodeIndex) => {
    node.sort = nodeIndex + 1
  })
}

function moveNode(index: number, offset: -1 | 1) {
  const list = form.nodeList || []
  const target = index + offset
  if (target < 0 || target >= list.length) return
  const [row] = list.splice(index, 1)
  list.splice(target, 0, row)
  list.forEach((node, nodeIndex) => {
    node.sort = nodeIndex + 1
  })
}

function validateForm() {
  if (!form.name?.trim()) {
    message.error('请输入模板名称')
    return false
  }
  if (!form.nodeList?.length) {
    message.error('请至少新增一个工序节点')
    return false
  }
  for (const node of form.nodeList) {
    if (!node.name?.trim() || !node.leaderUid || !node.durationValue || !node.durationUnit || !node.startRule) {
      message.error('请完整填写工序节点信息')
      return false
    }
  }
  return true
}

async function submitForm() {
  if (!validateForm() || submitting.value) return
  submitting.value = true
  try {
    await saveProductionProcessTemplate({
      ...form,
      name: form.name?.trim(),
      remark: form.remark?.trim(),
      nodeList: (form.nodeList || []).map((node, index) => ({
        ...node,
        name: node.name?.trim(),
        remark: node.remark?.trim(),
        sort: index + 1,
      })),
    })
    message.success(form.uid ? '工序模板已更新' : '工序模板已创建')
    showEditModal.value = false
    loadTableData()
  } finally {
    submitting.value = false
  }
}

async function handleDelete(row: ProductionProcessTemplateRow) {
  if (!row.uid) return
  await deleteProductionProcessTemplate(row.uid)
  message.success('工序模板已删除')
  loadTableData()
}

async function handleCopy(row: ProductionProcessTemplateRow) {
  if (!row.uid) return
  await copyProductionProcessTemplate(row.uid)
  message.success('工序模板已复制')
  loadTableData()
}

const columns = computed<DataTableColumns<ProductionProcessTemplateRow>>(() => [
  { title: '模板名称', key: 'name', minWidth: 180, ellipsis: { tooltip: true } },
  { title: '节点数量', key: 'nodeCount', width: 100 },
  { title: '备注', key: 'remark', minWidth: 220, ellipsis: { tooltip: true } },
  { title: '创建时间', key: 'createTime', minWidth: 170, ellipsis: { tooltip: true } },
  {
    title: '操作',
    key: 'actions',
    fixed: 'right',
    width: 220,
    render: row =>
      h(NFlex, { size: 8 }, {
        default: () => [
          h(NButton, { text: true, type: 'primary', onClick: () => openEditModal(row) }, { default: () => '编辑' }),
          h(NButton, { text: true, type: 'info', onClick: () => handleCopy(row) }, { default: () => '复制' }),
          h(
            NPopconfirm,
            { onPositiveClick: () => handleDelete(row) },
            {
              trigger: () => h(NButton, { text: true, type: 'error' }, { default: () => '删除' }),
              default: () => '删除后无法恢复，确定继续？',
            },
          ),
        ],
      }),
  },
])

loadTableData()
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-4 p-4">
    <NCard size="small" :bordered="false">
      <NForm :model="query" label-placement="left" label-width="72">
        <div class="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-4">
          <NFormItem label="模板" class="process-query-item">
            <NInput v-model:value="query.key" clearable placeholder="模板名称 / 备注" @keydown.enter.prevent="loadTableData" />
          </NFormItem>
          <NFormItem class="process-query-item">
            <NFlex size="small">
              <NButton type="primary" attr-type="button" @click="loadTableData">查询</NButton>
              <NButton attr-type="button" @click="resetQuery">重置</NButton>
            </NFlex>
          </NFormItem>
          <NFormItem class="process-query-item xl:justify-end">
            <NButton type="primary" attr-type="button" @click="openCreateModal">新增模板</NButton>
          </NFormItem>
        </div>
      </NForm>
    </NCard>

    <NCard size="small" :bordered="false" class="flex min-h-0 flex-1 flex-col">
      <div class="mb-3 flex items-center justify-between">
        <div class="text-sm text-neutral-500 dark:text-neutral-400">生产工序模板</div>
        <div class="text-sm text-neutral-500 dark:text-neutral-400">定义负责人、预计耗时和节点开始规则</div>
      </div>

      <NDataTable
        remote
        flex-height
        :loading="loading"
        :columns="columns"
        :data="pageData.list || []"
        :pagination="false"
        :scroll-x="980"
        size="small"
      />

      <div class="mt-3 flex justify-end">
        <NPagination v-bind="pagination" :disabled="loading" :prefix="({ itemCount }) => `共 ${itemCount} 条`" />
      </div>
    </NCard>

    <NModal v-model:show="showEditModal" preset="card" class="w-[1280px] max-w-[96vw]" title="工序模板">
      <NSpin :show="submitting">
        <div class="process-modal-body">
          <NCard size="small" embedded>
            <NForm label-placement="left" label-width="90">
              <div class="grid grid-cols-1 gap-x-4 gap-y-1 md:grid-cols-2">
                <NFormItem label="模板名称">
                  <NInput v-model:value="form.name" placeholder="请输入模板名称" />
                </NFormItem>
                <NFormItem label="备注">
                  <NInput v-model:value="form.remark" placeholder="请输入备注" />
                </NFormItem>
              </div>
            </NForm>
          </NCard>

          <NCard size="small" embedded>
            <div class="mb-3 flex items-center justify-between">
              <div class="text-sm font-medium text-neutral-900 dark:text-neutral-100">工序节点</div>
              <div class="flex items-center gap-2">
                <NTag size="small" type="info">共 {{ (form.nodeList || []).length }} 个节点</NTag>
                <NButton type="primary" secondary attr-type="button" @click="addNode">新增节点</NButton>
              </div>
            </div>

            <NTable striped size="small">
              <thead>
                <tr>
                  <th class="w-[70px]">顺序</th>
                  <th class="w-[160px]">节点名称</th>
                  <th class="w-[170px]">负责人</th>
                  <th class="w-[100px]">耗时</th>
                  <th class="w-[110px]">单位</th>
                  <th class="w-[150px]">开始规则</th>
                  <th>备注</th>
                  <th class="w-[150px]">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in form.nodeList || []" :key="item.uid || index">
                  <td>
                    <div class="flex items-center gap-2">
                      <span>{{ index + 1 }}</span>
                    </div>
                  </td>
                  <td>
                    <NInput v-model:value="item.name" placeholder="节点名称" />
                  </td>
                  <td>
                    <NSelect
                      v-model:value="item.leaderUid"
                      :options="form.leaderOptions"
                      filterable
                      :consistent-menu-width="false"
                      placeholder="负责人"
                    />
                  </td>
                  <td>
                    <NInputNumber v-model:value="item.durationValue" :min="1" class="w-full" />
                  </td>
                  <td>
                    <NSelect
                      v-model:value="item.durationUnit"
                      :options="form.durationUnitOptions"
                      :consistent-menu-width="false"
                      placeholder="单位"
                    />
                  </td>
                  <td>
                    <NSelect
                      v-model:value="item.startRule"
                      :options="form.startRuleOptions"
                      :consistent-menu-width="false"
                      placeholder="开始规则"
                    />
                  </td>
                  <td>
                    <NInput v-model:value="item.remark" placeholder="备注" />
                  </td>
                  <td>
                    <div class="flex gap-2">
                      <NButton text :disabled="index === 0" @click="moveNode(index, -1)">上移</NButton>
                      <NButton text :disabled="index === (form.nodeList || []).length - 1" @click="moveNode(index, 1)">下移</NButton>
                      <NButton text type="error" @click="removeNode(index)">删除</NButton>
                    </div>
                  </td>
                </tr>
                <tr v-if="!(form.nodeList || []).length">
                  <td colspan="8">
                    <NEmpty description="暂无工序节点" />
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
          <NButton type="primary" attr-type="button" :loading="submitting" @click="submitForm">保存</NButton>
        </div>
      </template>
    </NModal>
  </div>
</template>

<style scoped>
.process-query-item {
  margin-bottom: 0;
}

.process-modal-body {
  display: flex;
  max-height: 76vh;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
}
</style>
