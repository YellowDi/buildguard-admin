import { computed, readonly, ref } from "vue"

export type RouteLoadingKind = "auth" | "dashboard" | "table" | "detail" | "form"

const LOADING_DELAY_MS = 120
const MIN_VISIBLE_MS = 220

const activeKind = ref<RouteLoadingKind>("table")
const isNavigating = ref(false)
const isVisible = ref(false)

let showTimer: ReturnType<typeof setTimeout> | null = null
let hideTimer: ReturnType<typeof setTimeout> | null = null
let visibleSince = 0

function clearShowTimer() {
  if (showTimer) {
    clearTimeout(showTimer)
    showTimer = null
  }
}

function clearHideTimer() {
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
}

export function beginRouteLoading(kind: RouteLoadingKind) {
  activeKind.value = kind
  isNavigating.value = true
  clearHideTimer()
  clearShowTimer()

  showTimer = setTimeout(() => {
    if (!isNavigating.value) {
      return
    }

    isVisible.value = true
    visibleSince = Date.now()
    showTimer = null
  }, LOADING_DELAY_MS)
}

export function endRouteLoading() {
  isNavigating.value = false
  clearShowTimer()

  if (!isVisible.value) {
    return
  }

  const elapsed = Date.now() - visibleSince
  const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed)

  clearHideTimer()
  hideTimer = setTimeout(() => {
    isVisible.value = false
    hideTimer = null
  }, remaining)
}

export function useRouteLoadingState() {
  return {
    loadingKind: readonly(activeKind),
    isRouteLoading: computed(() => isVisible.value),
  }
}
