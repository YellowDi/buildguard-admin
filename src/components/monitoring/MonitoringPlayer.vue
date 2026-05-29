<script setup lang="ts">
import Hls from "hls.js"
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue"

import { Button } from "@/components/ui/button"

type PlayerStatus = "idle" | "loading" | "playing" | "error"
type SourceMode = "primary" | "fallback"

const props = withDefaults(defineProps<{
  src: string
  fallbackSrc?: string
  title?: string
}>(), {
  fallbackSrc: "",
  title: "监控画面",
})

const emit = defineEmits<{
  "status-change": [status: PlayerStatus]
  "source-change": [payload: { src: string; isFallback: boolean }]
}>()

const videoRef = ref<HTMLVideoElement | null>(null)
const status = ref<PlayerStatus>("idle")
const message = ref("等待连接监控流")
const sourceMode = ref<SourceMode>("primary")
const videoAspectRatio = ref("16 / 9")
let hls: Hls | null = null

const activeSrc = computed(() => (
  sourceMode.value === "fallback" && props.fallbackSrc ? props.fallbackSrc : props.src
))
const isUsingFallback = computed(() => sourceMode.value === "fallback")
const canUseFallback = computed(() => Boolean(props.fallbackSrc && props.fallbackSrc !== props.src))
const playerFrameStyle = computed(() => ({
  aspectRatio: videoAspectRatio.value,
}))
const statusLabel = computed(() => {
  if (status.value === "playing") return "正在播放"
  if (status.value === "loading") return "连接中"
  if (status.value === "error") return "播放失败"
  return "待播放"
})

function setStatus(nextStatus: PlayerStatus, nextMessage?: string) {
  status.value = nextStatus
  if (nextMessage !== undefined) {
    message.value = nextMessage
  }
  emit("status-change", nextStatus)
}

function destroyHls() {
  hls?.destroy()
  hls = null
}

function clearVideoSource() {
  const video = videoRef.value
  if (!video) {
    return
  }

  video.pause()
  video.removeAttribute("src")
  video.load()
}

function cleanupPlayer() {
  destroyHls()
  clearVideoSource()
}

function handleSourceFailure(nextMessage = "当前监控流无法播放，请稍后重试。") {
  if (sourceMode.value === "primary" && canUseFallback.value) {
    sourceMode.value = "fallback"
    setStatus("loading", "主测试流暂不可用，正在切换备用测试流。")
    void nextTick(() => loadStream())
    return
  }

  setStatus("error", nextMessage)
}

async function requestPlayback() {
  const video = videoRef.value
  if (!video) {
    return
  }

  try {
    await video.play()
    setStatus("playing", "监控流已连接。")
  }
  catch {
    setStatus("idle", "浏览器已阻止自动播放，请手动开始播放。")
  }
}

function loadNativeHls(video: HTMLVideoElement, source: string) {
  video.src = source
  video.load()
  void requestPlayback()
}

function loadHlsJs(video: HTMLVideoElement, source: string) {
  hls = new Hls({
    enableWorker: true,
    lowLatencyMode: true,
    liveSyncDurationCount: 3,
    backBufferLength: 60,
  })

  hls.on(Hls.Events.MEDIA_ATTACHED, () => {
    hls?.loadSource(source)
  })
  hls.on(Hls.Events.MANIFEST_PARSED, () => {
    void requestPlayback()
  })
  hls.on(Hls.Events.ERROR, (_event, data) => {
    if (!data.fatal) {
      return
    }

    if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
      handleSourceFailure("监控流网络连接失败，请检查流地址或稍后重试。")
      return
    }

    if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
      handleSourceFailure("监控流解码失败，已无法继续播放。")
      return
    }

    handleSourceFailure("监控流加载失败，请稍后重试。")
  })
  hls.attachMedia(video)
}

function loadStream() {
  const video = videoRef.value
  const source = activeSrc.value.trim()
  cleanupPlayer()
  videoAspectRatio.value = "16 / 9"

  if (!video) {
    return
  }

  if (!source) {
    setStatus("error", "当前设备没有配置可播放的监控流地址。")
    return
  }

  emit("source-change", {
    src: source,
    isFallback: isUsingFallback.value,
  })
  setStatus("loading", isUsingFallback.value ? "正在连接备用测试流..." : "正在连接主测试流...")

  if (video.canPlayType("application/vnd.apple.mpegurl")) {
    loadNativeHls(video, source)
    return
  }

  if (Hls.isSupported()) {
    loadHlsJs(video, source)
    return
  }

  setStatus("error", "当前浏览器不支持 HLS 播放。")
}

function retryPrimaryStream() {
  sourceMode.value = "primary"
  loadStream()
}

function retryCurrentStream() {
  loadStream()
}

function handleVideoError() {
  handleSourceFailure("监控画面播放失败，请稍后重试。")
}

function handleWaiting() {
  if (status.value === "playing") {
    setStatus("loading", "监控流缓冲中...")
  }
}

function syncVideoDimensions() {
  const video = videoRef.value
  if (!video || video.videoWidth <= 0 || video.videoHeight <= 0) {
    return
  }

  videoAspectRatio.value = `${video.videoWidth} / ${video.videoHeight}`
}

onMounted(() => {
  loadStream()
})

onBeforeUnmount(() => {
  cleanupPlayer()
})

watch(
  () => [props.src, props.fallbackSrc],
  () => {
    sourceMode.value = "primary"
    loadStream()
  },
)

defineExpose({
  retryPrimaryStream,
  retryCurrentStream,
})
</script>

<template>
  <section class="overflow-hidden rounded-md border border-border bg-[#101214] text-white shadow-[0_18px_36px_-28px_rgba(0,0,0,0.72)]">
    <div class="flex min-w-0 items-center justify-between gap-3 border-b border-white/10 bg-[#171a1d] px-3 py-2.5 sm:px-4">
      <div class="flex min-w-0 items-center gap-2">
        <span class="flex size-7 shrink-0 items-center justify-center rounded-md bg-white/8 text-white">
          <i class="ri-live-line text-base" />
        </span>
        <div class="min-w-0">
          <h2 class="truncate text-sm font-semibold leading-5">{{ props.title }}</h2>
          <p class="truncate text-xs leading-4 text-white/55">
            {{ isUsingFallback ? "备用测试流" : "主测试流" }} · {{ statusLabel }}
          </p>
        </div>
      </div>
      <div class="flex shrink-0 items-center gap-2 text-xs text-white/60">
        <span
          :class="[
            'size-2 rounded-full',
            status === 'playing' ? 'bg-[#2fca52]' : status === 'loading' ? 'bg-[#f07020]' : status === 'error' ? 'bg-[#be524b]' : 'bg-white/35',
          ]"
        />
        <span>{{ statusLabel }}</span>
      </div>
    </div>

    <div
      class="relative w-full bg-black transition-[height] duration-200 ease-out"
      :style="playerFrameStyle"
    >
      <video
        ref="videoRef"
        class="h-full w-full bg-black object-cover"
        controls
        muted
        playsinline
        preload="metadata"
        @error="handleVideoError"
        @loadeddata="syncVideoDimensions"
        @loadedmetadata="syncVideoDimensions"
        @playing="setStatus('playing', '监控流已连接。')"
        @resize="syncVideoDimensions"
        @waiting="handleWaiting"
      />

      <div
        v-if="status !== 'playing'"
        class="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/58 px-4 text-center backdrop-blur-[1px]"
      >
        <div class="pointer-events-auto flex max-w-[360px] flex-col items-center gap-3">
          <div
            :class="[
              'flex size-11 items-center justify-center rounded-full border text-xl',
              status === 'error' ? 'border-red-300/35 bg-red-500/16 text-red-100' : 'border-white/20 bg-white/10 text-white',
            ]"
          >
            <i v-if="status === 'loading'" class="ri-loader-4-line animate-spin" />
            <i v-else-if="status === 'error'" class="ri-error-warning-line" />
            <i v-else class="ri-play-fill translate-x-px" />
          </div>
          <div class="space-y-1">
            <p class="text-sm font-medium leading-5">{{ statusLabel }}</p>
            <p class="text-xs leading-5 text-white/66">{{ message }}</p>
          </div>
          <div class="flex flex-wrap justify-center gap-2">
            <Button
              v-if="status === 'idle'"
              type="button"
              variant="secondary"
              class="h-8 bg-white text-[#111315] hover:bg-white/90"
              @click="requestPlayback"
            >
              <i class="ri-play-fill" />
              播放
            </Button>
            <Button
              v-if="status === 'error'"
              type="button"
              variant="secondary"
              class="h-8 bg-white text-[#111315] hover:bg-white/90"
              @click="retryCurrentStream"
            >
              <i class="ri-refresh-line" />
              重试
            </Button>
            <Button
              v-if="status === 'error' && canUseFallback && !isUsingFallback"
              type="button"
              variant="outline"
              class="h-8 border-white/20 bg-white/8 text-white shadow-none hover:bg-white/14 hover:text-white"
              @click="sourceMode = 'fallback'; retryCurrentStream()"
            >
              <i class="ri-route-line" />
              备用流
            </Button>
            <Button
              v-if="status === 'error' && isUsingFallback"
              type="button"
              variant="outline"
              class="h-8 border-white/20 bg-white/8 text-white shadow-none hover:bg-white/14 hover:text-white"
              @click="retryPrimaryStream"
            >
              <i class="ri-arrow-go-back-line" />
              主测试流
            </Button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
