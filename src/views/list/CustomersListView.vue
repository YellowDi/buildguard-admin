<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { toast } from "vue-sonner"

import LinkedEntityDetailSheet from "@/components/detail/LinkedEntityDetailSheet.vue"
import TablePage from "@/components/table-page/TablePage.vue"
import type { TableExportRowsResolverPayload } from "@/components/table-page/export-utils"
import { customerStatusMap } from "@/components/table-page/statusPresets"
import { createTablePageDefinition, useTablePage } from "@/components/table-page/useTablePage"
import type { TablePageSchema, TableQueryBarConfig } from "@/components/table-page/types"
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { handleApiError } from "@/lib/api-errors"
import { fetchBusinessPresetEntryOptions } from "@/lib/business-preset-options"
import { fetchCustomers, type CustomerListItem } from "@/lib/customers-api"
import { fetchAllPaginatedListItems } from "@/lib/paginated-list-export"
import { PERMISSION_CODES } from "@/lib/permission-codes"

type CustomerRecord = {
  id: string
  detailId: string
  customerName: string
  status: number | null
  statusLabel: string
  business: string
  level: string
  levelLabel: string
  principalName: string
  principalPhone: string
  principalDisplay: string
  parkCount: string
  parkCountValue: number | null
  buildingCount: string
  buildingCountValue: number | null
  createdAt: string
}

type LinkedDetailSheetKind = "customer"

const customers = ref<CustomerRecord[]>([])
const loading = ref(false)
const errorMessage = ref("")
const pageNum = ref(1)
const pageSize = ref(50)
const total = ref(0)
const corpNameQuery = ref("")
const customerNameQuery = ref("")
const customerPhoneQuery = ref("")
const selectedStatus = ref("")
const customerLevelTabOptions = ref<string[]>(["未评级"])
const sortDirection = ref<"asc" | "desc">("desc")
const activeLinkedDetailKind = ref<LinkedDetailSheetKind | null>(null)
const activeLinkedDetailUuid = ref("")
let latestRequestId = 0
let syncingRoute = false

const customerStatusOptions = [
  { label: "正常", value: "1" },
  { label: "封禁", value: "2" },
  { label: "未完善", value: "3" },
]

const schema: TablePageSchema<CustomerRecord> = {
  title: "客户",
  description: "管理客户信息和服务情况，查看合同、资产和检测记录",
  rowKey: "id",
  data: [],
  showIndex: true,
  stickyHeader: true,
  emptyState: {
    title: "暂无客户数据",
    description: "暂时还没有客户数据，您可以先添加一个客户。",
    icon: "ri-customer-service-2-line",
  },
  rowActions: [
    {
      key: "view-detail",
      label: "查看详情",
      onClick: (row) => {
        if (!row.detailId) {
          toast.error("客户信息不完整，无法打开详情")
          return
        }

        void router.push({ name: "customer-detail", params: { id: row.detailId } })
      },
    },
  ],
  onRowClick: row => {
    if (!row.detailId) {
      toast.error("客户信息不完整，无法打开详情")
      return
    }

    void router.push({ name: "customer-detail", params: { id: row.detailId } })
  },
  onQuickAction: row => {
    if (!row.detailId) {
      toast.error("客户信息不完整，无法打开详情")
      return
    }

    activeLinkedDetailKind.value = "customer"
    activeLinkedDetailUuid.value = row.detailId
  },
  columns: [
    {
      key: "customerName",
      label: "公司名称",
      filterType: "text",
      emphasis: "strong",
      tone: "primary",
      filter: {
        type: "text",
        label: "公司名称",
        placeholder: "输入公司名称",
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "statusLabel",
      label: "客户状态",
      filterType: "tag",
      cellRenderer: {
        kind: "status",
        map: customerStatusMap,
        fallback: { tone: "gray", icon: "dot" },
      },
      filter: {
        type: "tag",
        label: "客户状态",
        defaultVisible: true,
      },
      sort: {
        label: "客户状态",
        kind: "metric",
        value: row => row.status ?? 0,
      },
    },
    {
      key: "principalDisplay",
      label: "企业负责人",
      cellRenderer: {
        kind: "dual-inline",
        primaryKey: "principalName",
        secondaryKey: "principalPhone",
      },
      filter: {
        type: "text",
        label: "企业负责人",
        placeholder: "输入企业负责人或手机号",
        defaultVisible: true,
        value: row => row.principalDisplay,
      },
      sort: {
        label: "企业负责人",
        value: row => row.principalName === "-" ? row.principalPhone : row.principalName,
      },
    },
    {
      key: "levelLabel",
      label: "客户等级",
      filterType: "tag",
      filter: {
        type: "tag",
        defaultVisible: true,
      },
      sort: {
        label: "客户等级",
        value: row => row.levelLabel,
      },
    },
    {
      key: "business",
      label: "所属行业",
      filterType: "tag",
      filter: {
        type: "tag",
        label: "行业",
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "parkCount",
      label: "园区数量",
      filterType: "number",
      variant: "metric",
      cellRenderer: {
        kind: "metric-unit",
        unit: "个",
      },
      filter: {
        type: "number",
        label: "园区数量",
        placeholder: "输入园区数量",
        value: row => row.parkCountValue ?? "",
      },
      sort: {
        label: "园区数量",
        kind: "metric",
        value: row => row.parkCountValue ?? -1,
      },
    },
    {
      key: "buildingCount",
      label: "建筑数量",
      filterType: "number",
      variant: "metric",
      cellRenderer: {
        kind: "metric-unit",
        unit: "栋",
      },
      filter: {
        type: "number",
        label: "建筑数量",
        placeholder: "输入建筑数量",
        value: row => row.buildingCountValue ?? "",
      },
      sort: {
        label: "建筑数量",
        kind: "metric",
        value: row => row.buildingCountValue ?? -1,
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
        label: "创建时间",
        value: row => extractDatePart(row.createdAt),
      },
      sort: {
        label: "创建时间",
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
    storageKey: "customers-sort-preferences-v2",
    initialField: "createdAt",
    initialDirection: "desc",
  },
  tabs: {
    mode: "enum",
    all: { label: "全部", value: "all" },
    field: "levelLabel",
    options: () => customerLevelTabOptions.value,
  },
}

const sortedCustomers = computed(() => {
  return [...customers.value].sort(compareCustomerRows)
})

const page = useTablePage({
  ...createTablePageDefinition(schema),
  primaryActionLabel: "添加客户",
  primaryActionPermissionCode: PERMISSION_CODES.customerAdd,
  rows: sortedCustomers,
})
const route = useRoute()
const router = useRouter()
const exportFilteredRowsCount = computed(() => page.selectedTab.value === "all" ? total.value : page.filteredRowsCount.value)
page.showControls.value = true
page.customSortEnabled.value = false

void loadCustomerLevelTabOptions()

const queryBar = computed<TableQueryBarConfig>(() => ({
  controls: [
    {
      type: "search",
      key: "corpName",
      queryKey: "q",
      label: "公司名称",
      icon: "ri-text",
      placeholder: "请输入",
      value: corpNameQuery.value,
      expandedWidth: 248,
      collapsedMaxWidth: 248,
    },
    {
      type: "search",
      key: "customerName",
      queryKey: "customerName",
      label: "客户名称",
      icon: "ri-user-line",
      placeholder: "请输入",
      value: customerNameQuery.value,
      expandedWidth: 248,
      collapsedMaxWidth: 248,
    },
    {
      type: "search",
      key: "customerPhone",
      queryKey: "customerPhone",
      label: "客户手机",
      icon: "ri-phone-line",
      placeholder: "请输入",
      value: customerPhoneQuery.value,
      expandedWidth: 248,
      collapsedMaxWidth: 248,
    },
    {
      type: "select",
      key: "status",
      queryKey: "status",
      label: "客户状态",
      icon: "ri-price-tag-3-line",
      value: selectedStatus.value,
      options: customerStatusOptions,
      placeholder: "请选择状态",
      expandedWidth: 248,
      collapsedMaxWidth: 248,
    },
  ],
  values: {
    corpName: corpNameQuery.value,
    customerName: customerNameQuery.value,
    customerPhone: customerPhoneQuery.value,
    status: selectedStatus.value,
  },
  canClear: Boolean(corpNameQuery.value || customerNameQuery.value || customerPhoneQuery.value || selectedStatus.value),
}))

watch([pageNum, pageSize], ([nextPageNum, nextPageSize], [previousPageNum, previousPageSize]) => {
  if (nextPageNum === previousPageNum && nextPageSize === previousPageSize) {
    return
  }

  void loadCustomers()
})

watch(
  () => [
    normalizeQueryValue(route.query.q),
    normalizeQueryValue(route.query.customerName),
    normalizeQueryValue(route.query.customerPhone),
    normalizeQueryValue(route.query.status),
  ] as const,
  (nextValue, previousValue) => {
    if (syncingRoute) {
      return
    }

    if (
      previousValue
      && nextValue.length === previousValue.length
      && nextValue.every((value, index) => value === previousValue[index])
    ) {
      return
    }

    corpNameQuery.value = nextValue[0] ?? ""
    customerNameQuery.value = nextValue[1] ?? ""
    customerPhoneQuery.value = nextValue[2] ?? ""
    selectedStatus.value = nextValue[3] ?? ""

    if (pageNum.value !== 1) {
      pageNum.value = 1
      return
    }

    void loadCustomers()
  },
  { immediate: true },
)

function extractDatePart(value: string) {
  const [datePart] = value.split(" ")
  return datePart ?? ""
}

function buildPageFilterText(row: CustomerRecord) {
  return [
    row.customerName,
    row.statusLabel,
    row.principalDisplay,
    row.levelLabel,
    row.business,
    row.parkCount,
    row.buildingCount,
    row.createdAt,
  ].join(" ")
}

async function loadCustomers() {
  const requestId = ++latestRequestId

  loading.value = true
  errorMessage.value = ""

  try {
    const result = await fetchCustomers({
      CorpName: corpNameQuery.value || undefined,
      CustomerName: customerNameQuery.value || undefined,
      CustomerPhone: customerPhoneQuery.value || undefined,
      Status: selectedStatus.value || undefined,
      PageNum: pageNum.value,
      PageSize: pageSize.value,
    })

    if (requestId !== latestRequestId) {
      return
    }

    total.value = result.total
    customers.value = result.list.map((item, index) => normalizeCustomerRecord(item, index))

    const maxPage = Math.max(1, Math.ceil((result.total || 0) / pageSize.value))

    if (pageNum.value > maxPage) {
      pageNum.value = maxPage
      return
    }
  } catch (error) {
    if (requestId !== latestRequestId) {
      return
    }

    customers.value = []
    total.value = 0
    errorMessage.value = handleApiError(error, {
      mode: "silent",
      fallback: "客户列表加载失败，请稍后重试。",
    })
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

  const items = await fetchAllPaginatedListItems(({ PageNum, PageSize }) => fetchCustomers({
    CorpName: corpNameQuery.value || undefined,
    CustomerName: customerNameQuery.value || undefined,
    CustomerPhone: customerPhoneQuery.value || undefined,
    Status: selectedStatus.value || undefined,
    PageNum,
    PageSize,
  }))

  const rows = items.map((item, index) => normalizeCustomerRecord(item, index)).sort(compareCustomerRows)
  const activeTab = page.selectedTab.value

  return activeTab === "all" ? rows : rows.filter(row => row.levelLabel === activeTab)
}

async function loadCustomerLevelTabOptions() {
  try {
    const result = await fetchBusinessPresetEntryOptions(["customerLevel"])
    const levels = result.customerLevel
      ?.map(item => item.name.trim())
      .filter(Boolean) ?? []

    customerLevelTabOptions.value = Array.from(new Set(["未评级", ...levels]))
  } catch {
    customerLevelTabOptions.value = ["未评级"]
  }
}

function formatLevelLabel(level: string) {
  if (!level) {
    return "未评级"
  }

  return level
}

function formatCustomerStatus(status: number | null) {
  if (status === 1) {
    return "正常"
  }

  if (status === 2) {
    return "封禁"
  }

  if (status === 3) {
    return "未完善"
  }

  return "未填写"
}

function normalizeCustomerRecord(
  item: CustomerListItem,
  index: number,
): CustomerRecord {
  const customerName = getDirectCustomerName(item)
  const principalName = toText(item.PrincipalName, "-")
  const principalPhone = toText(item.PrincipalPhone, "-")
  const status = getFirstNumber(item, ["Status", "status"])
  const parkCountValue = getFirstNumber(item, ["ParkNum", "ParkCount", "ParksCount"])
  const buildingCountValue = getFirstNumber(item, ["BuildNum", "BuildingNum", "BuildCount"])
  const createdAt = toText(item.CreatedAt, "-")
  const detailId = getCustomerUuid(item)

  return {
    id: detailId || `${pageNum.value}-${index + 1}-${principalPhone}-${customerName}`,
    detailId,
    customerName: customerName || "未命名客户",
    status,
    statusLabel: formatCustomerStatus(status),
    business: getFirstText(item, ["Business", "Industry", "IndustryName"], "未填写"),
    level: getLevelValue(item),
    levelLabel: formatLevelLabel(getLevelValue(item)),
    principalName,
    principalPhone,
    principalDisplay: [principalName, principalPhone].filter(value => value && value !== "-").join(" "),
    parkCount: parkCountValue === null ? "-" : String(parkCountValue),
    parkCountValue,
    buildingCount: buildingCountValue === null ? "-" : String(buildingCountValue),
    buildingCountValue,
    createdAt,
  }
}

function getLevelValue(item: CustomerListItem) {
  return getFirstText(item, ["Level", "CustomerLevel", "LevelLabel", "CustomerLevelLabel", "LevelName"], "")
}

function getCustomerUuid(item: CustomerListItem) {
  return getFirstText(item, ["Uuid", "uuid", "CustomerUuid"], "")
}

function getDirectCustomerName(item: CustomerListItem) {
  return getFirstText(item, ["CorpName", "CustomerName", "Name", "CompanyName"], "")
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

function getFirstNumber(
  record: Record<string, unknown>,
  keys: string[],
  fallback?: number | null,
) {
  for (const key of keys) {
    const value = toNumber(record[key])

    if (value !== null) {
      return value
    }
  }

  return typeof fallback === "number" && Number.isFinite(fallback) ? fallback : null
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

  if (!text) {
    return null
  }

  const timestamp = new Date(text.replace(" ", "T")).getTime()
  return Number.isFinite(timestamp) ? timestamp : null
}

function compareCustomerRows(left: CustomerRecord, right: CustomerRecord) {
  const leftValue = toTimestamp(left.createdAt) ?? 0
  const rightValue = toTimestamp(right.createdAt) ?? 0

  if (leftValue === rightValue) {
    return left.customerName.localeCompare(right.customerName, "zh-CN")
  }

  return sortDirection.value === "asc" ? leftValue - rightValue : rightValue - leftValue
}

function handleCreateCustomer() {
  router.push({ name: "customer-create" })
}

function handleToolbarSortToggle() {
  sortDirection.value = sortDirection.value === "asc" ? "desc" : "asc"
}

function handleQueryChange(payload: { key: string; value: string | string[] }) {
  const value = typeof payload.value === "string" ? payload.value.trim() : ""

  if (payload.key === "corpName") {
    corpNameQuery.value = value
  } else if (payload.key === "customerName") {
    customerNameQuery.value = value
  } else if (payload.key === "customerPhone") {
    customerPhoneQuery.value = value
  } else if (payload.key === "status") {
    selectedStatus.value = value
  } else {
    return
  }

  void syncRouteQueryAndReload()
}

function handleQueryClear() {
  if (!corpNameQuery.value && !customerNameQuery.value && !customerPhoneQuery.value && !selectedStatus.value) {
    return
  }

  corpNameQuery.value = ""
  customerNameQuery.value = ""
  customerPhoneQuery.value = ""
  selectedStatus.value = ""
  void syncRouteQueryAndReload()
}

async function syncRouteQueryAndReload() {
  syncingRoute = true

  try {
    await router.replace({
      query: {
        ...route.query,
        q: corpNameQuery.value || undefined,
        customerName: customerNameQuery.value || undefined,
        customerPhone: customerPhoneQuery.value || undefined,
        status: selectedStatus.value || undefined,
      },
    })
  } finally {
    syncingRoute = false
  }

  if (pageNum.value !== 1) {
    pageNum.value = 1
    return
  }

  await loadCustomers()
}

function normalizeQueryValue(value: unknown) {
  if (Array.isArray(value)) {
    return normalizeQueryValue(value[0])
  }

  return typeof value === "string" ? value.trim() : ""
}

function handleLinkedDetailSheetOpenChange(open: boolean) {
  if (!open) {
    activeLinkedDetailKind.value = null
    activeLinkedDetailUuid.value = ""
  }
}

</script>

<template>
  <section class="flex min-h-0 flex-1 flex-col">
    <div v-if="errorMessage" class="px-4 pb-3 pt-3">
      <Alert variant="destructive">
        <i class="ri-error-warning-line" />
        <AlertTitle>客户接口加载失败</AlertTitle>
        <AlertDescription class="flex flex-wrap items-center gap-3">
          <span>{{ errorMessage }}</span>
          <Button size="sm" variant="outline" class="gap-2" @click="loadCustomers">
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
      @refresh-action="loadCustomers"
      @primary-action="handleCreateCustomer"
      @toolbar-sort-toggle="handleToolbarSortToggle"
      @query-change="handleQueryChange"
      @query-clear="handleQueryClear"
    >
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

    <LinkedEntityDetailSheet
      :open="Boolean(activeLinkedDetailKind) && Boolean(activeLinkedDetailUuid)"
      :kind="activeLinkedDetailKind"
      :uuid="activeLinkedDetailUuid"
      @update:open="handleLinkedDetailSheetOpenChange"
    />
  </section>
</template>
