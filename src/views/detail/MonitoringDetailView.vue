<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { toast } from "vue-sonner"

import DetailFieldSections from "@/components/detail/DetailFieldSections.vue"
import type { DetailFieldSection } from "@/components/detail/types"
import MonitoringPlayer from "@/components/monitoring/MonitoringPlayer.vue"
import { Button } from "@/components/ui/button"
import { StatusBadge, type StatusBadgeIcon, type StatusBadgeTone } from "@/components/ui/status-badge"
import DetailLayout from "@/layouts/DetailLayout.vue"
import { handleApiError } from "@/lib/api-errors"
import { fetchMonitoringAssetDevices } from "@/lib/monitoring-assets-api"
import {
  getMonitoringDeviceById,
  monitoringStatusRenderer,
  type MonitoringDeviceRecord,
  type MonitoringDeviceStatus,
} from "@/lib/monitoring-mock"

type PlayerStatus = "idle" | "loading" | "playing" | "error"

const route = useRoute()
const router = useRouter()
const playerRef = ref<InstanceType<typeof MonitoringPlayer> | null>(null)
const monitoringRows = ref<MonitoringDeviceRecord[]>([])
const loading = ref(false)
const errorMessage = ref("")
const playerStatus = ref<PlayerStatus>("idle")
const activeStreamUrl = ref("")
const activeStreamIsFallback = ref(false)
let latestRequestId = 0

const deviceId = computed(() => {
  const rawId = route.params.id
  return Array.isArray(rawId) ? rawId[0] ?? "" : rawId ?? ""
})
const device = computed(() => (
  monitoringRows.value.find(item => item.id === deviceId.value)
  ?? getMonitoringDeviceById(deviceId.value)
))
const pageTitle = computed(() => device.value?.deviceName ?? "监控详情")
const pageSubtitle = computed(() => {
  const current = device.value
  if (!current) {
    return ""
  }

  return `${current.customerName} / ${current.parkName} / ${current.buildingName}`
})
const playerStatusLabel = computed(() => {
  if (playerStatus.value === "playing") return "正在播放"
  if (playerStatus.value === "loading") return "连接中"
  if (playerStatus.value === "error") return "播放失败"
  return "待播放"
})
const activeSourceLabel = computed(() => activeStreamIsFallback.value ? "备用测试流" : "主测试流")
const deviceStatusBadge = computed(() => getDeviceStatusBadge(device.value?.status ?? "offline"))
const detailSections = computed<DetailFieldSection[]>(() => {
  const current = device.value
  if (!current) {
    return []
  }

  return [
    {
      key: "device",
      title: "设备信息",
      rows: [
        {
          key: "status",
          label: "设备状态",
          value: {
            kind: "status",
            value: current.statusLabel,
            renderer: monitoringStatusRenderer,
          },
        },
        { key: "platform", label: "接入平台", value: current.platform },
        { key: "deviceId", label: "设备编号", value: current.deviceId },
        { key: "lastOnlineAt", label: "最后在线", value: current.lastOnlineAt },
      ],
    },
    {
      key: "location",
      title: "关联位置",
      rows: [
        { key: "customerName", label: "客户", value: current.customerName },
        { key: "parkName", label: "园区", value: current.parkName },
        { key: "buildingName", label: "位置", value: current.buildingName },
      ],
    },
    {
      key: "stream",
      title: "播放源",
      rows: [
        { key: "activeSource", label: "当前源", value: activeSourceLabel.value },
        { key: "playStatus", label: "播放状态", value: playerStatusLabel.value },
        { key: "streamUrl", label: "主测试流", value: current.streamUrl, truncate: false },
        { key: "fallbackStreamUrl", label: "备用测试流", value: current.fallbackStreamUrl, truncate: false },
      ],
    },
  ]
})

onMounted(() => {
  void loadMonitoringDevice()
})

watch(deviceId, () => {
  void loadMonitoringDevice()
})

async function loadMonitoringDevice() {
  const requestId = ++latestRequestId
  loading.value = true
  errorMessage.value = ""

  try {
    const devices = await fetchMonitoringAssetDevices()

    if (requestId !== latestRequestId) {
      return
    }

    monitoringRows.value = devices
  }
  catch (error) {
    if (requestId !== latestRequestId) {
      return
    }

    errorMessage.value = handleApiError(error, {
      title: "监控资产加载失败",
      fallback: "监控资产加载失败，请稍后重试。",
    })
  }
  finally {
    if (requestId === latestRequestId) {
      loading.value = false
    }
  }
}

function getDeviceStatusBadge(status: MonitoringDeviceStatus): { label: string; tone: StatusBadgeTone; icon: StatusBadgeIcon } {
  if (status === "online") {
    return { label: "在线", tone: "green", icon: "check" }
  }

  if (status === "unstable") {
    return { label: "波动", tone: "orange", icon: "clock" }
  }

  return { label: "离线", tone: "gray", icon: "minus" }
}

function handleBack() {
  void router.push({ name: "monitoring" })
}

function handleStatusChange(status: PlayerStatus) {
  playerStatus.value = status
}

function handleSourceChange(payload: { src: string; isFallback: boolean }) {
  activeStreamUrl.value = payload.src
  activeStreamIsFallback.value = payload.isFallback
}

function retryPlayer() {
  playerRef.value?.retryPrimaryStream()
}

async function copyText(value: string, label: string) {
  const normalized = value.trim()
  if (!normalized) {
    return
  }

  if (!navigator.clipboard) {
    toast.error("当前浏览器不支持复制")
    return
  }

  try {
    await navigator.clipboard.writeText(normalized)
    toast.success(`${label}已复制`)
  }
  catch {
    toast.error(`${label}复制失败`)
  }
}

function copyDeviceId(current: MonitoringDeviceRecord | null) {
  if (!current) {
    return
  }

  void copyText(current.deviceId, "设备编号")
}

function copyActiveStreamUrl() {
  const current = device.value
  const url = activeStreamUrl.value || current?.streamUrl || ""
  void copyText(url, "流地址")
}
</script>

<template>
  <DetailLayout
    :title="pageTitle"
    :subtitle="pageSubtitle"
    :empty="!loading && !device"
    :empty-text="errorMessage || '未找到监控设备'"
    @back="handleBack"
  >
    <template v-if="device" #actions>
      <Button variant="outline" type="button" @click="copyDeviceId(device)">
        <i class="ri-file-copy-line" />
        复制编号
      </Button>
      <Button variant="outline" type="button" @click="copyActiveStreamUrl">
        <i class="ri-link" />
        复制流地址
      </Button>
      <Button type="button" @click="retryPlayer">
        <i class="ri-refresh-line" />
        重试播放
      </Button>
    </template>

    <template #primary>
      <div v-if="device" class="flex min-h-0 min-w-0 flex-col gap-4 py-4">
        <MonitoringPlayer
          ref="playerRef"
          :src="device.streamUrl"
          :fallback-src="device.fallbackStreamUrl"
          :title="device.deviceName"
          @status-change="handleStatusChange"
          @source-change="handleSourceChange"
        />

        <div class="grid gap-3 sm:grid-cols-3">
          <section class="rounded-md border border-border bg-surface-tertiary p-3">
            <div class="flex items-center gap-2 text-xs text-muted-foreground">
              <i class="ri-base-station-line text-sm" />
              平台
            </div>
            <p class="mt-2 truncate text-sm font-medium text-foreground">{{ device.platform }}</p>
          </section>
          <section class="rounded-md border border-border bg-surface-tertiary p-3">
            <div class="flex items-center gap-2 text-xs text-muted-foreground">
              <i class="ri-pulse-line text-sm" />
              状态
            </div>
            <div class="mt-2">
              <StatusBadge
                :label="deviceStatusBadge.label"
                :tone="deviceStatusBadge.tone"
                :icon="deviceStatusBadge.icon"
              />
            </div>
          </section>
          <section class="rounded-md border border-border bg-surface-tertiary p-3">
            <div class="flex items-center gap-2 text-xs text-muted-foreground">
              <i class="ri-route-line text-sm" />
              当前源
            </div>
            <p class="mt-2 truncate text-sm font-medium text-foreground">{{ activeSourceLabel }}</p>
          </section>
        </div>

        <section class="rounded-md border border-brand-border bg-brand-surface px-4 py-3 text-sm leading-6 text-foreground">
          当前画面使用公开 HLS 测试流验证前端播放流程；后续后端接入客户平台后，页面只需要替换设备流地址来源。
        </section>
      </div>
      <div v-else-if="loading" class="flex min-h-[280px] items-center justify-center text-sm text-muted-foreground">
        正在加载监控资产...
      </div>
    </template>

    <template #secondary>
      <aside v-if="device" class="space-y-4 pb-6">
        <DetailFieldSections
          :sections="detailSections"
          compact
          label-width-mobile="5.5rem"
          label-width-desktop="6rem"
        />
      </aside>
    </template>
  </DetailLayout>
</template>
