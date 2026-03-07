<script setup lang="ts">
import { computed, ref } from "vue"

import vehiclesData from "@/data/vehicles.json"
import ListPage from "@/components/resource/ListPage.vue"
import type { SortFieldOption } from "@/components/resource/SortPopover.vue"
import type {
  DateFilterState,
  HeaderTab,
  NumberFilterState,
  TableColumn,
  TagFilterState,
  TextFilterState,
} from "@/components/resource/types"
import { useListController } from "@/components/resource/useListController"
import type { ListPageConfig } from "@/components/resource/useListController"

type OperatingVehicleRecord = {
  plateNumber: string
  company: string
  vehicleType: string
  district: string
  onlineRate: string
  note: string
}

type AlarmVehicleRecord = {
  plateNumber: string
  company: string
  riskLevel: string
  latestAlarm: string
  status: string
  note: string
}

type InspectionVehicleRecord = {
  plateNumber: string
  company: string
  annualCheck: string
  maintenance: string
  nextReview: string
  note: string
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
} = buildVehicleDataBundle(vehiclesData as VehicleDataBundle)

const operatingColumns: TableColumn[] = [
  { key: "plateNumber", label: "车牌号", filterType: "text", cellClass: "font-medium text-[#1F1F1F]" },
  { key: "company", label: "所属企业", filterType: "text" },
  { key: "vehicleType", label: "车辆类型", filterType: "tag" },
  { key: "district", label: "所属区域", filterType: "tag" },
  { key: "onlineRate", label: "在线率", filterType: "number", cellClass: "text-[#3559E0]" },
  { key: "note", label: "备注", filterType: "none", headerClass: "w-full", cellClass: "w-full text-[#6E6E6E]", cellRenderer: { kind: "note" } },
]

const alarmColumns: TableColumn[] = [
  { key: "plateNumber", label: "车牌号", filterType: "text", cellClass: "font-medium text-[#1F1F1F]" },
  { key: "company", label: "所属企业", filterType: "text" },
  { key: "riskLevel", label: "风险等级", filterType: "tag" },
  { key: "latestAlarm", label: "最新报警", filterType: "text" },
  { key: "status", label: "处理状态", filterType: "tag", cellClass: "text-[#B65A2A]" },
  { key: "note", label: "备注", filterType: "none", headerClass: "w-full", cellClass: "w-full text-[#6E6E6E]", cellRenderer: { kind: "note" } },
]

const inspectionColumns: TableColumn[] = [
  { key: "plateNumber", label: "车牌号", filterType: "text", cellClass: "font-medium text-[#1F1F1F]" },
  { key: "company", label: "所属企业", filterType: "text" },
  { key: "annualCheck", label: "年检日期", filterType: "time" },
  { key: "maintenance", label: "最近维保", filterType: "time" },
  { key: "nextReview", label: "下次复核", filterType: "time", cellClass: "text-[#3559E0]" },
  { key: "note", label: "备注", filterType: "none", headerClass: "w-full", cellClass: "w-full text-[#6E6E6E]", cellRenderer: { kind: "note" } },
]

const operatingTextFilters: Record<string, TextFilterState> = {
  "车牌号": { enabled: false, operator: "contains", query: "", placeholder: "输入车牌号" },
  "所属企业": { enabled: false, operator: "contains", query: "", placeholder: "输入企业名称" },
}

const operatingNumberFilters: Record<string, NumberFilterState> = {
  "在线率": { enabled: false, operator: "gte", query: "", placeholder: "输入在线率" },
}

const operatingTagFilters: Record<string, TagFilterState> = {
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

const operatingVehiclesPageConfig: ListPageConfig<OperatingVehicleRecord, string> = {
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
  buildSearchText: row => [row.plateNumber, row.company, row.vehicleType, row.district, row.onlineRate, row.note].join(" "),
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

const alarmTextFilters: Record<string, TextFilterState> = {
  "车牌号": { enabled: false, operator: "contains", query: "", placeholder: "输入车牌号" },
  "所属企业": { enabled: false, operator: "contains", query: "", placeholder: "输入企业名称" },
  "最新报警": { enabled: false, operator: "contains", query: "", placeholder: "输入报警类型" },
}

const alarmTagFilters: Record<string, TagFilterState> = {
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

const alarmVehiclesPageConfig: ListPageConfig<AlarmVehicleRecord, string> = {
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
  buildSearchText: row => [row.plateNumber, row.company, row.riskLevel, row.latestAlarm, row.status, row.note].join(" "),
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

const inspectionTextFilters: Record<string, TextFilterState> = {
  "车牌号": { enabled: false, operator: "contains", query: "", placeholder: "输入车牌号" },
  "所属企业": { enabled: false, operator: "contains", query: "", placeholder: "输入企业名称" },
}

const inspectionDateFilters: Record<string, DateFilterState> = {
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

const inspectionVehiclesPageConfig: ListPageConfig<InspectionVehicleRecord, string> = {
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
  buildSearchText: row => [row.plateNumber, row.company, row.annualCheck, row.maintenance, row.nextReview, row.note].join(" "),
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

const operatingController = useListController<OperatingVehicleRecord, string>({
  rows: operatingVehicles,
  ...operatingVehiclesPageConfig,
})

const alarmController = useListController<AlarmVehicleRecord, string>({
  rows: alarmVehicles,
  ...alarmVehiclesPageConfig,
})

const inspectionController = useListController<InspectionVehicleRecord, string>({
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

function vehiclesPageTabs(activeTab: string): HeaderTab[] {
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

function buildVehicleDataBundle(bundle: VehicleDataBundle): VehicleDataBundle {
  return {
    operating: bundle.operating.map((row) => ({
      ...row,
      note: buildOperatingNote(row),
    })),
    alarm: bundle.alarm.map((row) => ({
      ...row,
      note: buildAlarmNote(row),
    })),
    inspection: bundle.inspection.map((row) => ({
      ...row,
      note: buildInspectionNote(row),
    })),
  }
}

function buildOperatingNote(row: Omit<OperatingVehicleRecord, "note">) {
  const rate = parseRate(row.onlineRate)
  if (rate >= 99) return "在线状态稳定，近 7 日无离线波动"
  if (rate >= 98) return "偶发短时离线，建议持续关注终端状态"
  return "在线率偏低，建议排查终端与网络链路"
}

function buildAlarmNote(row: Omit<AlarmVehicleRecord, "note">) {
  if (row.status === "待复核") return "报警记录待人工复核，建议优先核查处置结论"
  if (row.status === "处理中") return "事件已进入处置流程，需持续跟进反馈结果"
  return "工单已下发，等待现场回传处理结果"
}

function buildInspectionNote(row: Omit<InspectionVehicleRecord, "note">) {
  const remainingDays = getDaysUntil(row.nextReview)
  if (remainingDays <= 7) return "复核临近，请提前准备年检与维保材料"
  if (remainingDays <= 14) return "建议本周内确认复核排期，避免临近堆积"
  return "当前检维状态正常，可按计划推进下次复核"
}

function getDaysUntil(dateString: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const targetDate = new Date(`${dateString}T00:00:00`)

  if (Number.isNaN(targetDate.getTime())) {
    return Number.POSITIVE_INFINITY
  }

  return Math.round((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}
</script>

<template>
  <ListPage
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
