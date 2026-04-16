<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { toast } from "vue-sonner"

import authLoginVisual from "@/assets/auth-login-visual.svg"
import authOtpVisual from "@/assets/auth-otp-visual.svg"
import authSignupVisual from "@/assets/auth-signup-visual.svg"
import InspectionBuildingCards from "@/components/detail/InspectionBuildingCards.vue"
import InspectionItemHistorySheet from "@/components/detail/InspectionItemHistorySheet.vue"
import LinkedEntityDetailSheet from "@/components/detail/LinkedEntityDetailSheet.vue"
import DetailFieldsSkeleton from "@/components/loading/DetailFieldsSkeleton.vue"
import DetailRelationSkeleton from "@/components/loading/DetailRelationSkeleton.vue"
import DetailFieldSections from "@/components/detail/DetailFieldSections.vue"
import { buildRepairWorkOrderPrimarySections, buildRepairWorkOrderSecondarySections, toText as toRepairWorkOrderText } from "@/components/detail/repairWorkOrderDetailFields"
import { buildWorkOrderPrimarySections, buildWorkOrderSecondarySections, toText } from "@/components/detail/workOrderDetailFields"
import type { DetailFieldSection, InspectionItemHistoryModel } from "@/components/detail/types"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { detailBreadcrumbTitle } from "@/composables/useDetailBreadcrumbTitle"
import DetailLayout from "@/layouts/DetailLayout.vue"
import { handleApiError } from "@/lib/api-errors"
import { fetchCustomerDetail, type CustomerDetailResult } from "@/lib/customers-api"
import { getInspectionItemDetail, type InspectionItemRecord } from "@/lib/inspection-items-api"
import { fetchInspectionPlanDetail, type InspectionPlanListItem } from "@/lib/inspection-plans-api"
import { fetchMembers } from "@/lib/members-api"
import { fetchInspectionServiceDetail, type InspectionServiceListItem } from "@/lib/inspection-services-api"
import {
  dispatchWorkOrder,
  fetchRepairWorkOrderDetail,
  fetchWorkOrderDetail,
  type WorkOrderBuildInspectionItem,
  type RepairWorkOrderDetailResult,
  type WorkOrderBuildInfo,
  type WorkOrderDetailResult,
} from "@/lib/work-orders-api"

type WorkOrderDetailKind = "inspection" | "repair"
type LinkedDetailSheetKind = "customer" | "service" | "plan" | "park"
type InspectionBuildingCardV2Status = "pending" | "processing" | "completed"
type InspectionBuildingCardV2Row = {
  key: string
  name: string
  categoryName: string
  scoreText: string
  scoreValue: number | null
  onSelect: () => void
}
type InspectionBuildingCardV2Building = {
  key: string
  buildName: string
  status: InspectionBuildingCardV2Status
  completedCount: number
  totalCount: number
  progressValue: number
  deadlineText: string
  scoreText: string
  items: InspectionBuildingCardV2Row[]
}

const props = withDefaults(defineProps<{
  kind?: WorkOrderDetailKind
}>(), {
  kind: "inspection",
})

const route = useRoute()
const router = useRouter()

const inspectionWorkOrder = ref<WorkOrderDetailResult | null>(null)
const repairWorkOrder = ref<RepairWorkOrderDetailResult | null>(null)
const inspectionPlanDetail = ref<InspectionPlanListItem | null>(null)
const inspectionServiceDetail = ref<InspectionServiceListItem | null>(null)
const customer = ref<CustomerDetailResult | null>(null)
const loading = ref(false)
const errorMessage = ref("")
const inspectionItemDetailByUuid = ref<Record<string, InspectionItemRecord>>({})
let latestRequestId = 0

type AssignableUserOption = {
  uuid: string
  name: string
}

const assignDialogOpen = ref(false)
const assignUserUuid = ref("")
const assignUserUuids = ref<string[]>([])
const assignableUsers = ref<AssignableUserOption[]>([])
const assignableUsersLoading = ref(false)
const assignableUsersLoaded = ref(false)
const assignSubmitting = ref(false)
const linkedDetailSheetOpen = ref(false)
const linkedDetailSheetKind = ref<LinkedDetailSheetKind | null>(null)
const linkedDetailSheetUuid = ref("")
const inspectionHistorySheetOpen = ref(false)
const selectedInspectionHistoryModel = ref<InspectionItemHistoryModel | null>(null)

const workOrderUuid = computed(() => typeof route.params.id === "string" ? route.params.id.trim() : "")
const customerUuid = computed(() => {
  const queryValue = typeof route.query.customerUuid === "string" ? route.query.customerUuid.trim() : ""
  return queryValue || (
    props.kind === "repair"
      ? toRepairWorkOrderText(repairWorkOrder.value?.CustomerUuid)
      : toText(inspectionWorkOrder.value?.CustomerUuid)
  )
})
const queryReturnTo = computed(() => typeof route.query.returnTo === "string" ? route.query.returnTo.trim() : "")
const isInspectionAssignDialog = computed(() => props.kind === "inspection")
const canSubmitAssign = computed(() => {
  if (assignSubmitting.value) {
    return false
  }

  if (!isInspectionAssignDialog.value) {
    return Boolean(assignUserUuid.value)
  }

  return assignUserUuids.value.length > 0
})

const resolvedInspectionWorkOrder = computed<WorkOrderDetailResult | null>(() => {
  if (!inspectionWorkOrder.value) {
    return null
  }

  const resolvedServiceUuid = toText(
    inspectionWorkOrder.value.ServiceUuid,
    toText(inspectionPlanDetail.value?.ServiceUuid, toText(inspectionServiceDetail.value?.Uuid, "")),
  )
  const resolvedPark = resolveWorkOrderPark()

  return {
    ...inspectionWorkOrder.value,
    ServiceUuid: resolvedServiceUuid,
    PlanName: toText(inspectionWorkOrder.value.PlanName, toText(inspectionPlanDetail.value?.Name, "")),
    ServiceName: toText(
      inspectionWorkOrder.value.ServiceName,
      toText(inspectionPlanDetail.value?.ServiceName, toText(inspectionServiceDetail.value?.Name, "")),
    ),
    ParkUuid: toText(inspectionWorkOrder.value.ParkUuid, resolvedPark.parkUuid),
    ParkName: toText(inspectionWorkOrder.value.ParkName, resolvedPark.parkName),
  }
})

const primarySections = computed<DetailFieldSection[]>(() => {
  if (props.kind === "repair") {
    return buildRepairWorkOrderPrimarySections(repairWorkOrder.value, customer.value, {
      onOpenCustomer: openRepairCustomerDetail,
      onOpenPark: openRepairParkDetail,
    })
  }

  return buildWorkOrderPrimarySections(resolvedInspectionWorkOrder.value, customer.value, {
    onOpenCustomer: openInspectionCustomerDetail,
    onOpenService: openInspectionServiceDetail,
    onOpenPlan: openInspectionPlanDetail,
    onOpenPark: openInspectionParkDetail,
  })
})

const secondarySections = computed<DetailFieldSection[]>(() => {
  if (props.kind === "repair") {
    return buildRepairWorkOrderSecondarySections(repairWorkOrder.value)
  }

  return buildWorkOrderSecondarySections(resolvedInspectionWorkOrder.value)
})

const inspectionBuildingCards = computed(() => (
  buildInspectionWorkOrderCards(
    resolvedInspectionWorkOrder.value?.Builds,
    resolvedInspectionWorkOrder.value?.Deadline,
  )
))

function openRepairCustomerDetail() {
  const targetCustomerUuid = toRepairWorkOrderText(repairWorkOrder.value?.CustomerUuid) || customerUuid.value

  if (!targetCustomerUuid) {
    return
  }

  openLinkedDetailSheet("customer", targetCustomerUuid)
}

function openRepairParkDetail() {
  const targetParkUuid = toRepairWorkOrderText(repairWorkOrder.value?.ParkUuid)

  if (!targetParkUuid) {
    return
  }

  openLinkedDetailSheet("park", targetParkUuid)
}

function openInspectionCustomerDetail() {
  const targetCustomerUuid = toText(resolvedInspectionWorkOrder.value?.CustomerUuid, "")

  if (!targetCustomerUuid) {
    return
  }

  openLinkedDetailSheet("customer", targetCustomerUuid)
}

function openInspectionServiceDetail() {
  const targetServiceUuid = toText(resolvedInspectionWorkOrder.value?.ServiceUuid, "")

  if (!targetServiceUuid) {
    return
  }

  openLinkedDetailSheet("service", targetServiceUuid)
}

function openInspectionPlanDetail() {
  const targetPlanUuid = toText(resolvedInspectionWorkOrder.value?.PlanUuid, "")

  if (!targetPlanUuid) {
    return
  }

  openLinkedDetailSheet("plan", targetPlanUuid)
}

function openInspectionParkDetail() {
  const targetParkUuid = toText(resolvedInspectionWorkOrder.value?.ParkUuid, "")

  if (!targetParkUuid) {
    return
  }

  openLinkedDetailSheet("park", targetParkUuid)
}

function handleLinkedDetailSheetOpenChange(open: boolean) {
  linkedDetailSheetOpen.value = open

  if (!open) {
    linkedDetailSheetKind.value = null
    linkedDetailSheetUuid.value = ""
  }
}

function openLinkedDetailSheet(kind: LinkedDetailSheetKind, uuid: string) {
  if (!uuid) {
    return
  }

  linkedDetailSheetKind.value = kind
  linkedDetailSheetUuid.value = uuid
  linkedDetailSheetOpen.value = true
}

const pageTitle = computed(() => {
  if (props.kind === "repair") {
    return toRepairWorkOrderText(repairWorkOrder.value?.Title, "报修工单详情")
  }

  return toText(resolvedInspectionWorkOrder.value?.ServiceName, "关联检测服务") || "关联检测服务"
})

const pageSubtitle = computed(() => {
  if (props.kind === "repair") {
    return toRepairWorkOrderText(
      repairWorkOrder.value?.CustomerName
      ?? repairWorkOrder.value?.CorpName
      ?? customer.value?.CorpName,
      "CustomerName",
    ) || "CustomerName"
  }

  return toText(
    inspectionWorkOrder.value?.CustomerName
    ?? inspectionWorkOrder.value?.CorpName
    ?? customer.value?.CorpName,
    "CustomerName",
  ) || "CustomerName"
})

const hasWorkOrder = computed(() => (
  props.kind === "repair" ? Boolean(repairWorkOrder.value) : Boolean(inspectionWorkOrder.value)
))

const showAssignAction = computed(() => !loading.value && hasWorkOrder.value && Boolean(workOrderUuid.value))

watch([inspectionWorkOrder, repairWorkOrder], () => {
  if (props.kind === "repair") {
    const current = repairWorkOrder.value
    detailBreadcrumbTitle.value = toOptionalText(current?.Title) || toOptionalText(current?.OrderNo)
    return
  }

  const current = resolvedInspectionWorkOrder.value
  detailBreadcrumbTitle.value = toOptionalText(current?.ServiceName) || toOptionalText(current?.OrderNo)
})

watch(workOrderUuid, (uuid) => {
  assignableUsersLoaded.value = false
  assignableUsers.value = []
  resetInspectionHistorySheet()
  void loadWorkOrderDetail(uuid)
}, { immediate: true })

onUnmounted(() => {
  detailBreadcrumbTitle.value = null
  resetInspectionHistorySheet()
})

function goBack() {
  if (queryReturnTo.value === "inspection-work-orders") {
    void router.push({ name: "inspection-work-orders" })
    return
  }

  if (queryReturnTo.value === "repair-work-orders") {
    void router.push({ name: "repair-work-orders" })
    return
  }

  if (customerUuid.value) {
    void router.push({
      name: "customer-detail",
      params: { id: customerUuid.value },
      query: { tab: "work-orders" },
    })
    return
  }

  void router.push({ name: props.kind === "repair" ? "repair-work-orders" : "inspection-work-orders" })
}

async function loadWorkOrderDetail(uuid: string) {
  const requestId = ++latestRequestId

  if (!uuid) {
    inspectionWorkOrder.value = null
    repairWorkOrder.value = null
    inspectionPlanDetail.value = null
    inspectionServiceDetail.value = null
    customer.value = null
    inspectionItemDetailByUuid.value = {}
    resetInspectionHistorySheet()
    errorMessage.value = "工单 Uuid 缺失，无法加载详情。"
    return
  }

  loading.value = true
  errorMessage.value = ""
  inspectionPlanDetail.value = null
  inspectionServiceDetail.value = null
  inspectionItemDetailByUuid.value = {}
  resetInspectionHistorySheet()

  try {
    const result = props.kind === "repair"
      ? await fetchRepairWorkOrderDetail({ Uuid: uuid })
      : await fetchWorkOrderDetail({ Uuid: uuid })

    if (requestId !== latestRequestId) {
      return
    }

    if (props.kind === "repair") {
      repairWorkOrder.value = result as RepairWorkOrderDetailResult
      inspectionWorkOrder.value = null
      inspectionPlanDetail.value = null
      inspectionServiceDetail.value = null
      inspectionItemDetailByUuid.value = {}
      resetInspectionHistorySheet()
    } else {
      inspectionWorkOrder.value = result as WorkOrderDetailResult
      repairWorkOrder.value = null
      void loadWorkOrderInspectionItemDetails((result as WorkOrderDetailResult).Builds, requestId)
      void loadInspectionPlanFallback(result as WorkOrderDetailResult, requestId)
    }

    const nextCustomerUuid = props.kind === "repair"
      ? toRepairWorkOrderText((result as RepairWorkOrderDetailResult).CustomerUuid)
      : toText((result as WorkOrderDetailResult).CustomerUuid)

    if (nextCustomerUuid) {
      try {
        const customerResult = await fetchCustomerDetail({ Uuid: nextCustomerUuid })

        if (requestId !== latestRequestId) {
          return
        }

        customer.value = customerResult
      } catch {
        if (requestId !== latestRequestId) {
          return
        }

        customer.value = null
      }
    } else {
      customer.value = null
    }
  } catch (error) {
    if (requestId !== latestRequestId) {
      return
    }

    inspectionWorkOrder.value = null
    repairWorkOrder.value = null
    inspectionPlanDetail.value = null
    inspectionServiceDetail.value = null
    customer.value = null
    inspectionItemDetailByUuid.value = {}
    resetInspectionHistorySheet()
    errorMessage.value = handleApiError(error, {
      mode: "silent",
      fallback: "工单详情加载失败，请稍后重试。",
    })
  } finally {
    if (requestId === latestRequestId) {
      loading.value = false
    }
  }
}

async function loadInspectionPlanFallback(workOrder: WorkOrderDetailResult, requestId: number) {
  const planUuid = toText(workOrder.PlanUuid, "")
  const hasPlanName = Boolean(toText(workOrder.PlanName, ""))
  const hasServiceName = Boolean(toText(workOrder.ServiceName, ""))

  if (!planUuid) {
    return
  }

  try {
    const planDetail = await fetchInspectionPlanDetail({ Uuid: planUuid })

    if (requestId !== latestRequestId) {
      return
    }

    inspectionPlanDetail.value = planDetail
    await loadInspectionServiceFallback(workOrder, planDetail, requestId)
  } catch {
    if (requestId !== latestRequestId) {
      return
    }

    inspectionPlanDetail.value = null
    inspectionServiceDetail.value = null
  }
}

async function loadInspectionServiceFallback(
  workOrder: WorkOrderDetailResult,
  planDetail: InspectionPlanListItem,
  requestId: number,
) {
  const serviceUuid = toText(planDetail.ServiceUuid, "")
  const hasServiceName = Boolean(toText(workOrder.ServiceName, "")) || Boolean(toText(planDetail.ServiceName, ""))
  const hasParkName = Boolean(toText(workOrder.ParkName, ""))

  if (!serviceUuid || (hasServiceName && hasParkName)) {
    return
  }

  try {
    const serviceDetail = await fetchInspectionServiceDetail({ Uuid: serviceUuid })

    if (requestId !== latestRequestId) {
      return
    }

    inspectionServiceDetail.value = serviceDetail
  } catch {
    if (requestId !== latestRequestId) {
      return
    }

    inspectionServiceDetail.value = null
  }
}

function resolveWorkOrderPark() {
  const currentWorkOrder = inspectionWorkOrder.value

  if (!currentWorkOrder) {
    return {
      parkUuid: "",
      parkName: "",
    }
  }

  const workOrderBuildUuids = new Set(
    (Array.isArray(currentWorkOrder.Builds) ? currentWorkOrder.Builds : [])
      .map(build => toText(build.BuildUuid, ""))
      .filter(Boolean),
  )

  const serviceBuilds = Array.isArray(inspectionServiceDetail.value?.BuildInfos)
    ? inspectionServiceDetail.value?.BuildInfos
    : (Array.isArray(inspectionServiceDetail.value?.Builds) ? inspectionServiceDetail.value?.Builds : [])

  const matchedBuild = serviceBuilds.find(build => (
    !workOrderBuildUuids.size || workOrderBuildUuids.has(toText(build.BuildUuid, ""))
  ))

  return {
    parkUuid: toText(matchedBuild?.ParkUuid, ""),
    parkName: toText(matchedBuild?.ParkName, ""),
  }
}

function toOptionalText(value: unknown) {
  const text = props.kind === "repair" ? toRepairWorkOrderText(value) : toText(value)
  return text || null
}

function toMemberText(value: unknown, fallback = "") {
  if (typeof value === "string" && value.trim()) {
    return value.trim()
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }

  return fallback
}

function buildInspectionWorkOrderCards(
  builds: WorkOrderBuildInfo[] | undefined,
  deadline: unknown,
): InspectionBuildingCardV2Building[] {
  if (!Array.isArray(builds) || !builds.length) {
    return []
  }

  const deadlineText = formatInspectionCardDeadline(deadline)

  return builds.map((build, buildIndex) => {
    const inspectionItems: WorkOrderBuildInspectionItem[] = Array.isArray(build.InspectionItems) ? build.InspectionItems : []
    const completedCount = inspectionItems.filter(item => isInspectionItemCompleted(item)).length
    const totalCount = inspectionItems.length

    return {
      key: toText(build.BuildUuid, `work-order-build-${buildIndex + 1}`),
      buildName: toText(build.BuildName, `建筑 ${buildIndex + 1}`),
      status: resolveInspectionBuildStatus(completedCount, totalCount),
      completedCount,
      totalCount,
      progressValue: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
      deadlineText,
      scoreText: formatInspectionCardBuildingScore(build.Score),
      items: inspectionItems.map((item, itemIndex) => {
        const inspectionItemUuid = toText(item.InspectionItemUuid, "")
        const detail = inspectionItemUuid ? inspectionItemDetailByUuid.value[inspectionItemUuid] : undefined
        const categoryName = toText(detail?.CategoryName, toText(item.CategoryName, "未分类"))
        const inspectionItemName = toText(item.InspectionItemName, `检测项 ${itemIndex + 1}`)
        const scoreValue = toNumber(item.Score)

        return {
          key: inspectionItemUuid || `inspection-item-${itemIndex + 1}`,
          name: inspectionItemName,
          categoryName,
          scoreValue,
          scoreText: formatInspectionCardDeduction(scoreValue),
          onSelect: () => openInspectionHistorySheet(buildInspectionItemHistoryModel({
            buildName: toText(build.BuildName, `建筑 ${buildIndex + 1}`),
            categoryName,
            inspectionItemName,
            inspectionItemKey: inspectionItemUuid || `inspection-item-${itemIndex + 1}`,
            detail,
            item,
          })),
        }
      }),
    }
  })
}

async function loadWorkOrderInspectionItemDetails(builds: WorkOrderBuildInfo[] | undefined, requestId: number) {
  const inspectionItemUuids = Array.from(new Set(
    (Array.isArray(builds) ? builds : [])
      .flatMap(build => Array.isArray(build.InspectionItems) ? build.InspectionItems : [])
      .map(item => toText(item.InspectionItemUuid, ""))
      .filter(Boolean),
  ))

  inspectionItemDetailByUuid.value = {}

  if (!inspectionItemUuids.length) {
    return
  }

  try {
    const results = await Promise.allSettled(
      inspectionItemUuids.map(async (inspectionItemUuid) => ({
        inspectionItemUuid,
        detail: await getInspectionItemDetail({ Uuid: inspectionItemUuid }),
      })),
    )

    if (requestId !== latestRequestId) {
      return
    }

    const nextMap: Record<string, InspectionItemRecord> = {}

    results.forEach((result) => {
      if (result.status !== "fulfilled") {
        return
      }

      nextMap[result.value.inspectionItemUuid] = result.value.detail
    })

    inspectionItemDetailByUuid.value = nextMap
  } finally {
    // 保留 finally，后续若需要增加状态提示时不改控制流。
  }
}

function handleInspectionHistorySheetOpenChange(open: boolean) {
  inspectionHistorySheetOpen.value = open

  if (!open) {
    selectedInspectionHistoryModel.value = null
  }
}

function openInspectionHistorySheet(model: InspectionItemHistoryModel) {
  selectedInspectionHistoryModel.value = model
  inspectionHistorySheetOpen.value = true
}

function resetInspectionHistorySheet() {
  inspectionHistorySheetOpen.value = false
  selectedInspectionHistoryModel.value = null
}

function buildInspectionItemHistoryModel(args: {
  buildName: string
  categoryName: string
  inspectionItemName: string
  inspectionItemKey: string
  detail?: InspectionItemRecord
  item: WorkOrderBuildInspectionItem
}): InspectionItemHistoryModel {
  const detail = args.detail
  const inspectionItemName = args.inspectionItemName
  const inspectorName = toText(args.item.UserName, "待回传")
  const scoreText = formatInspectionItemScore(args.item.Score)

  return {
    key: args.inspectionItemKey,
    buildingName: args.buildName,
    categoryName: args.categoryName,
    inspectionItemName,
    inspectorName,
    scoreText,
    content: toText(detail?.Content, "-"),
    standard: toText(detail?.Standard, "-"),
    isForcePhotoText: formatBooleanFlag(detail?.IsForcePhoto),
    isMeasureRecordText: formatBooleanFlag(detail?.IsMeasureRecord),
    historyEntries: buildInspectionItemHistoryEntries({
      inspectionItemKey: args.inspectionItemKey,
      inspectionItemName,
      inspectorName,
      scoreText,
      detail,
    }),
  }
}

function buildInspectionItemHistoryEntries(args: {
  inspectionItemKey: string
  inspectionItemName: string
  inspectorName: string
  scoreText: string
  detail?: InspectionItemRecord
}) {
  const latestTimestamp = resolveHistoryTimestamp(
    resolvedInspectionWorkOrder.value?.UpdatedAt,
    resolvedInspectionWorkOrder.value?.CreatedAt,
    resolvedInspectionWorkOrder.value?.Deadline,
  )
  const latestResultLabel = formatInspectionResultLabel(resolvedInspectionWorkOrder.value?.Result)
  const latestRemark = toText(resolvedInspectionWorkOrder.value?.Remark, "")
  const hasMeasureValue = toNumber(args.detail?.IsMeasureRecord) === 1
  const hasForcePhoto = toNumber(args.detail?.IsForcePhoto) === 1
  const latestSummary = buildLatestHistorySummary(latestResultLabel, args.inspectorName, args.scoreText)

  return [
    {
      key: `${args.inspectionItemKey}-latest`,
      timestamp: latestTimestamp,
      inspectorName: args.inspectorName,
      resultLabel: latestResultLabel,
      scoreText: args.scoreText,
      summary: latestSummary,
      remark: latestRemark || "当前结果来自工单详情页现有摘要字段。",
      measureValue: hasMeasureValue ? "88" : undefined,
      photoUrls: hasForcePhoto ? buildInspectionHistoryPhotoUrls(3) : undefined,
      isLatest: true,
    },
    {
      key: `${args.inspectionItemKey}-history-1`,
      timestamp: shiftHistoryTimestamp(latestTimestamp, 9, 2, "2026-03-28 14:10"),
      inspectorName: "张海峰",
      resultLabel: latestResultLabel === "异常" ? "待复核" : "正常",
      scoreText: latestResultLabel === "异常" ? "2 分" : "0 分",
      summary: `按既定频次完成「${args.inspectionItemName}」检测，现场记录已归档。`,
      remark: args.detail?.Standard
        ? `复核依据：${truncateText(toText(args.detail.Standard, "判定标准已更新"), 40)}`
        : "现场执行与既有标准一致。",
      measureValue: hasMeasureValue ? "91" : undefined,
      photoUrls: hasForcePhoto ? buildInspectionHistoryPhotoUrls(2) : undefined,
    },
    {
      key: `${args.inspectionItemKey}-history-2`,
      timestamp: shiftHistoryTimestamp(latestTimestamp, 24, 5, "2026-03-03 09:30"),
      inspectorName: "李文博",
      resultLabel: "正常",
      scoreText: "0 分",
      summary: args.detail?.Content
        ? `上次巡检已覆盖检测内容：${truncateText(toText(args.detail.Content, ""), 36)}`
        : `上次巡检完成「${args.inspectionItemName}」标准项检查。`,
      remark: "该记录为前端样式联调 mock，用于预览历史时间轴结构。",
      measureValue: hasMeasureValue ? "89" : undefined,
      photoUrls: hasForcePhoto ? buildInspectionHistoryPhotoUrls(2, 1) : undefined,
    },
  ]
}

function buildLatestHistorySummary(resultLabel: string, inspectorName: string, scoreText: string) {
  if (resultLabel === "异常") {
    return `本次由 ${inspectorName} 回传异常结果，当前扣分 ${scoreText}，建议结合历史记录复核。`
  }

  if (resultLabel === "未反馈") {
    return "当前尚未收到完整结果回传，本条用于预览最新记录卡片样式。"
  }

  return `本次由 ${inspectorName} 完成检测，当前扣分 ${scoreText}。`
}

function formatInspectionItemScore(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `${value} 分`
  }

  if (typeof value === "string" && value.trim()) {
    return value.includes("分") ? value.trim() : `${value.trim()} 分`
  }

  return "-"
}

function formatInspectionCardDeadline(value: unknown) {
  return toText(value, "-") || "-"
}

function formatInspectionCardBuildingScore(value: unknown) {
  const score = toNumber(value)

  if (score === null) {
    return "-"
  }

  if (Number.isInteger(score)) {
    return String(score)
  }

  return score.toFixed(1).replace(/\.0$/, "")
}

function formatInspectionCardDeduction(value: number | null) {
  if (value === null) {
    return "-"
  }

  if (Number.isInteger(value)) {
    return `${value} 分`
  }

  return `${value.toFixed(1).replace(/\.0$/, "")} 分`
}

function isInspectionItemCompleted(item: WorkOrderBuildInspectionItem) {
  return toNumber(item.Score) !== null && Boolean(toText(item.UserName, ""))
}

function resolveInspectionBuildStatus(
  completedCount: number,
  totalCount: number,
): InspectionBuildingCardV2Status {
  if (totalCount > 0 && completedCount >= totalCount) {
    return "completed"
  }

  if (completedCount > 0) {
    return "processing"
  }

  return "pending"
}

function formatBooleanFlag(value: unknown) {
  const normalized = toNumber(value)

  if (normalized === 1) {
    return "是"
  }

  if (normalized === 0) {
    return "否"
  }

  return "-"
}

function formatInspectionResultLabel(value: unknown) {
  const result = toNumber(value)

  if (result === null || result === 0) return "未反馈"
  if (result === 1) return "正常"
  if (result === 2) return "异常"
  if (result === 3) return "已驳回"

  return `结果 ${result}`
}

function resolveHistoryTimestamp(...values: unknown[]) {
  const firstText = values
    .map(value => toText(value, ""))
    .find(Boolean)

  return normalizeHistoryTimestamp(firstText || "2026-04-10 16:20")
}

function shiftHistoryTimestamp(baseText: string, daysBack: number, hoursBack: number, fallback: string) {
  const parsed = parseHistoryDate(baseText)

  if (!parsed) {
    return fallback
  }

  const next = new Date(parsed)
  next.setDate(next.getDate() - daysBack)
  next.setHours(next.getHours() - hoursBack)
  return formatHistoryDate(next)
}

function normalizeHistoryTimestamp(value: string) {
  const parsed = parseHistoryDate(value)
  return parsed ? formatHistoryDate(parsed) : value
}

function parseHistoryDate(value: string) {
  const normalized = value.trim()
    .replace("T", " ")
    .replace(/(\.\d+)?Z$/, "")

  if (!normalized) {
    return null
  }

  const parsed = new Date(normalized.replace(/-/g, "/"))
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function formatHistoryDate(value: Date) {
  return [
    value.getFullYear(),
    padDatePart(value.getMonth() + 1),
    padDatePart(value.getDate()),
  ].join("-") + ` ${padDatePart(value.getHours())}:${padDatePart(value.getMinutes())}`
}

function padDatePart(value: number) {
  return String(value).padStart(2, "0")
}

function buildInspectionHistoryPhotoUrls(count: number, offset = 0) {
  const gallery = [authLoginVisual, authSignupVisual, authOtpVisual]

  return Array.from({ length: count }, (_, index) => (
    gallery[(index + offset) % gallery.length]
  ))
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value
  }

  return `${value.slice(0, Math.max(0, maxLength - 1))}…`
}

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

async function openAssignDialog() {
  try {
    await loadAssignableUsers()
    resetAssignState()

    assignDialogOpen.value = true
  } catch (error) {
    toast.error(handleApiError(error, {
      mode: "silent",
      fallback: "工单详情加载失败，暂时无法指派。",
    }))
  }
}

function closeAssignDialog() {
  if (assignSubmitting.value) {
    return
  }

  assignDialogOpen.value = false
  resetAssignState()
}

async function loadAssignableUsers() {
  if (assignableUsersLoading.value || assignableUsersLoaded.value) {
    return
  }

  assignableUsersLoading.value = true

  try {
    const result = await fetchMembers({
      PageNum: 1,
      PageSize: 200,
      Status: 1,
    })

    const normalizedOptions = result.list
      .map((item) => {
        const record = item as Record<string, unknown>
        const uuid = toMemberText(record.Uuid ?? record.uuid)
        const name = toMemberText(record.Name ?? record.name, uuid)

        if (!uuid) {
          return null
        }

        return { uuid, name }
      })
      .filter((item): item is AssignableUserOption => item !== null)

    assignableUsers.value = normalizedOptions
    assignableUsersLoaded.value = true
  } catch (error) {
    assignableUsers.value = []
    toast.error(handleApiError(error, {
      mode: "silent",
      fallback: "指派人员列表加载失败，请稍后重试。",
    }))
  } finally {
    assignableUsersLoading.value = false
  }
}

function resetAssignState() {
  assignUserUuid.value = ""
  assignUserUuids.value = []
}

async function submitAssign() {
  const uuid = workOrderUuid.value

  if (!uuid) {
    toast.error("当前工单缺少 Uuid，无法指派")
    return
  }

  assignSubmitting.value = true

  try {
    if (props.kind === "inspection") {
      if (!assignUserUuids.value.length) {
        toast.error("请先选择至少一位指派人员")
        return
      }

      await dispatchWorkOrder({
        Uuid: uuid,
        UserUuids: assignUserUuids.value,
      })
    } else {
      if (!assignUserUuid.value) {
        toast.error("请先选择指派用户")
        return
      }

      await dispatchWorkOrder({
        Uuid: uuid,
        UserUuid: assignUserUuid.value,
      })
    }

    toast.success("指派成功")
    assignDialogOpen.value = false
    resetAssignState()
    await loadWorkOrderDetail(uuid)
  } catch (error) {
    toast.error(handleApiError(error, {
      mode: "silent",
      fallback: "指派失败，请稍后重试。",
    }))
  } finally {
    assignSubmitting.value = false
  }
}
</script>

<template>
  <DetailLayout
    :title="pageTitle"
    :subtitle="pageSubtitle"
    :empty="!loading && !hasWorkOrder"
    empty-text="未找到该工单信息"
    @back="goBack"
  >
    <template #actions>
      <Button
        v-if="showAssignAction"
        type="button"
        variant="outline"
        size="sm"
        class="gap-2"
        @click="openAssignDialog"
      >
        <i class="ri-user-shared-line text-base" />
        指派
      </Button>
    </template>

    <template #primary>
      <Alert v-if="errorMessage" variant="destructive" class="mb-5">
        <AlertTitle>工单详情接口加载失败</AlertTitle>
        <AlertDescription>{{ errorMessage }}</AlertDescription>
      </Alert>

      <DetailFieldsSkeleton v-if="loading" :sections="2" :rows-per-section="4" />

      <DetailFieldSections v-else-if="hasWorkOrder" :sections="primarySections" use-title-block />
    </template>

    <template #secondary>
      <template v-if="props.kind === 'repair'">
        <div v-if="loading" class="pb-5">
          <DetailFieldsSkeleton :sections="1" :rows-per-section="3" />
        </div>

        <div v-else-if="!loading && hasWorkOrder" class="pb-5">
          <DetailFieldSections :sections="secondarySections" use-title-block />
        </div>
      </template>

      <template v-else>
        <div v-if="loading" class="pb-5">
          <DetailRelationSkeleton :two-data-columns="false" :rows-per-group="3" />
        </div>

        <div v-else-if="!loading && hasWorkOrder" class="pb-5">
          <InspectionBuildingCards
            :buildings="inspectionBuildingCards"
            title="建筑与检测项"
            empty-title="暂无建筑检测项"
            empty-description="当前工单还没有返回建筑与检测项数据。"
          />
        </div>
      </template>
    </template>
  </DetailLayout>

  <Dialog v-model:open="assignDialogOpen">
    <DialogContent class="sm:max-w-[420px]">
      <DialogHeader>
        <DialogTitle>指派工单</DialogTitle>
        <DialogDescription>
          {{ isInspectionAssignDialog ? "请选择一位或多位执行人并确认提交。" : "请选择要指派的用户并确认提交。" }}
        </DialogDescription>
      </DialogHeader>

      <div v-if="isInspectionAssignDialog" class="space-y-4">
        <p class="text-sm text-foreground">执行人</p>
        <Select v-model="assignUserUuids" multiple :disabled="assignableUsersLoading || assignSubmitting">
          <SelectTrigger class="w-full">
            <SelectValue :placeholder="assignableUsersLoading ? '正在加载用户...' : '请选择执行人，可多选'" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="user in assignableUsers" :key="user.uuid" :value="user.uuid">
              {{ user.name }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div v-else class="space-y-2">
        <p class="text-sm text-foreground">指派用户</p>
        <Select v-model="assignUserUuid" :disabled="assignableUsersLoading || assignSubmitting">
          <SelectTrigger class="w-full">
            <SelectValue :placeholder="assignableUsersLoading ? '正在加载用户...' : '请选择用户'" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="user in assignableUsers" :key="user.uuid" :value="user.uuid">
              {{ user.name }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" class="gap-2" :disabled="assignSubmitting" @click="closeAssignDialog">
          <i class="ri-close-line text-sm" />
          取消
        </Button>
        <Button type="button" class="gap-2" :disabled="!canSubmitAssign" @click="submitAssign">
          <i
            :class="assignSubmitting ? 'ri-loader-4-line animate-spin text-sm' : 'ri-send-plane-line text-sm'"
          />
          {{ assignSubmitting ? "提交中..." : "确认指派" }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <LinkedEntityDetailSheet
    :open="linkedDetailSheetOpen"
    :kind="linkedDetailSheetKind"
    :uuid="linkedDetailSheetUuid"
    :customer-uuid="toText(resolvedInspectionWorkOrder?.CustomerUuid, '')"
    @update:open="handleLinkedDetailSheetOpenChange"
  />

  <InspectionItemHistorySheet
    :open="inspectionHistorySheetOpen"
    :model="selectedInspectionHistoryModel"
    @update:open="handleInspectionHistorySheetOpenChange"
  />
</template>
