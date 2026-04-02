<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import { useRoute, useRouter } from "vue-router"

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

type ParkRecord = {
  id: string
  uuid: string
  customerUuid: string
  customerName: string
  parkName: string
  builtTime: string
  operationTime: string
  buildArea: string
  buildAreaValue: number | null
  buildingCount: number
  contactName: string
  contactPhone: string
  address: string
  updatedAt: string
}

const parks = ref<ParkRecord[]>([])
const loading = ref(false)
const errorMessage = ref("")

const router = useRouter()
const route = useRoute()
const showInitialLoading = computed(() => loading.value && !parks.value.length && !errorMessage.value)

const schema: TablePageSchema<ParkRecord> = {
  title: "园区",
  description: "所有客户园区资产列表",
  rowKey: "uuid",
  data: [],
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
        defaultVisible: true,
      },
      sort: {
        kind: "metric",
      },
      cellRenderer: {
        kind: "metric-unit",
        unit: "栋",
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

const page = useTablePage({
  ...createTablePageDefinition(schema),
  rows: parks,
})

useRouteTableSearch(page, route)

onMounted(() => {
  void loadParks()
})

async function loadParks() {
  loading.value = true
  errorMessage.value = ""

  try {
    const [parksResult, customersResult, buildingsResult] = await Promise.all([
      fetchParks({ PageNum: 1, PageSize: 1000 }),
      fetchCustomers({ PageNum: 1, PageSize: 1000 }),
      fetchBuildings({ PageNum: 1, PageSize: 1000 }),
    ])

    const customerNameByUuid = new Map(
      customersResult.list.map(item => [toText(item.Uuid), toText(item.CorpName, "未关联客户")]),
    )
    const buildingCountByParkUuid = new Map<string, number>()

    for (const item of buildingsResult.list) {
      const parkUuid = toText(item.ParkUuid)

      if (!parkUuid) {
        continue
      }

      buildingCountByParkUuid.set(parkUuid, (buildingCountByParkUuid.get(parkUuid) ?? 0) + 1)
    }

    parks.value = parksResult.list.map((item, index) => {
      const uuid = toText(item.Uuid, `park-${index + 1}`)
      const buildAreaValue = parseAreaValue(item.BuildArea)

      return {
        id: uuid,
        uuid,
        customerUuid: toText(item.CustomerUuid),
        customerName: customerNameByUuid.get(toText(item.CustomerUuid)) ?? "未关联客户",
        parkName: toText(item.Name, "未命名园区"),
        builtTime: toText(item.BuiltTime, "-"),
        operationTime: toText(item.OperationTime, "-"),
        buildArea: buildAreaValue === null ? "-" : String(buildAreaValue),
        buildAreaValue,
        buildingCount: buildingCountByParkUuid.get(uuid) ?? 0,
        contactName: toText(item.Contact, "未填写"),
        contactPhone: toText(item.ContactPhone, "-"),
        address: toText(item.Address, "-"),
        updatedAt: toText(item.UpdatedAt || item.CreatedAt, "-"),
      }
    })
  } catch (error) {
    errorMessage.value = handleApiError(error, {
      mode: "silent",
      fallback: "园区列表加载失败，请稍后重试。",
    })
  } finally {
    loading.value = false
  }
}

function buildPageFilterText(row: ParkRecord) {
  return [
    row.parkName,
    row.customerName,
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
      <AlertTitle>园区列表加载失败</AlertTitle>
      <AlertDescription>{{ errorMessage }}</AlertDescription>
    </Alert>

    <TablePage v-else :page="page" />
  </div>
</template>
