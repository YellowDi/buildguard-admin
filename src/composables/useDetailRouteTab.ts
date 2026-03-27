import { computed, ref, toValue, watch, type MaybeRefOrGetter } from "vue"
import type { LocationQueryValue, RouteLocationNormalizedLoaded, Router } from "vue-router"

type UseDetailRouteTabOptions<T extends string> = {
  route: RouteLocationNormalizedLoaded
  router: Router
  tabs: MaybeRefOrGetter<readonly T[]>
  defaultTab: T
  queryKey?: string
}

export function useDetailRouteTab<T extends string>(options: UseDetailRouteTabOptions<T>) {
  const queryKey = options.queryKey ?? "tab"
  const activeTab = ref<T>(options.defaultTab)
  const allowedTabs = computed(() => new Set(toValue(options.tabs)))

  watch(
    () => options.route.query[queryKey],
    (value) => {
      const nextTab = normalizeTabQuery(value, allowedTabs.value, options.defaultTab)

      if (activeTab.value !== nextTab) {
        activeTab.value = nextTab
      }
    },
    { immediate: true },
  )

  function setActiveTab(nextTab: T) {
    if (!allowedTabs.value.has(nextTab)) {
      return
    }

    activeTab.value = nextTab

    const currentQueryValue = normalizeQueryValue(options.route.query[queryKey])

    if (nextTab === options.defaultTab) {
      if (!currentQueryValue) {
        return
      }

      const nextQuery = { ...options.route.query }
      delete nextQuery[queryKey]
      void options.router.replace({ query: nextQuery })
      return
    }

    if (currentQueryValue === nextTab) {
      return
    }

    void options.router.replace({
      query: {
        ...options.route.query,
        [queryKey]: nextTab,
      },
    })
  }

  return {
    activeTab,
    setActiveTab,
  }
}

function normalizeTabQuery<T extends string>(
  value: LocationQueryValue | LocationQueryValue[],
  allowedTabs: Set<T>,
  defaultTab: T,
) {
  const normalizedValue = normalizeQueryValue(value)
  return normalizedValue && allowedTabs.has(normalizedValue as T)
    ? normalizedValue as T
    : defaultTab
}

function normalizeQueryValue(value: LocationQueryValue | LocationQueryValue[]) {
  if (Array.isArray(value)) {
    return normalizeQueryValue(value[0])
  }

  return typeof value === "string" ? value.trim() : ""
}
