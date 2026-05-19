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
  NImage,
  NInput,
  NModal,
  NPagination,
  NPopconfirm,
  NSpace,
} from 'naive-ui'
import { computed, h, onMounted, reactive, ref, watch } from 'vue'

import {
  deleteTemplateWarehouse,
  getTemplateWarehouseForm,
  getTemplateWarehouses,
  saveTemplateWarehouse,
  type TemplateWarehouse,
  type TemplateWarehouseForm,
  type TemplateWarehousePageData,
  type TemplateWarehouseQuery,
} from '@/api'

import type { DataTableColumns, FormInst, FormRules, PaginationProps } from 'naive-ui'

defineOptions({
  name: 'TemplateWarehouse',
})

const queryFormRef = ref<FormInst>()
const editFormRef = ref<FormInst>()

const showEditModal = ref(false)
const showCopyMode = ref(false)
const activeEditId = ref<string | null>(null)

const loading = ref(false)
const pageData = ref<TemplateWarehousePageData>({
  currentPage: 1,
  pageSize: 50,
  count: 0,
  list: [],
})

const query = reactive<TemplateWarehouseQuery>({
  currentPage: 1,
  pageSize: 50,
  key: '',
})

function createEmptyForm(): TemplateWarehouseForm {
  return {
    code: '',
    name: '',
    image: '',
    address: '',
    remark: '',
  }
}

const form = reactive<TemplateWarehouseForm>(createEmptyForm())

const editFormRules: FormRules = {
  name: [
    {
      required: true,
      message: '请输入名称',
      trigger: ['blur', 'input'],
    },
  ],
}

function syncForm(data?: Partial<TemplateWarehouseForm>) {
  Object.assign(form, createEmptyForm(), data || {})
}

async function loadTableData() {
  loading.value = true
  try {
    pageData.value = await getTemplateWarehouses({ ...query })
  } finally {
    loading.value = false
  }
}

function resetQuery() {
  Object.assign(query, {
    currentPage: 1,
    pageSize: 50,
    key: '',
  })
  loadTableData()
}

async function openCreateModal() {
  activeEditId.value = null
  showCopyMode.value = false
  syncForm(await getTemplateWarehouseForm())
  showEditModal.value = true
}

async function openEditModal(uid?: string, copy = false) {
  activeEditId.value = copy ? null : uid || null
  showCopyMode.value = copy
  const data = await getTemplateWarehouseForm(uid)
  syncForm(data)

  if (copy) {
    form.uid = null
    form.id = null
    form.code = ''
  }

  showEditModal.value = true
}

const { isLoading: saveLoading, mutateAsync: mutateSave } = useMutation({
  mutation: saveTemplateWarehouse,
  onSuccess: async () => {
    showEditModal.value = false
    await loadTableData()
  },
})

const { isLoading: deleteLoading, mutateAsync: mutateDelete } = useMutation({
  mutation: deleteTemplateWarehouse,
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

const columns = computed<DataTableColumns<TemplateWarehouse>>(() => [
  { title: '编码', key: 'code', width: 140, ellipsis: { tooltip: true } },
  { title: '名称', key: 'name', width: 180, ellipsis: { tooltip: true } },
  {
    title: '图片',
    key: 'image',
    width: 100,
    render: (row) =>
      row.image
        ? h(NImage, {
            src: row.image,
            width: 48,
            height: 48,
            objectFit: 'cover',
            class: 'rounded border border-neutral-200',
          })
        : h('span', { class: 'text-neutral-400' }, '无'),
  },
  { title: '地址', key: 'address', minWidth: 240, ellipsis: { tooltip: true } },
  { title: '备注', key: 'remark', minWidth: 220, ellipsis: { tooltip: true } },
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
                    {
                      text: true,
                      type: 'error',
                    },
                    { default: () => '删除' },
                  ),
                default: () => '确定删除当前仓库吗？',
              },
            ),
          ],
        },
      ),
  },
])

const modalTitle = computed(() => {
  if (showCopyMode.value) return '复制仓库'
  return activeEditId.value ? '编辑仓库' : '新增仓库'
})

onMounted(() => {
  loadTableData()
})
</script>

<template>
  <div class="template-warehouse-page">
    <NCard
      size="small"
      :bordered="false"
      class="template-warehouse-card shadow-sm"
    >
      <div class="template-warehouse-content">
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
              <NFormItem label="名称">
                <NInput
                  v-model:value="query.key"
                  clearable
                  placeholder="请输入仓库名称"
                  @keydown.enter.prevent="loadTableData"
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
                    新增仓库
                  </NButton>
                </NFlex>
              </NFormItem>
            </NGi>
          </NGrid>
        </NForm>

        <div class="template-warehouse-table-wrap">
          <NDataTable
            remote
            flex-height
            class="template-warehouse-table"
            :columns="columns"
            :data="pageData.list || []"
            :loading="mergedLoading"
            :pagination="false"
            :scroll-x="1200"
            :single-line="false"
            size="small"
          />
        </div>

        <footer class="template-warehouse-footer">
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
      class="w-[700px] max-w-[calc(100vw-32px)]"
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
          :x-gap="14"
          :y-gap="4"
        >
          <NGi span="2">
            <NFormItem label="图片地址">
              <NInput
                v-model:value="form.image"
                clearable
                placeholder="先使用图片 URL，后续再接上传组件"
              />
            </NFormItem>
          </NGi>
          <NGi
            v-if="form.image"
            span="2"
          >
            <NFormItem label="图片预览">
              <NImage
                :src="form.image"
                width="96"
                height="96"
                object-fit="cover"
                class="rounded border border-neutral-200"
              />
            </NFormItem>
          </NGi>
          <NGi span="2">
            <NFormItem
              label="名称"
              path="name"
            >
              <NInput
                v-model:value="form.name"
                placeholder="请输入名称"
              />
            </NFormItem>
          </NGi>
          <NGi span="2">
            <NFormItem label="地址">
              <NInput
                v-model:value="form.address"
                placeholder="请输入地址"
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
.template-warehouse-page {
  height: 100%;
  min-height: 0;
  padding: 12px;
  overflow: hidden;
  box-sizing: border-box;
}

.template-warehouse-card {
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.template-warehouse-card:deep(.n-card__content),
.template-warehouse-card:deep(.n-card-content) {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.template-warehouse-content {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  gap: 16px;
}

.template-warehouse-table-wrap {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

.template-warehouse-table {
  height: 100%;
  min-height: 0;
}

.template-warehouse-footer {
  flex: 0 0 auto;
  display: flex;
  justify-content: flex-end;
}
</style>
