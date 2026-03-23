<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { useRoute } from "vue-router"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import TablePageLoading from "@/components/loading/TablePageLoading.vue"
import TablePage from "@/components/table-page/TablePage.vue"
import { createTablePageDefinition, useTablePage } from "@/components/table-page/useTablePage"
import type { TablePageSchema } from "@/components/table-page/types"
import { useRouteTableSearch } from "@/composables/useRouteTableSearch"
import { handleApiError } from "@/lib/api-errors"
import { fetchWorkOrders, type WorkOrderListItem } from "@/lib/work-orders-api"
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

type WorkOrderRecord = {
  id: string
  uuid: string
  orderNo: string
  planName: string
  packageName: string
  customerName: string
  deadline: string
  executor: string
  statusValue: number | null
  statusLabel: string
  score: number | null
  scoreLabel: string
  resultValue: number | null
  resultLabel: string
  remark: string
  createdAt: string
  updatedAt: string
}

const workOrders = ref<WorkOrderRecord[]>([])
const loading = ref(false)
const errorMessage = ref("")
const pageNum = ref(1)
const pageSize = ref(10)
const total = ref(0)
const route = useRoute()
const showInitialLoading = computed(() => loading.value && !workOrders.value.length && !errorMessage.value)
let latestRequestId = 0

const schema: TablePageSchema<WorkOrderRecord> = {
  title: "工单",
  rowKey: "uuid",
  data: [],
  showIndex: true,
  stickyHeader: true,
  emptyState: {
    title: "暂无工单数据",
    description: "当前接口暂未返回可展示的工单列表。",
    icon: "ri-file-list-3-line",
  },
  columns: [
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
      key: "planName",
      label: "计划名称",
      filterType: "text",
      filter: {
        type: "text",
        placeholder: "输入计划名称",
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "packageName",
      label: "套餐名称",
      filterType: "text",
      filter: {
        type: "text",
        placeholder: "输入套餐名称",
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
      key: "deadline",
      label: "截止时间",
      filterType: "time",
      format: "numeric",
      filter: {
        type: "date",
        defaultVisible: true,
        value: row => extractDatePart(row.deadline),
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
      key: "resultLabel",
      label: "结果",
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
      key: "updatedAt",
      label: "更新时间",
      filterType: "time",
      format: "numeric",
      filter: {
        type: "date",
        value: row => extractDatePart(row.updatedAt),
      },
      sort: true,
    },
    {
      key: "remark",
      label: "备注",
      filterType: "none",
      variant: "note",
      format: "note",
      tone: "muted",
      width: "fill",
      cellRenderer: { kind: "note" },
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
    storageKey: "work-orders-sort-preferences",
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
  return [
    row.orderNo,
    row.planName,
    row.packageName,
    row.customerName,
    row.deadline,
    row.executor,
    row.statusLabel,
    row.scoreLabel,
    row.resultLabel,
    row.remark,
    row.createdAt,
    row.updatedAt,
  ].join(" ")
}

async function loadWorkOrders() {
  const requestId = ++latestRequestId

  loading.value = true
  errorMessage.value = ""

  try {
    const result = await fetchWorkOrders({
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

function normalizeWorkOrderRecord(item: WorkOrderListItem, index: number): WorkOrderRecord {
  const uuid = toText(item.Uuid)
  const fallbackId = toText(item.Id, `${pageNum.value}-${index + 1}`)
  const statusValue = toNumber(item.Status)
  const score = toNumber(item.Score)
  const resultValue = toNumber(item.Result)

  return {
    id: uuid || fallbackId,
    uuid: uuid || fallbackId,
    orderNo: toText(item.OrderNo, `WO-${fallbackId}`),
    planName: toText(item.PlanName, "-"),
    packageName: toText(item.PackageName, "-"),
    customerName: toText(item.CustomerName, "-"),
    deadline: toText(item.Deadline, "-"),
    executor: toText(item.Executor, "-"),
    statusValue,
    statusLabel: formatStatusLabel(statusValue),
    score,
    scoreLabel: formatScoreLabel(score),
    resultValue,
    resultLabel: formatResultLabel(resultValue),
    remark: toText(item.Remark, "-"),
    createdAt: toText(item.CreatedAt, "-"),
    updatedAt: toText(item.UpdatedAt, "-"),
  }
}

function formatStatusLabel(value: number | null) {
  if (value === null) {
    return "未知状态"
  }

  if (value === 0) return "待处理"
  if (value === 1) return "处理中"
  if (value === 2) return "已完成"
  if (value === 3) return "已关闭"

  return `状态 ${value}`
}

function formatResultLabel(value: number | null) {
  if (value === null) {
    return "未反馈"
  }

  if (value === 0) return "未反馈"
  if (value === 1) return "正常"
  if (value === 2) return "异常"
  if (value === 3) return "已驳回"

  return `结果 ${value}`
}

function formatScoreLabel(value: number | null) {
  if (value === null) {
    return "-"
  }

  return String(value)
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
</script>

<template>
  <TablePageLoading v-if="showInitialLoading" />

  <section v-else class="flex min-h-0 flex-1 flex-col">
    <div v-if="errorMessage" class="px-4 pb-3 pt-3">
      <Alert variant="destructive">
        <i class="ri-error-warning-line" />
        <AlertTitle>工单接口加载失败</AlertTitle>
        <AlertDescription class="flex flex-wrap items-center gap-3">
          <span>{{ errorMessage }}</span>
          <Button size="sm" variant="outline" @click="loadWorkOrders">
            重试
          </Button>
        </AlertDescription>
      </Alert>
    </div>

    <TablePage :page="page" />

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
