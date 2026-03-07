import type { SortFieldOption } from "@/components/resource/SortPopover.vue"
import type {
  ResourceDateFilterState,
  ResourceNumberFilterState,
  ResourceTableColumn,
  ResourceTagFilterState,
  ResourceTextFilterState,
} from "@/components/resource/types"
import type { ResourceListPageConfig } from "@/components/resource/useResourceListController"

export type CompanyRecord = {
  id: number
  name: string
  type: string
  district: string
  vehicles: number
  legalPerson: string
  phone: string
  startDate: string
  serviceDays: number
  serviceDaysDisplay: string
  endDate: string
  lastUpdated: string
  note: string
}

export const ALL_COMPANIES_TAB = "all"

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

export const companiesSortFieldOptions: SortFieldOption[] = [
  { value: "name", label: "企业名称", kind: "text" },
  { value: "type", label: "企业类型", kind: "text" },
  { value: "district", label: "行政区域", kind: "text" },
  { value: "vehicles", label: "车辆总数", kind: "metric" },
  { value: "legalPerson", label: "法人信息", kind: "text" },
  { value: "serviceDays", label: "服务剩余时长", kind: "metric" },
  { value: "startDate", label: "开始日期", kind: "text" },
  { value: "endDate", label: "结束日期", kind: "text" },
]

export const companiesColumns: ResourceTableColumn[] = [
  { key: "name", label: "企业名称", filterType: "text", headerClass: "pr-3", cellClass: "font-medium text-[#1F1F1F]" },
  { key: "type", label: "企业类型", filterType: "tag", cellClass: "text-[#3F3F3F]" },
  { key: "district", label: "行政区域", filterType: "tag", cellClass: "text-[#3F3F3F]" },
  { key: "vehicles", label: "车辆总数", filterType: "number", cellClass: "tabular-nums text-[#2F2F2F]" },
  {
    key: "legalPerson",
    label: "法人信息",
    filterType: "contact",
    cellRenderer: {
      kind: "dual-inline",
      primaryKey: "legalPerson",
      secondaryKey: "phone",
      primaryClass: "text-[#1F1F1F]",
      secondaryClass: "text-[#9A9A9A]",
    },
  },
  { key: "serviceDaysDisplay", label: "服务剩余时长", filterType: "number", cellClass: "text-[#3559E0] tabular-nums" },
  { key: "startDate", label: "开始日期", filterType: "time", cellClass: "tabular-nums text-[#2F2F2F]" },
  { key: "endDate", label: "结束日期", filterType: "time", cellClass: "tabular-nums text-[#2F2F2F]" },
  { key: "note", label: "备注", filterType: "none", headerClass: "w-full", cellClass: "w-full text-[#6E6E6E]", cellRenderer: { kind: "note" } },
]

export const companiesPageConfig: ResourceListPageConfig<CompanyRecord, string> = {
  title: "企业",
  primaryActionLabel: "添加企业",
  columns: companiesColumns,
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
  sortFieldOptions: companiesSortFieldOptions,
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
  getSortSummaryLabel: field => companiesSortFieldOptions.find(option => option.value === field)?.label ?? "服务剩余时长",
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
  isSortField: value => typeof value === "string" && companiesSortFieldOptions.some(option => option.value === value),
}

function getCompanyTypes(rows: CompanyRecord[]) {
  return [...new Set(rows.map(row => row.type))]
}
