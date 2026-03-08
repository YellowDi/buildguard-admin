<script setup lang="ts">
import type { PropType } from "vue"

import Page from "@/components/resource/Page.vue"
import type { ResourceListController } from "@/components/resource/useResourceList"

defineProps({
  page: {
    type: Object as PropType<ResourceListController<any>>,
    required: true,
  },
})

const emit = defineEmits<{
  "primary-action": []
}>()
</script>

<template>
  <Page
    :title="page.title"
    :count="page.visibleRows.value.length"
    :tabs="page.tabs.value"
    :fields="page.fields.value"
    :available-filters="page.availableFilterKeys.value"
    :show-controls="page.showControls.value"
    :custom-sort-enabled="page.customSortEnabled.value"
    :sort-rules="page.sortRules.value"
    :sort-field-options="page.sortFieldOptions.value"
    :search-query="page.searchQuery.value"
    :primary-action-label="page.primaryActionLabel"
    :text-filters="page.textFilters.value"
    :number-filters="page.numberFilters.value"
    :tag-filters="page.tagFilters.value"
    :tag-filter-options="page.tagFilterOptions.value"
    :date-filters="page.dateFilters.value"
    :date-filter-fields="page.dateFilterFields.value"
    :columns="page.columns"
    :row-actions="page.rowActions"
    :rows="page.visibleRows.value"
    :row-key="page.rowKey"
    :summary="page.summary"
    :show-index="page.showIndex"
    :sticky-header="page.stickyHeader"
    :wrapper-class="page.wrapperClass"
    :table-class="page.tableClass"
    @tab-click="page.handleTabClick"
    @add-filter="page.handleAddFilter"
    @replace-filter="page.handleReplaceFilter"
    @remove-filter="page.handleRemoveFilter"
    @set-custom-sort-enabled="page.customSortEnabled.value = $event"
    @update-sort-rules="page.sortRules.value = $event"
    @toggle-controls="page.showControls.value = !page.showControls.value"
    @update-search-query="page.searchQuery.value = $event"
    @update-text-filter="page.updateTextFilter($event.label, $event.value)"
    @update-number-filter="page.updateNumberFilter($event.label, $event.value)"
    @update-tag-filter="page.updateTagFilter($event.label, $event.value)"
    @update-date-filter="page.updateDateFilter($event.label, $event.value)"
    @primary-action="emit('primary-action')"
  />
</template>
