<script setup lang="ts">
import TablePage from "@/components/table-page/TablePage.vue"
import { createTablePageDefinition, useTablePage } from "@/components/table-page/useTablePage"
import type { TablePageSchema } from "@/components/table-page/types"

type MediaLibraryRecord = {
  id: string
}

const schema: TablePageSchema<MediaLibraryRecord> = {
  title: "媒体库",
  description: "媒体素材管理能力暂未接入，当前先提供导航入口和页面占位。",
  rowKey: "id",
  data: [],
  showIndex: true,
  stickyHeader: true,
  emptyState: {
    title: "媒体库暂未开放",
    description: "当前没有可用的媒体素材列表和管理接口，后续接入后会在这里统一维护。",
    icon: "ri-book-shelf-line",
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
