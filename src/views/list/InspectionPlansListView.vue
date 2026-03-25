<script setup lang="ts">
import { useRoute } from "vue-router"

import TablePage from "@/components/table-page/TablePage.vue"
import { processStatusMap } from "@/components/table-page/statusPresets"
import { useTablePage } from "@/components/table-page/useTablePage"
import type { TablePageSchema } from "@/components/table-page/types"
import { useRouteTableSearch } from "@/composables/useRouteTableSearch"
import inspectionPlansData from "@/mocks/inspection-plans.json"

type InspectionPlanRecord = {
  id: string
  planName: string
  serviceName: string
  customerName: string
  inspectionScope: string
  cycle: string
  owner: string
  nextExecutionAt: string
  status: string
  note: string
}

const inspectionPlans = inspectionPlansData as InspectionPlanRecord[]

const schema: TablePageSchema<InspectionPlanRecord> = {
  title: "检测计划",
  description: "检测计划静态列表，当前暂未接入接口。",
  rowKey: "id",
  data: inspectionPlans,
  showIndex: true,
  stickyHeader: true,
  rowActions: [
    {
      key: "view-detail",
      label: "查看详情",
      onClick: row => console.info("查看检测计划详情", row),
    },
  ],
  columns: [
    {
      key: "planName",
      label: "计划名称",
      filterType: "text",
      emphasis: "strong",
      tone: "primary",
      filter: {
        type: "text",
        placeholder: "输入计划名称",
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "serviceName",
      label: "关联服务",
      filterType: "text",
      filter: {
        type: "text",
        placeholder: "输入服务名称",
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "customerName",
      label: "所属客户",
      filterType: "text",
      filter: {
        type: "text",
        placeholder: "输入客户名称",
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "inspectionScope",
      label: "检测范围",
      filterType: "text",
      width: "fill",
      filter: {
        type: "text",
        placeholder: "输入检测范围",
      },
      sort: true,
    },
    {
      key: "cycle",
      label: "执行周期",
      filterType: "tag",
      filter: {
        type: "tag",
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "owner",
      label: "负责人",
      filterType: "text",
      filter: {
        type: "text",
        placeholder: "输入负责人",
      },
      sort: true,
    },
    {
      key: "nextExecutionAt",
      label: "下次执行时间",
      filterType: "time",
      format: "numeric",
      filter: {
        type: "date",
        defaultVisible: true,
        value: row => extractDatePart(row.nextExecutionAt),
      },
      sort: true,
    },
    {
      key: "status",
      label: "状态",
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
    storageKey: "inspection-plans-sort-preferences",
    initialField: "nextExecutionAt",
    initialDirection: "asc",
  },
  tabs: {
    mode: "enum",
    all: { label: "全部", value: "all" },
    field: "status",
    order: ["未开始", "进行中", "待审核", "已暂停", "已完成"],
  },
}

const page = useTablePage(schema)
const route = useRoute()

useRouteTableSearch(page, route)

function extractDatePart(value: string) {
  const [datePart] = value.split(" ")
  return datePart ?? ""
}

function buildPageFilterText(row: InspectionPlanRecord) {
  return [
    row.id,
    row.planName,
    row.serviceName,
    row.customerName,
    row.inspectionScope,
    row.cycle,
    row.owner,
    row.nextExecutionAt,
    row.status,
    row.note,
  ].join(" ")
}
</script>

<template>
  <TablePage :page="page" />
</template>
