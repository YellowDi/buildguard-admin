<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { toast } from "vue-sonner"

import BuildingDetailSheet from "@/components/detail/BuildingDetailSheet.vue"
import LinkedEntityDetailSheet from "@/components/detail/LinkedEntityDetailSheet.vue"
import TablePage from "@/components/table-page/TablePage.vue"
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
import { fetchBuildings } from "@/lib/buildings-api"

type BuildingRecord = {
  id: string
  uuid: string
  parkUuid: string
  parkName: string
  buildingName: string
  builtTime: string
  operationTime: string
  buildingArea: string
  buildingAreaValue: number | null
  contactName: string
  contactPhone: string
  address: string
  updatedAt: string
}

type LinkedDetailSheetKind = "park"

const buildings = ref<BuildingRecord[]>([])
const loading = ref(false)
const errorMessage = ref("")
const pageNum = ref(1)
const pageSize = ref(50)
const total = ref(0)
const activeLinkedDetailKind = ref<LinkedDetailSheetKind | null>(null)
const activeLinkedDetailUuid = ref("")
const activeLinkedDetailCustomerUuid = ref("")
const buildingDetailSheetOpen = ref(false)
const activeBuildingSheetUuid = ref("")
const activeBuildingSheetParkUuid = ref("")
let latestRequestId = 0

const router = useRouter()
const route = useRoute()
const schema: TablePageSchema<BuildingRecord> = {
  title: "建筑",
  description: "查看所有建筑的检测情况，了解评分、状态和存在的问题",
  rowKey: "uuid",
  data: [],
  primaryActionLabel: "添加建筑",
  showIndex: true,
  stickyHeader: true,
  emptyState: {
    title: "暂无建筑数据",
    description: "当前还没有可展示的建筑资产。",
    icon: "ri-building-line",
  },
  rowActions: [
    {
      key: "view-detail",
      label: "查看详情",
      onClick: row => {
        if (!row.parkUuid) {
          toast.error("当前建筑缺少所属园区，无法打开详情")
          return
        }

        void router.push({
          name: "building-detail",
          params: { id: row.uuid },
          query: { parkUuid: row.parkUuid },
        })
      },
    },
  ],
  onRowClick: row => {
    if (!row.uuid) {
      toast.error("当前建筑缺少 Uuid，无法打开详情")
      return
    }

    if (!row.parkUuid) {
      toast.error("当前建筑缺少所属园区，无法打开详情")
      return
    }

    void router.push({
      name: "building-detail",
      params: { id: row.uuid },
      query: { parkUuid: row.parkUuid },
    })
  },
  onQuickAction: row => {
    if (!row.uuid || !row.parkUuid) {
      toast.error("当前建筑缺少必要参数，无法打开侧边详情")
      return
    }

    activeBuildingSheetUuid.value = row.uuid
    activeBuildingSheetParkUuid.value = row.parkUuid
    buildingDetailSheetOpen.value = true
  },
  columns: [
    {
      key: "buildingName",
      label: "建筑名称",
      filterType: "text",
      emphasis: "strong",
      tone: "primary",
      filter: {
        type: "text",
        placeholder: "输入建筑名称",
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "parkName",
      label: "所属园区",
      filterType: "text",
      slot: "cell-parkName",
      filter: {
        type: "text",
        placeholder: "输入园区名称",
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "buildingArea",
      label: "建筑面积",
      filterType: "number",
      variant: "metric",
      filter: {
        type: "number",
        placeholder: "输入建筑面积",
        value: row => row.buildingAreaValue ?? "",
      },
      sort: {
        label: "建筑面积",
        kind: "metric",
        value: row => row.buildingAreaValue ?? -1,
      },
      cellRenderer: {
        kind: "metric-unit",
        valueKey: "buildingAreaValue",
        unit: "㎡",
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
    storageKey: "buildings-sort-preferences",
    initialField: "updatedAt",
    initialDirection: "desc",
  },
  tabs: {
    mode: "none",
  },
}

const page = useTablePage({
  ...createTablePageDefinition(schema),
  rows: buildings,
})

useRouteTableSearch(page, route)

watch([pageNum, pageSize], ([nextPageNum, nextPageSize], [previousPageNum, previousPageSize]) => {
  if (nextPageNum === previousPageNum && nextPageSize === previousPageSize) {
    return
  }

  void loadBuildings()
}, { immediate: true })

function handleCreateBuilding() {
  void router.push({ name: "building-create" })
}

function handleOpenParkDetail(row: unknown) {
  const currentRow = row as BuildingRecord

  if (!currentRow.parkUuid) {
    toast.error("当前建筑缺少所属园区信息，无法打开详情")
    return
  }

  activeLinkedDetailKind.value = "park"
  activeLinkedDetailUuid.value = currentRow.parkUuid
  activeLinkedDetailCustomerUuid.value = ""
}

function handleLinkedDetailSheetOpenChange(open: boolean) {
  if (!open) {
    activeLinkedDetailKind.value = null
    activeLinkedDetailUuid.value = ""
    activeLinkedDetailCustomerUuid.value = ""
  }
}

function handleBuildingDetailSheetOpenChange(open: boolean) {
  buildingDetailSheetOpen.value = open

  if (!open) {
    activeBuildingSheetUuid.value = ""
    activeBuildingSheetParkUuid.value = ""
  }
}

async function loadBuildings() {
  const requestId = ++latestRequestId

  loading.value = true
  errorMessage.value = ""

  try {
    const buildingsResult = await fetchBuildings({ PageNum: pageNum.value, PageSize: pageSize.value })

    if (requestId !== latestRequestId) {
      return
    }

    total.value = buildingsResult.total
    buildings.value = buildingsResult.list.map((item, index) => {
      const uuid = toText(item.Uuid, `building-${index + 1}`)
      const parkUuid = toText(item.ParkUuid)
      const buildingAreaValue = parseAreaValue(item.BuildingArea ?? item.BuildArea)

      return {
        id: uuid,
        uuid,
        parkUuid,
        parkName: toText(item.ParkName, "未关联园区"),
        buildingName: toText(item.Name, "未命名建筑"),
        builtTime: toText(item.BuiltTime, "-"),
        operationTime: toText(item.OperationTime, "-"),
        buildingArea: buildingAreaValue === null ? "-" : String(buildingAreaValue),
        buildingAreaValue,
        contactName: toText(item.ContactPerson ?? item.Contact, "未填写"),
        contactPhone: toText(item.ContactPhone, "-"),
        address: toText(item.Address, "-"),
        updatedAt: toText(item.UpdatedAt || item.CreatedAt, "-"),
      }
    })

    const maxPage = Math.max(1, Math.ceil((buildingsResult.total || 0) / pageSize.value))

    if (pageNum.value > maxPage) {
      pageNum.value = maxPage
    }
  } catch (error) {
    if (requestId !== latestRequestId) {
      return
    }

    buildings.value = []
    total.value = 0
    errorMessage.value = handleApiError(error, {
      mode: "silent",
      fallback: "建筑列表加载失败，请稍后重试。",
    })
  } finally {
    if (requestId === latestRequestId) {
      loading.value = false
    }
  }
}

function buildPageFilterText(row: BuildingRecord) {
  return [
    row.buildingName,
    row.parkName,
    row.buildingArea,
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

function toText(value: unknown, fallback = "") {
  if (typeof value === "string" && value.trim()) {
    return value.trim()
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }

  return fallback
}
</script>

<template>
  <section class="flex min-h-0 flex-1 flex-col">
    <div v-if="errorMessage" class="px-4 pb-3 pt-3">
      <Alert variant="destructive">
        <AlertTitle>建筑列表加载失败</AlertTitle>
        <AlertDescription class="flex flex-wrap items-center gap-3">
          <span>{{ errorMessage }}</span>
          <Button size="sm" variant="outline" class="gap-2" @click="loadBuildings">
            <i class="ri-refresh-line text-sm" />
            重试
          </Button>
        </AlertDescription>
      </Alert>
    </div>

    <TablePage :page="page" :loading="loading" fill-available-height @primary-action="handleCreateBuilding">
      <template #cell-parkName="{ row }">
        <button
          type="button"
          class="inline-flex max-w-full items-center gap-1 text-left text-[#2B67F6] transition-colors hover:text-[#1D4ED8]"
          @click="handleOpenParkDetail(row)"
        >
          <span class="truncate">{{ row.parkName }}</span>
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

    <BuildingDetailSheet
      :open="buildingDetailSheetOpen"
      :building-uuid="activeBuildingSheetUuid"
      :park-uuid="activeBuildingSheetParkUuid"
      @update:open="handleBuildingDetailSheetOpenChange"
    />
  </section>
</template>
