<script setup lang="ts">
import { computed, ref } from "vue"

import vehiclesData from "@/data/vehicles.json"
import ResourceListPage from "@/components/resource/ResourceListPage.vue"
import type { SortFieldOption } from "@/components/resource/SortPopover.vue"
import type {
  ResourceDateFilterState,
  ResourceHeaderTab,
  ResourceNumberFilterState,
  ResourceTableColumn,
  ResourceTagFilterState,
  ResourceTextFilterState,
} from "@/components/resource/types"
import { useResourceListController } from "@/components/resource/useResourceListController"
import type { ResourceListPageConfig } from "@/components/resource/useResourceListController"

type OperatingVehicleRecord = {
  plateNumber: string
  company: string
  vehicleType: string
  district: string
  onlineRate: string
}

type AlarmVehicleRecord = {
  plateNumber: string
  company: string
  riskLevel: string
  latestAlarm: string
  status: string
}

type InspectionVehicleRecord = {
  plateNumber: string
  company: string
  annualCheck: string
  maintenance: string
  nextReview: string
}

type VehicleDataBundle = {
  operating: OperatingVehicleRecord[]
  alarm: AlarmVehicleRecord[]
  inspection: InspectionVehicleRecord[]
}

const VEHICLE_TAB_OVERVIEW = "overview"
const VEHICLE_TAB_ALARMS = "alarms"
const VEHICLE_TAB_INSPECTIONS = "inspections"
const ALL_VEHICLES_TAB = "all"

const vehicleTableWrapperClass = "overflow-visible"
const vehicleTableClass = "min-w-full w-max table-auto border-collapse bg-white text-[14px]"

const {
  operating: operatingVehicles,
  alarm: alarmVehicles,
  inspection: inspectionVehicles,
} = vehiclesData as VehicleDataBundle

const operatingColumns: ResourceTableColumn[] = [
  { key: "plateNumber", label: "车牌号", filterType: "text", cellClass: "font-medium text-[#1F1F1F]" },
  { key: "company", label: "所属企业", filterType: "text" },
  { key: "vehicleType", label: "车辆类型", filterType: "tag" },
  { key: "district", label: "所属区域", filterType: "tag" },
  { key: "onlineRate", label: "在线率", filterType: "number", headerClass: "w-full", cellClass: "w-full text-[#3559E0]" },
]

const alarmColumns: ResourceTableColumn[] = [
  { key: "plateNumber", label: "车牌号", filterType: "text", cellClass: "font-medium text-[#1F1F1F]" },
  { key: "company", label: "所属企业", filterType: "text" },
  { key: "riskLevel", label: "风险等级", filterType: "tag" },
  { key: "latestAlarm", label: "最新报警", filterType: "text" },
  { key: "status", label: "处理状态", filterType: "tag", headerClass: "w-full", cellClass: "w-full text-[#B65A2A]" },
]

const inspectionColumns: ResourceTableColumn[] = [
  { key: "plateNumber", label: "车牌号", filterType: "text", cellClass: "font-medium text-[#1F1F1F]" },
  { key: "company", label: "所属企业", filterType: "text" },
  { key: "annualCheck", label: "年检日期", filterType: "time" },
  { key: "maintenance", label: "最近维保", filterType: "time" },
  { key: "nextReview", label: "下次复核", filterType: "time", headerClass: "w-full", cellClass: "w-full text-[#3559E0]" },
]

const operatingTextFilters: Record<string, ResourceTextFilterState> = {
  "车牌号": { enabled: false, operator: "contains", query: "", placeholder: "输入车牌号" },
  "所属企业": { enabled: false, operator: "contains", query: "", placeholder: "输入企业名称" },
}

const operatingNumberFilters: Record<string, ResourceNumberFilterState> = {
  "在线率": { enabled: false, operator: "gte", query: "", placeholder: "输入在线率" },
}

const operatingTagFilters: Record<string, ResourceTagFilterState> = {
  "车辆类型": { enabled: false, operator: "equals", values: [] },
  "所属区域": { enabled: false, operator: "equals", values: [] },
}

const operatingSortFieldOptions: SortFieldOption[] = [
  { value: "plateNumber", label: "车牌号", kind: "text" },
  { value: "company", label: "所属企业", kind: "text" },
  { value: "vehicleType", label: "车辆类型", kind: "text" },
  { value: "district", label: "所属区域", kind: "text" },
  { value: "onlineRate", label: "在线率", kind: "metric" },
]

const operatingVehiclesPageConfig: ResourceListPageConfig<OperatingVehicleRecord, string> = {
  title: "车辆",
  columns: operatingColumns,
  defaultVisibleFilterKeys: ["车牌号", "所属企业", "车辆类型"],
  textFilters: operatingTextFilters,
  numberFilters: operatingNumberFilters,
  tagFilters: operatingTagFilters,
  sortStorageKey: "vehicles-operating-sort-preferences",
  sortFieldOptions: operatingSortFieldOptions,
  initialSortRules: [{ id: "sort-operating-online-rate", field: "onlineRate", direction: "desc" }],
  tagFilterOptions: rows => ({
    "车辆类型": [...new Set(rows.map(row => row.vehicleType))],
    "所属区域": [...new Set(rows.map(row => row.district))],
  }),
  defaultTab: ALL_VEHICLES_TAB,
  buildTabs: () => [],
  matchesTab: () => true,
  buildSearchText: row => [row.plateNumber, row.company, row.vehicleType, row.district, row.onlineRate].join(" "),
  getFilterValue: (key, row) => {
    if (key === "车牌号") return row.plateNumber
    if (key === "所属企业") return row.company
    if (key === "车辆类型") return row.vehicleType
    if (key === "所属区域") return row.district
    if (key === "在线率") return `${parseRate(row.onlineRate)}`
    return row.plateNumber
  },
  getSortSummaryLabel: field => operatingSortFieldOptions.find(option => option.value === field)?.label ?? "在线率",
  compareSort: (field, a, b) => {
    if (field === "onlineRate") return parseRate(a.onlineRate) - parseRate(b.onlineRate)
    if (field === "company") return a.company.localeCompare(b.company, "zh-CN")
    if (field === "vehicleType") return a.vehicleType.localeCompare(b.vehicleType, "zh-CN")
    if (field === "district") return a.district.localeCompare(b.district, "zh-CN")
    return a.plateNumber.localeCompare(b.plateNumber, "zh-CN")
  },
  isSortField: value => typeof value === "string" && operatingSortFieldOptions.some(option => option.value === value),
}

const alarmTextFilters: Record<string, ResourceTextFilterState> = {
  "车牌号": { enabled: false, operator: "contains", query: "", placeholder: "输入车牌号" },
  "所属企业": { enabled: false, operator: "contains", query: "", placeholder: "输入企业名称" },
  "最新报警": { enabled: false, operator: "contains", query: "", placeholder: "输入报警类型" },
}

const alarmTagFilters: Record<string, ResourceTagFilterState> = {
  "风险等级": { enabled: false, operator: "equals", values: [] },
  "处理状态": { enabled: false, operator: "equals", values: [] },
}

const alarmSortFieldOptions: SortFieldOption[] = [
  { value: "plateNumber", label: "车牌号", kind: "text" },
  { value: "company", label: "所属企业", kind: "text" },
  { value: "riskLevel", label: "风险等级", kind: "text" },
  { value: "latestAlarm", label: "最新报警", kind: "text" },
  { value: "status", label: "处理状态", kind: "text" },
]

const alarmVehiclesPageConfig: ResourceListPageConfig<AlarmVehicleRecord, string> = {
  title: "车辆",
  columns: alarmColumns,
  defaultVisibleFilterKeys: ["车牌号", "风险等级", "处理状态"],
  textFilters: alarmTextFilters,
  tagFilters: alarmTagFilters,
  sortStorageKey: "vehicles-alarm-sort-preferences",
  sortFieldOptions: alarmSortFieldOptions,
  initialSortRules: [{ id: "sort-alarm-risk-level", field: "riskLevel", direction: "desc" }],
  tagFilterOptions: rows => ({
    "风险等级": [...new Set(rows.map(row => row.riskLevel))],
    "处理状态": [...new Set(rows.map(row => row.status))],
  }),
  defaultTab: ALL_VEHICLES_TAB,
  buildTabs: () => [],
  matchesTab: () => true,
  buildSearchText: row => [row.plateNumber, row.company, row.riskLevel, row.latestAlarm, row.status].join(" "),
  getFilterValue: (key, row) => {
    if (key === "车牌号") return row.plateNumber
    if (key === "所属企业") return row.company
    if (key === "风险等级") return row.riskLevel
    if (key === "最新报警") return row.latestAlarm
    if (key === "处理状态") return row.status
    return row.plateNumber
  },
  getSortSummaryLabel: field => alarmSortFieldOptions.find(option => option.value === field)?.label ?? "风险等级",
  compareSort: (field, a, b) => {
    if (field === "riskLevel") return getRiskLevelWeight(a.riskLevel) - getRiskLevelWeight(b.riskLevel)
    if (field === "company") return a.company.localeCompare(b.company, "zh-CN")
    if (field === "latestAlarm") return a.latestAlarm.localeCompare(b.latestAlarm, "zh-CN")
    if (field === "status") return a.status.localeCompare(b.status, "zh-CN")
    return a.plateNumber.localeCompare(b.plateNumber, "zh-CN")
  },
  isSortField: value => typeof value === "string" && alarmSortFieldOptions.some(option => option.value === value),
}

const inspectionTextFilters: Record<string, ResourceTextFilterState> = {
  "车牌号": { enabled: false, operator: "contains", query: "", placeholder: "输入车牌号" },
  "所属企业": { enabled: false, operator: "contains", query: "", placeholder: "输入企业名称" },
}

const inspectionDateFilters: Record<string, ResourceDateFilterState> = {
  "年检日期": { enabled: false, operator: "equals", preset: "custom", startDate: "", endDate: "" },
  "最近维保": { enabled: false, operator: "equals", preset: "custom", startDate: "", endDate: "" },
  "下次复核": { enabled: false, operator: "equals", preset: "custom", startDate: "", endDate: "" },
}

const inspectionSortFieldOptions: SortFieldOption[] = [
  { value: "plateNumber", label: "车牌号", kind: "text" },
  { value: "company", label: "所属企业", kind: "text" },
  { value: "annualCheck", label: "年检日期", kind: "text" },
  { value: "maintenance", label: "最近维保", kind: "text" },
  { value: "nextReview", label: "下次复核", kind: "text" },
]

const inspectionVehiclesPageConfig: ResourceListPageConfig<InspectionVehicleRecord, string> = {
  title: "车辆",
  columns: inspectionColumns,
  defaultVisibleFilterKeys: ["车牌号", "年检日期", "下次复核"],
  textFilters: inspectionTextFilters,
  dateFilters: inspectionDateFilters,
  sortStorageKey: "vehicles-inspection-sort-preferences",
  sortFieldOptions: inspectionSortFieldOptions,
  initialSortRules: [{ id: "sort-inspection-next-review", field: "nextReview", direction: "asc" }],
  defaultTab: ALL_VEHICLES_TAB,
  buildTabs: () => [],
  matchesTab: () => true,
  buildSearchText: row => [row.plateNumber, row.company, row.annualCheck, row.maintenance, row.nextReview].join(" "),
  getFilterValue: (key, row) => {
    if (key === "车牌号") return row.plateNumber
    if (key === "所属企业") return row.company
    if (key === "年检日期") return row.annualCheck
    if (key === "最近维保") return row.maintenance
    if (key === "下次复核") return row.nextReview
    return row.plateNumber
  },
  getSortSummaryLabel: field => inspectionSortFieldOptions.find(option => option.value === field)?.label ?? "下次复核",
  compareSort: (field, a, b) => {
    if (field === "company") return a.company.localeCompare(b.company, "zh-CN")
    if (field === "annualCheck") return a.annualCheck.localeCompare(b.annualCheck, "zh-CN")
    if (field === "maintenance") return a.maintenance.localeCompare(b.maintenance, "zh-CN")
    if (field === "nextReview") return a.nextReview.localeCompare(b.nextReview, "zh-CN")
    return a.plateNumber.localeCompare(b.plateNumber, "zh-CN")
  },
  isSortField: value => typeof value === "string" && inspectionSortFieldOptions.some(option => option.value === value),
}

const activeTab = ref(VEHICLE_TAB_OVERVIEW)

const operatingController = useResourceListController<OperatingVehicleRecord, string>({
  rows: operatingVehicles,
  ...operatingVehiclesPageConfig,
})

const alarmController = useResourceListController<AlarmVehicleRecord, string>({
  rows: alarmVehicles,
  ...alarmVehiclesPageConfig,
})

const inspectionController = useResourceListController<InspectionVehicleRecord, string>({
  rows: inspectionVehicles,
  ...inspectionVehiclesPageConfig,
})

const tabs = computed(() => vehiclesPageTabs(activeTab.value))

const tableRegistry = {
  [VEHICLE_TAB_OVERVIEW]: {
    controller: operatingController,
    columns: operatingColumns,
    sortFieldOptions: operatingSortFieldOptions,
  },
  [VEHICLE_TAB_ALARMS]: {
    controller: alarmController,
    columns: alarmColumns,
    sortFieldOptions: alarmSortFieldOptions,
  },
  [VEHICLE_TAB_INSPECTIONS]: {
    controller: inspectionController,
    columns: inspectionColumns,
    sortFieldOptions: inspectionSortFieldOptions,
  },
} as const

const activeTable = computed(() => tableRegistry[activeTab.value as keyof typeof tableRegistry] ?? tableRegistry[VEHICLE_TAB_OVERVIEW])
const activeController = computed(() => activeTable.value.controller)
const activeCount = computed(() => activeController.value.visibleRows.value.length)

const sections = computed(() => [
  {
    key: activeTab.value,
    columns: activeTable.value.columns,
    rows: activeController.value.visibleRows.value,
    rowKey: "plateNumber",
    showIndex: true,
    stickyHeader: true,
    wrapperClass: vehicleTableWrapperClass,
    tableClass: vehicleTableClass,
  },
])

function handleTabClick(tab: { value?: string | number; label: string }) {
  activeTab.value = `${tab.value ?? tab.label}`
}

function handleSetCustomSortEnabled(enabled: boolean) {
  activeController.value.customSortEnabled.value = enabled
}

function handleUpdateSortRules(rules: typeof activeController.value.sortRules.value) {
  activeController.value.sortRules.value = rules
}

function handleToggleControls() {
  activeController.value.showControls.value = !activeController.value.showControls.value
}

function handleUpdateSearchQuery(query: string) {
  activeController.value.searchQuery.value = query
}

function handleAddFilter(key: string) {
  activeController.value.handleAddFilter(key)
}

function handleReplaceFilter(payload: Parameters<typeof activeController.value.handleReplaceFilter>[0]) {
  activeController.value.handleReplaceFilter(payload)
}

function handleRemoveFilter(key: string) {
  activeController.value.handleRemoveFilter(key)
}

function handleUpdateTextFilter(payload: Parameters<typeof activeController.value.updateTextFilter>[0] extends never ? never : { label: string; value: Parameters<typeof activeController.value.updateTextFilter>[1] }) {
  activeController.value.updateTextFilter(payload.label, payload.value)
}

function handleUpdateNumberFilter(payload: Parameters<typeof activeController.value.updateNumberFilter>[0] extends never ? never : { label: string; value: Parameters<typeof activeController.value.updateNumberFilter>[1] }) {
  activeController.value.updateNumberFilter(payload.label, payload.value)
}

function handleUpdateTagFilter(payload: Parameters<typeof activeController.value.updateTagFilter>[0] extends never ? never : { label: string; value: Parameters<typeof activeController.value.updateTagFilter>[1] }) {
  activeController.value.updateTagFilter(payload.label, payload.value)
}

function handleUpdateDateFilter(payload: Parameters<typeof activeController.value.updateDateFilter>[0] extends never ? never : { label: string; value: Parameters<typeof activeController.value.updateDateFilter>[1] }) {
  activeController.value.updateDateFilter(payload.label, payload.value)
}

function vehiclesPageTabs(activeTab: string): ResourceHeaderTab[] {
  return [
    {
      label: "运营车辆",
      value: VEHICLE_TAB_OVERVIEW,
      count: operatingVehicles.length,
      active: activeTab === VEHICLE_TAB_OVERVIEW,
    },
    {
      label: "报警车辆",
      value: VEHICLE_TAB_ALARMS,
      count: alarmVehicles.length,
      active: activeTab === VEHICLE_TAB_ALARMS,
    },
    {
      label: "年检与维保",
      value: VEHICLE_TAB_INSPECTIONS,
      count: inspectionVehicles.length,
      active: activeTab === VEHICLE_TAB_INSPECTIONS,
    },
  ]
}

function parseRate(value: string) {
  return Number.parseFloat(value.replace("%", "")) || 0
}

function getRiskLevelWeight(value: string) {
  if (value === "高") return 3
  if (value === "中") return 2
  if (value === "低") return 1
  return 0
}
</script>

<template>
  <ResourceListPage
    title="车辆"
    :count="activeCount"
    :tabs="tabs"
    :fields="activeController.fields.value"
    :available-filters="activeController.availableFilterKeys.value"
    :show-controls="activeController.showControls.value"
    :custom-sort-enabled="activeController.customSortEnabled.value"
    :sort-rules="activeController.sortRules.value"
    :sort-field-options="activeTable.sortFieldOptions"
    :search-query="activeController.searchQuery.value"
    :text-filters="activeController.textFilters.value"
    :number-filters="activeController.numberFilters.value"
    :tag-filters="activeController.tagFilters.value"
    :tag-filter-options="activeController.tagFilterOptions.value"
    :date-filters="activeController.dateFilters.value"
    :date-filter-fields="activeController.dateFilterFields.value"
    :columns="activeTable.columns"
    :rows="activeController.visibleRows.value"
    row-key="plateNumber"
    :sections="sections"
    @tab-click="handleTabClick"
    @add-filter="handleAddFilter"
    @replace-filter="handleReplaceFilter"
    @remove-filter="handleRemoveFilter"
    @set-custom-sort-enabled="handleSetCustomSortEnabled"
    @update-sort-rules="handleUpdateSortRules"
    @toggle-controls="handleToggleControls"
    @update-search-query="handleUpdateSearchQuery"
    @update-text-filter="handleUpdateTextFilter"
    @update-number-filter="handleUpdateNumberFilter"
    @update-tag-filter="handleUpdateTagFilter"
    @update-date-filter="handleUpdateDateFilter"
  />
</template>
