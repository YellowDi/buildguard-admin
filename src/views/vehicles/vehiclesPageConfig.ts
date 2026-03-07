import type { SortFieldOption } from "@/components/resource/SortPopover.vue"
import type {
  ResourceDateFilterState,
  ResourceNumberFilterState,
  ResourceHeaderTab,
  ResourceTableColumn,
  ResourceTagFilterState,
  ResourceTextFilterState,
} from "@/components/resource/types"
import type { ResourceListPageConfig } from "@/components/resource/useResourceListController"

export type OperatingVehicleRecord = {
  plateNumber: string
  company: string
  vehicleType: string
  district: string
  onlineRate: string
}

export type AlarmVehicleRecord = {
  plateNumber: string
  company: string
  riskLevel: string
  latestAlarm: string
  status: string
}

export type InspectionVehicleRecord = {
  plateNumber: string
  company: string
  annualCheck: string
  maintenance: string
  nextReview: string
}

export const VEHICLE_TAB_OVERVIEW = "overview"
export const VEHICLE_TAB_ALARMS = "alarms"
export const VEHICLE_TAB_INSPECTIONS = "inspections"
export const ALL_VEHICLES_TAB = "all"

export const vehicleTableWrapperClass = "overflow-visible"
export const vehicleTableClass = "min-w-full w-max table-auto border-collapse bg-white text-[14px]"

export const operatingVehicles: OperatingVehicleRecord[] = [
  { plateNumber: "粤A12345", company: "穗安客运集团", vehicleType: "大型客车", district: "越秀区", onlineRate: "99.2%" },
  { plateNumber: "粤A35791", company: "城际旅游运输", vehicleType: "中型客车", district: "天河区", onlineRate: "97.8%" },
  { plateNumber: "粤A60218", company: "南粤巴士服务", vehicleType: "商务客车", district: "番禺区", onlineRate: "98.6%" },
  { plateNumber: "粤A66024", company: "湾区公交联运", vehicleType: "大型客车", district: "海珠区", onlineRate: "96.9%" },
  { plateNumber: "粤A78103", company: "白云城际客运", vehicleType: "中型客车", district: "白云区", onlineRate: "97.4%" },
  { plateNumber: "粤A80416", company: "广佛通勤巴士", vehicleType: "商务客车", district: "荔湾区", onlineRate: "98.1%" },
  { plateNumber: "粤A82577", company: "南沙旅运服务", vehicleType: "大型客车", district: "南沙区", onlineRate: "99.0%" },
  { plateNumber: "粤A84392", company: "城市快线运输", vehicleType: "中型客车", district: "黄埔区", onlineRate: "96.7%" },
  { plateNumber: "粤A88635", company: "增城会务出行", vehicleType: "商务客车", district: "增城区", onlineRate: "98.4%" },
  { plateNumber: "粤A90241", company: "穗北客运保障", vehicleType: "大型客车", district: "从化区", onlineRate: "97.6%" },
  { plateNumber: "粤A93158", company: "穗东通达客运", vehicleType: "中型客车", district: "黄埔区", onlineRate: "98.8%" },
  { plateNumber: "粤A95726", company: "珠江文旅巴士", vehicleType: "商务客车", district: "海珠区", onlineRate: "97.1%" },
]

export const alarmVehicles: AlarmVehicleRecord[] = [
  { plateNumber: "粤B88231", company: "鹏程危运", riskLevel: "高", latestAlarm: "疲劳驾驶", status: "待复核" },
  { plateNumber: "粤B91027", company: "海湾冷链运输", riskLevel: "中", latestAlarm: "超速报警", status: "处理中" },
  { plateNumber: "粤B73564", company: "深港危货联运", riskLevel: "高", latestAlarm: "偏航报警", status: "已派单" },
  { plateNumber: "粤B70186", company: "深南特种运输", riskLevel: "中", latestAlarm: "急加速报警", status: "待复核" },
  { plateNumber: "粤B72415", company: "湾区化工物流", riskLevel: "高", latestAlarm: "长时停车", status: "处理中" },
  { plateNumber: "粤B76803", company: "港城危品配送", riskLevel: "高", latestAlarm: "路线偏移", status: "已派单" },
  { plateNumber: "粤B79324", company: "大鹏冷运", riskLevel: "中", latestAlarm: "超速报警", status: "待复核" },
  { plateNumber: "粤B84517", company: "鹏海联运", riskLevel: "高", latestAlarm: "疲劳驾驶", status: "处理中" },
  { plateNumber: "粤B86752", company: "南湾危运服务", riskLevel: "中", latestAlarm: "异常熄火", status: "已派单" },
  { plateNumber: "粤B89361", company: "龙岗危货通", riskLevel: "高", latestAlarm: "偏航报警", status: "待复核" },
  { plateNumber: "粤B92640", company: "海港能源运输", riskLevel: "中", latestAlarm: "急减速报警", status: "处理中" },
  { plateNumber: "粤B95872", company: "鹏远特运", riskLevel: "高", latestAlarm: "超速报警", status: "已派单" },
]

export const inspectionVehicles: InspectionVehicleRecord[] = [
  { plateNumber: "粤C11328", company: "珠西运输", annualCheck: "2026-02-18", maintenance: "2026-03-01", nextReview: "2026-03-20" },
  { plateNumber: "粤C44862", company: "珠澳城配", annualCheck: "2026-02-25", maintenance: "2026-03-03", nextReview: "2026-03-24" },
  { plateNumber: "粤C77519", company: "湾区旅运", annualCheck: "2026-03-02", maintenance: "2026-03-05", nextReview: "2026-03-28" },
  { plateNumber: "粤C12654", company: "香洲通勤服务", annualCheck: "2026-02-16", maintenance: "2026-02-28", nextReview: "2026-03-18" },
  { plateNumber: "粤C23871", company: "斗门城配", annualCheck: "2026-02-20", maintenance: "2026-03-02", nextReview: "2026-03-21" },
  { plateNumber: "粤C34219", company: "横琴旅运", annualCheck: "2026-02-27", maintenance: "2026-03-04", nextReview: "2026-03-23" },
  { plateNumber: "粤C41783", company: "珠港会展客运", annualCheck: "2026-03-01", maintenance: "2026-03-06", nextReview: "2026-03-26" },
  { plateNumber: "粤C56308", company: "金湾巴士服务", annualCheck: "2026-03-03", maintenance: "2026-03-07", nextReview: "2026-03-29" },
  { plateNumber: "粤C68142", company: "高栏港运输", annualCheck: "2026-03-04", maintenance: "2026-03-08", nextReview: "2026-03-30" },
  { plateNumber: "粤C73460", company: "珠海机场快线", annualCheck: "2026-03-05", maintenance: "2026-03-09", nextReview: "2026-03-31" },
  { plateNumber: "粤C85217", company: "湾西公务出行", annualCheck: "2026-03-06", maintenance: "2026-03-10", nextReview: "2026-04-02" },
  { plateNumber: "粤C91845", company: "珠中跨城运务", annualCheck: "2026-03-07", maintenance: "2026-03-11", nextReview: "2026-04-04" },
]

export const operatingColumns: ResourceTableColumn[] = [
  { key: "plateNumber", label: "车牌号", filterType: "text", cellClass: "font-medium text-[#1F1F1F]" },
  { key: "company", label: "所属企业", filterType: "text" },
  { key: "vehicleType", label: "车辆类型", filterType: "tag" },
  { key: "district", label: "所属区域", filterType: "tag" },
  { key: "onlineRate", label: "在线率", filterType: "number", headerClass: "w-full", cellClass: "w-full text-[#3559E0]" },
]

export const alarmColumns: ResourceTableColumn[] = [
  { key: "plateNumber", label: "车牌号", filterType: "text", cellClass: "font-medium text-[#1F1F1F]" },
  { key: "company", label: "所属企业", filterType: "text" },
  { key: "riskLevel", label: "风险等级", filterType: "tag" },
  { key: "latestAlarm", label: "最新报警", filterType: "text" },
  { key: "status", label: "处理状态", filterType: "tag", headerClass: "w-full", cellClass: "w-full text-[#B65A2A]" },
]

export const inspectionColumns: ResourceTableColumn[] = [
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

export const operatingSortFieldOptions: SortFieldOption[] = [
  { value: "plateNumber", label: "车牌号", kind: "text" },
  { value: "company", label: "所属企业", kind: "text" },
  { value: "vehicleType", label: "车辆类型", kind: "text" },
  { value: "district", label: "所属区域", kind: "text" },
  { value: "onlineRate", label: "在线率", kind: "metric" },
]

export const operatingVehiclesPageConfig: ResourceListPageConfig<OperatingVehicleRecord, string> = {
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

export const alarmSortFieldOptions: SortFieldOption[] = [
  { value: "plateNumber", label: "车牌号", kind: "text" },
  { value: "company", label: "所属企业", kind: "text" },
  { value: "riskLevel", label: "风险等级", kind: "text" },
  { value: "latestAlarm", label: "最新报警", kind: "text" },
  { value: "status", label: "处理状态", kind: "text" },
]

export const alarmVehiclesPageConfig: ResourceListPageConfig<AlarmVehicleRecord, string> = {
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

export const inspectionSortFieldOptions: SortFieldOption[] = [
  { value: "plateNumber", label: "车牌号", kind: "text" },
  { value: "company", label: "所属企业", kind: "text" },
  { value: "annualCheck", label: "年检日期", kind: "text" },
  { value: "maintenance", label: "最近维保", kind: "text" },
  { value: "nextReview", label: "下次复核", kind: "text" },
]

export const inspectionVehiclesPageConfig: ResourceListPageConfig<InspectionVehicleRecord, string> = {
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

export function vehiclesPageTabs(activeTab: string): ResourceHeaderTab[] {
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
