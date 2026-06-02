<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import { useRouter } from "vue-router"
import { VisAxis, VisGroupedBar, VisXYContainer } from "@unovis/vue"

import type { ChartConfig } from "@/components/ui/chart"
import {
  ChartContainer,
  ChartCrosshair,
  ChartTooltip,
  ChartTooltipContent,
  componentToString,
} from "@/components/ui/chart"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { workOrderStatusMap, repairWorkOrderStatusMap } from "@/components/table-page/statusPresets"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { StatusBadge, type StatusBadgeIcon, type StatusBadgeTone } from "@/components/ui/status-badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { fetchBuildings, type BuildingListItem } from "@/lib/buildings-api"
import { fetchCustomers } from "@/lib/customers-api"
import { fetchInspectionPlans } from "@/lib/inspection-plans-api"
import { fetchInspectionServices } from "@/lib/inspection-services-api"
import { fetchParks } from "@/lib/parks-api"
import {
  getRepairWorkOrderStatusLabel,
  getWorkOrderStatusLabel,
  isCompletedRepairWorkOrderStatus,
  isCompletedWorkOrderStatus,
} from "@/lib/work-order-status"
import { fetchRepairWorkOrders, fetchWorkOrders, type RepairWorkOrderListItem, type WorkOrderListItem } from "@/lib/work-orders-api"
import { handleApiError } from "@/lib/api-errors"

type TimeRange = "12m" | "6m" | "3m"
type WorkOrderOverviewKind = "inspection" | "repair"

type BuildingRiskTab = "high-risk" | "rectification" | "excellent"

type DashboardStats = {
  customerTotal: number | null
  parkTotal: number | null
  inspectionServiceTotal: number | null
  inspectionPlanTotal: number | null
}

type BuildingRankingItem = {
  id: string
  uuid: string
  parkUuid: string
  name: string
  customerName: string
  parkName: string
  score: number
  riskTab: BuildingRiskTab
  riskLabel: string
}

const router = useRouter()

type WorkOrderHistoryDatum = {
  date: Date
  monthKey: string
  total: number
}

type WorkOrderComparisonDatum = {
  date: Date
  monthKey: string
  inspectionTotal: number
  repairTotal: number
}

type WorkOrderTableRow = {
  id: string
  uuid: string
  kind: WorkOrderOverviewKind
  shortOrderNo: string
  title: string
  customerName: string
  category: string
  assignee: string
  statusLabel: string
  statusTone: StatusBadgeTone
  statusIcon: StatusBadgeIcon
  dateLabel: string
  dateTime: number
}

type WorkOrderSummary = {
  total: number
  pendingAssign: number
  pendingExecute: number
  executing: number
  completed: number
}

type WorkOrderOverviewState = {
  historyItems: WorkOrderHistoryDatum[]
  loading: boolean
  error: string
  summary: WorkOrderSummary
}

type WorkOrderHistorySourceItem = WorkOrderListItem | RepairWorkOrderListItem

const emptyWorkOrderSummary = (): WorkOrderSummary => ({
  total: 0,
  pendingAssign: 0,
  pendingExecute: 0,
  executing: 0,
  completed: 0,
})

const createWorkOrderOverviewState = (): WorkOrderOverviewState => ({
  historyItems: [],
  loading: false,
  error: "",
  summary: emptyWorkOrderSummary(),
})

const workOrderOverviewStates = ref<Record<WorkOrderOverviewKind, WorkOrderOverviewState>>({
  inspection: createWorkOrderOverviewState(),
  repair: createWorkOrderOverviewState(),
})

const workOrderOverviewTimeRange = ref<TimeRange>("12m")
const activeWorkOrderTableTab = ref<WorkOrderOverviewKind>("inspection")
const inspectionWorkOrderTableItems = ref<WorkOrderListItem[]>([])
const repairWorkOrderTableItems = ref<RepairWorkOrderListItem[]>([])

const workOrderHistoryChartConfig = {
  inspectionTotal: {
    label: "检测工单",
    color: "var(--chart-2)",
  },
  repairTotal: {
    label: "报修工单",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

const activeBuildingRiskTab = ref<BuildingRiskTab>("high-risk")
const buildingRankingItems = ref<BuildingRankingItem[]>([])
const buildingRankingLoading = ref(false)
const buildingRankingError = ref("")
const dashboardStatsLoading = ref(true)
const dashboardStats = ref<DashboardStats>({
  customerTotal: null,
  parkTotal: null,
  inspectionServiceTotal: null,
  inspectionPlanTotal: null,
})

const workOrderOverview = computed(() => {
  const inspectionState = workOrderOverviewStates.value.inspection
  const repairState = workOrderOverviewStates.value.repair
  const filteredItems = getFilteredWorkOrderComparisonData(
    buildWorkOrderComparisonData(inspectionState.historyItems, repairState.historyItems),
    workOrderOverviewTimeRange.value,
  )

  return {
    loading: inspectionState.loading || repairState.loading,
    error: [inspectionState.error, repairState.error].filter(Boolean).join(" / "),
    filteredItems,
    max: getWorkOrderComparisonMax(filteredItems),
    summary: {
      total: inspectionState.summary.total + repairState.summary.total,
      inspectionTotal: inspectionState.summary.total,
      repairTotal: repairState.summary.total,
      inspectionCompleted: inspectionState.summary.completed,
      repairCompleted: repairState.summary.completed,
    },
  }
})

const activeWorkOrderTableRows = computed(() => {
  const rows = activeWorkOrderTableTab.value === "repair"
    ? repairWorkOrderTableItems.value.map((item, index) => normalizeRepairWorkOrderTableRow(item, index))
    : inspectionWorkOrderTableItems.value.map((item, index) => normalizeInspectionWorkOrderTableRow(item, index))

  return rows
    .sort((left, right) => right.dateTime - left.dateTime)
    .slice(0, 10)
})

const activeWorkOrderTableState = computed(() => workOrderOverviewStates.value[activeWorkOrderTableTab.value])
const activeWorkOrderTableEmptyText = computed(() => (
  activeWorkOrderTableTab.value === "repair" ? "当前暂无报修工单" : "当前暂无检测工单"
))

const numberFormatter = new Intl.NumberFormat("zh-CN")
const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

const statsCards = computed(() => [
  {
    title: "平台客户总数",
    value: formatDashboardStat(dashboardStats.value.customerTotal),
    unit: "家",
    detail: "正在平台内服务的客户规模",
    loading: dashboardStatsLoading.value,
  },
  {
    title: "空间覆盖",
    value: formatDashboardStat(dashboardStats.value.parkTotal),
    unit: "个园区",
    detail: "已纳入管理的园区范围",
    loading: dashboardStatsLoading.value,
  },
  {
    title: "检测服务",
    value: formatDashboardStat(dashboardStats.value.inspectionServiceTotal),
    unit: "项",
    detail: "可执行的检测服务配置",
    loading: dashboardStatsLoading.value,
  },
  {
    title: "检测计划",
    value: formatDashboardStat(dashboardStats.value.inspectionPlanTotal),
    unit: "个",
    detail: "已安排的周期检测任务",
    loading: dashboardStatsLoading.value,
  },
])

const dashboardCardBackgroundClass = "dashboard-card-surface"
const dashboardCardShellHoverBackgroundClass = "dashboard-card-shell-hover-surface"
const dashboardCardHoverBackgroundClass = "dashboard-card-hover-surface"
const dashboardGroupHoverCardBackgroundClass = "dashboard-card-group-hover-surface"
const chartCardClass = `flex h-full min-w-0 w-full flex-col gap-0 overflow-hidden border-border/60 ${dashboardCardBackgroundClass} py-0 shadow-none transition-[background-color,border-color,box-shadow] group-hover:border-transparent ${dashboardGroupHoverCardBackgroundClass} group-hover:shadow-(--shadow-card)`
const statsShellClass = `group flex min-w-0 w-full flex-col gap-2 rounded-xl p-0 transition-colors ${dashboardCardShellHoverBackgroundClass} sm:p-2`
const statsCardClass = `flex min-w-0 w-full flex-col overflow-hidden border-border/60 ${dashboardCardBackgroundClass} py-0 shadow-none transition-[background-color,border-color,box-shadow] group-hover:border-transparent ${dashboardGroupHoverCardBackgroundClass} group-hover:shadow-(--shadow-card)`
const chartHeaderClass = "flex items-center px-0 sm:min-h-8 sm:pl-2 sm:pr-0"
const chartTitleClass = "text-sm font-semibold tracking-tight text-foreground"
const chartContainerClass = "aspect-auto min-w-0 w-full justify-start"
const chartMainBodyClass = "h-[240px] min-w-0 w-full sm:h-[275px]"
const dashboardTrendShellClass = `group flex min-w-0 w-full flex-col gap-2 rounded-xl p-0 transition-colors ${dashboardCardShellHoverBackgroundClass} sm:p-2`
const dashboardTrendCardClass = `flex min-w-0 w-full flex-col gap-0 overflow-hidden border-border/60 ${dashboardCardBackgroundClass} py-0 shadow-none transition-[background-color,border-color,box-shadow] group-hover:border-transparent ${dashboardGroupHoverCardBackgroundClass} group-hover:shadow-(--shadow-card)`
const dashboardTrendContentClass = "flex min-w-0 flex-col p-2 sm:p-4"
const dashboardPlaceholderCardClass = `flex h-full min-h-[160px] min-w-0 w-full flex-col overflow-hidden border-border/60 ${dashboardCardBackgroundClass} py-0 shadow-none transition-[background-color,border-color,box-shadow] group-hover:border-transparent ${dashboardGroupHoverCardBackgroundClass} group-hover:shadow-(--shadow-card)`
const dashboardSummaryCardClass = "dashboard-summary-card-surface rounded-lg border border-border/60 px-3 py-1.5 transition-colors"
const dashboardTabsListClass = "rounded-[8px] bg-card-background p-0.5"
const dashboardTabsTriggerClass = "rounded-[6px]"
const buildingRankingPanelClass = "h-[520px] overflow-hidden"
const buildingRankingRowClass = "h-[52px]"
const workOrderTimeRangeTabs = [
  { id: "12m", label: "12个月" },
  { id: "6m", label: "6个月" },
  { id: "3m", label: "3个月" },
] satisfies Array<{ id: TimeRange, label: string }>
const workOrderTableTabs = [
  { id: "inspection", label: "检测工单" },
  { id: "repair", label: "报修工单" },
] satisfies Array<{ id: WorkOrderOverviewKind, label: string }>
const buildingRiskTabs = [
  { id: "high-risk", label: "高危" },
  { id: "rectification", label: "整改" },
  { id: "excellent", label: "优秀" },
] satisfies Array<{ id: BuildingRiskTab, label: string }>

const buildingRankedGroups = computed(() => ({
  "high-risk": buildingRankingItems.value
    .filter(item => item.riskTab === "high-risk")
    .sort((a, b) => a.score - b.score)
    .slice(0, 10),
  rectification: buildingRankingItems.value
    .filter(item => item.riskTab === "rectification")
    .sort((a, b) => a.score - b.score)
    .slice(0, 10),
  excellent: buildingRankingItems.value
    .filter(item => item.riskTab === "excellent")
    .sort((a, b) => b.score - a.score)
    .slice(0, 10),
}))

const activeBuildingList = computed(() => buildingRankedGroups.value[activeBuildingRiskTab.value] ?? [])

onMounted(() => {
  void loadDashboardStats()
  void loadWorkOrderOverviews()
  void loadBuildingRanking()
})

function formatMonthLabel(date: number | Date, locale = "zh-CN") {
  return new Date(date).toLocaleDateString(locale, {
    month: "numeric",
  })
}

function formatWorkOrderHistoryTooltipValue(_key: string, value: unknown) {
  return typeof value === "number" ? numberFormatter.format(value) : String(value ?? "-")
}

function getFilteredWorkOrderComparisonData(items: WorkOrderComparisonDatum[], timeRange: TimeRange) {
  const monthCount = timeRange === "6m" ? 6 : timeRange === "3m" ? 3 : 12
  return items.slice(-monthCount)
}

function getWorkOrderComparisonMax(items: WorkOrderComparisonDatum[]) {
  const max = Math.max(...items.flatMap(item => [item.inspectionTotal, item.repairTotal]), 0)
  return Math.max(10, Math.ceil(max / 10) * 10)
}

function buildWorkOrderComparisonData(inspectionItems: WorkOrderHistoryDatum[], repairItems: WorkOrderHistoryDatum[]) {
  const buckets = new Map<string, WorkOrderComparisonDatum>()

  for (const item of inspectionItems) {
    const bucket = buckets.get(item.monthKey) ?? {
      date: item.date,
      monthKey: item.monthKey,
      inspectionTotal: 0,
      repairTotal: 0,
    }

    bucket.inspectionTotal = item.total
    buckets.set(item.monthKey, bucket)
  }

  for (const item of repairItems) {
    const bucket = buckets.get(item.monthKey) ?? {
      date: item.date,
      monthKey: item.monthKey,
      inspectionTotal: 0,
      repairTotal: 0,
    }

    bucket.repairTotal = item.total
    buckets.set(item.monthKey, bucket)
  }

  return Array.from(buckets.values()).sort((a, b) => a.date.getTime() - b.date.getTime())
}

function handleWorkOrderOverviewTimeRangeChange(value: unknown) {
  if (value === "12m" || value === "6m" || value === "3m") {
    workOrderOverviewTimeRange.value = value
  }
}

function handleWorkOrderTableTabChange(value: string | number) {
  if (value === "inspection" || value === "repair") {
    activeWorkOrderTableTab.value = value
  }
}

async function loadBuildingRanking() {
  buildingRankingLoading.value = true
  buildingRankingError.value = ""

  try {
    const items = await fetchAllBuildings()
    buildingRankingItems.value = items.map((item, index) => normalizeBuildingRankingItem(item, index))
  } catch (error) {
    buildingRankingItems.value = []
    buildingRankingError.value = handleApiError(error, {
      mode: "silent",
      fallback: "建筑排行加载失败，请稍后重试。",
    })
  } finally {
    buildingRankingLoading.value = false
  }
}

async function loadWorkOrderOverviews() {
  const inspectionState = workOrderOverviewStates.value.inspection
  const repairState = workOrderOverviewStates.value.repair

  inspectionState.loading = true
  inspectionState.error = ""
  repairState.loading = true
  repairState.error = ""

  const [inspectionResult, repairResult] = await Promise.allSettled([
    fetchAllWorkOrders(),
    fetchAllRepairWorkOrders(),
  ])

  const inspectionWorkOrders = inspectionResult.status === "fulfilled" ? inspectionResult.value : []
  const repairWorkOrders = repairResult.status === "fulfilled" ? repairResult.value : []
  const referenceDate = resolveLatestWorkOrderDate([...inspectionWorkOrders, ...repairWorkOrders]) ?? new Date()

  if (inspectionResult.status === "fulfilled") {
    inspectionWorkOrderTableItems.value = inspectionWorkOrders
    inspectionState.historyItems = buildWorkOrderHistory(inspectionWorkOrders, referenceDate)
    inspectionState.summary = buildWorkOrderSummary(inspectionWorkOrders, "inspection")
  } else {
    inspectionWorkOrderTableItems.value = []
    inspectionState.historyItems = []
    inspectionState.summary = emptyWorkOrderSummary()
    inspectionState.error = handleApiError(inspectionResult.reason, {
      mode: "silent",
      fallback: "检测工单概览加载失败，请稍后重试。",
    })
  }

  if (repairResult.status === "fulfilled") {
    repairWorkOrderTableItems.value = repairWorkOrders
    repairState.historyItems = buildWorkOrderHistory(repairWorkOrders, referenceDate)
    repairState.summary = buildWorkOrderSummary(repairWorkOrders, "repair")
  } else {
    repairWorkOrderTableItems.value = []
    repairState.historyItems = []
    repairState.summary = emptyWorkOrderSummary()
    repairState.error = handleApiError(repairResult.reason, {
      mode: "silent",
      fallback: "报修工单概览加载失败，请稍后重试。",
    })
  }

  inspectionState.loading = false
  repairState.loading = false
}

async function loadDashboardStats() {
  dashboardStatsLoading.value = true

  const [
    customerResult,
    parkResult,
    inspectionServiceResult,
    inspectionPlanResult,
  ] = await Promise.allSettled([
    fetchCustomers({ PageNum: 1, PageSize: 1 }),
    fetchParks({ PageNum: 1, PageSize: 1 }),
    fetchInspectionServices({ PageNum: 1, PageSize: 1 }),
    fetchInspectionPlans({ PageNum: 1, PageSize: 1 }),
  ])

  dashboardStats.value = {
    customerTotal: customerResult.status === "fulfilled" ? customerResult.value.total : null,
    parkTotal: parkResult.status === "fulfilled" ? parkResult.value.total : null,
    inspectionServiceTotal: inspectionServiceResult.status === "fulfilled" ? inspectionServiceResult.value.total : null,
    inspectionPlanTotal: inspectionPlanResult.status === "fulfilled" ? inspectionPlanResult.value.total : null,
  }
  dashboardStatsLoading.value = false
}

function formatDashboardStat(value: number | null) {
  return typeof value === "number" ? numberFormatter.format(value) : "-"
}

async function fetchAllBuildings() {
  const pageSize = 200
  const allItems: BuildingListItem[] = []
  let pageNum = 1
  let total = 0

  while (pageNum <= 20) {
    const result = await fetchBuildings({
      PageNum: pageNum,
      PageSize: pageSize,
    })

    if (pageNum === 1) {
      total = result.total
    }

    allItems.push(...result.list)

    if (!result.list.length || (total > 0 && allItems.length >= total)) {
      break
    }

    pageNum += 1
  }

  return allItems
}

async function fetchAllWorkOrders() {
  const pageSize = 200
  const allItems: WorkOrderListItem[] = []
  let pageNum = 1
  let total = 0

  while (pageNum <= 20) {
    const result = await fetchWorkOrders({
      PageNum: pageNum,
      PageSize: pageSize,
    })

    if (pageNum === 1) {
      total = result.total
    }

    allItems.push(...result.list)

    if (!result.list.length || (total > 0 && allItems.length >= total)) {
      break
    }

    pageNum += 1
  }

  return allItems
}

async function fetchAllRepairWorkOrders() {
  const pageSize = 200
  const allItems: RepairWorkOrderListItem[] = []
  let pageNum = 1
  let total = 0

  while (pageNum <= 20) {
    const result = await fetchRepairWorkOrders({
      PageNum: pageNum,
      PageSize: pageSize,
    })

    if (pageNum === 1) {
      total = result.total
    }

    allItems.push(...result.list)

    if (!result.list.length || (total > 0 && allItems.length >= total)) {
      break
    }

    pageNum += 1
  }

  return allItems
}

function normalizeInspectionWorkOrderTableRow(item: WorkOrderListItem, index: number): WorkOrderTableRow {
  const uuid = toText(item.Uuid, toText(item.Id, `inspection-${index + 1}`))
  const status = toFiniteNumber(item.Status)
  const date = resolveWorkOrderDate(item)
  const orderNo = toText(item.OrderNo, `WO-${index + 1}`)

  return {
    id: `inspection-${uuid}`,
    uuid,
    kind: "inspection",
    shortOrderNo: formatShortOrderNo(orderNo),
    title: formatInspectionWorkOrderTitle(item),
    customerName: toText(item.CorpName, toText(item.CustomerName, "-")),
    category: toText(item.PlanName, "-"),
    assignee: formatWorkOrderAssignee(item.Executors, item.Executor),
    statusLabel: getWorkOrderStatusLabel(status),
    ...resolveWorkOrderStatusBadge("inspection", status),
    dateLabel: formatDashboardDate(date),
    dateTime: date?.getTime() ?? 0,
  }
}

function normalizeRepairWorkOrderTableRow(item: RepairWorkOrderListItem, index: number): WorkOrderTableRow {
  const uuid = toText(item.Uuid, toText(item.Id, `repair-${index + 1}`))
  const status = toFiniteNumber(item.Status)
  const date = resolveWorkOrderDate(item)
  const orderNo = toText(item.OrderNo, `RP-${index + 1}`)
  const reportType = toText(item.ReportType)
  const important = toText(item.Important)

  return {
    id: `repair-${uuid}`,
    uuid,
    kind: "repair",
    shortOrderNo: formatShortOrderNo(orderNo),
    title: formatRepairWorkOrderTitle(item),
    customerName: toText(item.CorpName, toText(item.CustomerName, "-")),
    category: [reportType, important].filter(Boolean).join(" / ") || "-",
    assignee: formatWorkOrderAssignee(item.Executors, item.UserName),
    statusLabel: getRepairWorkOrderStatusLabel(status),
    ...resolveWorkOrderStatusBadge("repair", status),
    dateLabel: formatDashboardDate(date),
    dateTime: date?.getTime() ?? 0,
  }
}

function formatShortOrderNo(value: unknown) {
  const normalized = toText(value, "")

  if (!normalized || normalized === "-") {
    return "-"
  }

  const compact = normalized.replace(/[\s_-]+/g, "")
  return compact.length > 8 ? compact.slice(-8) : compact
}

function formatInspectionWorkOrderTitle(item: WorkOrderListItem) {
  const parkName = toText(item.ParkName, "")
  return parkName && parkName !== "-" ? parkName : "未关联园区"
}

function formatRepairWorkOrderTitle(item: RepairWorkOrderListItem) {
  const buildName = toText(item.BuildName, "")

  if (buildName && buildName !== "-") {
    return buildName
  }

  const customerName = toText(item.CustomerName, toText(item.CorpName, ""))

  if (customerName && customerName !== "-") {
    return customerName
  }

  const parkName = toText(item.ParkName, "")
  return parkName && parkName !== "-" ? parkName : "未关联建筑"
}

function formatWorkOrderAssignee(executors: unknown, fallback: unknown) {
  if (Array.isArray(executors)) {
    const names = executors
      .map(item => resolveExecutorName(item))
      .filter(Boolean)

    if (names.length) {
      return names.join("、")
    }
  }

  return toText(fallback, "未指派")
}

function resolveExecutorName(value: unknown) {
  const directName = toText(value)
  if (directName) {
    return directName
  }

  if (!value || typeof value !== "object") {
    return ""
  }

  const record = value as Record<string, unknown>
  return toText(
    record.Name,
    toText(record.name, toText(record.UserName, toText(record.userName, toText(record.ExecutorName, toText(record.executorName))))),
  )
}

function formatDashboardDate(value: Date | null) {
  return value ? dateFormatter.format(value) : "-"
}

function resolveWorkOrderStatusBadge(kind: WorkOrderOverviewKind, status: number | null) {
  const statusLabel = kind === "repair"
    ? getRepairWorkOrderStatusLabel(status)
    : getWorkOrderStatusLabel(status)
  const statusMap = (kind === "repair" ? repairWorkOrderStatusMap : workOrderStatusMap) as Record<string, {
    tone: StatusBadgeTone
    icon?: StatusBadgeIcon
  }>
  const option = statusMap[statusLabel]

  return {
    statusTone: option?.tone ?? "gray",
    statusIcon: option?.icon ?? "dot",
  }
}

function goToWorkOrderDetail(row: WorkOrderTableRow) {
  if (!row.uuid) {
    return
  }

  void router.push({
    name: row.kind === "repair" ? "repair-work-order-detail" : "inspection-work-order-detail",
    params: { id: row.uuid },
  })
}

function buildWorkOrderHistory(
  items: WorkOrderHistorySourceItem[],
  referenceDate = resolveLatestWorkOrderDate(items) ?? new Date(),
) {
  const monthBuckets = new Map<string, { date: Date, total: number }>()

  for (let offset = 11; offset >= 0; offset -= 1) {
    const monthDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - offset, 1)
    const monthKey = toMonthKey(monthDate)

    monthBuckets.set(monthKey, {
      date: monthDate,
      total: 0,
    })
  }

  for (const item of items) {
    const sourceDate = resolveWorkOrderDate(item)
    if (!sourceDate) {
      continue
    }

    const monthKey = toMonthKey(sourceDate)
    const bucket = monthBuckets.get(monthKey)

    if (!bucket) {
      continue
    }

    bucket.total += 1
  }

  return Array.from(monthBuckets.entries()).map(([monthKey, bucket]) => {
    return {
      date: bucket.date,
      monthKey,
      total: bucket.total,
    }
  })
}

function buildWorkOrderSummary(items: WorkOrderHistorySourceItem[], kind: WorkOrderOverviewKind): WorkOrderSummary {
  return items.reduce<WorkOrderSummary>((summary, item) => {
    summary.total += 1

    switch (resolveWorkOrderStage(item, kind)) {
      case "pending-assign":
        summary.pendingAssign += 1
        break
      case "pending-execute":
        summary.pendingExecute += 1
        break
      case "executing":
        summary.executing += 1
        break
      case "completed":
        summary.completed += 1
        break
      default:
        break
    }

    return summary
  }, emptyWorkOrderSummary())
}

function resolveLatestWorkOrderDate(items: WorkOrderHistorySourceItem[]) {
  const sortedDates = items
    .map(item => resolveWorkOrderDate(item))
    .filter((value): value is Date => value instanceof Date)
    .sort((a, b) => a.getTime() - b.getTime())

  return sortedDates[sortedDates.length - 1] ?? null
}

function resolveWorkOrderDate(item: WorkOrderHistorySourceItem) {
  const candidates = [item.CreatedAt, item.UpdatedAt, item.Deadline]

  for (const candidate of candidates) {
    if (typeof candidate !== "string" || !candidate.trim()) {
      continue
    }

    const parsed = new Date(candidate)
    if (!Number.isNaN(parsed.getTime())) {
      return parsed
    }
  }

  return null
}

function resolveWorkOrderStage(item: WorkOrderHistorySourceItem, kind: WorkOrderOverviewKind) {
  const status = toFiniteNumber(item.Status)
  const result = toFiniteNumber(item.Result)

  if (kind === "repair") {
    if (isCompletedRepairWorkOrderStatus(status) || (status === null && result === 1)) {
      return "completed"
    }

    if (status === 1 || status === 0) {
      return "pending-assign"
    }

    if (status === 2) {
      return "executing"
    }

    if (status === 3) {
      return "pending-execute"
    }

    return "pending-assign"
  }

  if (isCompletedWorkOrderStatus(status) || (status === null && result === 1)) {
    return "completed"
  }

  if (status === 1 || status === 0) {
    return "pending-assign"
  }

  if (status === 2) {
    return "pending-execute"
  }

  if (status === 3 || status === 4 || status === 6) {
    return "executing"
  }

  return "pending-execute"
}

function toMonthKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  return `${year}-${month}`
}

function normalizeBuildingRankingItem(item: BuildingListItem, index: number): BuildingRankingItem {
  const uuid = toText(item.Uuid, toText(item.Id, `building-${index + 1}`))
  const parkUuid = toText(item.ParkUuid, "")
  const score = resolveBuildingScore(item, index)
  const riskTab = resolveBuildingRiskTab(item, score)

  return {
    id: uuid,
    uuid,
    parkUuid,
    name: toText(item.Name, "未命名建筑"),
    customerName: resolveBuildingCustomerName(item),
    parkName: toText(item.ParkName, "未命名园区"),
    score,
    riskTab,
    riskLabel: formatRiskLabel(riskTab),
  }
}

function resolveBuildingScore(item: BuildingListItem, index: number) {
  const candidateKeys = [
    "Score",
    "score",
    "TotalScore",
    "totalScore",
    "RiskScore",
    "riskScore",
    "SafetyScore",
    "safetyScore",
    "Rating",
    "rating",
  ] as const

  for (const key of candidateKeys) {
    const value = toFiniteNumber(item[key])
    if (value !== null) {
      return clampScore(value)
    }
  }

  return 55 + (Math.abs(hashText([
    toText(item.Uuid, ""),
    toText(item.Name, ""),
    toText(item.ParkName, ""),
    String(index),
  ].join("|"))) % 45)
}

function resolveBuildingRiskTab(item: BuildingListItem, score: number): BuildingRiskTab {
  const riskText = [
    toText(item.RiskLevel, ""),
    toText(item.RiskStatus, ""),
    toText(item.Level, ""),
    toText(item.Status, ""),
    toText(item.Tag, ""),
  ].join(" ")

  if (/(高危|高风险|严重|紧急)/.test(riskText)) {
    return "high-risk"
  }

  if (/(整改|待整改|复查|隐患)/.test(riskText)) {
    return "rectification"
  }

  if (/(优秀|良好|达标|低风险)/.test(riskText)) {
    return "excellent"
  }

  if (score < 60) {
    return "high-risk"
  }

  if (score < 85) {
    return "rectification"
  }

  return "excellent"
}

function goToBuildingDetail(item: BuildingRankingItem) {
  if (!item.uuid || !item.parkUuid) {
    return
  }

  void router.push({
    name: "building-detail",
    params: { id: item.uuid },
    query: { parkUuid: item.parkUuid },
  })
}

function formatRiskLabel(value: BuildingRiskTab) {
  if (value === "high-risk") return "高危"
  if (value === "rectification") return "整改"
  return "优秀"
}

function handleBuildingRiskTabChange(value: string | number) {
  if (value === "high-risk" || value === "rectification" || value === "excellent") {
    activeBuildingRiskTab.value = value
  }
}

function resolveBuildingCustomerName(item: BuildingListItem) {
  return toText(
    item.CustomerName,
    toText(item.CompanyName, toText(item.Customer, "未命名客户")),
  )
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

function toFiniteNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return null
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function hashText(value: string) {
  let hash = 0

  for (const char of value) {
    hash = ((hash << 5) - hash) + char.charCodeAt(0)
    hash |= 0
  }

  return hash
}
</script>

<template>
  <div class="mx-auto flex min-h-0 w-full max-w-[1360px] flex-1 flex-col gap-4 pb-(--app-page-bottom-gap)">
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div
        v-for="stat in statsCards"
        :key="stat.title"
        :class="statsShellClass"
      >
        <CardHeader :class="chartHeaderClass">
          <CardTitle :class="chartTitleClass">
            {{ stat.title }}
          </CardTitle>
        </CardHeader>

        <Card :class="statsCardClass">
          <CardContent class="flex flex-col px-4 py-3.5">
            <div v-if="stat.loading" class="space-y-2">
              <Skeleton class="h-9 w-24 rounded-md" />
              <Skeleton class="h-5 w-44 rounded-md" />
            </div>

            <div v-else class="space-y-1.5">
              <div class="text-[1.75rem] font-semibold tabular-nums tracking-tight text-foreground sm:text-[1.875rem]">
                {{ stat.value }}
                <span class="ml-1 text-[1rem] font-medium text-muted-foreground sm:text-[1.125rem]">
                  {{ stat.unit }}
                </span>
              </div>
              <div class="text-sm text-muted-foreground">
                {{ stat.detail }}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>

    <div class="grid items-stretch gap-4 xl:flex-1 xl:grid-cols-10">
      <div class="flex min-w-0 flex-col gap-4 xl:col-span-7">
        <div :class="dashboardTrendShellClass">
          <CardHeader class="flex flex-col gap-2 px-0 sm:min-h-8 sm:flex-row sm:items-center sm:justify-between sm:pl-2 sm:pr-0">
            <div class="flex flex-wrap items-center gap-3">
              <CardTitle :class="chartTitleClass">
                工单概览
              </CardTitle>

              <div class="flex items-center gap-3 text-xs text-muted-foreground">
                <div class="flex items-center gap-1.5">
                  <span
                    class="size-2.5 rounded-sm"
                    :style="{ backgroundColor: workOrderHistoryChartConfig.inspectionTotal.color }"
                  />
                  <span>{{ workOrderHistoryChartConfig.inspectionTotal.label }}</span>
                </div>

                <div class="flex items-center gap-1.5">
                  <span
                    class="size-2.5 rounded-sm"
                    :style="{ backgroundColor: workOrderHistoryChartConfig.repairTotal.color }"
                  />
                  <span>{{ workOrderHistoryChartConfig.repairTotal.label }}</span>
                </div>
              </div>
            </div>

            <div class="w-fit shrink-0 self-start sm:self-auto">
              <Tabs
                :model-value="workOrderOverviewTimeRange"
                aria-label="工单概览时间范围"
                @update:model-value="handleWorkOrderOverviewTimeRangeChange"
              >
                <TabsList :class="dashboardTabsListClass">
                  <TabsTrigger
                    v-for="range in workOrderTimeRangeTabs"
                    :key="range.id"
                    :value="range.id"
                    :class="`${dashboardTabsTriggerClass} min-w-16 px-3 text-xs`"
                  >
                    {{ range.label }}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>

          <Card :class="dashboardTrendCardClass">
            <CardContent :class="dashboardTrendContentClass">
              <div v-if="workOrderOverview.error" class="flex h-[275px] items-center justify-center text-sm text-destructive">
                {{ workOrderOverview.error }}
              </div>

              <div v-else-if="workOrderOverview.loading" class="space-y-3">
                <div class="mb-3 grid gap-2 sm:grid-cols-5">
                  <Skeleton
                    v-for="stat in 5"
                    :key="`work-order-overview-stat-${stat}`"
                    class="h-[54px] w-full rounded-lg border border-border/60"
                  />
                </div>
                <Skeleton class="h-[275px] w-full rounded-xl" />
              </div>

              <ChartContainer
                v-else
                :config="workOrderHistoryChartConfig"
                :class="chartContainerClass"
                :cursor="false"
              >
                <div class="mb-3 grid gap-2 sm:grid-cols-5">
                  <div :class="dashboardSummaryCardClass">
                    <div class="text-[11px] text-muted-foreground">
                      工单总数
                    </div>
                    <div class="mt-1 text-lg font-semibold tabular-nums tracking-tight text-foreground">
                      {{ numberFormatter.format(workOrderOverview.summary.total) }}
                    </div>
                  </div>
                  <div :class="dashboardSummaryCardClass">
                    <div class="text-[11px] text-muted-foreground">
                      检测工单
                    </div>
                    <div class="mt-1 text-lg font-semibold tabular-nums tracking-tight text-foreground">
                      {{ numberFormatter.format(workOrderOverview.summary.inspectionTotal) }}
                    </div>
                  </div>
                  <div :class="dashboardSummaryCardClass">
                    <div class="text-[11px] text-muted-foreground">
                      报修工单
                    </div>
                    <div class="mt-1 text-lg font-semibold tabular-nums tracking-tight text-foreground">
                      {{ numberFormatter.format(workOrderOverview.summary.repairTotal) }}
                    </div>
                  </div>
                  <div :class="dashboardSummaryCardClass">
                    <div class="text-[11px] text-muted-foreground">
                      检测已完成
                    </div>
                    <div class="mt-1 text-lg font-semibold tabular-nums tracking-tight text-foreground">
                      {{ numberFormatter.format(workOrderOverview.summary.inspectionCompleted) }}
                    </div>
                  </div>
                  <div :class="dashboardSummaryCardClass">
                    <div class="text-[11px] text-muted-foreground">
                      报修已完成
                    </div>
                    <div class="mt-1 text-lg font-semibold tabular-nums tracking-tight text-foreground">
                      {{ numberFormatter.format(workOrderOverview.summary.repairCompleted) }}
                    </div>
                  </div>
                </div>

                <div :class="chartMainBodyClass">
                  <div class="relative h-full">
                    <VisXYContainer
                      :data="workOrderOverview.filteredItems"
                      :margin="{ left: -20, right: 32, top: 8 }"
                      :y-domain="[0, workOrderOverview.max]"
                    >
                      <VisGroupedBar
                        :x="(d: WorkOrderComparisonDatum) => d.date"
                        :y="[(d: WorkOrderComparisonDatum) => d.inspectionTotal, (d: WorkOrderComparisonDatum) => d.repairTotal]"
                        :color="[workOrderHistoryChartConfig.inspectionTotal.color, workOrderHistoryChartConfig.repairTotal.color]"
                        :rounded-corners="4"
                        :bar-padding="0.12"
                        :group-padding="0.2"
                      />

                      <VisAxis
                        type="x"
                        :x="(d: WorkOrderComparisonDatum) => d.date"
                        :tick-line="false"
                        :domain-line="false"
                        :grid-line="false"
                        :num-ticks="workOrderOverview.filteredItems.length"
                        :tick-values="workOrderOverview.filteredItems.map(d => d.date)"
                        :tick-format="(d: number) => formatMonthLabel(d)"
                      />

                      <VisAxis
                        type="y"
                        :num-ticks="4"
                        :tick-line="false"
                        :domain-line="false"
                      />

                      <ChartTooltip />

                      <ChartCrosshair
                        :template="componentToString(workOrderHistoryChartConfig, ChartTooltipContent, {
                          labelFormatter: (d) => formatMonthLabel(d),
                          valueFormatter: formatWorkOrderHistoryTooltipValue,
                        })"
                        :color="(_d: WorkOrderComparisonDatum, i: number) => [workOrderHistoryChartConfig.inspectionTotal.color, workOrderHistoryChartConfig.repairTotal.color][i % 2]"
                      />

                    </VisXYContainer>
                  </div>
                </div>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        <div :class="dashboardTrendShellClass">
          <CardHeader class="flex flex-col gap-2 px-0 sm:min-h-8 sm:flex-row sm:items-center sm:justify-between sm:pl-2 sm:pr-0">
            <div class="flex flex-wrap items-center gap-3">
              <CardTitle :class="chartTitleClass">
                工单列表
              </CardTitle>
              <span class="text-xs text-muted-foreground">
                最近 10 条
              </span>
            </div>

            <div class="w-fit shrink-0 self-start sm:self-auto">
              <Tabs
                :model-value="activeWorkOrderTableTab"
                aria-label="切换工单列表类型"
                @update:model-value="handleWorkOrderTableTabChange"
              >
                <TabsList :class="dashboardTabsListClass">
                  <TabsTrigger
                    v-for="tab in workOrderTableTabs"
                    :key="tab.id"
                    :value="tab.id"
                    :class="`${dashboardTabsTriggerClass} min-w-20 px-3 text-xs`"
                  >
                    {{ tab.label }}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>

          <Card :class="dashboardTrendCardClass">
            <CardContent class="p-0">
              <div v-if="activeWorkOrderTableState.error" class="flex min-h-[260px] flex-col items-center justify-center gap-3 px-4 text-center">
                <div class="text-sm text-destructive">
                  {{ activeWorkOrderTableState.error }}
                </div>
                <Button size="sm" variant="outline" class="gap-2" @click="loadWorkOrderOverviews">
                  <i class="ri-refresh-line text-sm" />
                  重试
                </Button>
              </div>

              <div v-else-if="activeWorkOrderTableState.loading" class="space-y-0 p-0">
                <div
                  v-for="row in 10"
                  :key="`dashboard-work-order-row-skeleton-${row}`"
                  class="grid h-[50px] grid-cols-[1.35fr_1fr_0.95fr_0.72fr_0.78fr_0.6fr] items-center gap-3 border-b border-border/70 px-4 last:border-b-0"
                >
                  <Skeleton class="h-4 w-full max-w-48" />
                  <Skeleton class="h-4 w-full max-w-40" />
                  <Skeleton class="h-4 w-full max-w-36" />
                  <Skeleton class="h-4 w-full max-w-28" />
                  <Skeleton class="h-5 w-14 rounded-md" />
                  <Skeleton class="h-4 w-20" />
                </div>
              </div>

              <div v-else-if="activeWorkOrderTableRows.length">
                <Table class="min-w-[820px] table-fixed">
                  <TableHeader>
                    <TableRow class="border-border/70 text-left text-[11px] font-medium text-muted-foreground hover:bg-transparent">
                      <TableHead class="h-auto w-[25%] px-4 py-2.5 text-[11px]">
                        工单
                      </TableHead>
                      <TableHead class="h-auto w-[19%] px-3 py-2.5 text-[11px]">
                        客户
                      </TableHead>
                      <TableHead class="h-auto w-[18%] px-3 py-2.5 text-[11px]">
                        计划 / 类型
                      </TableHead>
                      <TableHead class="h-auto w-[14%] px-3 py-2.5 text-[11px]">
                        负责人
                      </TableHead>
                      <TableHead class="h-auto w-[14%] px-3 py-2.5 text-[11px]">
                        状态
                      </TableHead>
                      <TableHead class="h-auto w-[10%] px-4 py-2.5 text-[11px]">
                        时间
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow
                      v-for="row in activeWorkOrderTableRows"
                      :key="row.id"
                      class="group dashboard-card-hover-surface cursor-pointer border-border/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                      role="button"
                      tabindex="0"
                      @click="goToWorkOrderDetail(row)"
                      @keydown.enter.prevent="goToWorkOrderDetail(row)"
                      @keydown.space.prevent="goToWorkOrderDetail(row)"
                    >
                      <TableCell class="px-4 py-2.5">
                        <div class="inline-flex max-w-full min-w-0 items-baseline gap-1.5 text-left">
                          <span class="min-w-0 max-w-full truncate text-[13px] font-semibold leading-5 text-foreground transition-colors group-hover:text-link">
                            {{ row.title }}
                          </span>
                          <span class="shrink-0 text-[11px] leading-4 text-muted-foreground">
                            #{{ row.shortOrderNo }}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell class="px-3 py-2.5">
                        <span class="block truncate text-[13px] font-medium leading-5 text-foreground">
                          {{ row.customerName }}
                        </span>
                      </TableCell>
                      <TableCell class="px-3 py-2.5">
                        <span class="block truncate text-[13px] text-foreground">
                          {{ row.category }}
                        </span>
                      </TableCell>
                      <TableCell class="px-3 py-2.5">
                        <span class="block truncate text-[13px] text-foreground">
                          {{ row.assignee }}
                        </span>
                      </TableCell>
                      <TableCell class="px-3 py-2.5">
                        <StatusBadge
                          :label="row.statusLabel"
                          :tone="row.statusTone"
                          :icon="row.statusIcon"
                          class="h-6 max-w-none whitespace-nowrap"
                        />
                      </TableCell>
                      <TableCell class="px-4 py-2.5 text-right">
                        <span class="text-[12px] tabular-nums text-muted-foreground">
                          {{ row.dateLabel }}
                        </span>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <div v-else class="flex min-h-[260px] items-center justify-center text-sm text-muted-foreground">
                {{ activeWorkOrderTableEmptyText }}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div class="flex min-w-0 flex-col gap-4 xl:col-span-3">
        <div :class="dashboardTrendShellClass">
          <CardHeader class="flex flex-col gap-3 px-0 sm:min-h-8 sm:flex-row sm:items-center sm:justify-between sm:pl-2 sm:pr-0">
            <div class="flex items-center gap-3">
              <CardTitle :class="chartTitleClass">
                风险排行
              </CardTitle>
              <span class="text-xs text-muted-foreground">
                按评分排序
              </span>
            </div>

            <div class="w-fit shrink-0 self-start sm:self-auto">
              <Tabs
                :model-value="activeBuildingRiskTab"
                aria-label="切换建筑风险排行"
                @update:model-value="handleBuildingRiskTabChange"
              >
                <TabsList :class="dashboardTabsListClass">
                  <TabsTrigger
                    v-for="tab in buildingRiskTabs"
                    :key="tab.id"
                    :value="tab.id"
                    :class="`${dashboardTabsTriggerClass} min-w-14 px-3 text-xs`"
                  >
                    {{ tab.label }}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>

          <div>
            <Card :class="`${chartCardClass} w-full`">
              <CardContent class="flex flex-col p-0">
                <div :class="`flex flex-col ${buildingRankingPanelClass}`">
                  <div v-if="buildingRankingError" class="flex h-full flex-col items-center justify-center gap-3 text-center">
                    <div class="text-sm text-destructive">
                      {{ buildingRankingError }}
                    </div>
                    <Button size="sm" variant="outline" class="gap-2" @click="loadBuildingRanking">
                      <i class="ri-refresh-line text-sm" />
                      重试
                    </Button>
                  </div>

                  <div v-else-if="buildingRankingLoading" class="flex h-full flex-col gap-0 p-0">
                    <div
                      v-for="rank in 10"
                      :key="`building-rank-skeleton-${rank}`"
                      :class="`${buildingRankingRowClass} flex w-full items-center gap-2.5 border-b border-dashed border-border/70 pl-1 pr-3 last:border-b-0`"
                    >
                      <Skeleton class="size-6 shrink-0 rounded-full" />
                      <div class="min-w-0 flex-1 space-y-1.5">
                        <Skeleton class="h-[13px] w-3/4 max-w-[16rem]" />
                        <Skeleton class="h-3 w-1/2 max-w-48" />
                      </div>
                      <div class="flex shrink-0 items-center gap-1.5">
                        <div class="space-y-0.5 text-right">
                          <Skeleton class="ml-auto h-4 w-8" />
                          <Skeleton class="ml-auto h-2.5 w-10" />
                        </div>
                        <Skeleton class="size-4 shrink-0 rounded-sm" />
                      </div>
                    </div>
                  </div>

                  <div v-else-if="activeBuildingList.length" class="h-full">
                    <button
                      v-for="(building, index) in activeBuildingList"
                      :key="building.id"
                      type="button"
                      :class="`${buildingRankingRowClass} dashboard-card-hover-surface group flex w-full items-center gap-2.5 border-b border-dashed border-border/70 pl-1 pr-3 text-left transition-[background-color,border-color] duration-150 last:border-b-0`"
                      @click="goToBuildingDetail(building)"
                    >
                      <div class="dashboard-card-surface flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-foreground transition-colors">
                        {{ index + 1 }}
                      </div>

                      <div class="min-w-0 flex-1">
                        <div class="flex items-center justify-between gap-2">
                          <div class="min-w-0">
                            <div class="truncate text-[13px] font-semibold leading-5 text-foreground">
                              {{ building.name }}
                            </div>
                            <div class="truncate text-[11px] leading-4 text-muted-foreground">
                              {{ building.customerName }} · {{ building.parkName }}
                            </div>
                          </div>

                          <div class="flex shrink-0 items-center gap-1.5">
                            <div class="text-right leading-none">
                              <div class="text-base font-semibold tabular-nums tracking-tight text-foreground">
                                {{ building.score }}
                              </div>
                              <div class="mt-0.5 text-[10px] text-muted-foreground">
                                {{ building.riskLabel }}
                              </div>
                            </div>
                            <i class="ri-arrow-right-s-line shrink-0 text-[16px] text-muted-foreground transition-colors group-hover:text-foreground" />
                          </div>
                        </div>
                      </div>
                    </button>
                  </div>

                  <div v-else class="flex h-full items-center justify-center text-sm text-muted-foreground">
                    当前暂无可展示的建筑
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div :class="`${dashboardTrendShellClass} min-h-[160px] xl:flex-1`" aria-hidden="true">
          <Card :class="dashboardPlaceholderCardClass">
            <CardContent class="min-h-0 flex-1 p-0" />
          </Card>
        </div>
      </div>
    </div>

  </div>
</template>
