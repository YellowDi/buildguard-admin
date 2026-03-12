<script setup lang="ts">
import TablePage from "@/components/table-page/TablePage.vue"
import { useTablePage } from "@/components/table-page/useTablePage"
import type { TablePageSchema } from "@/components/table-page/types"

type OutboundTaskRecord = {
  id: number
  taskCode: string
  customerName: string
  company: string
  assignee: string
  plannedAt: string
  status: string
  note: string
}

const outboundTasks: OutboundTaskRecord[] = []

const schema: TablePageSchema<OutboundTaskRecord> = {
  title: "外呼任务",
  rowKey: "id",
  data: outboundTasks,
  showIndex: true,
  stickyHeader: true,
  emptyState: {
    title: "暂无外呼任务",
    description: "当前没有待执行的呼叫任务。新任务创建后，坐席分配、计划时间和处理状态会显示在这里。",
    icon: "ri-customer-service-2-line",
  },
  columns: [
    {
      key: "taskCode",
      label: "任务编号",
      filterType: "text",
      emphasis: "strong",
      tone: "primary",
      filter: {
        type: "text",
        placeholder: "输入任务编号",
      },
      sort: true,
    },
    {
      key: "customerName",
      label: "呼叫对象",
      filterType: "text",
      filter: {
        type: "text",
        placeholder: "输入呼叫对象",
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
      },
      sort: true,
    },
    {
      key: "assignee",
      label: "坐席",
      filterType: "text",
      filter: {
        type: "text",
        placeholder: "输入坐席姓名",
      },
      sort: true,
    },
    {
      key: "plannedAt",
      label: "计划时间",
      filterType: "time",
      format: "numeric",
      filter: {
        type: "date",
      },
      sort: true,
    },
    {
      key: "status",
      label: "任务状态",
      filterType: "tag",
      tone: "warning",
      filter: {
        type: "tag",
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
  sort: {
    storageKey: "call-center-outbound-tasks-sort-preferences",
    initialField: "plannedAt",
    initialDirection: "desc",
  },
}

const page = useTablePage(schema)
</script>

<template>
  <TablePage :page="page" />
</template>
