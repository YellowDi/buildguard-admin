<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"

import TablePage from "@/components/table-page/TablePage.vue"
import TablePageLoading from "@/components/loading/TablePageLoading.vue"
import { createTablePageDefinition, useTablePage } from "@/components/table-page/useTablePage"
import type { TablePageSchema } from "@/components/table-page/types"
import { useRouteTableSearch } from "@/composables/useRouteTableSearch"
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
import { fetchCustomers, type CustomerListItem } from "@/lib/customers-api"

type CustomerRecord = {
  id: string
  detailId: string
  business: string
  level: number | null
  levelLabel: string
  principalName: string
  principalPhone: string
}

const customers = ref<CustomerRecord[]>([])
const loading = ref(false)
const errorMessage = ref("")
const pageNum = ref(1)
const pageSize = ref(10)
const total = ref(0)
let latestRequestId = 0

const schema: TablePageSchema<CustomerRecord> = {
  title: "客户",
  description: "所有客户资料列表",
  rowKey: "id",
  data: [],
  showIndex: true,
  stickyHeader: true,
  emptyState: {
    title: "暂无客户数据",
    description: "当前接口暂未返回可展示的客户列表。",
    icon: "ri-customer-service-2-line",
  },
  rowActions: [
    {
      key: "view-detail",
      label: "查看详情",
      onClick: row => router.push({ name: "customer-detail", params: { id: row.detailId } }),
    },
  ],
  columns: [
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
      key: "levelLabel",
      label: "客户等级",
      filterType: "tag",
      filter: {
        type: "tag",
        defaultVisible: true,
      },
      sort: {
        label: "客户等级",
        kind: "metric",
        value: row => row.level ?? -1,
      },
    },
    {
      key: "principalName",
      label: "责任人名称",
      filterType: "contact",
      variant: "contact",
      width: "fill",
      filter: {
        type: "text",
        label: "责任人",
        placeholder: "输入责任人名称",
        defaultVisible: true,
        value: row => `${row.principalName} ${row.principalPhone}`,
      },
      sort: true,
      cellRenderer: {
        kind: "dual-inline",
        primaryKey: "principalName",
        secondaryKey: "principalPhone",
        primaryClass: "text-foreground",
        secondaryClass: "text-muted-foreground",
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
    storageKey: "customers-sort-preferences",
    initialField: "levelLabel",
    initialDirection: "desc",
  },
  tabs: {
    mode: "enum",
    all: { label: "全部", value: "all" },
    field: "levelLabel",
  },
}

const page = useTablePage({
  ...createTablePageDefinition(schema),
  primaryActionLabel: "添加客户",
  rows: customers,
})
const route = useRoute()
const router = useRouter()
const showInitialLoading = computed(() => loading.value && !customers.value.length && !errorMessage.value)

useRouteTableSearch(page, route)

watch([pageNum, pageSize], ([nextPageNum, nextPageSize], [previousPageNum, previousPageSize]) => {
  if (nextPageNum === previousPageNum && nextPageSize === previousPageSize) {
    return
  }

  void loadCustomers()
}, { immediate: true })

function buildPageFilterText(row: CustomerRecord) {
  return [
    row.principalName,
    row.principalPhone,
    row.levelLabel,
    row.business,
  ].join(" ")
}

async function loadCustomers() {
  const requestId = ++latestRequestId

  loading.value = true
  errorMessage.value = ""

  try {
    const result = await fetchCustomers({
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

function normalizeCustomerRecord(item: CustomerListItem, index: number): CustomerRecord {
  const level = typeof item.Level === "number" && Number.isFinite(item.Level) ? item.Level : null
  const business = toText(item.Business, "未填写")
  const principalName = toText(item.PrincipalName, "未填写")
  const principalPhone = toText(item.PrincipalPhone, "-")
  const detailId = resolveCustomerDetailId(item, index, principalName, principalPhone)

  return {
    id: `${pageNum.value}-${index + 1}-${principalPhone}-${principalName}`,
    detailId,
    business,
    level,
    levelLabel: formatLevelLabel(level),
    principalName,
    principalPhone,
  }
}

function resolveCustomerDetailId(
  item: CustomerListItem,
  index: number,
  principalName: string,
  principalPhone: string,
) {
  const candidates = [
    item.Uuid,
    item.uuid,
    item.Id,
    item.id,
    item.CustomerId,
    item.customerId,
  ]

  for (const candidate of candidates) {
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return String(candidate)
    }

    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim()
    }
  }

  return `${pageNum.value}-${index + 1}-${principalPhone}-${principalName}`
}

function formatLevelLabel(level: number | null) {
  if (level === null) {
    return "未评级"
  }

  return `等级 ${level}`
}

function toText(value: unknown, fallback = "") {
  if (typeof value === "string" && value.trim()) {
    return value.trim()
  }

  return fallback
}

function handleCreateCustomer() {
  router.push({ name: "customer-create" })
}

</script>

<template>
  <TablePageLoading v-if="showInitialLoading" />

  <section v-else class="flex min-h-0 flex-1 flex-col">
    <div v-if="errorMessage" class="px-4 pb-3 pt-3">
      <Alert variant="destructive">
        <i class="ri-error-warning-line" />
        <AlertTitle>客户接口加载失败</AlertTitle>
        <AlertDescription class="flex flex-wrap items-center gap-3">
          <span>{{ errorMessage }}</span>
          <Button size="sm" variant="outline" @click="loadCustomers">
            重试
          </Button>
        </AlertDescription>
      </Alert>
    </div>

    <TablePage :page="page" @primary-action="handleCreateCustomer" />

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
