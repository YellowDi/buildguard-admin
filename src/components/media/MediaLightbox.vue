<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref } from "vue"
import { FLOATING_OVERLAY_SURFACE_CLASS } from "@/components/ui/overlay"

export type MediaLightboxItem = {
  key: string
  src: string
  type?: "image" | "video"
  alt?: string
}

export type MediaLightboxOpen = (
  item: MediaLightboxItem,
  title: string,
  event: MouseEvent,
) => void

const LIGHTBOX_TRANSITION_MS = 260

type ActiveMedia = MediaLightboxItem & {
  title: string
}

const activeMedia = ref<ActiveMedia | null>(null)
const frameStyle = ref<Record<string, string>>({})
const backdropVisible = ref(false)
const closing = ref(false)
let sourceRect: DOMRect | null = null
let closeTimer: number | null = null
let suppressOpenUntil = 0
let previousBodyOverflow = ""

defineSlots<{
  default(props: {
    open: MediaLightboxOpen
    isOpen: boolean
  }): unknown
}>()

function open(item: MediaLightboxItem, title: string, event: MouseEvent) {
  event.preventDefault()
  event.stopPropagation()

  if (Date.now() < suppressOpenUntil || closing.value) {
    return
  }

  const sourceElement = event.currentTarget as HTMLElement | null

  if (!sourceElement) {
    return
  }

  clearCloseTimer()
  sourceRect = sourceElement.getBoundingClientRect()
  activeMedia.value = {
    ...item,
    title,
  }
  backdropVisible.value = false
  closing.value = false
  frameStyle.value = buildFrameStyle(sourceRect, false, 12)
  lockBodyScroll()
  window.addEventListener("keydown", handleKeydown)

  void nextTick(() => {
    window.requestAnimationFrame(() => {
      if (!activeMedia.value || !sourceRect) {
        return
      }

      backdropVisible.value = true
      frameStyle.value = buildFrameStyle(resolveTargetRect(sourceRect), true, 18)
    })
  })
}

function close(immediate = false) {
  if (!activeMedia.value) {
    return
  }

  suppressOpenUntil = Date.now() + LIGHTBOX_TRANSITION_MS + 140
  clearCloseTimer()

  if (immediate || !sourceRect) {
    reset()
    return
  }

  closing.value = true
  backdropVisible.value = false
  frameStyle.value = buildFrameStyle(sourceRect, true, 12)
  closeTimer = window.setTimeout(() => {
    reset()
  }, LIGHTBOX_TRANSITION_MS)
}

function reset() {
  clearCloseTimer()
  activeMedia.value = null
  backdropVisible.value = false
  closing.value = false
  sourceRect = null
  frameStyle.value = {}
  unlockBodyScroll()
  window.removeEventListener("keydown", handleKeydown)
}

function clearCloseTimer() {
  if (closeTimer === null) {
    return
  }

  window.clearTimeout(closeTimer)
  closeTimer = null
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    close()
  }
}

function isVideo(item: MediaLightboxItem) {
  return item.type === "video"
}

function buildFrameStyle(rect: DOMRect | LightboxRect, animated: boolean, borderRadius: number) {
  return {
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    borderRadius: `${borderRadius}px`,
    transitionProperty: animated ? "left, top, width, height, border-radius, box-shadow" : "none",
    transitionDuration: animated ? `${LIGHTBOX_TRANSITION_MS}ms` : "0ms",
    transitionTimingFunction: animated ? "cubic-bezier(0.22, 1, 0.36, 1)" : "linear",
  }
}

type LightboxRect = {
  left: number
  top: number
  width: number
  height: number
}

function resolveTargetRect(origin: DOMRect): LightboxRect {
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const viewportPaddingX = viewportWidth < 640 ? 20 : 56
  const viewportPaddingY = viewportHeight < 720 ? 28 : 64
  const maxWidth = Math.min(1120, Math.max(160, viewportWidth - viewportPaddingX * 2))
  const maxHeight = Math.min(820, Math.max(120, viewportHeight - viewportPaddingY * 2))
  const ratio = origin.width > 0 && origin.height > 0 ? origin.width / origin.height : 1
  let width = maxWidth
  let height = width / ratio

  if (height > maxHeight) {
    height = maxHeight
    width = height * ratio
  }

  return {
    left: (viewportWidth - width) / 2,
    top: (viewportHeight - height) / 2,
    width,
    height,
  }
}

function lockBodyScroll() {
  if (typeof document === "undefined") {
    return
  }

  previousBodyOverflow = document.body.style.overflow
  document.body.style.overflow = "hidden"
}

function unlockBodyScroll() {
  if (typeof document === "undefined") {
    return
  }

  document.body.style.overflow = previousBodyOverflow
}

onBeforeUnmount(() => {
  reset()
})
</script>

<template>
  <slot :open="open" :is-open="Boolean(activeMedia)" />

  <Teleport to="body">
    <div
      v-if="activeMedia"
      data-media-lightbox
      class="pointer-events-auto fixed inset-0 isolate z-[2147483647]"
      aria-modal="true"
      role="dialog"
      @click.self.prevent.stop="close()"
      @pointerdown.self.stop
    >
      <div
        class="fixed inset-0 cursor-zoom-out transition-[opacity] duration-200 ease-out"
        :class="[FLOATING_OVERLAY_SURFACE_CLASS, backdropVisible ? 'opacity-100' : 'opacity-0']"
        @click.prevent.stop="close()"
        @pointerdown.stop
      />

      <div
        class="fixed overflow-hidden bg-black shadow-[0_30px_80px_rgba(0,0,0,0.42),0_10px_30px_rgba(0,0,0,0.28)]"
        :class="closing ? 'shadow-[0_8px_24px_rgba(0,0,0,0.22)]' : ''"
        :style="frameStyle"
        @click.stop
        @pointerup.stop
        @pointerdown.stop
      >
        <video
          v-if="isVideo(activeMedia)"
          :src="activeMedia.src"
          controls
          autoplay
          playsinline
          class="h-full w-full bg-black object-contain"
        />
        <img
          v-else
          :src="activeMedia.src"
          :alt="activeMedia.alt ?? activeMedia.title"
          class="h-full w-full bg-black object-contain"
        >
      </div>

      <button
        type="button"
        class="fixed right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/92 text-[#1c1d20] shadow-[0_12px_30px_rgba(0,0,0,0.18)] transition-[opacity,transform] duration-150 ease-out hover:scale-[1.03] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        :class="backdropVisible ? 'translate-y-0 opacity-100' : '-translate-y-1 opacity-0'"
        aria-label="关闭附件预览"
        @click.prevent.stop="close()"
        @pointerup.stop
        @pointerdown.stop
      >
        <i class="ri-close-line text-[20px]" />
      </button>
    </div>
  </Teleport>
</template>
