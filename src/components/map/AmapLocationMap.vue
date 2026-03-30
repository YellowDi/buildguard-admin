<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from "vue"
import { toast } from "vue-sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { isAmapConfigured } from "@/lib/amap-config"
import { reverseGeocodeFormatted } from "@/lib/amap-reverse-geocode"
import { loadAmap } from "@/lib/load-amap"
import { DEFAULT_MAP_CENTER, parseLatLng, type ParsedLatLng } from "@/lib/map-coordinates"
import { cn } from "@/lib/utils"

const props = withDefaults(
  defineProps<{
    /** 是否允许点击地图拾取经纬度（GCJ-02） */
    pickable?: boolean
    latitude?: string
    longitude?: string
    /** 选点后调用逆地理编码并写入地址（通过 emit） */
    fillAddressOnPick?: boolean
    /** 表单内嵌时缩小地图高度 */
    compact?: boolean
    /** 外层已有边框时去掉地图容器重复描边 */
    embedded?: boolean
    /** 为 true 时不展示选点提示（由外层如 Dialog 标题区说明） */
    hidePickHint?: boolean
  }>(),
  { pickable: false, latitude: "", longitude: "", fillAddressOnPick: false, compact: false, embedded: false, hidePickHint: false },
)

const emit = defineEmits<{
  "update:latitude": [value: string]
  "update:longitude": [value: string]
  "update:address": [value: string]
}>()

const containerRef = ref<HTMLElement | null>(null)
const loadError = ref("")
const configError = ref("")

let map: any = null
let marker: any = null
let resizeObserver: ResizeObserver | null = null
let destroyed = false

function destroyMap() {
  resizeObserver?.disconnect()
  resizeObserver = null
  if (marker) {
    try {
      map?.remove(marker)
    }
    catch {
      /* ignore */
    }
    marker = null
  }
  if (map) {
    try {
      map.destroy()
    }
    catch {
      /* ignore */
    }
    map = null
  }
}

function applyMarker(AMap: any, next: ParsedLatLng) {
  if (!map) {
    return
  }

  const pos: [number, number] = [next.lng, next.lat]

  if (marker) {
    marker.setPosition(pos)
  }
  else {
    marker = new AMap.Marker({
      position: pos,
      map,
    })
  }

  map.setCenter(pos)
}

async function initMap() {
  loadError.value = ""
  configError.value = ""

  if (!isAmapConfigured()) {
    configError.value = "未配置高德地图 Key（VITE_AMAP_KEY）。"
    return
  }

  const el = containerRef.value
  if (!el) {
    return
  }

  destroyed = false

  try {
    const AMap = await loadAmap()
    if (destroyed || !containerRef.value) {
      return
    }

    const parsed = parseLatLng(props.latitude, props.longitude)
    const center = parsed ?? DEFAULT_MAP_CENTER
    const centerPos: [number, number] = [center.lng, center.lat]

    map = new AMap.Map(containerRef.value, {
      zoom: parsed ? 16 : 11,
      center: centerPos,
    })

    if (parsed) {
      marker = new AMap.Marker({
        position: centerPos,
        map,
      })
    }

    if (props.pickable) {
      map.on("click", (e: { lnglat: { getLng: () => number; getLat: () => number } }) => {
        const lng = e.lnglat.getLng()
        const lat = e.lnglat.getLat()
        emit("update:latitude", formatCoord(lat))
        emit("update:longitude", formatCoord(lng))
        applyMarker(AMap, { lat, lng })

        if (props.fillAddressOnPick) {
          void reverseGeocodeFormatted(lat, lng).then((addr) => {
            if (addr) {
              emit("update:address", addr)
            }
            else {
              toast.error("该位置暂无法自动匹配地址，请手动填写上方地址。")
            }
          })
        }
      })
    }

    resizeObserver = new ResizeObserver(() => {
      try {
        map?.resize()
      }
      catch {
        /* ignore */
      }
    })
    resizeObserver.observe(containerRef.value)

    await nextTick()
    setTimeout(() => {
      try {
        map?.resize()
      }
      catch {
        /* ignore */
      }
    }, 120)
  }
  catch (error) {
    loadError.value = error instanceof Error ? error.message : "地图加载失败。"
  }
}

function formatCoord(value: number) {
  return String(Number(value.toFixed(6)))
}

watch(
  () => [props.latitude, props.longitude, props.pickable] as const,
  () => {
    if (!map || props.pickable) {
      return
    }

    const parsed = parseLatLng(props.latitude, props.longitude)
    if (!parsed) {
      if (marker) {
        try {
          map.remove(marker)
        }
        catch {
          /* ignore */
        }
        marker = null
      }
      return
    }

    void loadAmap().then((AMap: any) => {
      if (!map) {
        return
      }
      applyMarker(AMap, parsed)
    })
  },
)

onMounted(() => {
  void initMap()
})

onUnmounted(() => {
  destroyed = true
  destroyMap()
})

defineExpose({
  /** 供父级在弹层打开后触发一次尺寸重算 */
  resize() {
    try {
      map?.resize()
    }
    catch {
      /* ignore */
    }
  },
})
</script>

<template>
  <div class="grid gap-2">
    <Alert v-if="configError" variant="destructive">
      <AlertTitle>地图未就绪</AlertTitle>
      <AlertDescription>{{ configError }}</AlertDescription>
    </Alert>

    <Alert v-else-if="loadError" variant="destructive">
      <AlertTitle>地图加载失败</AlertTitle>
      <AlertDescription>{{ loadError }}</AlertDescription>
    </Alert>

    <p
      v-if="pickable && !hidePickHint && !configError && !loadError"
      class="text-xs text-muted-foreground"
      :class="embedded ? 'px-0.5' : ''"
    >
      <template v-if="fillAddressOnPick">
        点击下方地图选择位置，将自动匹配地址到上方输入框（仍可自行修改）。
      </template>
      <template v-else>
        点击地图即可拾取坐标（GCJ-02，与接口字段一致）。
      </template>
    </p>

    <div
      ref="containerRef"
      :class="cn(
        'w-full overflow-hidden bg-muted/30',
        embedded ? 'rounded-b-md border-0' : 'rounded-lg border border-border/80',
        compact
          ? 'h-[min(36vh,12rem)] min-h-[160px]'
          : 'h-[min(55vh,22rem)] min-h-[200px]',
      )"
    />
  </div>
</template>
