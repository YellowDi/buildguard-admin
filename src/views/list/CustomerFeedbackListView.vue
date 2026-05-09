<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"

import TablePage from "@/components/table-page/TablePage.vue"
import { createTablePageDefinition, useTablePage } from "@/components/table-page/useTablePage"
import type { TablePageSchema, TableQueryBarConfig } from "@/components/table-page/types"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
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
import { handleApiError } from "@/lib/api-errors"
import {
  fetchCustomerFeedback,
  type CustomerFeedbackListItem,
} from "@/lib/customer-feedback-api"
import { TooltipWrap } from "@/components/ui/tooltip"

type CustomerFeedbackRecord = {
  id: string
  uuid: string
  customerName: string
  submitterName: string
  submitterPhone: string
  submitterDisplay: string
  category: string
  content: string
  createdAt: string
}

const feedbackRows = ref<CustomerFeedbackRecord[]>([])
const loading = ref(false)
const errorMessage = ref("")
const pageNum = ref(1)
const pageSize = ref(50)
const total = ref(0)
const keywordQuery = ref("")
const sortDirection = ref<"asc" | "desc">("desc")
let latestRequestId = 0
let syncingRoute = false

const MOCK_FEEDBACK_ROWS: CustomerFeedbackRecord[] = [
  {
    id: "mock-feedback-1",
    uuid: "mock-feedback-1",
    customerName: "上海恒基广场物业管理有限公司",
    submitterName: "陈明",
    submitterPhone: "138****2468",
    submitterDisplay: "陈明 138****2468",
    category: "功能建议",
    content: "目前客户在 app 里只能逐页查看检测报告，领导汇报时需要统一归档。建议增加报告 PDF 导出和分享链接功能，方便发送给业主委员会和集团安全部门。",
    createdAt: "2026-05-09 10:28:36",
  },
  {
    id: "mock-feedback-2",
    uuid: "mock-feedback-2",
    customerName: "杭州滨江科技园",
    submitterName: "李晓雨",
    submitterPhone: "186****9051",
    submitterDisplay: "李晓雨 186****9051",
    category: "体验问题",
    content: "园区下建筑比较多时，进入建筑列表需要等待较久。希望能增加加载提示，或者默认先展示最近巡检过的建筑。",
    createdAt: "2026-05-08 16:42:19",
  },
  {
    id: "mock-feedback-3",
    uuid: "mock-feedback-3",
    customerName: "苏州星海商业中心",
    submitterName: "王磊",
    submitterPhone: "159****7732",
    submitterDisplay: "王磊 159****7732",
    category: "数据疑问",
    content: "同一个报修问题在首页提醒里显示待处理，进入工单详情后显示已完成。请帮忙确认状态同步逻辑是否有延迟。",
    createdAt: "2026-05-07 09:15:04",
  },
  {
    id: "mock-feedback-4",
    uuid: "mock-feedback-4",
    customerName: "南京江北智慧园区",
    submitterName: "赵倩",
    submitterPhone: "177****4206",
    submitterDisplay: "赵倩 177****4206",
    category: "问题反馈",
    content: "上传现场照片时偶尔会失败，网络恢复后没有自动重试，需要重新选择图片。建议保留上传队列，失败后可以手动重传。",
    createdAt: "2026-05-06 14:03:51",
  },
  {
    id: "mock-feedback-5",
    uuid: "mock-feedback-5",
    customerName: "成都天府办公区",
    submitterName: "刘洋",
    submitterPhone: "135****1180",
    submitterDisplay: "刘洋 135****1180",
    category: "功能建议",
    content: "客户侧希望在服务到期、巡检计划到期前 7 天收到 app 推送，避免错过安排。",
    createdAt: "2026-05-05 18:20:12",
  },
]

const schema: TablePageSchema<CustomerFeedbackRecord> = {
  title: "客户反馈",
  description: "查看客户在 app 提交的意见反馈内容",
  rowKey: "id",
  data: [],
  showIndex: true,
  stickyHeader: true,
  emptyState: {
    title: "暂无客户反馈",
    description: "客户在 app 提交意见反馈后会展示在这里。",
    icon: "ri-feedback-line",
  },
  columns: [
    {
      key: "customerName",
      label: "客户名称",
      filterType: "text",
      emphasis: "strong",
      tone: "primary",
      filter: {
        type: "text",
        label: "客户名称",
        placeholder: "输入客户名称",
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "submitterDisplay",
      label: "提交人",
      cellRenderer: {
        kind: "dual-inline",
        primaryKey: "submitterName",
        secondaryKey: "submitterPhone",
      },
      filter: {
        type: "text",
        label: "提交人",
        placeholder: "输入姓名或手机号",
        defaultVisible: true,
      },
      sort: {
        label: "提交人",
        value: row => row.submitterDisplay,
      },
    },
    {
      key: "content",
      label: "反馈内容",
      filterType: "text",
      width: "fill",
      slot: "cell-content",
      filter: {
        type: "text",
        label: "反馈内容",
        placeholder: "输入反馈内容",
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "createdAt",
      label: "提交时间",
      filterType: "time",
      tone: "muted",
      format: "numeric",
      filter: {
        type: "date",
        label: "提交时间",
        value: row => extractDatePart(row.createdAt),
      },
      sort: {
        label: "提交时间",
        kind: "metric",
        value: row => toTimestamp(row.createdAt) ?? -1,
      },
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
    storageKey: "customer-feedback-sort-preferences-v1",
    initialField: "createdAt",
    initialDirection: "desc",
  },
  tabs: {
    mode: "none",
  },
}

const sortedFeedbackRows = computed(() => {
  return [...feedbackRows.value].sort((left, right) => {
    const leftValue = toTimestamp(left.createdAt) ?? 0
    const rightValue = toTimestamp(right.createdAt) ?? 0

    if (leftValue === rightValue) {
      return left.customerName.localeCompare(right.customerName, "zh-CN")
    }

    return sortDirection.value === "asc" ? leftValue - rightValue : rightValue - leftValue
  })
})

const page = useTablePage({
  ...createTablePageDefinition(schema),
  rows: sortedFeedbackRows,
})
const route = useRoute()
const router = useRouter()
page.showControls.value = true
page.customSortEnabled.value = false

const queryBar = computed<TableQueryBarConfig>(() => ({
  controls: [
    {
      type: "search",
      key: "q",
      queryKey: "q",
      label: "关键词",
      icon: "ri-search-line",
      placeholder: "客户、提交人或反馈内容",
      value: keywordQuery.value,
      expandedWidth: 280,
      collapsedMaxWidth: 280,
    },
  ],
  values: {
    q: keywordQuery.value,
  },
  canClear: Boolean(keywordQuery.value),
}))

watch([pageNum, pageSize], ([nextPageNum, nextPageSize], [previousPageNum, previousPageSize]) => {
  if (nextPageNum === previousPageNum && nextPageSize === previousPageSize) {
    return
  }

  void loadFeedback()
})

watch(
  () => normalizeQueryValue(route.query.q),
  (nextValue, previousValue) => {
    if (syncingRoute || nextValue === previousValue) {
      return
    }

    keywordQuery.value = nextValue

    if (pageNum.value !== 1) {
      pageNum.value = 1
      return
    }

    void loadFeedback()
  },
  { immediate: true },
)

function extractDatePart(value: string) {
  const [datePart] = value.split(" ")
  return datePart ?? ""
}

function buildPageFilterText(row: CustomerFeedbackRecord) {
  return [
    row.customerName,
    row.submitterDisplay,
    row.category,
    row.content,
    row.createdAt,
  ].join(" ")
}

async function loadFeedback() {
  const requestId = ++latestRequestId

  loading.value = true
  errorMessage.value = ""

  try {
    const result = await fetchCustomerFeedback({
      Keyword: keywordQuery.value || undefined,
      CustomerName: keywordQuery.value || undefined,
      PageNum: pageNum.value,
      PageSize: pageSize.value,
    })

    if (requestId !== latestRequestId) {
      return
    }

    const rows = result.list.map((item, index) => normalizeFeedbackRecord(item, index))

    if (import.meta.env.DEV && rows.length === 0) {
      applyMockFeedbackRows()
      return
    }

    total.value = result.total
    feedbackRows.value = rows

    const maxPage = Math.max(1, Math.ceil((result.total || 0) / pageSize.value))

    if (pageNum.value > maxPage) {
      pageNum.value = maxPage
      return
    }
  } catch (error) {
    if (requestId !== latestRequestId) {
      return
    }

    if (import.meta.env.DEV) {
      applyMockFeedbackRows()
      return
    }

    errorMessage.value = handleApiError(error, {
      mode: "silent",
      fallback: "客户反馈列表加载失败，请稍后重试。",
    })
    feedbackRows.value = []
    total.value = 0
  } finally {
    if (requestId === latestRequestId) {
      loading.value = false
    }
  }
}

function applyMockFeedbackRows() {
  const filteredRows = filterMockFeedbackRows(keywordQuery.value)
  const maxPage = Math.max(1, Math.ceil(filteredRows.length / pageSize.value))

  if (pageNum.value > maxPage) {
    pageNum.value = maxPage
  }

  const start = (pageNum.value - 1) * pageSize.value

  total.value = filteredRows.length
  feedbackRows.value = filteredRows.slice(start, start + pageSize.value)
  errorMessage.value = ""
}

function filterMockFeedbackRows(keyword: string) {
  const normalizedKeyword = keyword.trim().toLowerCase()

  if (!normalizedKeyword) {
    return [...MOCK_FEEDBACK_ROWS]
  }

  return MOCK_FEEDBACK_ROWS.filter(row => buildPageFilterText(row).toLowerCase().includes(normalizedKeyword))
}

function normalizeFeedbackRecord(
  item: CustomerFeedbackListItem,
  index: number,
): CustomerFeedbackRecord {
  const uuid = getFirstText(item, ["Uuid", "uuid"])
  const customerName = getFirstText(item, ["CorpName", "CustomerName", "Customer", "CompanyName"], "未命名客户")
  const submitterName = getFirstText(item, ["UserName", "Nickname", "Name", "SubmitterName"], "-")
  const submitterPhone = getFirstText(item, ["Phone", "Mobile", "Contact", "UserPhone"], "-")
  const content = getFirstText(item, ["Content", "FeedbackContent", "Opinion", "Description"], "-")
  const createdAt = getFirstText(item, ["CreatedAt", "CreateTime", "SubmittedAt"], "-")

  return {
    id: uuid || `${pageNum.value}-${index + 1}-${customerName}-${createdAt}`,
    uuid,
    customerName,
    submitterName,
    submitterPhone,
    submitterDisplay: [submitterName, submitterPhone].filter(value => value && value !== "-").join(" ") || "-",
    category: getFirstText(item, ["Type", "Category", "FeedbackType"], "意见反馈"),
    content,
    createdAt,
  }
}

function getFirstText(
  record: Record<string, unknown>,
  keys: string[],
  fallback = "",
) {
  for (const key of keys) {
    const value = toText(record[key])

    if (value) {
      return value
    }
  }

  return fallback
}

function toText(value: unknown, fallback = "") {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }

  if (typeof value === "string" && value.trim()) {
    return value.trim()
  }

  return fallback
}

function toTimestamp(value: unknown) {
  const text = toText(value)

  if (!text || text === "-") {
    return null
  }

  const timestamp = new Date(text.replace(" ", "T")).getTime()
  return Number.isFinite(timestamp) ? timestamp : null
}

function getContentText(value: unknown) {
  return toText(value)
}

function shouldShowContentTooltip(value: unknown) {
  return getContentText(value).length > 24
}

function handleToolbarSortToggle() {
  sortDirection.value = sortDirection.value === "asc" ? "desc" : "asc"
}

function handleQueryChange(payload: { key: string; value: string | string[] }) {
  if (payload.key !== "q") {
    return
  }

  keywordQuery.value = typeof payload.value === "string" ? payload.value.trim() : ""
  void syncRouteQueryAndReload()
}

function handleQueryClear() {
  if (!keywordQuery.value) {
    return
  }

  keywordQuery.value = ""
  void syncRouteQueryAndReload()
}

async function syncRouteQueryAndReload() {
  syncingRoute = true

  try {
    await router.replace({
      query: {
        ...route.query,
        q: keywordQuery.value || undefined,
      },
    })
  } finally {
    syncingRoute = false
  }

  if (pageNum.value !== 1) {
    pageNum.value = 1
    return
  }

  await loadFeedback()
}

function normalizeQueryValue(value: unknown) {
  if (Array.isArray(value)) {
    return normalizeQueryValue(value[0])
  }

  return typeof value === "string" ? value.trim() : ""
}
</script>

<template>
  <section class="flex min-h-0 flex-1 flex-col">
    <div v-if="errorMessage" class="px-4 pb-3 pt-3">
      <Alert variant="destructive">
        <i class="ri-error-warning-line" />
        <AlertTitle>客户反馈接口加载失败</AlertTitle>
        <AlertDescription class="flex flex-wrap items-center gap-3">
          <span>{{ errorMessage }}</span>
          <Button size="sm" variant="outline" class="gap-2" @click="loadFeedback">
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
      @refresh-action="loadFeedback"
      @toolbar-sort-toggle="handleToolbarSortToggle"
      @query-change="handleQueryChange"
      @query-clear="handleQueryClear"
    >
      <template #cell-content="{ row }">
        <TooltipWrap
          :content="getContentText(row.content)"
          :disabled="!shouldShowContentTooltip(row.content)"
          align="start"
          class="max-w-[min(42rem,calc(100vw-2rem))] whitespace-normal text-left leading-5"
        >
          <p class="max-w-[42rem] truncate whitespace-nowrap text-sm leading-5 text-muted-foreground">
            {{ row.content }}
          </p>
        </TooltipWrap>
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
  </section>
</template>
