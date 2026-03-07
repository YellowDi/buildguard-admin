import { computed, onMounted, ref, watch, type ComputedRef, type Ref } from "vue"

import type { SortFieldOption, SortRule } from "@/components/resource/SortPopover.vue"
import type {
  ResourceDateFilterState,
  ResourceFilterStateMaps,
  ResourceFilterType,
  ResourceHeaderField,
  ResourceHeaderTab,
  ResourceNumberFilterState,
  ResourceTableColumn,
  ResourceTagFilterState,
  ResourceTextFilterState,
} from "@/components/resource/types"

type MaybeRows<Row> = Row[] | Ref<Row[]> | ComputedRef<Row[]>

type ResourceListControllerConfig<Row, TabValue extends string | number = string | number> = {
  rows: MaybeRows<Row>
  title?: string
  primaryActionLabel?: string
  columns: ResourceTableColumn[]
  defaultVisibleFilterKeys?: string[]
  fixedTextFilters?: Record<string, ResourceTextFilterState>
  textFilters?: Record<string, ResourceTextFilterState>
  numberFilters?: Record<string, ResourceNumberFilterState>
  tagFilters?: Record<string, ResourceTagFilterState>
  dateFilters?: Record<string, ResourceDateFilterState>
  tagFilterOptions?: (rows: Row[]) => Record<string, string[]>
  initialSortRules?: SortRule[]
  sortStorageKey?: string
  sortFieldOptions?: SortFieldOption[]
  defaultTab: TabValue
  buildTabs: (rows: Row[], selectedTab: TabValue) => ResourceHeaderTab[]
  matchesTab: (row: Row, selectedTab: TabValue) => boolean
  buildSearchText: (row: Row) => string
  getFilterValue: (key: string, row: Row) => string
  getSortSummaryLabel: (field?: string | null) => string
  compareSort: (field: string, a: Row, b: Row) => number
  isSortField?: (value: unknown) => boolean
}

export type ResourceListPageConfig<Row, TabValue extends string | number = string | number> = Omit<
  ResourceListControllerConfig<Row, TabValue>,
  "rows"
>

function toPlainRows<Row>(rows: MaybeRows<Row>) {
  if (Array.isArray(rows)) {
    return rows
  }

  return rows.value
}

function cloneRecord<T extends Record<string, unknown>>(record?: T) {
  return Object.fromEntries(
    Object.entries(record ?? {}).map(([key, value]) => [key, { ...(value as Record<string, unknown>) }]),
  ) as T
}

export function useResourceListController<Row, TabValue extends string | number = string | number>(
  config: ResourceListControllerConfig<Row, TabValue>,
) {
  const rows = computed(() => toPlainRows(config.rows))
  const showControls = ref(true)
  const customSortEnabled = ref(false)
  const searchQuery = ref("")
  const selectedTab = ref<TabValue>(config.defaultTab)
  const visibleFilterKeys = ref<string[]>([...(config.defaultVisibleFilterKeys ?? [])])

  const textFilters = ref<ResourceFilterStateMaps["text"]>({
    ...cloneRecord(config.textFilters),
    ...cloneRecord(config.fixedTextFilters),
  })
  const numberFilters = ref<ResourceFilterStateMaps["number"]>(cloneRecord(config.numberFilters))
  const tagFilters = ref<ResourceFilterStateMaps["tag"]>(cloneRecord(config.tagFilters))
  const dateFilters = ref<ResourceFilterStateMaps["date"]>(cloneRecord(config.dateFilters))
  const sortRules = ref<SortRule[]>([...(config.initialSortRules ?? [])])

  const fixedFilterKeys = Object.keys(config.fixedTextFilters ?? {})
  const filterableColumns = computed(() => config.columns.filter((column) => column.filterType && column.filterType !== "none"))
  const availableFilterKeys = computed(() => filterableColumns.value.map((column) => column.label))
  const dateFilterFields = computed(() => config.columns.filter((column) => column.filterType === "time").map((column) => column.label))
  const tagFilterOptions = computed(() => config.tagFilterOptions?.(rows.value) ?? {})
  const tabs = computed(() => config.buildTabs(rows.value, selectedTab.value))
  const primarySortRule = computed(() => sortRules.value[0] ?? null)

  const fields = computed<ResourceHeaderField[]>(() => [
    ...(customSortEnabled.value && sortRules.value.length
      ? [{
          key: "sort",
          icon: primarySortRule.value?.direction === "desc" ? "ri-sort-desc" : "ri-sort-asc",
          label: config.getSortSummaryLabel(primarySortRule.value?.field),
          accent: customSortEnabled.value,
          arrow: true,
          kind: "sort",
        } as ResourceHeaderField]
      : []),
    ...visibleFilterKeys.value.map((key) => buildFilterField(key)),
    ...fixedFilterKeys.map((key) => buildFilterField(key)),
  ])

  const tabFilteredRows = computed(() => rows.value.filter((row) => config.matchesTab(row, selectedTab.value)))
  const filteredRows = computed(() => {
    const keyword = searchQuery.value.trim().toLowerCase()

    return tabFilteredRows.value.filter((row) => {
      if (keyword && !config.buildSearchText(row).toLowerCase().includes(keyword)) {
        return false
      }

      for (const filterKey of availableFilterKeys.value) {
        if (!matchesFilter(getFilterColumnByLabel(filterKey)?.filterType, filterKey, row)) {
          return false
        }
      }

      for (const fixedKey of fixedFilterKeys) {
        if (!matchesTextFilter(config.getFilterValue(fixedKey, row), textFilters.value[fixedKey])) {
          return false
        }
      }

      return true
    })
  })

  const visibleRows = computed(() => {
    if (!customSortEnabled.value || !sortRules.value.length) {
      return filteredRows.value
    }

    return [...filteredRows.value].sort((a, b) => {
      for (const rule of sortRules.value) {
        const comparison = config.compareSort(rule.field, a, b)
        if (comparison !== 0) {
          return rule.direction === "desc" ? -comparison : comparison
        }
      }

      return 0
    })
  })

  function getFilterColumnByLabel(label: string) {
    return config.columns.find((column) => column.label === label)
  }

  function buildFilterField(key: string): ResourceHeaderField {
    const isFixed = fixedFilterKeys.includes(key)
    const filterColumn = getFilterColumnByLabel(key)
    const filterType = isFixed ? "text" : filterColumn?.filterType ?? "text"

    return {
      key,
      icon: isFixed ? "ri-checkbox-multiple-blank-line" : getFilterIcon(filterType),
      label: filterType === "number"
        ? getNumberFilterSummary(key, numberFilters.value[key])
        : filterType === "time"
          ? getDateFilterSummary(key, dateFilters.value[key])
          : filterType === "tag"
            ? getTagFilterSummary(key, tagFilters.value[key])
            : getTextFilterSummary(key, textFilters.value[key]),
      arrow: true,
      accent: filterType === "number"
        ? numberFilters.value[key]?.enabled
        : filterType === "time"
          ? dateFilters.value[key]?.enabled
          : filterType === "tag"
            ? tagFilters.value[key]?.enabled
            : textFilters.value[key]?.enabled,
      kind: filterType === "number"
        ? "number-filter"
        : filterType === "time"
          ? "date-filter"
          : filterType === "tag"
            ? "tag-filter"
            : "text-filter",
    }
  }

  function getFilterIcon(filterType: ResourceFilterType) {
    if (filterType === "tag") return "ri-price-tag-3-line"
    if (filterType === "number") return "ri-hashtag"
    if (filterType === "contact") return "ri-user-line"
    if (filterType === "time") return "ri-calendar-line"
    return "ri-text"
  }

  function handleTabClick(tab: { value?: string | number; label: string }) {
    selectedTab.value = `${tab.value ?? tab.label}` as TabValue
  }

  function updateTextFilter(label: string, value: ResourceTextFilterState) {
    textFilters.value[label] = value
  }

  function updateNumberFilter(label: string, value: ResourceNumberFilterState) {
    numberFilters.value[label] = value
  }

  function updateTagFilter(label: string, value: ResourceTagFilterState) {
    tagFilters.value[label] = value
  }

  function updateDateFilter(label: string, value: ResourceDateFilterState) {
    dateFilters.value[label] = value
  }

  function handleAddFilter(key: string) {
    if (visibleFilterKeys.value.includes(key) || fixedFilterKeys.includes(key)) {
      return
    }

    visibleFilterKeys.value = [...visibleFilterKeys.value, key]
  }

  function handleReplaceFilter(payload: { from: string; to: string; value?: ResourceDateFilterState }) {
    if (payload.from === payload.to) {
      return
    }

    if (dateFilters.value[payload.to]) {
      dateFilters.value[payload.to] = payload.value ? { ...payload.value } : { ...dateFilters.value[payload.to] }
    }

    if (dateFilters.value[payload.from]) {
      resetDateFilter(payload.from)
    }

    if (fixedFilterKeys.includes(payload.from)) {
      return
    }

    const nextKeys = visibleFilterKeys.value.map((key) => (key === payload.from ? payload.to : key))
    visibleFilterKeys.value = nextKeys.filter((key, index) => nextKeys.indexOf(key) === index)
  }

  function handleRemoveFilter(key: string) {
    if (numberFilters.value[key]) {
      resetNumberFilter(key)
    }
    else if (tagFilters.value[key]) {
      resetTagFilter(key)
    }
    else if (dateFilters.value[key]) {
      resetDateFilter(key)
    }
    else {
      resetTextFilter(key)
    }

    if (fixedFilterKeys.includes(key)) {
      return
    }

    visibleFilterKeys.value = visibleFilterKeys.value.filter((item) => item !== key)
  }

  function resetTextFilter(key: string) {
    if (!textFilters.value[key]) {
      return
    }

    textFilters.value[key] = {
      ...textFilters.value[key],
      operator: "contains",
      query: "",
      enabled: false,
    }
  }

  function resetNumberFilter(key: string) {
    if (!numberFilters.value[key]) {
      return
    }

    numberFilters.value[key] = {
      ...numberFilters.value[key],
      operator: "equals",
      query: "",
      enabled: false,
    }
  }

  function resetTagFilter(key: string) {
    if (!tagFilters.value[key]) {
      return
    }

    tagFilters.value[key] = {
      ...tagFilters.value[key],
      operator: "equals",
      values: [],
      enabled: false,
    }
  }

  function resetDateFilter(key: string) {
    if (!dateFilters.value[key]) {
      return
    }

    dateFilters.value[key] = {
      ...dateFilters.value[key],
      operator: "equals",
      preset: "custom",
      startDate: "",
      endDate: "",
      enabled: false,
    }
  }

  function matchesFilter(filterType: ResourceFilterType | undefined, key: string, row: Row) {
    const source = config.getFilterValue(key, row)
    if (filterType === "number") return matchesNumberFilter(source, numberFilters.value[key])
    if (filterType === "time") return matchesDateFilter(source, dateFilters.value[key])
    if (filterType === "tag") return matchesTagFilter(source, tagFilters.value[key])
    return matchesTextFilter(source, textFilters.value[key])
  }

  if (config.sortStorageKey) {
    onMounted(() => {
      const storedValue = window.localStorage.getItem(config.sortStorageKey!)
      if (!storedValue) {
        return
      }

      try {
        const parsed = JSON.parse(storedValue) as { enabled?: boolean; rules?: Array<Partial<SortRule>> }
        if (typeof parsed.enabled === "boolean") {
          customSortEnabled.value = parsed.enabled
        }

        if (Array.isArray(parsed.rules)) {
          const nextRules = parsed.rules
            .filter((rule) => typeof rule.id === "string" && typeof rule.field === "string" && (config.isSortField?.(rule.field) ?? true) && (rule.direction === "asc" || rule.direction === "desc"))
            .map((rule) => ({
              id: rule.id as string,
              field: rule.field as string,
              direction: rule.direction as "asc" | "desc",
            }))

          if (nextRules.length) {
            sortRules.value = nextRules
          }
        }
      }
      catch {
        window.localStorage.removeItem(config.sortStorageKey!)
      }
    })

    watch(
      [customSortEnabled, sortRules],
      ([enabled, rules]) => {
        window.localStorage.setItem(config.sortStorageKey!, JSON.stringify({ enabled, rules }))
      },
      { deep: true },
    )
  }

  return {
    showControls,
    customSortEnabled,
    searchQuery,
    sortRules,
    selectedTab,
    textFilters,
    numberFilters,
    tagFilters,
    dateFilters,
    tabs,
    fields,
    availableFilterKeys,
    dateFilterFields,
    tagFilterOptions,
    visibleRows,
    handleTabClick,
    handleAddFilter,
    handleReplaceFilter,
    handleRemoveFilter,
    updateTextFilter,
    updateNumberFilter,
    updateTagFilter,
    updateDateFilter,
  }
}

function matchesTextFilter(source: string, filter?: ResourceTextFilterState) {
  if (!filter?.enabled) return true
  const normalizedSource = source.toLowerCase()
  const query = filter.query.trim().toLowerCase()
  if (filter.operator === "equals") return normalizedSource === query
  if (filter.operator === "notEquals") return normalizedSource !== query
  if (filter.operator === "notContains") return !normalizedSource.includes(query)
  if (filter.operator === "startsWith") return normalizedSource.startsWith(query)
  if (filter.operator === "endsWith") return normalizedSource.endsWith(query)
  if (filter.operator === "isEmpty") return source.trim().length === 0
  if (filter.operator === "isNotEmpty") return source.trim().length > 0
  if (!query) return true
  return normalizedSource.includes(query)
}

function matchesNumberFilter(source: string, filter?: ResourceNumberFilterState) {
  if (!filter?.enabled) return true
  const normalizedSource = source.trim()
  if (filter.operator === "isEmpty") return normalizedSource.length === 0
  if (filter.operator === "isNotEmpty") return normalizedSource.length > 0
  const sourceValue = Number(normalizedSource)
  const queryValue = Number(filter.query.trim())
  if (Number.isNaN(sourceValue) || Number.isNaN(queryValue)) return false
  if (filter.operator === "equals") return sourceValue === queryValue
  if (filter.operator === "notEquals") return sourceValue !== queryValue
  if (filter.operator === "gt") return sourceValue > queryValue
  if (filter.operator === "lt") return sourceValue < queryValue
  if (filter.operator === "gte") return sourceValue >= queryValue
  return sourceValue <= queryValue
}

function matchesTagFilter(source: string, filter?: ResourceTagFilterState) {
  if (!filter?.enabled) return true
  const normalizedSource = source.trim()
  if (filter.operator === "isEmpty") return normalizedSource.length === 0
  if (filter.operator === "isNotEmpty") return normalizedSource.length > 0
  if (!filter.values.length) return true
  const matched = filter.values.includes(source)
  return filter.operator === "notEquals" ? !matched : matched
}

function matchesDateFilter(source: string, filter?: ResourceDateFilterState) {
  if (!filter?.enabled) return true
  const normalizedSource = source.trim()
  if (filter.operator === "isEmpty") return normalizedSource.length === 0
  if (filter.operator === "isNotEmpty") return normalizedSource.length > 0
  if (!normalizedSource) return false

  const sourceDate = new Date(`${normalizedSource}T00:00:00`)
  const startRange = parseDateInputRange(filter.startDate)
  const endRange = parseDateInputRange(filter.endDate)
  const startDate = startRange?.start ?? null
  const startRangeEnd = startRange?.end ?? null
  const endRangeEnd = endRange?.end ?? null

  if (Number.isNaN(sourceDate.getTime())) return false
  if (filter.operator === "equals") return startDate !== null && startRangeEnd !== null && sourceDate >= startDate && sourceDate <= startRangeEnd
  if (filter.operator === "before") return startDate !== null && sourceDate < startDate
  if (filter.operator === "after") return startRangeEnd !== null && sourceDate > startRangeEnd
  if (filter.operator === "onOrBefore") return startRangeEnd !== null && sourceDate <= startRangeEnd
  if (filter.operator === "onOrAfter") return startDate !== null && sourceDate >= startDate
  if (filter.operator === "relativeToToday") return startDate !== null && sourceDate.getTime() === startDate.getTime()
  if (filter.operator === "between") return startDate !== null && endRangeEnd !== null && sourceDate >= startDate && sourceDate <= endRangeEnd
  return true
}

function parseDateInputRange(value: string) {
  const compactValue = value.trim().replace(/\s+/g, "")
  if (!compactValue) return null

  const relativeRange = parseRelativeDateRange(compactValue)
  if (relativeRange) return relativeRange

  const normalizedValue = normalizeDateInput(compactValue)
  const fullDateMatch = normalizedValue.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (fullDateMatch) {
    const year = Number(fullDateMatch[1])
    const month = Number(fullDateMatch[2])
    const day = Number(fullDateMatch[3])
    const start = createDateAtMidnight(year, month, day)
    if (Number.isNaN(start.getTime())) return null
    if (start.getFullYear() !== year || start.getMonth() !== month - 1 || start.getDate() !== day) return null
    return { start, end: new Date(start) }
  }

  const yearMonthMatch = normalizedValue.match(/^(\d{4})-(\d{1,2})$/)
  if (yearMonthMatch) return buildMonthRange(Number(yearMonthMatch[1]), Number(yearMonthMatch[2]))

  const yearMatch = normalizedValue.match(/^(\d{4})$/)
  if (yearMatch) return buildYearRange(Number(yearMatch[1]))

  return null
}

function parseRelativeDateRange(value: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const recentDays = value.match(/^近(\d+)天$/) ?? value.match(/^最近(\d+)天$/)
  if (recentDays) return buildRollingRange(today, -Number(recentDays[1]) + 1, 0)

  const futureDays = value.match(/^未来(\d+)天$/)
  if (futureDays) return buildRollingRange(today, 0, Number(futureDays[1]) - 1)

  const pastDays = value.match(/^过去(\d+)天$/)
  if (pastDays) return buildRollingRange(today, -Number(pastDays[1]) + 1, 0)

  if (value === "今天") return buildSingleDayRange(today)
  if (value === "明天") return buildSingleDayRange(offsetDate(today, 1))
  if (value === "昨天") return buildSingleDayRange(offsetDate(today, -1))
  if (value === "本周") return buildWeekRange(today, 0)
  if (value === "本周末") return buildWeekendRange(today, 0)
  if (value === "下周") return buildWeekRange(today, 1)
  if (value === "上周") return buildWeekRange(today, -1)
  if (value === "本月") return buildMonthRange(today.getFullYear(), today.getMonth() + 1)
  if (value === "月底") return buildMonthEndRange(today.getFullYear(), today.getMonth() + 1)

  const monthOnly = parseMonthOnlyValue(value)
  if (monthOnly !== null) return buildMonthRange(today.getFullYear(), monthOnly)

  if (value === "下月") {
    const date = new Date(today.getFullYear(), today.getMonth() + 1, 1)
    return buildMonthRange(date.getFullYear(), date.getMonth() + 1)
  }

  if (value === "上月") {
    const date = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    return buildMonthRange(date.getFullYear(), date.getMonth() + 1)
  }

  if (value === "本年") return buildYearRange(today.getFullYear())
  if (value === "本季度") return buildQuarterRange(today.getFullYear(), Math.floor(today.getMonth() / 3) + 1)
  if (value === "下季度") return buildQuarterRange(today.getMonth() >= 9 ? today.getFullYear() + 1 : today.getFullYear(), (Math.floor(today.getMonth() / 3) + 1) % 4 + 1)
  if (value === "上季度") return buildQuarterRange(today.getMonth() < 3 ? today.getFullYear() - 1 : today.getFullYear(), Math.floor((today.getMonth() + 9) / 3))
  if (value === "明年") return buildYearRange(today.getFullYear() + 1)
  if (value === "去年") return buildYearRange(today.getFullYear() - 1)

  return null
}

function buildRollingRange(baseDate: Date, startOffset: number, endOffset: number) {
  const start = offsetDate(baseDate, startOffset)
  const end = offsetDate(baseDate, endOffset)
  return { start, end }
}

function offsetDate(baseDate: Date, days: number) {
  const date = new Date(baseDate)
  date.setDate(date.getDate() + days)
  date.setHours(0, 0, 0, 0)
  return date
}

function normalizeDateInput(value: string) {
  return value.trim().replace(/\s+/g, "").replace(/[./]/g, "-").replace(/年/g, "-").replace(/月/g, "-").replace(/日/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "")
}

function createDateAtMidnight(year: number, month: number, day: number) {
  const date = new Date(year, month - 1, day)
  date.setHours(0, 0, 0, 0)
  return date
}

function buildSingleDayRange(date: Date) {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  return { start, end: new Date(start) }
}

function buildWeekRange(baseDate: Date, weekOffset: number) {
  const current = offsetDate(baseDate, weekOffset * 7)
  const weekday = (current.getDay() + 6) % 7
  const start = offsetDate(current, -weekday)
  const end = offsetDate(start, 6)
  return { start, end }
}

function buildMonthRange(year: number, month: number) {
  if (month < 1 || month > 12) return null
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0)
  start.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)
  return { start, end }
}

function buildWeekendRange(baseDate: Date, weekOffset: number) {
  const weekRange = buildWeekRange(baseDate, weekOffset)
  return { start: offsetDate(weekRange.start, 5), end: offsetDate(weekRange.start, 6) }
}

function buildMonthEndRange(year: number, month: number) {
  const end = new Date(year, month, 0)
  end.setHours(0, 0, 0, 0)
  const start = offsetDate(end, -2)
  return { start, end }
}

function buildQuarterRange(year: number, quarter: number) {
  const startMonth = (quarter - 1) * 3 + 1
  const start = new Date(year, startMonth - 1, 1)
  const end = new Date(year, startMonth + 2, 0)
  start.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)
  return { start, end }
}

function buildYearRange(year: number) {
  const start = new Date(year, 0, 1)
  const end = new Date(year, 11, 31)
  start.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)
  return { start, end }
}

function parseMonthOnlyValue(value: string) {
  const arabicMatch = value.match(/^(\d{1,2})月$/)
  if (arabicMatch) {
    const month = Number(arabicMatch[1])
    return month >= 1 && month <= 12 ? month : null
  }

  const chineseMatch = value.match(/^([一二三四五六七八九十]+)月$/)
  if (!chineseMatch) return null
  const month = parseChineseMonth(chineseMatch[1])
  return month >= 1 && month <= 12 ? month : null
}

function parseChineseMonth(value: string) {
  const map: Record<string, number> = { "一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9, "十": 10, "十一": 11, "十二": 12 }
  return map[value] ?? 0
}

function getTextFilterSummary(label: string, filter?: ResourceTextFilterState) {
  if (!filter?.enabled) return label
  const operatorLabel = getTextFilterOperatorLabel(filter.operator)
  if (filter.operator === "isEmpty" || filter.operator === "isNotEmpty") return `${label} ${operatorLabel}`
  const query = filter.query.trim()
  return query ? `${label} ${operatorLabel} ${query}` : label
}

function getNumberFilterSummary(label: string, filter?: ResourceNumberFilterState) {
  if (!filter?.enabled) return label
  const operatorLabel = getNumberFilterOperatorLabel(filter.operator)
  if (filter.operator === "isEmpty" || filter.operator === "isNotEmpty") return `${label} ${operatorLabel}`
  const query = filter.query.trim()
  return query ? `${label} ${operatorLabel} ${query}` : label
}

function getTagFilterSummary(label: string, filter?: ResourceTagFilterState) {
  if (!filter?.enabled) return label
  const operatorLabel = getTagFilterOperatorLabel(filter.operator)
  if (filter.operator === "isEmpty" || filter.operator === "isNotEmpty") return `${label} ${operatorLabel}`
  if (!filter.values.length) return label
  return filter.values.length === 1 ? `${label} ${operatorLabel} ${filter.values[0]}` : `${label} ${operatorLabel} ${filter.values.length} 项`
}

function getDateFilterSummary(label: string, filter?: ResourceDateFilterState) {
  if (!filter?.enabled) return label
  const operatorLabel = getDateFilterOperatorLabel(filter.operator)
  if (filter.operator === "isEmpty" || filter.operator === "isNotEmpty") return `${label} ${operatorLabel}`
  if (filter.operator === "between" && filter.startDate && filter.endDate) return `${label} ${operatorLabel} ${filter.startDate} ~ ${filter.endDate}`
  return filter.startDate ? `${label} ${operatorLabel} ${filter.startDate}` : label
}

function getTextFilterOperatorLabel(operator: ResourceTextFilterState["operator"]) {
  if (operator === "equals") return "是"
  if (operator === "notEquals") return "不是"
  if (operator === "notContains") return "不包含"
  if (operator === "startsWith") return "开头是"
  if (operator === "endsWith") return "结尾是"
  if (operator === "isEmpty") return "为空白"
  if (operator === "isNotEmpty") return "不为空白"
  return "包含"
}

function getNumberFilterOperatorLabel(operator: ResourceNumberFilterState["operator"]) {
  if (operator === "notEquals") return "≠"
  if (operator === "gt") return ">"
  if (operator === "lt") return "<"
  if (operator === "gte") return "≥"
  if (operator === "lte") return "≤"
  if (operator === "isEmpty") return "为空白"
  if (operator === "isNotEmpty") return "不为空白"
  return "="
}

function getTagFilterOperatorLabel(operator: ResourceTagFilterState["operator"]) {
  if (operator === "notEquals") return "不是"
  if (operator === "isEmpty") return "为空白"
  if (operator === "isNotEmpty") return "不为空白"
  return "是"
}

function getDateFilterOperatorLabel(operator: ResourceDateFilterState["operator"]) {
  if (operator === "before") return "早于"
  if (operator === "after") return "晚于"
  if (operator === "onOrBefore") return "不晚于"
  if (operator === "onOrAfter") return "不早于"
  if (operator === "between") return "介于"
  if (operator === "relativeToToday") return "相对于今天"
  if (operator === "isEmpty") return "为空白"
  if (operator === "isNotEmpty") return "不为空白"
  return "是"
}
