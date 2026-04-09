<script setup lang="ts">
import type { PropType } from "vue"
import { useSlots } from "vue"

import Page from "@/components/table-page/TablePageShell.vue"
import type { TablePageController } from "@/components/table-page/useTablePage"

const props = defineProps({
  page: {
    type: Object as PropType<TablePageController<any>>,
    required: true,
  },
  showToolbarActions: {
    type: Boolean,
    default: true,
  },
  /** 兼容旧调用保留；公共表格已统一结构，不再影响左右布局。 */
  listLevelTable: {
    type: Boolean,
    default: true,
  },
  fillAvailableHeight: {
    type: Boolean,
    default: false,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  loadingRowCount: {
    type: Number,
    default: 8,
  },
})

const emit = defineEmits<{
  "update:selected-row-keys": [keys: Array<string | number>]
  "export-action": []
  "primary-action": []
}>()

const slots = useSlots()
</script>

<template>
  <Page
    :title="page.title"
    :description="page.description"
    :tabs="page.tabs.value"
    :fields="page.fields.value"
    :available-filters="page.availableFilterKeys.value"
    :show-controls="page.showControls.value"
    :custom-sort-enabled="page.customSortEnabled.value"
    :sort-rules="page.sortRules.value"
    :sort-field-options="page.sortFieldOptions.value"
    :primary-action-label="page.primaryActionLabel"
    :text-filters="page.textFilters.value"
    :number-filters="page.numberFilters.value"
    :tag-filters="page.tagFilters.value"
    :tag-filter-options="page.tagFilterOptions.value"
    :date-filters="page.dateFilters.value"
    :date-filter-fields="page.dateFilterFields.value"
    :columns="page.columns"
    :row-actions="page.rowActions"
    :on-row-click="page.onRowClick"
    :on-quick-action="page.onQuickAction"
    :rows="page.visibleRows.value"
    :filtered-rows="page.filteredRows.value"
    :selected-rows="page.selectedRows.value"
    :row-key="page.rowKey"
    :selected-row-keys="page.selectedRowKeys.value"
    :selected-rows-count="page.selectedRowsCount.value"
    :filtered-rows-count="page.filteredRowsCount.value"
    :total-rows-count="page.totalRowsCount.value"
    :current-filters-summary="page.activeFilterSummary.value"
    :summary="page.summary"
    :show-index="page.showIndex"
    :sticky-header="page.stickyHeader"
    :wrapper-class="page.wrapperClass"
    :table-class="page.tableClass"
    :empty-state="page.emptyState"
    :show-toolbar-actions="props.showToolbarActions"
    :list-level-table="props.listLevelTable"
    :fill-available-height="props.fillAvailableHeight"
    :loading="props.loading"
    :loading-row-count="props.loadingRowCount"
    @tab-click="page.handleTabClick"
    @add-filter="page.handleAddFilter"
    @replace-filter="page.handleReplaceFilter"
    @remove-filter="page.handleRemoveFilter"
    @clear-all-filters="page.clearAllFilters"
    @set-custom-sort-enabled="page.customSortEnabled.value = $event"
    @update-sort-rules="page.sortRules.value = $event"
    @toggle-controls="page.showControls.value = !page.showControls.value"
    @update-text-filter="page.updateTextFilter($event.label, $event.value)"
    @update-number-filter="page.updateNumberFilter($event.label, $event.value)"
    @update-tag-filter="page.updateTagFilter($event.label, $event.value)"
    @update-date-filter="page.updateDateFilter($event.label, $event.value)"
    @update:selected-row-keys="page.selectedRowKeys.value = $event; emit('update:selected-row-keys', $event)"
    @export-action="emit('export-action')"
    @primary-action="emit('primary-action')"
  >
    <template
      v-for="(_, name) in slots"
      :key="name"
      #[name]="slotProps"
    >
      <slot :name="name" v-bind="slotProps" />
    </template>
  </Page>
</template>
