<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"

import BuildingDetailSheet from "@/components/detail/BuildingDetailSheet.vue"
import DetailFieldsSkeleton from "@/components/loading/DetailFieldsSkeleton.vue"
import DetailRelationSkeleton from "@/components/loading/DetailRelationSkeleton.vue"
import MapLocationDialog from "@/components/map/MapLocationDialog.vue"
import DetailFieldSections from "@/components/detail/DetailFieldSections.vue"
import DetailRelationModule from "@/components/detail/DetailRelationModule.vue"
import type { DetailContactValue, DetailFieldSection, DetailRelationModuleSchema } from "@/components/detail/types"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { detailBreadcrumbItems, detailBreadcrumbTitle } from "@/composables/useDetailBreadcrumbTitle"
import DetailLayout from "@/layouts/DetailLayout.vue"
import { handleApiError } from "@/lib/api-errors"
import { hasValidLatLng } from "@/lib/map-coordinates"
import { fetchBuildings, type BuildingListItem } from "@/lib/buildings-api"
import { fetchParkDetail, type ParkDetailResult } from "@/lib/parks-api"

type BuildingRow = {
  id: string
  name: string
  address: string
  status: "一切正常" | "需重点关注" | "存在风险"
}

const route = useRoute()
const router = useRouter()

const park = ref<ParkDetailResult | null>(null)
const buildings = ref<BuildingRow[]>([])
const loading = ref(false)
const errorMessage = ref("")
const buildingDetailSheetOpen = ref(false)
const activeBuildingUuid = ref("")
const mapDialogOpen = ref(false)
let latestRequestId = 0

const parkUuid = computed(() => typeof route.params.id === "string" ? route.params.id.trim() : "")
const customerContextUuid = computed(() => typeof route.query.customerUuid === "string" ? route.query.customerUuid.trim() : "")
const linkedCustomerUuid = computed(() => customerContextUuid.value || toText(park.value?.CustomerUuid, ""))

const fieldSections = computed<DetailFieldSection[]>(() => {
  const current = park.value
  if (!current) {
    return []
  }

  const addressRow: DetailFieldSection["rows"][number] = {
    key: "address",
    label: "地址",
    value: toText(current.Address, "-"),
    truncate: false,
    valueClass: "leading-6",
    ...(hasValidLatLng(current.Latitude, current.Longitude)
      ? {
          suffixAction: {
            label: "在地图中查看",
            onClick: () => {
              mapDialogOpen.value = true
            },
          },
        }
      : {}),
  }

  return [
    {
      key: "park-info",
      title: "园区基础信息",
      rows: [
        { key: "name", label: "园区名称", value: toText(current.Name, "未命名园区") },
        { key: "built-time", label: "建成时间", value: toText(current.BuiltTime, "-") },
        { key: "operation-time", label: "投运时间", value: toText(current.OperationTime, "-") },
        { key: "building-area", label: "建筑面积", value: toText(current.BuildArea, "-") },
        { key: "contact", label: "联系人", value: buildContactValue(toText(current.Contact, "未填写"), toText(current.ContactPhone, "-")) },
        { key: "latitude", label: "纬度", value: toText(current.Latitude, "-") },
        { key: "longitude", label: "经度", value: toText(current.Longitude, "-") },
        addressRow,
      ],
    },
  ]
})

const buildingModule = computed<DetailRelationModuleSchema<BuildingRow>>(() => ({
  key: "park-buildings",
  title: "建筑列表",
  count: buildings.value.length,
  rowKey: "id",
  columns: [
    { key: "name", label: "建筑名称", slot: "building-name-cell" },
    { key: "address", label: "地址", cellClass: "truncate text-muted-foreground" },
    { key: "actions", label: "", slot: "building-action-cell", cellClass: "flex justify-end" },
  ],
  groups: [
    {
      key: "buildings",
      title: "园区建筑",
      rows: buildings.value,
    },
  ],
  emptyState: {
    title: "暂无建筑",
    description: "当前园区还没有配置建筑信息。",
    icon: "ri-building-line",
  },
  mobileMinWidth: "40rem",
  columnTemplateMobile: "minmax(10rem,1.1fr) minmax(14rem,1.8fr) 6rem",
  columnTemplateDesktop: "minmax(10rem,1.1fr) minmax(14rem,1.8fr) 6rem",
  columnGapMobile: "0.75rem",
  columnGapDesktop: "1rem",
}))

watch(park, (current) => {
  detailBreadcrumbTitle.value = current ? "园区详情" : null

  if (!current) {
    detailBreadcrumbItems.value = null
    return
  }

  detailBreadcrumbItems.value = customerContextUuid.value
    ? [
        { title: "客户", to: "customers" },
        {
          title: "客户详情",
          to: {
            name: "customer-detail",
            params: { id: customerContextUuid.value },
          },
        },
        { title: "园区详情" },
      ]
    : [
        { title: "园区", to: "parks" },
        { title: "园区详情" },
      ]
})

watch(parkUuid, (nextParkUuid) => {
  void loadParkDetail(nextParkUuid)
}, { immediate: true })

onUnmounted(() => {
  detailBreadcrumbTitle.value = null
  detailBreadcrumbItems.value = null
})

function goBack() {
  if (customerContextUuid.value) {
    void router.push({
      name: "customer-detail",
      params: { id: customerContextUuid.value },
    })
    return
  }

  void router.push({ name: "parks" })
}

function goToBuildingDetail(buildingId: string) {
  if (!buildingId || !parkUuid.value) {
    return
  }

  activeBuildingUuid.value = buildingId
  buildingDetailSheetOpen.value = true
}

function handleBuildingDetailSheetOpenChange(open: boolean) {
  buildingDetailSheetOpen.value = open

  if (!open) {
    activeBuildingUuid.value = ""
  }
}

function handleBuildingDeleted() {
  void loadParkDetail(parkUuid.value)
}

async function loadParkDetail(nextParkUuid: string) {
  const requestId = ++latestRequestId

  if (!nextParkUuid) {
    park.value = null
    buildings.value = []
    errorMessage.value = "园区详情参数缺失，无法加载详情。"
    return
  }

  loading.value = true
  errorMessage.value = ""

  try {
    const [parkResult, buildingsResult] = await Promise.all([
      fetchParkDetail({ Uuid: nextParkUuid }),
      fetchBuildings({ ParkUuid: nextParkUuid }),
    ])

    if (requestId !== latestRequestId) {
      return
    }

    park.value = parkResult
    buildings.value = buildingsResult.list.map((item, index) => ({
      id: toText(item.Uuid, `${nextParkUuid}-${index + 1}`) || `${nextParkUuid}-${index + 1}`,
      name: toText(item.Name, "未命名建筑") || "未命名建筑",
      address: toText(item.Address, "-") || "-",
      // 接口暂未返回建筑风险状态，先统一按正常展示，后续可直接替换成真实字段映射。
      status: "一切正常",
    }))
  } catch (error) {
    if (requestId !== latestRequestId) {
      return
    }

    park.value = null
    buildings.value = []
    errorMessage.value = handleApiError(error, {
      mode: "silent",
      fallback: "园区详情加载失败，请稍后重试。",
    })
  } finally {
    if (requestId === latestRequestId) {
      loading.value = false
    }
  }
}

function toText(value: unknown, fallback: string | null = "") {
  if (typeof value === "string" && value.trim()) {
    return value.trim()
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }

  return fallback
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

function buildContactValue(name: string | null, phone?: string | null): DetailContactValue {
  return {
    kind: "contact",
    name: name ?? "未填写",
    phone,
  }
}
</script>

<template>
  <DetailLayout
    :title="toText(park?.Name, '园区详情') || '园区详情'"
    :subtitle="toText(park?.Address, '') || ''"
    :empty="!loading && !park"
    empty-text="未找到该园区信息"
    @back="goBack"
  >
    <template #primary>
      <Alert v-if="errorMessage" variant="destructive" class="mb-5">
        <AlertTitle>园区详情接口加载失败</AlertTitle>
        <AlertDescription>{{ errorMessage }}</AlertDescription>
      </Alert>

      <div v-if="loading" class="space-y-4">
        <DetailFieldsSkeleton :sections="1" :rows-per-section="9" />
        <div class="px-5">
          <Skeleton class="h-9 w-full rounded-md sm:w-36" />
        </div>
      </div>

      <div v-else-if="park" class="space-y-4">
        <DetailFieldSections :sections="fieldSections" use-title-block />
      </div>
    </template>

    <template #secondary>
      <div v-if="loading" class="pb-5">
        <DetailRelationSkeleton :rows-per-group="4" />
      </div>

      <div v-else-if="park" class="pb-5">
        <DetailRelationModule :schema="buildingModule" use-title-block>
          <template #building-name-cell="{ row }">
            <div class="flex min-w-0 items-center gap-2 text-foreground">
              <i
                :class="[
                  'text-[18px]',
                  row.status === '存在风险'
                    ? 'ri-close-circle-fill text-[#EF4444]'
                    : row.status === '需重点关注'
                      ? 'ri-time-fill text-[#F97316]'
                      : 'ri-checkbox-circle-fill text-[#22C55E]',
                ]"
              />
              <span class="truncate">{{ row.name }}</span>
            </div>
          </template>

          <template #building-action-cell="{ row }">
            <Button
              variant="ghost"
              size="icon-sm"
              class="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground"
              @click="goToBuildingDetail(row.id)"
            >
              <i class="ri-more-2-line text-[18px]" />
            </Button>
          </template>
        </DetailRelationModule>
      </div>
    </template>
  </DetailLayout>

  <MapLocationDialog
    v-model:open="mapDialogOpen"
    title="园区位置"
    :latitude="park?.Latitude ?? ''"
    :longitude="park?.Longitude ?? ''"
  />

  <BuildingDetailSheet
    :open="buildingDetailSheetOpen"
    :building-uuid="activeBuildingUuid"
    :park-uuid="parkUuid"
    :customer-uuid="linkedCustomerUuid || undefined"
    @update:open="handleBuildingDetailSheetOpenChange"
    @deleted="handleBuildingDeleted"
  />
</template>
