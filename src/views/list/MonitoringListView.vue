<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"

import TablePage from "@/components/table-page/TablePage.vue"
import { createTablePageDefinition, useTablePage } from "@/components/table-page/useTablePage"
import type { TablePageSchema, TableQueryBarConfig } from "@/components/table-page/types"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { handleApiError } from "@/lib/api-errors"
import { fetchMonitoringAssetDevices } from "@/lib/monitoring-assets-api"
import {
  buildMonitoringSearchText,
  monitoringStatusOptions,
  monitoringStatusRenderer,
  type MonitoringDeviceRecord,
} from "@/lib/monitoring-mock"

const router = useRouter()
const route = useRoute()
const monitoringRows = ref<MonitoringDeviceRecord[]>([])
const loading = ref(false)
const errorMessage = ref("")
const searchQuery = ref(normalizeQueryValue(route.query.q))
const selectedPlatforms = ref<string[]>([])
const selectedStatuses = ref<string[]>([])
let latestRequestId = 0

const canClearQuery = computed(() => Boolean(
  searchQuery.value || selectedPlatforms.value.length || selectedStatuses.value.length,
))
const monitoringPlatformOptions = computed(() => (
  Array.from(new Set(monitoringRows.value.map(device => device.platform)))
    .filter(Boolean)
    .map(platform => ({ value: platform, label: platform }))
))

const filteredMonitoringDevices = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  return monitoringRows.value.filter((device) => {
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
      options: monitoringPlatformOptions.value,
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
  primaryActionLabel: "添加监控",
  showIndex: true,
  stickyHeader: true,
  tableClass: "whitespace-nowrap",
  emptyState: {
    title: "暂无监控设备",
    description: "当前筛选条件下没有可展示的监控设备。",
    icon: "ri-webcam-line",
  },
  rowActions: [
    {
      key: "edit-monitoring",
      label: "编辑",
      icon: "ri-edit-line",
      onClick: row => openMonitoringEdit(row as MonitoringDeviceRecord),
    },
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
      label: "设备名称",
      filterType: "text",
      emphasis: "strong",
      tone: "primary",
      cellClass: "whitespace-nowrap",
      sort: true,
    },
    {
      key: "deviceId",
      label: "设备编号",
      filterType: "text",
      tone: "muted",
      format: "numeric",
      cellClass: "whitespace-nowrap",
      sort: true,
    },
    {
      key: "statusLabel",
      label: "状态",
      filterType: "tag",
      cellRenderer: monitoringStatusRenderer,
      cellClass: "whitespace-nowrap",
      sort: true,
    },
    {
      key: "platform",
      label: "平台",
      filterType: "tag",
      cellClass: "whitespace-nowrap",
      sort: true,
    },
    {
      key: "customerName",
      label: "客户",
      filterType: "text",
      slot: "cell-customerName",
      cellClass: "whitespace-nowrap",
      sort: true,
    },
    {
      key: "parkName",
      label: "园区",
      filterType: "text",
      slot: "cell-parkName",
      cellClass: "whitespace-nowrap",
      sort: true,
    },
    {
      key: "buildingName",
      label: "建筑",
      filterType: "text",
      slot: "cell-buildingName",
      cellClass: "whitespace-nowrap",
      sort: true,
    },
    {
      key: "lastOnlineAt",
      label: "最后在线",
      filterType: "time",
      tone: "muted",
      format: "numeric",
      cellClass: "whitespace-nowrap",
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

onMounted(() => {
  void loadMonitoringAssets()
})

watch(
  () => normalizeQueryValue(route.query.q),
  (nextQuery) => {
    if (nextQuery !== searchQuery.value) {
      searchQuery.value = nextQuery
    }
  },
)

async function loadMonitoringAssets() {
  const requestId = ++latestRequestId
  loading.value = true
  errorMessage.value = ""

  try {
    const devices = await fetchMonitoringAssetDevices()

    if (requestId !== latestRequestId) {
      return
    }

    monitoringRows.value = devices
  }
  catch (error) {
    if (requestId !== latestRequestId) {
      return
    }

    monitoringRows.value = []
    errorMessage.value = handleApiError(error, {
      title: "监控资产加载失败",
      fallback: "监控资产加载失败，请稍后重试。",
    })
  }
  finally {
    if (requestId === latestRequestId) {
      loading.value = false
    }
  }
}

function openMonitoringDetail(row: MonitoringDeviceRecord) {
  void router.push({
    name: "monitoring-detail",
    params: { id: row.id },
  })
}

function openMonitoringEdit(row: MonitoringDeviceRecord) {
  void router.push({
    name: "monitoring-edit",
    params: { id: row.id },
  })
}

function handleCreateMonitoring() {
  void router.push({ name: "monitoring-create" })
}

function jumpToCustomerDetail(row: Record<string, unknown>) {
  const currentRow = row as MonitoringDeviceRecord
  if (!currentRow.customerUuid) {
    return
  }

  void router.push({
    name: "customer-detail",
    params: { id: currentRow.customerUuid },
  })
}

function jumpToParkDetail(row: Record<string, unknown>) {
  const currentRow = row as MonitoringDeviceRecord
  if (!currentRow.parkUuid) {
    return
  }

  void router.push({
    name: "park-detail",
    params: { id: currentRow.parkUuid },
  })
}

function jumpToBuildingDetail(row: Record<string, unknown>) {
  const currentRow = row as MonitoringDeviceRecord
  if (!currentRow.buildingUuid) {
    return
  }

  void router.push({
    name: "building-detail",
    params: { id: currentRow.buildingUuid },
    query: {
      parkUuid: currentRow.parkUuid || undefined,
      customerUuid: currentRow.customerUuid || undefined,
    },
  })
}

function handleQueryChange(payload: { key: string; value: string | string[] }) {
  if (payload.key === "q") {
    updateSearchQuery(typeof payload.value === "string" ? payload.value : "")
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
  updateSearchQuery("")
  selectedPlatforms.value = []
  selectedStatuses.value = []
}

function updateSearchQuery(value: string) {
  const normalizedValue = value.trim()
  searchQuery.value = normalizedValue
  syncSearchQueryToRoute(normalizedValue)
}

function syncSearchQueryToRoute(value: string) {
  const currentValue = normalizeQueryValue(route.query.q)

  if (currentValue === value) {
    return
  }

  void router.replace({
    query: {
      ...route.query,
      q: value || undefined,
    },
  })
}

function normalizeQueryValue(value: unknown) {
  if (Array.isArray(value)) {
    return normalizeQueryValue(value[0])
  }

  return typeof value === "string" ? value.trim() : ""
}

</script>

<template>
  <section class="flex min-h-0 flex-1 flex-col">
    <div v-if="errorMessage" class="px-4 pb-3 pt-3">
      <Alert variant="destructive">
        <AlertTitle>监控资产加载失败</AlertTitle>
        <AlertDescription class="flex flex-wrap items-center gap-3">
          <span>{{ errorMessage }}</span>
          <Button size="sm" variant="outline" class="gap-2" @click="loadMonitoringAssets">
            <i class="ri-refresh-line text-sm" />
            重试
          </Button>
        </AlertDescription>
      </Alert>
    </div>

    <TablePage
      :page="page"
      :loading="loading"
      :query-bar="queryBar"
      fill-available-height
      @refresh-action="loadMonitoringAssets"
      @primary-action="handleCreateMonitoring"
      @query-change="handleQueryChange"
      @query-clear="handleQueryClear"
    >
      <template #cell-customerName="{ row }">
        <button
          v-if="row.customerUuid"
          type="button"
          class="inline-flex max-w-full items-center gap-1 text-left text-link transition-colors hover:text-link-hover"
          @click.stop="jumpToCustomerDetail(row)"
        >
          <span class="truncate">{{ row.customerName }}</span>
          <i class="ri-arrow-right-up-line shrink-0 text-sm" />
        </button>
        <span v-else class="truncate text-muted-foreground">{{ row.customerName }}</span>
      </template>

      <template #cell-parkName="{ row }">
        <button
          v-if="row.parkUuid"
          type="button"
          class="inline-flex max-w-full items-center gap-1 text-left text-link transition-colors hover:text-link-hover"
          @click.stop="jumpToParkDetail(row)"
        >
          <span class="truncate">{{ row.parkName }}</span>
          <i class="ri-arrow-right-up-line shrink-0 text-sm" />
        </button>
        <span v-else class="truncate text-muted-foreground">{{ row.parkName }}</span>
      </template>

      <template #cell-buildingName="{ row }">
        <button
          v-if="row.buildingUuid"
          type="button"
          class="inline-flex max-w-full items-center gap-1 text-left text-link transition-colors hover:text-link-hover"
          @click.stop="jumpToBuildingDetail(row)"
        >
          <span class="truncate">{{ row.buildingName }}</span>
          <i class="ri-arrow-right-up-line shrink-0 text-sm" />
        </button>
        <span v-else class="truncate text-muted-foreground">{{ row.buildingName }}</span>
      </template>
    </TablePage>
  </section>
</template>
