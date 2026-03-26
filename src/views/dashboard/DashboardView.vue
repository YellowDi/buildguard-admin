<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue"
import { useRouter } from "vue-router"
import { VisAxis, VisDonut, VisDonutSelectors, VisLine, VisSingleContainer, VisStackedBar, VisXYContainer } from "@unovis/vue"

import TopTabSwitch from "@/components/layout/TopTabSwitch.vue"
import type { ChartConfig } from "@/components/ui/chart"
import {
  ChartContainer,
  ChartCrosshair,
  ChartLegendContent,
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
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { fetchBuildings, type BuildingListItem } from "@/lib/buildings-api"
import { fetchWorkOrders, type WorkOrderListItem } from "@/lib/work-orders-api"
import { handleApiError } from "@/lib/api-errors"
import alarmArchivesData from "@/mocks/alarm-archives.json"
import alarmQueriesData from "@/mocks/alarm-queries.json"
import customersData from "@/mocks/customers.json"
import inspectionPlansData from "@/mocks/inspection-plans.json"
import parksData from "@/mocks/parks.json"
import usersData from "@/mocks/users.json"

type TimeRange = "12m" | "6m" | "1m"

type UserRecord = {
  role: string
  status: string
}

type AlarmQueryRecord = {
  alarmTime: string
  status: string
  riskLevel: string
}

type AlarmArchiveRecord = {
  archivedAt: string
  archiveStatus: string
}

type CustomerRecord = {
  packageCode: string
}

type ParkRecord = {
  buildingCount: number
}

type InspectionPlanRecord = {
  status: string
}

type BuildingRiskTab = "high-risk" | "rectification" | "excellent"

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

const customerRecords = customersData as CustomerRecord[]
const inspectionPlanRecords = inspectionPlansData as InspectionPlanRecord[]
const parkRecords = parksData as ParkRecord[]
const userRecords = usersData as UserRecord[]
const alarmQueryRecords = alarmQueriesData as AlarmQueryRecord[]
const alarmArchiveRecords = alarmArchivesData as AlarmArchiveRecord[]
const router = useRouter()

type WorkOrderHistoryDatum = {
  date: Date
  monthKey: string
  total: number
  completionRate: number
  completionRateScaled: number
}

type WorkOrderSummary = {
  total: number
  pendingAssign: number
  pendingExecute: number
  executing: number
  completed: number
}

const workOrderHistoryItems = ref<WorkOrderHistoryDatum[]>([])
const workOrderHistoryLoading = ref(false)
const workOrderHistoryError = ref("")
const workOrderSummary = ref<WorkOrderSummary>({
  total: 0,
  pendingAssign: 0,
  pendingExecute: 0,
  executing: 0,
  completed: 0,
})

const workOrderHistoryChartConfig = {
  total: {
    label: "工单总量",
    color: "var(--chart-2)",
  },
  completionRateScaled: {
    label: "完成率 (%)",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

const timeRange = ref<TimeRange>("12m")
const activeBuildingRiskTab = ref<BuildingRiskTab>("high-risk")
const buildingRankingItems = ref<BuildingRankingItem[]>([])
const buildingRankingLoading = ref(false)
const buildingRankingError = ref("")
const leftDashboardSectionRef = ref<HTMLElement | null>(null)
const buildingRankingColumnHeight = ref<number | null>(null)
let leftDashboardSectionObserver: ResizeObserver | null = null

const filteredWorkOrderHistory = computed(() => {
  const monthCount = timeRange.value === "6m" ? 6 : timeRange.value === "1m" ? 1 : 12
  return workOrderHistoryItems.value.slice(-monthCount)
})

const workOrderHistoryMax = computed(() => {
  const max = Math.max(...filteredWorkOrderHistory.value.map(item => item.total), 0)
  return Math.max(10, Math.ceil(max / 10) * 10)
})

const alarmStatusTrendData = Object.values(
  [
    ...alarmQueryRecords.map(item => ({
      dateKey: item.alarmTime.slice(0, 10),
      pending: item.status === "待复核" ? 1 : 0,
      archived: 0,
    })),
    ...alarmArchiveRecords.map(item => ({
      dateKey: item.archivedAt.slice(0, 10),
      pending: 0,
      archived: item.archiveStatus === "已归档" ? 1 : 0,
    })),
  ].reduce<Record<string, { date: Date, pending: number, archived: number }>>((acc, item) => {
    acc[item.dateKey] ??= {
      date: new Date(`${item.dateKey}T00:00:00`),
      pending: 0,
      archived: 0,
    }

    acc[item.dateKey].pending += item.pending
    acc[item.dateKey].archived += item.archived

    return acc
  }, {}),
).sort((a, b) => a.date.getTime() - b.date.getTime())

type AlarmTrendDatum = (typeof alarmStatusTrendData)[number]

const alarmStatusChartConfig = {
  pending: {
    label: "待复核",
    color: "var(--chart-4)",
  },
  archived: {
    label: "已归档",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

const alarmTrendMax = Math.max(
  4,
  Math.max(...alarmStatusTrendData.map(item => item.pending + item.archived), 0),
)

const personnelRoleData = Object.entries(
  userRecords.reduce<Record<string, number>>((acc, item) => {
    acc[item.role] = (acc[item.role] ?? 0) + 1
    return acc
  }, {}),
).map(([role, count]) => ({
  role,
  count,
}))

type PersonnelRoleDatum = (typeof personnelRoleData)[number]

const personnelRoleChartConfig = {
  count: {
    label: "人数",
    color: undefined,
  },
  安全员: {
    label: "安全员",
    color: "var(--chart-1)",
  },
  驾驶员: {
    label: "驾驶员",
    color: "var(--chart-2)",
  },
  押运员: {
    label: "押运员",
    color: "var(--chart-3)",
  },
  调度员: {
    label: "调度员",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig

const numberFormatter = new Intl.NumberFormat("zh-CN")
const totalParkCount = parkRecords.length
const totalBuildingCount = parkRecords.reduce((sum, item) => sum + item.buildingCount, 0)
const signedContractCount = customerRecords.filter(item => item.packageCode).length
const activeInspectionPlanCount = inspectionPlanRecords.filter(item => item.status === "进行中").length

const statsCards = [
  {
    title: "平台客户总数",
    value: numberFormatter.format(customerRecords.length),
    unit: "家",
    detail: "当前平台已签约并接入的客户数量",
    highlight: `${numberFormatter.format(customerRecords.length)} 家客户正常服务中`,
  },
  {
    title: "空间覆盖",
    value: numberFormatter.format(totalParkCount),
    unit: "个园区",
    detail: "当前平台已接入的园区与建筑空间范围",
    highlight: `${numberFormatter.format(totalParkCount)} 个园区 / ${numberFormatter.format(totalBuildingCount)} 栋建筑`,
  },
  {
    title: "签约合同总数",
    value: numberFormatter.format(signedContractCount),
    unit: "份",
    detail: "按已签约客户套餐统计合同总量",
    highlight: `${numberFormatter.format(signedContractCount)} 份合同已完成签约归档`,
  },
  {
    title: "检测计划（执行中）",
    value: numberFormatter.format(activeInspectionPlanCount),
    unit: "个",
    detail: "当前状态为进行中的检测计划数量",
    highlight: `${numberFormatter.format(inspectionPlanRecords.length)} 个检测计划已纳入排期`,
  },
] as const

const chartShellClass = "group flex h-full min-w-0 w-full flex-col gap-2 rounded-xl p-0 transition-colors hover:bg-surface-tertiary sm:p-2"
const chartCardClass = "flex h-full min-w-0 w-full flex-col gap-0 overflow-hidden border-border/60 bg-surface-tertiary py-0 shadow-none transition-[background-color,box-shadow] group-hover:bg-card group-hover:shadow-sm"
const statsShellClass = "group flex min-w-0 w-full flex-col gap-2 rounded-xl p-0 transition-colors hover:bg-surface-tertiary sm:p-2"
const statsCardClass = "flex min-w-0 w-full flex-col overflow-hidden border-border/60 bg-surface-tertiary py-0 shadow-none transition-[background-color,box-shadow] group-hover:bg-card group-hover:shadow-sm"
const chartHeaderClass = "flex items-center px-0 sm:min-h-8 sm:pl-2 sm:pr-0"
const chartTitleClass = "text-sm font-semibold tracking-tight text-foreground"
const chartContentClass = "flex min-w-0 flex-1 flex-col p-2 sm:p-4"
const chartContainerClass = "aspect-auto min-w-0 w-full justify-start"
const chartBodyClass = "h-[260px] min-w-0 w-full sm:h-[300px]"
const chartMainBodyClass = "h-[220px] min-w-0 w-full sm:h-[250px]"
const dashboardTrendShellClass = "group flex min-w-0 w-full flex-col gap-2 rounded-xl p-0 transition-colors hover:bg-surface-tertiary sm:p-2"
const dashboardTrendCardClass = "flex min-w-0 w-full flex-col gap-0 overflow-hidden border-border/60 bg-surface-tertiary py-0 shadow-none transition-[background-color,box-shadow] group-hover:bg-card group-hover:shadow-sm"
const dashboardTrendContentClass = "flex min-w-0 flex-col p-2 sm:p-4"
const buildingRiskTabs = [
  { id: "high-risk", label: "高危" },
  { id: "rectification", label: "整改" },
  { id: "excellent", label: "优秀" },
]

const buildingRankedGroups = computed(() => ({
  "high-risk": buildingRankingItems.value
    .filter(item => item.riskTab === "high-risk")
    .sort((a, b) => a.score - b.score),
  rectification: buildingRankingItems.value
    .filter(item => item.riskTab === "rectification")
    .sort((a, b) => a.score - b.score),
  excellent: buildingRankingItems.value
    .filter(item => item.riskTab === "excellent")
    .sort((a, b) => b.score - a.score),
}))

const activeBuildingList = computed(() => buildingRankedGroups.value[activeBuildingRiskTab.value] ?? [])
const buildingRankingColumnStyle = computed(() => {
  if (!buildingRankingColumnHeight.value) {
    return undefined
  }

  return {
    height: `${buildingRankingColumnHeight.value}px`,
  }
})

onMounted(() => {
  setupLeftDashboardSectionObserver()
  void loadWorkOrderHistory()
  void loadBuildingRanking()
})

onBeforeUnmount(() => {
  leftDashboardSectionObserver?.disconnect()
  leftDashboardSectionObserver = null
})

function formatShortDate(date: number | Date, locale = "zh-CN") {
  return new Date(date).toLocaleDateString(locale, {
    month: "numeric",
    day: "numeric",
  })
}

function formatMonthLabel(date: number | Date, locale = "zh-CN") {
  return new Date(date).toLocaleDateString(locale, {
    month: "numeric",
  })
}

function formatCompletionRate(value: number) {
  return `${Math.round(value)}%`
}

function formatWorkOrderHistoryTooltipValue(key: string, value: unknown, payload: Record<string, unknown>) {
  if (key === "completionRateScaled") {
    return formatCompletionRate(toFiniteNumber(payload.completionRate) ?? 0)
  }

  return typeof value === "number" ? numberFormatter.format(value) : String(value ?? "-")
}

async function setupLeftDashboardSectionObserver() {
  await nextTick()

  const element = leftDashboardSectionRef.value
  if (!element || typeof ResizeObserver === "undefined") {
    return
  }

  updateBuildingRankingColumnHeight()

  leftDashboardSectionObserver = new ResizeObserver(() => {
    updateBuildingRankingColumnHeight()
  })

  leftDashboardSectionObserver.observe(element)
}

function updateBuildingRankingColumnHeight() {
  const leftElement = leftDashboardSectionRef.value
  if (!leftElement) {
    buildingRankingColumnHeight.value = null
    return
  }

  buildingRankingColumnHeight.value = Math.ceil(leftElement.getBoundingClientRect().height)
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

async function loadWorkOrderHistory() {
  workOrderHistoryLoading.value = true
  workOrderHistoryError.value = ""

  try {
    const workOrders = await fetchAllWorkOrders()
    workOrderHistoryItems.value = buildWorkOrderHistory(workOrders)
    workOrderSummary.value = buildWorkOrderSummary(workOrders)
  } catch (error) {
    workOrderHistoryItems.value = []
    workOrderSummary.value = {
      total: 0,
      pendingAssign: 0,
      pendingExecute: 0,
      executing: 0,
      completed: 0,
    }
    workOrderHistoryError.value = handleApiError(error, {
      mode: "silent",
      fallback: "历史趋势加载失败，请稍后重试。",
    })
  } finally {
    workOrderHistoryLoading.value = false
  }
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

function buildWorkOrderHistory(items: WorkOrderListItem[]) {
  const monthBuckets = new Map<string, { date: Date, total: number, completed: number }>()
  const referenceDate = resolveLatestWorkOrderDate(items) ?? new Date()

  for (let offset = 11; offset >= 0; offset -= 1) {
    const monthDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - offset, 1)
    const monthKey = toMonthKey(monthDate)

    monthBuckets.set(monthKey, {
      date: monthDate,
      total: 0,
      completed: 0,
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

    if (isCompletedWorkOrder(item)) {
      bucket.completed += 1
    }
  }

  const maxTotal = Math.max(...Array.from(monthBuckets.values(), bucket => bucket.total), 0)

  return Array.from(monthBuckets.entries()).map(([monthKey, bucket]) => {
    const completionRate = bucket.total > 0 ? Math.round((bucket.completed / bucket.total) * 100) : 0

    return {
      date: bucket.date,
      monthKey,
      total: bucket.total,
      completionRate,
      completionRateScaled: Math.round((completionRate / 100) * maxTotal),
    }
  })
}

function buildWorkOrderSummary(items: WorkOrderListItem[]): WorkOrderSummary {
  return items.reduce<WorkOrderSummary>((summary, item) => {
    summary.total += 1

    switch (resolveWorkOrderStage(item)) {
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
  }, {
    total: 0,
    pendingAssign: 0,
    pendingExecute: 0,
    executing: 0,
    completed: 0,
  })
}

function resolveLatestWorkOrderDate(items: WorkOrderListItem[]) {
  const sortedDates = items
    .map(item => resolveWorkOrderDate(item))
    .filter((value): value is Date => value instanceof Date)
    .sort((a, b) => a.getTime() - b.getTime())

  return sortedDates[sortedDates.length - 1] ?? null
}

function resolveWorkOrderDate(item: WorkOrderListItem) {
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

function isCompletedWorkOrder(item: WorkOrderListItem) {
  return resolveWorkOrderStage(item) === "completed"
}

function resolveWorkOrderStage(item: WorkOrderListItem) {
  const status = toFiniteNumber(item.Status)
  const result = toFiniteNumber(item.Result)

  if (status === 5 || (status === null && result === 1)) {
    return "completed"
  }

  if (status === 1 || status === 0) {
    return "pending-assign"
  }

  if (status === 2) {
    return "pending-execute"
  }

  if (status === 3 || status === 4) {
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
  <div class="mx-auto flex w-full max-w-[1360px] flex-col gap-4">
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
          <CardContent class="flex h-[132px] flex-col justify-between px-4 py-3">
            <div class="space-y-1.5">
              <div class="text-[1.75rem] font-semibold tracking-tight text-foreground sm:text-[1.875rem]">
                {{ stat.value }}
                <span class="ml-1 text-[1rem] font-medium text-muted-foreground sm:text-[1.125rem]">
                  {{ stat.unit }}
                </span>
              </div>
              <div class="text-sm text-muted-foreground">
                {{ stat.detail }}
              </div>
            </div>

            <div class="text-sm font-medium text-foreground">
              {{ stat.highlight }}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>

    <div class="grid items-stretch gap-4 xl:grid-cols-10">
      <div ref="leftDashboardSectionRef" class="flex min-w-0 flex-col gap-4 xl:col-span-7">
        <div :class="dashboardTrendShellClass">
          <CardHeader class="flex flex-col gap-2 px-0 sm:min-h-8 sm:flex-row sm:items-center sm:justify-between sm:pl-2 sm:pr-0">
            <div class="flex flex-wrap items-center gap-3">
              <CardTitle :class="chartTitleClass">
                历史数据趋势
              </CardTitle>

              <div class="flex items-center gap-3 text-xs text-muted-foreground">
                <div class="flex items-center gap-1.5">
                  <span
                    class="h-2.5 w-2.5 rounded-sm"
                    :style="{ backgroundColor: workOrderHistoryChartConfig.total.color }"
                  />
                  <span>{{ workOrderHistoryChartConfig.total.label }}</span>
                </div>

                <div class="flex items-center gap-1.5">
                  <span
                    class="h-0.5 w-4 rounded-full"
                    :style="{ backgroundColor: workOrderHistoryChartConfig.completionRateScaled.color }"
                  />
                  <span>{{ workOrderHistoryChartConfig.completionRateScaled.label }}</span>
                </div>
              </div>
            </div>

            <Select v-model="timeRange">
              <SelectTrigger
                class="flex h-8 w-full rounded-lg sm:ml-auto sm:w-[132px]"
                aria-label="选择时间范围"
              >
                <SelectValue placeholder="过去 12 个月" />
              </SelectTrigger>

              <SelectContent class="rounded-xl">
                <SelectItem value="12m" class="rounded-lg">
                  过去 12 个月
                </SelectItem>
                <SelectItem value="6m" class="rounded-lg">
                  过去 6 个月
                </SelectItem>
                <SelectItem value="1m" class="rounded-lg">
                  过去 1 个月
                </SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>

          <Card :class="dashboardTrendCardClass">
            <CardContent :class="dashboardTrendContentClass">
              <div v-if="workOrderHistoryError" class="flex h-[250px] items-center justify-center text-sm text-destructive">
                {{ workOrderHistoryError }}
              </div>

              <div v-else-if="workOrderHistoryLoading" class="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
                正在加载历史趋势
              </div>

              <ChartContainer
                v-else
                :config="workOrderHistoryChartConfig"
                :class="chartContainerClass"
                :cursor="false"
              >
                <div class="mb-3 grid gap-2 sm:grid-cols-5">
                  <div class="rounded-lg border border-border/60 bg-card px-3 py-2 transition-colors hover:bg-muted/60">
                    <div class="text-[11px] text-muted-foreground">
                      历史工单总数
                    </div>
                    <div class="mt-1 text-lg font-semibold tracking-tight text-foreground">
                      {{ numberFormatter.format(workOrderSummary.total) }}
                    </div>
                  </div>
                  <div class="rounded-lg border border-border/60 bg-card px-3 py-2 transition-colors hover:bg-muted/60">
                    <div class="text-[11px] text-muted-foreground">
                      待指派
                    </div>
                    <div class="mt-1 text-lg font-semibold tracking-tight text-foreground">
                      {{ numberFormatter.format(workOrderSummary.pendingAssign) }}
                    </div>
                  </div>
                  <div class="rounded-lg border border-border/60 bg-card px-3 py-2 transition-colors hover:bg-muted/60">
                    <div class="text-[11px] text-muted-foreground">
                      待执行
                    </div>
                    <div class="mt-1 text-lg font-semibold tracking-tight text-foreground">
                      {{ numberFormatter.format(workOrderSummary.pendingExecute) }}
                    </div>
                  </div>
                  <div class="rounded-lg border border-border/60 bg-card px-3 py-2 transition-colors hover:bg-muted/60">
                    <div class="text-[11px] text-muted-foreground">
                      执行中
                    </div>
                    <div class="mt-1 text-lg font-semibold tracking-tight text-foreground">
                      {{ numberFormatter.format(workOrderSummary.executing) }}
                    </div>
                  </div>
                  <div class="rounded-lg border border-border/60 bg-card px-3 py-2 transition-colors hover:bg-muted/60">
                    <div class="text-[11px] text-muted-foreground">
                      已完成
                    </div>
                    <div class="mt-1 text-lg font-semibold tracking-tight text-foreground">
                      {{ numberFormatter.format(workOrderSummary.completed) }}
                    </div>
                  </div>
                </div>

                <div :class="chartMainBodyClass">
                  <div class="relative h-full">
                    <VisXYContainer
                      :data="filteredWorkOrderHistory"
                      :margin="{ left: -20, right: 32, top: 8 }"
                      :y-domain="[0, workOrderHistoryMax]"
                    >
                      <VisStackedBar
                        :x="(d: WorkOrderHistoryDatum) => d.date"
                        :y="[(d: WorkOrderHistoryDatum) => d.total]"
                        :color="[workOrderHistoryChartConfig.total.color]"
                        :rounded-corners="4"
                        :bar-padding="0.35"
                      />

                      <VisLine
                        :x="(d: WorkOrderHistoryDatum) => d.date"
                        :y="(d: WorkOrderHistoryDatum) => d.completionRateScaled"
                        :color="workOrderHistoryChartConfig.completionRateScaled.color"
                        :line-width="2"
                      />

                      <VisAxis
                        type="x"
                        :x="(d: WorkOrderHistoryDatum) => d.date"
                        :tick-line="false"
                        :domain-line="false"
                        :grid-line="false"
                        :num-ticks="timeRange === '12m' ? 12 : timeRange === '6m' ? 6 : 1"
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
                        :color="(_d: WorkOrderHistoryDatum, i: number) => [workOrderHistoryChartConfig.total.color, workOrderHistoryChartConfig.completionRateScaled.color][i % 2]"
                      />

                    </VisXYContainer>

                    <div class="pointer-events-none absolute inset-y-0 right-0 flex flex-col justify-between pb-8 pt-2 text-[10px] text-muted-foreground">
                      <span>100%</span>
                      <span>75%</span>
                      <span>50%</span>
                      <span>25%</span>
                      <span>0%</span>
                    </div>
                  </div>
                </div>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <div :class="chartShellClass">
            <CardHeader :class="chartHeaderClass">
              <CardTitle :class="chartTitleClass">
                报警处置趋势
              </CardTitle>
            </CardHeader>

            <Card :class="`${chartCardClass} flex-1`">
              <CardContent :class="chartContentClass">
                <ChartContainer :config="alarmStatusChartConfig" :class="chartContainerClass">
                  <div :class="chartBodyClass">
                    <VisXYContainer
                      :data="alarmStatusTrendData"
                      :padding="{ top: 10, bottom: 10, left: 10, right: 10 }"
                      :y-domain="[0, alarmTrendMax]"
                    >
                      <VisStackedBar
                        :x="(d: AlarmTrendDatum) => d.date"
                        :y="[(d: AlarmTrendDatum) => d.pending, (d: AlarmTrendDatum) => d.archived]"
                        :color="[alarmStatusChartConfig.pending.color, alarmStatusChartConfig.archived.color]"
                        :rounded-corners="4"
                        :bar-padding="0.1"
                      />

                      <VisAxis
                        type="x"
                        :x="(d: AlarmTrendDatum) => d.date"
                        :tick-line="false"
                        :domain-line="false"
                        :grid-line="false"
                        :num-ticks="4"
                        :tick-format="(d: number) => formatShortDate(d)"
                        :tick-values="alarmStatusTrendData.map(d => d.date)"
                      />

                      <VisAxis
                        type="y"
                        :tick-line="false"
                        :domain-line="false"
                        :num-ticks="4"
                      />

                      <ChartTooltip />

                      <ChartCrosshair
                        :template="componentToString(alarmStatusChartConfig, ChartTooltipContent, {
                          labelFormatter: d => formatShortDate(d),
                        })"
                        color="#0000"
                      />
                    </VisXYContainer>
                  </div>

                  <ChartLegendContent />
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          <div :class="chartShellClass">
            <CardHeader :class="chartHeaderClass">
              <CardTitle :class="chartTitleClass">
                从业人员角色分布
              </CardTitle>
            </CardHeader>

            <Card :class="`${chartCardClass} flex-1`">
              <CardContent :class="chartContentClass">
                <ChartContainer
                  :config="personnelRoleChartConfig"
                  class="mx-auto flex min-w-0 w-full items-center justify-start"
                >
                  <div :class="chartBodyClass">
                    <VisSingleContainer
                      :data="personnelRoleData"
                      class="h-full w-full"
                      :margin="{ top: 30, bottom: 30 }"
                    >
                      <VisDonut
                        :value="(d: PersonnelRoleDatum) => d.count"
                        :color="(d: PersonnelRoleDatum) => personnelRoleChartConfig[d.role as keyof typeof personnelRoleChartConfig].color"
                        :arc-width="30"
                      />
                      <ChartTooltip
                        :triggers="{
                          [VisDonutSelectors.segment]: componentToString(personnelRoleChartConfig, ChartTooltipContent, { hideLabel: true })!,
                        }"
                      />
                    </VisSingleContainer>
                  </div>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div :class="`${chartShellClass} h-full min-h-0 overflow-hidden xl:col-span-3`" :style="buildingRankingColumnStyle">
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
            <TopTabSwitch
              v-model="activeBuildingRiskTab"
              :tabs="buildingRiskTabs"
              aria-label="切换建筑风险排行"
              :collapse-inactive="false"
              tone="default"
            />
          </div>
        </CardHeader>

        <div class="flex min-h-0 flex-1">
          <Card :class="`${chartCardClass} h-full min-h-0 w-full`">
            <CardContent class="flex h-full min-h-0 flex-col p-0">
              <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div v-if="buildingRankingError" class="flex h-full min-h-0 flex-col items-center justify-center gap-3 text-center">
                  <div class="text-sm text-destructive">
                    {{ buildingRankingError }}
                  </div>
                  <Button size="sm" variant="outline" @click="loadBuildingRanking">
                    重试
                  </Button>
                </div>

                <div v-else-if="buildingRankingLoading" class="flex h-full min-h-0 items-center justify-center text-sm text-muted-foreground">
                  正在加载建筑排行
                </div>

                <div v-else-if="activeBuildingList.length" class="flex-1 min-h-0 overflow-y-auto">
                  <button
                    v-for="(building, index) in activeBuildingList"
                    :key="building.id"
                    type="button"
                    class="group flex w-full items-center gap-2.5 border-b border-dashed border-border/70 pl-1 pr-3 py-2 text-left transition-[background-color,border-color] duration-150 last:border-b-0 hover:bg-muted/60"
                    @click="goToBuildingDetail(building)"
                  >
                    <div class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground transition-colors group-hover:bg-background">
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
                            <div class="text-base font-semibold tracking-tight text-foreground">
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

                <div v-else class="flex h-full min-h-0 items-center justify-center text-sm text-muted-foreground">
                  当前暂无可展示的建筑
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>

  </div>
</template>
