<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import { useRoute, useRouter } from "vue-router"
import { toast } from "vue-sonner"

import TablePageLoading from "@/components/loading/TablePageLoading.vue"
import TablePage from "@/components/table-page/TablePage.vue"
import { createTablePageDefinition, useTablePage } from "@/components/table-page/useTablePage"
import type { TablePageSchema } from "@/components/table-page/types"
import { useRouteTableSearch } from "@/composables/useRouteTableSearch"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { handleApiError } from "@/lib/api-errors"
import { fetchBuildings } from "@/lib/buildings-api"
import { fetchCustomers } from "@/lib/customers-api"
import { fetchParks } from "@/lib/parks-api"

type BuildingRecord = {
  id: string
  uuid: string
  parkUuid: string
  customerUuid: string
  customerName: string
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

const buildings = ref<BuildingRecord[]>([])
const loading = ref(false)
const errorMessage = ref("")

const router = useRouter()
const route = useRoute()
const showInitialLoading = computed(() => loading.value && !buildings.value.length && !errorMessage.value)

const schema: TablePageSchema<BuildingRecord> = {
  title: "建筑",
  description: "所有客户建筑资产列表",
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
      key: "customerName",
      label: "所属客户",
      filterType: "text",
      filter: {
        type: "text",
        placeholder: "输入客户名称",
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "parkName",
      label: "所属园区",
      filterType: "text",
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

onMounted(() => {
  void loadBuildings()
})

function handleCreateBuilding() {
  void router.push({ name: "building-create" })
}

async function loadBuildings() {
  loading.value = true
  errorMessage.value = ""

  try {
    const [buildingsResult, parksResult, customersResult] = await Promise.all([
      fetchBuildings({ PageNum: 1, PageSize: 1000 }),
      fetchParks({ PageNum: 1, PageSize: 1000 }),
      fetchCustomers({ PageNum: 1, PageSize: 1000 }),
    ])

    const customerNameByUuid = new Map(
      customersResult.list.map(item => [toText(item.Uuid), toText(item.CorpName, "未关联客户")]),
    )
    const parkMetaByUuid = new Map(
      parksResult.list.map(item => [
        toText(item.Uuid),
        {
          customerUuid: toText(item.CustomerUuid),
          parkName: toText(item.Name, "未命名园区"),
        },
      ]),
    )

    buildings.value = buildingsResult.list.map((item, index) => {
      const uuid = toText(item.Uuid, `building-${index + 1}`)
      const parkUuid = toText(item.ParkUuid)
      const parkMeta = parkMetaByUuid.get(parkUuid)
      const buildingAreaValue = parseAreaValue(item.BuildingArea ?? item.BuildArea)

      return {
        id: uuid,
        uuid,
        parkUuid,
        customerUuid: parkMeta?.customerUuid ?? "",
        customerName: customerNameByUuid.get(parkMeta?.customerUuid ?? "") ?? "未关联客户",
        parkName: toText(item.ParkName, parkMeta?.parkName ?? "未关联园区"),
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
  } catch (error) {
    errorMessage.value = handleApiError(error, {
      mode: "silent",
      fallback: "建筑列表加载失败，请稍后重试。",
    })
  } finally {
    loading.value = false
  }
}

function buildPageFilterText(row: BuildingRecord) {
  return [
    row.buildingName,
    row.customerName,
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
  <div class="space-y-4">
    <TablePageLoading v-if="showInitialLoading" />

    <Alert v-else-if="errorMessage" variant="destructive">
      <AlertTitle>建筑列表加载失败</AlertTitle>
      <AlertDescription>{{ errorMessage }}</AlertDescription>
    </Alert>

    <TablePage v-else :page="page" @primary-action="handleCreateBuilding" />
  </div>
</template>
