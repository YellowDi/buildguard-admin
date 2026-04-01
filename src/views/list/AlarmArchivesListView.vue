<script setup lang="ts">
import { useRoute } from "vue-router"

import TablePage from "@/components/table-page/TablePage.vue"
import { archiveStatusMap } from "@/components/table-page/statusPresets"
import { useTablePage } from "@/components/table-page/useTablePage"
import type { TablePageSchema } from "@/components/table-page/types"
import { useRouteTableSearch } from "@/composables/useRouteTableSearch"
import alarmArchivesData from "@/mocks/alarm-archives.json"

type AlarmArchiveRecord = {
  id: number
  archiveNumber: string
  plateNumber: string
  company: string
  alarmType: string
  riskLevel: string
  archivedAt: string
  archiveStatus: string
  archivedBy: string
  note: string
}

const alarmArchives = alarmArchivesData as AlarmArchiveRecord[]

const schema: TablePageSchema<AlarmArchiveRecord> = {
  title: "历史归档",
  description: "所有报警历史归档列表",
  rowKey: "id",
  data: alarmArchives,
  showIndex: true,
  stickyHeader: true,
  rowActions: [
    {
      key: "view-detail",
      label: "查看归档",
      onClick: row => console.info("查看历史归档", row),
    },
  ],
  columns: [
    {
      key: "archiveNumber",
      label: "归档编号",
      filterType: "text",
      emphasis: "strong",
      tone: "primary",
      filter: {
        type: "text",
        placeholder: "输入归档编号",
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "plateNumber",
      label: "车牌号",
      filterType: "text",
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
      key: "alarmType",
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
      },
      sort: {
        value: row => getRiskLevelWeight(row.riskLevel),
      },
    },
    {
      key: "archivedAt",
      label: "归档时间",
      filterType: "time",
      tone: "muted",
      format: "numeric",
      filter: {
        type: "date",
        defaultVisible: true,
        value: row => extractDatePart(row.archivedAt),
      },
      sort: true,
    },
    {
      key: "archiveStatus",
      label: "归档状态",
      filterType: "tag",
      tone: "warning",
      cellRenderer: {
        kind: "status",
        map: archiveStatusMap,
        fallback: { tone: "gray", icon: "dot" },
      },
      filter: {
        type: "tag",
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "archivedBy",
      label: "归档人",
      filterType: "text",
      filter: {
        type: "text",
        placeholder: "输入归档人",
      },
      sort: true,
    },
    {
      key: "note",
      label: "归档说明",
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
    storageKey: "alarm-archives-sort-preferences",
    initialField: "archivedAt",
    initialDirection: "desc",
  },
  tabs: {
    mode: "enum",
    all: { label: "全部", value: "all" },
    field: "archiveStatus",
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

function buildPageFilterText(row: AlarmArchiveRecord) {
  return [
    row.archiveNumber,
    row.plateNumber,
    row.company,
    row.alarmType,
    row.riskLevel,
    row.archivedAt,
    row.archiveStatus,
    row.archivedBy,
    row.note,
  ].join(" ")
}
</script>

<template>
  <TablePage :page="page" />
</template>
