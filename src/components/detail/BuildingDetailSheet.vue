<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { useRouter } from "vue-router"

import { buildBuildingDetailSections, toText } from "@/components/detail/buildingDetailFields"
import DetailFieldSections from "@/components/detail/DetailFieldSections.vue"
import type { DetailFieldSection } from "@/components/detail/types"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { handleApiError } from "@/lib/api-errors"
import { fetchBuildings, type BuildingListItem } from "@/lib/buildings-api"

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
let latestRequestId = 0

const fieldSections = computed<DetailFieldSection[]>(() => {
  return buildBuildingDetailSections(building.value)
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
      customerUuid: props.customerUuid,
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
      customerUuid: props.customerUuid,
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

function resetState() {
  loading.value = false
  errorMessage.value = ""
  building.value = null
}

</script>

<template>
  <Sheet :open="open" @update:open="handleOpenChange">
    <SheetContent side="right" class="overflow-hidden max-sm:w-[calc(100vw-1rem)] sm:max-w-xl">
      <SheetHeader>
        <template #actions>
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-1">
              <SheetClose
                class="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
              >
                <i class="ri-arrow-right-double-line text-[16px]" />
                <span class="sr-only">关闭建筑详情</span>
              </SheetClose>
              <button
                type="button"
                class="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
                @click="goToBuildingFullDetail"
              >
                <i class="ri-fullscreen-line text-[16px]" />
                <span class="sr-only">打开完整建筑详情页</span>
              </button>
            </div>
            <Button
              variant="outline"
              size="sm"
              class="h-8 rounded-md"
              @click="goToBuildingEdit"
            >
              编辑建筑信息
            </Button>
          </div>
        </template>
        <SheetTitle>{{ toText(building?.Name, "建筑详情") }}</SheetTitle>
      </SheetHeader>

      <div class="overflow-y-auto">
        <Alert v-if="errorMessage" variant="destructive" class="mb-4">
          <AlertTitle>建筑详情接口加载失败</AlertTitle>
          <AlertDescription>{{ errorMessage }}</AlertDescription>
        </Alert>

        <div v-if="loading" class="rounded-lg border border-border/70 px-4 py-5 text-sm text-muted-foreground">
          正在获取建筑详情数据。
        </div>

        <DetailFieldSections v-else-if="building" :sections="fieldSections" />
      </div>
    </SheetContent>
  </Sheet>
</template>
