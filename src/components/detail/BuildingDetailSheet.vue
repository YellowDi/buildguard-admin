<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { useRouter } from "vue-router"
import { toast } from "vue-sonner"

import { buildBuildingDetailSections, toText } from "@/components/detail/buildingDetailFields"
import DetailFieldSections from "@/components/detail/DetailFieldSections.vue"
import DetailFieldsSkeleton from "@/components/loading/DetailFieldsSkeleton.vue"
import MapLocationDialog from "@/components/map/MapLocationDialog.vue"
import type { DetailFieldSection } from "@/components/detail/types"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { ResponsiveRightSheet } from "@/components/ui/sheet"
import { TooltipWrap } from "@/components/ui/tooltip"
import { handleApiError } from "@/lib/api-errors"
import { deleteBuilding, fetchBuildings, type BuildingListItem } from "@/lib/buildings-api"

const props = defineProps<{
  open: boolean
  buildingUuid: string
  parkUuid: string
  customerUuid?: string
}>()

const emit = defineEmits<{
  "update:open": [value: boolean]
  deleted: []
}>()

const router = useRouter()
const building = ref<BuildingListItem | null>(null)
const loading = ref(false)
const errorMessage = ref("")
const deleteConfirmOpen = ref(false)
const deleteSubmitting = ref(false)
const mapDialogOpen = ref(false)
let latestRequestId = 0

const fieldSections = computed<DetailFieldSection[]>(() => {
  return buildBuildingDetailSections(building.value, {
    onOpenMap: () => {
      mapDialogOpen.value = true
    },
  })
})

const deleteTargetName = computed(() => toText(building.value?.Name, "当前建筑"))

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

function promptDeleteBuilding() {
  if (!props.buildingUuid || deleteSubmitting.value) {
    return
  }

  deleteConfirmOpen.value = true
}

async function confirmDeleteBuilding() {
  if (!props.buildingUuid || deleteSubmitting.value) {
    return
  }

  deleteSubmitting.value = true

  try {
    await deleteBuilding({ Uuid: props.buildingUuid })
    deleteConfirmOpen.value = false
    toast.success("建筑已删除")
    handleOpenChange(false)
    emit("deleted")
  } catch (error) {
    handleApiError(error, {
      fallback: "建筑删除失败，请稍后重试。",
    })
  } finally {
    deleteSubmitting.value = false
  }
}

function resetState() {
  loading.value = false
  errorMessage.value = ""
  building.value = null
  deleteConfirmOpen.value = false
  deleteSubmitting.value = false
  mapDialogOpen.value = false
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
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-1">
          <TooltipWrap content="关闭建筑详情" side="right">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              class="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground"
              @click="handleOpenChange(false)"
            >
              <i class="ri-arrow-right-double-line text-[16px]" />
              <span class="sr-only">关闭建筑详情</span>
            </Button>
          </TooltipWrap>
          <TooltipWrap content="打开完整建筑详情页">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              class="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground"
              @click="goToBuildingFullDetail"
            >
              <i class="ri-fullscreen-line text-[16px]" />
              <span class="sr-only">打开完整建筑详情页</span>
            </Button>
          </TooltipWrap>
        </div>
        <div class="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            class="h-8 rounded-md border-destructive/40 text-destructive hover:border-destructive/60 hover:bg-destructive/5 hover:text-destructive"
            :disabled="deleteSubmitting"
            @click="promptDeleteBuilding"
          >
            {{ deleteSubmitting ? "删除中..." : "删除建筑" }}
          </Button>
          <Button
            variant="outline"
            size="sm"
            class="h-8 rounded-md"
            :disabled="deleteSubmitting"
            @click="goToBuildingEdit"
          >
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

  <AlertDialog :open="deleteConfirmOpen" @update:open="deleteConfirmOpen = $event">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>确认删除建筑？</AlertDialogTitle>
        <AlertDialogDescription>
          将删除“{{ deleteTargetName }}”，该操作不可撤销，确认后将立即提交删除请求。
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel :disabled="deleteSubmitting" class="gap-2">
          <i class="ri-close-line text-base" />
          取消
        </AlertDialogCancel>
        <AlertDialogAction
          class="gap-2 bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60"
          :disabled="deleteSubmitting"
          @click="confirmDeleteBuilding"
        >
          <i
            :class="deleteSubmitting ? 'ri-loader-4-line animate-spin text-base' : 'ri-delete-bin-line text-base'"
          />
          {{ deleteSubmitting ? "删除中..." : "确认删除" }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
