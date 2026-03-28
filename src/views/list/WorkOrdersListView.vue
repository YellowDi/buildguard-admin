<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { toast } from "vue-sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import TablePageLoading from "@/components/loading/TablePageLoading.vue"
import TablePage from "@/components/table-page/TablePage.vue"
import { workOrderStatusMap } from "@/components/table-page/statusPresets"
import { createTablePageDefinition, useTablePage } from "@/components/table-page/useTablePage"
import type { TablePageSchema } from "@/components/table-page/types"
import { useRouteTableSearch } from "@/composables/useRouteTableSearch"
import { handleApiError } from "@/lib/api-errors"
import {
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
  executionPlan: string
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
  recheckStatus: string
  recheckTime: string
  remark: string
  createdAt: string
  updatedAt: string
}

const props = defineProps<{
  kind: WorkOrderPageKind
}>()

const workOrders = ref<WorkOrderRecord[]>([])
const loading = ref(false)
const errorMessage = ref("")
const pageNum = ref(1)
const pageSize = ref(10)
const total = ref(0)
const route = useRoute()
const showInitialLoading = computed(() => loading.value && !workOrders.value.length && !errorMessage.value)
let latestRequestId = 0
const pageTitle = computed(() => props.kind === "inspection" ? "检修工单" : "维修工单")
const pageEmptyStateTitle = computed(() => `暂无${pageTitle.value}数据`)
const pageEmptyStateDescription = computed(() => props.kind === "inspection"
  ? "当前接口暂未返回可展示的检修工单。"
  : "当前接口暂未返回可展示的维修工单。")
const pageSortStorageKey = computed(() => props.kind === "inspection"
  ? "inspection-work-orders-sort-preferences"
  : "repair-work-orders-sort-preferences")
const primaryActionLabel = props.kind === "inspection" ? "添加工单" : ""
const router = useRouter()
const columns = props.kind === "inspection" ? createInspectionColumns() : createRepairColumns()

const schema: TablePageSchema<WorkOrderRecord> = {
  title: pageTitle.value,
  description: props.kind === "inspection" ? "所有客户检修工单列表" : "所有客户维修工单列表",
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
    : [],
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
    initialField: "updatedAt",
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
      row.createdAt,
    ].join(" ")
  }

  return [
    row.orderNo,
    row.customerName,
    row.packageName,
    row.executionPlan,
    row.executor,
    row.statusLabel,
    row.resultLabel,
    row.scoreLabel,
    row.recheckStatus,
    row.recheckTime,
  ].join(" ")
}

function handleViewDetail(row: WorkOrderRecord) {
  if (!row.uuid) {
    toast.error("当前工单缺少 Uuid，无法查看详情")
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

function handleAssign(row: WorkOrderRecord) {
  toast.info(`工单「${row.orderNo || row.uuid}」指派功能暂未接入`)
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
    customerName: toText(item.CustomerName, "-"),
    parkName: "-",
    packageName,
    executionPlan: "-",
    executor: toText(item.Executor, "-"),
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
    recheckStatus: "-",
    recheckTime: "-",
    remark,
    createdAt: toText(item.CreatedAt, "-"),
    updatedAt: toText(item.UpdatedAt, "-"),
  }
}

function normalizeRepairWorkOrderRecord(item: RepairWorkOrderListItem, index: number): WorkOrderRecord {
  const uuid = toText(item.Uuid)
  const fallbackId = toText(item.Id, `${pageNum.value}-${index + 1}`)
  const statusValue = toNumber(item.Status)
  const importantValue = toNumber(item.Important)
  const reportTypeValue = toNumber(item.ReportType)
  const createdAt = toText(item.CreatedAt, "-")

  return {
    id: uuid || fallbackId,
    uuid: uuid || fallbackId,
    customerUuid: toText(item.CustomerUuid),
    planUuid: "",
    orderNo: toText(item.OrderNo, `RP-${fallbackId}`),
    title: toText(item.Title, "-"),
    customerName: toText(item.CustomerName || item.CorpName, "-"),
    parkName: toText(item.ParkName, "-"),
    packageName: "-",
    executionPlan: "-",
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
    recheckStatus: "-",
    recheckTime: "-",
    remark: toText(item.RepairContent || item.Content, "-"),
    createdAt,
    updatedAt: createdAt,
  }
}

function formatStatusLabel(kind: WorkOrderPageKind, value: number | null) {
  if (value === null) {
    return "未知状态"
  }

  if (kind === "inspection") {
    if (value === 1) return "待指派"
    if (value === 2) return "待开始"
    if (value === 3) return "进行中"
    if (value === 4) return "报告生成中"
    if (value === 5) return "已结单"
  }

  if (value === 0) return "待处理"
  if (value === 1) return "处理中"
  if (value === 2) return "已完成"
  if (value === 3) return "已关闭"

  return `状态 ${value}`
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
      label: "工单编号",
      filterType: "text",
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
      filter: {
        type: "text",
        placeholder: "输入客户名称",
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "packageName",
      label: "检测服务",
      filterType: "text",
      filter: {
        type: "text",
        placeholder: "输入检测服务",
      },
      sort: true,
    },
    {
      key: "executionPlan",
      label: "执行计划",
      filterType: "text",
      filter: {
        type: "text",
        placeholder: "输入执行计划",
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
      key: "recheckStatus",
      label: "复检状态",
      filterType: "text",
      filter: {
        type: "text",
        placeholder: "输入复检状态",
      },
      sort: true,
    },
    {
      key: "recheckTime",
      label: "复检时间",
      filterType: "time",
      format: "numeric",
      filter: {
        type: "date",
        value: row => extractDatePart(row.recheckTime),
      },
      sort: true,
    },
  ]
}

function createRepairColumns(): TablePageSchema<WorkOrderRecord>["columns"] {
  return [
    {
      key: "orderNo",
      label: "工单编号",
      filterType: "text",
      emphasis: "strong",
      tone: "primary",
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
      label: "维修人员",
      filterType: "text",
      filter: {
        type: "text",
        placeholder: "输入维修人员",
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
      key: "createdAt",
      label: "创建时间",
      filterType: "time",
      format: "numeric",
      filter: {
        type: "date",
        defaultVisible: true,
        value: row => extractDatePart(row.createdAt),
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
  if (props.kind !== "inspection") {
    return
  }

  router.push({
    name: "inspection-work-order-create",
    query: {
      returnTo: "inspection-work-orders",
    },
  })
}
</script>

<template>
  <TablePageLoading v-if="showInitialLoading" />

  <section v-else class="flex min-h-0 flex-1 flex-col">
    <div v-if="errorMessage" class="px-4 pb-3 pt-3">
      <Alert variant="destructive">
        <i class="ri-error-warning-line" />
        <AlertTitle>{{ pageTitle }}接口加载失败</AlertTitle>
        <AlertDescription class="flex flex-wrap items-center gap-3">
          <span>{{ errorMessage }}</span>
          <Button size="sm" variant="outline" @click="loadWorkOrders">
            重试
          </Button>
        </AlertDescription>
      </Alert>
    </div>

    <TablePage :page="page" @primary-action="handlePrimaryAction" />

    <div class="-mx-4 pt-3">
      <div class="flex w-full justify-end px-4">
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
      </div>
    </div>
  </section>
</template>
