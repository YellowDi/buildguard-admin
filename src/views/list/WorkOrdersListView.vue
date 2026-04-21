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
import type { TablePageSchema } from "@/components/table-page/types"
import { useRouteTableSearch } from "@/composables/useRouteTableSearch"
import { handleApiError } from "@/lib/api-errors"
import { fetchMembers } from "@/lib/members-api"
import { getWorkOrderStatusLabel } from "@/lib/work-order-status"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
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

type WorkOrderRecord = {
  id: string
  uuid: string
  customerUuid: string
  planUuid: string
  orderNo: string
  title: string
  customerName: string
  parkName: string
  packageName: string
  planName: string
  executor: string
  status: string
  statusValue: number | null
  statusLabel: string
  importantValue: number | null
  importantLabel: string
  reportTypeValue: number | null
  reportTypeLabel: string
  resultValue: number | null
  resultLabel: string
  score: number | null
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
const route = useRoute()
let latestRequestId = 0
const assignDialogOpen = ref(false)
const assignUserUuid = ref("")
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

  if (!isInspectionAssignDialog.value) {
    return Boolean(assignUserUuid.value)
  }

  return assignUserUuids.value.length > 0
})
const pageSortStorageKey = computed(() => props.kind === "inspection"
  ? "inspection-work-orders-sort-preferences-created-at-v2"
  : "repair-work-orders-sort-preferences-created-start-at-v3")
const primaryActionLabel = "添加工单"
const router = useRouter()
const columns = props.kind === "inspection" ? createInspectionColumns() : createRepairColumns()

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
    storageKey: pageSortStorageKey.value,
    initialField: props.kind === "inspection" ? "createdAt" : "createdStartAt",
    initialDirection: "desc",
  },
  tabs: {
    mode: "enum",
    all: { label: "全部", value: "all" },
    field: "statusLabel",
  },
}

const page = useTablePage({
  ...createTablePageDefinition(schema),
  rows: workOrders,
})

useRouteTableSearch(page, route)

watch([pageNum, pageSize], ([nextPageNum, nextPageSize], [previousPageNum, previousPageSize]) => {
  if (nextPageNum === previousPageNum && nextPageSize === previousPageSize) {
    return
  }

  void loadWorkOrders()
}, { immediate: true })

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
      row.title,
      row.customerName,
      row.parkName,
      row.executor,
      row.importantLabel,
      row.reportTypeLabel,
      row.statusLabel,
      row.remark,
      row.createdStartAt,
      row.createdEndAt,
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
  assignUserUuid.value = ""
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
    if (props.kind === "inspection") {
      if (!assignUserUuids.value.length) {
        toast.error("请先选择至少一位指派人员")
        return
      }

      await dispatchWorkOrder({
        Uuid: currentTarget.uuid,
        UserUuids: assignUserUuids.value,
      })
    } else {
      if (!assignUserUuid.value) {
        toast.error("请先选择指派用户")
        return
      }

      await dispatchWorkOrder({
        Uuid: currentTarget.uuid,
        UserUuid: assignUserUuid.value,
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
    const result = props.kind === "inspection"
      ? await fetchWorkOrders({
          PageNum: pageNum.value,
          PageSize: pageSize.value,
        })
      : await fetchRepairWorkOrders({
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
  const packageName = toText(item.PackageName, "-")
  const remark = toText(item.Remark, "-")

  return {
    id: uuid || fallbackId,
    uuid: uuid || fallbackId,
    customerUuid: toText(item.CustomerUuid),
    planUuid: toText(item.PlanUuid),
    orderNo,
    title: "-",
    // 接口字段从 CustomerName 调整为 CorpName
    customerName: toText(item.CorpName || item.CustomerName, "-"),
    parkName: "-",
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
  const importantValue = toNumber(item.Important)
  const reportTypeValue = toNumber(item.ReportType)
  const createdStartAt = toText(item.CreatedStartAt, "-")
  const createdEndAt = toText(item.CreatedEndAt, "-")

  return {
    id: uuid || fallbackId,
    uuid: uuid || fallbackId,
    customerUuid: toText(item.CustomerUuid),
    planUuid: "",
    orderNo: toText(item.OrderNo, `RP-${fallbackId}`),
    title: toText(item.Title, "-"),
    customerName: toText(item.CorpName || item.CustomerName, "-"),
    parkName: toText(item.ParkName, "-"),
    packageName: "-",
    planName: "-",
    executor: toText(item.UserName, "-"),
    status: statusValue === null ? "" : String(statusValue),
    statusValue,
    statusLabel: formatStatusLabel(props.kind, statusValue),
    importantValue,
    importantLabel: formatImportantLabel(importantValue),
    reportTypeValue,
    reportTypeLabel: formatReportTypeLabel(reportTypeValue),
    resultValue: reportTypeValue,
    resultLabel: formatResultLabel(reportTypeValue, props.kind),
    score: importantValue,
    scoreLabel: formatScoreLabel(importantValue, props.kind),
    deadline: "-",
    remark: toText(item.RepairContent || item.Content, "-"),
    createdAt: "-",
    updatedAt: "-",
    createdStartAt,
    createdEndAt,
  }
}

function formatStatusLabel(kind: WorkOrderPageKind, value: number | null) {
  if (value === null) {
    return "未知状态"
  }
  void kind
  return getWorkOrderStatusLabel(value)
}

function formatResultLabel(value: number | null, kind: WorkOrderPageKind) {
  if (value === null) {
    return kind === "inspection" ? "未反馈" : "-"
  }

  if (kind === "repair") {
    if (value === 0) return "类型 0"
    return `类型 ${value}`
  }

  if (value === 0) return "未反馈"
  if (value === 1) return "正常"
  if (value === 2) return "异常"
  if (value === 3) return "已驳回"

  return `结果 ${value}`
}

function formatScoreLabel(value: number | null, kind: WorkOrderPageKind) {
  if (value === null) {
    return "-"
  }

  if (kind === "repair") {
    if (value === 0) return "普通"
    if (value === 1) return "紧急"
    return `等级 ${value}`
  }

  return String(value)
}

function formatImportantLabel(value: number | null) {
  if (value === null) {
    return "-"
  }

  return `等级 ${value}`
}

function formatReportTypeLabel(value: number | null) {
  if (value === null) {
    return "-"
  }

  return `类型 ${value}`
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
      key: "resultLabel",
      label: "检测结果",
      filterType: "tag",
      filter: {
        type: "tag",
        defaultVisible: true,
      },
      sort: {
        label: "结果",
        kind: "metric",
        value: row => row.resultValue ?? -1,
      },
    },
    {
      key: "scoreLabel",
      label: "评分",
      filterType: "number",
      format: "numeric",
      filter: {
        type: "number",
        defaultVisible: true,
        value: row => row.score ?? -1,
      },
      sort: {
        label: "评分",
        kind: "metric",
        value: row => row.score ?? -1,
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
      key: "title",
      label: "报修标题",
      filterType: "text",
      filter: {
        type: "text",
        placeholder: "输入报修标题",
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
      key: "createdStartAt",
      label: "创建开始时间",
      filterType: "time",
      tone: "muted",
      format: "numeric",
      filter: {
        type: "date",
        defaultVisible: true,
        value: row => extractDatePart(row.createdStartAt),
      },
      sort: true,
    },
    {
      key: "createdEndAt",
      label: "创建结束时间",
      filterType: "time",
      tone: "muted",
      format: "numeric",
      filter: {
        type: "date",
        value: row => extractDatePart(row.createdEndAt),
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
      fill-available-height
      @refresh-action="loadWorkOrders"
      @primary-action="handlePrimaryAction"
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
