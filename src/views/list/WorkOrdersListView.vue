<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { toast } from "vue-sonner"

import LinkedEntityDetailSheet from "@/components/detail/LinkedEntityDetailSheet.vue"
import WorkOrderPreviewSheet from "@/components/detail/WorkOrderPreviewSheet.vue"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import TablePage from "@/components/table-page/TablePage.vue"
import { workOrderStatusMap } from "@/components/table-page/statusPresets"
import { createTablePageDefinition, useTablePage } from "@/components/table-page/useTablePage"
import type { TablePageSchema, TableQueryBarConfig } from "@/components/table-page/types"
import { handleApiError } from "@/lib/api-errors"
import { fetchCustomers } from "@/lib/customers-api"
import { fetchInspectionPlans } from "@/lib/inspection-plans-api"
import { fetchMembers } from "@/lib/members-api"
import { fetchRepairWorkOrderDictionaries, formatRepairDictionaryLabel, type RepairDictionaryOption } from "@/lib/repair-work-order-dictionaries"
import {
  getRepairWorkOrderStatusLabel,
  getWorkOrderStatusLabel,
  REPAIR_WORK_ORDER_STATUS_OPTIONS,
  WORK_ORDER_STATUS_OPTIONS,
} from "@/lib/work-order-status"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  dispatchRepairWorkOrder,
  dispatchWorkOrder,
  fetchRepairWorkOrders,
  fetchWorkOrders,
  type RepairWorkOrderListItem,
  type WorkOrderListItem,
} from "@/lib/work-orders-api"
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

type WorkOrderPageKind = "inspection" | "repair"
type LinkedDetailSheetKind = "customer" | "service" | "plan" | "park"

const INSPECTION_WORK_ORDER_TAB_OPTIONS = WORK_ORDER_STATUS_OPTIONS.map(option => option.label)
const REPAIR_WORK_ORDER_TAB_OPTIONS = REPAIR_WORK_ORDER_STATUS_OPTIONS.map(option => option.label)

type WorkOrderRecord = {
  id: string
  uuid: string
  customerUuid: string
  planUuid: string
  orderNo: string
  customerName: string
  parkName: string
  packageName: string
  planName: string
  executor: string
  status: string
  statusValue: number | null
  statusLabel: string
  importantValue: string | null
  importantLabel: string
  reportTypeValue: string | null
  reportTypeLabel: string
  resultValue: number | string | null
  resultLabel: string
  score: number | string | null
  scoreLabel: string
  deadline: string
  remark: string
  createdAt: string
  updatedAt: string
  createdStartAt: string
  createdEndAt: string
}

type AssignableUserOption = {
  uuid: string
  name: string
}

const props = defineProps<{
  kind: WorkOrderPageKind
}>()

const workOrders = ref<WorkOrderRecord[]>([])
const loading = ref(false)
const errorMessage = ref("")
const pageNum = ref(1)
const pageSize = ref(50)
const total = ref(0)
const orderNoQuery = ref("")
const createdAtQuery = ref("")
const serviceNameQuery = ref("")
const executorQuery = ref("")
const selectedStatus = ref("")
const selectedImportant = ref("")
const selectedCustomerUuid = ref("")
const selectedPlanUuid = ref("")
const selectedResult = ref("")
const sortDirection = ref<"asc" | "desc">("desc")
const route = useRoute()
let latestRequestId = 0
const assignDialogOpen = ref(false)
const assignUserUuids = ref<string[]>([])
const assignTargetWorkOrder = ref<WorkOrderRecord | null>(null)
const assignableUsers = ref<AssignableUserOption[]>([])
const assignableUsersLoading = ref(false)
const assignableUsersLoaded = ref(false)
const assignSubmitting = ref(false)
const activeLinkedDetailKind = ref<LinkedDetailSheetKind | null>(null)
const activeLinkedDetailUuid = ref("")
const workOrderPreviewSheetOpen = ref(false)
const activeWorkOrderPreviewUuid = ref("")
const activeWorkOrderPreviewCustomerUuid = ref("")
const customerOptions = ref<Array<{ value: string; label: string }>>([])
const customerOptionsLoading = ref(false)
const inspectionPlanOptions = ref<Array<{ value: string; label: string }>>([])
const inspectionPlanOptionsLoading = ref(false)
const repairImportanceOptions = ref<RepairDictionaryOption[]>([])
const repairTypeOptions = ref<RepairDictionaryOption[]>([])
const repairDictionariesLoading = ref(false)
const inspectionResultOptions = [
  { value: "1", label: "正常" },
  { value: "2", label: "轻微风险" },
  { value: "3", label: "存在隐患" },
]
const pageTitle = computed(() => props.kind === "inspection" ? "检测工单" : "报修工单")
const pageEmptyStateTitle = computed(() => `暂无${pageTitle.value}数据`)
const pageEmptyStateDescription = computed(() => props.kind === "inspection"
  ? "暂时还没有检测工单，您可以先添加一条工单。"
  : "暂时还没有报修工单，您可以先添加一条工单。")
const isInspectionAssignDialog = computed(() => props.kind === "inspection")
const canSubmitAssign = computed(() => {
  if (assignSubmitting.value) {
    return false
  }

  return assignUserUuids.value.length > 0
})
const pageSortStorageKey = computed(() => props.kind === "inspection"
  ? "inspection-work-orders-sort-preferences-created-at-v2"
  : "repair-work-orders-sort-preferences-created-at-v4")
const primaryActionLabel = "添加工单"
const router = useRouter()
const columns = props.kind === "inspection" ? createInspectionColumns() : createRepairColumns()
const statusOptions = props.kind === "repair" ? REPAIR_WORK_ORDER_STATUS_OPTIONS : WORK_ORDER_STATUS_OPTIONS
const statusTabOptions = props.kind === "repair" ? REPAIR_WORK_ORDER_TAB_OPTIONS : INSPECTION_WORK_ORDER_TAB_OPTIONS

const schema: TablePageSchema<WorkOrderRecord> = {
  title: pageTitle.value,
  description: props.kind === "inspection" ? "查看和管理巡检任务，了解现场检查进度和结果" : "处理客户提交的报修问题，跟进维修进度和处理情况",
  rowKey: "uuid",
  data: [],
  primaryActionLabel,
  showIndex: true,
  stickyHeader: true,
  emptyState: {
    title: pageEmptyStateTitle.value,
    description: pageEmptyStateDescription.value,
    icon: "ri-file-list-3-line",
  },
  rowActions: props.kind === "inspection"
    ? [
        {
          key: "assign",
          label: "指派",
          onClick: row => handleAssign(row as WorkOrderRecord),
        },
        {
          key: "view-detail",
          label: "查看详情",
          onClick: row => handleViewDetail(row as WorkOrderRecord),
        },
      ]
    : [
        {
          key: "assign",
          label: "指派",
          onClick: row => handleAssign(row as WorkOrderRecord),
        },
        {
          key: "view-detail",
          label: "查看详情",
          onClick: row => handleViewDetail(row as WorkOrderRecord),
        },
      ],
  onRowClick: row => handleViewDetail(row as WorkOrderRecord),
  onQuickAction: row => handleOpenPreviewSheet(row as WorkOrderRecord),
  columns,
  filters: [],
  sort: {
    storageKey: pageSortStorageKey.value,
    initialField: "createdAt",
    initialDirection: "desc",
  },
  tabs: {
    mode: "enum",
    all: { label: "全部", value: "all" },
    field: "statusLabel",
    options: statusTabOptions,
    order: statusTabOptions,
  },
}

const page = useTablePage({
  ...createTablePageDefinition(schema),
  rows: computed(() => [...workOrders.value].sort((left, right) => compareWorkOrderRows(left, right, sortDirection.value, props.kind))),
})
page.showControls.value = true
page.customSortEnabled.value = false

const queryBar = computed<TableQueryBarConfig>(() => ({
  controls: props.kind === "inspection"
    ? [
        {
          type: "search" as const,
          key: "q",
          queryKey: "q",
          label: "工单编号",
          icon: "ri-text",
          placeholder: "请输入",
          value: orderNoQuery.value,
          expandedWidth: 248,
          collapsedMaxWidth: 248,
        },
        {
          type: "select" as const,
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
        {
          type: "select" as const,
          key: "planUuid",
          queryKey: "planUuid",
          label: "检测计划",
          icon: "ri-price-tag-3-line",
          value: selectedPlanUuid.value,
          options: inspectionPlanOptions.value,
          loading: inspectionPlanOptionsLoading.value,
          placeholder: inspectionPlanOptionsLoading.value ? "正在加载计划..." : "请选择计划",
          expandedWidth: 248,
          collapsedMaxWidth: 248,
        },
        {
          type: "search" as const,
          key: "serviceName",
          queryKey: "serviceName",
          label: "服务名称",
          icon: "ri-text",
          placeholder: "请输入",
          value: serviceNameQuery.value,
          expandedWidth: 248,
          collapsedMaxWidth: 248,
        },
        {
          type: "search" as const,
          key: "executor",
          queryKey: "executor",
          label: "执行人",
          icon: "ri-text",
          placeholder: "请输入",
          value: executorQuery.value,
          expandedWidth: 248,
          collapsedMaxWidth: 248,
        },
        {
          type: "select" as const,
          key: "status",
          queryKey: "status",
          label: "工单状态",
          icon: "ri-price-tag-3-line",
          value: selectedStatus.value,
          options: statusOptions,
          placeholder: "请选择状态",
          expandedWidth: 248,
          collapsedMaxWidth: 248,
        },
        {
          type: "select" as const,
          key: "result",
          queryKey: "result",
          label: "检测结果",
          icon: "ri-price-tag-3-line",
          value: selectedResult.value,
          options: inspectionResultOptions,
          placeholder: "请选择检测结果",
          expandedWidth: 248,
          collapsedMaxWidth: 248,
        },
      ]
    : [
        {
          type: "search" as const,
          key: "q",
          queryKey: "q",
          label: "工单编号",
          icon: "ri-text",
          placeholder: "请输入",
          value: orderNoQuery.value,
          expandedWidth: 248,
          collapsedMaxWidth: 248,
        },
        {
          type: "date" as const,
          key: "createdAt",
          queryKey: "createdAt",
          label: "创建时间",
          icon: "ri-calendar-line",
          placeholder: "请选择日期",
          value: createdAtQuery.value,
          expandedWidth: 248,
          collapsedMaxWidth: 248,
        },
        {
          type: "select" as const,
          key: "important",
          queryKey: "important",
          label: "重要程度",
          icon: "ri-price-tag-3-line",
          value: selectedImportant.value,
          options: repairImportanceOptions.value,
          loading: repairDictionariesLoading.value,
          placeholder: repairDictionariesLoading.value ? "正在加载重要程度..." : "请选择重要程度",
          expandedWidth: 248,
          collapsedMaxWidth: 248,
        },
        {
          type: "select" as const,
          key: "status",
          queryKey: "status",
          label: "工单状态",
          icon: "ri-price-tag-3-line",
          value: selectedStatus.value,
          options: statusOptions,
          placeholder: "请选择状态",
          expandedWidth: 248,
          collapsedMaxWidth: 248,
        },
      ],
  values: {
    q: orderNoQuery.value,
    customerUuid: props.kind === "inspection" ? selectedCustomerUuid.value : "",
    planUuid: props.kind === "inspection" ? selectedPlanUuid.value : "",
    serviceName: props.kind === "inspection" ? serviceNameQuery.value : "",
    executor: props.kind === "inspection" ? executorQuery.value : "",
    createdAt: props.kind === "repair" ? createdAtQuery.value : "",
    important: props.kind === "repair" ? selectedImportant.value : "",
    status: selectedStatus.value,
    result: props.kind === "inspection" ? selectedResult.value : "",
  },
  canClear: props.kind === "inspection"
    ? Boolean(orderNoQuery.value || selectedCustomerUuid.value || selectedPlanUuid.value || serviceNameQuery.value || executorQuery.value || selectedStatus.value || selectedResult.value)
    : Boolean(orderNoQuery.value || createdAtQuery.value || selectedImportant.value || selectedStatus.value),
}))

watch([pageNum, pageSize], ([nextPageNum, nextPageSize], [previousPageNum, previousPageSize]) => {
  if (nextPageNum === previousPageNum && nextPageSize === previousPageSize) {
    return
  }

  void loadWorkOrders()
})

watch(
  () => props.kind === "inspection"
    ? [
        normalizeQueryValue(route.query.q),
        normalizeQueryValue(route.query.customerUuid),
        normalizeQueryValue(route.query.planUuid),
        normalizeQueryValue(route.query.serviceName),
        normalizeQueryValue(route.query.executor),
        normalizeQueryValue(route.query.status),
        normalizeQueryValue(route.query.result),
      ] as const
    : [
        normalizeQueryValue(route.query.q),
        normalizeQueryValue(route.query.createdAt),
        normalizeQueryValue(route.query.important),
        normalizeQueryValue(route.query.status),
      ] as const,
  (nextValue, previousValue) => {
    if (
      previousValue
      && nextValue.length === previousValue.length
      && nextValue.every((value, index) => value === previousValue[index])
    ) {
      return
    }

    orderNoQuery.value = nextValue[0] ?? ""

    if (props.kind === "inspection") {
      selectedCustomerUuid.value = nextValue[1] ?? ""
      selectedPlanUuid.value = nextValue[2] ?? ""
      serviceNameQuery.value = nextValue[3] ?? ""
      executorQuery.value = nextValue[4] ?? ""
      selectedStatus.value = nextValue[5] ?? ""
      selectedResult.value = nextValue[6] ?? ""
    } else {
      createdAtQuery.value = nextValue[1] ?? ""
      selectedImportant.value = nextValue[2] ?? ""
      selectedStatus.value = nextValue[3] ?? ""
    }

    if (pageNum.value !== 1) {
      pageNum.value = 1
      return
    }

    void loadWorkOrders()
  },
  { immediate: true },
)

if (props.kind === "inspection") {
  void loadCustomerOptions()
  void loadInspectionPlanOptions()
}

function extractDatePart(value: string) {
  const [datePart] = value.split(" ")
  return datePart ?? ""
}

function formatDateOnly(value: string) {
  const normalized = toText(value, "").trim()
  if (!normalized || normalized === "-" || normalized === "—") {
    return "-"
  }

  const [datePart] = normalized.split(/[ T]/)
  return datePart || normalized
}

function buildPageFilterText(row: WorkOrderRecord) {
  if (props.kind === "repair") {
    return [
      row.orderNo,
      row.customerName,
      row.parkName,
      row.executor,
      row.importantLabel,
      row.reportTypeLabel,
      row.statusLabel,
      row.remark,
      row.createdAt,
    ].join(" ")
  }

  return [
    row.orderNo,
    row.customerName,
    row.parkName,
    row.packageName,
    row.planName,
    row.executor,
    row.statusLabel,
    row.resultLabel,
    row.scoreLabel,
    row.createdAt,
    row.updatedAt,
    row.deadline,
    row.remark,
    row.createdStartAt,
    row.createdEndAt,
  ].join(" ")
}

function handleViewDetail(row: WorkOrderRecord) {
  if (!row.uuid) {
    toast.error("当前工单缺少 Uuid，无法查看详情")
    return
  }

  void router.push({
    name: props.kind === "repair" ? "repair-work-order-detail" : "inspection-work-order-detail",
    params: { id: row.uuid },
    query: {
      customerUuid: row.customerUuid,
      returnTo: props.kind === "repair" ? "repair-work-orders" : "inspection-work-orders",
    },
  })
}

async function handleAssign(row: WorkOrderRecord) {
  if (!row.uuid) {
    toast.error("当前工单缺少 Uuid，无法指派")
    return
  }

  assignTargetWorkOrder.value = row

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

function handleOpenPreviewSheet(row: WorkOrderRecord) {
  if (!row.uuid) {
    toast.error("当前工单缺少 Uuid，无法打开侧边预览")
    return
  }

  activeWorkOrderPreviewUuid.value = row.uuid
  activeWorkOrderPreviewCustomerUuid.value = row.customerUuid || ""
  workOrderPreviewSheetOpen.value = true
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
        const uuid = toText(record.Uuid ?? record.uuid)
        const name = toText(record.Name ?? record.name, uuid)

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
  assignUserUuids.value = []
}

async function submitAssign() {
  const currentTarget = assignTargetWorkOrder.value

  if (!currentTarget?.uuid) {
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
        Uuid: currentTarget.uuid,
        UserUuids: assignUserUuids.value,
      })
    } else {
      await dispatchRepairWorkOrder({
        Uuids: [currentTarget.uuid],
        UserUuids: assignUserUuids.value,
      })
    }

    toast.success("指派成功")
    assignDialogOpen.value = false
    resetAssignState()
    await loadWorkOrders()
  } catch (error) {
    toast.error(handleApiError(error, {
      mode: "silent",
      fallback: "指派失败，请稍后重试。",
    }))
  } finally {
    assignSubmitting.value = false
  }
}

async function loadWorkOrders() {
  const requestId = ++latestRequestId

  loading.value = true
  errorMessage.value = ""

  try {
    if (props.kind === "repair") {
      await ensureRepairDictionaries()
    }

    const result = props.kind === "inspection"
      ? await fetchWorkOrders({
          OrderNo: orderNoQuery.value || undefined,
          CustomerUuid: selectedCustomerUuid.value || undefined,
          PlanUuid: selectedPlanUuid.value || undefined,
          ServiceName: serviceNameQuery.value || undefined,
          Executor: executorQuery.value || undefined,
          Status: toApiStatus(selectedStatus.value),
          Result: toApiStatus(selectedResult.value),
          PageNum: pageNum.value,
          PageSize: pageSize.value,
        })
      : await fetchRepairWorkOrders({
          OrderNo: orderNoQuery.value || undefined,
          CreatedStartAt: createdAtQuery.value || undefined,
          CreatedEndAt: createdAtQuery.value || undefined,
          Important: selectedImportant.value || undefined,
          Status: toApiStatus(selectedStatus.value),
          PageNum: pageNum.value,
          PageSize: pageSize.value,
        })

    if (requestId !== latestRequestId) {
      return
    }

    total.value = result.total
    workOrders.value = result.list.map((item, index) => normalizeWorkOrderRecord(item, index))

    const maxPage = Math.max(1, Math.ceil((result.total || 0) / pageSize.value))

    if (pageNum.value > maxPage) {
      pageNum.value = maxPage
      return
    }
  } catch (error) {
    if (requestId !== latestRequestId) {
      return
    }

    workOrders.value = []
    total.value = 0
    errorMessage.value = handleApiError(error, {
      mode: "silent",
      fallback: "工单列表加载失败，请稍后重试。",
    })
  } finally {
    if (requestId === latestRequestId) {
      loading.value = false
    }
  }
}

function normalizeWorkOrderRecord(item: WorkOrderListItem | RepairWorkOrderListItem, index: number): WorkOrderRecord {
  if (props.kind === "repair") {
    return normalizeRepairWorkOrderRecord(item as RepairWorkOrderListItem, index)
  }

  return normalizeInspectionWorkOrderRecord(item as WorkOrderListItem, index)
}

function normalizeInspectionWorkOrderRecord(item: WorkOrderListItem, index: number): WorkOrderRecord {
  const uuid = toText(item.Uuid)
  const fallbackId = toText(item.Id, `${pageNum.value}-${index + 1}`)
  const statusValue = toNumber(item.Status)
  const score = toNumber(item.Score)
  const resultValue = toNumber(item.Result)
  const orderNo = toText(item.OrderNo, `WO-${fallbackId}`)
  const packageName = toText(item.ServiceName || item.PackageName, "-")
  const remark = toText(item.Remark, "-")

  return {
    id: uuid || fallbackId,
    uuid: uuid || fallbackId,
    customerUuid: toText(item.CustomerUuid),
    planUuid: toText(item.PlanUuid),
    orderNo,
    customerName: toText(item.CorpName || item.CustomerName, "-"),
    parkName: toText(item.ParkName, "-"),
    packageName,
    planName: toText(item.PlanName, "-"),
    executor: formatInspectionExecutors(item.Executors, item.Executor),
    status: statusValue === null ? "" : String(statusValue),
    statusValue,
    statusLabel: formatStatusLabel(props.kind, statusValue),
    importantValue: null,
    importantLabel: "-",
    reportTypeValue: null,
    reportTypeLabel: "-",
    resultValue,
    resultLabel: formatResultLabel(resultValue, props.kind),
    score,
    scoreLabel: formatScoreLabel(score, props.kind),
    deadline: formatDateOnly(toText(item.Deadline, "-")),
    remark,
    createdAt: toText(item.CreatedAt, "-"),
    updatedAt: toText(item.UpdatedAt, "-"),
    createdStartAt: "-",
    createdEndAt: "-",
  }
}

function formatInspectionExecutors(value: unknown, fallback?: unknown) {
  if (Array.isArray(value)) {
    const normalized = value
      .map(item => toText(item))
      .filter(Boolean)

    if (normalized.length) {
      return normalized.join("、")
    }
  }

  return toText(fallback, "-")
}

function normalizeRepairWorkOrderRecord(item: RepairWorkOrderListItem, index: number): WorkOrderRecord {
  const uuid = toText(item.Uuid)
  const fallbackId = toText(item.Id, `${pageNum.value}-${index + 1}`)
  const statusValue = toNumber(item.Status)
  const importantValue = toDictionaryValue(item.Important)
  const reportTypeValue = toDictionaryValue(item.ReportType)
  const importantLabel = formatImportantLabel(importantValue)
  const reportTypeLabel = formatReportTypeLabel(reportTypeValue)
  const createdAt = toText(item.CreatedAt, "-")

  return {
    id: uuid || fallbackId,
    uuid: uuid || fallbackId,
    customerUuid: toText(item.CustomerUuid),
    planUuid: "",
    orderNo: toText(item.OrderNo, `RP-${fallbackId}`),
    customerName: toText(item.CorpName || item.CustomerName, "-"),
    parkName: toText(item.ParkName, "-"),
    packageName: "-",
    planName: "-",
    executor: toText(item.UserName, "-"),
    status: statusValue === null ? "" : String(statusValue),
    statusValue,
    statusLabel: formatStatusLabel(props.kind, statusValue),
    importantValue,
    importantLabel,
    reportTypeValue,
    reportTypeLabel,
    resultValue: reportTypeValue,
    resultLabel: reportTypeLabel,
    score: importantValue,
    scoreLabel: importantLabel,
    deadline: "-",
    remark: toText(item.RepairContent || item.Content, "-"),
    createdAt,
    updatedAt: "-",
    createdStartAt: createdAt,
    createdEndAt: "-",
  }
}

function formatStatusLabel(kind: WorkOrderPageKind, value: number | null) {
  if (value === null) {
    return "未知状态"
  }

  return kind === "repair"
    ? getRepairWorkOrderStatusLabel(value)
    : getWorkOrderStatusLabel(value)
}

function formatResultLabel(value: number | string | null, kind: WorkOrderPageKind) {
  if (value === null) {
    return kind === "inspection" ? "未反馈" : "-"
  }

  if (kind === "repair") {
    return formatRepairDictionaryLabel(value, repairTypeOptions.value, "类型")
  }

  const numericValue = typeof value === "number" ? value : Number(value)

  if (numericValue === 0) return "未反馈"
  if (numericValue === 1) return "正常"
  if (numericValue === 2) return "轻微风险"
  if (numericValue === 3) return "存在隐患"

  return `结果 ${numericValue}`
}

function formatScoreLabel(value: number | string | null, kind: WorkOrderPageKind) {
  if (value === null) {
    return "-"
  }

  if (kind === "repair") {
    return formatRepairDictionaryLabel(value, repairImportanceOptions.value, "等级")
  }

  return String(value)
}

function formatImportantLabel(value: string | null) {
  return formatRepairDictionaryLabel(value, repairImportanceOptions.value, "等级")
}

function formatReportTypeLabel(value: string | null) {
  return formatRepairDictionaryLabel(value, repairTypeOptions.value, "类型")
}

function createInspectionColumns(): TablePageSchema<WorkOrderRecord>["columns"] {
  return [
    {
      key: "orderNo",
      label: props.kind === "inspection" ? "检测工单" : "报修工单",
      filterType: "text",
      slot: "cell-orderNo",
      emphasis: "default",
      tone: "muted",
      filter: {
        type: "text",
        placeholder: "输入工单编号",
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
      key: "parkName",
      label: "园区",
      filterType: "text",
      filter: {
        type: "text",
        placeholder: "输入园区名称",
      },
      sort: true,
    },
    {
      key: "packageName",
      label: "检测服务名称",
      filterType: "text",
      filter: {
        type: "text",
        placeholder: "输入检测服务名称",
      },
      sort: true,
    },
    {
      key: "planName",
      label: "检测计划名称",
      filterType: "text",
      filter: {
        type: "text",
        placeholder: "输入检测计划名称",
      },
      sort: true,
    },
    {
      key: "executor",
      label: "执行人",
      filterType: "text",
      filter: {
        type: "text",
        placeholder: "输入执行人",
      },
      sort: true,
    },
    {
      key: "statusLabel",
      label: "状态",
      filterType: "tag",
      cellRenderer: {
        kind: "status",
        map: workOrderStatusMap,
        fallback: { tone: "gray", icon: "dot" },
      },
      filter: {
        type: "tag",
        defaultVisible: true,
      },
      sort: {
        label: "状态",
        kind: "metric",
        value: row => row.statusValue ?? -1,
      },
    },
    {
      key: "deadline",
      label: "截止时间",
      filterType: "time",
      tone: "muted",
      format: "numeric",
      filter: {
        type: "date",
        value: row => extractDatePart(row.deadline),
      },
      sort: true,
    },
    {
      key: "remark",
      label: "备注",
      filterType: "text",
      format: "note",
      filter: {
        type: "text",
        placeholder: "输入备注",
      },
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
    {
      key: "updatedAt",
      label: "更新时间",
      filterType: "time",
      tone: "muted",
      format: "numeric",
      filter: {
        type: "date",
        value: row => extractDatePart(row.updatedAt),
      },
      sort: true,
    },
  ]
}

function createRepairColumns(): TablePageSchema<WorkOrderRecord>["columns"] {
  return [
    {
      key: "orderNo",
      label: "报修工单",
      filterType: "text",
      slot: "cell-orderNo",
      emphasis: "default",
      tone: "muted",
      filter: {
        type: "text",
        placeholder: "输入工单编号",
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "reportTypeLabel",
      label: "报修类型",
      filterType: "tag",
      filter: {
        type: "tag",
        defaultVisible: true,
      },
      sort: {
        label: "报修类型",
        kind: "metric",
        value: row => row.reportTypeValue ?? -1,
      },
    },
    {
      key: "importantLabel",
      label: "重要程度",
      filterType: "tag",
      filter: {
        type: "tag",
        defaultVisible: true,
      },
      sort: {
        label: "重要程度",
        kind: "metric",
        value: row => row.importantValue ?? -1,
      },
    },
    {
      key: "statusLabel",
      label: "状态",
      filterType: "tag",
      cellRenderer: {
        kind: "status",
        map: workOrderStatusMap,
        fallback: { tone: "gray", icon: "dot" },
      },
      filter: {
        type: "tag",
        defaultVisible: true,
      },
      sort: {
        label: "状态",
        kind: "metric",
        value: row => row.statusValue ?? -1,
      },
    },
    {
      key: "executor",
      label: "执行人",
      filterType: "text",
      filter: {
        type: "text",
        placeholder: "输入执行人",
      },
      sort: true,
    },
    {
      key: "remark",
      label: "内容说明",
      filterType: "text",
      format: "note",
      filter: {
        type: "text",
        placeholder: "输入内容说明",
      },
    },
    {
      key: "customerName",
      label: "客户名称",
      filterType: "text",
      slot: "cell-customerName",
      filter: {
        type: "text",
        placeholder: "输入客户名称",
      },
      sort: true,
    },
    {
      key: "parkName",
      label: "园区名称",
      filterType: "text",
      filter: {
        type: "text",
        placeholder: "输入园区名称",
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
        defaultVisible: true,
        value: row => extractDatePart(row.createdAt),
      },
      sort: true,
    },
  ]
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

function toNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function toDictionaryValue(value: unknown) {
  if (typeof value === "string" && value.trim()) {
    return value.trim()
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }

  return null
}

function compareWorkOrderRows(
  left: WorkOrderRecord,
  right: WorkOrderRecord,
  direction: "asc" | "desc",
  kind: WorkOrderPageKind,
) {
  void kind
  const leftValue = parseTimestamp(left.createdAt)
  const rightValue = parseTimestamp(right.createdAt)

  if (leftValue !== rightValue) {
    return direction === "asc" ? leftValue - rightValue : rightValue - leftValue
  }

  return left.orderNo.localeCompare(right.orderNo, "zh-CN")
}

function parseTimestamp(value: string) {
  const normalized = value.trim()

  if (!normalized || normalized === "-" || normalized === "—") {
    return 0
  }

  const timestamp = new Date(normalized.replace(" ", "T")).getTime()
  return Number.isFinite(timestamp) ? timestamp : 0
}

function toApiStatus(value: string) {
  if (!value) {
    return undefined
  }

  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized : undefined
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
    orderNoQuery.value = typeof payload.value === "string" ? payload.value.trim() : ""
  }

  if (payload.key === "customerUuid") {
    selectedCustomerUuid.value = typeof payload.value === "string" ? payload.value.trim() : ""
  }

  if (payload.key === "planUuid") {
    selectedPlanUuid.value = typeof payload.value === "string" ? payload.value.trim() : ""
  }

  if (payload.key === "serviceName") {
    serviceNameQuery.value = typeof payload.value === "string" ? payload.value.trim() : ""
  }

  if (payload.key === "executor") {
    executorQuery.value = typeof payload.value === "string" ? payload.value.trim() : ""
  }

  if (payload.key === "status") {
    selectedStatus.value = typeof payload.value === "string" ? payload.value.trim() : ""
  }

  if (payload.key === "createdAt") {
    createdAtQuery.value = typeof payload.value === "string" ? payload.value.trim() : ""
  }

  if (payload.key === "important") {
    selectedImportant.value = typeof payload.value === "string" ? payload.value.trim() : ""
  }

  if (payload.key === "result") {
    selectedResult.value = typeof payload.value === "string" ? payload.value.trim() : ""
  }

  void syncRouteQueryAndReload()
}

function handleQueryClear() {
  const hasFilters = props.kind === "inspection"
    ? Boolean(
        orderNoQuery.value
        || selectedCustomerUuid.value
        || selectedPlanUuid.value
        || serviceNameQuery.value
        || executorQuery.value
        || selectedStatus.value
        || selectedResult.value,
      )
    : Boolean(orderNoQuery.value || createdAtQuery.value || selectedImportant.value || selectedStatus.value)

  if (!hasFilters) {
    return
  }

  orderNoQuery.value = ""
  selectedCustomerUuid.value = ""
  selectedPlanUuid.value = ""
  createdAtQuery.value = ""
  serviceNameQuery.value = ""
  executorQuery.value = ""
  selectedStatus.value = ""
  selectedImportant.value = ""
  selectedResult.value = ""
  void syncRouteQueryAndReload()
}

async function syncRouteQueryAndReload() {
  await router.replace({
    query: {
      ...route.query,
      q: orderNoQuery.value || undefined,
      createdAt: props.kind === "repair" ? createdAtQuery.value || undefined : undefined,
      title: undefined,
      important: props.kind === "repair" ? selectedImportant.value || undefined : undefined,
      customerUuid: props.kind === "inspection" ? selectedCustomerUuid.value || undefined : undefined,
      planUuid: props.kind === "inspection" ? selectedPlanUuid.value || undefined : undefined,
      serviceName: props.kind === "inspection" ? serviceNameQuery.value || undefined : undefined,
      executor: props.kind === "inspection" ? executorQuery.value || undefined : undefined,
      status: selectedStatus.value || undefined,
      result: props.kind === "inspection" ? selectedResult.value || undefined : undefined,
    },
  })

  if (pageNum.value !== 1) {
    pageNum.value = 1
    return
  }

  await loadWorkOrders()
}

function handlePrimaryAction() {
  if (props.kind === "inspection") {
    router.push({
      name: "inspection-work-order-create",
      query: {
        returnTo: "inspection-work-orders",
      },
    })
    return
  }

  router.push({
    name: "repair-work-order-create",
    query: {
      returnTo: "repair-work-orders",
    },
  })
}

function jumpToCustomerDetail(row: Record<string, unknown>) {
  const nextCustomerUuid = typeof row.customerUuid === "string" ? row.customerUuid : ""

  if (!nextCustomerUuid) {
    toast.error("当前工单缺少客户 Uuid，无法跳转客户详情")
    return
  }

  activeLinkedDetailKind.value = "customer"
  activeLinkedDetailUuid.value = nextCustomerUuid
}

function handleLinkedDetailSheetOpenChange(open: boolean) {
  if (!open) {
    activeLinkedDetailKind.value = null
    activeLinkedDetailUuid.value = ""
  }
}

function handleWorkOrderPreviewSheetOpenChange(open: boolean) {
  workOrderPreviewSheetOpen.value = open

  if (!open) {
    activeWorkOrderPreviewUuid.value = ""
    activeWorkOrderPreviewCustomerUuid.value = ""
  }
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
        label: toText(item.CorpName || item.CustomerName, "未命名客户"),
      }))
      .filter(option => option.value)
  } catch {
    customerOptions.value = []
  } finally {
    customerOptionsLoading.value = false
  }
}

async function loadInspectionPlanOptions() {
  inspectionPlanOptionsLoading.value = true

  try {
    const result = await fetchInspectionPlans({
      PageNum: 1,
      PageSize: 200,
    })

    inspectionPlanOptions.value = result.list
      .map(item => ({
        value: toText(item.Uuid),
        label: toText(item.Name || item.Code, "未命名计划"),
      }))
      .filter(option => option.value)
  } catch {
    inspectionPlanOptions.value = []
  } finally {
    inspectionPlanOptionsLoading.value = false
  }
}

async function ensureRepairDictionaries() {
  if (repairImportanceOptions.value.length || repairTypeOptions.value.length) {
    return
  }

  repairDictionariesLoading.value = true

  try {
    const dictionaries = await fetchRepairWorkOrderDictionaries()
    repairImportanceOptions.value = dictionaries.importanceOptions
    repairTypeOptions.value = dictionaries.typeOptions
  } catch {
    repairImportanceOptions.value = []
    repairTypeOptions.value = []
  } finally {
    repairDictionariesLoading.value = false
  }
}
</script>

<template>
  <section class="flex min-h-0 flex-1 flex-col">
    <div v-if="errorMessage" class="px-4 pb-3 pt-3">
      <Alert variant="destructive">
        <i class="ri-error-warning-line" />
        <AlertTitle>{{ pageTitle }}接口加载失败</AlertTitle>
        <AlertDescription class="flex flex-wrap items-center gap-3">
          <span>{{ errorMessage }}</span>
          <Button size="sm" variant="outline" class="gap-2" @click="loadWorkOrders">
            <i class="ri-refresh-line text-sm" />
            重试
          </Button>
        </AlertDescription>
      </Alert>
    </div>

    <TablePage
      :page="page"
      :loading="loading"
      :query-bar="queryBar"
      toolbar-sort-behavior="toggle"
      :toolbar-sort-direction="sortDirection"
      fill-available-height
      @refresh-action="loadWorkOrders"
      @primary-action="handlePrimaryAction"
      @toolbar-sort-toggle="handleToolbarSortToggle"
      @query-change="handleQueryChange"
      @query-clear="handleQueryClear"
    >
      <template #cell-orderNo="{ row }">
        <div class="inline-flex max-w-full items-baseline gap-1.5">
          <span class="truncate text-foreground">
            {{ props.kind === "inspection" ? toText(row.packageName, "-") : toText(row.customerName, "-") }}
          </span>
          <span class="shrink-0 text-muted-foreground">
            #{{ toText(row.orderNo, "-") }}
          </span>
        </div>
      </template>

      <template #cell-customerName="{ row }">
        <button
          type="button"
          class="inline-flex max-w-full items-center gap-1 text-left text-link transition-colors hover:text-link-hover"
          @click.stop="jumpToCustomerDetail(row)"
        >
          <span class="truncate">{{ row.customerName }}</span>
          <i class="ri-arrow-right-up-line shrink-0 text-sm" />
        </button>
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
      :open="Boolean(activeLinkedDetailKind) && Boolean(activeLinkedDetailUuid)"
      :kind="activeLinkedDetailKind"
      :uuid="activeLinkedDetailUuid"
      @update:open="handleLinkedDetailSheetOpenChange"
    />

    <WorkOrderPreviewSheet
      :open="workOrderPreviewSheetOpen && Boolean(activeWorkOrderPreviewUuid)"
      :kind="props.kind"
      :uuid="activeWorkOrderPreviewUuid"
      :customer-uuid="activeWorkOrderPreviewCustomerUuid"
      @update:open="handleWorkOrderPreviewSheetOpenChange"
    />
  </section>
</template>
