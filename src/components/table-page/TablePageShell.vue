<script setup lang="ts">
import { useSlots } from "vue"

import Header from "@/components/table-page/TablePageHeader.vue"
import Table from "@/components/table-page/TablePageTable.vue"
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

const props = defineProps<{
  title: string
  count: number
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
  rows: Record<string, unknown>[]
  rowKey: string | ((row: Record<string, unknown>, index: number) => string | number)
  summary?: string
  showIndex?: boolean
  stickyHeader?: boolean
  wrapperClass?: string
  tableClass?: string
  sections?: TableSection[]
  emptyState?: TablePageEmptyState
}>()

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
  "export-action": []
  "primary-action": []
}>()

const slots = useSlots()
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
          :count="props.count"
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
          @export-action="emit('export-action')"
          @primary-action="emit('primary-action')"
        />

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
                :summary="section.summary"
                :show-index="section.showIndex ?? props.showIndex"
                :sticky-header="section.stickyHeader ?? props.stickyHeader"
                :wrapper-class="section.wrapperClass ?? props.wrapperClass"
                :table-class="section.tableClass ?? props.tableClass"
                :empty-state="props.emptyState"
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
              :rows="props.rows"
              :row-key="props.rowKey"
              :summary="props.summary"
              :show-index="props.showIndex"
              :sticky-header="props.stickyHeader"
              :wrapper-class="props.wrapperClass"
              :table-class="props.tableClass"
              :empty-state="props.emptyState"
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
  </section>
</template>
