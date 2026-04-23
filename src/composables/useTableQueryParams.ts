import { watch, type Ref } from "vue"
import type { LocationQueryValue, RouteLocationNormalizedLoaded, Router } from "vue-router"

import type { TableQueryControl } from "@/components/table-page/types"

type UseTableQueryParamsOptions = {
  controls: Ref<TableQueryControl[]>
  values: Ref<Record<string, string | string[]>>
  route: RouteLocationNormalizedLoaded
  router: Router
  onExternalChange?: () => void | Promise<void>
}

export function useTableQueryParams(options: UseTableQueryParamsOptions) {
  let syncingRoute = false
  let syncingValues = false

  watch(
    () => serializeRouteValues(options.controls.value, options.route.query),
    async () => {
      if (syncingRoute) {
        return
      }

      syncingValues = true
      options.values.value = parseRouteValues(options.controls.value, options.route.query)
      syncingValues = false
      await options.onExternalChange?.()
    },
    { immediate: true },
  )

  watch(
    options.values,
    async (nextValues) => {
      if (syncingValues) {
        return
      }

      const nextQuery = {
        ...options.route.query,
        ...buildQueryPatch(options.controls.value, nextValues),
      }

      if (serializeRouteValues(options.controls.value, nextQuery) === serializeRouteValues(options.controls.value, options.route.query)) {
        return
      }

      syncingRoute = true

      try {
        await options.router.replace({ query: nextQuery })
      } finally {
        syncingRoute = false
      }
    },
    { deep: true },
  )
}

function parseRouteValues(controls: TableQueryControl[], query: Record<string, LocationQueryValue | LocationQueryValue[] | undefined>) {
  return Object.fromEntries(controls.map((control) => {
    const queryKey = control.queryKey ?? control.key
    const rawValue = normalizeQueryValue(query[queryKey])

    if (control.type === "search") {
      return [control.key, rawValue]
    }

    return [control.key, rawValue ? rawValue.split(",").map(item => item.trim()).filter(Boolean) : []]
  }))
}

function buildQueryPatch(controls: TableQueryControl[], values: Record<string, string | string[]>) {
  return Object.fromEntries(controls.map((control) => {
    const queryKey = control.queryKey ?? control.key
    const value = values[control.key]

    if (control.type === "search") {
      const normalized = typeof value === "string" ? value.trim() : ""
      return [queryKey, normalized || undefined]
    }

    const normalized = Array.isArray(value)
      ? value.map(item => `${item}`.trim()).filter(Boolean)
      : []

    return [queryKey, normalized.length ? normalized.join(",") : undefined]
  }))
}

function serializeRouteValues(
  controls: TableQueryControl[],
  query: Record<string, LocationQueryValue | LocationQueryValue[] | undefined>,
) {
  return controls
    .map((control) => {
      const queryKey = control.queryKey ?? control.key
      return `${queryKey}:${normalizeQueryValue(query[queryKey])}`
    })
    .join("|")
}

function normalizeQueryValue(value: LocationQueryValue | LocationQueryValue[] | undefined) {
  if (Array.isArray(value)) {
    return normalizeQueryValue(value[0])
  }

  return typeof value === "string" ? value.trim() : ""
}
