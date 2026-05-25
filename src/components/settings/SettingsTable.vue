<script setup lang="ts">
import { useSlots } from "vue"

import { SETTINGS_TABLE_PAGE_CLASS } from "@/components/settings/settingsTablePageClass"
import TablePageTable from "@/components/table-page/TablePageTable.vue"
import type { TableColumn, TablePageEmptyState, TableRowAction } from "@/components/table-page/types"
import { cn } from "@/lib/utils"

type SettingsTableRow = Record<string, unknown>
type SettingsTableRowKey = string | ((row: SettingsTableRow, index: number) => string | number)

const props = withDefaults(defineProps<{
  columns: TableColumn[]
  rows: SettingsTableRow[]
  rowKey: SettingsTableRowKey
  rowActions?: TableRowAction[]
  onRowClick?: (row: SettingsTableRow, index: number) => void
  onQuickAction?: (row: SettingsTableRow, index: number) => void
  selectedRowKeys?: Array<string | number>
  summary?: string
  wrapperClass?: string
  tableClass?: string
  emptyState?: TablePageEmptyState
  loading?: boolean
  loadingRowCount?: number
}>(), {
  rowActions: () => [],
  onRowClick: undefined,
  onQuickAction: undefined,
  selectedRowKeys: undefined,
  summary: "",
  wrapperClass: "",
  tableClass: "",
  emptyState: undefined,
  loading: false,
  loadingRowCount: 8,
})

const emit = defineEmits<{
  "update:selected-row-keys": [keys: Array<string | number>]
}>()

const slots = useSlots()
</script>

<template>
  <TablePageTable
    show-index
    sticky-header
    :show-index-checkbox="false"
    :edge-gutter="false"
    :show-row-action-icons="true"
    :pin-row-actions="true"
    :columns="props.columns"
    :rows="props.rows"
    :row-key="props.rowKey"
    :row-actions="props.rowActions"
    :on-row-click="props.onRowClick"
    :on-quick-action="props.onQuickAction"
    :selected-row-keys="props.selectedRowKeys"
    :summary="props.summary"
    :wrapper-class="props.wrapperClass"
    :table-class="cn(SETTINGS_TABLE_PAGE_CLASS, props.tableClass)"
    :empty-state="props.emptyState"
    :loading="props.loading"
    :loading-row-count="props.loadingRowCount"
    @update:selected-row-keys="emit('update:selected-row-keys', $event)"
  >
    <template
      v-for="(_, name) in slots"
      :key="name"
      #[name]="slotProps"
    >
      <slot :name="name" v-bind="slotProps" />
    </template>
  </TablePageTable>
</template>
