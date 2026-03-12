<script setup lang="ts">
import { computed, type PropType } from "vue"

import Page from "@/components/table-page/TablePageShell.vue"
import type { HeaderTab } from "@/components/table-page/types"
import type { TablePageController } from "@/components/table-page/useTablePage"

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  tabs: {
    type: Array as PropType<HeaderTab[]>,
    required: true,
  },
  activePage: {
    type: Object as PropType<TablePageController<any>>,
    required: true,
  },
})

const emit = defineEmits<{
  "tab-click": [tab: HeaderTab]
  "update:selected-row-keys": [keys: Array<string | number>]
  "export-action": []
  "primary-action": []
}>()

const activeCount = computed(() => props.activePage.visibleRows.value.length)
</script>

<template>
  <Page
    :title="title"
    :count="activeCount"
    :tabs="tabs"
    :fields="activePage.fields.value"
    :available-filters="activePage.availableFilterKeys.value"
    :show-controls="activePage.showControls.value"
    :custom-sort-enabled="activePage.customSortEnabled.value"
    :sort-rules="activePage.sortRules.value"
    :sort-field-options="activePage.sortFieldOptions.value"
    :primary-action-label="activePage.primaryActionLabel"
    :text-filters="activePage.textFilters.value"
    :number-filters="activePage.numberFilters.value"
    :tag-filters="activePage.tagFilters.value"
    :tag-filter-options="activePage.tagFilterOptions.value"
    :date-filters="activePage.dateFilters.value"
    :date-filter-fields="activePage.dateFilterFields.value"
    :columns="activePage.columns"
    :row-actions="activePage.rowActions"
    :rows="activePage.visibleRows.value"
    :filtered-rows="activePage.filteredRows.value"
    :selected-rows="activePage.selectedRows.value"
    :row-key="activePage.rowKey"
    :selected-row-keys="activePage.selectedRowKeys.value"
    :selected-rows-count="activePage.selectedRowsCount.value"
    :filtered-rows-count="activePage.filteredRowsCount.value"
    :total-rows-count="activePage.totalRowsCount.value"
    :current-filters-summary="activePage.activeFilterSummary.value"
    :summary="activePage.summary"
    :show-index="activePage.showIndex"
    :sticky-header="activePage.stickyHeader"
    :wrapper-class="activePage.wrapperClass"
    :table-class="activePage.tableClass"
    @tab-click="emit('tab-click', $event)"
    @add-filter="activePage.handleAddFilter"
    @replace-filter="activePage.handleReplaceFilter"
    @remove-filter="activePage.handleRemoveFilter"
    @clear-all-filters="activePage.clearAllFilters"
    @set-custom-sort-enabled="activePage.customSortEnabled.value = $event"
    @update-sort-rules="activePage.sortRules.value = $event"
    @toggle-controls="activePage.showControls.value = !activePage.showControls.value"
    @update-text-filter="activePage.updateTextFilter($event.label, $event.value)"
    @update-number-filter="activePage.updateNumberFilter($event.label, $event.value)"
    @update-tag-filter="activePage.updateTagFilter($event.label, $event.value)"
    @update-date-filter="activePage.updateDateFilter($event.label, $event.value)"
    @update:selected-row-keys="activePage.selectedRowKeys.value = $event; emit('update:selected-row-keys', $event)"
    @export-action="emit('export-action')"
    @primary-action="emit('primary-action')"
  />
</template>
