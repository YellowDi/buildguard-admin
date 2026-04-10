<script setup lang="ts">
import TablePage from "@/components/table-page/TablePage.vue"
import { createTablePageDefinition, useTablePage } from "@/components/table-page/useTablePage"
import type { TablePageSchema } from "@/components/table-page/types"

type MonitoringRecord = {
  id: string
}

const schema: TablePageSchema<MonitoringRecord> = {
  title: "监控",
  description: "监控设备能力暂未接入，当前仅保留页面占位。",
  rowKey: "id",
  data: [],
  showIndex: true,
  stickyHeader: true,
  emptyState: {
    title: "监控功能暂未接入",
    description: "当前没有可用的监控字段和列表接口，待后端能力完善后再开放。",
    icon: "ri-radar-line",
  },
  columns: [],
  filters: [],
  tabs: {
    mode: "none",
  },
}

const page = useTablePage(createTablePageDefinition(schema))
</script>

<template>
  <section class="flex min-h-0 flex-1 flex-col">
    <TablePage :page="page" fill-available-height />
  </section>
</template>
