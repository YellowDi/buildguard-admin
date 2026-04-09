<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { toast } from "vue-sonner"

import LinkedEntityDetailSheet from "@/components/detail/LinkedEntityDetailSheet.vue"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import TableStatusChip from "@/components/table-page/TableStatusChip.vue"
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
  customerUuid: string
  Name: string
  Level: string
  CorpName: string
  ParkUuid: string
  ExpireAt: string
  ServiceStatus: string
  InspectionQuota: string
  ParkName: string
  CreatedAt: string
  UpdatedAt: string
  raw: {
    customerUuid: string
    managerName: string
    managerPhone: string
    templateName: string
    remark: string
    status: number
  }
}

type LinkedDetailSheetKind = "customer" | "service" | "plan" | "park"

const inspectionServices = ref<InspectionServiceRecord[]>([])
const loading = ref(false)
const errorMessage = ref("")
const pageNum = ref(1)
const pageSize = ref(50)
const total = ref(0)
const route = useRoute()
const router = useRouter()
const activeLinkedDetailKind = ref<LinkedDetailSheetKind | null>(null)
const activeLinkedDetailUuid = ref("")
const activeLinkedDetailCustomerUuid = ref("")
let latestRequestId = 0

const schema: TablePageSchema<InspectionServiceRecord> = {
  title: "检测服务",
  description: "为客户配置检测服务内容，管理检测范围和周期",
  primaryActionLabel: "添加检测服务",
  rowKey: "uuid",
  data: [],
  showIndex: true,
  stickyHeader: true,
  emptyState: {
    title: "暂无检测服务数据",
    description: "暂时还没有检测服务，您可以先添加一条检测服务。",
    icon: "ri-shield-check-line",
  },
  rowActions: [
    {
      key: "view-detail",
      label: "查看详情",
      onClick: row => {
        void router.push({
          name: "inspection-service-detail",
          params: { id: row.uuid },
        })
      },
    },
  ],
  onRowClick: row => {
    void router.push({
      name: "inspection-service-detail",
      params: { id: row.uuid },
    })
  },
  onQuickAction: row => {
    if (!row.uuid) {
      toast.error("当前检测服务缺少 Uuid，无法打开侧边详情")
      return
    }

    activeLinkedDetailKind.value = "service"
    activeLinkedDetailUuid.value = row.uuid
    activeLinkedDetailCustomerUuid.value = row.customerUuid || ""
  },
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
      key: "CorpName",
      label: "客户名称",
      filterType: "text",
      slot: "cell-CorpName",
      filter: {
        type: "text",
        placeholder: "输入客户名称",
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "ParkName",
      label: "园区",
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
      key: "ExpireAt",
      label: "到期时间",
      filterType: "time",
      tone: "muted",
      slot: "cell-ExpireAt",
      format: "numeric",
      filter: {
        type: "date",
      },
      sort: true,
    },
    {
      key: "ServiceStatus",
      label: "服务状态",
      filterType: "text",
      slot: "cell-ServiceStatus",
      filter: {
        type: "text",
        placeholder: "输入服务状态",
      },
      sort: true,
    },
    {
      key: "InspectionQuota",
      label: "检测服务总检测次数/剩余次数",
      filterType: "text",
      filter: {
        type: "text",
        placeholder: "输入检测次数",
      },
      sort: true,
    },
    {
      key: "CreatedAt",
      label: "创建时间",
      filterType: "time",
      tone: "muted",
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
      tone: "muted",
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
  tabs: {
    mode: "enum",
    all: { label: "全部", value: "all" },
    field: "ServiceStatus",
    options: ["待签署", "进行中", "已逾期", "已结单"],
    order: ["待签署", "进行中", "已逾期", "已结单"],
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

function handleCreateInspectionService() {
  void router.push({ name: "inspection-service-create" })
}

function buildPageFilterText(row: InspectionServiceRecord) {
  return [
    row.Name,
    row.Level,
    row.CorpName,
    row.ExpireAt,
    row.ServiceStatus,
    row.InspectionQuota,
    row.ParkName,
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
  const customerUuid = toText(item.CustomerUuid, "")
  const park = resolveInspectionServicePark(item)

  return {
    id: uuid || fallbackId,
    uuid: uuid || fallbackId,
    customerUuid,
    Name: toText(item.Name, "未命名服务"),
    Level: toText(item.Level, "未分级"),
    // 接口字段从 CustomerName 调整为 CorpName
    CorpName: toText(item.CorpName || item.CustomerName, "未绑定客户"),
    ParkUuid: park.uuid,
    ExpireAt: toText(item.ContractEndTime, "-"),
    ServiceStatus: formatServiceStatus(item.Status),
    InspectionQuota: formatInspectionQuota(
      getFirstText(item, ["TotalInspectionCount", "InspectionTotalCount", "PackageTotalInspectionCount", "TotalCount"]),
      getFirstText(item, ["RemainInspectionCount", "RemainingInspectionCount", "PackageRemainInspectionCount", "RemainCount"]),
    ),
    ParkName: park.name || "-",
    CreatedAt: toText(item.CreatedAt, "-"),
    UpdatedAt: toText(item.UpdatedAt, "-"),
    raw: {
      customerUuid: toText(item.CustomerUuid, "-"),
      managerName: toText(item.ManagerName, "未填写"),
      managerPhone: toText(item.ManagerPhone, "-"),
      templateName: toText(item.TemplateName, "未配置模板"),
      remark: toText(item.Remark, ""),
      status: typeof item.Status === "number" && Number.isFinite(item.Status) ? item.Status : -1,
    },
  }
}

function jumpToCustomerDetail(row: Record<string, unknown>) {
  const nextCustomerUuid = typeof row.customerUuid === "string" ? row.customerUuid : ""

  if (!nextCustomerUuid) {
    toast.error("当前检测服务缺少客户 Uuid，无法跳转客户详情")
    return
  }

  activeLinkedDetailKind.value = "customer"
  activeLinkedDetailUuid.value = nextCustomerUuid
  activeLinkedDetailCustomerUuid.value = ""
}

function jumpToParkDetail(row: Record<string, unknown>) {
  const parkUuid = typeof row.ParkUuid === "string" ? row.ParkUuid : ""
  const customerUuid = typeof row.customerUuid === "string" ? row.customerUuid : ""

  if (!parkUuid) {
    toast.error("当前检测服务缺少园区 Uuid，无法打开园区详情")
    return
  }

  activeLinkedDetailKind.value = "park"
  activeLinkedDetailUuid.value = parkUuid
  activeLinkedDetailCustomerUuid.value = customerUuid
}

function handleLinkedDetailSheetOpenChange(open: boolean) {
  if (!open) {
    activeLinkedDetailKind.value = null
    activeLinkedDetailUuid.value = ""
    activeLinkedDetailCustomerUuid.value = ""
  }
}

function resolveInspectionServicePark(item: InspectionServiceListItem) {
  const buildInfos = Array.isArray(item.BuildInfos) ? item.BuildInfos : []
  const parks = buildInfos
    .map(build => ({
      name: toText(build.ParkName, ""),
      uuid: toText(build.ParkUuid, ""),
    }))
    .filter(park => park.name || park.uuid)

  const uniqueParks = parks.filter((park, index, list) => (
    list.findIndex(candidate => candidate.uuid === park.uuid && candidate.name === park.name) === index
  ))
  const park = uniqueParks[0]

  return {
    name: park?.name ?? "",
    uuid: park?.uuid ?? "",
  }
}

function getFirstText(
  record: Record<string, unknown>,
  keys: string[],
  fallback = "",
) {
  for (const key of keys) {
    const value = toText(record[key])

    if (value) {
      return value
    }
  }

  return fallback
}

function formatInspectionQuota(total: string, remaining: string) {
  if (!total && !remaining) {
    return "- / -"
  }

  return `${total || "-"} / ${remaining || "-"}`
}

function getExpireDateValue(row: unknown) {
  if (!row || typeof row !== "object" || !("ExpireAt" in row)) {
    return ""
  }

  return toText(row.ExpireAt, "")
}

function parseDateTime(value: string) {
  if (!value) {
    return null
  }

  const normalized = value.includes("T") ? value : value.replace(" ", "T")
  const date = new Date(normalized)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date
}

function getRemainingDaysLabel(row: unknown) {
  const expireAt = parseDateTime(getExpireDateValue(row))
  if (!expireAt) {
    return "-"
  }

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startOfExpireDay = new Date(expireAt.getFullYear(), expireAt.getMonth(), expireAt.getDate()).getTime()
  const diffDays = Math.floor((startOfExpireDay - startOfToday) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return `逾期 ${Math.abs(diffDays)} 天`
  }

  return `剩余 ${diffDays} 天`
}

function getExpireProgressValue(row: unknown) {
  const expireAt = parseDateTime(getExpireDateValue(row))
  if (!expireAt) {
    return 0
  }

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startOfExpireDay = new Date(expireAt.getFullYear(), expireAt.getMonth(), expireAt.getDate()).getTime()
  const diffDays = Math.floor((startOfExpireDay - startOfToday) / (1000 * 60 * 60 * 24))
  const windowDays = 365
  const progress = (Math.max(0, Math.min(windowDays, diffDays)) / windowDays) * 100

  return Math.round(progress)
}

function getExpireProgressClass(row: unknown) {
  const expireAt = parseDateTime(getExpireDateValue(row))
  if (!expireAt) {
    return "[&_[data-slot=progress-indicator]]:bg-muted-foreground/40"
  }

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startOfExpireDay = new Date(expireAt.getFullYear(), expireAt.getMonth(), expireAt.getDate()).getTime()
  const diffDays = Math.floor((startOfExpireDay - startOfToday) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return "[&_[data-slot=progress-indicator]]:bg-destructive/70"
  }

  if (diffDays <= 30) {
    return "[&_[data-slot=progress-indicator]]:bg-orange-500/80"
  }

  return "[&_[data-slot=progress-indicator]]:bg-[#2383E2]"
}

function formatServiceStatus(status: unknown) {
  const normalized = typeof status === "number" && Number.isFinite(status)
    ? status
    : Number(toText(status, ""))

  if (normalized === 1) return "待签署"
  if (normalized === 2) return "进行中"
  if (normalized === 3) return "已逾期"
  if (normalized === 4) return "已结单"

  return "-"
}

function getRowServiceStatus(row: unknown) {
  if (!row || typeof row !== "object" || !("ServiceStatus" in row)) {
    return "-"
  }

  return toText(row.ServiceStatus, "-")
}

const serviceStatusRenderer = {
  kind: "status",
  map: {
    "1": { label: "待签署", tone: "yellow", icon: "clock" },
    "2": { label: "进行中", tone: "blue", icon: "clock" },
    "3": { label: "已逾期", tone: "orange", icon: "alert" },
    "4": { label: "已结单", tone: "gray", icon: "minus" },
  },
  fallback: {
    label: "未知状态",
    tone: "gray",
    icon: "minus",
  },
} as const

function getRowServiceStatusCode(row: unknown) {
  if (!row || typeof row !== "object" || !("raw" in row) || !row.raw || typeof row.raw !== "object" || !("status" in row.raw)) {
    return -1
  }

  const value = (row.raw as { status?: unknown }).status
  return typeof value === "number" && Number.isFinite(value) ? value : -1
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
  <section class="flex min-h-0 flex-1 flex-col">
    <div v-if="errorMessage" class="px-4 pb-3 pt-3">
      <Alert variant="destructive">
        <i class="ri-error-warning-line" />
        <AlertTitle>检测服务接口加载失败</AlertTitle>
        <AlertDescription class="flex flex-wrap items-center gap-3">
          <span>{{ errorMessage }}</span>
          <Button size="sm" variant="outline" class="gap-2" @click="loadInspectionServices">
            <i class="ri-refresh-line text-sm" />
            重试
          </Button>
        </AlertDescription>
      </Alert>
    </div>

    <TooltipProvider>
      <TablePage :page="page" :loading="loading" fill-available-height @primary-action="handleCreateInspectionService">
        <template #cell-CorpName="{ row }">
          <button
            type="button"
            class="inline-flex max-w-full items-center gap-1 text-left text-[#2B67F6] transition-colors hover:text-[#1D4ED8]"
            @click.stop="jumpToCustomerDetail(row)"
          >
            <span class="truncate">{{ row.CorpName }}</span>
            <i class="ri-arrow-right-up-line shrink-0 text-sm" />
          </button>
        </template>

        <template #cell-ParkName="{ row }">
          <button
            type="button"
            class="inline-flex max-w-full items-center gap-1 text-left text-[#2B67F6] transition-colors hover:text-[#1D4ED8] disabled:cursor-not-allowed disabled:text-muted-foreground"
            :disabled="row.ParkName === '-' || !row.ParkUuid"
            @click.stop="jumpToParkDetail(row)"
          >
            <span class="truncate">{{ row.ParkName }}</span>
            <i v-if="row.ParkName !== '-' && row.ParkUuid" class="ri-arrow-right-up-line shrink-0 text-sm" />
          </button>
        </template>

        <template #cell-ServiceStatus="{ row }">
          <TableStatusChip :value="String(getRowServiceStatusCode(row))" :renderer="serviceStatusRenderer" />
        </template>

        <template #cell-ExpireAt="{ row }">
          <Tooltip>
            <TooltipTrigger as-child>
              <div class="flex min-w-[180px] items-center gap-2">
                <Progress
                  :model-value="getExpireProgressValue(row)"
                  class="h-1.5 max-w-[120px] bg-[#E9EDF2] **:data-[slot=progress-indicator]:transition-all"
                  :class="getExpireProgressClass(row)"
                />
                <span class="shrink-0 text-xs text-muted-foreground">
                  {{ getRemainingDaysLabel(row) }}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" align="start">
              到期时间：{{ row.ExpireAt || "-" }}
            </TooltipContent>
          </Tooltip>
        </template>

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
    </TooltipProvider>

    <LinkedEntityDetailSheet
      :open="Boolean(activeLinkedDetailKind) && Boolean(activeLinkedDetailUuid)"
      :kind="activeLinkedDetailKind"
      :uuid="activeLinkedDetailUuid"
      :customer-uuid="activeLinkedDetailCustomerUuid"
      @update:open="handleLinkedDetailSheetOpenChange"
    />
  </section>
</template>
