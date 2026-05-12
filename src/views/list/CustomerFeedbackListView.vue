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

type CustomerFeedbackRecord = {
  id: string
  uuid: string
  customerName: string
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
      key: "content",
      label: "反馈内容",
      filterType: "text",
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

const visibleFeedbackRows = computed(() => {
  const normalizedKeyword = keywordQuery.value.trim().toLowerCase()

  if (!normalizedKeyword) {
    return sortedFeedbackRows.value
  }

  return sortedFeedbackRows.value.filter(row => buildPageFilterText(row).toLowerCase().includes(normalizedKeyword))
})

const page = useTablePage({
  ...createTablePageDefinition(schema),
  rows: visibleFeedbackRows,
})
const route = useRoute()
const router = useRouter()
const customerUuid = computed(() => normalizeQueryValue(route.query.customerUuid))
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
      placeholder: "客户或反馈内容",
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
  () => [normalizeQueryValue(route.query.q), customerUuid.value] as const,
  ([nextKeyword, nextCustomerUuid], previousValue) => {
    const [previousKeyword, previousCustomerUuid] = previousValue ?? ["", ""]

    if (syncingRoute && nextKeyword !== previousKeyword && nextCustomerUuid === previousCustomerUuid) {
      return
    }

    if (nextKeyword === previousKeyword && nextCustomerUuid === previousCustomerUuid) {
      return
    }

    keywordQuery.value = nextKeyword

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
      CustomerUuid: customerUuid.value || undefined,
      PageNum: pageNum.value,
      PageSize: pageSize.value,
    })

    if (requestId !== latestRequestId) {
      return
    }

    const rows = result.list.map((item, index) => normalizeFeedbackRecord(item, index))

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

function normalizeFeedbackRecord(
  item: CustomerFeedbackListItem,
  index: number,
): CustomerFeedbackRecord {
  const uuid = getFirstText(item, ["Uuid", "uuid"])
  const customerName = getFirstText(item, ["CorpName", "CustomerName"], "未命名客户")
  const content = getFirstText(item, ["Content"], "-")
  const createdAt = getFirstText(item, ["CreatedAt"], "-")

  return {
    id: uuid || `${pageNum.value}-${index + 1}-${customerName}-${createdAt}`,
    uuid,
    customerName,
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
        <p class="max-w-none whitespace-nowrap text-sm leading-5 text-muted-foreground">
          {{ row.content }}
        </p>
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
