<script setup lang="ts">
import ResourceListPage from "@/components/resource/ResourceListPage.vue"
import { useResourceList } from "@/components/resource/useResourceList"
import type { ResourceListSchema } from "@/components/resource/types"
import companiesData from "@/data/companies.json"

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

const schema: ResourceListSchema<CompanyRecord> = {
  title: "企业",
  rowKey: "id",
  data: companies,
  primaryActionLabel: "添加企业",
  showIndex: true,
  stickyHeader: true,
  wrapperClass: "overflow-visible",
  tableClass: "min-w-full w-max table-auto border-collapse bg-white text-[14px]",
  columns: [
    {
      key: "name",
      label: "企业名称",
      filterType: "text",
      searchable: true,
      filter: {
        type: "text",
        placeholder: "输入企业名称",
        defaultVisible: true,
      },
      sort: true,
      headerClass: "pr-3",
      cellClass: "font-medium text-[#1F1F1F]",
    },
    {
      key: "type",
      label: "企业类型",
      filterType: "tag",
      searchable: true,
      filter: {
        type: "tag",
      },
      sort: true,
      cellClass: "text-[#3F3F3F]",
    },
    {
      key: "district",
      label: "行政区域",
      filterType: "tag",
      searchable: true,
      filter: {
        type: "tag",
      },
      sort: true,
      cellClass: "text-[#3F3F3F]",
    },
    {
      key: "vehicles",
      label: "车辆总数",
      filterType: "number",
      searchable: row => `${row.vehicles}`,
      filter: {
        type: "number",
        placeholder: "输入车辆总数",
        defaultVisible: true,
      },
      sort: {
        kind: "metric",
      },
      cellClass: "tabular-nums text-[#2F2F2F]",
    },
    {
      key: "legalPerson",
      label: "法人信息",
      filterType: "contact",
      searchable: row => `${row.legalPerson} ${row.phone}`,
      filter: {
        type: "text",
        placeholder: "输入法人或手机号",
        defaultVisible: true,
        value: row => `${row.legalPerson} ${row.phone}`,
      },
      sort: {
        label: "法人信息",
        value: row => `${row.legalPerson} ${row.phone}`,
      },
      cellRenderer: {
        kind: "dual-inline",
        primaryKey: "legalPerson",
        secondaryKey: "phone",
      },
    },
    {
      key: "serviceDays",
      label: "服务剩余时长",
      filterType: "number",
      searchable: row => `${row.serviceDays}`,
      filter: {
        type: "number",
        placeholder: "输入剩余时长",
      },
      sort: {
        kind: "metric",
      },
      cellRenderer: {
        kind: "metric-unit",
        unit: "天",
      },
    },
    {
      key: "startDate",
      label: "开始日期",
      filterType: "time",
      searchable: true,
      filter: {
        type: "date",
      },
      sort: true,
      cellClass: "tabular-nums text-[#2F2F2F]",
    },
    {
      key: "endDate",
      label: "结束日期",
      filterType: "time",
      searchable: true,
      filter: {
        type: "date",
      },
      sort: true,
      cellClass: "tabular-nums text-[#2F2F2F]",
    },
    {
      key: "note",
      label: "备注",
      filterType: "none",
      searchable: true,
      headerClass: "w-full",
      cellClass: "w-full text-[#6E6E6E]",
      cellRenderer: { kind: "note" },
    },
  ],
  filters: [
    {
      key: "在页面中",
      label: "在页面中",
      type: "text",
      fixed: true,
      placeholder: "输入页面内筛选条件",
      value: row => row.note,
    },
  ],
  sort: {
    storageKey: "companies-sort-preferences",
    initialField: "serviceDays",
    initialDirection: "desc",
  },
  tabs: {
    mode: "enum",
    all: { label: "全部", value: "all" },
    field: "type",
  },
}

const page = useResourceList(schema)

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
  <ResourceListPage :page="page" />
</template>
