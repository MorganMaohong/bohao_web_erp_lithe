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
  deleteTemplateSupplier,
  getTemplateSupplierForm,
  getTemplateSuppliers,
  saveTemplateSupplier,
  type TemplateSupplier,
  type TemplateSupplierForm,
  type TemplateSupplierPageData,
  type TemplateSupplierQuery,
} from '@/api'

import type { DataTableColumns, FormInst, FormRules, PaginationProps } from 'naive-ui'

defineOptions({
  name: 'TemplateSupplier',
})

const queryFormRef = ref<FormInst>()
const editFormRef = ref<FormInst>()

const showEditModal = ref(false)
const activeEditId = ref<string | null>(null)

const loading = ref(false)
const pageData = ref<TemplateSupplierPageData>({
  currentPage: 1,
  pageSize: 50,
  count: 0,
  list: [],
})

const query = reactive<TemplateSupplierQuery>({
  currentPage: 1,
  pageSize: 50,
  name: '',
})

const optionState = reactive<Pick<
  TemplateSupplierForm,
  'categoryOptions' | 'levelOptions' | 'settlementOptions'
>>({
  categoryOptions: [],
  levelOptions: [],
  settlementOptions: [],
})

function createEmptyForm(): TemplateSupplierForm {
  return {
    code: '',
    name: '',
    contactName: '',
    contactPhone: '',
    category: '',
    level: '',
    startTime: null,
    endTime: null,
    taxNo: '',
    settlement: '',
    settlementMethod: '',
    creditLimit: null,
    bankName: '',
    bankAccountName: '',
    bankAccountNo: '',
    address: '',
    remark: '',
    categoryOptions: optionState.categoryOptions || [],
    levelOptions: optionState.levelOptions || [],
    settlementOptions: optionState.settlementOptions || [],
  }
}

const form = reactive<TemplateSupplierForm>(createEmptyForm())

const editFormRules: FormRules = {
  name: [
    {
      required: true,
      message: '请输入名称',
      trigger: ['blur', 'input'],
    },
  ],
}

function syncOptionState(data?: TemplateSupplierForm) {
  optionState.categoryOptions = data?.categoryOptions || []
  optionState.levelOptions = data?.levelOptions || []
  optionState.settlementOptions = data?.settlementOptions || []
}

function syncForm(data?: Partial<TemplateSupplierForm>) {
  Object.assign(form, createEmptyForm(), data || {}, {
    categoryOptions: optionState.categoryOptions || [],
    levelOptions: optionState.levelOptions || [],
    settlementOptions: optionState.settlementOptions || [],
  })
}

async function loadOptions() {
  const data = await getTemplateSupplierForm()
  syncOptionState(data)
  syncForm()
}

async function loadTableData() {
  loading.value = true
  try {
    pageData.value = await getTemplateSuppliers({ ...query })
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
  const data = await getTemplateSupplierForm(uid)
  syncOptionState(data)
  syncForm(data)
  showEditModal.value = true
}

const { isLoading: saveLoading, mutateAsync: mutateSave } = useMutation({
  mutation: saveTemplateSupplier,
  onSuccess: async () => {
    showEditModal.value = false
    await loadTableData()
  },
})

const { isLoading: deleteLoading, mutateAsync: mutateDelete } = useMutation({
  mutation: deleteTemplateSupplier,
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

const columns = computed<DataTableColumns<TemplateSupplier>>(() => [
  { title: '编码', key: 'code', width: 140, ellipsis: { tooltip: true } },
  { title: '名称', key: 'name', width: 160, ellipsis: { tooltip: true } },
  { title: '联系人', key: 'contactName', width: 120, ellipsis: { tooltip: true } },
  { title: '联系电话', key: 'contactPhone', width: 140, ellipsis: { tooltip: true } },
  { title: '税号', key: 'taxNo', width: 180, ellipsis: { tooltip: true } },
  { title: '供应商分类', key: 'categoryName', width: 140, ellipsis: { tooltip: true } },
  { title: '供应商等级', key: 'levelName', width: 140, ellipsis: { tooltip: true } },
  { title: '结算期限', key: 'settlementName', width: 140, ellipsis: { tooltip: true } },
  { title: '结算方式', key: 'settlementMethod', width: 140, ellipsis: { tooltip: true } },
  { title: '信用额度', key: 'creditLimit', width: 140, ellipsis: { tooltip: true } },
  { title: '开户银行', key: 'bankName', width: 160, ellipsis: { tooltip: true } },
  { title: '银行账户名', key: 'bankAccountName', width: 160, ellipsis: { tooltip: true } },
  { title: '银行账号', key: 'bankAccountNo', width: 180, ellipsis: { tooltip: true } },
  { title: '签约开始日期', key: 'startTimeName', width: 150, ellipsis: { tooltip: true } },
  { title: '签约结束日期', key: 'endTimeName', width: 150, ellipsis: { tooltip: true } },
  { title: '详细地址', key: 'address', minWidth: 220, ellipsis: { tooltip: true } },
  { title: '备注', key: 'remark', minWidth: 180, ellipsis: { tooltip: true } },
  {
    title: '操作',
    key: 'actions',
    fixed: 'right',
    width: 140,
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
                    {
                      text: true,
                      type: 'error',
                    },
                    { default: () => '删除' },
                  ),
                default: () => '确定删除当前供应商吗？',
              },
            ),
          ],
        },
      ),
  },
])

const modalTitle = computed(() => (activeEditId.value ? '编辑供应商' : '新增供应商'))

onMounted(async () => {
  await loadOptions()
  await loadTableData()
})
</script>

<template>
  <div class="template-supplier-page">
    <NCard
      size="small"
      :bordered="false"
      class="template-supplier-card shadow-sm"
    >
      <div class="template-supplier-content">
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
                  v-model:value="query.name"
                  clearable
                  placeholder="请输入供应商名称"
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
                    新增供应商
                  </NButton>
                </NFlex>
              </NFormItem>
            </NGi>
          </NGrid>
        </NForm>

        <div class="template-supplier-table-wrap">
          <NDataTable
            remote
            flex-height
            class="template-supplier-table"
            :columns="columns"
            :data="pageData.list || []"
            :loading="mergedLoading"
            :pagination="false"
            :scroll-x="2600"
            :single-line="false"
            size="small"
          />
        </div>

        <footer class="template-supplier-footer">
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
        label-width="120"
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
              label="名称"
              path="name"
            >
              <NInput
                v-model:value="form.name"
                placeholder="请输入名称"
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
            <NFormItem label="联系人电话">
              <NInput
                v-model:value="form.contactPhone"
                placeholder="请输入联系人电话"
              />
            </NFormItem>
          </NGi>
          <NGi>
            <NFormItem label="供应商分类">
              <NSelect
                v-model:value="form.category"
                :options="optionState.categoryOptions"
                placeholder="请选择分类"
              />
            </NFormItem>
          </NGi>
          <NGi>
            <NFormItem label="供应商等级">
              <NSelect
                v-model:value="form.level"
                :options="optionState.levelOptions"
                placeholder="请选择等级"
              />
            </NFormItem>
          </NGi>
          <NGi>
            <NFormItem label="签约开始日期">
              <NDatePicker
                v-model:value="form.startTime"
                class="w-full"
                type="date"
                :is-date-disabled="(ts: number) => Boolean(form.endTime && ts >= form.endTime)"
              />
            </NFormItem>
          </NGi>
          <NGi>
            <NFormItem label="签约结束日期">
              <NDatePicker
                v-model:value="form.endTime"
                class="w-full"
                type="date"
                :is-date-disabled="(ts: number) => Boolean(form.startTime && ts <= form.startTime)"
              />
            </NFormItem>
          </NGi>
          <NGi>
            <NFormItem label="税号">
              <NInput
                v-model:value="form.taxNo"
                placeholder="请输入供应商税号"
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
            <NFormItem label="结算方式">
              <NInput
                v-model:value="form.settlementMethod"
                placeholder="如微信、支付宝、银行转账等"
              />
            </NFormItem>
          </NGi>
          <NGi>
            <NFormItem label="信用额度/元">
              <NInputNumber
                v-model:value="form.creditLimit"
                class="w-full"
                :show-button="false"
                :min="0"
                placeholder="请输入信用额度"
              />
            </NFormItem>
          </NGi>
          <NGi span="2">
            <NFormItem label="开户银行">
              <NInput
                v-model:value="form.bankName"
                placeholder="请输入开户银行"
              />
            </NFormItem>
          </NGi>
          <NGi>
            <NFormItem label="银行账户名">
              <NInput
                v-model:value="form.bankAccountName"
                placeholder="请输入银行账户名"
              />
            </NFormItem>
          </NGi>
          <NGi>
            <NFormItem label="银行账号">
              <NInput
                v-model:value="form.bankAccountNo"
                placeholder="请输入银行账号"
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
.template-supplier-page {
  height: 100%;
  min-height: 0;
  padding: 12px;
  overflow: hidden;
  box-sizing: border-box;
}

.template-supplier-card {
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.template-supplier-card:deep(.n-card__content),
.template-supplier-card:deep(.n-card-content) {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.template-supplier-content {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  gap: 16px;
}

.template-supplier-table-wrap {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

.template-supplier-table {
  height: 100%;
  min-height: 0;
}

.template-supplier-footer {
  flex: 0 0 auto;
  display: flex;
  justify-content: flex-end;
}
</style>
