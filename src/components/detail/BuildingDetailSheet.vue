<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { useRouter } from "vue-router"

import { buildBuildingDetailSections, toText } from "@/components/detail/buildingDetailFields"
import DetailFieldSections from "@/components/detail/DetailFieldSections.vue"
import DetailFieldsSkeleton from "@/components/loading/DetailFieldsSkeleton.vue"
import MapLocationDialog from "@/components/map/MapLocationDialog.vue"
import type { DetailFieldSection } from "@/components/detail/types"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { ResponsiveRightSheet } from "@/components/ui/sheet"
import { TooltipWrap } from "@/components/ui/tooltip"
import { handleApiError } from "@/lib/api-errors"
import { fetchBuildings, type BuildingListItem } from "@/lib/buildings-api"
import { resolveParkCustomerMap } from "@/lib/park-customer-cache"

const props = defineProps<{
  open: boolean
  buildingUuid: string
  parkUuid: string
  customerUuid?: string
}>()

const emit = defineEmits<{
  "update:open": [value: boolean]
}>()

const router = useRouter()
const building = ref<BuildingListItem | null>(null)
const loading = ref(false)
const errorMessage = ref("")
const mapDialogOpen = ref(false)
const resolvedCustomerUuid = ref("")
const resolvedCustomerName = ref("")
let latestRequestId = 0

const fieldSections = computed<DetailFieldSection[]>(() => {
  return buildBuildingDetailSections(building.value, {
    onOpenMap: () => {
      mapDialogOpen.value = true
    },
  })
})

const relatedCustomerUuid = computed(() => props.customerUuid || resolvedCustomerUuid.value)
const relatedCustomerName = computed(() => {
  return toText(building.value?.CorpName || building.value?.CustomerName, "")
    || resolvedCustomerName.value
})

watch(
  () => [props.open, props.buildingUuid, props.parkUuid] as const,
  ([open, buildingUuid, parkUuid]) => {
    if (!open) {
      resetState()
      return
    }

    void loadBuildingDetail(buildingUuid, parkUuid)
  },
  { immediate: true },
)

function handleOpenChange(nextOpen: boolean) {
  emit("update:open", nextOpen)

  if (!nextOpen) {
    resetState()
  }
}

function goToBuildingFullDetail() {
  if (!props.buildingUuid || !props.parkUuid) {
    return
  }

  emit("update:open", false)

  void router.push({
    name: "building-detail",
    params: { id: props.buildingUuid },
    query: {
      parkUuid: props.parkUuid,
      customerUuid: relatedCustomerUuid.value || undefined,
      customerName: relatedCustomerName.value || undefined,
    },
  })
}

function goToBuildingEdit() {
  if (!props.buildingUuid || !props.parkUuid) {
    return
  }

  emit("update:open", false)

  void router.push({
    name: "building-edit",
    params: { id: props.buildingUuid },
    query: {
      parkUuid: props.parkUuid,
      customerUuid: relatedCustomerUuid.value || undefined,
      customerName: relatedCustomerName.value || undefined,
    },
  })
}

async function loadBuildingDetail(buildingUuid: string, parkUuid: string) {
  const requestId = ++latestRequestId

  if (!buildingUuid || !parkUuid) {
    building.value = null
    errorMessage.value = "建筑详情参数缺失，无法加载详情。"
    return
  }

  loading.value = true
  errorMessage.value = ""

  try {
    const result = await fetchBuildings({ ParkUuid: parkUuid })
    const currentBuilding = result.list.find(item => toText(item.Uuid, "") === buildingUuid) ?? null

    if (requestId !== latestRequestId) {
      return
    }

    if (!currentBuilding) {
      throw new Error("未找到该建筑信息。")
    }

    const nextCustomerUuid = toText(currentBuilding.CustomerUuid, "") ?? ""
    const nextCustomerName = toText(currentBuilding.CorpName || currentBuilding.CustomerName, "") ?? ""

    if (props.customerUuid || nextCustomerUuid) {
      resolvedCustomerUuid.value = nextCustomerUuid
      resolvedCustomerName.value = nextCustomerName
    } else if (parkUuid) {
      const customerMap = await resolveParkCustomerMap([parkUuid])

      if (requestId !== latestRequestId) {
        return
      }

      const resolved = customerMap.get(parkUuid)
      resolvedCustomerUuid.value = toText(resolved?.customerUuid, "") ?? ""
      resolvedCustomerName.value = toText(resolved?.customerName, "") ?? ""
    } else {
      resolvedCustomerUuid.value = ""
      resolvedCustomerName.value = ""
    }

    building.value = currentBuilding
  } catch (error) {
    if (requestId !== latestRequestId) {
      return
    }

    building.value = null
    resolvedCustomerUuid.value = ""
    resolvedCustomerName.value = ""
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

function resetState() {
  loading.value = false
  errorMessage.value = ""
  building.value = null
  mapDialogOpen.value = false
  resolvedCustomerUuid.value = ""
  resolvedCustomerName.value = ""
}

</script>

<template>
  <ResponsiveRightSheet
    :open="open"
    sheet-content-class="overflow-hidden sm:max-w-xl"
    @update:open="handleOpenChange"
    @footer-primary="goToBuildingFullDetail"
  >
    <template #actions>
      <div class="right-sheet-actions">
        <div class="right-sheet-actions__primary">
          <TooltipWrap content="关闭建筑详情" side="right">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              class="right-sheet-icon-button"
              @click="handleOpenChange(false)"
            >
              <i class="ri-close-line text-base" />
              <span class="sr-only">关闭建筑详情</span>
            </Button>
          </TooltipWrap>
          <TooltipWrap content="打开完整建筑详情页">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              class="right-sheet-icon-button"
              @click="goToBuildingFullDetail"
            >
              <i class="ri-fullscreen-line text-base" />
              <span class="sr-only">打开完整建筑详情页</span>
            </Button>
          </TooltipWrap>
        </div>
        <div class="right-sheet-actions__secondary">
          <Button
            variant="ghost"
            size="sm"
            class="right-sheet-text-button"
            @click="goToBuildingEdit"
          >
            <i class="ri-edit-line text-base" />
            编辑建筑信息
          </Button>
        </div>
      </div>
    </template>
    <template #title>{{ toText(building?.Name, "建筑详情") }}</template>

    <div class="overflow-y-auto">
      <Alert v-if="errorMessage" variant="destructive" class="mb-4">
        <AlertTitle>建筑详情接口加载失败</AlertTitle>
        <AlertDescription>{{ errorMessage }}</AlertDescription>
      </Alert>

      <DetailFieldsSkeleton v-if="loading" :sections="1" :rows-per-section="11" />

      <DetailFieldSections v-else-if="building" :sections="fieldSections" />
    </div>
  </ResponsiveRightSheet>

  <MapLocationDialog
    v-model:open="mapDialogOpen"
    title="建筑位置"
    sheet-address-context
    :latitude="building?.Latitude ?? ''"
    :longitude="building?.Longitude ?? ''"
  />
</template>
