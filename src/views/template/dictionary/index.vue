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
  NModal,
  NPopconfirm,
  NSpace,
  NTreeSelect,
  NSelect,
} from 'naive-ui'
import { computed, h, onMounted, reactive, ref } from 'vue'

import {
  deleteTemplateDictionary,
  getTemplateDictionaries,
  getTemplateDictionaryForm,
  saveTemplateDictionary,
  type TemplateDictionary,
  type TemplateDictionaryForm,
  type TemplateDictionaryQuery,
} from '@/api'

import type { DataTableColumns, FormInst, FormRules } from 'naive-ui'

defineOptions({
  name: 'TemplateDictionary',
})

const queryFormRef = ref<FormInst>()
const editFormRef = ref<FormInst>()

const showEditModal = ref(false)
const showCopyMode = ref(false)
const activeEditId = ref<string | null>(null)

const loading = ref(false)
const data = ref<TemplateDictionary[]>([])

const query = reactive<TemplateDictionaryQuery>({
  name: '',
})

const optionState = reactive<Pick<TemplateDictionaryForm, 'treeOptions' | 'typeOptions'>>({
  treeOptions: [],
  typeOptions: [],
})

function createEmptyForm(): TemplateDictionaryForm {
  return {
    type: '',
    parentUid: null,
    name: '',
    remark: '',
    treeOptions: optionState.treeOptions || [],
    typeOptions: optionState.typeOptions || [],
  }
}

const form = reactive<TemplateDictionaryForm>(createEmptyForm())

const editFormRules: FormRules = {
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
}

function syncOptionState(payload?: TemplateDictionaryForm) {
  optionState.treeOptions = payload?.treeOptions || []
  optionState.typeOptions = payload?.typeOptions || []
}

function syncForm(payload?: Partial<TemplateDictionaryForm>) {
  Object.assign(form, createEmptyForm(), payload || {}, {
    treeOptions: optionState.treeOptions || [],
    typeOptions: optionState.typeOptions || [],
  })
}

async function loadTableData() {
  loading.value = true
  try {
    data.value = await getTemplateDictionaries({ ...query })
  } finally {
    loading.value = false
  }
}

function resetQuery() {
  Object.assign(query, {
    name: '',
  })
  loadTableData()
}

async function openCreateModal() {
  const payload = await getTemplateDictionaryForm()
  activeEditId.value = null
  showCopyMode.value = false
  syncOptionState(payload)
  syncForm(payload)
  showEditModal.value = true
}

async function openEditModal(uid?: string, copy = false) {
  const payload = await getTemplateDictionaryForm(uid)
  activeEditId.value = copy ? null : uid || null
  showCopyMode.value = copy
  syncOptionState(payload)
  syncForm(payload)

  if (copy) {
    form.uid = null
    form.id = null
  }

  showEditModal.value = true
}

const { isLoading: saveLoading, mutateAsync: mutateSave } = useMutation({
  mutation: saveTemplateDictionary,
  onSuccess: async () => {
    showEditModal.value = false
    await loadTableData()
  },
})

const { isLoading: deleteLoading, mutateAsync: mutateDelete } = useMutation({
  mutation: deleteTemplateDictionary,
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

const columns = computed<DataTableColumns<TemplateDictionary>>(() => [
  {
    title: '名称',
    key: 'name',
    minWidth: 260,
    ellipsis: { tooltip: true },
    tree: true,
  },
  {
    title: '类型',
    key: 'typeName',
    width: 160,
    ellipsis: { tooltip: true },
  },
  {
    title: '备注',
    key: 'remark',
    minWidth: 220,
    ellipsis: { tooltip: true },
  },
  {
    title: '操作',
    key: 'actions',
    fixed: 'right',
    width: 180,
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
                default: () => '确定删除当前字典吗？',
              },
            ),
          ],
        },
      ),
  },
])

const modalTitle = computed(() => {
  if (showCopyMode.value) return '复制字典'
  return activeEditId.value ? '编辑字典' : '新增字典'
})

onMounted(() => {
  loadTableData()
})
</script>

<template>
  <div class="template-dictionary-page">
    <NCard
      size="small"
      :bordered="false"
      class="template-dictionary-card shadow-sm"
    >
      <div class="template-dictionary-content">
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
                  placeholder="请输入字典名称"
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
                    新增字典
                  </NButton>
                </NFlex>
              </NFormItem>
            </NGi>
          </NGrid>
        </NForm>

        <div class="template-dictionary-table-wrap">
          <NDataTable
            remote
            flex-height
            class="template-dictionary-table"
            :columns="columns"
            :data="data"
            :loading="mergedLoading"
            :pagination="false"
            :scroll-x="960"
            :single-line="false"
            size="small"
            children-key="children"
            default-expand-all
          />
        </div>
      </div>
    </NCard>

    <NModal
      v-model:show="showEditModal"
      preset="card"
      class="w-[620px] max-w-[calc(100vw-32px)]"
      :title="modalTitle"
      :mask-closable="false"
    >
      <NForm
        ref="editFormRef"
        :model="form"
        :rules="editFormRules"
        label-placement="left"
        label-width="96"
      >
        <NGrid
          cols="1"
          :y-gap="4"
        >
          <NGi>
            <NFormItem
              label="类型"
              path="type"
            >
              <NSelect
                v-model:value="form.type"
                :options="optionState.typeOptions"
                :disabled="Boolean(form.uid)"
                placeholder="请选择类型"
              />
            </NFormItem>
          </NGi>
          <NGi>
            <NFormItem label="上级字典">
              <NTreeSelect
                v-model:value="form.parentUid"
                :options="optionState.treeOptions"
                key-field="value"
                label-field="label"
                children-field="children"
                clearable
                placeholder="请选择上级字典"
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
.template-dictionary-page {
  height: 100%;
  min-height: 0;
  padding: 12px;
  overflow: hidden;
  box-sizing: border-box;
}

.template-dictionary-card {
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.template-dictionary-card:deep(.n-card__content),
.template-dictionary-card:deep(.n-card-content) {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.template-dictionary-content {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  gap: 16px;
}

.template-dictionary-table-wrap {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

.template-dictionary-table {
  height: 100%;
  min-height: 0;
}
</style>
