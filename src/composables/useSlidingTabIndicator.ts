import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type MaybeRefOrGetter } from "vue"
import { toValue } from "vue"

type SlidingIndicatorStyle = {
  width: string
  transform: string
  opacity: string
}

export function useSlidingTabIndicator<T extends string | number>(options: {
  activeKey: MaybeRefOrGetter<T | "">
  watchSource: MaybeRefOrGetter<readonly unknown[]>
}) {
  const tabElements = new Map<T, HTMLButtonElement>()
  const indicatorLeft = ref(0)
  const indicatorWidth = ref(0)

  const indicatorStyle = computed<SlidingIndicatorStyle>(() => ({
    width: `${indicatorWidth.value}px`,
    transform: `translateX(${indicatorLeft.value}px)`,
    opacity: indicatorWidth.value > 0 ? "1" : "0",
  }))

  function syncIndicator() {
    const activeKey = toValue(options.activeKey)
    if (activeKey === "") {
      indicatorWidth.value = 0
      return
    }

    const activeElement = tabElements.get(activeKey as T)
    if (!activeElement) {
      indicatorWidth.value = 0
      return
    }

    indicatorLeft.value = activeElement.offsetLeft
    indicatorWidth.value = activeElement.offsetWidth
  }

  function scheduleSync() {
    void nextTick(syncIndicator)
  }

  function setTabRef(key: T, element: Element | null) {
    if (element instanceof HTMLButtonElement) {
      tabElements.set(key, element)
    }
    else {
      tabElements.delete(key)
    }

    scheduleSync()
  }

  onMounted(() => {
    scheduleSync()
    window.addEventListener("resize", syncIndicator)
  })

  onBeforeUnmount(() => {
    window.removeEventListener("resize", syncIndicator)
  })

  watch(() => toValue(options.activeKey), scheduleSync)
  watch(() => toValue(options.watchSource), scheduleSync, { deep: true })

  return {
    indicatorStyle,
    setTabRef,
    syncIndicator,
  }
}
