<script setup lang="ts">
import { useRoute } from "vue-router"

import TablePage from "@/components/table-page/TablePage.vue"
import { processStatusMap } from "@/components/table-page/statusPresets"
import { useTablePage } from "@/components/table-page/useTablePage"
import type { TablePageSchema } from "@/components/table-page/types"
import { useRouteTableSearch } from "@/composables/useRouteTableSearch"
import alarmQueriesData from "@/mocks/alarm-queries.json"

type AlarmQueryRecord = {
  id: number
  plateNumber: string
  company: string
  riskLevel: string
  latestAlarm: string
  alarmTime: string
  status: string
  handler: string
  note: string
}

const alarmQueries = alarmQueriesData as AlarmQueryRecord[]

const schema: TablePageSchema<AlarmQueryRecord> = {
  title: "报警查询",
  description: "所有报警事件查询列表",
  rowKey: "id",
  data: alarmQueries,
  showIndex: true,
  stickyHeader: true,
  rowActions: [
    {
      key: "view-detail",
      label: "查看详情",
      onClick: row => console.info("查看报警详情", row),
    },
  ],
  onRowClick: row => console.info("查看报警详情", row),
  columns: [
    {
      key: "plateNumber",
      label: "车牌号",
      filterType: "text",
      emphasis: "strong",
      tone: "primary",
      filter: {
        type: "text",
        placeholder: "输入车牌号",
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "company",
      label: "所属企业",
      filterType: "text",
      filter: {
        type: "text",
        placeholder: "输入企业名称",
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "latestAlarm",
      label: "报警类型",
      filterType: "tag",
      filter: {
        type: "tag",
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "riskLevel",
      label: "风险等级",
      filterType: "tag",
      filter: {
        type: "tag",
        defaultVisible: true,
      },
      sort: {
        value: row => getRiskLevelWeight(row.riskLevel),
      },
    },
    {
      key: "alarmTime",
      label: "报警时间",
      filterType: "time",
      tone: "muted",
      format: "numeric",
      filter: {
        type: "date",
        defaultVisible: true,
        value: row => extractDatePart(row.alarmTime),
      },
      sort: true,
    },
    {
      key: "status",
      label: "处理状态",
      filterType: "tag",
      tone: "warning",
      cellRenderer: {
        kind: "status",
        map: processStatusMap,
        fallback: { tone: "gray", icon: "dot" },
      },
      filter: {
        type: "tag",
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "handler",
      label: "处理人",
      filterType: "text",
      filter: {
        type: "text",
        placeholder: "输入处理人",
      },
      sort: true,
    },
    {
      key: "note",
      label: "备注",
      filterType: "none",
      variant: "note",
      format: "note",
      tone: "muted",
      width: "fill",
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
      value: row => buildPageFilterText(row),
    },
  ],
  sort: {
    storageKey: "alarm-queries-sort-preferences",
    initialField: "alarmTime",
    initialDirection: "desc",
  },
  tabs: {
    mode: "enum",
    all: { label: "全部", value: "all" },
    field: "status",
  },
}

const page = useTablePage(schema)
const route = useRoute()

useRouteTableSearch(page, route)

function extractDatePart(value: string) {
  const [datePart] = value.split(" ")
  return datePart ?? ""
}

function getRiskLevelWeight(value: string) {
  if (value === "高") return 3
  if (value === "中") return 2
  if (value === "低") return 1
  return 0
}

function buildPageFilterText(row: AlarmQueryRecord) {
  return [
    row.plateNumber,
    row.company,
    row.latestAlarm,
    row.riskLevel,
    row.alarmTime,
    row.status,
    row.handler,
    row.note,
  ].join(" ")
}
</script>

<template>
  <TablePage :page="page" />
</template>
