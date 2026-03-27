<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"

import { buildBuildingDetailSections, toText } from "@/components/detail/buildingDetailFields"
import DetailFieldSections from "@/components/detail/DetailFieldSections.vue"
import type { DetailFieldSection } from "@/components/detail/types"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { detailBreadcrumbTitle } from "@/composables/useDetailBreadcrumbTitle"
import DetailLayout from "@/layouts/DetailLayout.vue"
import { handleApiError } from "@/lib/api-errors"
import { fetchBuildings, type BuildingListItem } from "@/lib/buildings-api"

const route = useRoute()
const router = useRouter()

const building = ref<BuildingListItem | null>(null)
const loading = ref(false)
const errorMessage = ref("")
let latestRequestId = 0

const buildingUuid = computed(() => typeof route.params.id === "string" ? route.params.id.trim() : "")
const parkUuid = computed(() => typeof route.query.parkUuid === "string" ? route.query.parkUuid.trim() : "")
const customerUuid = computed(() => typeof route.query.customerUuid === "string" ? route.query.customerUuid.trim() : "")

const fieldSections = computed<DetailFieldSection[]>(() => {
  return buildBuildingDetailSections(building.value)
})

watch(building, (current) => {
  detailBreadcrumbTitle.value = toOptionalText(current?.Name)
})

watch([buildingUuid, parkUuid], ([nextBuildingUuid, nextParkUuid]) => {
  void loadBuildingDetail(nextBuildingUuid, nextParkUuid)
}, { immediate: true })

onUnmounted(() => {
  detailBreadcrumbTitle.value = null
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
  } catch (error) {
    if (requestId !== latestRequestId) {
      return
    }

    building.value = null
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

function toOptionalText(value: unknown) {
  if (typeof value === "string" && value.trim()) {
    return value.trim()
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }

  return null
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

      <div v-if="loading" class="rounded-lg border border-border/70 px-4 py-5 text-sm text-muted-foreground">
        正在获取建筑详情数据。
      </div>

      <DetailFieldSections v-else-if="building" :sections="fieldSections" />
    </template>
  </DetailLayout>
</template>
