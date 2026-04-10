<script setup lang="ts">
import { computed, defineAsyncComponent, onUnmounted, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"

import { buildBuildingDetailSections, toText } from "@/components/detail/buildingDetailFields"
import CustomerInspectionCategoryRadarPlaceholder from "@/components/detail/CustomerInspectionCategoryRadarPlaceholder.vue"
import DetailFieldsSkeleton from "@/components/loading/DetailFieldsSkeleton.vue"
import DetailRelationSkeleton from "@/components/loading/DetailRelationSkeleton.vue"
import DetailFieldSections from "@/components/detail/DetailFieldSections.vue"
import DetailRelationModule from "@/components/detail/DetailRelationModule.vue"
import MapLocationDialog from "@/components/map/MapLocationDialog.vue"
import type { DetailFieldSection, DetailRelationModuleSchema } from "@/components/detail/types"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { TooltipWrap } from "@/components/ui/tooltip"
import { detailBreadcrumbItems, detailBreadcrumbTitle } from "@/composables/useDetailBreadcrumbTitle"
import DetailLayout from "@/layouts/DetailLayout.vue"
import { handleApiError } from "@/lib/api-errors"
import { fetchBuildings, type BuildingListItem } from "@/lib/buildings-api"
import { fetchInspectionCategories, type InspectionCategoryRecord } from "@/lib/inspection-categories-api"
import { fetchRepairWorkOrders, fetchWorkOrders } from "@/lib/work-orders-api"

const CustomerInspectionCategoryRadar = defineAsyncComponent({
  loader: () => import("@/components/detail/CustomerInspectionCategoryRadar.vue"),
  loadingComponent: CustomerInspectionCategoryRadarPlaceholder,
  delay: 180,
})

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
const inspectionCategoriesList = ref<InspectionCategoryRecord[]>([])
const inspectionCategoriesLoading = ref(false)
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
  title: "检测记录",
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
      title: "",
      rows: inspectionRecords.value,
    },
  ],
  emptyState: {
    title: "暂无检测记录",
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
  title: "报修记录",
  rowKey: "id",
  columns: [
    { key: "item", label: "报修类型", cellClass: "truncate" },
    { key: "executor", label: "执行人", cellClass: "truncate text-muted-foreground" },
    { key: "deadline", label: "创建时间", cellClass: "truncate text-muted-foreground" },
    { key: "actions", label: "", slot: "record-action-cell", cellClass: "flex justify-end" },
  ],
  groups: [
    {
      key: "repair",
      title: "",
      rows: repairRecords.value,
    },
  ],
  emptyState: {
    title: "暂无报修记录",
    description: "当前建筑还没有可展示的报修工单记录。",
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

  detailBreadcrumbItems.value = customerUuid.value
    ? [
        { title: "客户", to: "customers" },
        {
          title: "客户详情",
          to: {
            name: "customer-detail",
            params: { id: customerUuid.value },
          },
        },
        ...(parkUuid.value
          ? [{
              title: "园区详情",
              to: {
                name: "park-detail",
                params: { id: parkUuid.value },
                query: { customerUuid: customerUuid.value },
              },
            }]
          : [{
              title: "园区详情",
            }]),
        { title: "建筑详情" },
      ]
    : [
        { title: "建筑", to: "buildings" },
        { title: "建筑详情" },
      ]
})

watch([buildingUuid, parkUuid], ([nextBuildingUuid, nextParkUuid]) => {
  void loadBuildingDetail(nextBuildingUuid, nextParkUuid)
  void loadInspectionCategoriesList()
}, { immediate: true })

onUnmounted(() => {
  detailBreadcrumbTitle.value = null
  detailBreadcrumbItems.value = null
})

function goBack() {
  if (parkUuid.value && customerUuid.value) {
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

  void router.push({ name: "buildings" })
}

function goToEdit() {
  if (!buildingUuid.value || !parkUuid.value) {
    return
  }

  void router.push({
    name: "building-edit",
    params: { id: buildingUuid.value },
    query: {
      parkUuid: parkUuid.value,
      customerUuid: relatedCustomerUuid.value || undefined,
    },
  })
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
  const currentBuildingName = recordText(currentBuilding.Name, "")

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
      .filter(item => normalizeText(recordText(item.BuildName, "")) === normalizedBuildingName)
      .map((item, index) => ({
        id: recordText(item.Uuid, `inspection-${index + 1}`),
        uuid: recordText(item.Uuid, ""),
        kind: "inspection" as const,
        serviceName: recordText(item.PackageName || item.PlanName, "未命名检测工单"),
        item: "-",
        executor: formatInspectionExecutors(item.Executors, item.Executor),
        deadline: formatDateOnly(recordText(item.Deadline, "-")),
        sortTime: resolveRecordSortTime(item.UpdatedAt, item.CreatedAt, item.Deadline),
      }))
      .sort((left, right) => right.sortTime - left.sortTime)
      .slice(0, 5)

    repairRecords.value = repairResult.list
      .filter(item => normalizeText(recordText(item.BuildName, "")) === normalizedBuildingName)
      .map((item, index) => ({
        id: recordText(item.Uuid, `repair-${index + 1}`),
        uuid: recordText(item.Uuid, ""),
        kind: "repair" as const,
        serviceName: "-",
        item: recordText(item.Title || item.Content, "未命名报修工单"),
        executor: recordText(item.UserName, "-"),
        deadline: recordText(item.CreatedAt, "-"),
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

function formatInspectionExecutors(value: unknown, fallback?: unknown) {
  if (Array.isArray(value)) {
    const normalized = value
      .map(item => recordText(item, ""))
      .filter(Boolean)

    if (normalized.length) {
      return normalized.join("、")
    }
  }

  return recordText(fallback, "-")
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

function recordText(value: unknown, fallback: string): string {
  return toText(value, fallback) ?? fallback
}

function resolveRecordSortTime(...values: Array<unknown>) {
  for (const value of values) {
    const text = recordText(value, "")
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

function formatDateOnly(value: string) {
  const normalized = value.trim()
  if (!normalized || normalized === "-" || normalized === "—") {
    return "-"
  }

  const [datePart] = normalized.split(/[ T]/)
  return datePart || normalized
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

// 雷达图相关计算属性
const inspectionCategoryRadarLabels = computed(() => (
  inspectionCategoriesList.value.map(cat => toDisplayText(cat.Name, "未命名分类"))
))

const inspectionCategoryRadarValues = computed(() => {
  const categories = inspectionCategoriesList.value
  const currentBuilding = building.value

  if (!categories.length || !currentBuilding) {
    return categories.map(() => 0)
  }

  // 从建筑的检测分类分数数据中获取各分类得分
  return categories.map((category) => {
    const categoryUuid = toTrimmedText(category.Uuid)
    const categoryName = toTrimmedText(category.Name)

    // 尝试从建筑的 CategoryScores 等字段获取分数
    const listKeys = ["CategoryScores", "categoryScores", "InspectionCategoryScores", "inspectionCategoryScores"] as const
    for (const key of listKeys) {
      const raw = currentBuilding[key]
      if (!Array.isArray(raw)) continue

      for (const row of raw) {
        if (!row || typeof row !== "object") continue
        const record = row as Record<string, unknown>
        const ru = toTrimmedText(record.CategoryUuid ?? record.categoryUuid)
        const rn = toTrimmedText(record.CategoryName ?? record.categoryName)
        const matchesUuid = categoryUuid && ru === categoryUuid
        const matchesName = categoryName && rn === categoryName

        if (!matchesUuid && !matchesName) continue

        const scoreRaw = record.Score ?? record.score ?? record.AvgScore ?? record.avgScore
        const num = typeof scoreRaw === "number" ? scoreRaw : Number(scoreRaw)
        if (Number.isFinite(num)) {
          return Math.max(0, Math.min(100, num))
        }
      }
    }

    // 回退到建筑综合分
    const overallScore = currentBuilding.Score ?? currentBuilding.score ?? currentBuilding.OverallScore ?? currentBuilding.overallScore ?? currentBuilding.AvgScore ?? currentBuilding.avgScore
    const num = typeof overallScore === "number" ? overallScore : Number(overallScore)
    return Number.isFinite(num) ? Math.max(0, Math.min(100, num)) : 0
  })
})

const inspectionCategoryRadarLoading = computed(() => (
  inspectionCategoriesLoading.value || loading.value
))

function toTrimmedText(value: unknown) {
  if (typeof value === "string" && value.trim()) {
    return value.trim()
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }
  return ""
}

function toDisplayText(value: unknown, fallback = ""): string {
  if (typeof value === "string" && value.trim()) {
    return value.trim()
  }
  return fallback
}

async function loadInspectionCategoriesList() {
  inspectionCategoriesLoading.value = true

  try {
    const result = await fetchInspectionCategories()
    inspectionCategoriesList.value = result.list
  } catch {
    inspectionCategoriesList.value = []
  } finally {
    inspectionCategoriesLoading.value = false
  }
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
    <template #headerActions>
      <Button
        v-if="building"
        variant="outline"
        size="sm"
        class="h-8 gap-1 border-border/80 bg-background px-3 text-[14px] font-medium shadow-none"
        @click="goToEdit"
      >
        <i class="ri-edit-line text-base" />
        修改建筑信息
      </Button>
    </template>

    <template #primary>
      <Alert v-if="errorMessage" variant="destructive" class="mb-5">
        <AlertTitle>建筑详情接口加载失败</AlertTitle>
        <AlertDescription>{{ errorMessage }}</AlertDescription>
      </Alert>

      <DetailFieldsSkeleton v-if="loading" :sections="1" :rows-per-section="11" />

      <DetailFieldSections v-else-if="building" :sections="fieldSections" use-title-block />

      <template v-if="!loading && building">
        <div class="h-px bg-border/80" />

        <div>
          <CustomerInspectionCategoryRadar
            :labels="inspectionCategoryRadarLabels"
            :values="inspectionCategoryRadarValues"
            :loading="inspectionCategoryRadarLoading"
            :has-buildings="true"
            empty-text="暂无检测项分类数据"
          />
        </div>
      </template>
    </template>

    <template #secondary>
      <div v-if="recordsLoading" class="space-y-5 pb-5">
        <DetailRelationSkeleton :rows-per-group="3" />
        <DetailRelationSkeleton :rows-per-group="3" />
      </div>

      <div v-else-if="building" class="pb-5">
        <Alert v-if="recordsErrorMessage" variant="destructive" class="mb-5">
          <AlertTitle>建筑关联记录接口加载失败</AlertTitle>
          <AlertDescription>{{ recordsErrorMessage }}</AlertDescription>
        </Alert>

        <DetailRelationModule :schema="inspectionModule" use-title-block>
          <template #record-action-cell="{ row }">
            <TooltipWrap content="查看工单详情" :disabled="!row.uuid">
              <Button
                variant="ghost"
                size="icon-sm"
                class="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground"
                :disabled="!row.uuid"
                @click="goToRecordDetail(row)"
              >
                <i class="ri-more-2-line text-[18px]" />
                <span class="sr-only">查看工单详情</span>
              </Button>
            </TooltipWrap>
          </template>
        </DetailRelationModule>

        <div class="h-px bg-border/80" />

        <DetailRelationModule :schema="repairModule" use-title-block>
          <template #record-action-cell="{ row }">
            <TooltipWrap content="查看工单详情" :disabled="!row.uuid">
              <Button
                variant="ghost"
                size="icon-sm"
                class="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground"
                :disabled="!row.uuid"
                @click="goToRecordDetail(row)"
              >
                <i class="ri-more-2-line text-[18px]" />
                <span class="sr-only">查看工单详情</span>
              </Button>
            </TooltipWrap>
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
