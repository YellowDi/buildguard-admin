<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { toast } from "vue-sonner"

import LinkedEntityDetailSheet from "@/components/detail/LinkedEntityDetailSheet.vue"
import TablePage from "@/components/table-page/TablePage.vue"
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
import { fetchCustomers } from "@/lib/customers-api"
import { fetchParks } from "@/lib/parks-api"

type ParkRecord = {
  id: string
  uuid: string
  customerUuid: string
  customerName: string
  parkName: string
  buildingCount: string
  buildingCountValue: number | null
  builtTime: string
  operationTime: string
  buildArea: string
  buildAreaValue: number | null
  contactName: string
  contactPhone: string
  address: string
  updatedAt: string
}

type LinkedDetailSheetKind = "customer" | "park"

const parks = ref<ParkRecord[]>([])
const loading = ref(false)
const errorMessage = ref("")
const pageNum = ref(1)
const pageSize = ref(50)
const total = ref(0)
const parkNameQuery = ref("")
const selectedCustomerUuid = ref("")
const sortDirection = ref<"asc" | "desc">("desc")
const customerOptions = ref<Array<{ value: string; label: string }>>([])
const customerOptionsLoading = ref(false)
const activeLinkedDetailKind = ref<LinkedDetailSheetKind | null>(null)
const activeLinkedDetailUuid = ref("")
const activeLinkedDetailCustomerUuid = ref("")
let latestRequestId = 0
let syncingRoute = false

const router = useRouter()
const route = useRoute()
const schema: TablePageSchema<ParkRecord> = {
  title: "园区",
  description: "查看所有园区信息，快速了解园区规模和整体情况",
  rowKey: "uuid",
  data: [],
  primaryActionLabel: "添加园区",
  showIndex: true,
  stickyHeader: true,
  emptyState: {
    title: "暂无园区数据",
    description: "当前还没有可展示的园区资产。",
    icon: "ri-community-line",
  },
  rowActions: [
    {
      key: "view-detail",
      label: "查看详情",
      onClick: row => {
        void router.push({
          name: "park-detail",
          params: { id: row.uuid },
        })
      },
    },
  ],
  onRowClick: row => {
    void router.push({
      name: "park-detail",
      params: { id: row.uuid },
    })
  },
  onQuickAction: row => {
    if (!row.uuid) {
      toast.error("当前园区缺少 Uuid，无法打开侧边详情")
      return
    }

    activeLinkedDetailKind.value = "park"
    activeLinkedDetailUuid.value = row.uuid
    activeLinkedDetailCustomerUuid.value = row.customerUuid || ""
  },
  columns: [
    {
      key: "parkName",
      label: "园区名称",
      filterType: "text",
      emphasis: "strong",
      tone: "primary",
      filter: {
        type: "text",
        placeholder: "输入园区名称",
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "customerName",
      label: "所属客户",
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
      key: "buildArea",
      label: "建筑面积",
      filterType: "number",
      variant: "metric",
      filter: {
        type: "number",
        placeholder: "输入建筑面积",
        value: row => row.buildAreaValue ?? "",
      },
      sort: {
        label: "建筑面积",
        kind: "metric",
        value: row => row.buildAreaValue ?? -1,
      },
      cellRenderer: {
        kind: "metric-unit",
        valueKey: "buildAreaValue",
        unit: "㎡",
      },
    },
    {
      key: "buildingCount",
      label: "建筑数量",
      filterType: "number",
      variant: "metric",
      filter: {
        type: "number",
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
      key: "contactName",
      label: "联系人",
      filterType: "contact",
      variant: "contact",
      filter: {
        type: "text",
        placeholder: "输入联系人或手机号",
        defaultVisible: true,
        value: row => `${row.contactName} ${row.contactPhone}`,
      },
      sort: {
        label: "联系人",
        value: row => `${row.contactName} ${row.contactPhone}`,
      },
      cellRenderer: {
        kind: "dual-inline",
        primaryKey: "contactName",
        secondaryKey: "contactPhone",
      },
    },
    {
      key: "builtTime",
      label: "建成时间",
      filterType: "time",
      tone: "muted",
      format: "numeric",
      filter: {
        type: "date",
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "operationTime",
      label: "投运时间",
      filterType: "time",
      tone: "muted",
      format: "numeric",
      filter: {
        type: "date",
      },
      sort: true,
    },
    {
      key: "address",
      label: "地址",
      filterType: "text",
      width: "fill",
      filter: {
        type: "text",
        placeholder: "输入地址",
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
    storageKey: "parks-sort-preferences",
    initialField: "updatedAt",
    initialDirection: "desc",
  },
  tabs: {
    mode: "none",
  },
}

const sortedParks = computed(() => {
  return [...parks.value].sort((left, right) => {
    const leftValue = Date.parse(left.updatedAt)
    const rightValue = Date.parse(right.updatedAt)

    if (Number.isFinite(leftValue) && Number.isFinite(rightValue) && leftValue !== rightValue) {
      return sortDirection.value === "asc" ? leftValue - rightValue : rightValue - leftValue
    }

    return left.parkName.localeCompare(right.parkName, "zh-CN")
  })
})

const page = useTablePage({
  ...createTablePageDefinition(schema),
  rows: sortedParks,
})
page.showControls.value = true
page.customSortEnabled.value = false

const queryBar = computed<TableQueryBarConfig>(() => ({
  controls: [
    {
      type: "search",
      key: "q",
      queryKey: "q",
      label: "园区名称",
      icon: "ri-text",
      placeholder: "输入园区名称搜索",
      value: parkNameQuery.value,
      expandedWidth: 248,
      collapsedMaxWidth: 248,
    },
    {
      type: "select",
      key: "customerUuid",
      queryKey: "customerUuid",
      label: "所属客户",
      icon: "ri-price-tag-3-line",
      value: selectedCustomerUuid.value,
      loading: customerOptionsLoading.value,
      options: customerOptions.value,
      expandedWidth: 248,
      collapsedMaxWidth: 248,
      placeholder: customerOptionsLoading.value ? "正在加载客户..." : "请选择客户",
    },
  ],
  values: {
    q: parkNameQuery.value,
    customerUuid: selectedCustomerUuid.value,
  },
  canClear: Boolean(parkNameQuery.value || selectedCustomerUuid.value),
}))

watch([pageNum, pageSize], ([nextPageNum, nextPageSize], [previousPageNum, previousPageSize]) => {
  if (nextPageNum === previousPageNum && nextPageSize === previousPageSize) {
    return
  }

  void loadParks()
})

watch(
  () => [normalizeQueryValue(route.query.q), normalizeQueryValue(route.query.customerUuid)] as const,
  ([nextQuery, nextCustomer], previousValue) => {
    const [previousQuery, previousCustomer] = previousValue ?? []

    if (syncingRoute || (previousValue && nextQuery === previousQuery && nextCustomer === previousCustomer)) {
      return
    }

    parkNameQuery.value = nextQuery
    selectedCustomerUuid.value = nextCustomer

    if (pageNum.value !== 1) {
      pageNum.value = 1
      return
    }

    void loadParks()
  },
  { immediate: true },
)

function handleCreatePark() {
  void router.push({ name: "park-create" })
}

function handleOpenCustomerDetail(row: unknown) {
  const currentRow = row as ParkRecord

  if (!currentRow.customerUuid) {
    toast.error("当前园区缺少所属客户信息，无法打开详情")
    return
  }

  activeLinkedDetailKind.value = "customer"
  activeLinkedDetailUuid.value = currentRow.customerUuid
  activeLinkedDetailCustomerUuid.value = ""
}

function handleLinkedDetailSheetOpenChange(open: boolean) {
  if (!open) {
    activeLinkedDetailKind.value = null
    activeLinkedDetailUuid.value = ""
    activeLinkedDetailCustomerUuid.value = ""
  }
}

function handleToolbarSortToggle() {
  sortDirection.value = sortDirection.value === "asc" ? "desc" : "asc"
}

function handleQueryChange(payload: { key: string; value: string | string[] }) {
  if (payload.key === "q") {
    parkNameQuery.value = typeof payload.value === "string" ? payload.value.trim() : ""
  }

  if (payload.key === "customerUuid") {
    selectedCustomerUuid.value = typeof payload.value === "string" ? payload.value.trim() : ""
  }

  void syncRouteQueryAndReload()
}

function handleQueryClear() {
  if (!parkNameQuery.value && !selectedCustomerUuid.value) {
    return
  }

  parkNameQuery.value = ""
  selectedCustomerUuid.value = ""
  void syncRouteQueryAndReload()
}

async function syncRouteQueryAndReload() {
  syncingRoute = true

  try {
    await router.replace({
      query: {
        ...route.query,
        q: parkNameQuery.value || undefined,
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

  await loadParks()
}

async function loadParks() {
  const requestId = ++latestRequestId

  loading.value = true
  errorMessage.value = ""

  try {
    const parksResult = await fetchParks({
      Name: parkNameQuery.value || undefined,
      CustomerUuid: selectedCustomerUuid.value || undefined,
      PageNum: pageNum.value,
      PageSize: pageSize.value,
    })

    if (requestId !== latestRequestId) {
      return
    }

    total.value = parksResult.total
    parks.value = parksResult.list.map((item, index) => {
      const uuid = toText(item.Uuid, `park-${index + 1}`)
      const buildAreaValue = parseAreaValue(item.BuildArea)
      const buildingCountValue = getFirstNumber(item, ["BuildNum", "BuildingNum", "BuildCount", "BuildingCount", "buildingCount"])

      return {
        id: uuid,
        uuid,
        customerUuid: toText(item.CustomerUuid),
        customerName: toText(item.CorpName, "未关联客户"),
        parkName: toText(item.Name, "未命名园区"),
        buildingCount: buildingCountValue === null ? "-" : String(buildingCountValue),
        buildingCountValue,
        builtTime: toText(item.BuiltTime, "-"),
        operationTime: toText(item.OperationTime, "-"),
        buildArea: buildAreaValue === null ? "-" : String(buildAreaValue),
        buildAreaValue,
        contactName: toText(item.Contact, "未填写"),
        contactPhone: toText(item.ContactPhone, "-"),
        address: toText(item.Address, "-"),
        updatedAt: toText(item.UpdatedAt || item.CreatedAt, "-"),
      }
    })

    const maxPage = Math.max(1, Math.ceil((parksResult.total || 0) / pageSize.value))

    if (pageNum.value > maxPage) {
      pageNum.value = maxPage
    }
  } catch (error) {
    if (requestId !== latestRequestId) {
      return
    }

    parks.value = []
    total.value = 0
    errorMessage.value = handleApiError(error, {
      mode: "silent",
      fallback: "园区列表加载失败，请稍后重试。",
    })
  } finally {
    if (requestId === latestRequestId) {
      loading.value = false
    }
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
        value: typeof item.Uuid === "string" ? item.Uuid.trim() : "",
        label: typeof item.CorpName === "string" && item.CorpName.trim() ? item.CorpName.trim() : "未命名客户",
      }))
      .filter(option => option.value)
  } catch {
    customerOptions.value = []
  } finally {
    customerOptionsLoading.value = false
  }
}

function buildPageFilterText(row: ParkRecord) {
  return [
    row.parkName,
    row.customerName,
    row.buildingCount,
    row.buildArea,
    row.contactName,
    row.contactPhone,
    row.address,
    row.builtTime,
    row.operationTime,
    row.updatedAt,
  ].join(" ")
}

function extractDatePart(value: string) {
  const [datePart] = value.split(/[ T]/)
  return datePart ?? value
}

function parseAreaValue(value: unknown) {
  const normalized = toText(value)

  if (!normalized) {
    return null
  }

  const numeric = Number(normalized.replace(/[^\d.]/g, ""))
  return Number.isFinite(numeric) ? numeric : null
}

function getFirstNumber(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key]

    if (typeof value === "number" && Number.isFinite(value)) {
      return value
    }

    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value.trim())

      if (Number.isFinite(parsed)) {
        return parsed
      }
    }
  }

  return null
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
        <AlertTitle>园区列表加载失败</AlertTitle>
        <AlertDescription class="flex flex-wrap items-center gap-3">
          <span>{{ errorMessage }}</span>
          <Button size="sm" variant="outline" class="gap-2" @click="loadParks">
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
      @refresh-action="loadParks"
      @primary-action="handleCreatePark"
      @toolbar-sort-toggle="handleToolbarSortToggle"
      @query-change="handleQueryChange"
      @query-clear="handleQueryClear"
    >
      <template #cell-customerName="{ row }">
        <button
          type="button"
          class="inline-flex max-w-full items-center gap-1 text-left text-link transition-colors hover:text-link-hover"
          @click="handleOpenCustomerDetail(row)"
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

    <LinkedEntityDetailSheet
      :open="Boolean(activeLinkedDetailKind) && Boolean(activeLinkedDetailUuid)"
      :kind="activeLinkedDetailKind"
      :uuid="activeLinkedDetailUuid"
      :customer-uuid="activeLinkedDetailCustomerUuid"
      @update:open="handleLinkedDetailSheetOpenChange"
    />
  </section>
</template>
