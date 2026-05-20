<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { toast } from "vue-sonner"

import InspectionBuildingCards from "@/components/detail/InspectionBuildingCards.vue"
import InspectionItemHistorySheet from "@/components/detail/InspectionItemHistorySheet.vue"
import InspectionReportDocument from "@/components/report/InspectionReportDocument.vue"
import LinkedEntityDetailSheet from "@/components/detail/LinkedEntityDetailSheet.vue"
import PermissionGate from "@/components/permissions/PermissionGate.vue"
import RepairWorkOrderContentCard from "@/components/detail/RepairWorkOrderContentCard.vue"
import DetailFieldsSkeleton from "@/components/loading/DetailFieldsSkeleton.vue"
import DetailRelationSkeleton from "@/components/loading/DetailRelationSkeleton.vue"
import DetailFieldSections from "@/components/detail/DetailFieldSections.vue"
import { buildRepairWorkOrderPrimarySections, toText as toRepairWorkOrderText } from "@/components/detail/repairWorkOrderDetailFields"
import { buildWorkOrderPrimarySections, toText } from "@/components/detail/workOrderDetailFields"
import type { DetailFieldSection, InspectionItemHistoryModel } from "@/components/detail/types"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { detailBreadcrumbTitle } from "@/composables/useDetailBreadcrumbTitle"
import DetailLayout from "@/layouts/DetailLayout.vue"
import { handleApiError } from "@/lib/api-errors"
import { fetchCustomerDetail, type CustomerDetailResult } from "@/lib/customers-api"
import {
  buildInspectionReportUrl,
  createInspectionReportFromGnReport,
  createReportQrPlaceholderDataUrl,
  updateInspectionReportFileUrl,
  type InspectionReportRecord,
} from "@/lib/inspection-report-mock"
import { getInspectionItemDetail, type InspectionItemRecord } from "@/lib/inspection-items-api"
import { fetchInspectionPlanDetail, type InspectionPlanListItem } from "@/lib/inspection-plans-api"
import { fetchMembers } from "@/lib/members-api"
import { fetchRepairWorkOrderDictionaries, formatRepairDictionaryLabel, type RepairDictionaryOption } from "@/lib/repair-work-order-dictionaries"
import { fetchInspectionServiceDetail, type InspectionServiceListItem } from "@/lib/inspection-services-api"
import { PERMISSION_CODES } from "@/lib/permission-codes"
import { uploadTencentCosFile } from "@/lib/tencent-cos-sdk"
import {
  deleteRepairWorkOrder,
  dispatchRepairWorkOrder,
  dispatchWorkOrder,
  fetchRepairWorkOrderDetail,
  fetchWorkOrderInspectionHistoryDetail,
  fetchWorkOrderDetail,
  generateWorkOrderGnReport,
  uploadWorkOrderReport,
  type WorkOrderInspectionHistoryDetailItem,
  type WorkOrderBuildInspectionItem,
  type RepairWorkOrderDetailResult,
  type WorkOrderBuildInfo,
  type WorkOrderDetailResult,
} from "@/lib/work-orders-api"

type WorkOrderDetailKind = "inspection" | "repair"
type LinkedDetailSheetKind = "customer" | "service" | "plan" | "park"
type ReportGenerationStage = "生成报告" | "生成 PDF" | "上传 PDF" | "保存地址"
type InspectionBuildingCardV2Status = "pending" | "processing" | "completed"
type InspectionBuildingCardV2Row = {
  key: string
  name: string
  categoryName: string
  resultLabel: string
  scoreText: string
  scoreValue: number | null
  onSelect: () => void
}
type InspectionBuildingCardV2Group = {
  key: string
  title: string
  scoreText: string
  scoreValue: number | null
  items: InspectionBuildingCardV2Row[]
}
type InspectionBuildingCardV2Building = {
  key: string
  buildName: string
  status: InspectionBuildingCardV2Status
  completedCount: number
  totalCount: number
  progressValue: number
  progressLabel: string
  deadlineText: string
  scoreText: string
  groups: InspectionBuildingCardV2Group[]
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
const repairImportanceOptions = ref<RepairDictionaryOption[]>([])
const repairTypeOptions = ref<RepairDictionaryOption[]>([])
let latestRequestId = 0
let latestInspectionHistoryRequestId = 0

type AssignableUserOption = {
  uuid: string
  name: string
}

const assignDialogOpen = ref(false)
const assignUserUuids = ref<string[]>([])
const assignableUsers = ref<AssignableUserOption[]>([])
const assignableUsersLoading = ref(false)
const assignableUsersLoaded = ref(false)
const assignSubmitting = ref(false)
const deleteConfirmOpen = ref(false)
const deleteSubmitting = ref(false)
const linkedDetailSheetOpen = ref(false)
const linkedDetailSheetKind = ref<LinkedDetailSheetKind | null>(null)
const linkedDetailSheetUuid = ref("")
const inspectionHistorySheetOpen = ref(false)
const selectedInspectionHistoryModel = ref<InspectionItemHistoryModel | null>(null)
const reportDialogOpen = ref(false)
const reportSubmitting = ref(false)
const reportGenerationStage = ref<ReportGenerationStage | "">("")
const generatedReport = ref<InspectionReportRecord | null>(null)
const generatedReportUrl = ref("")
const generatedReportPdfUrl = ref("")
const reportPdfElement = ref<HTMLElement | null>(null)
const reportBuilding = ref<WorkOrderBuildInfo | null>(null)
const reportForm = ref({
  title: "",
  reportDate: "",
  accessPassword: "",
  version: "1",
  remark: "",
})

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
      dictionaries: {
        importanceOptions: repairImportanceOptions.value,
        typeOptions: repairTypeOptions.value,
      },
    })
  }

  return buildWorkOrderPrimarySections(resolvedInspectionWorkOrder.value, customer.value, {
    onOpenCustomer: openInspectionCustomerDetail,
    onOpenService: openInspectionServiceDetail,
    onOpenPlan: openInspectionPlanDetail,
    onOpenPark: openInspectionParkDetail,
  })
})

const inspectionBuildingCards = computed(() => (
  buildInspectionWorkOrderCards(
    resolvedInspectionWorkOrder.value?.Builds,
    resolvedInspectionWorkOrder.value?.Deadline,
  )
))
const inspectionExpertAdvice = computed(() => toText(resolvedInspectionWorkOrder.value?.Remark, ""))

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
    return toRepairWorkOrderText(repairWorkOrder.value?.ParkName, "园区")
  }

  return toText(resolvedInspectionWorkOrder.value?.ServiceName, "关联检测服务") || "关联检测服务"
})

const pageSubtitle = computed(() => {
  if (props.kind === "repair") {
    return formatRepairCardReportType(repairWorkOrder.value?.ReportType)
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
const showRepairDeleteAction = computed(() => props.kind === "repair" && !loading.value && hasWorkOrder.value && Boolean(workOrderUuid.value))
const showRepairEditAction = computed(() => props.kind === "repair" && !loading.value && hasWorkOrder.value && Boolean(workOrderUuid.value))
const assignPermissionCode = computed(() => props.kind === "repair"
  ? PERMISSION_CODES.repairWorkOrderAssign
  : PERMISSION_CODES.inspectionWorkOrderAssign)
const selectedReportBuildingName = computed(() => toText(reportBuilding.value?.BuildName, "当前建筑"))
const canSubmitReport = computed(() => (
  !reportSubmitting.value
  && /^\d{4}$/.test(reportForm.value.accessPassword)
  && parseReportVersion() !== null
))
const reportSubmitButtonText = computed(() => {
  if (reportSubmitting.value) {
    return reportGenerationStage.value ? `${reportGenerationStage.value}中...` : "生成中..."
  }

  return generatedReport.value ? "重新生成" : "生成报告"
})

watch([inspectionWorkOrder, repairWorkOrder], () => {
  if (props.kind === "repair") {
    const current = repairWorkOrder.value
    detailBreadcrumbTitle.value = toOptionalText(current?.ParkName) || toOptionalText(current?.OrderNo)
    return
  }

  const current = resolvedInspectionWorkOrder.value
  detailBreadcrumbTitle.value = toOptionalText(current?.ServiceName) || toOptionalText(current?.OrderNo)
})

watch(workOrderUuid, (uuid) => {
  assignableUsersLoaded.value = false
  assignableUsers.value = []
  generatedReport.value = null
  generatedReportUrl.value = ""
  generatedReportPdfUrl.value = ""
  reportBuilding.value = null
  reportDialogOpen.value = false
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

function openRepairEditPage() {
  const uuid = workOrderUuid.value

  if (!uuid) {
    toast.error("当前报修工单缺少 Uuid，无法编辑")
    return
  }

  void router.push({
    name: "repair-work-order-edit",
    params: { id: uuid },
    query: {
      customerUuid: customerUuid.value,
      returnTo: queryReturnTo.value || "repair-work-orders",
    },
  })
}

async function confirmDeleteRepairWorkOrder() {
  const uuid = workOrderUuid.value

  if (!uuid || deleteSubmitting.value) {
    return
  }

  deleteSubmitting.value = true

  try {
    await deleteRepairWorkOrder({ Uuid: uuid })
    deleteConfirmOpen.value = false
    toast.success("报修工单已删除")
    await router.push({ name: "repair-work-orders" })
  } catch (error) {
    handleApiError(error, {
      fallback: "报修工单删除失败，请稍后重试。",
    })
  } finally {
    deleteSubmitting.value = false
  }
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
    if (props.kind === "repair") {
      await ensureRepairDictionaries()
    }

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
    const groups = buildInspectionCategoryGroups(build, buildIndex, inspectionItems)
    const fallbackCompletedCount = inspectionItems.filter(item => isInspectionItemCompleted(item)).length
    const totalCount = resolveInspectionBuildTotalCount(build, inspectionItems.length)
    const completedCount = resolveInspectionBuildCompletedCount(build, fallbackCompletedCount, totalCount)
    const progressLabel = hasInspectionBuildPassCount(build) ? "已通过" : "已完成"

    return {
      key: toText(build.BuildUuid, `work-order-build-${buildIndex + 1}`),
      buildName: toText(build.BuildName, `建筑 ${buildIndex + 1}`),
      status: resolveInspectionBuildStatus(build.Result, completedCount, totalCount),
      completedCount,
      totalCount,
      progressValue: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
      progressLabel,
      deadlineText,
      scoreText: formatInspectionCardBuildingScore(groups),
      groups,
    }
  })
}

function buildInspectionCategoryGroups(
  build: WorkOrderBuildInfo,
  buildIndex: number,
  inspectionItems: WorkOrderBuildInspectionItem[],
): InspectionBuildingCardV2Group[] {
  if (!inspectionItems.length) {
    return []
  }

  const groupMap = new Map<string, {
    group: InspectionBuildingCardV2Group
    sourceItems: WorkOrderBuildInspectionItem[]
  }>()

  inspectionItems.forEach((item, itemIndex) => {
    const inspectionItemKey = resolveWorkOrderInspectionItemKey(item, itemIndex)
    const inspectionItemDetailUuid = resolveInspectionItemDetailUuid(item)
    const detail = inspectionItemDetailUuid ? inspectionItemDetailByUuid.value[inspectionItemDetailUuid] : undefined
    const categoryName = toText(detail?.CategoryName, toText(item.CategoryName, "未分类"))
    const categoryKey = toText(item.CategoryUuid, "") || `inspection-category-${categoryName}`
    const inspectionItemName = toText(item.InspectionItemName, `检测项 ${itemIndex + 1}`)
    const scoreValue = toNumber(item.Score)
    const row: InspectionBuildingCardV2Row = {
      key: inspectionItemKey,
      name: inspectionItemName,
      categoryName,
      resultLabel: formatInspectionResultLabel(item.Result),
      scoreValue,
      scoreText: formatInspectionCardDeduction(scoreValue),
      onSelect: () => {
        void openInspectionHistorySheet(buildInspectionItemHistoryModel({
          buildName: toText(build.BuildName, `建筑 ${buildIndex + 1}`),
          categoryName,
          inspectionItemName,
          inspectionItemKey,
          detail,
          item,
        }), item)
      },
    }

    const existingEntry = groupMap.get(categoryKey)

    if (existingEntry) {
      existingEntry.group.items.push(row)
      existingEntry.sourceItems.push(item)
      existingEntry.group.scoreText = formatInspectionCategoryScore(existingEntry.sourceItems)
      existingEntry.group.scoreValue = resolveInspectionCategoryScore(existingEntry.sourceItems)
      return
    }

    groupMap.set(categoryKey, {
      group: {
        key: categoryKey,
        title: categoryName,
        scoreText: formatInspectionCategoryScore([item]),
        scoreValue: resolveInspectionCategoryScore([item]),
        items: [row],
      },
      sourceItems: [item],
    })
  })

  return Array.from(groupMap.values(), entry => entry.group)
}

async function loadWorkOrderInspectionItemDetails(builds: WorkOrderBuildInfo[] | undefined, requestId: number) {
  const inspectionItemUuids = Array.from(new Set(
    (Array.isArray(builds) ? builds : [])
      .flatMap(build => Array.isArray(build.InspectionItems) ? build.InspectionItems : [])
      .map(item => resolveInspectionItemDetailUuid(item))
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

async function openInspectionHistorySheet(model: InspectionItemHistoryModel, item: WorkOrderBuildInspectionItem) {
  const requestId = ++latestInspectionHistoryRequestId
  selectedInspectionHistoryModel.value = model
  inspectionHistorySheetOpen.value = true

  const inspectionItemUuid = resolveInspectionItemHistoryUuid(item)

  if (!inspectionItemUuid) {
    return
  }

  try {
    const historyItems = await fetchWorkOrderInspectionHistoryDetail({ Uuid: inspectionItemUuid })

    if (requestId !== latestInspectionHistoryRequestId || selectedInspectionHistoryModel.value?.key !== model.key) {
      return
    }

    selectedInspectionHistoryModel.value = {
      ...model,
      historyEntries: buildInspectionItemHistoryEntries(historyItems, model.inspectionItemName),
    }
  } catch (error) {
    if (requestId !== latestInspectionHistoryRequestId || selectedInspectionHistoryModel.value?.key !== model.key) {
      return
    }

    selectedInspectionHistoryModel.value = {
      ...model,
      historyEntries: [],
    }
    toast.error(handleApiError(error, {
      mode: "silent",
      fallback: "检测结果历史加载失败，请稍后重试。",
    }))
  }
}

function resetInspectionHistorySheet() {
  latestInspectionHistoryRequestId += 1
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
  const inspectorName = resolveInspectionItemExecutorName(args.item)
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
    historyEntries: [],
  }
}

function buildInspectionItemHistoryEntries(
  items: WorkOrderInspectionHistoryDetailItem[],
  inspectionItemName: string,
) {
  return items.map((item, index) => ({
    key: toText(item.Uuid, `inspection-history-${index + 1}`),
    resultLabel: formatInspectionHistoryResultLabel(item.Result),
    contentText: resolveInspectionHistoryContentText(item, inspectionItemName),
    measureValue: toText(item.MeasureContent, ""),
    mediaFiles: resolveInspectionHistoryMediaFiles(item.PhotoFile),
    isReplay: resolveInspectionHistoryReplayFlag(item.IsReplay),
    isLatest: index === 0,
  }))
}

function resolveInspectionHistoryMediaFiles(value: WorkOrderInspectionHistoryDetailItem["PhotoFile"]) {
  return (Array.isArray(value) ? value : [])
    .map((file) => {
      const src = toText(file.Url, "")

      if (!src) {
        return null
      }

      return {
        src,
        type: toNumber(file.Type) === 2 ? "video" as const : "image" as const,
      }
    })
    .filter((file): file is { src: string, type: "image" | "video" } => file !== null)
}

function formatInspectionItemScore(value: unknown) {
  return formatDeductionScoreText(toNumber(value))
}

function formatInspectionCardDeadline(value: unknown) {
  return toText(value, "-") || "-"
}

function formatInspectionCardBuildingScore(groups: InspectionBuildingCardV2Group[]) {
  const validScores = groups
    .map(group => group.scoreValue)
    .filter((value): value is number => value !== null)

  if (!validScores.length) {
    return "-"
  }

  const score = validScores.reduce((sum, value) => sum + Math.max(0, value), 0)

  if (Number.isInteger(score)) {
    return String(score)
  }

  return score.toFixed(1).replace(/\.0$/, "")
}

function formatInspectionCardDeduction(value: number | null) {
  return formatDeductionScoreText(value)
}

function formatDeductionScoreText(value: number | null) {
  if (value === null) {
    return "-"
  }

  if (Number.isInteger(value)) {
    return `-${value} 分`
  }

  return `-${value.toFixed(1).replace(/\.0$/, "")} 分`
}

function formatInspectionCategoryScore(items: WorkOrderBuildInspectionItem[]) {
  const score = resolveInspectionCategoryScore(items)

  if (score === null) {
    return "-"
  }

  if (Number.isInteger(score)) {
    return `${score} 分`
  }

  return `${score.toFixed(1).replace(/\.0$/, "")} 分`
}

function resolveWorkOrderInspectionItemKey(item: WorkOrderBuildInspectionItem, itemIndex: number) {
  return toText(item.InspectionItemUuid, `inspection-item-${itemIndex + 1}`)
}

function resolveInspectionItemDetailUuid(item: WorkOrderBuildInspectionItem) {
  return toText(item.InspectionItemUuid, "")
}

function resolveInspectionItemHistoryUuid(item: WorkOrderBuildInspectionItem) {
  return toText(item.Uuid, "")
}

function resolveInspectionHistoryReplayFlag(value: unknown) {
  const flag = toNumber(value)

  if (flag === null) {
    return null
  }

  return flag === 1
}

function resolveInspectionItemExecutorName(item: WorkOrderBuildInspectionItem, fallback = "待回传") {
  return toText(item.UserName, toText(item.ExecutorName, fallback))
}

function resolveInspectionCategoryScore(items: WorkOrderBuildInspectionItem[]) {
  if (!items.length) {
    return null
  }

  if (items.some(item => toNumber(item.Result) === 3)) {
    return 0
  }

  const baseScore = items
    .map(item => toNumber(item.CategoryScore))
    .find((value): value is number => value !== null)

  if (baseScore === undefined) {
    return null
  }

  const deductionTotal = items.reduce((sum, item) => sum + Math.max(0, toNumber(item.Score) ?? 0), 0)
  return Math.max(0, baseScore - deductionTotal)
}

function formatInspectionHistoryResultLabel(value: unknown) {
  const result = toNumber(value)

  if (result === 1) return "正常"
  if (result === 2) return "重点关注"
  if (result === 3) return "高风险"

  return "未反馈"
}

function resolveInspectionHistoryContentText(
  item: WorkOrderInspectionHistoryDetailItem,
  inspectionItemName: string,
) {
  const content = toText(item.Content, "")
  const name = toText(item.Name, "")
  const normalizedInspectionItemName = normalizeComparableText(inspectionItemName)
  const normalizedContent = normalizeComparableText(content)
  const normalizedName = normalizeComparableText(name)

  if (normalizedContent && normalizedContent !== normalizedInspectionItemName) {
    return content
  }

  if (normalizedName && normalizedName !== normalizedInspectionItemName) {
    return name
  }

  if (!content) {
    return ""
  }

  return ""
}

function normalizeComparableText(value: string) {
  return value.trim().replace(/\s+/g, "")
}

function isInspectionItemCompleted(item: WorkOrderBuildInspectionItem) {
  return toNumber(item.Score) !== null && Boolean(resolveInspectionItemExecutorName(item, ""))
}

function resolveInspectionBuildStatus(
  result: unknown,
  completedCount: number,
  totalCount: number,
): InspectionBuildingCardV2Status {
  const normalizedResult = toNumber(result)

  if (normalizedResult !== null && normalizedResult >= 1 && normalizedResult <= 3) {
    return "completed"
  }

  if (totalCount > 0 && completedCount >= totalCount) {
    return "completed"
  }

  if (completedCount > 0) {
    return "processing"
  }

  return "pending"
}

function hasInspectionBuildPassCount(build: WorkOrderBuildInfo) {
  return toNumber(build.ItemPassTotal) !== null
}

function resolveInspectionBuildTotalCount(build: WorkOrderBuildInfo, fallbackCount: number) {
  const totalCount = toNumber(build.ItemTotal)

  if (totalCount === null) {
    return fallbackCount
  }

  return Math.max(0, totalCount)
}

function resolveInspectionBuildCompletedCount(
  build: WorkOrderBuildInfo,
  fallbackCount: number,
  totalCount: number,
) {
  const passCount = toNumber(build.ItemPassTotal)

  if (passCount === null) {
    return fallbackCount
  }

  return Math.max(0, Math.min(passCount, totalCount))
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
  if (result === 2) return "轻微风险"
  if (result === 3) return "存在隐患"

  return `结果 ${result}`
}

function formatRepairCardReportType(value: unknown) {
  return formatRepairDictionaryLabel(value, repairTypeOptions.value, "类型")
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

function openReportDialog(buildingKey: string) {
  const currentWorkOrder = resolvedInspectionWorkOrder.value

  if (!currentWorkOrder) {
    toast.error("当前检测工单缺少详情数据，无法生成报告")
    return
  }

  const currentBuilding = findInspectionReportBuild(buildingKey)

  if (!currentBuilding) {
    toast.error("当前建筑缺少详情数据，无法生成报告")
    return
  }

  reportForm.value = {
    title: `${toText(currentBuilding.BuildName, "当前建筑")}检测报告`,
    reportDate: getTodayDate(),
    accessPassword: "",
    version: "1",
    remark: toText(currentWorkOrder.Remark, ""),
  }
  reportBuilding.value = currentBuilding
  generatedReport.value = null
  generatedReportUrl.value = ""
  generatedReportPdfUrl.value = ""
  reportDialogOpen.value = true
}

function findInspectionReportBuild(buildingKey: string) {
  const builds = resolvedInspectionWorkOrder.value?.Builds

  if (!Array.isArray(builds) || !buildingKey) {
    return null
  }

  return builds.find((build, buildIndex) => (
    toText(build.BuildUuid, `work-order-build-${buildIndex + 1}`) === buildingKey
  )) ?? null
}

function closeReportDialog() {
  if (reportSubmitting.value) {
    return
  }

  reportDialogOpen.value = false
}

function updateReportPassword(value: string | number) {
  reportForm.value.accessPassword = String(value).replace(/\D/g, "").slice(0, 4)
}

function updateReportVersion(value: string | number) {
  reportForm.value.version = String(value).replace(/\D/g, "").slice(0, 6)
}

function parseReportVersion() {
  const version = Number(reportForm.value.version)

  return Number.isInteger(version) && version > 0 ? version : null
}

async function submitReportGeneration() {
  const currentWorkOrder = resolvedInspectionWorkOrder.value
  const currentBuilding = reportBuilding.value

  if (!currentWorkOrder) {
    toast.error("当前检测工单缺少详情数据，无法生成报告")
    return
  }

  if (!currentBuilding) {
    toast.error("当前建筑缺少详情数据，无法生成报告")
    return
  }

  const buildUuid = toText(currentBuilding.BuildUuid, "")
  const targetWorkOrderUuid = toText(currentWorkOrder.Uuid, workOrderUuid.value)
  const version = parseReportVersion()

  if (!buildUuid) {
    toast.error("当前建筑缺少 Uuid，无法生成报告")
    return
  }

  if (!targetWorkOrderUuid) {
    toast.error("当前检测工单缺少 Uuid，无法生成报告")
    return
  }

  if (!canSubmitReport.value) {
    toast.error("请填写 4 位数字密码和有效版本号")
    return
  }

  reportSubmitting.value = true
  reportGenerationStage.value = "生成报告"
  generatedReport.value = null
  generatedReportUrl.value = ""
  generatedReportPdfUrl.value = ""
  let failedStage: ReportGenerationStage = "生成报告"

  try {
    if (version === null) {
      toast.error("报告版本号必须是正整数")
      return
    }

    const reportResult = await generateWorkOrderGnReport({
      BuildUuid: buildUuid,
      WorkOrderUuid: targetWorkOrderUuid,
      Expert: reportForm.value.remark,
      Version: version,
    })
    const record = createInspectionReportFromGnReport({
      title: `${toText(reportResult.BuildName, toText(currentBuilding.BuildName, "当前建筑"))}检测报告`,
      reportDate: getTodayDate(),
      accessPassword: reportForm.value.accessPassword,
      report: {
        ...reportResult,
        BuildName: toText(reportResult.BuildName, toText(currentBuilding.BuildName, "当前建筑")),
        BuildUuid: toText(reportResult.BuildUuid, buildUuid),
        Expert: toText(reportResult.Expert, reportForm.value.remark),
      },
    })

    failedStage = "生成 PDF"
    generatedReport.value = record
    generatedReportUrl.value = buildInspectionReportUrl(record.id)
    reportGenerationStage.value = "生成 PDF"
    await nextTick()

    if (!reportPdfElement.value) {
      throw new Error("PDF 渲染节点未就绪")
    }

    const { generateReportPdfBlob } = await import("@/lib/report-pdf")
    const pdfBlob = await generateReportPdfBlob(reportPdfElement.value)
    const fileName = createReportPdfFileName(record, version)
    const pdfFile = new File([pdfBlob], fileName, { type: "application/pdf" })
    const objectKey = createReportPdfObjectKey({
      buildUuid,
      fileName,
      version,
      workOrderUuid: targetWorkOrderUuid,
    })

    failedStage = "上传 PDF"
    reportGenerationStage.value = "上传 PDF"
    const uploadResult = await uploadTencentCosFile({
      file: pdfFile,
      key: objectKey,
      contentType: "application/pdf",
    })

    failedStage = "保存地址"
    reportGenerationStage.value = "保存地址"
    await uploadWorkOrderReport({
      BuildUuid: buildUuid,
      FileUrl: uploadResult.url,
      Version: version,
      WorkOrderUuid: targetWorkOrderUuid,
    })

    const updatedRecord = updateInspectionReportFileUrl(record.id, uploadResult.url) ?? {
      ...record,
      fileUrl: uploadResult.url,
    }

    generatedReport.value = updatedRecord
    generatedReportPdfUrl.value = uploadResult.url
    toast.success("报告已生成", {
      description: "PDF 已上传并保存文件地址。",
    })
  } catch (error) {
    toast.error(getReportGenerationErrorTitle(failedStage), {
      description: handleApiError(error, {
        mode: "silent",
        fallback: getReportGenerationErrorFallback(failedStage),
      }),
    })
  } finally {
    reportGenerationStage.value = ""
    reportSubmitting.value = false
  }
}

function getReportGenerationErrorTitle(stage: ReportGenerationStage) {
  if (stage === "上传 PDF") {
    return "PDF 上传失败"
  }

  if (stage === "保存地址") {
    return "PDF 地址保存失败"
  }

  if (stage === "生成 PDF") {
    return "PDF 生成失败"
  }

  return "报告生成失败"
}

function getReportGenerationErrorFallback(stage: ReportGenerationStage) {
  if (stage === "上传 PDF") {
    return "PDF 上传失败，请稍后重试。"
  }

  if (stage === "保存地址") {
    return "PDF 地址保存失败，请稍后重试。"
  }

  if (stage === "生成 PDF") {
    return "PDF 生成失败，请稍后重试。"
  }

  return "报告生成失败，请稍后重试。"
}

async function copyGeneratedReportUrl() {
  if (!generatedReportUrl.value) {
    return
  }

  try {
    await navigator.clipboard.writeText(generatedReportUrl.value)
    toast.success("HTML 报告链接已复制")
  } catch {
    toast.error("复制失败，请手动复制链接")
  }
}

async function copyGeneratedReportPdfUrl() {
  if (!generatedReportPdfUrl.value) {
    return
  }

  try {
    await navigator.clipboard.writeText(generatedReportPdfUrl.value)
    toast.success("PDF 链接已复制")
  } catch {
    toast.error("复制失败，请手动复制链接")
  }
}

function openGeneratedReport() {
  if (!generatedReportUrl.value) {
    return
  }

  window.open(generatedReportUrl.value, "_blank", "noopener,noreferrer")
}

function openGeneratedReportPdf() {
  if (!generatedReportPdfUrl.value) {
    toast.error("PDF 文件尚未生成")
    return
  }

  window.open(generatedReportPdfUrl.value, "_blank", "noopener,noreferrer")
}

function downloadGeneratedReportQr() {
  if (!generatedReportUrl.value) {
    return
  }

  const dataUrl = createReportQrPlaceholderDataUrl(generatedReportUrl.value, "报告访问占位二维码")

  if (!dataUrl) {
    toast.error("二维码生成失败")
    return
  }

  const link = document.createElement("a")
  link.href = dataUrl
  link.download = `${generatedReport.value?.id ?? "inspection-report"}-qr-placeholder.png`
  document.body.appendChild(link)
  link.click()
  link.remove()
}

function createReportPdfFileName(report: InspectionReportRecord, version: number) {
  const timestamp = formatReportPdfTimestamp(new Date())
  const orderNo = sanitizeObjectKeyFileName(report.snapshot.orderNo || "工单")
  const buildingName = sanitizeObjectKeyFileName(report.snapshot.buildings[0]?.name || "建筑")

  return `检测报告-${orderNo}-${buildingName}-v${version}-${timestamp}.pdf`
}

function createReportPdfObjectKey(payload: {
  buildUuid: string
  fileName: string
  version: number
  workOrderUuid: string
}) {
  return [
    "inspection-reports",
    sanitizeObjectKeySegment(payload.workOrderUuid),
    sanitizeObjectKeySegment(payload.buildUuid),
    `v${payload.version}`,
    payload.fileName,
  ].join("/")
}

function sanitizeObjectKeyFileName(value: string) {
  const normalized = toText(value, "")
    .replace(/[\\/?%*:|"<>]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")

  return normalized || "report"
}

function sanitizeObjectKeySegment(value: string) {
  return sanitizeObjectKeyFileName(value).replace(/\.+/g, "-") || "unknown"
}

function formatReportPdfTimestamp(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  const seconds = String(date.getSeconds()).padStart(2, "0")

  return `${year}${month}${day}${hours}${minutes}${seconds}`
}

function getTodayDate() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
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

async function ensureRepairDictionaries() {
  if (repairImportanceOptions.value.length || repairTypeOptions.value.length) {
    return
  }

  try {
    const dictionaries = await fetchRepairWorkOrderDictionaries()
    repairImportanceOptions.value = dictionaries.importanceOptions
    repairTypeOptions.value = dictionaries.typeOptions
  } catch {
    repairImportanceOptions.value = []
    repairTypeOptions.value = []
  }
}

function resetAssignState() {
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
    if (!assignUserUuids.value.length) {
      toast.error("请先选择至少一位指派人员")
      return
    }

    if (props.kind === "inspection") {
      await dispatchWorkOrder({
        Uuid: uuid,
        UserUuids: assignUserUuids.value,
      })
    } else {
      await dispatchRepairWorkOrder({
        Uuids: [uuid],
        UserUuids: assignUserUuids.value,
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
      <PermissionGate :code="PERMISSION_CODES.repairWorkOrderDelete">
        <AlertDialog :open="deleteConfirmOpen" @update:open="deleteConfirmOpen = $event">
          <Button
            v-if="showRepairDeleteAction"
            type="button"
            variant="outline"
            size="sm"
            class="h-8 gap-1 px-3 text-[14px] font-medium text-destructive hover:bg-destructive/10 hover:text-destructive"
            @click="deleteConfirmOpen = true"
          >
            <i class="ri-delete-bin-line text-base" />
            删除
          </Button>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除当前报修工单？</AlertDialogTitle>
              <AlertDialogDescription>
                删除后将无法恢复，该操作会移除当前报修工单。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel :disabled="deleteSubmitting">
                取消
              </AlertDialogCancel>
              <AlertDialogAction
                :disabled="deleteSubmitting"
                class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                @click="confirmDeleteRepairWorkOrder"
              >
                {{ deleteSubmitting ? "删除中..." : "确认删除" }}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PermissionGate>
      <PermissionGate :code="assignPermissionCode">
        <Button
          v-if="showAssignAction"
          type="button"
          variant="outline"
          size="sm"
          class="h-8 gap-1 px-3 text-[14px] font-medium"
          @click="openAssignDialog"
        >
          <i class="ri-user-shared-line text-base" />
          指派
        </Button>
      </PermissionGate>
      <PermissionGate :code="PERMISSION_CODES.repairWorkOrderEdit">
        <Button
          v-if="showRepairEditAction"
          type="button"
          variant="outline"
          size="sm"
          class="h-8 gap-1 px-3 text-[14px] font-medium"
          @click="openRepairEditPage"
        >
          <i class="ri-edit-line text-base" />
          编辑
        </Button>
      </PermissionGate>
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
          <DetailRelationSkeleton :two-data-columns="false" :rows-per-group="2" />
        </div>

        <div v-else-if="!loading && hasWorkOrder" class="pb-5">
          <RepairWorkOrderContentCard
            :work-order="repairWorkOrder"
          />
        </div>
      </template>

      <template v-else>
        <div v-if="loading" class="pb-5">
          <DetailRelationSkeleton :two-data-columns="false" :rows-per-group="3" />
        </div>

        <div v-else-if="!loading && hasWorkOrder" class="pb-5">
          <InspectionBuildingCards
            :buildings="inspectionBuildingCards"
            :expert-advice="inspectionExpertAdvice"
            title="建筑与检测项"
            empty-title="暂无建筑检测项"
            empty-description="当前工单还没有返回建筑与检测项数据。"
            show-expert-advice
            show-report-action
            @generate-report="openReportDialog"
          />
        </div>
      </template>
    </template>
  </DetailLayout>

  <Dialog v-model:open="reportDialogOpen">
    <DialogContent class="max-w-[min(96vw,40rem)] gap-0 overflow-hidden p-0">
      <DialogHeader class="px-4 pt-4 pb-0">
        <DialogTitle>生成检测报告</DialogTitle>
        <DialogDescription>
          为「{{ selectedReportBuildingName }}」填写版本号、访问密码和专家建议，生成 HTML 报告并自动上传 PDF 文件。
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4 px-4 pt-4 pb-0">
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="space-y-1.5">
            <span class="text-sm font-medium text-foreground">版本号</span>
            <Input
              :model-value="reportForm.version"
              type="text"
              inputmode="numeric"
              autocomplete="off"
              placeholder="请输入版本号"
              :disabled="reportSubmitting"
              @update:model-value="updateReportVersion"
            />
          </label>

          <label class="space-y-1.5">
            <span class="text-sm font-medium text-foreground">访问密码</span>
            <Input
              :model-value="reportForm.accessPassword"
              type="text"
              inputmode="numeric"
              autocomplete="off"
              maxlength="4"
              placeholder="4 位数字"
              :disabled="reportSubmitting"
              class="tracking-[0.24em]"
              @update:model-value="updateReportPassword"
            />
          </label>

          <label class="space-y-1.5 sm:col-span-2">
            <span class="text-sm font-medium text-foreground">专家建议</span>
            <Textarea
              v-model="reportForm.remark"
              :disabled="reportSubmitting"
              class="min-h-20 resize-none bg-background"
              placeholder="填写专家处理建议，可留空"
            />
          </label>
        </div>

        <section
          v-if="generatedReport && generatedReportUrl"
          class="rounded-lg bg-brand-surface p-3 shadow-[inset_0_0_0_1px_rgb(0_117_222_/_0.12)]"
        >
          <div class="flex min-w-0 items-start gap-3">
            <div class="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-background text-link shadow-(--shadow-border)">
              <i class="ri-checkbox-circle-line text-lg" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-foreground">报告已生成</p>
              <div class="mt-2 space-y-1.5 text-xs leading-5 text-muted-foreground">
                <p class="break-all">
                  <span class="font-medium text-foreground">HTML：</span>{{ generatedReportUrl }}
                </p>
                <p v-if="generatedReportPdfUrl" class="break-all">
                  <span class="font-medium text-foreground">PDF：</span>{{ generatedReportPdfUrl }}
                </p>
              </div>
              <div class="mt-3 flex flex-wrap gap-2">
                <Button type="button" variant="outline" class="h-8 gap-1 px-3" @click="copyGeneratedReportUrl">
                  <i class="ri-file-copy-line text-base" />
                  复制 HTML 链接
                </Button>
                <Button type="button" variant="outline" class="h-8 gap-1 px-3" @click="openGeneratedReport">
                  <i class="ri-external-link-line text-base" />
                  打开 HTML
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  class="h-8 gap-1 px-3"
                  :disabled="!generatedReportPdfUrl"
                  @click="copyGeneratedReportPdfUrl"
                >
                  <i class="ri-file-copy-line text-base" />
                  复制 PDF 链接
                </Button>
                <Button
                  type="button"
                  class="h-8 gap-1 px-3"
                  :disabled="!generatedReportPdfUrl"
                  @click="openGeneratedReportPdf"
                >
                  <i class="ri-download-2-line text-base" />
                  下载 PDF
                </Button>
              </div>
            </div>
          </div>
        </section>

      </div>

      <DialogFooter class="gap-2 px-4 py-3">
        <Button type="button" variant="outline" :disabled="reportSubmitting" @click="closeReportDialog">
          取消
        </Button>
        <Button type="button" :disabled="!canSubmitReport" @click="submitReportGeneration">
          {{ reportSubmitButtonText }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <div v-if="generatedReport" class="report-pdf-render-host" aria-hidden="true">
    <div ref="reportPdfElement" class="report-pdf-render-surface">
      <InspectionReportDocument :report="generatedReport" variant="pdf" />
    </div>
  </div>

  <Dialog v-model:open="assignDialogOpen">
    <DialogContent class="sm:max-w-[420px]">
      <DialogHeader>
        <DialogTitle>指派工单</DialogTitle>
        <DialogDescription>
          {{ isInspectionAssignDialog ? "请选择一位或多位执行人并确认提交。" : "请选择一位或多位维修人员并确认提交。" }}
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4">
        <p class="text-sm text-foreground">{{ isInspectionAssignDialog ? "执行人" : "维修人员" }}</p>
        <Select v-model="assignUserUuids" multiple :disabled="assignableUsersLoading || assignSubmitting">
          <SelectTrigger class="w-full">
            <SelectValue :placeholder="assignableUsersLoading ? '正在加载用户...' : isInspectionAssignDialog ? '请选择执行人，可多选' : '请选择维修人员，可多选'" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="user in assignableUsers" :key="user.uuid" :value="user.uuid">
              {{ user.name }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" class="" :disabled="assignSubmitting" @click="closeAssignDialog">
          取消
        </Button>
        <Button type="button" class="" :disabled="!canSubmitAssign" @click="submitAssign">
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

<style scoped>
.report-pdf-render-host {
  background: #ffffff;
  left: -10000px;
  pointer-events: none;
  position: fixed;
  top: 0;
  width: 794px;
}

.report-pdf-render-surface {
  background: #ffffff;
  color: hsl(var(--foreground));
  width: 794px;
}
</style>
