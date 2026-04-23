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
import type { TablePageSchema, TableQueryBarConfig } from "@/components/table-page/types"
import { handleApiError } from "@/lib/api-errors"
import { fetchCustomers } from "@/lib/customers-api"
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
  StartTime: string
  ParkUuid: string
  ExpireAt: string
  ServiceStatus: string
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
const serviceNameQuery = ref("")
const selectedCustomerUuid = ref("")
const sortDirection = ref<"asc" | "desc">("desc")
const customerOptions = ref<Array<{ value: string; label: string }>>([])
const customerOptionsLoading = ref(false)
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
      label: "合同时间",
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
  filters: [],
  sort: {
    storageKey: "inspection-services-sort-preferences",
    initialField: "CreatedAt",
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
  rows: computed(() => [...inspectionServices.value].sort((left, right) => compareInspectionServiceRows(left, right, sortDirection.value))),
})
page.showControls.value = true
page.customSortEnabled.value = false

const queryBar = computed<TableQueryBarConfig>(() => ({
  controls: [
    {
      type: "search",
      key: "q",
      queryKey: "q",
      label: "服务名称",
      icon: "ri-text",
      placeholder: "输入服务名称搜索",
      value: serviceNameQuery.value,
      expandedWidth: 248,
      collapsedMaxWidth: 248,
    },
    {
      type: "select",
      key: "customerUuid",
      queryKey: "customerUuid",
      label: "所属客户",
      icon: "ri-price-tag-3-line",
      value: selectedCustomerUuid.value,
      options: customerOptions.value,
      loading: customerOptionsLoading.value,
      placeholder: customerOptionsLoading.value ? "正在加载客户..." : "请选择客户",
      expandedWidth: 248,
      collapsedMaxWidth: 248,
    },
  ],
  values: {
    q: serviceNameQuery.value,
    customerUuid: selectedCustomerUuid.value,
  },
  canClear: Boolean(serviceNameQuery.value || selectedCustomerUuid.value),
}))

watch([pageNum, pageSize], ([nextPageNum, nextPageSize], [previousPageNum, previousPageSize]) => {
  if (nextPageNum === previousPageNum && nextPageSize === previousPageSize) {
    return
  }

  void loadInspectionServices()
})

watch(
  () => [normalizeQueryValue(route.query.q), normalizeQueryValue(route.query.customerUuid)] as const,
  ([nextQuery, nextCustomer], previousValue) => {
    const [previousQuery, previousCustomer] = previousValue ?? []

    if (previousValue && nextQuery === previousQuery && nextCustomer === previousCustomer) {
      return
    }

    serviceNameQuery.value = nextQuery
    selectedCustomerUuid.value = nextCustomer

    if (pageNum.value !== 1) {
      pageNum.value = 1
      return
    }

    void loadInspectionServices()
  },
  { immediate: true },
)

void loadCustomerOptions()

function handleCreateInspectionService() {
  void router.push({ name: "inspection-service-create" })
}

function buildPageFilterText(row: InspectionServiceRecord) {
  return [
    row.Name,
    row.Level,
    row.CorpName,
    row.StartTime,
    row.ExpireAt,
    row.ServiceStatus,
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

async function loadCustomerOptions() {
  customerOptionsLoading.value = true

  try {
    const result = await fetchCustomers({
      PageNum: 1,
      PageSize: 200,
    })

    customerOptions.value = result.list
      .map(item => ({
        value: toText(item.Uuid),
        label: toText(item.CorpName, "未命名客户"),
      }))
      .filter(option => option.value)
  } catch {
    customerOptions.value = []
  } finally {
    customerOptionsLoading.value = false
  }
}

async function loadInspectionServices() {
  const requestId = ++latestRequestId

  loading.value = true
  errorMessage.value = ""

  try {
    const result = await fetchInspectionServices({
      Name: serviceNameQuery.value || undefined,
      CustomerUuid: selectedCustomerUuid.value || undefined,
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
    StartTime: toText(item.StartTime, "-"),
    ParkUuid: park.uuid,
    ExpireAt: toText(item.ContractEndTime, "-"),
    ServiceStatus: formatServiceStatus(item.Status),
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

function getExpireDateValue(row: unknown) {
  if (!row || typeof row !== "object" || !("ExpireAt" in row)) {
    return ""
  }

  return toText(row.ExpireAt, "")
}

function getStartDateValue(row: unknown) {
  if (!row || typeof row !== "object" || !("StartTime" in row)) {
    return ""
  }

  return toText(row.StartTime, "")
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

function getStartOfDayTimestamp(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

function getDateDiffInDays(target: Date, baseTimestamp: number) {
  return Math.floor((getStartOfDayTimestamp(target) - baseTimestamp) / (1000 * 60 * 60 * 24))
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function getContractTimeline(row: unknown) {
  const startAt = parseDateTime(getStartDateValue(row))
  const expireAt = parseDateTime(getExpireDateValue(row))

  if (!startAt || !expireAt) {
    return {
      progress: 0,
      label: "无数据",
      progressClass: "[&_[data-slot=progress-indicator]]:bg-muted-foreground/40",
      tooltip: {
        start: getStartDateValue(row) || "-",
        end: getExpireDateValue(row) || "-",
        status: "合同时间无数据",
      },
    }
  }

  const now = new Date()
  const startOfToday = getStartOfDayTimestamp(now)
  const daysUntilExpire = getDateDiffInDays(expireAt, startOfToday)
  const daysUntilStart = getDateDiffInDays(startAt, startOfToday)
  const totalDurationDays = Math.max(1, getDateDiffInDays(expireAt, getStartOfDayTimestamp(startAt)))

  if (daysUntilStart > 0) {
    return {
      progress: 0,
      label: `还有 ${daysUntilStart} 天开始`,
      progressClass: "[&_[data-slot=progress-indicator]]:bg-muted-foreground/45",
      tooltip: {
        start: getStartDateValue(row) || "-",
        end: getExpireDateValue(row) || "-",
        status: `合同未开始，距开始还有 ${daysUntilStart} 天`,
      },
    }
  }

  if (daysUntilExpire < 0) {
    return {
      progress: 100,
      label: `逾期 ${Math.abs(daysUntilExpire)} 天`,
      progressClass: "[&_[data-slot=progress-indicator]]:bg-destructive/70",
      tooltip: {
        start: getStartDateValue(row) || "-",
        end: getExpireDateValue(row) || "-",
        status: `合同已结束，已逾期 ${Math.abs(daysUntilExpire)} 天`,
      },
    }
  }

  const elapsedDays = clamp(getDateDiffInDays(now, getStartOfDayTimestamp(startAt)), 0, totalDurationDays)
  const progress = Math.round((elapsedDays / totalDurationDays) * 100)

  return {
    progress,
    label: `剩余 ${daysUntilExpire} 天`,
    progressClass: daysUntilExpire <= 30
      ? "[&_[data-slot=progress-indicator]]:bg-warning/80"
      : "[&_[data-slot=progress-indicator]]:bg-link",
    tooltip: {
      start: getStartDateValue(row) || "-",
      end: getExpireDateValue(row) || "-",
      status: `合同进行中，剩余 ${daysUntilExpire} 天`,
    },
  }
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

function compareInspectionServiceRows(left: InspectionServiceRecord, right: InspectionServiceRecord, direction: "asc" | "desc") {
  const leftValue = parseTimestamp(left.CreatedAt)
  const rightValue = parseTimestamp(right.CreatedAt)

  if (leftValue !== rightValue) {
    return direction === "asc" ? leftValue - rightValue : rightValue - leftValue
  }

  return left.Name.localeCompare(right.Name, "zh-CN")
}

function parseTimestamp(value: string) {
  const normalized = value.trim()

  if (!normalized || normalized === "-" || normalized === "—") {
    return 0
  }

  const timestamp = new Date(normalized.replace(" ", "T")).getTime()
  return Number.isFinite(timestamp) ? timestamp : 0
}

function normalizeQueryValue(value: unknown) {
  if (Array.isArray(value)) {
    return normalizeQueryValue(value[0])
  }

  return typeof value === "string" ? value.trim() : ""
}

function handleToolbarSortToggle() {
  sortDirection.value = sortDirection.value === "asc" ? "desc" : "asc"
}

function handleQueryChange(payload: { key: string; value: string | string[] }) {
  if (payload.key === "q") {
    serviceNameQuery.value = typeof payload.value === "string" ? payload.value.trim() : ""
  }

  if (payload.key === "customerUuid") {
    selectedCustomerUuid.value = typeof payload.value === "string" ? payload.value.trim() : ""
  }

  void syncRouteQueryAndReload()
}

function handleQueryClear() {
  if (!serviceNameQuery.value && !selectedCustomerUuid.value) {
    return
  }

  serviceNameQuery.value = ""
  selectedCustomerUuid.value = ""
  void syncRouteQueryAndReload()
}

async function syncRouteQueryAndReload() {
  await router.replace({
    query: {
      ...route.query,
      q: serviceNameQuery.value || undefined,
      customerUuid: selectedCustomerUuid.value || undefined,
    },
  })

  if (pageNum.value !== 1) {
    pageNum.value = 1
    return
  }

  await loadInspectionServices()
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
      <TablePage
        :page="page"
        :loading="loading"
        :query-bar="queryBar"
        toolbar-sort-behavior="toggle"
        :toolbar-sort-direction="sortDirection"
        fill-available-height
        @refresh-action="loadInspectionServices"
        @primary-action="handleCreateInspectionService"
        @toolbar-sort-toggle="handleToolbarSortToggle"
        @query-change="handleQueryChange"
        @query-clear="handleQueryClear"
      >
      <template #cell-CorpName="{ row }">
        <button
          type="button"
          class="inline-flex max-w-full items-center gap-1 text-left text-link transition-colors hover:text-link-hover"
          @click.stop="jumpToCustomerDetail(row)"
        >
          <span class="truncate">{{ row.CorpName }}</span>
            <i class="ri-arrow-right-up-line shrink-0 text-sm" />
          </button>
        </template>

      <template #cell-ParkName="{ row }">
        <button
          type="button"
          class="inline-flex max-w-full items-center gap-1 text-left text-link transition-colors hover:text-link-hover disabled:cursor-not-allowed disabled:text-muted-foreground"
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
              <div class="flex min-w-[220px] items-center gap-2">
                <Progress
                  :model-value="getContractTimeline(row).progress"
                  class="h-1.5 max-w-[120px] bg-surface-tertiary **:data-[slot=progress-indicator]:transition-[transform,background-color]"
                  :class="getContractTimeline(row).progressClass"
                />
                <span class="shrink-0 text-xs text-muted-foreground">
                  {{ getContractTimeline(row).label }}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" align="start" class="space-y-1">
              <p>开始时间：{{ getContractTimeline(row).tooltip.start }}</p>
              <p>到期时间：{{ getContractTimeline(row).tooltip.end }}</p>
              <p>状态说明：{{ getContractTimeline(row).tooltip.status }}</p>
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
