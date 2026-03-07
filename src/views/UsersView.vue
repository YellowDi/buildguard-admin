<script setup lang="ts">
import usersData from "@/data/users.json"
import ListPage from "@/components/resource/ListPage.vue"
import type { SortFieldOption } from "@/components/resource/SortPopover.vue"
import type {
  DateFilterState,
  NumberFilterState,
  TableColumn,
  TagFilterState,
  TextFilterState,
} from "@/components/resource/types"
import { useListController } from "@/components/resource/useListController"
import type { ListPageConfig } from "@/components/resource/useListController"

type PractitionerRecord = {
  id: number
  name: string
  phone: string
  profileDisplay: string
  company: string
  role: string
  district: string
  certificateLevel: string
  experienceYears: number
  joinedAt: string
  status: string
  note: string
}

type RawPractitionerRecord = Omit<PractitionerRecord, "profileDisplay">

const ALL_PRACTITIONERS_TAB = "all"

const FIXED_FILTERS: Record<string, TextFilterState> = {
  "在页面中": { enabled: false, operator: "contains", query: "", placeholder: "输入页面内筛选条件" },
}

const INITIAL_TEXT_FILTERS: Record<string, TextFilterState> = {
  "从业人员": { enabled: false, operator: "contains", query: "", placeholder: "输入姓名或手机号" },
  "所属企业": { enabled: false, operator: "contains", query: "", placeholder: "输入企业名称" },
}

const INITIAL_NUMBER_FILTERS: Record<string, NumberFilterState> = {
  "从业年限": { enabled: false, operator: "equals", query: "", placeholder: "输入从业年限" },
}

const INITIAL_TAG_FILTERS: Record<string, TagFilterState> = {
  "岗位类型": { enabled: false, operator: "equals", values: [] },
  "行政区域": { enabled: false, operator: "equals", values: [] },
  "证件级别": { enabled: false, operator: "equals", values: [] },
  "状态": { enabled: false, operator: "equals", values: [] },
}

const INITIAL_DATE_FILTERS: Record<string, DateFilterState> = {
  "入职日期": { enabled: false, operator: "equals", preset: "custom", startDate: "", endDate: "" },
}

const practitionersSortFieldOptions: SortFieldOption[] = [
  { value: "name", label: "从业人员", kind: "text" },
  { value: "company", label: "所属企业", kind: "text" },
  { value: "role", label: "岗位类型", kind: "text" },
  { value: "district", label: "行政区域", kind: "text" },
  { value: "certificateLevel", label: "证件级别", kind: "text" },
  { value: "experienceYears", label: "从业年限", kind: "metric" },
  { value: "joinedAt", label: "入职日期", kind: "text" },
]

const practitionersColumns: TableColumn[] = [
  {
    key: "profileDisplay",
    label: "从业人员",
    filterType: "contact",
    cellRenderer: {
      kind: "dual-inline",
      primaryKey: "name",
      secondaryKey: "phone",
      primaryClass: "text-[#1F1F1F]",
      secondaryClass: "text-[#9A9A9A]",
    },
  },
  { key: "company", label: "所属企业", filterType: "text", cellClass: "font-medium text-[#1F1F1F]" },
  { key: "role", label: "岗位类型", filterType: "tag" },
  { key: "district", label: "行政区域", filterType: "tag" },
  { key: "certificateLevel", label: "证件级别", filterType: "tag" },
  {
    key: "experienceYears",
    label: "从业年限",
    filterType: "number",
    cellRenderer: {
      kind: "metric-unit",
      unit: "年",
      valueClass: "tabular-nums text-[#3559E0]",
      unitClass: "ml-1 text-[12px] text-[#9A9A9A]",
    },
  },
  { key: "joinedAt", label: "入职日期", filterType: "time", cellClass: "tabular-nums text-[#2F2F2F]" },
  { key: "status", label: "状态", filterType: "tag" },
  { key: "note", label: "备注", filterType: "none", headerClass: "w-full", cellClass: "w-full text-[#6E6E6E]", cellRenderer: { kind: "note" } },
]

const practitionersPageConfig: ListPageConfig<PractitionerRecord, string> = {
  title: "从业人员",
  columns: practitionersColumns,
  defaultVisibleFilterKeys: ["从业人员", "所属企业", "岗位类型", "状态"],
  fixedTextFilters: FIXED_FILTERS,
  textFilters: INITIAL_TEXT_FILTERS,
  numberFilters: INITIAL_NUMBER_FILTERS,
  tagFilters: INITIAL_TAG_FILTERS,
  dateFilters: INITIAL_DATE_FILTERS,
  tagFilterOptions: rows => ({
    "岗位类型": [...new Set(rows.map(row => row.role))],
    "行政区域": [...new Set(rows.map(row => row.district))],
    "证件级别": [...new Set(rows.map(row => row.certificateLevel))],
    "状态": [...new Set(rows.map(row => row.status))],
  }),
  initialSortRules: [{ id: "sort-experience-years", field: "experienceYears", direction: "desc" }],
  sortStorageKey: "practitioners-sort-preferences",
  sortFieldOptions: practitionersSortFieldOptions,
  defaultTab: ALL_PRACTITIONERS_TAB,
  buildTabs: (rows, selectedTab) => [
    {
      label: "全部",
      value: ALL_PRACTITIONERS_TAB,
      count: rows.length,
      active: selectedTab === ALL_PRACTITIONERS_TAB,
    },
    ...getStatuses(rows).map(status => ({
      label: status,
      value: status,
      count: rows.filter(row => row.status === status).length,
      active: selectedTab === status,
    })),
  ],
  matchesTab: (row, selectedTab) => selectedTab === ALL_PRACTITIONERS_TAB || row.status === selectedTab,
  buildSearchText: row => [
    row.name,
    row.phone,
    row.company,
    row.role,
    row.district,
    row.certificateLevel,
    row.note,
    row.joinedAt,
    `${row.experienceYears}`,
  ].join(" "),
  getFilterValue: (key, row) => {
    if (key === "从业人员") return `${row.name} ${row.phone}`
    if (key === "所属企业") return row.company
    if (key === "岗位类型") return row.role
    if (key === "行政区域") return row.district
    if (key === "证件级别") return row.certificateLevel
    if (key === "从业年限") return `${row.experienceYears}`
    if (key === "入职日期") return row.joinedAt
    if (key === "状态") return row.status
    if (key === "在页面中") return row.note
    return row.name
  },
  getSortSummaryLabel: field => practitionersSortFieldOptions.find(option => option.value === field)?.label ?? "从业年限",
  compareSort: (field, a, b) => {
    if (field === "experienceYears") return a.experienceYears - b.experienceYears
    if (field === "company") return a.company.localeCompare(b.company, "zh-CN")
    if (field === "role") return a.role.localeCompare(b.role, "zh-CN")
    if (field === "district") return a.district.localeCompare(b.district, "zh-CN")
    if (field === "certificateLevel") return a.certificateLevel.localeCompare(b.certificateLevel, "zh-CN")
    if (field === "joinedAt") return a.joinedAt.localeCompare(b.joinedAt, "zh-CN")
    return a.name.localeCompare(b.name, "zh-CN")
  },
  isSortField: value => typeof value === "string" && practitionersSortFieldOptions.some(option => option.value === value),
}

const practitioners = (usersData as RawPractitionerRecord[]).map((practitioner) => ({
  ...practitioner,
  profileDisplay: `${practitioner.name} ${practitioner.phone}`,
}))

const controller = useListController<PractitionerRecord, string>({
  rows: practitioners,
  ...practitionersPageConfig,
})

function getStatuses(rows: PractitionerRecord[]) {
  return [...new Set(rows.map(row => row.status))]
}
</script>

<template>
  <ListPage
    :title="practitionersPageConfig.title ?? '从业人员'"
    :count="controller.visibleRows.value.length"
    :tabs="controller.tabs.value"
    :fields="controller.fields.value"
    :available-filters="controller.availableFilterKeys.value"
    :show-controls="controller.showControls.value"
    :custom-sort-enabled="controller.customSortEnabled.value"
    :sort-rules="controller.sortRules.value"
    :sort-field-options="practitionersSortFieldOptions"
    :search-query="controller.searchQuery.value"
    :text-filters="controller.textFilters.value"
    :number-filters="controller.numberFilters.value"
    :tag-filters="controller.tagFilters.value"
    :tag-filter-options="controller.tagFilterOptions.value"
    :date-filters="controller.dateFilters.value"
    :date-filter-fields="controller.dateFilterFields.value"
    :columns="practitionersColumns"
    :rows="controller.visibleRows.value"
    row-key="id"
    show-index
    sticky-header
    wrapper-class="overflow-visible"
    table-class="min-w-full w-max table-auto border-collapse bg-white text-[14px]"
    @tab-click="controller.handleTabClick"
    @add-filter="controller.handleAddFilter"
    @replace-filter="controller.handleReplaceFilter"
    @remove-filter="controller.handleRemoveFilter"
    @set-custom-sort-enabled="controller.customSortEnabled.value = $event"
    @update-sort-rules="controller.sortRules.value = $event"
    @toggle-controls="controller.showControls.value = !controller.showControls.value"
    @update-search-query="controller.searchQuery.value = $event"
    @update-text-filter="controller.updateTextFilter($event.label, $event.value)"
    @update-number-filter="controller.updateNumberFilter($event.label, $event.value)"
    @update-tag-filter="controller.updateTagFilter($event.label, $event.value)"
    @update-date-filter="controller.updateDateFilter($event.label, $event.value)"
  />
</template>
