import { watch } from "vue"
import type { LocationQueryValue, RouteLocationNormalizedLoaded } from "vue-router"

import type { TablePageController } from "@/components/table-page/useTablePage"

type UseRouteTableSearchOptions = {
  queryKey?: string
  filterKey?: string
}

export function useRouteTableSearch(
  page: TablePageController<any>,
  route: RouteLocationNormalizedLoaded,
  options: UseRouteTableSearchOptions = {},
) {
  const queryKey = options.queryKey ?? "q"
  const filterKey = options.filterKey ?? "在页面中"

  watch(
    () => route.query[queryKey],
    (value) => {
      const query = normalizeQueryValue(value)
      const filter = page.textFilters.value[filterKey]

      if (!filter) {
        return
      }

      page.updateTextFilter(filterKey, {
        ...filter,
        enabled: query.length > 0,
        operator: "contains",
        query,
      })
    },
    { immediate: true },
  )
}

function normalizeQueryValue(value: LocationQueryValue | LocationQueryValue[]) {
  if (Array.isArray(value)) {
    return normalizeQueryValue(value[0])
  }

  return typeof value === "string" ? value.trim() : ""
}
