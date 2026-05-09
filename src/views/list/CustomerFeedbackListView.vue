<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { toast } from "vue-sonner"

import TablePage from "@/components/table-page/TablePage.vue"
import { createTablePageDefinition, useTablePage } from "@/components/table-page/useTablePage"
import type { TablePageSchema, TableQueryBarConfig } from "@/components/table-page/types"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
import { Textarea } from "@/components/ui/textarea"
import { handleApiError } from "@/lib/api-errors"
import {
  fetchCustomerFeedback,
  replyCustomerFeedback,
  type CustomerFeedbackListItem,
} from "@/lib/customer-feedback-api"

type FeedbackStatusLabel = "待回复" | "已回复" | "未填写"

type CustomerFeedbackRecord = {
  id: string
  uuid: string
  customerName: string
  submitterName: string
  submitterPhone: string
  submitterDisplay: string
  category: string
  title: string
  content: string
  statusLabel: FeedbackStatusLabel
  replyContent: string
  replyAt: string
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
const replyDialogOpen = ref(false)
const replySubmitting = ref(false)
const activeFeedback = ref<CustomerFeedbackRecord | null>(null)
const replyContent = ref("")
let latestRequestId = 0
let syncingRoute = false

const feedbackStatusMap = {
  待回复: { tone: "orange", icon: "clock" },
  已回复: { tone: "green", icon: "check" },
  未填写: { tone: "gray", icon: "dot" },
} as const

const schema: TablePageSchema<CustomerFeedbackRecord> = {
  title: "客户反馈",
  description: "查看客户在 app 提交的意见反馈，并填写处理回复",
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
      key: "reply",
      label: "填写回复",
      icon: "ri-reply-line",
      onClick: row => openReplyDialog(row),
    },
  ],
  onRowClick: row => openReplyDialog(row),
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
      key: "statusLabel",
      label: "处理状态",
      filterType: "tag",
      cellRenderer: {
        kind: "status",
        map: feedbackStatusMap,
        fallback: { tone: "gray", icon: "dot" },
      },
      filter: {
        type: "tag",
        label: "处理状态",
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "replyContent",
      label: "回复信息",
      filterType: "text",
      slot: "cell-replyContent",
      filter: {
        type: "text",
        label: "回复信息",
        placeholder: "输入回复内容",
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
    mode: "enum",
    all: { label: "全部", value: "all" },
    field: "statusLabel",
    options: ["待回复", "已回复", "未填写"],
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
    row.title,
    row.content,
    row.statusLabel,
    row.replyContent,
    row.replyAt,
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

    total.value = result.total
    feedbackRows.value = result.list.map((item, index) => normalizeFeedbackRecord(item, index))

    const maxPage = Math.max(1, Math.ceil((result.total || 0) / pageSize.value))

    if (pageNum.value > maxPage) {
      pageNum.value = maxPage
      return
    }
  } catch (error) {
    if (requestId !== latestRequestId) {
      return
    }

    feedbackRows.value = []
    total.value = 0
    errorMessage.value = handleApiError(error, {
      mode: "silent",
      fallback: "客户反馈列表加载失败，请稍后重试。",
    })
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
  const customerName = getFirstText(item, ["CorpName", "CustomerName", "Customer", "CompanyName"], "未命名客户")
  const submitterName = getFirstText(item, ["UserName", "Nickname", "Name", "SubmitterName"], "-")
  const submitterPhone = getFirstText(item, ["Phone", "Mobile", "Contact", "UserPhone"], "-")
  const content = getFirstText(item, ["Content", "FeedbackContent", "Opinion", "Description"], "-")
  const replyContent = getFirstText(item, ["ReplyContent", "Reply", "Answer"], "")
  const replyAt = getFirstText(item, ["ReplyAt", "ReplyTime", "RepliedAt"], "-")
  const createdAt = getFirstText(item, ["CreatedAt", "CreateTime", "SubmittedAt"], "-")
  const status = getFirstNumber(item, ["Status", "status"])

  return {
    id: uuid || `${pageNum.value}-${index + 1}-${customerName}-${createdAt}`,
    uuid,
    customerName,
    submitterName,
    submitterPhone,
    submitterDisplay: [submitterName, submitterPhone].filter(value => value && value !== "-").join(" ") || "-",
    category: getFirstText(item, ["Type", "Category", "FeedbackType"], "意见反馈"),
    title: getFirstText(item, ["Title", "Subject"], ""),
    content,
    statusLabel: formatFeedbackStatus(status, replyContent, replyAt),
    replyContent: replyContent || "-",
    replyAt,
    createdAt,
  }
}

function formatFeedbackStatus(
  status: number | null,
  replyContent: string,
  replyAt: string,
): FeedbackStatusLabel {
  if (replyContent || (replyAt && replyAt !== "-")) {
    return "已回复"
  }

  if (status === 2 || status === 3) {
    return "已回复"
  }

  if (status === 0 || status === 1 || status === null) {
    return "待回复"
  }

  return "未填写"
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

function getFirstNumber(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = toNumber(record[key])

    if (value !== null) {
      return value
    }
  }

  return null
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

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string" && value.trim()) {
    const normalized = Number(value.trim())
    return Number.isFinite(normalized) ? normalized : null
  }

  return null
}

function toTimestamp(value: unknown) {
  const text = toText(value)

  if (!text || text === "-") {
    return null
  }

  const timestamp = new Date(text.replace(" ", "T")).getTime()
  return Number.isFinite(timestamp) ? timestamp : null
}

function openReplyDialog(row: CustomerFeedbackRecord) {
  activeFeedback.value = row
  replyContent.value = row.replyContent === "-" ? "" : row.replyContent
  replyDialogOpen.value = true
}

function closeReplyDialog() {
  if (replySubmitting.value) {
    return
  }

  handleReplyDialogOpenChange(false)
}

function handleReplyDialogOpenChange(open: boolean) {
  replyDialogOpen.value = open

  if (open || replySubmitting.value) {
    return
  }

  activeFeedback.value = null
  replyContent.value = ""
}

async function submitReply() {
  const feedback = activeFeedback.value

  if (!feedback?.uuid) {
    toast.error("当前反馈缺少 Uuid，无法保存回复")
    return
  }

  const content = replyContent.value.trim()

  if (!content) {
    toast.error("请填写回复信息")
    return
  }

  replySubmitting.value = true

  try {
    await replyCustomerFeedback({
      Uuid: feedback.uuid,
      ReplyContent: content,
    })
    toast.success("反馈回复已保存")
    replyDialogOpen.value = false
    activeFeedback.value = null
    replyContent.value = ""
    await loadFeedback()
  } catch (error) {
    handleApiError(error, {
      title: "回复保存失败",
      fallback: "客户反馈回复保存失败，请稍后重试。",
    })
  } finally {
    replySubmitting.value = false
  }
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
        <div class="min-w-0 space-y-1">
          <p v-if="row.title" class="truncate text-sm font-medium text-foreground">
            {{ row.title }}
          </p>
          <p class="line-clamp-2 max-w-[36rem] text-sm leading-5 text-muted-foreground">
            {{ row.content }}
          </p>
        </div>
      </template>

      <template #cell-replyContent="{ row }">
        <div class="min-w-0 space-y-1">
          <p class="line-clamp-2 max-w-[24rem] text-sm leading-5" :class="row.replyContent === '-' ? 'text-muted-foreground' : 'text-foreground'">
            {{ row.replyContent }}
          </p>
          <p v-if="row.replyAt && row.replyAt !== '-'" class="text-xs text-muted-foreground tabular-nums">
            {{ row.replyAt }}
          </p>
        </div>
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

    <Dialog :open="replyDialogOpen" @update:open="handleReplyDialogOpenChange">
      <DialogContent class="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{{ activeFeedback?.statusLabel === '已回复' ? '修改回复' : '填写回复' }}</DialogTitle>
          <DialogDescription>
            回复内容会用于反馈处理跟进。
          </DialogDescription>
        </DialogHeader>

        <div v-if="activeFeedback" class="space-y-4">
          <div class="rounded-md bg-surface-secondary px-4 py-3">
            <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span class="font-medium text-foreground">{{ activeFeedback.customerName }}</span>
              <span class="text-muted-foreground">{{ activeFeedback.submitterDisplay }}</span>
              <span class="text-muted-foreground tabular-nums">{{ activeFeedback.createdAt }}</span>
            </div>
            <p v-if="activeFeedback.title" class="mt-3 text-sm font-medium text-foreground">
              {{ activeFeedback.title }}
            </p>
            <p class="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
              {{ activeFeedback.content }}
            </p>
          </div>

          <div class="space-y-2">
            <p class="text-sm font-medium text-foreground">回复信息</p>
            <Textarea
              v-model="replyContent"
              :disabled="replySubmitting"
              placeholder="填写给客户的回复信息"
              class="min-h-32 resize-y"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" :disabled="replySubmitting" @click="closeReplyDialog">
            取消
          </Button>
          <Button type="button" :disabled="replySubmitting || !replyContent.trim()" @click="submitReply">
            {{ replySubmitting ? "保存中..." : "保存回复" }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </section>
</template>
