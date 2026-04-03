<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import { useRoute, useRouter } from "vue-router"
import { toast } from "vue-sonner"

import TablePageLoading from "@/components/loading/TablePageLoading.vue"
import TablePage from "@/components/table-page/TablePage.vue"
import { createTablePageDefinition, useTablePage } from "@/components/table-page/useTablePage"
import type { TablePageSchema } from "@/components/table-page/types"
import { useRouteTableSearch } from "@/composables/useRouteTableSearch"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { handleApiError } from "@/lib/api-errors"
import { listInspectionPlanRecords, type InspectionPlanRecord } from "@/lib/inspection-plan-records"

const inspectionPlans = ref<InspectionPlanRecord[]>([])
const loading = ref(false)
const errorMessage = ref("")

const schema: TablePageSchema<InspectionPlanRecord> = {
  title: "检测计划",
  description: "检测计划列表",
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
  columns: [
    {
      key: "code",
      label: "计划编号",
      filterType: "text",
      emphasis: "default",
      tone: "muted",
      filter: {
        type: "text",
        placeholder: "输入计划编号",
      },
      sort: true,
    },
    {
      key: "planName",
      label: "计划名称",
      filterType: "text",
      emphasis: "strong",
      tone: "primary",
      filter: {
        type: "text",
        placeholder: "输入计划名称",
        defaultVisible: true,
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
const showInitialLoading = computed(() => loading.value && !inspectionPlans.value.length && !errorMessage.value)

useRouteTableSearch(page, route)
onMounted(() => {
  void loadInspectionPlans()
})

async function loadInspectionPlans() {
  loading.value = true
  errorMessage.value = ""

  try {
    inspectionPlans.value = await listInspectionPlanRecords()
  } catch (error) {
    inspectionPlans.value = []
    errorMessage.value = handleApiError(error, {
      mode: "silent",
      fallback: "检测计划列表加载失败，请稍后重试。",
    })
  } finally {
    loading.value = false
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

  void router.push({
    name: "customer-detail",
    params: { id: row.customerUuid },
  })
}

function jumpToServiceDetail(row: InspectionPlanRecord) {
  if (!row.serviceUuid) {
    toast.error("当前检测计划缺少服务 Uuid，无法跳转检测服务详情")
    return
  }

  void router.push({
    name: "inspection-service-detail",
    params: { id: row.serviceUuid },
    query: row.customerUuid ? { customerUuid: row.customerUuid } : undefined,
  })
}

function extractDatePart(value: string) {
  const [datePart] = value.split(" ")
  return datePart ?? ""
}

function getNextExecutionDateValue(row: InspectionPlanRecord) {
  return row.nextExecutionAt || ""
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
  const nextExecutionAt = parseDateTime(getNextExecutionDateValue(row))
  if (!nextExecutionAt) {
    return "-"
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

function asInspectionPlanRecord(row: Record<string, unknown>): InspectionPlanRecord {
  return row as InspectionPlanRecord
}
</script>

<template>
  <div class="space-y-4">
    <Alert v-if="errorMessage" variant="destructive">
      <AlertTitle>检测计划加载失败</AlertTitle>
      <AlertDescription>{{ errorMessage }}</AlertDescription>
    </Alert>

    <TooltipProvider>
      <TablePageLoading v-if="showInitialLoading" />
      <TablePage v-else :page="page" @primary-action="handleCreateInspectionPlan">
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
              <div class="flex min-w-[180px] items-center gap-2">
                <Progress
                  :model-value="getNextExecutionProgressValue(asInspectionPlanRecord(row))"
                  class="h-1.5 max-w-[120px] bg-[#E9EDF2] [&_[data-slot=progress-indicator]]:transition-all"
                  :class="getNextExecutionProgressClass(asInspectionPlanRecord(row))"
                />
                <span class="shrink-0 text-xs text-muted-foreground">
                  {{ getRemainingDaysLabel(asInspectionPlanRecord(row)) }}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" align="start">
              下次执行时间：{{ row.nextExecutionAt || "-" }}
            </TooltipContent>
          </Tooltip>
        </template>
      </TablePage>
    </TooltipProvider>
  </div>
</template>
