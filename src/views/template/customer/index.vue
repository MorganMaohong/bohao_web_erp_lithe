<script setup lang="ts">
import { useMutation } from '@pinia/colada'
import {
  NButton,
  NCard,
  NDataTable,
  NDatePicker,
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
} from 'naive-ui'
import { computed, h, onMounted, reactive, ref, watch } from 'vue'

import {
  deleteTemplateCustomer,
  getTemplateCustomerForm,
  getTemplateCustomers,
  saveTemplateCustomer,
  type TemplateCustomer,
  type TemplateCustomerForm,
  type TemplateCustomerPageData,
  type TemplateCustomerQuery,
} from '@/api'

import type { DataTableColumns, FormInst, FormRules, PaginationProps } from 'naive-ui'

defineOptions({
  name: 'TemplateCustomer',
})

const queryFormRef = ref<FormInst>()
const editFormRef = ref<FormInst>()

const showEditModal = ref(false)
const activeEditId = ref<string | null>(null)

const loading = ref(false)
const pageData = ref<TemplateCustomerPageData>({
  currentPage: 1,
  pageSize: 50,
  count: 0,
  list: [],
})

const query = reactive<TemplateCustomerQuery>({
  currentPage: 1,
  pageSize: 50,
  name: '',
})

const optionState = reactive<Pick<
  TemplateCustomerForm,
  'categoryOptions' | 'levelOptions' | 'settlementOptions'
>>({
  categoryOptions: [],
  levelOptions: [],
  settlementOptions: [],
})

function createEmptyForm(): TemplateCustomerForm {
  return {
    code: '',
    name: '',
    contactName: '',
    contactPhone: '',
    category: '',
    level: '',
    settlement: '',
    creditLimit: null,
    startTime: null,
    endTime: null,
    address: '',
    remark: '',
    categoryOptions: optionState.categoryOptions || [],
    levelOptions: optionState.levelOptions || [],
    settlementOptions: optionState.settlementOptions || [],
  }
}

const form = reactive<TemplateCustomerForm>(createEmptyForm())

const editFormRules: FormRules = {
  name: [
    {
      required: true,
      message: '请输入客户名称',
      trigger: ['blur', 'input'],
    },
  ],
}

function syncOptionState(data?: TemplateCustomerForm) {
  optionState.categoryOptions = data?.categoryOptions || []
  optionState.levelOptions = data?.levelOptions || []
  optionState.settlementOptions = data?.settlementOptions || []
}

function syncForm(data?: Partial<TemplateCustomerForm>) {
  Object.assign(form, createEmptyForm(), data || {}, {
    categoryOptions: optionState.categoryOptions || [],
    levelOptions: optionState.levelOptions || [],
    settlementOptions: optionState.settlementOptions || [],
  })
}

async function loadOptions() {
  const data = await getTemplateCustomerForm()
  syncOptionState(data)
  syncForm()
}

async function loadTableData() {
  loading.value = true
  try {
    pageData.value = await getTemplateCustomers({ ...query })
  } finally {
    loading.value = false
  }
}

function resetQuery() {
  Object.assign(query, {
    currentPage: 1,
    pageSize: 50,
    name: '',
  })
  loadTableData()
}

async function openCreateModal() {
  if (!optionState.categoryOptions?.length) {
    await loadOptions()
  }

  activeEditId.value = null
  syncForm()
  showEditModal.value = true
}

async function openEditModal(uid?: string) {
  activeEditId.value = uid || null
  const data = await getTemplateCustomerForm(uid)
  syncOptionState(data)
  syncForm(data)
  showEditModal.value = true
}

const { isLoading: saveLoading, mutateAsync: mutateSave } = useMutation({
  mutation: saveTemplateCustomer,
  onSuccess: async () => {
    showEditModal.value = false
    await loadTableData()
  },
})

const { isLoading: deleteLoading, mutateAsync: mutateDelete } = useMutation({
  mutation: deleteTemplateCustomer,
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

const columns = computed<DataTableColumns<TemplateCustomer>>(() => [
  { title: '编码', key: 'code', width: 130, ellipsis: { tooltip: true } },
  { title: '客户名称', key: 'name', width: 180, ellipsis: { tooltip: true } },
  { title: '联系人', key: 'contactName', width: 120, ellipsis: { tooltip: true } },
  { title: '联系电话', key: 'contactPhone', width: 150, ellipsis: { tooltip: true } },
  { title: '客户分类', key: 'categoryName', width: 130, ellipsis: { tooltip: true } },
  { title: '客户等级', key: 'levelName', width: 130, ellipsis: { tooltip: true } },
  { title: '结算期限', key: 'settlementName', width: 130, ellipsis: { tooltip: true } },
  { title: '信用额度', key: 'creditLimit', width: 130, ellipsis: { tooltip: true } },
  { title: '地址', key: 'address', minWidth: 220, ellipsis: { tooltip: true } },
  {
    title: '操作',
    key: 'actions',
    fixed: 'right',
    width: 150,
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
                default: () => '确定删除当前客户吗？',
              },
            ),
          ],
        },
      ),
  },
])

const modalTitle = computed(() => (activeEditId.value ? '编辑客户' : '新增客户'))

onMounted(async () => {
  await loadOptions()
  await loadTableData()
})
</script>

<template>
  <div class="template-customer-page">
    <NCard
      size="small"
      :bordered="false"
      class="template-customer-card shadow-sm"
    >
      <div class="template-customer-content">
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
              <NFormItem label="客户">
                <NInput
                  v-model:value="query.name"
                  clearable
                  placeholder="名称/编码/联系人/电话"
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
                    新增客户
                  </NButton>
                </NFlex>
              </NFormItem>
            </NGi>
          </NGrid>
        </NForm>

        <div class="template-customer-table-wrap">
          <NDataTable
            remote
            flex-height
            class="template-customer-table"
            :columns="columns"
            :data="pageData.list || []"
            :loading="mergedLoading"
            :pagination="false"
            :scroll-x="1500"
            :single-line="false"
            size="small"
          />
        </div>

        <footer class="template-customer-footer">
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
      class="w-[820px] max-w-[calc(100vw-32px)]"
      :title="modalTitle"
      :mask-closable="false"
    >
      <NForm
        ref="editFormRef"
        :model="form"
        :rules="editFormRules"
        label-placement="left"
        label-width="110"
      >
        <NGrid
          cols="1 s:2"
          responsive="screen"
          :x-gap="14"
          :y-gap="4"
        >
          <NGi>
            <NFormItem label="编码">
              <NInput
                :value="form.code || ''"
                disabled
                placeholder="自动生成编码"
              />
            </NFormItem>
          </NGi>
          <NGi>
            <NFormItem
              label="客户名称"
              path="name"
            >
              <NInput
                v-model:value="form.name"
                placeholder="请输入客户名称"
              />
            </NFormItem>
          </NGi>
          <NGi>
            <NFormItem label="联系人">
              <NInput
                v-model:value="form.contactName"
                placeholder="请输入联系人"
              />
            </NFormItem>
          </NGi>
          <NGi>
            <NFormItem label="联系电话">
              <NInput
                v-model:value="form.contactPhone"
                placeholder="请输入联系电话"
              />
            </NFormItem>
          </NGi>
          <NGi>
            <NFormItem label="客户分类">
              <NSelect
                v-model:value="form.category"
                :options="optionState.categoryOptions"
                placeholder="请选择分类"
              />
            </NFormItem>
          </NGi>
          <NGi>
            <NFormItem label="客户等级">
              <NSelect
                v-model:value="form.level"
                :options="optionState.levelOptions"
                placeholder="请选择等级"
              />
            </NFormItem>
          </NGi>
          <NGi>
            <NFormItem label="结算期限">
              <NSelect
                v-model:value="form.settlement"
                :options="optionState.settlementOptions"
                placeholder="请选择期限"
              />
            </NFormItem>
          </NGi>
          <NGi>
            <NFormItem label="信用额度/元">
              <NInputNumber
                v-model:value="form.creditLimit"
                class="w-full"
                :min="0"
                :show-button="false"
              />
            </NFormItem>
          </NGi>
          <NGi>
            <NFormItem label="签约开始日期">
              <NDatePicker
                v-model:value="form.startTime"
                type="date"
                class="w-full"
              />
            </NFormItem>
          </NGi>
          <NGi>
            <NFormItem label="签约结束日期">
              <NDatePicker
                v-model:value="form.endTime"
                type="date"
                class="w-full"
              />
            </NFormItem>
          </NGi>
          <NGi span="2">
            <NFormItem label="详细地址">
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
.template-customer-page {
  height: 100%;
  min-height: 0;
  padding: 12px;
  overflow: hidden;
  box-sizing: border-box;
}

.template-customer-card {
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.template-customer-card:deep(.n-card__content),
.template-customer-card:deep(.n-card-content) {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.template-customer-content {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  gap: 16px;
}

.template-customer-table-wrap {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

.template-customer-table {
  height: 100%;
  min-height: 0;
}

.template-customer-footer {
  flex: 0 0 auto;
  display: flex;
  justify-content: flex-end;
}
</style>
