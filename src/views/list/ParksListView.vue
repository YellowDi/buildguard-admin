<script setup lang="ts">
import { useRoute } from "vue-router"

import TablePage from "@/components/table-page/TablePage.vue"
import { useTablePage } from "@/components/table-page/useTablePage"
import type { TablePageSchema } from "@/components/table-page/types"
import { useRouteTableSearch } from "@/composables/useRouteTableSearch"
import parksData from "@/mocks/parks.json"

type ParkRecord = {
  id: number
  name: string
  type: string
  district: string
  companyCount: number
  buildingCount: number
  managerName: string
  managerPhone: string
  area: number
  riskLevel: "高风险" | "中风险" | "低风险"
  launchedAt: string
  note: string
}

const parks = parksData as ParkRecord[]

const schema: TablePageSchema<ParkRecord> = {
  title: "园区",
  rowKey: "id",
  data: parks,
  showIndex: true,
  stickyHeader: true,
  columns: [
    {
      key: "name",
      label: "园区名称",
      filterType: "text",
      emphasis: "strong",
      tone: "primary",
      filter: {
        type: "text",
        placeholder: "输入园区名称",
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "type",
      label: "园区类型",
      filterType: "tag",
      filter: {
        type: "tag",
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "district",
      label: "行政区域",
      filterType: "tag",
      filter: {
        type: "tag",
      },
      sort: true,
    },
    {
      key: "companyCount",
      label: "入园企业数",
      filterType: "number",
      variant: "metric",
      filter: {
        type: "number",
        placeholder: "输入企业数",
      },
      sort: {
        kind: "metric",
      },
      cellRenderer: {
        kind: "metric-unit",
        unit: "家",
      },
    },
    {
      key: "buildingCount",
      label: "建筑数量",
      filterType: "number",
      variant: "metric",
      filter: {
        type: "number",
        placeholder: "输入建筑数量",
      },
      sort: {
        kind: "metric",
      },
      cellRenderer: {
        kind: "metric-unit",
        unit: "栋",
      },
    },
    {
      key: "managerName",
      label: "园区负责人",
      filterType: "contact",
      variant: "contact",
      filter: {
        type: "text",
        placeholder: "输入负责人或手机号",
        defaultVisible: true,
        value: row => `${row.managerName} ${row.managerPhone}`,
      },
      sort: {
        label: "园区负责人",
        value: row => `${row.managerName} ${row.managerPhone}`,
      },
      cellRenderer: {
        kind: "dual-inline",
        primaryKey: "managerName",
        secondaryKey: "managerPhone",
      },
    },
    {
      key: "area",
      label: "总面积",
      filterType: "number",
      variant: "metric",
      format: "numeric",
      filter: {
        type: "number",
        placeholder: "输入总面积",
      },
      sort: {
        kind: "metric",
      },
      cellRenderer: {
        kind: "metric-unit",
        unit: "㎡",
      },
    },
    {
      key: "riskLevel",
      label: "风险等级",
      filterType: "tag",
      tone: "warning",
      filter: {
        type: "tag",
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "launchedAt",
      label: "投运时间",
      filterType: "time",
      format: "numeric",
      filter: {
        type: "date",
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
    storageKey: "parks-sort-preferences",
    initialField: "companyCount",
    initialDirection: "desc",
  },
  tabs: {
    mode: "enum",
    all: { label: "全部", value: "all" },
    field: "type",
  },
}

const page = useTablePage(schema)
const route = useRoute()

useRouteTableSearch(page, route)

function buildPageFilterText(row: ParkRecord) {
  return [
    row.name,
    row.type,
    row.district,
    row.companyCount,
    row.buildingCount,
    row.managerName,
    row.managerPhone,
    row.area,
    row.riskLevel,
    row.launchedAt,
    row.note,
  ].join(" ")
}
</script>

<template>
  <TablePage :page="page" />
</template>
