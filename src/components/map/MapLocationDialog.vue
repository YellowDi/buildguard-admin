<script setup lang="ts">
import { computed } from "vue"

import AmapLocationMap from "@/components/map/AmapLocationMap.vue"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const MAP_PICK_DESCRIPTION = "点击下方地图选择位置，将自动匹配地址（仍可自行修改）。"

/** 侧滑 Sheet 内打开只读地图时，说明与地址信息对照 */
const SHEET_MAP_VIEW_DESCRIPTION = "点击下方地图查看位置，可与详情中的地址信息对照查看。"

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    description?: string
    /** 是否允许在地图上点击拾取坐标 */
    pickable?: boolean
    /** 选点后逆地理编码并回填地址 */
    fillAddressOnPick?: boolean
    /** 从侧滑 Sheet 打开只读地图时，使用与地址相关的默认说明 */
    sheetAddressContext?: boolean
    latitude?: string
    longitude?: string
  }>(),
  { pickable: false, fillAddressOnPick: false, sheetAddressContext: false, description: undefined, latitude: "", longitude: "" },
)

const resolvedDescription = computed(() => {
  if (props.description !== undefined && props.description !== "") {
    return props.description
  }
  if (props.pickable && props.fillAddressOnPick) {
    return MAP_PICK_DESCRIPTION
  }
  if (props.sheetAddressContext && !props.pickable) {
    return SHEET_MAP_VIEW_DESCRIPTION
  }
  return ""
})

const emit = defineEmits<{
  "update:open": [value: boolean]
  "update:latitude": [value: string]
  "update:longitude": [value: string]
  "update:address": [value: string]
}>()

function handleOpen(next: boolean) {
  emit("update:open", next)
}

function onLat(v: string) {
  emit("update:latitude", v)
}

function onLng(v: string) {
  emit("update:longitude", v)
}

function onAddress(v: string) {
  emit("update:address", v)
}
</script>

<template>
  <Dialog :open="open" @update:open="handleOpen">
    <DialogContent class="max-h-[min(92vh,860px)] gap-4 overflow-y-auto sm:max-w-[min(100vw-2rem,640px)]">
      <DialogHeader>
        <DialogTitle>{{ title }}</DialogTitle>
        <DialogDescription v-if="resolvedDescription">
          {{ resolvedDescription }}
        </DialogDescription>
      </DialogHeader>

      <AmapLocationMap
        v-if="open"
        hide-pick-hint
        :pickable="pickable"
        :fill-address-on-pick="fillAddressOnPick"
        :latitude="latitude"
        :longitude="longitude"
        @update:latitude="onLat"
        @update:longitude="onLng"
        @update:address="onAddress"
      />

      <DialogFooter v-if="pickable" class="gap-2 sm:justify-end">
        <Button type="button" variant="outline" class="" @click="handleOpen(false)">
          完成
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
