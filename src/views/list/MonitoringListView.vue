<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { useRoute } from "vue-router"
import { toast } from "vue-sonner"

import TablePageLoading from "@/components/loading/TablePageLoading.vue"
import TablePage from "@/components/table-page/TablePage.vue"
import { createTablePageDefinition, useTablePage } from "@/components/table-page/useTablePage"
import type { TablePageSchema, TableStatusOption } from "@/components/table-page/types"
import { useRouteTableSearch } from "@/composables/useRouteTableSearch"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationFirst,
  PaginationItem,
  PaginationLast,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { handleApiError } from "@/lib/api-errors"
import { fetchBuildings } from "@/lib/buildings-api"
import { fetchCustomers } from "@/lib/customers-api"
import { fetchParks } from "@/lib/parks-api"

type MonitoringRecord = {
  id: string
  deviceName: string
  platform: string
  deviceId: string
  customerName: string
  parkName: string
  buildingName: string
  status: string
  onlineRate: number
  lastHeartbeat: string
  note: string
}

const monitoringRows = ref<MonitoringRecord[]>([])
const loading = ref(false)
const errorMessage = ref("")
const pageNum = ref(1)
const pageSize = ref(50)
const total = ref(0)
let latestRequestId = 0

const route = useRoute()
const showInitialLoading = computed(() => loading.value && !monitoringRows.value.length && !errorMessage.value)

const monitoringStatusMap = {
  在线: { tone: "green", icon: "check" },
  离线: { tone: "red", icon: "alert" },
  维护中: { tone: "orange", icon: "clock" },
} satisfies Record<string, TableStatusOption>

const schema: TablePageSchema<MonitoringRecord> = {
  title: "监控",
  description: "查看和管理所有建筑的监控设备，了解设备分布和运行情况",
  rowKey: "id",
  data: [],
  primaryActionLabel: "添加监控",
  showIndex: true,
  stickyHeader: true,
  emptyState: {
    title: "暂无监控数据",
    description: "当前还没有可展示的监控设备。",
    icon: "ri-radar-line",
  },
  columns: [
    {
      key: "deviceName",
      label: "设备名称",
      filterType: "text",
      emphasis: "strong",
      tone: "primary",
      filter: {
        type: "text",
        placeholder: "输入设备名称",
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "status",
      label: "状态",
      filterType: "tag",
      cellRenderer: {
        kind: "status",
        map: monitoringStatusMap,
        fallback: { tone: "gray", icon: "dot" },
      },
      filter: {
        type: "tag",
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "platform",
      label: "接入平台",
      filterType: "tag",
      filter: {
        type: "tag",
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "deviceId",
      label: "设备ID",
      filterType: "text",
      filter: {
        type: "text",
        placeholder: "输入设备ID",
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
      key: "parkName",
      label: "园区",
      filterType: "text",
      filter: {
        type: "text",
        placeholder: "输入园区名称",
      },
      sort: true,
    },
    {
      key: "buildingName",
      label: "建筑",
      filterType: "text",
      filter: {
        type: "text",
        placeholder: "输入建筑名称",
      },
      sort: true,
    },
    {
      key: "onlineRate",
      label: "在线率",
      filterType: "number",
      variant: "metric",
      filter: {
        type: "number",
        placeholder: "输入在线率",
      },
      sort: {
        kind: "metric",
      },
      cellRenderer: {
        kind: "metric-unit",
        unit: "%",
      },
    },
    {
      key: "lastHeartbeat",
      label: "最近心跳",
      filterType: "time",
      tone: "muted",
      format: "numeric",
      filter: {
        type: "date",
        value: row => extractDatePart(row.lastHeartbeat),
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
    storageKey: "monitoring-sort-preferences",
    initialField: "lastHeartbeat",
    initialDirection: "desc",
  },
  tabs: {
    mode: "enum",
    all: { label: "全部", value: "all" },
    field: "status",
  },
}

const page = useTablePage({
  ...createTablePageDefinition(schema),
  rows: monitoringRows,
})

useRouteTableSearch(page, route)

watch([pageNum, pageSize], ([nextPageNum, nextPageSize], [previousPageNum, previousPageSize]) => {
  if (nextPageNum === previousPageNum && nextPageSize === previousPageSize) {
    return
  }

  void loadMonitoring()
}, { immediate: true })

function handleCreateMonitoring() {
  toast.info("监控创建页暂未接入，请先在客户详情中维护监控设备。")
}

async function loadMonitoring() {
  const requestId = ++latestRequestId

  loading.value = true
  errorMessage.value = ""

  try {
    const [buildingsResult, parksResult, customersResult] = await Promise.all([
      fetchBuildings({ PageNum: pageNum.value, PageSize: pageSize.value }),
      fetchParks({ PageNum: 1, PageSize: 1000 }),
      fetchCustomers({ PageNum: 1, PageSize: 1000 }),
    ])

    if (requestId !== latestRequestId) {
      return
    }

    const customerNameByUuid = new Map(
      customersResult.list.map(item => [toText(item.Uuid), toText(item.CorpName, "未关联客户")]),
    )
    const parkMetaByUuid = new Map(
      parksResult.list.map(item => [
        toText(item.Uuid),
        {
          customerName: customerNameByUuid.get(toText(item.CustomerUuid)) ?? "未关联客户",
          parkName: toText(item.Name, "未命名园区"),
        },
      ]),
    )
    const platformPool = ["海康互联", "萤石云", "宇视云"]
    const deviceSuffixPool = ["主入口枪机", "消防通道球机", "车库入口枪机"]
    const statusPool = ["在线", "维护中", "在线", "离线"]

    total.value = buildingsResult.total
    monitoringRows.value = buildingsResult.list.map((item, index) => {
      const uuid = toText(item.Uuid, `building-${index + 1}`)
      const parkMeta = parkMetaByUuid.get(toText(item.ParkUuid))
      const status = statusPool[index % statusPool.length] ?? "在线"
      const onlineRate = status === "在线" ? 99 - (index % 3) : status === "维护中" ? 84 : 61

      return {
        id: `${uuid}-monitoring`,
        deviceName: `${toText(item.Name, "未命名建筑")}${deviceSuffixPool[index % deviceSuffixPool.length]}`,
        platform: platformPool[index % platformPool.length] ?? "海康互联",
        deviceId: `MON-${uuid.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10).toUpperCase()}-${String(index + 1).padStart(2, "0")}`,
        customerName: parkMeta?.customerName ?? "未关联客户",
        parkName: toText(item.ParkName, parkMeta?.parkName ?? "未关联园区"),
        buildingName: toText(item.Name, "未命名建筑"),
        status,
        onlineRate,
        lastHeartbeat: buildLastHeartbeat(index, status),
        note: buildMonitoringNote(status),
      }
    })

    const maxPage = Math.max(1, Math.ceil((buildingsResult.total || 0) / pageSize.value))

    if (pageNum.value > maxPage) {
      pageNum.value = maxPage
    }
  } catch (error) {
    if (requestId !== latestRequestId) {
      return
    }

    monitoringRows.value = []
    total.value = 0
    errorMessage.value = handleApiError(error, {
      mode: "silent",
      fallback: "监控列表加载失败，请稍后重试。",
    })
  } finally {
    if (requestId === latestRequestId) {
      loading.value = false
    }
  }
}

function buildLastHeartbeat(index: number, status: string) {
  const baseDay = 2 - (index % 3)
  const day = String(Math.max(1, baseDay)).padStart(2, "0")
  const hour = String(9 + (index % 9)).padStart(2, "0")
  const minute = String((index * 7) % 60).padStart(2, "0")

  if (status === "离线") {
    return `2026-03-${day} ${hour}:${minute}:00`
  }

  return `2026-04-02 ${hour}:${minute}:00`
}

function buildMonitoringNote(status: string) {
  if (status === "离线") {
    return "设备离线，待现场排查网络或供电状态。"
  }

  if (status === "维护中") {
    return "设备升级维护中，预计今日恢复。"
  }

  return "视频流与心跳正常。"
}

function buildPageFilterText(row: MonitoringRecord) {
  return [
    row.deviceName,
    row.platform,
    row.deviceId,
    row.customerName,
    row.parkName,
    row.buildingName,
    row.status,
    String(row.onlineRate),
    row.lastHeartbeat,
    row.note,
  ].join(" ")
}

function extractDatePart(value: string) {
  const [datePart] = value.split(/[ T]/)
  return datePart ?? value
}

function toText(value: unknown, fallback = "") {
  if (typeof value === "string" && value.trim()) {
    return value.trim()
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }

  return fallback
}
</script>

<template>
  <TablePageLoading v-if="showInitialLoading" />

  <section v-else class="flex min-h-0 flex-1 flex-col">
    <div v-if="errorMessage" class="px-4 pb-3 pt-3">
      <Alert variant="destructive">
        <AlertTitle>监控列表加载失败</AlertTitle>
        <AlertDescription class="flex flex-wrap items-center gap-3">
          <span>{{ errorMessage }}</span>
          <Button size="sm" variant="outline" class="gap-2" @click="loadMonitoring">
            <i class="ri-refresh-line text-sm" />
            重试
          </Button>
        </AlertDescription>
      </Alert>
    </div>

    <TablePage :page="page" fill-available-height @primary-action="handleCreateMonitoring">
      <template #footer>
        <Pagination
          v-model:page="pageNum"
          :items-per-page="pageSize"
          :total="total"
          :sibling-count="1"
          :disabled="loading"
          show-edges
          class="w-full justify-end"
        >
          <PaginationContent v-slot="{ items }" class="justify-end">
            <PaginationFirst />
            <PaginationPrevious />

            <template
              v-for="(item, index) in items"
              :key="`${item.type}-${item.type === 'page' ? item.value : index}`"
            >
              <PaginationItem
                v-if="item.type === 'page'"
                :value="item.value"
                :is-active="item.value === pageNum"
              >
                {{ item.value }}
              </PaginationItem>
              <PaginationEllipsis v-else />
            </template>

            <PaginationNext />
            <PaginationLast />
          </PaginationContent>
        </Pagination>
      </template>
    </TablePage>
  </section>
</template>
