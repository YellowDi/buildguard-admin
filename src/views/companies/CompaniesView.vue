<script setup lang="ts">
import companiesData from "@/data/companies.json"
import ResourceListPage from "@/components/resource/ResourceListPage.vue"
import type { SortFieldOption } from "@/components/resource/SortPopover.vue"
import type {
  ResourceDateFilterState,
  ResourceNumberFilterState,
  ResourceTableColumn,
  ResourceTagFilterState,
  ResourceTextFilterState,
} from "@/components/resource/types"
import { useResourceListController } from "@/components/resource/useResourceListController"

type CompanyRecord = {
  id: number
  name: string
  type: string
  district: string
  vehicles: number
  legalPerson: string
  phone: string
  startDate: string
  serviceDays: number
  endDate: string
  lastUpdated: string
  note: string
}

type RawCompanyRecord = Omit<CompanyRecord, "startDate" | "endDate">

const ALL_COMPANIES_TAB = "all"
const FIXED_FILTERS: Record<string, ResourceTextFilterState> = {
  "在页面中": { enabled: false, operator: "contains", query: "", placeholder: "输入页面内筛选条件" },
}

const INITIAL_TEXT_FILTERS: Record<string, ResourceTextFilterState> = {
  "企业名称": { enabled: false, operator: "contains", query: "", placeholder: "输入企业名称" },
  "法人信息": { enabled: false, operator: "contains", query: "", placeholder: "输入法人或手机号" },
}

const INITIAL_NUMBER_FILTERS: Record<string, ResourceNumberFilterState> = {
  "车辆总数": { enabled: false, operator: "equals", query: "", placeholder: "输入车辆总数" },
  "服务剩余时长": { enabled: false, operator: "equals", query: "", placeholder: "输入剩余时长" },
}

const INITIAL_TAG_FILTERS: Record<string, ResourceTagFilterState> = {
  "企业类型": { enabled: false, operator: "equals", values: [] },
  "行政区域": { enabled: false, operator: "equals", values: [] },
}

const INITIAL_DATE_FILTERS: Record<string, ResourceDateFilterState> = {
  "开始日期": { enabled: false, operator: "equals", preset: "custom", startDate: "", endDate: "" },
  "结束日期": { enabled: false, operator: "equals", preset: "custom", startDate: "", endDate: "" },
}

const SORT_FIELD_OPTIONS: SortFieldOption[] = [
  { value: "name", label: "企业名称", icon: "ri-text", kind: "text" },
  { value: "type", label: "企业类型", icon: "ri-price-tag-3-line", kind: "text" },
  { value: "district", label: "行政区域", icon: "ri-map-pin-line", kind: "text" },
  { value: "vehicles", label: "车辆总数", icon: "ri-hashtag", kind: "metric" },
  { value: "legalPerson", label: "法人信息", icon: "ri-user-line", kind: "text" },
  { value: "serviceDays", label: "服务剩余时长", icon: "ri-timer-line", kind: "metric" },
  { value: "startDate", label: "开始日期", icon: "ri-calendar-line", kind: "text" },
  { value: "endDate", label: "结束日期", icon: "ri-calendar-event-line", kind: "text" },
]

const columns: ResourceTableColumn[] = [
  { key: "name", label: "企业名称", filterType: "text", headerClass: "pr-3", cellClass: "font-medium text-[#1F1F1F]" },
  { key: "type", label: "企业类型", filterType: "tag", cellClass: "text-[#3F3F3F]" },
  { key: "district", label: "行政区域", filterType: "tag", cellClass: "text-[#3F3F3F]" },
  { key: "vehicles", label: "车辆总数", filterType: "number", cellClass: "tabular-nums text-[#2F2F2F]" },
  { key: "legalPerson", label: "法人信息", filterType: "contact" },
  { key: "serviceDays", label: "服务剩余时长", filterType: "number", cellClass: "text-[#3559E0] tabular-nums" },
  { key: "startDate", label: "开始日期", filterType: "time", cellClass: "tabular-nums text-[#2F2F2F]" },
  { key: "endDate", label: "结束日期", filterType: "time", cellClass: "tabular-nums text-[#2F2F2F]" },
  { key: "note", label: "备注", filterType: "none", headerClass: "w-full", cellClass: "w-full text-[#6E6E6E]" },
]

const companies = (companiesData as RawCompanyRecord[]).map((company) => {
  const startDate = extractDatePart(company.lastUpdated)
  const endDate = buildEndDate(company.serviceDays)

  return {
    ...company,
    startDate,
    endDate,
    serviceDays: getRemainingDays(endDate),
  }
})

const controller = useResourceListController<CompanyRecord, string>({
  rows: companies,
  columns,
  defaultVisibleFilterKeys: ["企业名称", "法人信息", "车辆总数"],
  fixedTextFilters: FIXED_FILTERS,
  textFilters: INITIAL_TEXT_FILTERS,
  numberFilters: INITIAL_NUMBER_FILTERS,
  tagFilters: INITIAL_TAG_FILTERS,
  dateFilters: INITIAL_DATE_FILTERS,
  tagFilterOptions: rows => ({
    "企业类型": [...new Set(rows.map(row => row.type))],
    "行政区域": [...new Set(rows.map(row => row.district))],
  }),
  initialSortRules: [{ id: "sort-service-days", field: "serviceDays", direction: "desc" }],
  sortStorageKey: "companies-sort-preferences",
  sortFieldOptions: SORT_FIELD_OPTIONS,
  defaultTab: ALL_COMPANIES_TAB,
  buildTabs: (rows, selectedTab) => [
    {
      label: "全部",
      value: ALL_COMPANIES_TAB,
      count: rows.length,
      active: selectedTab === ALL_COMPANIES_TAB,
    },
    ...getCompanyTypes(rows).map(type => ({
      label: type,
      value: type,
      count: rows.filter(row => row.type === type).length,
      active: selectedTab === type,
    })),
  ],
  matchesTab: (row, selectedTab) => selectedTab === ALL_COMPANIES_TAB || row.type === selectedTab,
  buildSearchText: row => [
    row.name,
    row.type,
    row.district,
    row.legalPerson,
    row.phone,
    row.startDate,
    row.endDate,
    row.note,
    `${row.serviceDays}`,
  ].join(" "),
  getFilterValue: (key, row) => {
    if (key === "企业类型") return row.type
    if (key === "行政区域") return row.district
    if (key === "法人信息") return `${row.legalPerson} ${row.phone}`
    if (key === "车辆总数") return `${row.vehicles}`
    if (key === "开始日期") return row.startDate
    if (key === "服务剩余时长") return `${row.serviceDays}`
    if (key === "结束日期") return row.endDate
    if (key === "在页面中") return row.note
    return row.name
  },
  getSortSummaryLabel: (field) => SORT_FIELD_OPTIONS.find(option => option.value === field)?.label ?? "服务剩余时长",
  compareSort: (field, a, b) => {
    if (field === "serviceDays") return a.serviceDays - b.serviceDays
    if (field === "vehicles") return a.vehicles - b.vehicles
    if (field === "type") return a.type.localeCompare(b.type, "zh-CN")
    if (field === "district") return a.district.localeCompare(b.district, "zh-CN")
    if (field === "legalPerson") return `${a.legalPerson} ${a.phone}`.localeCompare(`${b.legalPerson} ${b.phone}`, "zh-CN")
    if (field === "startDate") return a.startDate.localeCompare(b.startDate, "zh-CN")
    if (field === "endDate") return a.endDate.localeCompare(b.endDate, "zh-CN")
    return a.name.localeCompare(b.name, "zh-CN")
  },
  isSortField: value => typeof value === "string" && SORT_FIELD_OPTIONS.some(option => option.value === value),
})

function getCompanyTypes(rows: CompanyRecord[]) {
  return [...new Set(rows.map(row => row.type))]
}

function buildEndDate(serviceDays: number) {
  const baseDate = new Date()
  baseDate.setHours(0, 0, 0, 0)
  baseDate.setDate(baseDate.getDate() + serviceDays)
  return toISODate(baseDate)
}

function extractDatePart(value: string) {
  const [datePart] = value.split(" ")
  return datePart ?? ""
}

function getRemainingDays(endDate: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const targetDate = new Date(`${endDate}T00:00:00`)
  if (Number.isNaN(targetDate.getTime())) {
    return 0
  }

  const diff = targetDate.getTime() - today.getTime()
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)))
}

function toISODate(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const day = `${date.getDate()}`.padStart(2, "0")
  return `${year}-${month}-${day}`
}
</script>

<template>
  <ResourceListPage
    title="企业"
    :count="controller.visibleRows.value.length"
    :tabs="controller.tabs.value"
    :fields="controller.fields.value"
    :available-filters="controller.availableFilterKeys.value"
    :show-controls="controller.showControls.value"
    :custom-sort-enabled="controller.customSortEnabled.value"
    :sort-rules="controller.sortRules.value"
    :sort-field-options="SORT_FIELD_OPTIONS"
    :search-query="controller.searchQuery.value"
    :text-filters="controller.textFilters.value"
    :number-filters="controller.numberFilters.value"
    :tag-filters="controller.tagFilters.value"
    :tag-filter-options="controller.tagFilterOptions.value"
    :date-filters="controller.dateFilters.value"
    :date-filter-fields="controller.dateFilterFields.value"
    :columns="columns"
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
  >
    <template #cell-legalPerson="{ row }">
      <span class="text-[#1F1F1F]">{{ row.legalPerson }}</span>
      <span class="ml-1 text-[#9A9A9A]">{{ row.phone }}</span>
    </template>

    <template #cell-serviceDays="{ value }">
      {{ value }} 天
    </template>
  </ResourceListPage>
</template>
