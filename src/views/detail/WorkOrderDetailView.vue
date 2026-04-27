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
import RepairWorkOrderMediaSheet from "@/components/detail/RepairWorkOrderMediaSheet.vue"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { detailBreadcrumbTitle } from "@/composables/useDetailBreadcrumbTitle"
import DetailLayout from "@/layouts/DetailLayout.vue"
import { handleApiError } from "@/lib/api-errors"
import { fetchCustomerDetail, type CustomerDetailResult } from "@/lib/customers-api"
import { getInspectionItemDetail, type InspectionItemRecord } from "@/lib/inspection-items-api"
import { fetchInspectionPlanDetail, type InspectionPlanListItem } from "@/lib/inspection-plans-api"
import { fetchMembers } from "@/lib/members-api"
import { fetchRepairWorkOrderDictionaries, formatRepairDictionaryLabel, type RepairDictionaryOption } from "@/lib/repair-work-order-dictionaries"
import { fetchInspectionServiceDetail, type InspectionServiceListItem } from "@/lib/inspection-services-api"
import {
  deleteRepairWorkOrder,
  dispatchRepairWorkOrder,
  dispatchWorkOrder,
  fetchRepairWorkOrderDetail,
  fetchWorkOrderInspectionHistoryDetail,
  fetchWorkOrderDetail,
  type WorkOrderInspectionHistoryDetailItem,
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
const repairMediaSheetOpen = ref(false)

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
const repairWorkOrderCards = computed(() => buildRepairWorkOrderCards(repairWorkOrder.value))

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

function handleRepairMediaSheetOpenChange(open: boolean) {
  repairMediaSheetOpen.value = open
}

function openRepairMediaSheet() {
  if (!repairWorkOrder.value) {
    return
  }

  repairMediaSheetOpen.value = true
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

function buildRepairWorkOrderCards(workOrder: RepairWorkOrderDetailResult | null): InspectionBuildingCardV2Building[] {
  if (!workOrder) {
    return []
  }

  const title = toRepairWorkOrderText(workOrder.ParkName, toRepairWorkOrderText(workOrder.OrderNo, "报修工单"))
  const content = toRepairWorkOrderText(workOrder.Content, "")
  const repairContent = toRepairWorkOrderText(workOrder.RepairContent, "")
  const items: InspectionBuildingCardV2Row[] = [
    {
      key: "repair-content",
      name: content ? truncateText(content, 28) : "报修内容",
      categoryName: "报修问题",
      resultLabel: formatRepairCardReportType(workOrder.ReportType),
      scoreText: formatRepairCardImportant(workOrder.Important),
      scoreValue: toNumber(workOrder.Important),
      onSelect: openRepairMediaSheet,
    },
  ]

  if (repairContent) {
    items.push({
      key: "repair-record",
      name: truncateText(repairContent, 28),
      categoryName: "维修记录",
      resultLabel: "维修记录",
      scoreText: formatRepairFileCount(workOrder),
      scoreValue: null,
      onSelect: openRepairMediaSheet,
    })
  }

  const totalCount = Math.max(1, items.length)

  return [
    {
      key: toRepairWorkOrderText(workOrder.Uuid, "repair-work-order"),
      buildName: title,
      status: resolveRepairCardStatus(workOrder.Status),
      completedCount: items.length,
      totalCount,
      progressValue: Math.round((items.length / totalCount) * 100),
      progressLabel: "已记录",
      deadlineText: toRepairWorkOrderText(workOrder.CreatedAt, "-"),
      scoreText: formatRepairCardImportant(workOrder.Important),
      groups: [
        {
          key: "repair-problems",
          title: "报修问题",
          scoreText: formatRepairFileCount(workOrder),
          scoreValue: null,
          items,
        },
      ],
    },
  ]
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
    summary: resolveInspectionHistorySummary(item, inspectionItemName),
    contentText: resolveInspectionHistoryContentText(item, inspectionItemName),
    measureValue: toText(item.MeasureContent, ""),
    photoUrls: Array.isArray(item.PhotoFile) ? item.PhotoFile : [],
    isLatest: index === 0,
  }))
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

function resolveInspectionHistorySummary(
  item: WorkOrderInspectionHistoryDetailItem,
  inspectionItemName: string,
) {
  const content = toText(item.Content, "")
  const name = toText(item.Name, "")
  const normalizedInspectionItemName = normalizeComparableText(inspectionItemName)

  if (content && normalizeComparableText(content) !== normalizedInspectionItemName) {
    return content
  }

  if (name && normalizeComparableText(name) !== normalizedInspectionItemName) {
    return name
  }

  return ""
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

  if (!content) {
    return ""
  }

  if (normalizedContent === normalizedInspectionItemName) {
    return ""
  }

  if (normalizedContent && normalizedContent === normalizedName) {
    return ""
  }

  return content
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

function formatRepairCardImportant(value: unknown) {
  return formatRepairDictionaryLabel(value, repairImportanceOptions.value, "等级")
}

function formatRepairFileCount(workOrder: RepairWorkOrderDetailResult) {
  const count = countRepairFiles(workOrder)
  return count > 0 ? `${count} 个附件` : "无附件"
}

function countRepairFiles(workOrder: RepairWorkOrderDetailResult) {
  return normalizeRepairFiles(workOrder.BeforeRepairFile).length + normalizeRepairFiles(workOrder.AfterRepairFile).length
}

function normalizeRepairFiles(value: unknown) {
  return Array.isArray(value)
    ? value.filter(item => item && typeof item === "object" && toText((item as Record<string, unknown>).Url, ""))
    : []
}

function resolveRepairCardStatus(value: unknown): InspectionBuildingCardV2Status {
  const status = toNumber(value)

  if (status === 4) {
    return "completed"
  }

  if (status !== null && status >= 2) {
    return "processing"
  }

  return "pending"
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
      <AlertDialog :open="deleteConfirmOpen" @update:open="deleteConfirmOpen = $event">
        <Button
          v-if="showRepairDeleteAction"
          type="button"
          variant="outline"
          size="sm"
          class="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
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
      <Button
        v-if="showRepairEditAction"
        type="button"
        variant="outline"
        size="sm"
        class="gap-2"
        @click="openRepairEditPage"
      >
        <i class="ri-edit-line text-base" />
        编辑
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
          <DetailRelationSkeleton :two-data-columns="false" :rows-per-group="2" />
        </div>

        <div v-else-if="!loading && hasWorkOrder" class="pb-5">
          <InspectionBuildingCards
            :buildings="repairWorkOrderCards"
            title="报修卡片"
            empty-title="暂无报修内容"
            empty-description="当前工单还没有可展示的报修问题。"
            empty-items-text="当前报修卡片暂无问题。"
            total-label="报修项"
            empty-icon="ri-tools-line"
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

  <RepairWorkOrderMediaSheet
    :open="repairMediaSheetOpen"
    :work-order="repairWorkOrder"
    @update:open="handleRepairMediaSheetOpenChange"
  />
</template>
