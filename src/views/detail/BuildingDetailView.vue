<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"

import { buildBuildingDetailSections, toText } from "@/components/detail/buildingDetailFields"
import DetailFieldsSkeleton from "@/components/loading/DetailFieldsSkeleton.vue"
import DetailRelationSkeleton from "@/components/loading/DetailRelationSkeleton.vue"
import DetailFieldSections from "@/components/detail/DetailFieldSections.vue"
import DetailRelationModule from "@/components/detail/DetailRelationModule.vue"
import MapLocationDialog from "@/components/map/MapLocationDialog.vue"
import type { DetailFieldSection, DetailRelationModuleSchema } from "@/components/detail/types"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { detailBreadcrumbItems, detailBreadcrumbTitle } from "@/composables/useDetailBreadcrumbTitle"
import DetailLayout from "@/layouts/DetailLayout.vue"
import { handleApiError } from "@/lib/api-errors"
import { fetchBuildings, type BuildingListItem } from "@/lib/buildings-api"
import { fetchRepairWorkOrders, fetchWorkOrders } from "@/lib/work-orders-api"

const route = useRoute()
const router = useRouter()

const building = ref<BuildingListItem | null>(null)
const inspectionRecords = ref<BuildingRecordRow[]>([])
const repairRecords = ref<BuildingRecordRow[]>([])
const loading = ref(false)
const errorMessage = ref("")
const recordsLoading = ref(false)
const recordsErrorMessage = ref("")
const mapDialogOpen = ref(false)
let latestRequestId = 0
let latestRecordsRequestId = 0

const buildingUuid = computed(() => typeof route.params.id === "string" ? route.params.id.trim() : "")
const parkUuid = computed(() => typeof route.query.parkUuid === "string" ? route.query.parkUuid.trim() : "")
const customerUuid = computed(() => typeof route.query.customerUuid === "string" ? route.query.customerUuid.trim() : "")

const fieldSections = computed<DetailFieldSection[]>(() => {
  return buildBuildingDetailSections(building.value, {
    onOpenMap: () => {
      mapDialogOpen.value = true
    },
  })
})

const relatedCustomerUuid = computed(() => {
  const current = building.value as (BuildingListItem & { CustomerUuid?: unknown; CorpUuid?: unknown }) | null

  return customerUuid.value
    || toText(current?.CustomerUuid, "")
    || toText(current?.CorpUuid, "")
})

const inspectionModule = computed<DetailRelationModuleSchema<BuildingRecordRow>>(() => ({
  key: "building-inspection-records",
  title: "检修记录",
  rowKey: "id",
  columns: [
    { key: "serviceName", label: "检测服务", cellClass: "truncate" },
    { key: "executor", label: "执行人", cellClass: "truncate text-muted-foreground" },
    { key: "deadline", label: "截止时间", cellClass: "truncate text-muted-foreground" },
    { key: "actions", label: "", slot: "record-action-cell", cellClass: "flex justify-end" },
  ],
  groups: [
    {
      key: "inspection",
      title: "检测工单",
      rows: inspectionRecords.value,
    },
  ],
  emptyState: {
    title: "暂无检修记录",
    description: "当前建筑还没有可展示的检测工单记录。",
    icon: "ri-file-list-3-line",
  },
  mobileMinWidth: "100%",
  columnTemplateMobile: "minmax(0,1.2fr) minmax(0,0.8fr) minmax(0,0.9fr) minmax(5rem,0.35fr)",
  columnTemplateDesktop: "minmax(0,1.2fr) minmax(0,0.8fr) minmax(0,0.9fr) minmax(5rem,0.35fr)",
  columnGapMobile: "0.75rem",
  columnGapDesktop: "1rem",
}))

const repairModule = computed<DetailRelationModuleSchema<BuildingRecordRow>>(() => ({
  key: "building-repair-records",
  title: "维修记录",
  rowKey: "id",
  columns: [
    { key: "item", label: "报修类型", cellClass: "truncate" },
    { key: "executor", label: "维修人员", cellClass: "truncate text-muted-foreground" },
    { key: "deadline", label: "创建时间", cellClass: "truncate text-muted-foreground" },
    { key: "actions", label: "", slot: "record-action-cell", cellClass: "flex justify-end" },
  ],
  groups: [
    {
      key: "repair",
      title: "维修工单",
      rows: repairRecords.value,
    },
  ],
  emptyState: {
    title: "暂无维修记录",
    description: "当前建筑还没有可展示的维修工单记录。",
    icon: "ri-hammer-line",
  },
  mobileMinWidth: "100%",
  columnTemplateMobile: "minmax(0,1.2fr) minmax(0,0.8fr) minmax(0,0.9fr) minmax(5rem,0.35fr)",
  columnTemplateDesktop: "minmax(0,1.2fr) minmax(0,0.8fr) minmax(0,0.9fr) minmax(5rem,0.35fr)",
  columnGapMobile: "0.75rem",
  columnGapDesktop: "1rem",
}))

watch(building, (current) => {
  detailBreadcrumbTitle.value = current ? "建筑详情" : null

  if (!current) {
    detailBreadcrumbItems.value = null
    return
  }

  detailBreadcrumbItems.value = [
    { title: "客户", to: "customers" },
    {
      title: "客户详情",
      ...(relatedCustomerUuid.value
        ? {
            to: {
              name: "customer-detail",
              params: { id: relatedCustomerUuid.value },
            },
          }
        : {}),
    },
    ...(parkUuid.value
      ? [{
          title: "园区详情",
          to: {
            name: "park-detail",
            params: { id: parkUuid.value },
            query: relatedCustomerUuid.value ? { customerUuid: relatedCustomerUuid.value } : undefined,
          },
        }]
      : [{
          title: "园区详情",
        }]),
    { title: "建筑详情" },
  ]
})

watch([buildingUuid, parkUuid], ([nextBuildingUuid, nextParkUuid]) => {
  void loadBuildingDetail(nextBuildingUuid, nextParkUuid)
}, { immediate: true })

onUnmounted(() => {
  detailBreadcrumbTitle.value = null
  detailBreadcrumbItems.value = null
})

function goBack() {
  if (parkUuid.value) {
    void router.push({
      name: "park-detail",
      params: { id: parkUuid.value },
      query: customerUuid.value ? { customerUuid: customerUuid.value } : undefined,
    })
    return
  }

  if (customerUuid.value) {
    void router.push({
      name: "customer-detail",
      params: { id: customerUuid.value },
    })
    return
  }

  void router.push({ name: "customers" })
}

async function loadBuildingDetail(nextBuildingUuid: string, nextParkUuid: string) {
  const requestId = ++latestRequestId

  if (!nextBuildingUuid || !nextParkUuid) {
    building.value = null
    inspectionRecords.value = []
    repairRecords.value = []
    recordsErrorMessage.value = ""
    errorMessage.value = "建筑详情参数缺失，无法加载详情。"
    return
  }

  loading.value = true
  errorMessage.value = ""

  try {
    const result = await fetchBuildings({ ParkUuid: nextParkUuid })
    const currentBuilding = result.list.find(item => toText(item.Uuid, "") === nextBuildingUuid) ?? null

    if (requestId !== latestRequestId) {
      return
    }

    if (!currentBuilding) {
      throw new Error("未找到该建筑信息。")
    }

    building.value = currentBuilding
    await loadBuildingRecords(currentBuilding)
  } catch (error) {
    if (requestId !== latestRequestId) {
      return
    }

    building.value = null
    inspectionRecords.value = []
    repairRecords.value = []
    recordsErrorMessage.value = ""
    errorMessage.value = handleApiError(error, {
      mode: "silent",
      fallback: "建筑详情加载失败，请稍后重试。",
    })
  } finally {
    if (requestId === latestRequestId) {
      loading.value = false
    }
  }
}

async function loadBuildingRecords(currentBuilding: BuildingListItem) {
  const requestId = ++latestRecordsRequestId
  const currentCustomerUuid = relatedCustomerUuid.value
  const currentBuildingName = toText(currentBuilding.Name, "")

  if (!currentCustomerUuid || !currentBuildingName) {
    inspectionRecords.value = []
    repairRecords.value = []
    recordsErrorMessage.value = ""
    return
  }

  recordsLoading.value = true
  recordsErrorMessage.value = ""

  try {
    const [inspectionResult, repairResult] = await Promise.all([
      fetchWorkOrders({
        CustomerUuid: currentCustomerUuid,
        PageNum: 1,
        PageSize: 50,
      }),
      fetchRepairWorkOrders({
        CustomerUuid: currentCustomerUuid,
        PageNum: 1,
        PageSize: 50,
      }),
    ])

    if (requestId !== latestRecordsRequestId) {
      return
    }

    const normalizedBuildingName = normalizeText(currentBuildingName)
    inspectionRecords.value = inspectionResult.list
      .filter(item => normalizeText(toText(item.BuildName, "")) === normalizedBuildingName)
      .map((item, index) => ({
        id: toText(item.Uuid, `inspection-${index + 1}`),
        uuid: toText(item.Uuid, ""),
        kind: "inspection",
        serviceName: toText(item.PackageName || item.PlanName, "未命名检测工单"),
        item: "-",
        executor: toText(item.Executor, "-"),
        deadline: toText(item.Deadline, "-"),
        sortTime: resolveRecordSortTime(item.UpdatedAt, item.CreatedAt, item.Deadline),
      }))
      .sort((left, right) => right.sortTime - left.sortTime)
      .slice(0, 5)

    repairRecords.value = repairResult.list
      .filter(item => normalizeText(toText(item.BuildName, "")) === normalizedBuildingName)
      .map((item, index) => ({
        id: toText(item.Uuid, `repair-${index + 1}`),
        uuid: toText(item.Uuid, ""),
        kind: "repair",
        serviceName: "-",
        item: toText(item.Title || item.Content, "未命名维修工单"),
        executor: toText(item.UserName, "-"),
        deadline: toText(item.CreatedAt, "-"),
        sortTime: resolveRecordSortTime(item.UpdatedAt, item.CreatedAt),
      }))
      .sort((left, right) => right.sortTime - left.sortTime)
      .slice(0, 5)
  } catch (error) {
    if (requestId !== latestRecordsRequestId) {
      return
    }

    inspectionRecords.value = []
    repairRecords.value = []
    recordsErrorMessage.value = handleApiError(error, {
      mode: "silent",
      fallback: "建筑关联记录加载失败，请稍后重试。",
    })
  } finally {
    if (requestId === latestRecordsRequestId) {
      recordsLoading.value = false
    }
  }
}

function goToRecordDetail(row: BuildingRecordRow) {
  if (!row.uuid) {
    return
  }

  if (row.kind === "inspection") {
    void router.push({
      name: "inspection-work-order-detail",
      params: { id: row.uuid },
      query: relatedCustomerUuid.value ? { customerUuid: relatedCustomerUuid.value } : undefined,
    })
    return
  }

  void router.push({
    name: "repair-work-order-detail",
    params: { id: row.uuid },
    query: relatedCustomerUuid.value ? { customerUuid: relatedCustomerUuid.value } : undefined,
  })
}

function toOptionalText(value: unknown) {
  if (typeof value === "string" && value.trim()) {
    return value.trim()
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }

  return null
}

function normalizeText(value: string) {
  return value.trim().toLowerCase()
}

function resolveRecordSortTime(...values: Array<unknown>) {
  for (const value of values) {
    const text = toText(value, "")
    if (!text) {
      continue
    }

    const date = new Date(text.includes("T") ? text : text.replace(" ", "T"))
    if (!Number.isNaN(date.getTime())) {
      return date.getTime()
    }
  }

  return 0
}

type BuildingRecordRow = {
  id: string
  uuid: string
  kind: "inspection" | "repair"
  serviceName: string
  item: string
  executor: string
  deadline: string
  sortTime: number
}
</script>

<template>
  <DetailLayout
    :title="toText(building?.Name, '建筑详情') || '建筑详情'"
    :subtitle="toText(building?.ParkName, '') || ''"
    :empty="!loading && !building"
    empty-text="未找到该建筑信息"
    @back="goBack"
  >
    <template #primary>
      <Alert v-if="errorMessage" variant="destructive" class="mb-5">
        <AlertTitle>建筑详情接口加载失败</AlertTitle>
        <AlertDescription>{{ errorMessage }}</AlertDescription>
      </Alert>

      <DetailFieldsSkeleton v-if="loading" :sections="1" :rows-per-section="11" />

      <DetailFieldSections v-else-if="building" :sections="fieldSections" />
    </template>

    <template #secondary>
      <div v-if="recordsLoading" class="space-y-5 pb-5">
        <DetailRelationSkeleton :rows-per-group="3" />
        <DetailRelationSkeleton :rows-per-group="3" />
      </div>

      <div v-else-if="building" class="space-y-5 pb-5">
        <Alert v-if="recordsErrorMessage" variant="destructive" class="mb-5">
          <AlertTitle>建筑关联记录接口加载失败</AlertTitle>
          <AlertDescription>{{ recordsErrorMessage }}</AlertDescription>
        </Alert>

        <DetailRelationModule :schema="inspectionModule">
          <template #record-action-cell="{ row }">
            <Button
              variant="ghost"
              size="icon-sm"
              class="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground"
              :disabled="!row.uuid"
              @click="goToRecordDetail(row)"
            >
              <i class="ri-more-line text-[18px]" />
              <span class="sr-only">查看工单详情</span>
            </Button>
          </template>
        </DetailRelationModule>

        <DetailRelationModule :schema="repairModule">
          <template #record-action-cell="{ row }">
            <Button
              variant="ghost"
              size="icon-sm"
              class="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground"
              :disabled="!row.uuid"
              @click="goToRecordDetail(row)"
            >
              <i class="ri-more-line text-[18px]" />
              <span class="sr-only">查看工单详情</span>
            </Button>
          </template>
        </DetailRelationModule>
      </div>
    </template>
  </DetailLayout>

  <MapLocationDialog
    v-model:open="mapDialogOpen"
    title="建筑位置"
    :latitude="building?.Latitude ?? ''"
    :longitude="building?.Longitude ?? ''"
  />
</template>
