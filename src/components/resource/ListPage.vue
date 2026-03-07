<script setup lang="ts">
import { useSlots } from "vue"

import ListHeader from "@/components/resource/ListHeader.vue"
import ListTable from "@/components/resource/ListTable.vue"
import type { SortFieldOption, SortRule } from "@/components/resource/SortPopover.vue"
import type {
  DateFilterState,
  HeaderField,
  HeaderTab,
  NumberFilterState,
  TableColumn,
  TableSection,
  TagFilterState,
  TextFilterState,
} from "@/components/resource/types"

defineProps<{
  title: string
  count: number
  tabs: HeaderTab[]
  fields: HeaderField[]
  availableFilters: string[]
  showControls: boolean
  customSortEnabled: boolean
  sortRules: SortRule[]
  sortFieldOptions?: SortFieldOption[]
  searchQuery: string
  primaryActionLabel?: string
  textFilters: Record<string, TextFilterState>
  numberFilters: Record<string, NumberFilterState>
  tagFilters: Record<string, TagFilterState>
  tagFilterOptions: Record<string, string[]>
  dateFilters: Record<string, DateFilterState>
  dateFilterFields: string[]
  columns: TableColumn[]
  rows: Record<string, unknown>[]
  rowKey: string | ((row: Record<string, unknown>, index: number) => string | number)
  summary?: string
  showIndex?: boolean
  stickyHeader?: boolean
  wrapperClass?: string
  tableClass?: string
  sections?: TableSection[]
}>()

const emit = defineEmits<{
  "tab-click": [tab: HeaderTab]
  "add-filter": [key: string]
  "replace-filter": [payload: { from: string; to: string; value?: DateFilterState }]
  "remove-filter": [key: string]
  "set-custom-sort-enabled": [enabled: boolean]
  "update-sort-rules": [rules: SortRule[]]
  "toggle-controls": []
  "update-search-query": [query: string]
  "update-text-filter": [payload: { label: string; value: TextFilterState }]
  "update-number-filter": [payload: { label: string; value: NumberFilterState }]
  "update-tag-filter": [payload: { label: string; value: TagFilterState }]
  "update-date-filter": [payload: { label: string; value: DateFilterState }]
  "primary-action": []
}>()

const slots = useSlots()
</script>

<template>
  <section class="-mx-4 flex min-h-0 flex-1 flex-col bg-white">
    <div class="flex min-h-0 flex-1 flex-col pb-3 pt-3">
      <div class="flex min-h-0 flex-1 flex-col">
        <ListHeader
          :title="title"
          :count="count"
          :tabs="tabs"
          :fields="fields"
          :available-filters="availableFilters"
          :show-controls="showControls"
          :custom-sort-enabled="customSortEnabled"
          :sort-rules="sortRules"
          :sort-field-options="sortFieldOptions"
          :search-query="searchQuery"
          :primary-action-label="primaryActionLabel"
          :text-filters="textFilters"
          :number-filters="numberFilters"
          :tag-filters="tagFilters"
          :tag-filter-options="tagFilterOptions"
          :date-filters="dateFilters"
          :date-filter-fields="dateFilterFields"
          @tab-click="emit('tab-click', $event)"
          @add-filter="emit('add-filter', $event)"
          @replace-filter="emit('replace-filter', $event)"
          @remove-filter="emit('remove-filter', $event)"
          @set-custom-sort-enabled="emit('set-custom-sort-enabled', $event)"
          @update-sort-rules="emit('update-sort-rules', $event)"
          @toggle-controls="emit('toggle-controls')"
          @update-search-query="emit('update-search-query', $event)"
          @update-text-filter="emit('update-text-filter', $event)"
          @update-number-filter="emit('update-number-filter', $event)"
          @update-tag-filter="emit('update-tag-filter', $event)"
          @update-date-filter="emit('update-date-filter', $event)"
          @primary-action="emit('primary-action')"
        />

        <div class="min-h-0 flex-1">
          <div class="inline-block min-w-full pr-8 align-top">
            <template v-if="sections?.length">
              <ListTable
                v-for="section in sections"
                :key="section.key"
                :columns="section.columns"
                :rows="section.rows"
                :row-key="section.rowKey"
                :summary="section.summary"
                :show-index="section.showIndex ?? showIndex"
                :sticky-header="section.stickyHeader ?? stickyHeader"
                :wrapper-class="section.wrapperClass ?? wrapperClass"
                :table-class="section.tableClass ?? tableClass"
                v-slots="slots"
              />
            </template>
            <ListTable
              v-else
              :columns="columns"
              :rows="rows"
              :row-key="rowKey"
              :summary="summary"
              :show-index="showIndex"
              :sticky-header="stickyHeader"
              :wrapper-class="wrapperClass"
              :table-class="tableClass"
              v-slots="slots"
            />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
