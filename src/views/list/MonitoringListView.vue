<script setup lang="ts">
import { computed, ref } from "vue"
import { useRouter } from "vue-router"

import TablePage from "@/components/table-page/TablePage.vue"
import { createTablePageDefinition, useTablePage } from "@/components/table-page/useTablePage"
import type { TablePageSchema, TableQueryBarConfig } from "@/components/table-page/types"
import {
  buildMonitoringSearchText,
  monitoringDevices,
  monitoringPlatformOptions,
  monitoringStatusOptions,
  monitoringStatusRenderer,
  type MonitoringDeviceRecord,
} from "@/lib/monitoring-mock"

const router = useRouter()
const searchQuery = ref("")
const selectedPlatforms = ref<string[]>([])
const selectedStatuses = ref<string[]>([])

const canClearQuery = computed(() => Boolean(
  searchQuery.value || selectedPlatforms.value.length || selectedStatuses.value.length,
))

const filteredMonitoringDevices = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  return monitoringDevices.filter((device) => {
    if (query && !buildMonitoringSearchText(device).includes(query)) {
      return false
    }

    if (selectedPlatforms.value.length && !selectedPlatforms.value.includes(device.platform)) {
      return false
    }

    if (selectedStatuses.value.length && !selectedStatuses.value.includes(device.statusLabel)) {
      return false
    }

    return true
  })
})

const queryBar = computed<TableQueryBarConfig>(() => ({
  controls: [
    {
      type: "search",
      key: "q",
      queryKey: "q",
      label: "设备",
      icon: "ri-search-line",
      placeholder: "搜索设备、编号、客户或位置",
      value: searchQuery.value,
      expandedWidth: 276,
      collapsedMaxWidth: 276,
    },
    {
      type: "select",
      key: "platforms",
      queryKey: "platforms",
      label: "平台",
      icon: "ri-base-station-line",
      multiple: true,
      options: monitoringPlatformOptions,
      value: [...selectedPlatforms.value],
      placeholder: "选择平台",
      expandedWidth: 220,
      collapsedMaxWidth: 220,
    },
    {
      type: "select",
      key: "statuses",
      queryKey: "statuses",
      label: "状态",
      icon: "ri-pulse-line",
      multiple: true,
      options: monitoringStatusOptions,
      value: [...selectedStatuses.value],
      placeholder: "选择状态",
      expandedWidth: 180,
      collapsedMaxWidth: 180,
    },
  ],
  values: {
    q: searchQuery.value,
    platforms: [...selectedPlatforms.value],
    statuses: [...selectedStatuses.value],
  },
  canClear: canClearQuery.value,
}))

const schema: TablePageSchema<MonitoringDeviceRecord> = {
  title: "监控",
  description: "查看监控设备清单，先用公开测试流完成前端播放和查看流程。",
  rowKey: "id",
  data: [],
  showIndex: true,
  stickyHeader: true,
  emptyState: {
    title: "暂无监控设备",
    description: "当前筛选条件下没有可展示的监控设备。",
    icon: "ri-webcam-line",
  },
  rowActions: [
    {
      key: "view-monitoring",
      label: "查看",
      icon: "ri-play-circle-line",
      onClick: row => openMonitoringDetail(row as MonitoringDeviceRecord),
    },
  ],
  onRowClick: row => openMonitoringDetail(row as MonitoringDeviceRecord),
  onQuickAction: row => openMonitoringDetail(row as MonitoringDeviceRecord),
  columns: [
    {
      key: "deviceName",
      label: "设备",
      filterType: "text",
      emphasis: "strong",
      tone: "primary",
      cellRenderer: {
        kind: "dual-stack",
        primaryKey: "deviceName",
        secondaryKey: "deviceId",
      },
      sort: true,
    },
    {
      key: "statusLabel",
      label: "状态",
      filterType: "tag",
      cellRenderer: monitoringStatusRenderer,
      sort: true,
    },
    {
      key: "platform",
      label: "平台",
      filterType: "tag",
      sort: true,
    },
    {
      key: "customerName",
      label: "客户",
      filterType: "text",
      sort: true,
    },
    {
      key: "parkName",
      label: "园区",
      filterType: "text",
      sort: true,
    },
    {
      key: "buildingName",
      label: "位置",
      filterType: "text",
      sort: true,
    },
    {
      key: "lastOnlineAt",
      label: "最后在线",
      filterType: "time",
      tone: "muted",
      format: "numeric",
      sort: true,
    },
  ],
  filters: [],
  sort: {
    storageKey: "monitoring-list-sort-preferences",
    initialField: "lastOnlineAt",
    initialDirection: "desc",
  },
  tabs: {
    mode: "none",
  },
}

const page = useTablePage({
  ...createTablePageDefinition(schema),
  rows: filteredMonitoringDevices,
})
page.showControls.value = true

function openMonitoringDetail(row: MonitoringDeviceRecord) {
  void router.push({
    name: "monitoring-detail",
    params: { id: row.id },
  })
}

function handleQueryChange(payload: { key: string; value: string | string[] }) {
  if (payload.key === "q") {
    searchQuery.value = typeof payload.value === "string" ? payload.value.trim() : ""
    return
  }

  if (payload.key === "platforms") {
    selectedPlatforms.value = Array.isArray(payload.value) ? payload.value : []
    return
  }

  if (payload.key === "statuses") {
    selectedStatuses.value = Array.isArray(payload.value) ? payload.value : []
  }
}

function handleQueryClear() {
  searchQuery.value = ""
  selectedPlatforms.value = []
  selectedStatuses.value = []
}
</script>

<template>
  <section class="flex min-h-0 flex-1 flex-col">
    <TablePage
      :page="page"
      :query-bar="queryBar"
      fill-available-height
      @query-change="handleQueryChange"
      @query-clear="handleQueryClear"
    />
  </section>
</template>
