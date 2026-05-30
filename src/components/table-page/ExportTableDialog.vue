<script setup lang="ts">
import { computed, ref, watch } from "vue"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SUPPORTED_TABLE_EXPORT_FORMATS, type TableExportFormat, type TableExportScope } from "@/components/table-page/export-utils"

const props = withDefaults(defineProps<{
  open: boolean
  tableTitle: string
  selectedRowsCount: number
  currentPageRowsCount: number
  filteredRowsCount: number
  totalRowsCount: number
  currentFiltersSummary: string[]
  isExporting: boolean
  availableFormats?: readonly TableExportFormat[]
}>(), {
  availableFormats: () => [...SUPPORTED_TABLE_EXPORT_FORMATS],
})

const emit = defineEmits<{
  "update:open": [open: boolean]
  confirm: [payload: { scope: TableExportScope; format: TableExportFormat }]
}>()

const exportScope = ref<TableExportScope>("filtered")
const exportFormat = ref<TableExportFormat>(props.availableFormats[0] ?? "xlsx")

const scopeOptions = computed(() => [
  {
    value: "selected" as const,
    title: "已选记录",
    count: props.selectedRowsCount,
    description: "仅导出当前勾选的数据。",
    disabled: props.selectedRowsCount === 0,
  },
  {
    value: "page" as const,
    title: "当前页",
    count: props.currentPageRowsCount,
    description: "仅导出当前表格页正在展示的数据。",
    disabled: props.currentPageRowsCount === 0,
  },
  {
    value: "filtered" as const,
    title: "当前筛选结果",
    count: props.filteredRowsCount,
    description: "导出当前查询、筛选与排序后的结果集合。",
    disabled: props.filteredRowsCount === 0,
  },
])
const currentScopeOption = computed(() => scopeOptions.value.find(option => option.value === exportScope.value) ?? scopeOptions.value[0])
const exportCount = computed(() => currentScopeOption.value?.count ?? 0)
const summaryPreview = computed(() => props.currentFiltersSummary.slice(0, 3))
const hiddenSummaryCount = computed(() => Math.max(0, props.currentFiltersSummary.length - summaryPreview.value.length))
const filtersInlineText = computed(() => {
  if (!summaryPreview.value.length) {
    return "当前表格结果"
  }

  const baseText = summaryPreview.value.join(" · ")
  return hiddenSummaryCount.value > 0 ? `${baseText} 等 ${props.currentFiltersSummary.length} 项` : baseText
})
const canConfirm = computed(() => !props.isExporting && exportCount.value > 0)
const showEmptyAlert = computed(() => exportCount.value === 0)
const formatOptions = computed(() => SUPPORTED_TABLE_EXPORT_FORMATS.map(format => ({
  value: format,
  label: format.toUpperCase(),
  disabled: !props.availableFormats.includes(format),
})))
const emptyStateMessage = computed(() => {
  if (exportScope.value === "selected") {
    return "当前没有已选记录，请先勾选后再导出。"
  }

  if (exportScope.value === "page") {
    return "当前页没有可导出的记录。"
  }

  return "当前筛选结果为空，请调整筛选条件后重试。"
})
const exportRangeText = computed(() => {
  if (exportScope.value === "selected") {
    return "当前勾选记录"
  }

  if (exportScope.value === "page") {
    return "当前页记录"
  }

  return props.currentFiltersSummary.length > 0 ? "当前筛选结果" : "当前全部表格数据"
})
const totalRowsText = computed(() => {
  if (props.totalRowsCount <= 0) {
    return "暂无原始记录。"
  }

  if (props.currentFiltersSummary.length > 0 && props.filteredRowsCount !== props.totalRowsCount) {
    return `当前条件命中 ${props.filteredRowsCount} 条，表格总计 ${props.totalRowsCount} 条。`
  }

  return `表格总计 ${props.totalRowsCount} 条。`
})

watch(() => props.open, (isOpen) => {
  if (!isOpen) {
    return
  }

  exportScope.value = getDefaultScope()
  exportFormat.value = props.availableFormats[0] ?? "xlsx"
})

watch(scopeOptions, (options) => {
  const activeOption = options.find(option => option.value === exportScope.value)

  if (!activeOption || activeOption.disabled) {
    exportScope.value = options.find(option => !option.disabled)?.value ?? "filtered"
  }
})

watch(formatOptions, (options) => {
  const activeOption = options.find(option => option.value === exportFormat.value)

  if (!activeOption || activeOption.disabled) {
    exportFormat.value = options.find(option => !option.disabled)?.value ?? "xlsx"
  }
})

function getDefaultScope(): TableExportScope {
  if (props.selectedRowsCount > 0) {
    return "selected"
  }

  return "filtered"
}

function updateOpen(nextOpen: boolean) {
  if (props.isExporting && !nextOpen) {
    return
  }

  emit("update:open", nextOpen)
}

function handleScopeSelect(nextScope: TableExportScope) {
  const nextOption = scopeOptions.value.find(option => option.value === nextScope)

  if (!nextOption || nextOption.disabled) {
    return
  }

  exportScope.value = nextScope
}

function handleScopeChange(nextScope: string | number) {
  if (nextScope !== "selected" && nextScope !== "page" && nextScope !== "filtered") {
    return
  }

  handleScopeSelect(nextScope)
}

function handleFormatChange(nextFormat: string | number) {
  if (nextFormat !== "csv" && nextFormat !== "xlsx") {
    return
  }

  const nextOption = formatOptions.value.find(option => option.value === nextFormat)

  if (!nextOption || nextOption.disabled) {
    return
  }

  exportFormat.value = nextFormat
}

function handleConfirm() {
  if (!canConfirm.value) {
    return
  }

  emit("confirm", {
    scope: exportScope.value,
    format: exportFormat.value,
  })
}
</script>

<template>
  <Dialog :open="open" @update:open="updateOpen">
    <DialogContent
      class="max-w-[min(96vw,52rem)] gap-0 overflow-hidden p-0"
      :show-close-button="!isExporting"
    >
      <DialogHeader class="px-4 pt-4 pb-0">
        <DialogTitle>导出{{ tableTitle }}</DialogTitle>
        <DialogDescription>
          选择导出范围和文件格式后生成下载文件。
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4 px-4 pt-4 pb-0">
        <div class="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 sm:flex-nowrap">
          <section class="min-w-fit flex-none space-y-2">
            <Label class="text-sm font-medium text-foreground">导出范围</Label>
            <Tabs :model-value="exportScope" class="w-fit" @update:model-value="handleScopeChange">
              <TabsList class="grid h-auto w-full grid-cols-1 justify-start gap-1 rounded-md bg-muted p-1 sm:w-fit sm:grid-cols-3">
                <TabsTrigger
                  v-for="option in scopeOptions"
                  :key="option.value"
                  :value="option.value"
                  :disabled="option.disabled"
                  class="h-7 min-w-[112px] gap-1.5 rounded-[calc(var(--radius)_-_6px)] px-3 text-[13px] font-medium data-[state=active]:shadow-sm"
                >
                  <span>{{ option.title }}</span>
                  <span class="text-[11px] font-normal text-muted-foreground">{{ option.count }}</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <p class="text-[12px] leading-5 text-muted-foreground">
              {{ currentScopeOption?.description }}
            </p>
          </section>

          <section class="min-w-fit flex-none space-y-2">
            <Label class="text-sm font-medium text-foreground">文件格式</Label>

            <Tabs :model-value="exportFormat" class="w-fit" @update:model-value="handleFormatChange">
              <TabsList class="grid h-auto w-full grid-cols-2 justify-start gap-1 rounded-md bg-muted p-1 sm:w-fit">
                <TabsTrigger
                  v-for="format in formatOptions"
                  :key="format.value"
                  :value="format.value"
                  :disabled="format.disabled"
                  class="h-7 min-w-[96px] gap-1.5 rounded-[calc(var(--radius)_-_6px)] px-3 text-[13px] font-medium data-[state=active]:shadow-sm"
                >
                  <span>{{ format.label }}</span>
                  <span
                    v-if="format.disabled"
                    class="text-[11px] font-normal text-muted-foreground"
                  >
                    未开放
                  </span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </section>
        </div>

        <section class="space-y-1.5 rounded-md bg-muted px-4 py-3">
          <p class="text-[13px] leading-5 text-muted-foreground">
            <span class="font-medium text-foreground">数据范围：</span>
            当前页 {{ currentPageRowsCount }} 条。{{ totalRowsText }}
          </p>

          <p class="text-[13px] leading-5 text-muted-foreground">
            <span class="font-medium text-foreground">导出摘要：</span>
            预计导出 {{ exportCount }} 条记录，范围为{{ exportRangeText }}。
          </p>

          <p
            class="truncate text-[13px] leading-5 text-muted-foreground"
            :title="summaryPreview.length ? filtersInlineText : '当前没有额外筛选条件，将按当前表格结果导出。'"
          >
            <span class="font-medium text-foreground">当前筛选：</span>
            {{ summaryPreview.length ? filtersInlineText : "当前没有额外筛选条件，将按当前表格结果导出。" }}
          </p>

          <Alert
            v-if="showEmptyAlert"
            class="border-amber-500/20 bg-amber-500/8 text-amber-950 dark:text-amber-100"
          >
            <AlertDescription class="text-[13px] leading-5">
              {{ emptyStateMessage }}
            </AlertDescription>
          </Alert>
        </section>
      </div>

      <DialogFooter class="p-4 sm:justify-end">
        <Button
          variant="outline"
          class="h-9 px-4"
          :disabled="isExporting"
          @click="updateOpen(false)"
        >
          取消
        </Button>
        <Button
          class="h-9 px-4"
          :disabled="!canConfirm"
          @click="handleConfirm"
        >
          <Spinner v-if="isExporting" class="size-4" label="导出中" />
          {{ isExporting ? "导出中..." : "开始导出" }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
