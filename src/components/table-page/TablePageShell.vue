<script setup lang="ts">
import { computed, nextTick, ref, useSlots } from "vue"
import { toast } from "vue-sonner"

import ExportTableDialog from "@/components/table-page/ExportTableDialog.vue"
import Header from "@/components/table-page/TablePageHeader.vue"
import Table from "@/components/table-page/TablePageTable.vue"
import {
  exportTableData,
  SUPPORTED_TABLE_EXPORT_FORMATS,
  type TableExportFormat,
  type TableExportScope,
} from "@/components/table-page/export-utils"
import type { SortFieldOption, SortRule } from "@/components/table-page/TableSortPopover.vue"
import type {
  DateFilterState,
  HeaderField,
  HeaderTab,
  NumberFilterState,
  TablePageEmptyState,
  TableColumn,
  TableRowAction,
  TableSection,
  TagFilterState,
  TextFilterState,
} from "@/components/table-page/types"
import { handleApiError } from "@/lib/api-errors"

const props = withDefaults(defineProps<{
  title: string
  description?: string
  tabs: HeaderTab[]
  fields: HeaderField[]
  availableFilters: string[]
  showControls: boolean
  customSortEnabled: boolean
  sortRules: SortRule[]
  sortFieldOptions?: SortFieldOption[]
  primaryActionLabel?: string
  textFilters: Record<string, TextFilterState>
  numberFilters: Record<string, NumberFilterState>
  tagFilters: Record<string, TagFilterState>
  tagFilterOptions: Record<string, string[]>
  dateFilters: Record<string, DateFilterState>
  dateFilterFields: string[]
  columns: TableColumn[]
  rowActions?: TableRowAction[]
  onRowClick?: (row: Record<string, unknown>, index: number) => void
  onQuickAction?: (row: Record<string, unknown>, index: number) => void
  rows: Record<string, unknown>[]
  filteredRows?: Record<string, unknown>[]
  selectedRows?: Record<string, unknown>[]
  rowKey: string | ((row: Record<string, unknown>, index: number) => string | number)
  selectedRowKeys?: Array<string | number>
  selectedRowsCount?: number
  filteredRowsCount?: number
  totalRowsCount?: number
  currentFiltersSummary?: string[]
  summary?: string
  showIndex?: boolean
  stickyHeader?: boolean
  wrapperClass?: string
  tableClass?: string
  sections?: TableSection[]
  emptyState?: TablePageEmptyState
  showToolbarActions?: boolean
  /** 兼容旧调用保留；公共表格已统一结构，不再影响左右布局。 */
  listLevelTable?: boolean
}>(), {
  showToolbarActions: true,
  listLevelTable: false,
})

const emit = defineEmits<{
  "tab-click": [tab: HeaderTab]
  "add-filter": [key: string]
  "replace-filter": [payload: { from: string; to: string; value?: DateFilterState }]
  "remove-filter": [key: string]
  "clear-all-filters": []
  "set-custom-sort-enabled": [enabled: boolean]
  "update-sort-rules": [rules: SortRule[]]
  "toggle-controls": []
  "update-text-filter": [payload: { label: string; value: TextFilterState }]
  "update-number-filter": [payload: { label: string; value: NumberFilterState }]
  "update-tag-filter": [payload: { label: string; value: TagFilterState }]
  "update-date-filter": [payload: { label: string; value: DateFilterState }]
  "update:selected-row-keys": [keys: Array<string | number>]
  "export-action": []
  "primary-action": []
}>()

const slots = useSlots()
const exportDialogOpen = ref(false)
const isExporting = ref(false)
const availableExportFormats = [...SUPPORTED_TABLE_EXPORT_FORMATS]
const currentPageRowsCount = computed(() => props.rows.length)

function handleOpenExportDialog() {
  exportDialogOpen.value = true
  emit("export-action")
}

function resolveExportRows(scope: TableExportScope) {
  if (scope === "selected") {
    return props.selectedRows ?? []
  }

  if (scope === "page") {
    return props.rows
  }

  return props.filteredRows ?? props.rows
}

function getExportEmptyMessage(scope: TableExportScope) {
  if (scope === "selected") {
    return "当前没有已选记录，请先勾选后再导出。"
  }

  if (scope === "page") {
    return "当前页没有可导出的记录。"
  }

  return "当前筛选结果为空，请调整筛选条件后重试。"
}

async function handleExportConfirm(payload: { scope: TableExportScope; format: TableExportFormat }) {
  if (isExporting.value) {
    return
  }

  const exportRows = resolveExportRows(payload.scope)

  if (!exportRows.length) {
    toast.error(getExportEmptyMessage(payload.scope))
    return
  }

  isExporting.value = true

  try {
    await nextTick()
    exportTableData({
      title: props.title,
      columns: props.columns,
      rows: exportRows,
      format: payload.format,
    })
    toast.success(`已导出 ${exportRows.length} 条记录`)
    exportDialogOpen.value = false
  }
  catch (error) {
    handleApiError(error, {
      title: "导出失败",
      fallback: "导出失败，请稍后重试。",
    })
  }
  finally {
    isExporting.value = false
  }
}
</script>

<template>
  <section
    class="-mx-4 flex min-h-0 min-w-0 flex-1 flex-col bg-background"
    style="--table-page-sticky-top: -1rem;"
  >
    <div class="flex min-h-0 min-w-0 flex-1 flex-col pb-3 pt-3">
      <div class="flex min-h-0 min-w-0 flex-1 flex-col">
        <Header
          class="min-w-0 w-full"
          :title="props.title"
          :description="props.description"
          :tabs="props.tabs"
          :fields="props.fields"
          :available-filters="props.availableFilters"
          :show-controls="props.showControls"
          :custom-sort-enabled="props.customSortEnabled"
          :sort-rules="props.sortRules"
          :sort-field-options="props.sortFieldOptions"
          :primary-action-label="props.primaryActionLabel"
          :text-filters="props.textFilters"
          :number-filters="props.numberFilters"
          :tag-filters="props.tagFilters"
          :tag-filter-options="props.tagFilterOptions"
          :date-filters="props.dateFilters"
          :date-filter-fields="props.dateFilterFields"
          :show-toolbar-actions="props.showToolbarActions"
          @tab-click="emit('tab-click', $event)"
          @add-filter="emit('add-filter', $event)"
          @replace-filter="emit('replace-filter', $event)"
          @remove-filter="emit('remove-filter', $event)"
          @clear-all-filters="emit('clear-all-filters')"
          @set-custom-sort-enabled="emit('set-custom-sort-enabled', $event)"
          @update-sort-rules="emit('update-sort-rules', $event)"
          @toggle-controls="emit('toggle-controls')"
          @update-text-filter="emit('update-text-filter', $event)"
          @update-number-filter="emit('update-number-filter', $event)"
          @update-tag-filter="emit('update-tag-filter', $event)"
          @update-date-filter="emit('update-date-filter', $event)"
          @export-action="handleOpenExportDialog"
          @primary-action="emit('primary-action')"
        >
          <template v-if="slots['controls-prefix']" #controls-prefix>
            <slot name="controls-prefix" />
          </template>
        </Header>

        <div class="min-h-0 min-w-0 flex-1">
          <div class="min-h-0 min-w-0 w-full overflow-visible">
            <template v-if="props.sections?.length">
              <Table
                v-for="section in props.sections"
                :key="section.key"
                :columns="section.columns"
                :rows="section.rows"
                :row-key="section.rowKey"
                :row-actions="section.rowActions ?? props.rowActions"
                :on-row-click="section.onRowClick ?? props.onRowClick"
                :on-quick-action="section.onQuickAction ?? props.onQuickAction"
                :selected-row-keys="props.selectedRowKeys"
                :summary="section.summary"
                :show-index="section.showIndex ?? props.showIndex"
                :sticky-header="section.stickyHeader ?? props.stickyHeader"
                :wrapper-class="section.wrapperClass ?? props.wrapperClass"
                :table-class="section.tableClass ?? props.tableClass"
                :empty-state="props.emptyState"
                :list-level-table="props.listLevelTable"
                @update:selected-row-keys="emit('update:selected-row-keys', $event)"
              >
                <template
                  v-for="(_, name) in slots"
                  :key="name"
                  #[name]="slotProps"
                >
                  <slot :name="name" v-bind="slotProps" />
                </template>
              </Table>
            </template>
            <Table
              v-else
              :columns="props.columns"
              :row-actions="props.rowActions"
              :on-row-click="props.onRowClick"
              :on-quick-action="props.onQuickAction"
              :rows="props.rows"
              :row-key="props.rowKey"
              :selected-row-keys="props.selectedRowKeys"
              :summary="props.summary"
              :show-index="props.showIndex"
              :sticky-header="props.stickyHeader"
              :wrapper-class="props.wrapperClass"
              :table-class="props.tableClass"
              :empty-state="props.emptyState"
              :list-level-table="props.listLevelTable"
              @update:selected-row-keys="emit('update:selected-row-keys', $event)"
            >
              <template
                v-for="(_, name) in slots"
                :key="name"
                #[name]="slotProps"
              >
                <slot :name="name" v-bind="slotProps" />
              </template>
            </Table>
          </div>
        </div>
      </div>
    </div>

    <ExportTableDialog
      :open="exportDialogOpen"
      :table-title="props.title"
      :selected-rows-count="props.selectedRowsCount ?? 0"
      :current-page-rows-count="currentPageRowsCount"
      :filtered-rows-count="props.filteredRowsCount ?? props.rows.length"
      :total-rows-count="props.totalRowsCount ?? props.rows.length"
      :current-filters-summary="props.currentFiltersSummary ?? []"
      :available-formats="availableExportFormats"
      :is-exporting="isExporting"
      @update:open="exportDialogOpen = $event"
      @confirm="handleExportConfirm"
    />
  </section>
</template>
