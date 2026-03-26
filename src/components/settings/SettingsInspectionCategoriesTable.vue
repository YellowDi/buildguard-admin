<script setup lang="ts">
import { computed, onMounted, ref } from "vue"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import TablePageTable from "@/components/table-page/TablePageTable.vue"
import type { TableColumn, TablePageEmptyState } from "@/components/table-page/types"
import { handleApiError } from "@/lib/api-errors"
import {
  fetchInspectionCategories,
  type InspectionCategoryRecord,
} from "@/lib/inspection-categories-api"

type InspectionCategoryRow = {
  id: number
  uuid: string
  name: string
}

const INSPECTION_CATEGORIES_LOAD_ERROR_MESSAGE = "检测项分类列表加载失败，请稍后重试。"
const compactTableClass =
  "text-[13px] [&_thead_th]:px-2.5 [&_thead_th]:py-1.5 [&_tbody_td]:px-2.5 [&_tbody_td]:py-2 [&_tbody_td]:align-middle [&_tbody_td]:!border-l-0"

const rows = ref<InspectionCategoryRow[]>([])
const loading = ref(false)
const errorMessage = ref("")
const searchQuery = ref("")

const columns: TableColumn[] = [
  {
    key: "id",
    label: "ID",
    filterType: "number",
    tone: "muted",
  },
  {
    key: "name",
    label: "分类名称",
    filterType: "text",
    emphasis: "strong",
    tone: "primary",
    cellClass: "font-medium text-foreground",
    width: "fill",
  },
  {
    key: "uuid",
    label: "Uuid",
    filterType: "text",
    tone: "muted",
    cellClass: "font-mono text-[12px] text-muted-foreground",
  },
]

const filteredRows = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  if (!query) {
    return rows.value
  }

  return rows.value.filter(row => [
    String(row.id),
    row.name,
    row.uuid,
  ].some(field => field.toLowerCase().includes(query)))
})

const tableEmptyState = computed<TablePageEmptyState>(() => {
  if (loading.value) {
    return {
      title: "检测项分类加载中",
      description: "正在同步分类列表，请稍候。",
      icon: "ri-loader-4-line",
    }
  }

  if (searchQuery.value.trim()) {
    return {
      title: "没有匹配的分类",
      description: "换个关键词试试。",
      icon: "ri-search-line",
    }
  }

  return {
    title: "还没有检测项分类",
    description: "接口返回为空时，会在这里显示空状态。",
    icon: "ri-table-line",
  }
})

onMounted(() => {
  void loadInspectionCategories()
})

async function loadInspectionCategories() {
  loading.value = true
  errorMessage.value = ""

  try {
    const result = await fetchInspectionCategories()
    rows.value = result.list.map((item, index) => normalizeInspectionCategory(item, index))
  } catch (error) {
    errorMessage.value = handleApiError(error, {
      title: "检测项分类接口加载失败",
      fallback: INSPECTION_CATEGORIES_LOAD_ERROR_MESSAGE,
      mode: "silent",
    })
  } finally {
    loading.value = false
  }
}

function normalizeInspectionCategory(item: InspectionCategoryRecord, index: number): InspectionCategoryRow {
  const id = Number.isFinite(Number(item.Id)) ? Number(item.Id) : index + 1

  return {
    id,
    uuid: toText(item.Uuid, `category-${id}`),
    name: toText(item.Name, `分类 ${id}`),
  }
}

function toText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback
}
</script>

<template>
  <section class="space-y-4">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="text-sm text-muted-foreground">
        共 {{ rows.length }} 个分类
      </div>

      <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          v-model="searchQuery"
          placeholder="搜索分类名称、ID 或 Uuid"
          class="h-9 w-full min-w-[240px] bg-background sm:w-[280px]"
        />
        <Button
          variant="outline"
          class="h-9"
          :disabled="loading"
          @click="loadInspectionCategories"
        >
          <i :class="loading ? 'ri-loader-4-line animate-spin' : 'ri-refresh-line'" />
          刷新
        </Button>
      </div>
    </div>

    <Alert
      v-if="errorMessage"
      variant="destructive"
      class="border-destructive/20 bg-destructive/[0.03]"
    >
      <i class="ri-error-warning-line text-base" />
      <AlertTitle>分类列表加载失败</AlertTitle>
      <AlertDescription>{{ errorMessage }}</AlertDescription>
    </Alert>

    <TablePageTable
      row-key="uuid"
      :columns="columns"
      :rows="filteredRows"
      :table-class="compactTableClass"
      :empty-state="tableEmptyState"
    />
  </section>
</template>
