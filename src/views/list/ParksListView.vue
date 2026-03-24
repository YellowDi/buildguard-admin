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
import { fetchParks, type ParkListItem } from "@/lib/parks-api"
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

type ParkRecord = {
  id: string
  uuid: string
  customerUuid: string
  name: string
  builtTime: string
  operationTime: string
  buildingArea: string
  contactPerson: string
  contactPhone: string
  address: string
  createdAt: string
  updatedAt: string
}

const parks = ref<ParkRecord[]>([])
const loading = ref(false)
const errorMessage = ref("")
const pageNum = ref(1)
const pageSize = ref(10)
const total = ref(0)
const route = useRoute()
const showInitialLoading = computed(() => loading.value && !parks.value.length && !errorMessage.value)
let latestRequestId = 0

const schema: TablePageSchema<ParkRecord> = {
  title: "园区",
  description: "所有客户园区列表",
  rowKey: "uuid",
  data: [],
  showIndex: true,
  stickyHeader: true,
  emptyState: {
    title: "暂无园区数据",
    description: "当前接口暂未返回可展示的园区列表。",
    icon: "ri-community-line",
  },
  columns: [
    {
      key: "name",
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
      key: "contactPerson",
      label: "园区联系人",
      filterType: "contact",
      variant: "contact",
      filter: {
        type: "text",
        placeholder: "输入联系人或手机号",
        defaultVisible: true,
        value: row => `${row.contactPerson} ${row.contactPhone}`,
      },
      sort: {
        label: "园区联系人",
        value: row => `${row.contactPerson} ${row.contactPhone}`,
      },
      cellRenderer: {
        kind: "dual-inline",
        primaryKey: "contactPerson",
        secondaryKey: "contactPhone",
      },
    },
    {
      key: "address",
      label: "园区地址",
      filterType: "text",
      width: "fill",
      filter: {
        type: "text",
        placeholder: "输入园区地址",
      },
      sort: true,
    },
    {
      key: "buildingArea",
      label: "建筑面积",
      filterType: "text",
      filter: {
        type: "text",
        placeholder: "输入建筑面积",
      },
      sort: true,
    },
    {
      key: "builtTime",
      label: "建成时间",
      filterType: "time",
      format: "numeric",
      filter: {
        type: "date",
      },
      sort: true,
    },
    {
      key: "operationTime",
      label: "投运时间",
      filterType: "time",
      format: "numeric",
      filter: {
        type: "date",
      },
      sort: true,
    },
    {
      key: "updatedAt",
      label: "更新时间",
      filterType: "time",
      format: "numeric",
      filter: {
        type: "date",
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
}

const page = useTablePage({
  ...createTablePageDefinition(schema),
  rows: parks,
})

useRouteTableSearch(page, route)

watch([pageNum, pageSize], ([nextPageNum, nextPageSize], [previousPageNum, previousPageSize]) => {
  if (nextPageNum === previousPageNum && nextPageSize === previousPageSize) {
    return
  }

  void loadParks()
}, { immediate: true })

function buildPageFilterText(row: ParkRecord) {
  return [
    row.name,
    row.contactPerson,
    row.contactPhone,
    row.address,
    row.buildingArea,
    row.builtTime,
    row.operationTime,
    row.customerUuid,
    row.createdAt,
    row.updatedAt,
  ].join(" ")
}

async function loadParks() {
  const requestId = ++latestRequestId

  loading.value = true
  errorMessage.value = ""

  try {
    const result = await fetchParks({
      PageNum: pageNum.value,
      PageSize: pageSize.value,
    })

    if (requestId !== latestRequestId) {
      return
    }

    total.value = result.total
    parks.value = result.list.map((item, index) => normalizeParkRecord(item, index))

    const maxPage = Math.max(1, Math.ceil((result.total || 0) / pageSize.value))

    if (pageNum.value > maxPage) {
      pageNum.value = maxPage
      return
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

function normalizeParkRecord(item: ParkListItem, index: number): ParkRecord {
  const uuid = toText(item.Uuid)
  const fallbackId = toText(item.Id, `${pageNum.value}-${index + 1}`)
  const name = toText(item.Name, "未命名园区")
  const contactPerson = toText(item.ContactPerson, "未填写")
  const contactPhone = toText(item.ContactPhone, "-")

  return {
    id: uuid || fallbackId,
    uuid: uuid || fallbackId,
    customerUuid: toText(item.CustomerUuid, "-"),
    name,
    builtTime: toText(item.BuiltTime, "-"),
    operationTime: toText(item.OperationTime, "-"),
    buildingArea: toText(item.BuildingArea, "-"),
    contactPerson,
    contactPhone,
    address: toText(item.Address, "-"),
    createdAt: toText(item.CreatedAt, "-"),
    updatedAt: toText(item.UpdatedAt, "-"),
  }
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
</script>

<template>
  <TablePageLoading v-if="showInitialLoading" />

  <section v-else class="flex min-h-0 flex-1 flex-col">
    <div v-if="errorMessage" class="px-4 pb-3 pt-3">
      <Alert variant="destructive">
        <i class="ri-error-warning-line" />
        <AlertTitle>园区接口加载失败</AlertTitle>
        <AlertDescription class="flex flex-wrap items-center gap-3">
          <span>{{ errorMessage }}</span>
          <Button size="sm" variant="outline" @click="loadParks">
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
