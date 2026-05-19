<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

defineOptions({
  name: 'MigrationPlaceholder',
})

const route = useRoute()

const title = computed(() => String(route.meta.title || '页面迁移中'))
</script>

<template>
  <div class="flex h-full items-center justify-center p-6">
    <div class="w-full max-w-3xl rounded-lg border border-naive-border bg-naive-card p-8">
      <div class="flex items-center gap-3 text-lg font-medium">
        <span class="iconify ph--hammer text-2xl text-primary" />
        <span>{{ title }}</span>
      </div>
      <p class="mt-4 text-sm leading-6 text-neutral-500 dark:text-neutral-400">
        这个 ERP 模块的登录、菜单和路由已经接入到 Lite 宿主里，页面本体还在迁移。
      </p>
      <div class="mt-6 rounded-md bg-neutral-100 px-4 py-3 text-sm dark:bg-neutral-800">
        当前路径：{{ route.fullPath }}
      </div>
    </div>
  </div>
</template>
