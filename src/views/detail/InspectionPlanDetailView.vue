<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { toast } from "vue-sonner"

import DetailRelationModule from "@/components/detail/DetailRelationModule.vue"
import LinkedEntityDetailSheet from "@/components/detail/LinkedEntityDetailSheet.vue"
import WorkOrderPreviewSheet from "@/components/detail/WorkOrderPreviewSheet.vue"
import type { DetailFieldSection, DetailRelationModuleSchema } from "@/components/detail/types"
import DetailFieldSections from "@/components/detail/DetailFieldSections.vue"
import DetailFieldsSkeleton from "@/components/loading/DetailFieldsSkeleton.vue"
import DetailRelationSkeleton from "@/components/loading/DetailRelationSkeleton.vue"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { workOrderStatusMap } from "@/components/table-page/statusPresets"
import { StatusBadge } from "@/components/ui/status-badge"
import { TooltipWrap } from "@/components/ui/tooltip"
import { detailBreadcrumbTitle } from "@/composables/useDetailBreadcrumbTitle"
import DetailLayout from "@/layouts/DetailLayout.vue"
import { handleApiError } from "@/lib/api-errors"
import { toMobileActionLabel } from "@/lib/mobileActionLabel"
import { getWorkOrderStatusLabel } from "@/lib/work-order-status"
import { deleteInspectionPlan, fetchInspectionPlanDetail, type InspectionPlanListItem } from "@/lib/inspection-plans-api"
import { fetchWorkOrders, type WorkOrderListItem } from "@/lib/work-orders-api"

type InspectionPlanWorkOrderRow = {
  id: string
  uuid: string
  customerUuid: string
  orderNo: string
  executor: string
  executors: string[]
  statusValue: number | null
  statusLabel: string
  resultLabel: string
  score: number | null
  scoreLabel: string
  deadline: string
  createdAt: string
}

const route = useRoute()
const router = useRouter()

const detail = ref<InspectionPlanListItem | null>(null)
const loading = ref(false)
const errorMessage = ref("")
const workOrders = ref<InspectionPlanWorkOrderRow[]>([])
const workOrdersTotal = ref(0)
const workOrdersLoading = ref(false)
const workOrdersErrorMessage = ref("")
const deleteConfirmOpen = ref(false)
const deleteSubmitting = ref(false)
const linkedDetailSheetOpen = ref(false)
const linkedDetailSheetKind = ref<"customer" | "service" | "plan" | "park" | null>(null)
const linkedDetailSheetUuid = ref("")
const workOrderPreviewSheetOpen = ref(false)
const activeWorkOrderPreviewUuid = ref("")
const activeWorkOrderPreviewCustomerUuid = ref("")
let latestRequestId = 0
let latestWorkOrdersRequestId = 0

const inspectionPlanUuid = computed(() => typeof route.params.id === "string" ? route.params.id.trim() : "")
const customerUuid = computed(() => toText(detail.value?.CustomerUuid, ""))
const serviceUuid = computed(() => toText(detail.value?.ServiceUuid, ""))
const hasMoreWorkOrders = computed(() => workOrdersTotal.value > workOrders.value.length)
const workOrdersGroupTitle = computed(() => hasMoreWorkOrders.value ? `仅展示最近 ${workOrders.value.length} 条` : "")

const fieldSections = computed<DetailFieldSection[]>(() => {
  const current = detail.value
  if (!current) {
    return []
  }

  return [
    {
      key: "inspection-plan-basic",
      title: "计划信息",
      rows: [
        { key: "name", label: "计划名称", value: toText(current.Name, "未命名计划") },
        { key: "code", label: "计划编号", value: toText(current.Code, "-"), valueClass: "text-muted-foreground" },
        {
          key: "customer-name",
          label: "所属客户",
          value: toText(current.CorpName, "-"),
          linkAction: customerUuid.value ? { onClick: goToCustomerDetail } : undefined,
        },
        {
          key: "service-name",
          label: "关联服务",
          value: toText(current.ServiceName, "-"),
          linkAction: serviceUuid.value ? { onClick: goToServiceDetail } : undefined,
        },
        { key: "duration", label: "执行频率", value: formatDayValue(current.Duration) },
        { key: "work-order-duration", label: "工单时长", value: formatDayValue(current.WorkOrderDuration) },
        {
          key: "first-time",
          label: "首次执行时间",
          value: formatDateOnly(toText(current.FirstTime, "-")),
          suffixHint: getElapsedDaysHint(current.FirstTime),
        },
        {
          key: "next-time",
          label: "下次执行时间",
          value: formatNextExecutionValue(current.NextTime),
          valueClass: getNextExecutionValueClass(current.NextTime),
          suffixHint: getRemainingDaysHint(current.NextTime),
        },
        {
          key: "end-time",
          label: "计划结束时间",
          value: formatDateOnly(toText(current.EndTime, "-")),
          suffixHint: getRemainingDaysHint(current.EndTime),
        },
        {
          key: "lastest-time",
          label: "最近执行时间",
          value: formatDateOnly(toText(current.LastestTime, "-")),
          suffixHint: getElapsedDaysHint(current.LastestTime),
        },
        { key: "lastest-order-no", label: "最近执行订单号", value: toText(current.LastestOrderNo, "-"), valueClass: "text-muted-foreground" },
        { key: "creator", label: "创建人", value: toText(current.Creator, "-") },
        { key: "created-at", label: "创建时间", value: toText(current.CreatedAt, "-") },
      ],
    },
  ]
})

const workOrdersModule = computed<DetailRelationModuleSchema<InspectionPlanWorkOrderRow>>(() => ({
  key: "inspection-plan-work-orders",
  title: "计划生成工单",
  count: workOrdersTotal.value,
  emptyState: {
    title: "暂无计划工单",
    description: "当前检测计划还没有生成可展示的工单记录。",
    icon: "ri-file-list-3-line",
  },
  rowKey: "uuid",
  mobileMinWidth: "42rem",
  columnTemplateMobile: "minmax(10rem, 1.5fr) minmax(6.25rem, 0.9fr) minmax(6.5rem, 0.9fr) minmax(4.5rem, 0.65fr) minmax(6rem, 0.85fr) 2.5rem",
  columnTemplateDesktop: "minmax(11rem, 1.6fr) minmax(6.5rem, 0.9fr) minmax(6.75rem, 0.9fr) minmax(4.75rem, 0.65fr) minmax(6.25rem, 0.85fr) 2.5rem",
  columns: [
    {
      key: "orderNo",
      label: "工单编号",
      slot: "order-no-cell",
    },
    {
      key: "executor",
      label: "执行人",
      headerClass: "text-center",
      cellClass: "flex min-w-0 items-center justify-center overflow-hidden text-center",
    },
    {
      key: "statusLabel",
      label: "状态",
      slot: "status-cell",
      headerClass: "text-center",
      cellClass: "flex min-w-0 items-center justify-center overflow-hidden text-center",
    },
    {
      key: "scoreLabel",
      label: "评分",
      headerClass: "text-center",
      cellClass: "flex min-w-0 items-center justify-center overflow-hidden text-center text-muted-foreground",
    },
    {
      key: "deadline",
      label: "截止时间",
      headerClass: "text-center",
      cellClass: "flex min-w-0 items-center justify-center overflow-hidden text-center text-muted-foreground",
    },
    {
      key: "recordAction",
      label: "",
      slot: "record-action-cell",
      cellClass: "flex justify-end",
    },
  ],
  groups: [
    {
      key: "inspection-plan-work-orders",
      title: workOrdersGroupTitle.value,
      rows: workOrders.value,
    },
  ],
  rowAction: row => openWorkOrderPreview(row),
}))

watch(detail, (current) => {
  detailBreadcrumbTitle.value = toOptionalText(current?.Name)
})

watch(inspectionPlanUuid, (nextUuid) => {
  void loadInspectionPlanDetail(nextUuid)
  void loadInspectionPlanWorkOrders(nextUuid)
}, { immediate: true })

onUnmounted(() => {
  detailBreadcrumbTitle.value = null
})

function goBack() {
  void router.push({ name: "inspection-plans" })
}

function goToEdit() {
  if (!inspectionPlanUuid.value) {
    return
  }

  void router.push({
    name: "inspection-plan-edit",
    params: { id: inspectionPlanUuid.value },
  })
}

async function confirmDelete() {
  if (!inspectionPlanUuid.value || deleteSubmitting.value) {
    return
  }

  deleteSubmitting.value = true

  try {
    await deleteInspectionPlan({ Uuid: inspectionPlanUuid.value })
    toast.success("检测计划已删除")
    deleteConfirmOpen.value = false
    await router.push({ name: "inspection-plans" })
  } catch (error) {
    handleApiError(error, {
      title: "检测计划删除失败",
      fallback: "检测计划删除失败，请稍后重试。",
    })
  } finally {
    deleteSubmitting.value = false
  }
}

function goToCustomerDetail() {
  if (!customerUuid.value) {
    toast.error("当前检测计划缺少客户 Uuid，无法跳转客户详情")
    return
  }

  linkedDetailSheetKind.value = "customer"
  linkedDetailSheetUuid.value = customerUuid.value
  linkedDetailSheetOpen.value = true
}

function goToServiceDetail() {
  if (!serviceUuid.value) {
    toast.error("当前检测计划缺少服务 Uuid，无法跳转检测服务详情")
    return
  }

  linkedDetailSheetKind.value = "service"
  linkedDetailSheetUuid.value = serviceUuid.value
  linkedDetailSheetOpen.value = true
}

function handleLinkedDetailSheetOpenChange(open: boolean) {
  linkedDetailSheetOpen.value = open

  if (!open) {
    linkedDetailSheetKind.value = null
    linkedDetailSheetUuid.value = ""
  }
}

function handleWorkOrderPreviewSheetOpenChange(open: boolean) {
  workOrderPreviewSheetOpen.value = open

  if (!open) {
    activeWorkOrderPreviewUuid.value = ""
    activeWorkOrderPreviewCustomerUuid.value = ""
  }
}

function openWorkOrderPreview(row: InspectionPlanWorkOrderRow) {
  if (!row.uuid) {
    toast.error("当前工单缺少 Uuid，无法查看详情")
    return
  }

  activeWorkOrderPreviewUuid.value = row.uuid
  activeWorkOrderPreviewCustomerUuid.value = row.customerUuid
  workOrderPreviewSheetOpen.value = true
}

function goToWorkOrderDetail(row: InspectionPlanWorkOrderRow) {
  if (!row.uuid) {
    toast.error("当前工单缺少 Uuid，无法跳转详情")
    return
  }

  void router.push({
    name: "inspection-work-order-detail",
    params: { id: row.uuid },
    query: {
      customerUuid: row.customerUuid,
      returnTo: "inspection-work-orders",
    },
  })
}

async function loadInspectionPlanDetail(uuid: string) {
  const requestId = ++latestRequestId

  if (!uuid) {
    detail.value = null
    errorMessage.value = "检测计划详情参数缺失，无法加载详情。"
    return
  }

  loading.value = true
  errorMessage.value = ""

  try {
    const result = await fetchInspectionPlanDetail({ Uuid: uuid })

    if (requestId !== latestRequestId) {
      return
    }

    detail.value = result
  } catch (error) {
    if (requestId !== latestRequestId) {
      return
    }

    detail.value = null
    errorMessage.value = handleApiError(error, {
      mode: "silent",
      fallback: "检测计划详情加载失败，请稍后重试。",
    })
  } finally {
    if (requestId === latestRequestId) {
      loading.value = false
    }
  }
}

async function loadInspectionPlanWorkOrders(planUuid: string) {
  const requestId = ++latestWorkOrdersRequestId

  if (!planUuid) {
    workOrders.value = []
    workOrdersTotal.value = 0
    workOrdersErrorMessage.value = "检测计划参数缺失，无法加载关联工单。"
    return
  }

  workOrdersLoading.value = true
  workOrdersErrorMessage.value = ""

  try {
    const result = await fetchWorkOrders({
      PlanUuid: planUuid,
      PageNum: 1,
      PageSize: 100,
    })

    if (requestId !== latestWorkOrdersRequestId) {
      return
    }

    workOrders.value = result.list.map((item, index) => mapInspectionPlanWorkOrderRow(item, index))
    workOrdersTotal.value = result.total
  } catch (error) {
    if (requestId !== latestWorkOrdersRequestId) {
      return
    }

    workOrders.value = []
    workOrdersTotal.value = 0
    workOrdersErrorMessage.value = handleApiError(error, {
      mode: "silent",
      fallback: "检测计划关联工单加载失败，请稍后重试。",
    })
  } finally {
    if (requestId === latestWorkOrdersRequestId) {
      workOrdersLoading.value = false
    }
  }
}

function mapInspectionPlanWorkOrderRow(item: WorkOrderListItem, index: number): InspectionPlanWorkOrderRow {
  const fallbackId = toText(item.Id, `${index + 1}`)
  const uuid = toText(item.Uuid, fallbackId)
  const statusValue = toFiniteNumber(item.Status)
  const resultValue = toFiniteNumber(item.Result)
  const score = toFiniteNumber(item.Score)
  const executors = normalizeExecutors(item.Executors, item.Executor)

  return {
    id: uuid || fallbackId,
    uuid: uuid || fallbackId,
    customerUuid: toText(item.CustomerUuid, customerUuid.value),
    orderNo: toText(item.OrderNo, "-"),
    executor: formatExecutorText(executors),
    executors,
    statusValue,
    statusLabel: formatWorkOrderStatus(statusValue),
    resultLabel: formatWorkOrderResult(resultValue),
    score,
    scoreLabel: formatWorkOrderScore(score),
    deadline: formatDateOnly(toText(item.Deadline, "-")),
    createdAt: formatDateOnly(toText(item.CreatedAt, "-")),
  }
}

function normalizeExecutors(value: unknown, fallback?: unknown) {
  if (Array.isArray(value)) {
    const normalized = value
      .map(item => toText(item, ""))
      .filter(Boolean)

    if (normalized.length) {
      return normalized
    }
  }

  const fallbackText = toText(fallback, "")
  return fallbackText ? [fallbackText] : []
}

function formatExecutorText(executors: string[]) {
  return executors.length ? executors.join("、") : "-"
}

function formatExecutorSummary(executors: string[]) {
  if (!executors.length) {
    return "-"
  }

  if (executors.length === 1) {
    return executors[0]
  }

  return `${executors[0]} 等 ${executors.length} 人`
}

function formatWorkOrderStatus(value: number | null) {
  return getWorkOrderStatusLabel(value)
}

function formatWorkOrderResult(value: number | null) {
  if (value === null) {
    return "未反馈"
  }

  if (value === 0) return "未反馈"
  if (value === 1) return "正常"
  if (value === 2) return "异常"
  if (value === 3) return "已驳回"

  return `结果 ${value}`
}

function formatWorkOrderScore(value: number | null) {
  if (value === null) {
    return "-"
  }

  return String(value)
}

function getWorkOrderStatusPreset(label: string) {
  return workOrderStatusMap[label as keyof typeof workOrderStatusMap]
}

function buildWorkOrderOrderNoTooltip(row: InspectionPlanWorkOrderRow) {
  const parts = [`工单编号：${row.orderNo}`]

  if (row.createdAt && row.createdAt !== "-") {
    parts.push(`创建于 ${row.createdAt}`)
  }

  return parts.join(" | ")
}

function buildExecutorTooltip(row: InspectionPlanWorkOrderRow) {
  if (!row.executors.length) {
    return ""
  }

  return row.executors.join("、")
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

function toOptionalText(value: unknown) {
  const nextValue = toText(value, "")
  return nextValue || null
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

function formatDayValue(value: unknown) {
  const normalized = toFiniteNumber(value)
  return normalized === null ? "-" : `${normalized}天`
}

function formatDateOnly(value: string) {
  const normalized = value.trim()
  if (!normalized || normalized === "-" || normalized === "—") {
    return "-"
  }

  const [datePart] = normalized.split(/[ T]/)
  return datePart || normalized
}

function formatNextExecutionValue(value: unknown) {
  const normalized = toText(value, "")

  if (!normalized || normalized === "-" || normalized === "—") {
    return "计划结束前无后续执行"
  }

  return formatDateOnly(normalized)
}

function getNextExecutionValueClass(value: unknown) {
  const normalized = toText(value, "")

  if (!normalized || normalized === "-" || normalized === "—") {
    return "detail-field-row__value--empty"
  }

  return undefined
}

function parseDateText(value: unknown) {
  const text = toText(value, "")

  if (!text) {
    return null
  }

  const normalized = text.includes("T") ? text : text.replace(" ", "T")
  const parsed = new Date(normalized)

  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return parsed
}

function calculateDateDiffDays(target: Date) {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime()

  return Math.floor((startOfTarget - startOfToday) / (1000 * 60 * 60 * 24))
}

function getElapsedDaysHint(value: unknown) {
  const parsed = parseDateText(value)

  if (!parsed) {
    return ""
  }

  const diffDays = calculateDateDiffDays(parsed)

  if (diffDays <= 0) {
    return `已过去 ${Math.abs(diffDays)} 天`
  }

  return `还有 ${diffDays} 天`
}

function getRemainingDaysHint(value: unknown) {
  const parsed = parseDateText(value)

  if (!parsed) {
    return ""
  }

  const diffDays = calculateDateDiffDays(parsed)

  if (diffDays < 0) {
    return `已过去 ${Math.abs(diffDays)} 天`
  }

  return `还有 ${diffDays} 天`
}

</script>

<template>
  <DetailLayout
    :title="toText(detail?.Name, '检测计划详情') || '检测计划详情'"
    :subtitle="toText(detail?.CorpName, '') || ''"
    :empty="!loading && !detail"
    empty-text="未找到该检测计划信息"
    @back="goBack"
  >
    <template #headerActions>
      <div class="flex items-center gap-1">
        <AlertDialog :open="deleteConfirmOpen" @update:open="deleteConfirmOpen = $event">
          <Button
            variant="outline"
            size="sm"
            class="h-8 gap-1 px-3 text-[14px] font-medium text-destructive hover:bg-destructive/10 hover:text-destructive"
            @click="deleteConfirmOpen = true"
          >
            <i class="ri-delete-bin-line text-base" />
            <span class="sm:hidden">{{ toMobileActionLabel("删除检测计划") }}</span>
            <span class="hidden sm:inline">删除检测计划</span>
          </Button>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除当前检测计划？</AlertDialogTitle>
              <AlertDialogDescription>
                删除后将无法恢复，该操作会移除当前检测计划及关联调度信息。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel :disabled="deleteSubmitting" class="">
                取消
              </AlertDialogCancel>
              <AlertDialogAction
                :disabled="deleteSubmitting"
                class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                @click="confirmDelete"
              >
                {{ deleteSubmitting ? "删除中..." : "确认删除" }}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button
          variant="outline"
          size="sm"
          class="h-8 gap-1 px-3 text-[14px] font-medium"
          @click="goToEdit"
        >
          <i class="ri-edit-line text-base" />
          <span class="sm:hidden">{{ toMobileActionLabel("编辑检测计划") }}</span>
          <span class="hidden sm:inline">编辑检测计划</span>
        </Button>
      </div>
    </template>

    <template #primary>
      <Alert v-if="errorMessage" variant="destructive" class="mb-5">
        <AlertTitle>检测计划详情加载失败</AlertTitle>
        <AlertDescription>{{ errorMessage }}</AlertDescription>
      </Alert>

      <DetailFieldsSkeleton v-if="loading" :sections="2" :rows-per-section="5" />

      <DetailFieldSections v-else-if="detail" :sections="fieldSections" use-title-block />
    </template>

    <template #secondary>
      <div v-if="workOrdersLoading" class="pb-5">
        <DetailRelationSkeleton :rows-per-group="4" />
      </div>

      <div v-else class="pb-5">
        <Alert v-if="workOrdersErrorMessage" variant="destructive" class="mb-5">
          <AlertTitle>计划工单加载失败</AlertTitle>
          <AlertDescription>{{ workOrdersErrorMessage }}</AlertDescription>
        </Alert>

        <DetailRelationModule :schema="workOrdersModule" use-title-block>
          <template #order-no-cell="{ row }">
            <TooltipWrap :content="buildWorkOrderOrderNoTooltip(row)" align="start" class="max-w-sm">
              <button
                type="button"
                class="block min-w-0 max-w-full truncate text-left font-medium text-foreground transition-colors hover:text-primary"
                @click="openWorkOrderPreview(row)"
              >
                {{ row.orderNo }}
              </button>
            </TooltipWrap>
          </template>

          <template #executor="{ row }">
            <div class="flex w-full min-w-0 items-center justify-center">
              <TooltipWrap :content="buildExecutorTooltip(row)" align="center" class="max-w-sm">
                <span class="block min-w-0 max-w-full truncate">
                  {{ formatExecutorSummary(row.executors) }}
                </span>
              </TooltipWrap>
            </div>
          </template>

          <template #status-cell="{ row }">
            <div class="flex w-full min-w-0 items-center justify-center">
              <TooltipWrap :content="row.resultLabel" align="start" class="max-w-xs">
                <StatusBadge
                  :label="row.statusLabel"
                  :tone="getWorkOrderStatusPreset(row.statusLabel)?.tone ?? 'gray'"
                  :icon="getWorkOrderStatusPreset(row.statusLabel)?.icon ?? 'dot'"
                  class="max-w-full"
                />
              </TooltipWrap>
            </div>
          </template>

          <template #record-action-cell="{ row }">
            <Button
              variant="ghost"
              size="icon-sm"
              class="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground"
              :disabled="!row.uuid"
              @click="goToWorkOrderDetail(row)"
            >
              <i class="ri-more-2-line text-[18px]" />
              <span class="sr-only">查看工单详情</span>
            </Button>
          </template>
        </DetailRelationModule>
      </div>
    </template>
  </DetailLayout>

  <LinkedEntityDetailSheet
    :open="linkedDetailSheetOpen"
    :kind="linkedDetailSheetKind"
    :uuid="linkedDetailSheetUuid"
    :customer-uuid="customerUuid"
    @update:open="handleLinkedDetailSheetOpenChange"
  />

  <WorkOrderPreviewSheet
    :open="workOrderPreviewSheetOpen"
    kind="inspection"
    :uuid="activeWorkOrderPreviewUuid"
    :customer-uuid="activeWorkOrderPreviewCustomerUuid"
    @update:open="handleWorkOrderPreviewSheetOpenChange"
  />
</template>
