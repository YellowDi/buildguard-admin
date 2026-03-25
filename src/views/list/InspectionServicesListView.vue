<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import TablePageLoading from "@/components/loading/TablePageLoading.vue"
import TablePage from "@/components/table-page/TablePage.vue"
import { createTablePageDefinition, useTablePage } from "@/components/table-page/useTablePage"
import type { TablePageSchema } from "@/components/table-page/types"
import { useRouteTableSearch } from "@/composables/useRouteTableSearch"
import { handleApiError } from "@/lib/api-errors"
import { fetchInspectionServices, type InspectionServiceListItem } from "@/lib/inspection-services-api"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
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

type InspectionServiceRecord = {
  id: string
  uuid: string
  Name: string
  Level: string
  CustomerName: string
  ParkName: string
  BuildName: string
  ParkNames: string[]
  ParkBuildCounts: number[]
  BuildNames: string[]
  CreatedAt: string
  UpdatedAt: string
  raw: {
    customerUuid: string
    managerName: string
    managerPhone: string
    templateName: string
    remark: string
    builds: NonNullable<InspectionServiceListItem["Builds"]>
  }
}

const INSPECTION_SERVICE_DETAIL_STORAGE_KEY = "inspection-service-detail:"

const inspectionServices = ref<InspectionServiceRecord[]>([])
const loading = ref(false)
const errorMessage = ref("")
const pageNum = ref(1)
const pageSize = ref(10)
const total = ref(0)
const route = useRoute()
const router = useRouter()
const showInitialLoading = computed(() => loading.value && !inspectionServices.value.length && !errorMessage.value)
let latestRequestId = 0

const schema: TablePageSchema<InspectionServiceRecord> = {
  title: "检测服务",
  description: "所有客户检测服务列表",
  rowKey: "uuid",
  data: [],
  showIndex: true,
  stickyHeader: true,
  emptyState: {
    title: "暂无检测服务数据",
    description: "当前接口暂未返回可展示的检测服务列表。",
    icon: "ri-shield-check-line",
  },
  rowActions: [
    {
      key: "view-detail",
      label: "查看详情",
      onClick: row => {
        cacheInspectionServiceDetail(row)
        void router.push({
          name: "inspection-service-detail",
          params: { id: row.uuid },
        })
      },
    },
  ],
  columns: [
    {
      key: "Name",
      label: "服务名称",
      filterType: "text",
      emphasis: "strong",
      tone: "primary",
      filter: {
        type: "text",
        placeholder: "输入服务名称",
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "Level",
      label: "服务等级",
      filterType: "tag",
      filter: {
        type: "tag",
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "CustomerName",
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
      key: "ParkName",
      label: "园区名称",
      filterType: "text",
      width: "fill",
      slot: "cell-ParkName",
      filter: {
        type: "text",
        placeholder: "输入园区名称",
      },
      sort: true,
    },
    {
      key: "CreatedAt",
      label: "创建时间",
      filterType: "time",
      format: "numeric",
      filter: {
        type: "date",
      },
      sort: true,
    },
    {
      key: "UpdatedAt",
      label: "更新时间",
      filterType: "time",
      format: "numeric",
      filter: {
        type: "date",
      },
      sort: true,
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
    storageKey: "inspection-services-sort-preferences",
    initialField: "UpdatedAt",
    initialDirection: "desc",
  },
}

const page = useTablePage({
  ...createTablePageDefinition(schema),
  rows: inspectionServices,
})

useRouteTableSearch(page, route)

watch([pageNum, pageSize], ([nextPageNum, nextPageSize], [previousPageNum, previousPageSize]) => {
  if (nextPageNum === previousPageNum && nextPageSize === previousPageSize) {
    return
  }

  void loadInspectionServices()
}, { immediate: true })

function buildPageFilterText(row: InspectionServiceRecord) {
  return [
    row.Name,
    row.Level,
    row.CustomerName,
    row.ParkName,
    row.BuildName,
    row.CreatedAt,
    row.UpdatedAt,
    row.raw.managerName,
    row.raw.managerPhone,
    row.raw.templateName,
    row.raw.remark,
    row.raw.customerUuid,
  ].join(" ")
}

async function loadInspectionServices() {
  const requestId = ++latestRequestId

  loading.value = true
  errorMessage.value = ""

  try {
    const result = await fetchInspectionServices({
      PageNum: pageNum.value,
      PageSize: pageSize.value,
    })

    if (requestId !== latestRequestId) {
      return
    }

    total.value = result.total
    inspectionServices.value = result.list.map((item, index) => normalizeInspectionServiceRecord(item, index))

    const maxPage = Math.max(1, Math.ceil((result.total || 0) / pageSize.value))

    if (pageNum.value > maxPage) {
      pageNum.value = maxPage
      return
    }
  } catch (error) {
    if (requestId !== latestRequestId) {
      return
    }

    inspectionServices.value = []
    total.value = 0
    errorMessage.value = handleApiError(error, {
      mode: "silent",
      fallback: "检测服务列表加载失败，请稍后重试。",
    })
  } finally {
    if (requestId === latestRequestId) {
      loading.value = false
    }
  }
}

function normalizeInspectionServiceRecord(item: InspectionServiceListItem, index: number): InspectionServiceRecord {
  const uuid = toText(item.Uuid)
  const fallbackId = toText(item.Id, `${pageNum.value}-${index + 1}`)
  const builds = Array.isArray(item.Builds) ? item.Builds : []
  const parkNames = uniqueText(builds.map(build => toText(build.ParkName)).filter(Boolean))
  const parkBuildCounts = parkNames.map(parkName => countUniqueBuildsByPark(builds, parkName))
  const buildNames = uniqueText(builds.map(build => toText(build.BuildName)).filter(Boolean))

  return {
    id: uuid || fallbackId,
    uuid: uuid || fallbackId,
    Name: toText(item.Name, "未命名服务"),
    Level: toText(item.Level, "未分级"),
    CustomerName: toText(item.CustomerName, "未绑定客户"),
    ParkName: parkNames.length ? parkNames.join("、") : "-",
    BuildName: buildNames.length ? buildNames.join("、") : "-",
    ParkNames: parkNames.length ? parkNames : ["-"],
    ParkBuildCounts: parkNames.length ? parkBuildCounts : [0],
    BuildNames: buildNames.length ? buildNames : ["-"],
    CreatedAt: toText(item.CreatedAt, "-"),
    UpdatedAt: toText(item.UpdatedAt, "-"),
    raw: {
      customerUuid: toText(item.CustomerUuid, "-"),
      managerName: toText(item.ManagerName, "未填写"),
      managerPhone: toText(item.ManagerPhone, "-"),
      templateName: toText(item.TemplateName, "未配置模板"),
      remark: toText(item.Remark, ""),
      builds,
    },
  }
}

function cacheInspectionServiceDetail(row: InspectionServiceRecord) {
  if (typeof window === "undefined" || !row.uuid) {
    return
  }

  window.sessionStorage.setItem(
    `${INSPECTION_SERVICE_DETAIL_STORAGE_KEY}${row.uuid}`,
    JSON.stringify(row),
  )
}

function uniqueText(values: string[]) {
  return Array.from(new Set(values.map(value => value.trim()).filter(Boolean)))
}

function getParkBuildCount(row: unknown, index: number) {
  if (!row || typeof row !== "object" || !("ParkBuildCounts" in row) || !Array.isArray(row.ParkBuildCounts)) {
    return 0
  }

  const value = row.ParkBuildCounts[index]
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

function getBuildNamesByPark(row: unknown, parkName: string) {
  if (!row || typeof row !== "object" || !("raw" in row) || !row.raw || typeof row.raw !== "object" || !("builds" in row.raw)) {
    return [] as string[]
  }

  const builds = (row.raw as { builds?: unknown }).builds

  if (!Array.isArray(builds)) {
    return []
  }

  return uniqueText(
    builds
      .filter((build) => build && typeof build === "object" && toText((build as { ParkName?: unknown }).ParkName) === parkName)
      .map(build => toText((build as { BuildName?: unknown }).BuildName))
      .filter(Boolean),
  )
}

function countUniqueBuildsByPark(builds: NonNullable<InspectionServiceListItem["Builds"]>, parkName: string) {
  return uniqueText(
    builds
      .filter(build => toText(build.ParkName) === parkName)
      .map(build => toText(build.BuildName))
      .filter(Boolean),
  ).length
}

function toText(value: unknown, fallback = "") {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }

  if (typeof value === "string" && value.trim()) {
    return value.trim()
  }

  return fallback
}
</script>

<template>
  <TablePageLoading v-if="showInitialLoading" />

  <section v-else class="flex min-h-0 flex-1 flex-col">
    <div v-if="errorMessage" class="px-4 pb-3 pt-3">
      <Alert variant="destructive">
        <i class="ri-error-warning-line" />
        <AlertTitle>检测服务接口加载失败</AlertTitle>
        <AlertDescription class="flex flex-wrap items-center gap-3">
          <span>{{ errorMessage }}</span>
          <Button size="sm" variant="outline" @click="loadInspectionServices">
            重试
          </Button>
        </AlertDescription>
      </Alert>
    </div>

    <TooltipProvider>
      <TablePage :page="page">
        <template #cell-ParkName="{ row }">
          <div class="flex flex-nowrap gap-1.5 overflow-x-auto whitespace-nowrap">
            <Tooltip v-for="(parkName, index) in row.ParkNames" :key="`${row.uuid}-park-${index}`">
              <TooltipTrigger as-child>
                <Badge
                  variant="secondary"
                  class="inline-flex h-5 shrink-0 cursor-default items-center whitespace-nowrap rounded-full pl-2 pr-0.5 text-[12px] font-normal leading-[18px]"
                >
                  <span>{{ parkName }}</span>
                  <span
                    class="ml-1 inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-background/80 px-0.75 text-center text-[9px] font-semibold leading-none text-foreground ring-1 ring-border/70"
                  >
                    {{ getParkBuildCount(row, index) }}
                  </span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                align="start"
                class="max-w-[320px] rounded-xl px-3 py-2"
              >
                <div class="space-y-1">
                  <div class="text-[11px] font-medium text-background/72">
                    建筑名称
                  </div>
                  <div class="flex flex-wrap gap-1.5">
                    <span
                      v-for="buildName in getBuildNamesByPark(row, parkName)"
                      :key="`${row.uuid}-${parkName}-${buildName}`"
                      class="inline-flex h-5 items-center rounded-full bg-background/10 px-2 text-[12px] text-background"
                    >
                      {{ buildName }}
                    </span>
                    <span
                      v-if="!getBuildNamesByPark(row, parkName).length"
                      class="text-[12px] text-background/72"
                    >
                      暂无建筑
                    </span>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
        </template>
      </TablePage>
    </TooltipProvider>

    <div class="-mx-4 pt-3">
      <div class="flex w-full justify-end px-4">
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
      </div>
    </div>
  </section>
</template>
