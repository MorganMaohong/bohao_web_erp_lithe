<script setup lang="ts">
import { useMutation } from '@pinia/colada'
import {
  NButton,
  NCard,
  NCascader,
  NDataTable,
  NFlex,
  NForm,
  NFormItem,
  NGi,
  NGrid,
  NImage,
  NInput,
  NInputNumber,
  NModal,
  NPagination,
  NPopconfirm,
  NSelect,
  NSpace,
  NTag,
} from 'naive-ui'
import { computed, h, onMounted, reactive, ref, watch } from 'vue'

import {
  deleteTemplateItem,
  getTemplateItemForm,
  getTemplateItems,
  saveTemplateItem,
  type TemplateItem,
  type TemplateItemForm,
  type TemplateItemPageData,
  type TemplateItemQuery,
} from '@/api'

import type { DataTableColumns, FormInst, FormRules, PaginationProps } from 'naive-ui'

defineOptions({
  name: 'TemplateItems',
})

const tableRef = ref<InstanceType<typeof NDataTable>>()
const queryFormRef = ref<FormInst>()
const editFormRef = ref<FormInst>()

const showEditModal = ref(false)
const showCopyMode = ref(false)
const activeEditId = ref<string | null>(null)

const loading = ref(false)
const pageData = ref<TemplateItemPageData>({
  currentPage: 1,
  pageSize: 50,
  count: 0,
  list: [],
})

const query = reactive<TemplateItemQuery>({
  currentPage: 1,
  pageSize: 50,
  key: '',
  itemBizType: '',
})

const optionState = reactive<Pick<
  TemplateItemForm,
  'typeOptions' | 'unitOptions' | 'supplierOptions' | 'itemBizTypeOptions'
>>({
  typeOptions: [],
  unitOptions: [],
  supplierOptions: [],
  itemBizTypeOptions: [],
})

function createEmptyForm(): TemplateItemForm {
  return {
    image: '',
    name: '',
    itemBizType: '',
    supplierUid: '',
    type: '',
    unit: '',
    brand: '',
    spec: '',
    material: '',
    vatTaxRate: 13,
    taxAmount: 0,
    purchasePriceWithTax: 0,
    purchasePriceWithoutTax: 0,
    salePriceWithTax: 0,
    salePriceWithoutTax: 0,
    remark: '',
    typeOptions: optionState.typeOptions || [],
    unitOptions: optionState.unitOptions || [],
    supplierOptions: optionState.supplierOptions || [],
    itemBizTypeOptions: optionState.itemBizTypeOptions || [],
  }
}

const form = reactive<TemplateItemForm>(createEmptyForm())

const editFormRules: FormRules = {
  itemBizType: [
    {
      required: true,
      message: '请选择物料业务类型',
      trigger: ['blur', 'change'],
    },
  ],
  type: [
    {
      required: true,
      message: '请选择类型',
      trigger: ['blur', 'change'],
    },
  ],
  name: [
    {
      required: true,
      message: '请输入名称',
      trigger: ['blur', 'input'],
    },
  ],
  supplierUid: [
    {
      required: true,
      message: '请选择供应商',
      trigger: ['blur', 'change'],
    },
  ],
  unit: [
    {
      required: true,
      message: '请选择单位',
      trigger: ['blur', 'change'],
    },
  ],
}

function syncOptionState(data?: TemplateItemForm) {
  optionState.typeOptions = data?.typeOptions || []
  optionState.unitOptions = data?.unitOptions || []
  optionState.supplierOptions = data?.supplierOptions || []
  optionState.itemBizTypeOptions = data?.itemBizTypeOptions || []
}

function syncForm(data?: Partial<TemplateItemForm>) {
  Object.assign(form, createEmptyForm(), data || {}, {
    typeOptions: optionState.typeOptions || [],
    unitOptions: optionState.unitOptions || [],
    supplierOptions: optionState.supplierOptions || [],
    itemBizTypeOptions: optionState.itemBizTypeOptions || [],
  })
}

function taxExclusivePrice(price?: number | null, rate?: number | null) {
  const normalizedPrice = Number(price || 0)
  const normalizedRate = Number(rate || 0)
  if (!normalizedPrice) return 0
  return Number((normalizedPrice / (1 + normalizedRate / 100)).toFixed(4))
}

function refreshPurchasePrice() {
  form.purchasePriceWithoutTax = taxExclusivePrice(form.purchasePriceWithTax, form.vatTaxRate)
  form.taxAmount = Number(
    ((Number(form.purchasePriceWithTax || 0) || 0) - Number(form.purchasePriceWithoutTax || 0)).toFixed(4),
  )
}

function refreshSalePrice() {
  form.salePriceWithoutTax = taxExclusivePrice(form.salePriceWithTax, form.vatTaxRate)
}

watch(
  () => [form.purchasePriceWithTax, form.vatTaxRate],
  () => {
    refreshPurchasePrice()
  },
)

watch(
  () => [form.salePriceWithTax, form.vatTaxRate],
  () => {
    refreshSalePrice()
  },
)

async function loadOptions() {
  const data = await getTemplateItemForm()
  syncOptionState(data)
  syncForm()
}

async function loadTableData() {
  loading.value = true
  try {
    pageData.value = await getTemplateItems({ ...query })
  } finally {
    loading.value = false
  }
}

function resetQuery() {
  Object.assign(query, {
    currentPage: 1,
    pageSize: 50,
    key: '',
    itemBizType: '',
  })
  loadTableData()
}

async function openCreateModal() {
  if (!optionState.typeOptions?.length) {
    await loadOptions()
  }

  showCopyMode.value = false
  activeEditId.value = null
  syncForm()
  showEditModal.value = true
}

async function openEditModal(uid?: string, copy = false) {
  showCopyMode.value = copy
  activeEditId.value = copy ? null : uid || null
  const data = await getTemplateItemForm(uid)
  syncOptionState(data)
  syncForm(data)

  if (copy) {
    form.uid = null
    form.id = null
  }

  showEditModal.value = true
}

const { isLoading: saveLoading, mutateAsync: mutateSave } = useMutation({
  mutation: saveTemplateItem,
  onSuccess: async () => {
    showEditModal.value = false
    await loadTableData()
  },
})

const { isLoading: deleteLoading, mutateAsync: mutateDelete } = useMutation({
  mutation: deleteTemplateItem,
  onSuccess: async () => {
    await loadTableData()
  },
})

async function handleSave() {
  await editFormRef.value?.validate()
  refreshPurchasePrice()
  refreshSalePrice()
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

const columns = computed<DataTableColumns<TemplateItem>>(() => [
  {
    title: '名称',
    key: 'name',
    width: 180,
    ellipsis: {
      tooltip: true,
    },
    fixed: 'left',
  },
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
  {
    title: '类型',
    key: 'typeName',
    width: 140,
    ellipsis: {
      tooltip: true,
    },
  },
  {
    title: '业务类型',
    key: 'itemBizTypeName',
    width: 120,
    render: (row) =>
      h(
        NTag,
        {
          size: 'small',
          bordered: false,
          type: row.itemBizTypeName ? 'info' : 'default',
        },
        { default: () => row.itemBizTypeName || '-' },
      ),
  },
  {
    title: '单位',
    key: 'unitName',
    width: 90,
  },
  {
    title: '供应商',
    key: 'supplierName',
    width: 160,
    ellipsis: {
      tooltip: true,
    },
  },
  {
    title: '品牌',
    key: 'brand',
    width: 120,
    ellipsis: {
      tooltip: true,
    },
  },
  {
    title: '增值税率',
    key: 'vatTaxRate',
    width: 110,
    render: (row) => `${row.vatTaxRate ?? 0}%`,
  },
  {
    title: '采购单价(含税)',
    key: 'purchasePriceWithTax',
    width: 140,
  },
  {
    title: '采购单价(不含税)',
    key: 'purchasePriceWithoutTax',
    width: 150,
  },
  {
    title: '销售单价(含税)',
    key: 'salePriceWithTax',
    width: 140,
  },
  {
    title: '销售单价(不含税)',
    key: 'salePriceWithoutTax',
    width: 150,
  },
  {
    title: '规格',
    key: 'spec',
    width: 160,
    ellipsis: {
      tooltip: true,
    },
  },
  {
    title: '材质',
    key: 'material',
    width: 140,
    ellipsis: {
      tooltip: true,
    },
  },
  {
    title: '备注',
    key: 'remark',
    minWidth: 220,
    ellipsis: {
      tooltip: true,
    },
  },
  {
    title: '操作',
    key: 'actions',
    fixed: 'right',
    width: 210,
    render: (row) =>
      h(
        NSpace,
        {
          justify: 'center',
          size: 'small',
        },
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
              {
                onPositiveClick: () => handleDelete(row.uid),
              },
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
                default: () => '确定删除当前物料吗？',
              },
            ),
          ],
        },
      ),
  },
])

const modalTitle = computed(() => {
  if (showCopyMode.value) return '复制物料'
  return activeEditId.value ? '编辑物料' : '新增物料'
})

onMounted(async () => {
  await loadOptions()
  await loadTableData()
})
</script>

<template>
  <div class="template-items-page">
    <NCard
      size="small"
      :bordered="false"
      class="template-items-card shadow-sm"
    >
      <div class="template-items-content">
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
                  placeholder="名称 / 规格 / 材质"
                  @keydown.enter.prevent="loadTableData"
                />
              </NFormItem>
            </NGi>
            <NGi>
              <NFormItem label="业务类型">
                <NSelect
                  v-model:value="query.itemBizType"
                  clearable
                  placeholder="选择业务类型"
                  :options="optionState.itemBizTypeOptions"
                />
              </NFormItem>
            </NGi>
            <NGi span="2">
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
                    新增物料
                  </NButton>
                </NFlex>
              </NFormItem>
            </NGi>
          </NGrid>
        </NForm>

        <div class="template-items-table-wrap">
          <NDataTable
            ref="tableRef"
            remote
            flex-height
            class="template-items-table"
            :columns="columns"
            :data="pageData.list || []"
            :loading="mergedLoading"
            :pagination="false"
            :scroll-x="2100"
            :single-line="false"
            size="small"
          />
        </div>

        <footer class="template-items-footer">
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
        label-width="120"
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
                placeholder="先使用图片 URL，后续可接上传组件"
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
            <NFormItem
              label="业务类型"
              path="itemBizType"
            >
              <NSelect
                v-model:value="form.itemBizType"
                :options="optionState.itemBizTypeOptions"
                placeholder="请选择业务类型"
              />
            </NFormItem>
          </NGi>
          <NGi>
            <NFormItem
              label="供应商"
              path="supplierUid"
            >
              <NSelect
                v-model:value="form.supplierUid"
                :options="optionState.supplierOptions"
                filterable
                placeholder="请选择供应商"
              />
            </NFormItem>
          </NGi>
          <NGi>
            <NFormItem
              label="类型"
              path="type"
            >
              <NCascader
                v-model:value="form.type"
                :options="optionState.typeOptions"
                check-strategy="child"
                clearable
                filterable
                placeholder="请选择类型"
              />
            </NFormItem>
          </NGi>
          <NGi>
            <NFormItem
              label="单位"
              path="unit"
            >
              <NCascader
                v-model:value="form.unit"
                :options="optionState.unitOptions"
                check-strategy="child"
                clearable
                filterable
                placeholder="请选择单位"
              />
            </NFormItem>
          </NGi>
          <NGi>
            <NFormItem label="品牌">
              <NInput
                v-model:value="form.brand"
                placeholder="请输入品牌"
              />
            </NFormItem>
          </NGi>
          <NGi>
            <NFormItem label="规格">
              <NInput
                v-model:value="form.spec"
                placeholder="请输入规格"
              />
            </NFormItem>
          </NGi>
          <NGi>
            <NFormItem label="材质">
              <NInput
                v-model:value="form.material"
                placeholder="请输入材质"
              />
            </NFormItem>
          </NGi>
          <NGi>
            <NFormItem label="增值税率%">
              <NInputNumber
                v-model:value="form.vatTaxRate"
                class="w-full"
                :show-button="false"
                :min="0"
                :max="100"
                placeholder="如 13"
              />
            </NFormItem>
          </NGi>
          <NGi>
            <NFormItem label="采购单价(含税)">
              <NInputNumber
                v-model:value="form.purchasePriceWithTax"
                class="w-full"
                :show-button="false"
                :min="0"
              />
            </NFormItem>
          </NGi>
          <NGi>
            <NFormItem label="采购单价(不含税)">
              <NInputNumber
                v-model:value="form.purchasePriceWithoutTax"
                class="w-full"
                :show-button="false"
                :min="0"
                disabled
              />
            </NFormItem>
          </NGi>
          <NGi>
            <NFormItem label="税额">
              <NInputNumber
                v-model:value="form.taxAmount"
                class="w-full"
                :show-button="false"
                :min="0"
                disabled
              />
            </NFormItem>
          </NGi>
          <NGi>
            <NFormItem label="销售单价(含税)">
              <NInputNumber
                v-model:value="form.salePriceWithTax"
                class="w-full"
                :show-button="false"
                :min="0"
              />
            </NFormItem>
          </NGi>
          <NGi>
            <NFormItem label="销售单价(不含税)">
              <NInputNumber
                v-model:value="form.salePriceWithoutTax"
                class="w-full"
                :show-button="false"
                :min="0"
                disabled
              />
            </NFormItem>
          </NGi>
          <NGi span="2">
            <NFormItem label="备注">
              <NInput
                v-model:value="form.remark"
                type="textarea"
                placeholder="请输入备注"
                :autosize="{ minRows: 3, maxRows: 5 }"
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
.template-items-page {
  height: 100%;
  min-height: 0;
  padding: 12px;
  overflow: hidden;
  box-sizing: border-box;
}

.template-items-card {
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.template-items-card:deep(.n-card__content),
.template-items-card:deep(.n-card-content) {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.template-items-content {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  gap: 16px;
}

.template-items-table-wrap {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

.template-items-table {
  height: 100%;
  min-height: 0;
}

.template-items-footer {
  flex: 0 0 auto;
  display: flex;
  justify-content: flex-end;
}
</style>
