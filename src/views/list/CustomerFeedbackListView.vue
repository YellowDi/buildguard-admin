<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"

import DetailFieldSections from "@/components/detail/DetailFieldSections.vue"
import type { DetailFieldSection } from "@/components/detail/types"
import TablePage from "@/components/table-page/TablePage.vue"
import type { TableExportRowsResolverPayload } from "@/components/table-page/export-utils"
import { createTablePageDefinition, useTablePage } from "@/components/table-page/useTablePage"
import type { TablePageSchema, TableQueryBarConfig } from "@/components/table-page/types"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { ResponsiveRightSheet } from "@/components/ui/sheet"
import { TooltipWrap } from "@/components/ui/tooltip"
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
import { fetchCustomers } from "@/lib/customers-api"
import {
  fetchCustomerFeedback,
  type CustomerFeedbackListItem,
} from "@/lib/customer-feedback-api"
import { fetchAllPaginatedListItems } from "@/lib/paginated-list-export"

type CustomerFeedbackRecord = {
  id: string
  uuid: string
  customerUuid: string
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
const selectedCustomerUuid = ref("")
const customerOptions = ref<Array<{ value: string; label: string }>>([])
const customerOptionsLoading = ref(false)
const sortDirection = ref<"asc" | "desc">("desc")
const activeFeedbackRecord = ref<CustomerFeedbackRecord | null>(null)
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
  rowActions: [
    {
      key: "view",
      label: "查看",
      onClick: row => openFeedbackDetail(row),
    },
  ],
  columns: [
    {
      key: "customerName",
      label: "客户名称",
      filterType: "text",
      emphasis: "strong",
      tone: "primary",
      slot: "cell-customerName",
      filter: {
        type: "text",
        label: "客户名称",
        placeholder: "输入客户名称",
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
  return [...feedbackRows.value].sort(compareFeedbackRows)
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
const feedbackDetailOpen = computed(() => activeFeedbackRecord.value !== null)
const feedbackDetailSections = computed<DetailFieldSection[]>(() => {
  const record = activeFeedbackRecord.value

  if (!record) {
    return []
  }

  return [
    {
      key: "feedback",
      title: "",
      rows: [
        {
          key: "customerName",
          label: "客户",
          value: record.customerName,
        },
        {
          key: "createdAt",
          label: "时间",
          value: record.createdAt,
        },
        {
          key: "content",
          label: "反馈内容",
          value: record.content,
          truncate: false,
          valueClass: "whitespace-pre-wrap break-words leading-6 text-foreground",
        },
      ],
    },
  ]
})
const exportFilteredRowsCount = computed(() => keywordQuery.value ? page.filteredRowsCount.value : total.value)
const customerUuidByName = computed(() => {
  const customerMap = new Map<string, string>()

  for (const option of customerOptions.value) {
    if (option.label && option.value && !customerMap.has(option.label)) {
      customerMap.set(option.label, option.value)
    }
  }

  return customerMap
})
const customerSelectOptions = computed(() => {
  const options = [...customerOptions.value]
  const knownValues = new Set(options.map(option => option.value))

  for (const row of feedbackRows.value) {
    if (!row.customerUuid || knownValues.has(row.customerUuid)) {
      continue
    }

    options.push({
      value: row.customerUuid,
      label: row.customerName || "未命名客户",
    })
    knownValues.add(row.customerUuid)
  }

  return options
})
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
    {
      type: "select",
      key: "customerUuid",
      queryKey: "customerUuid",
      label: "客户",
      icon: "ri-customer-service-2-line",
      value: selectedCustomerUuid.value,
      loading: customerOptionsLoading.value,
      options: customerSelectOptions.value,
      expandedWidth: 260,
      collapsedMaxWidth: 260,
      placeholder: customerOptionsLoading.value ? "正在加载客户..." : "请选择客户",
    },
  ],
  values: {
    q: keywordQuery.value,
    customerUuid: selectedCustomerUuid.value,
  },
  canClear: Boolean(keywordQuery.value || selectedCustomerUuid.value),
}))

watch([pageNum, pageSize], ([nextPageNum, nextPageSize], [previousPageNum, previousPageSize]) => {
  if (nextPageNum === previousPageNum && nextPageSize === previousPageSize) {
    return
  }

  void loadFeedback()
})

watch(
  () => [normalizeQueryValue(route.query.q), normalizeQueryValue(route.query.customerUuid)] as const,
  ([nextKeyword, nextCustomerUuid], previousValue) => {
    const isInitialRun = previousValue === undefined
    const [previousKeyword, previousCustomerUuid] = previousValue ?? ["", ""]

    if (!isInitialRun && syncingRoute) {
      return
    }

    if (!isInitialRun && nextKeyword === previousKeyword && nextCustomerUuid === previousCustomerUuid) {
      return
    }

    keywordQuery.value = nextKeyword
    selectedCustomerUuid.value = nextCustomerUuid

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
      CustomerUuid: selectedCustomerUuid.value || undefined,
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

async function resolveExportRows(payload: TableExportRowsResolverPayload) {
  if (payload.scope !== "filtered") {
    return payload.defaultRows
  }

  const normalizedKeyword = keywordQuery.value.trim().toLowerCase()
  const items = await fetchAllPaginatedListItems(({ PageNum, PageSize }) => fetchCustomerFeedback({
    CustomerUuid: selectedCustomerUuid.value || undefined,
    PageNum,
    PageSize,
  }))
  const rows = items.map((item, index) => normalizeFeedbackRecord(item, index)).sort(compareFeedbackRows)

  if (!normalizedKeyword) {
    return rows
  }

  return rows.filter(row => buildPageFilterText(row).toLowerCase().includes(normalizedKeyword))
}

function normalizeFeedbackRecord(
  item: CustomerFeedbackListItem,
  index: number,
): CustomerFeedbackRecord {
  const uuid = getFirstText(item, ["Uuid", "uuid"])
  const customerUuid = getFirstText(item, ["CustomerUuid", "customerUuid"])
  const customerName = getFirstText(item, ["CorpName", "CustomerName"], "未命名客户")
  const content = getFirstText(item, ["Content"], "-")
  const createdAt = getFirstText(item, ["CreatedAt"], "-")

  return {
    id: uuid || `${pageNum.value}-${index + 1}-${customerName}-${createdAt}`,
    uuid,
    customerUuid,
    customerName,
    content,
    createdAt,
  }
}

void loadCustomerOptions()

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
        label: toText(item.CorpName, "未命名客户"),
      }))
      .filter(option => option.value)
  } catch {
    customerOptions.value = []
  } finally {
    customerOptionsLoading.value = false
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

function compareFeedbackRows(left: CustomerFeedbackRecord, right: CustomerFeedbackRecord) {
  const leftValue = toTimestamp(left.createdAt) ?? 0
  const rightValue = toTimestamp(right.createdAt) ?? 0

  if (leftValue === rightValue) {
    return left.customerName.localeCompare(right.customerName, "zh-CN")
  }

  return sortDirection.value === "asc" ? leftValue - rightValue : rightValue - leftValue
}

function handleToolbarSortToggle() {
  sortDirection.value = sortDirection.value === "asc" ? "desc" : "asc"
}

function openFeedbackDetail(row: CustomerFeedbackRecord | Record<string, unknown>) {
  activeFeedbackRecord.value = normalizeFeedbackRow(row)
}

function handleFeedbackDetailOpenChange(open: boolean) {
  if (!open) {
    activeFeedbackRecord.value = null
  }
}

function normalizeFeedbackRow(row: CustomerFeedbackRecord | Record<string, unknown>): CustomerFeedbackRecord {
  const record = row as Record<string, unknown>

  return {
    id: toText(record.id),
    uuid: toText(record.uuid),
    customerUuid: resolveFeedbackCustomerUuid(record),
    customerName: toText(record.customerName, "未命名客户"),
    content: toText(record.content, "-"),
    createdAt: toText(record.createdAt, "-"),
  }
}

function openCustomerDetail(row: CustomerFeedbackRecord | Record<string, unknown>) {
  const record = normalizeFeedbackRow(row)

  if (!record.customerUuid) {
    return
  }

  void router.push({
    name: "customer-detail",
    params: { id: record.customerUuid },
  })
}

function getFeedbackCustomerUuid(row: Record<string, unknown>) {
  return resolveFeedbackCustomerUuid(row)
}

function getFeedbackCustomerName(row: Record<string, unknown>) {
  return toText(row.customerName, "未命名客户")
}

function resolveFeedbackCustomerUuid(row: Record<string, unknown>) {
  const explicitCustomerUuid = toText(row.customerUuid)

  if (explicitCustomerUuid) {
    return explicitCustomerUuid
  }

  const customerName = toText(row.customerName)
  return customerName ? customerUuidByName.value.get(customerName) ?? "" : ""
}

function getFeedbackContent(row: Record<string, unknown>) {
  return toText(row.content, "-")
}

function handleQueryChange(payload: { key: string; value: string | string[] }) {
  if (payload.key === "q") {
    keywordQuery.value = typeof payload.value === "string" ? payload.value.trim() : ""
  }

  if (payload.key === "customerUuid") {
    selectedCustomerUuid.value = typeof payload.value === "string" ? payload.value.trim() : ""
  }

  void syncRouteQueryAndReload()
}

function handleQueryClear() {
  if (!keywordQuery.value && !selectedCustomerUuid.value) {
    return
  }

  keywordQuery.value = ""
  selectedCustomerUuid.value = ""
  void syncRouteQueryAndReload()
}

async function syncRouteQueryAndReload() {
  syncingRoute = true

  try {
    await router.replace({
      query: {
        ...route.query,
        q: keywordQuery.value || undefined,
        customerUuid: selectedCustomerUuid.value || undefined,
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
      :export-rows-resolver="resolveExportRows"
      :export-filtered-rows-count="exportFilteredRowsCount"
      :export-total-rows-count="total"
      toolbar-sort-behavior="toggle"
      :toolbar-sort-direction="sortDirection"
      fill-available-height
      @refresh-action="loadFeedback"
      @toolbar-sort-toggle="handleToolbarSortToggle"
      @query-change="handleQueryChange"
      @query-clear="handleQueryClear"
    >
      <template #cell-customerName="{ row }">
        <button
          v-if="getFeedbackCustomerUuid(row)"
          type="button"
          class="inline-flex max-w-full min-w-0 items-center gap-1 text-left text-link transition-colors hover:text-link-hover"
          @click.stop="openCustomerDetail(row)"
        >
          <span class="truncate">{{ getFeedbackCustomerName(row) }}</span>
          <i class="ri-arrow-right-up-line shrink-0 text-sm" />
        </button>
        <span v-else class="block truncate">
          {{ getFeedbackCustomerName(row) }}
        </span>
      </template>

      <template #cell-content="{ row }">
        <p class="w-full min-w-0 truncate text-sm leading-5 text-muted-foreground" :title="getFeedbackContent(row)">
          {{ getFeedbackContent(row) }}
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

    <ResponsiveRightSheet
      :open="feedbackDetailOpen"
      title="反馈内容"
      :show-primary="false"
      sheet-content-class="flex min-h-0 flex-col overflow-hidden sm:max-w-xl"
      @update:open="handleFeedbackDetailOpenChange"
    >
      <template #actions>
        <div class="right-sheet-actions">
          <div class="right-sheet-actions__primary">
            <TooltipWrap content="关闭反馈内容" side="right">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                class="right-sheet-icon-button"
                @click="handleFeedbackDetailOpenChange(false)"
              >
                <i class="ri-close-line text-base" />
                <span class="sr-only">关闭反馈内容</span>
              </Button>
            </TooltipWrap>
          </div>
          <div class="right-sheet-actions__secondary" />
        </div>
      </template>

      <div class="min-h-0 flex-1 overflow-y-auto pb-6">
        <DetailFieldSections
          v-if="feedbackDetailSections.length"
          :sections="feedbackDetailSections"
          :show-section-titles="false"
          label-width-mobile="5rem"
          label-width-desktop="96px"
        />
      </div>
    </ResponsiveRightSheet>
  </section>
</template>
