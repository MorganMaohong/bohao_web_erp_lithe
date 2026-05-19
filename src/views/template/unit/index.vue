<script setup lang="ts">
import { useMutation } from '@pinia/colada'
import {
  NButton,
  NCard,
  NDataTable,
  NFlex,
  NForm,
  NFormItem,
  NGi,
  NGrid,
  NInput,
  NInputNumber,
  NModal,
  NPagination,
  NPopconfirm,
  NSelect,
  NSpace,
  NSwitch,
  NTag,
  NTreeSelect,
} from 'naive-ui'
import { computed, h, onMounted, reactive, ref, watch } from 'vue'

import {
  deleteTemplateUnit,
  getTemplateUnitForm,
  getTemplateUnits,
  saveTemplateUnit,
  type TemplateUnit,
  type TemplateUnitForm,
  type TemplateUnitPageData,
  type TemplateUnitQuery,
} from '@/api'

import type { DataTableColumns, FormInst, FormRules, PaginationProps } from 'naive-ui'

defineOptions({
  name: 'TemplateUnit',
})

const categoryOptions = [
  { label: '数量', value: 'quantity' },
  { label: '重量', value: 'weight' },
  { label: '长度', value: 'length' },
  { label: '面积', value: 'area' },
  { label: '体积', value: 'volume' },
  { label: '包装', value: 'package' },
]

const enabledOptions = [
  { label: '启用', value: 'true' },
  { label: '停用', value: 'false' },
]

const queryFormRef = ref<FormInst>()
const editFormRef = ref<FormInst>()

const showEditModal = ref(false)
const showCopyMode = ref(false)
const activeEditId = ref<string | null>(null)

const loading = ref(false)
const pageData = ref<TemplateUnitPageData>({
  currentPage: 1,
  pageSize: 50,
  count: 0,
  list: [],
})

const query = reactive<TemplateUnitQuery>({
  currentPage: 1,
  pageSize: 50,
  key: '',
  category: undefined,
  enabled: undefined,
})

const enabledFilter = ref<string | null>(null)

function createEmptyForm(): TemplateUnitForm {
  return {
    code: '',
    name: '',
    category: '',
    enabled: true,
    precisionScale: 0,
    convertRate: 1,
    sort: 0,
    parentUid: null,
    baseUnitUid: null,
    remark: '',
    unitOptions: [],
  }
}

const form = reactive<TemplateUnitForm>(createEmptyForm())

const editFormRules: FormRules = {
  code: [
    {
      required: true,
      message: '请输入单位编码',
      trigger: ['blur', 'input'],
    },
  ],
  name: [
    {
      required: true,
      message: '请输入单位名称',
      trigger: ['blur', 'input'],
    },
  ],
}

function syncForm(data?: Partial<TemplateUnitForm>) {
  Object.assign(form, createEmptyForm(), data || {})
}

async function loadTableData() {
  loading.value = true
  try {
    const enabled =
      enabledFilter.value === 'true' ? true : enabledFilter.value === 'false' ? false : undefined

    pageData.value = await getTemplateUnits({
      ...query,
      enabled,
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
    category: undefined,
    enabled: undefined,
  })
  enabledFilter.value = null
  loadTableData()
}

async function openCreateModal() {
  activeEditId.value = null
  showCopyMode.value = false
  syncForm(await getTemplateUnitForm())
  showEditModal.value = true
}

async function openEditModal(uid?: string, copy = false) {
  activeEditId.value = copy ? null : uid || null
  showCopyMode.value = copy
  const data = await getTemplateUnitForm(uid)
  syncForm(data)

  if (copy) {
    form.uid = null
    form.id = null
  }

  showEditModal.value = true
}

const { isLoading: saveLoading, mutateAsync: mutateSave } = useMutation({
  mutation: saveTemplateUnit,
  onSuccess: async () => {
    showEditModal.value = false
    await loadTableData()
  },
})

const { isLoading: deleteLoading, mutateAsync: mutateDelete } = useMutation({
  mutation: deleteTemplateUnit,
  onSuccess: async () => {
    await loadTableData()
  },
})

async function handleSave() {
  await editFormRef.value?.validate()
  await mutateSave({ ...form })
}

async function handleDelete(uid?: string | null) {
  if (!uid) return
  await mutateDelete(uid)
}

const mergedLoading = computed(() => loading.value || saveLoading.value || deleteLoading.value)

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

const columns = computed<DataTableColumns<TemplateUnit>>(() => [
  { title: '编码', key: 'code', width: 120, ellipsis: { tooltip: true } },
  { title: '名称', key: 'name', width: 120, ellipsis: { tooltip: true } },
  { title: '分类', key: 'category', width: 110, ellipsis: { tooltip: true } },
  { title: '精度', key: 'precisionScale', width: 90 },
  { title: '基准单位', key: 'baseUnitName', width: 120, ellipsis: { tooltip: true } },
  { title: '换算率', key: 'convertRate', width: 120 },
  {
    title: '状态',
    key: 'enabled',
    width: 90,
    render: (row) =>
      h(
        NTag,
        { type: row.enabled === false ? 'error' : 'success', size: 'small' },
        { default: () => (row.enabled === false ? '停用' : '启用') },
      ),
  },
  { title: '排序', key: 'sort', width: 90 },
  { title: '备注', key: 'remark', minWidth: 160, ellipsis: { tooltip: true } },
  {
    title: '操作',
    key: 'actions',
    fixed: 'right',
    width: 180,
    render: (row) =>
      h(
        NSpace,
        { justify: 'center', size: 'small' },
        {
          default: () => [
            h(
              NButton,
              {
                text: true,
                type: 'primary',
                onClick: () => openEditModal(row.uid || undefined, true),
              },
              { default: () => '复制' },
            ),
            h(
              NButton,
              {
                text: true,
                type: 'info',
                onClick: () => openEditModal(row.uid || undefined),
              },
              { default: () => '编辑' },
            ),
            h(
              NPopconfirm,
              { onPositiveClick: () => handleDelete(row.uid) },
              {
                trigger: () =>
                  h(
                    NButton,
                    { text: true, type: 'error' },
                    { default: () => '删除' },
                  ),
                default: () => '确定删除该单位吗？',
              },
            ),
          ],
        },
      ),
  },
])

const modalTitle = computed(() => {
  if (showCopyMode.value) return '复制单位'
  return activeEditId.value ? '编辑单位' : '新增单位'
})

onMounted(() => {
  loadTableData()
})
</script>

<template>
  <div class="template-unit-page">
    <NCard
      size="small"
      :bordered="false"
      class="template-unit-card shadow-sm"
    >
      <div class="template-unit-content">
        <NForm
          ref="queryFormRef"
          :model="query"
          label-placement="left"
          :show-feedback="false"
        >
          <NGrid
            cols="1 s:2 m:4"
            responsive="screen"
            :x-gap="12"
            :y-gap="12"
          >
            <NGi>
              <NFormItem label="关键词">
                <NInput
                  v-model:value="query.key"
                  clearable
                  placeholder="编码 / 名称"
                  @keydown.enter.prevent="loadTableData"
                />
              </NFormItem>
            </NGi>
            <NGi>
              <NFormItem label="分类">
                <NSelect
                  v-model:value="query.category"
                  clearable
                  :options="categoryOptions"
                  placeholder="请选择分类"
                />
              </NFormItem>
            </NGi>
            <NGi>
              <NFormItem label="状态">
                <NSelect
                  v-model:value="enabledFilter"
                  clearable
                  :options="enabledOptions"
                  placeholder="请选择状态"
                />
              </NFormItem>
            </NGi>
            <NGi>
              <NFormItem>
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
                  <NButton
                    type="success"
                    @click="openCreateModal"
                  >
                    新增单位
                  </NButton>
                </NFlex>
              </NFormItem>
            </NGi>
          </NGrid>
        </NForm>

        <div class="template-unit-table-wrap">
          <NDataTable
            remote
            flex-height
            class="template-unit-table"
            :columns="columns"
            :data="pageData.list || []"
            :loading="mergedLoading"
            :pagination="false"
            :scroll-x="1300"
            :single-line="false"
            size="small"
          />
        </div>

        <footer class="template-unit-footer">
          <NPagination
            v-bind="pagination"
            :disabled="mergedLoading"
            :prefix="({ itemCount }) => `共 ${itemCount} 条`"
          />
        </footer>
      </div>
    </NCard>

    <NModal
      v-model:show="showEditModal"
      preset="card"
      class="w-[760px] max-w-[calc(100vw-32px)]"
      :title="modalTitle"
      :mask-closable="false"
    >
      <NForm
        ref="editFormRef"
        :model="form"
        :rules="editFormRules"
        label-placement="left"
        label-width="100"
      >
        <NGrid
          cols="1 s:2"
          responsive="screen"
          :x-gap="12"
          :y-gap="4"
        >
          <NGi>
            <NFormItem
              label="单位编码"
              path="code"
            >
              <NInput
                v-model:value="form.code"
                placeholder="如 kg / pcs / box"
              />
            </NFormItem>
          </NGi>
          <NGi>
            <NFormItem
              label="单位名称"
              path="name"
            >
              <NInput
                v-model:value="form.name"
                placeholder="如 千克 / 个 / 箱"
              />
            </NFormItem>
          </NGi>
          <NGi>
            <NFormItem label="单位分类">
              <NSelect
                v-model:value="form.category"
                clearable
                :options="categoryOptions"
                placeholder="请选择分类"
              />
            </NFormItem>
          </NGi>
          <NGi>
            <NFormItem label="状态">
              <NSwitch v-model:value="form.enabled">
                <template #checked>启用</template>
                <template #unchecked>停用</template>
              </NSwitch>
            </NFormItem>
          </NGi>
          <NGi>
            <NFormItem label="上级单位">
              <NTreeSelect
                v-model:value="form.parentUid"
                clearable
                :options="form.unitOptions"
                key-field="value"
                label-field="label"
                children-field="children"
                placeholder="请选择上级单位"
              />
            </NFormItem>
          </NGi>
          <NGi>
            <NFormItem label="基准单位">
              <NTreeSelect
                v-model:value="form.baseUnitUid"
                clearable
                :options="form.unitOptions"
                key-field="value"
                label-field="label"
                children-field="children"
                placeholder="请选择基准单位"
              />
            </NFormItem>
          </NGi>
          <NGi>
            <NFormItem label="小数精度">
              <NInputNumber
                v-model:value="form.precisionScale"
                class="w-full"
                :min="0"
                :max="8"
              />
            </NFormItem>
          </NGi>
          <NGi>
            <NFormItem label="换算率">
              <NInputNumber
                v-model:value="form.convertRate"
                class="w-full"
                :min="0.000001"
              />
            </NFormItem>
          </NGi>
          <NGi>
            <NFormItem label="排序">
              <NInputNumber
                v-model:value="form.sort"
                class="w-full"
                :min="0"
              />
            </NFormItem>
          </NGi>
          <NGi span="2">
            <NFormItem label="备注">
              <NInput
                v-model:value="form.remark"
                type="textarea"
                :autosize="{ minRows: 3, maxRows: 5 }"
                placeholder="请输入备注"
              />
            </NFormItem>
          </NGi>
        </NGrid>
      </NForm>

      <template #action>
        <div class="flex justify-end gap-2">
          <NButton @click="showEditModal = false">取消</NButton>
          <NButton
            type="primary"
            :loading="saveLoading"
            :disabled="saveLoading"
            @click="handleSave"
          >
            保存
          </NButton>
        </div>
      </template>
    </NModal>
  </div>
</template>

<style scoped>
.template-unit-page {
  height: 100%;
  min-height: 0;
  padding: 12px;
  overflow: hidden;
  box-sizing: border-box;
}

.template-unit-card {
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.template-unit-card:deep(.n-card__content),
.template-unit-card:deep(.n-card-content) {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.template-unit-content {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  gap: 16px;
}

.template-unit-table-wrap {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

.template-unit-table {
  height: 100%;
  min-height: 0;
}

.template-unit-footer {
  flex: 0 0 auto;
  display: flex;
  justify-content: flex-end;
}
</style>
