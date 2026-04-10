<script setup lang="ts">
import { ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { toast } from "vue-sonner"

import LinkedEntityDetailSheet from "@/components/detail/LinkedEntityDetailSheet.vue"
import TablePage from "@/components/table-page/TablePage.vue"
import { createTablePageDefinition, useTablePage } from "@/components/table-page/useTablePage"
import type { TablePageSchema } from "@/components/table-page/types"
import { useRouteTableSearch } from "@/composables/useRouteTableSearch"
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { handleApiError } from "@/lib/api-errors"
import { fetchInspectionPlans, type InspectionPlanListItem } from "@/lib/inspection-plans-api"

type InspectionPlanRecord = {
  id: string
  uuid: string
  customerUuid: string
  serviceUuid: string
  code: string
  planName: string
  serviceName: string
  customerName: string
  cycleDays: number | null
  cycle: string
  workOrderDuration: string
  firstExecutionAt: string
  latestExecutionAt: string
  latestOrderNo: string
  nextExecutionAt: string
  creator: string
  createdAt: string
  planStatus: string
  enableStatus: string
}

type LinkedDetailSheetKind = "customer" | "service" | "plan"

const inspectionPlans = ref<InspectionPlanRecord[]>([])
const loading = ref(false)
const errorMessage = ref("")
const pageNum = ref(1)
const pageSize = ref(50)
const total = ref(0)
const activeLinkedDetailKind = ref<LinkedDetailSheetKind | null>(null)
const activeLinkedDetailUuid = ref("")
const activeLinkedDetailCustomerUuid = ref("")
let latestRequestId = 0

const schema: TablePageSchema<InspectionPlanRecord> = {
  title: "检测计划",
  description: "基于服务配置生成周期性检测安排，自动驱动工单生成与执行节奏",
  primaryActionLabel: "添加检测计划",
  rowKey: "id",
  data: [],
  showIndex: true,
  stickyHeader: true,
  emptyState: {
    title: "暂无检测计划数据",
    description: "暂时还没有检测计划，您可以先添加一条检测计划。",
    icon: "ri-calendar-schedule-line",
  },
  rowActions: [
    {
      key: "view-detail",
      label: "查看详情",
      onClick: row => handleViewDetail(row as InspectionPlanRecord),
    },
  ],
  onRowClick: row => handleViewDetail(row as InspectionPlanRecord),
  onQuickAction: row => {
    if (!row.uuid) {
      toast.error("当前检测计划缺少 Uuid，无法打开侧边详情")
      return
    }

    activeLinkedDetailKind.value = "plan"
    activeLinkedDetailUuid.value = row.uuid
    activeLinkedDetailCustomerUuid.value = row.customerUuid || ""
  },
  columns: [
    {
      key: "planName",
      label: "计划名称",
      filterType: "text",
      slot: "cell-planName",
      emphasis: "strong",
      tone: "primary",
      filter: {
        type: "text",
        placeholder: "输入计划名称",
        defaultVisible: true,
        value: row => `${row.planName} ${row.code}`,
      },
      sort: true,
    },
    {
      key: "customerName",
      label: "客户名称",
      filterType: "text",
      slot: "cell-customerName",
      filter: {
        type: "text",
        placeholder: "输入客户名称",
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "serviceName",
      label: "服务名称",
      filterType: "text",
      slot: "cell-serviceName",
      filter: {
        type: "text",
        placeholder: "输入服务名称",
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "nextExecutionAt",
      label: "下次执行时间",
      filterType: "time",
      tone: "muted",
      slot: "cell-nextExecutionAt",
      format: "numeric",
      filter: {
        type: "date",
        defaultVisible: true,
        value: row => extractDatePart(row.nextExecutionAt),
      },
      sort: true,
    },
    {
      key: "cycleDays",
      label: "执行频率",
      filterType: "number",
      variant: "metric",
      format: "numeric",
      cellRenderer: {
        kind: "metric-unit",
        unit: "天",
      },
      filter: {
        type: "number",
        defaultVisible: true,
        placeholder: "输入执行频率",
      },
      sort: {
        kind: "metric",
      },
    },
    {
      key: "latestExecutionAt",
      label: "最近执行时间",
      filterType: "time",
      tone: "muted",
      format: "numeric",
      filter: {
        type: "date",
        value: row => extractDatePart(row.latestExecutionAt),
      },
      sort: true,
    },
    {
      key: "latestOrderNo",
      label: "最近执行订单号",
      filterType: "text",
      filter: {
        type: "text",
        placeholder: "输入最近执行订单号",
      },
      sort: true,
    },
    {
      key: "firstExecutionAt",
      label: "首次执行时间",
      filterType: "time",
      tone: "muted",
      format: "numeric",
      filter: {
        type: "date",
        value: row => extractDatePart(row.firstExecutionAt),
      },
      sort: true,
    },
    {
      key: "creator",
      label: "创建人",
      filterType: "text",
      filter: {
        type: "text",
        placeholder: "输入创建人",
      },
      sort: true,
    },
    {
      key: "createdAt",
      label: "创建时间",
      filterType: "time",
      tone: "muted",
      format: "numeric",
      filter: {
        type: "date",
        value: row => extractDatePart(row.createdAt),
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
    storageKey: "inspection-plans-sort-preferences",
    initialField: "nextExecutionAt",
    initialDirection: "asc",
  },
}

const page = useTablePage({
  ...createTablePageDefinition(schema),
  rows: inspectionPlans,
})
const route = useRoute()
const router = useRouter()

useRouteTableSearch(page, route)
watch([pageNum, pageSize], ([nextPageNum, nextPageSize], [previousPageNum, previousPageSize]) => {
  if (nextPageNum === previousPageNum && nextPageSize === previousPageSize) {
    return
  }

  void loadInspectionPlans()
}, { immediate: true })

async function loadInspectionPlans() {
  const requestId = ++latestRequestId

  loading.value = true
  errorMessage.value = ""

  try {
    const result = await fetchInspectionPlans({
      PageNum: pageNum.value,
      PageSize: pageSize.value,
    })

    if (requestId !== latestRequestId) {
      return
    }

    total.value = result.total
    inspectionPlans.value = result.list.map((item, index) => normalizeInspectionPlanRecord(item, index))

    const maxPage = Math.max(1, Math.ceil((result.total || 0) / pageSize.value))

    if (pageNum.value > maxPage) {
      pageNum.value = maxPage
      return
    }
  } catch (error) {
    if (requestId !== latestRequestId) {
      return
    }

    inspectionPlans.value = []
    total.value = 0
    errorMessage.value = handleApiError(error, {
      mode: "silent",
      fallback: "检测计划列表加载失败，请稍后重试。",
    })
  } finally {
    if (requestId === latestRequestId) {
      loading.value = false
    }
  }
}

function handleCreateInspectionPlan() {
  void router.push({ name: "inspection-plan-create" })
}

function handleViewDetail(row: InspectionPlanRecord) {
  if (!row.uuid || row.uuid === "-") {
    toast.error("当前检测计划缺少 Uuid，无法查看详情")
    return
  }

  void router.push({
    name: "inspection-plan-detail",
    params: { id: row.uuid },
  })
}

function jumpToCustomerDetail(row: InspectionPlanRecord) {
  if (!row.customerUuid) {
    toast.error("当前检测计划缺少客户 Uuid，无法跳转客户详情")
    return
  }

  activeLinkedDetailKind.value = "customer"
  activeLinkedDetailUuid.value = row.customerUuid
  activeLinkedDetailCustomerUuid.value = ""
}

function jumpToServiceDetail(row: InspectionPlanRecord) {
  if (!row.serviceUuid) {
    toast.error("当前检测计划缺少服务 Uuid，无法跳转检测服务详情")
    return
  }

  activeLinkedDetailKind.value = "service"
  activeLinkedDetailUuid.value = row.serviceUuid
  activeLinkedDetailCustomerUuid.value = row.customerUuid
}

function handleLinkedDetailSheetOpenChange(open: boolean) {
  if (!open) {
    activeLinkedDetailKind.value = null
    activeLinkedDetailUuid.value = ""
    activeLinkedDetailCustomerUuid.value = ""
  }
}

function extractDatePart(value: string) {
  const [datePart] = value.split(" ")
  return datePart ?? ""
}

function getNextExecutionDateValue(row: InspectionPlanRecord) {
  return row.nextExecutionAt || ""
}

function hasNextExecutionDate(row: InspectionPlanRecord) {
  const value = getNextExecutionDateValue(row).trim()
  return Boolean(value && value !== "-" && value !== "—")
}

function getNextExecutionEmptyLabel() {
  return "计划结束前无后续执行"
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

function getRemainingDaysLabel(row: InspectionPlanRecord) {
  if (!hasNextExecutionDate(row)) {
    return getNextExecutionEmptyLabel()
  }

  const nextExecutionAt = parseDateTime(getNextExecutionDateValue(row))
  if (!nextExecutionAt) {
    return getNextExecutionEmptyLabel()
  }

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startOfTargetDay = new Date(
    nextExecutionAt.getFullYear(),
    nextExecutionAt.getMonth(),
    nextExecutionAt.getDate(),
  ).getTime()
  const diffDays = Math.floor((startOfTargetDay - startOfToday) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return `逾期 ${Math.abs(diffDays)} 天`
  }

  return `剩余 ${diffDays} 天`
}

function getNextExecutionProgressValue(row: InspectionPlanRecord) {
  if (!hasNextExecutionDate(row)) {
    return 0
  }

  const nextExecutionAt = parseDateTime(getNextExecutionDateValue(row))
  if (!nextExecutionAt) {
    return 0
  }

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startOfTargetDay = new Date(
    nextExecutionAt.getFullYear(),
    nextExecutionAt.getMonth(),
    nextExecutionAt.getDate(),
  ).getTime()
  const diffDays = Math.floor((startOfTargetDay - startOfToday) / (1000 * 60 * 60 * 24))
  const windowDays = 365
  const progress = (Math.max(0, Math.min(windowDays, diffDays)) / windowDays) * 100

  return Math.round(progress)
}

function getNextExecutionProgressClass(row: InspectionPlanRecord) {
  if (!hasNextExecutionDate(row)) {
    return "[&_[data-slot=progress-indicator]]:bg-transparent"
  }

  const nextExecutionAt = parseDateTime(getNextExecutionDateValue(row))
  if (!nextExecutionAt) {
    return "[&_[data-slot=progress-indicator]]:bg-muted-foreground/40"
  }

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startOfTargetDay = new Date(
    nextExecutionAt.getFullYear(),
    nextExecutionAt.getMonth(),
    nextExecutionAt.getDate(),
  ).getTime()
  const diffDays = Math.floor((startOfTargetDay - startOfToday) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return "[&_[data-slot=progress-indicator]]:bg-destructive/70"
  }

  if (diffDays <= 30) {
    return "[&_[data-slot=progress-indicator]]:bg-orange-500/80"
  }

  return "[&_[data-slot=progress-indicator]]:bg-[#2383E2]"
}

function buildPageFilterText(row: InspectionPlanRecord) {
  return [
    row.id,
    row.uuid,
    row.code,
    row.planName,
    row.serviceName,
    row.customerName,
    row.customerUuid,
    row.serviceUuid,
    row.cycleDays ?? "",
    row.cycle,
    row.workOrderDuration,
    row.firstExecutionAt,
    row.latestExecutionAt,
    row.latestOrderNo,
    row.nextExecutionAt,
    row.creator,
    row.createdAt,
  ].join(" ")
}

function normalizeInspectionPlanRecord(
  item: InspectionPlanListItem,
  index: number,
): InspectionPlanRecord {
  const serviceName = getText(item.ServiceName, "-")
  const duration = getNumber(item.Duration)
  const workOrderDuration = getNumber(item.WorkOrderDuration)
  const fallbackId = getText(item.Id)
  const uuid = getText(item.Uuid)
  const code = getText(item.Code, fallbackId || "-")

  return {
    id: uuid || code || `${pageNum.value}-${index + 1}`,
    uuid: uuid || "-",
    customerUuid: getText(item.CustomerUuid),
    serviceUuid: getText(item.ServiceUuid),
    code: code || "-",
    planName: getText(item.Name, serviceName === "-" ? "检测计划" : `${serviceName}计划`),
    serviceName,
    customerName: getText(item.CorpName, "-"),
    cycleDays: duration,
    cycle: buildCycleLabel(duration),
    workOrderDuration: workOrderDuration === null ? "-" : `${workOrderDuration}天`,
    firstExecutionAt: formatDateOnly(getText(item.FirstTime, "-")),
    latestExecutionAt: formatDateOnly(getText(item.LastestTime, "-")),
    latestOrderNo: getText(item.LastestOrderNo, "-"),
    nextExecutionAt: formatDateOnly(getText(item.NextTime, "-")),
    creator: getText(item.Creator, "-"),
    createdAt: getText(item.CreatedAt, "-"),
    planStatus: normalizePlanStatus(item.PlanStatus),
    enableStatus: normalizeEnableStatus(item.Status),
  }
}

function formatDateOnly(value: string) {
  const normalized = value.trim()

  if (!normalized || normalized === "-" || normalized === "—") {
    return "-"
  }

  const [datePart] = normalized.split(/[ T]/)
  return datePart || normalized
}

function buildCycleLabel(duration: number | null) {
  if (duration !== null) {
    return `${duration}天`
  }

  return "-"
}

function normalizePlanStatus(value: unknown) {
  if (typeof value === "string") {
    const normalized = value.trim()
    return normalized || "-"
  }

  if (value === 1) {
    return "进行中"
  }

  if (value === 0) {
    return "未开始"
  }

  return "-"
}

function normalizeEnableStatus(value: unknown) {
  if (value === 1 || value === "1" || value === "启用") {
    return "启用"
  }

  if (value === 2 || value === "2" || value === 0 || value === "0" || value === "禁用" || value === "停用") {
    return "禁用"
  }

  return "-"
}

function getText(value: unknown, fallback = "") {
  if (typeof value === "string" && value.trim()) {
    return value.trim()
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }

  return fallback
}

function getNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string" && value.trim()) {
    const normalized = Number(value.trim())
    return Number.isFinite(normalized) ? normalized : null
  }

  return null
}

function asInspectionPlanRecord(row: Record<string, unknown>): InspectionPlanRecord {
  return row as InspectionPlanRecord
}
</script>

<template>
  <section class="flex min-h-0 flex-1 flex-col">
    <div v-if="errorMessage" class="px-4 pb-3 pt-3">
      <Alert variant="destructive">
        <i class="ri-error-warning-line" />
        <AlertTitle>检测计划接口加载失败</AlertTitle>
        <AlertDescription class="flex flex-wrap items-center gap-3">
          <span>{{ errorMessage }}</span>
          <Button size="sm" variant="outline" class="gap-2" @click="loadInspectionPlans">
            <i class="ri-refresh-line text-sm" />
            重试
          </Button>
        </AlertDescription>
      </Alert>
    </div>

    <TooltipProvider>
      <TablePage :page="page" :loading="loading" fill-available-height @primary-action="handleCreateInspectionPlan">
        <template #cell-planName="{ row }">
          <div class="inline-flex max-w-full items-baseline gap-1.5">
            <span class="truncate text-foreground">{{ row.planName }}</span>
            <span class="shrink-0 text-[#8C94A6]">#{{ row.code }}</span>
          </div>
        </template>

        <template #cell-customerName="{ row }">
          <button
            type="button"
            class="inline-flex max-w-full items-center gap-1 text-left text-[#2B67F6] transition-colors hover:text-[#1D4ED8]"
            @click.stop="jumpToCustomerDetail(asInspectionPlanRecord(row))"
          >
            <span class="truncate">{{ row.customerName }}</span>
            <i class="ri-arrow-right-up-line shrink-0 text-sm" />
          </button>
        </template>

        <template #cell-serviceName="{ row }">
          <button
            type="button"
            class="inline-flex max-w-full items-center gap-1 text-left text-[#2B67F6] transition-colors hover:text-[#1D4ED8]"
            @click.stop="jumpToServiceDetail(asInspectionPlanRecord(row))"
          >
            <span class="truncate">{{ row.serviceName }}</span>
            <i class="ri-arrow-right-up-line shrink-0 text-sm" />
          </button>
        </template>

        <template #cell-nextExecutionAt="{ row }">
          <Tooltip>
            <TooltipTrigger as-child>
              <div
                v-if="hasNextExecutionDate(asInspectionPlanRecord(row))"
                class="flex min-w-[180px] items-center gap-2"
              >
                <Progress
                  :model-value="getNextExecutionProgressValue(asInspectionPlanRecord(row))"
                  class="h-1.5 max-w-[120px] bg-[#E9EDF2] [&_[data-slot=progress-indicator]]:transition-all"
                  :class="getNextExecutionProgressClass(asInspectionPlanRecord(row))"
                />
                <span class="shrink-0 text-xs text-muted-foreground">
                  {{ getRemainingDaysLabel(asInspectionPlanRecord(row)) }}
                </span>
              </div>
              <span v-else class="text-xs text-muted-foreground">
                {{ getNextExecutionEmptyLabel() }}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" align="start">
              下次执行时间：{{ hasNextExecutionDate(asInspectionPlanRecord(row)) ? row.nextExecutionAt : getNextExecutionEmptyLabel() }}
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
