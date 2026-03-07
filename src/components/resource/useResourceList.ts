import { computed, onMounted, ref, watch, type ComputedRef, type Ref } from "vue"

import type { SortFieldOption, SortRule } from "@/components/resource/SortPopover.vue"
import type {
  DateFilterState,
  FilterStateMaps,
  HeaderField,
  HeaderTab,
  NumberFilterState,
  ResourceFilterDefinition,
  ResourceListColumn,
  ResourceListSchema,
  ResourceTabsDefinition,
  ResourceFilterType,
  ResourceRowKey,
  TableColumn,
  TagFilterState,
  TextFilterState,
} from "@/components/resource/types"

type MaybeRows<Row> = Row[] | Ref<Row[]> | ComputedRef<Row[]>

type NormalizedSortField<Row> = {
  field: string
  label: string
  kind: "text" | "metric"
  value: (row: Row) => string | number | null | undefined
}

type NormalizedFilter<Row> = ResourceFilterDefinition<Row> & {
  value: (row: Row) => unknown
}

export type ResourceListDefinition<Row> = {
  title: string
  rowKey: ResourceRowKey<Row>
  rows: MaybeRows<Row>
  columns: TableColumn[]
  summary?: string
  primaryActionLabel?: string
  showIndex?: boolean
  stickyHeader?: boolean
  wrapperClass?: string
  tableClass?: string
  searchPlaceholder?: string
  filters: NormalizedFilter<Row>[]
  sort: {
    storageKey?: string
    fields: NormalizedSortField<Row>[]
    initialSortRules: SortRule[]
  }
  tabs: ResourceTabsDefinition<Row>
}

export type ResourceListController<Row> = ReturnType<typeof useResourceList<Row>>

export function createResourceListDefinition<Row>(schema: ResourceListSchema<Row>): ResourceListDefinition<Row> {
  const columnFilters = schema.columns.flatMap((column) => {
    if (!column.filter) {
      return []
    }

    return [normalizeFilter<Row>({
      key: column.filter.label ?? column.label,
      label: column.filter.label ?? column.label,
      type: column.filter.type,
      placeholder: column.filter.placeholder,
      defaultVisible: column.filter.defaultVisible,
      fixed: column.filter.fixed,
      options: column.filter.options,
      value: column.filter.value ?? ((row: Row) => row[column.key]),
    })]
  })

  const extraFilters = (schema.filters ?? []).map(normalizeFilter)
  const filters = [...columnFilters, ...extraFilters]

  const sortFields: NormalizedSortField<Row>[] = (schema.sort?.fields?.length
    ? schema.sort.fields
    : schema.columns.flatMap((column) => {
        if (!column.sort) {
          return []
        }

        if (column.sort === true) {
          return [{
            field: column.key,
            label: column.label,
            kind: "text" as const,
            value: (row: Row) => normalizeSortValue(row[column.key]),
          }]
        }

        return [{
          field: column.key,
          label: column.sort.label ?? column.label,
          kind: column.sort.kind ?? "text",
          value: column.sort.value ?? ((row: Row) => normalizeSortValue(row[column.key])),
        }]
      }))
    .map(field => ({
      field: field.field,
      label: field.label,
      kind: field.kind ?? "text",
      value: field.value ?? (() => ""),
    }))

  const initialField = schema.sort?.initialField ?? sortFields[0]?.field ?? ""
  const initialDirection = schema.sort?.initialDirection ?? getDefaultSortDirection(sortFields.find(field => field.field === initialField)?.kind)
  const initialSortRules = initialField
    ? [{
        id: `sort-${initialField}`,
        field: initialField,
        direction: initialDirection,
      }]
    : []

  return {
    title: schema.title,
    rowKey: schema.rowKey,
    rows: schema.data,
    columns: schema.columns,
    summary: schema.summary,
    primaryActionLabel: schema.primaryActionLabel,
    showIndex: schema.showIndex,
    stickyHeader: schema.stickyHeader,
    wrapperClass: schema.wrapperClass,
    tableClass: schema.tableClass,
    searchPlaceholder: schema.search?.placeholder,
    filters,
    sort: {
      storageKey: schema.sort?.storageKey,
      fields: sortFields,
      initialSortRules,
    },
    tabs: schema.tabs ?? { mode: "none" },
  }
}

export function useResourceList<Row>(input: ResourceListSchema<Row> | ResourceListDefinition<Row>) {
  const definition = isResourceListDefinition(input) ? input : createResourceListDefinition(input)
  const rows = computed(() => toPlainRows(definition.rows))

  const showControls = ref(true)
  const customSortEnabled = ref(definition.sort.initialSortRules.length > 0)
  const searchQuery = ref("")
  const selectedTab = ref(getDefaultTabValue(definition.tabs))
  const visibleFilterKeys = ref(definition.filters.filter(filter => filter.defaultVisible && !filter.fixed).map(filter => filter.key))

  const textFilters = ref<FilterStateMaps["text"]>(buildTextFilters(definition.filters))
  const numberFilters = ref<FilterStateMaps["number"]>(buildNumberFilters(definition.filters))
  const tagFilters = ref<FilterStateMaps["tag"]>(buildTagFilters(definition.filters))
  const dateFilters = ref<FilterStateMaps["date"]>(buildDateFilters(definition.filters))
  const sortRules = ref<SortRule[]>([...definition.sort.initialSortRules])

  const fixedFilterKeys = definition.filters.filter(filter => filter.fixed).map(filter => filter.key)
  const filterMap = new Map(definition.filters.map(filter => [filter.key, filter]))
  const availableFilterKeys = computed(() => definition.filters.filter(filter => !filter.fixed).map(filter => filter.key))
  const dateFilterFields = computed(() => definition.filters.filter(filter => filter.type === "date").map(filter => filter.key))
  const sortFieldOptions = computed<SortFieldOption[]>(() => definition.sort.fields.map(field => ({
    value: field.field,
    label: field.label,
    kind: field.kind,
  })))
  const tagFilterOptions = computed(() => Object.fromEntries(
    definition.filters
      .filter((filter): filter is NormalizedFilter<Row> & { type: "tag" } => filter.type === "tag")
      .map((filter) => [filter.key, resolveTagOptions(filter, rows.value)]),
  ) as Record<string, string[]>)
  const tabs = computed(() => buildTabs(rows.value, definition.tabs, selectedTab.value))
  const primarySortRule = computed(() => sortRules.value[0] ?? null)

  const fields = computed<HeaderField[]>(() => [
    ...(customSortEnabled.value && sortRules.value.length
      ? [{
          key: "sort",
          icon: primarySortRule.value?.direction === "desc" ? "ri-sort-desc" : "ri-sort-asc",
          label: getSortSummaryLabel(sortFieldOptions.value, primarySortRule.value?.field),
          accent: customSortEnabled.value,
          arrow: true,
          kind: "sort",
        } as HeaderField]
      : []),
    ...visibleFilterKeys.value.map(buildFilterField),
    ...fixedFilterKeys.map(buildFilterField),
  ])

  const tabFilteredRows = computed(() => rows.value.filter(row => matchesTab(row, definition.tabs, selectedTab.value)))
  const filteredRows = computed(() => {
    const keyword = searchQuery.value.trim().toLowerCase()

    return tabFilteredRows.value.filter((row) => {
      if (keyword && !buildSearchText(row, input).toLowerCase().includes(keyword)) {
        return false
      }

      for (const filterKey of availableFilterKeys.value) {
        if (!matchesFilter(filterMap.get(filterKey), row)) {
          return false
        }
      }

      for (const fixedKey of fixedFilterKeys) {
        if (!matchesFilter(filterMap.get(fixedKey), row)) {
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
        const comparison = compareByRule(rule.field, a, b, definition.sort.fields)
        if (comparison !== 0) {
          return rule.direction === "desc" ? -comparison : comparison
        }
      }

      return 0
    })
  })

  function buildFilterField(key: string): HeaderField {
    const filter = filterMap.get(key)
    const filterType = filter?.type ?? "text"

    return {
      key,
      icon: filter?.fixed ? "ri-checkbox-multiple-blank-line" : getFilterIcon(filterType),
      label: filterType === "number"
        ? getNumberFilterSummary(key, numberFilters.value[key])
        : filterType === "date"
          ? getDateFilterSummary(key, dateFilters.value[key])
          : filterType === "tag"
            ? getTagFilterSummary(key, tagFilters.value[key])
            : getTextFilterSummary(key, textFilters.value[key]),
      arrow: true,
      accent: filterType === "number"
        ? numberFilters.value[key]?.enabled
        : filterType === "date"
          ? dateFilters.value[key]?.enabled
          : filterType === "tag"
            ? tagFilters.value[key]?.enabled
            : textFilters.value[key]?.enabled,
      kind: filterType === "number"
        ? "number-filter"
        : filterType === "date"
          ? "date-filter"
          : filterType === "tag"
            ? "tag-filter"
            : "text-filter",
    }
  }

  function handleTabClick(tab: { value?: string | number; label: string }) {
    selectedTab.value = `${tab.value ?? tab.label}`
  }

  function updateTextFilter(label: string, value: TextFilterState) {
    textFilters.value[label] = value
  }

  function updateNumberFilter(label: string, value: NumberFilterState) {
    numberFilters.value[label] = value
  }

  function updateTagFilter(label: string, value: TagFilterState) {
    tagFilters.value[label] = value
  }

  function updateDateFilter(label: string, value: DateFilterState) {
    dateFilters.value[label] = value
  }

  function handleAddFilter(key: string) {
    if (visibleFilterKeys.value.includes(key) || fixedFilterKeys.includes(key)) {
      return
    }

    visibleFilterKeys.value = [...visibleFilterKeys.value, key]
  }

  function handleReplaceFilter(payload: { from: string; to: string; value?: DateFilterState }) {
    if (payload.from === payload.to) {
      return
    }

    if (dateFilters.value[payload.to]) {
      dateFilters.value[payload.to] = payload.value ? { ...payload.value } : { ...dateFilters.value[payload.to] }
    }

    if (dateFilters.value[payload.from]) {
      resetDateFilter(dateFilters.value, payload.from)
    }

    if (fixedFilterKeys.includes(payload.from)) {
      return
    }

    const nextKeys = visibleFilterKeys.value.map(key => (key === payload.from ? payload.to : key))
    visibleFilterKeys.value = nextKeys.filter((key, index) => nextKeys.indexOf(key) === index)
  }

  function handleRemoveFilter(key: string) {
    const filterType = filterMap.get(key)?.type ?? "text"
    if (filterType === "number") {
      resetNumberFilter(numberFilters.value, key)
    }
    else if (filterType === "tag") {
      resetTagFilter(tagFilters.value, key)
    }
    else if (filterType === "date") {
      resetDateFilter(dateFilters.value, key)
    }
    else {
      resetTextFilter(textFilters.value, key)
    }

    if (fixedFilterKeys.includes(key)) {
      return
    }

    visibleFilterKeys.value = visibleFilterKeys.value.filter(item => item !== key)
  }

  if (definition.sort.storageKey) {
    onMounted(() => {
      const storedValue = window.localStorage.getItem(definition.sort.storageKey!)
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
            .filter(rule => typeof rule.id === "string" && typeof rule.field === "string" && definition.sort.fields.some(field => field.field === rule.field) && (rule.direction === "asc" || rule.direction === "desc"))
            .map(rule => ({
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
        window.localStorage.removeItem(definition.sort.storageKey!)
      }
    })

    watch(
      [customSortEnabled, sortRules],
      ([enabled, rules]) => {
        window.localStorage.setItem(definition.sort.storageKey!, JSON.stringify({ enabled, rules }))
      },
      { deep: true },
    )
  }

  return {
    title: definition.title,
    summary: definition.summary,
    columns: definition.columns,
    rowKey: definition.rowKey,
    primaryActionLabel: definition.primaryActionLabel,
    showIndex: definition.showIndex,
    stickyHeader: definition.stickyHeader,
    wrapperClass: definition.wrapperClass,
    tableClass: definition.tableClass,
    searchPlaceholder: definition.searchPlaceholder,
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
    sortFieldOptions,
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

  function matchesFilter(filter: NormalizedFilter<Row> | undefined, row: Row) {
    if (!filter) {
      return true
    }

    const source = stringifyValue(filter.value(row))
    if (filter.type === "number") return matchesNumberFilter(source, numberFilters.value[filter.key])
    if (filter.type === "date") return matchesDateFilter(source, dateFilters.value[filter.key])
    if (filter.type === "tag") return matchesTagFilter(source, tagFilters.value[filter.key])
    return matchesTextFilter(source, textFilters.value[filter.key])
  }
}

function isResourceListDefinition<Row>(value: ResourceListSchema<Row> | ResourceListDefinition<Row>): value is ResourceListDefinition<Row> {
  return "rows" in value && "filters" in value && "sort" in value
}

function normalizeFilter<Row>(filter: ResourceFilterDefinition<Row>): NormalizedFilter<Row> {
  return {
    ...filter,
    value: filter.value ?? (() => ""),
  }
}

function toPlainRows<Row>(rows: MaybeRows<Row>) {
  if (Array.isArray(rows)) {
    return rows
  }

  return rows.value
}

function buildTextFilters<Row>(filters: NormalizedFilter<Row>[]) {
  return Object.fromEntries(
    filters
      .filter(filter => filter.type === "text")
      .map(filter => [filter.key, {
        enabled: false,
        operator: "contains",
        query: "",
        placeholder: filter.placeholder,
      } satisfies TextFilterState]),
  ) as Record<string, TextFilterState>
}

function buildNumberFilters<Row>(filters: NormalizedFilter<Row>[]) {
  return Object.fromEntries(
    filters
      .filter(filter => filter.type === "number")
      .map(filter => [filter.key, {
        enabled: false,
        operator: "equals",
        query: "",
        placeholder: filter.placeholder,
      } satisfies NumberFilterState]),
  ) as Record<string, NumberFilterState>
}

function buildTagFilters<Row>(filters: NormalizedFilter<Row>[]) {
  return Object.fromEntries(
    filters
      .filter(filter => filter.type === "tag")
      .map(filter => [filter.key, {
        enabled: false,
        operator: "equals",
        values: [],
      } satisfies TagFilterState]),
  ) as Record<string, TagFilterState>
}

function buildDateFilters<Row>(filters: NormalizedFilter<Row>[]) {
  return Object.fromEntries(
    filters
      .filter(filter => filter.type === "date")
      .map(filter => [filter.key, {
        enabled: false,
        operator: "equals",
        preset: "custom",
        startDate: "",
        endDate: "",
      } satisfies DateFilterState]),
  ) as Record<string, DateFilterState>
}

function getDefaultSortDirection(kind: "text" | "metric" | undefined) {
  return kind === "metric" ? "desc" : "asc"
}

function resolveTagOptions<Row>(filter: NormalizedFilter<Row>, rows: Row[]) {
  if (Array.isArray(filter.options)) {
    return filter.options
  }

  if (typeof filter.options === "function") {
    return filter.options(rows)
  }

  return [...new Set(rows.map(row => stringifyValue(filter.value(row))).filter(Boolean))]
}

function getDefaultTabValue<Row>(tabs: ResourceTabsDefinition<Row>) {
  if (tabs.mode === "enum") {
    return tabs.all?.value ?? "all"
  }

  return "all"
}

function buildTabs<Row>(rows: Row[], tabs: ResourceTabsDefinition<Row>, selectedTab: string): HeaderTab[] {
  if (tabs.mode !== "enum") {
    return []
  }

  const allValue = tabs.all?.value ?? "all"
  const values = getTabValues(rows, tabs)
  const optionValues = tabs.options?.length ? tabs.options : values
  const orderedValues = tabs.order?.length
    ? [...tabs.order.filter(value => optionValues.includes(value)), ...optionValues.filter(value => !tabs.order!.includes(value))]
    : optionValues

  return [
    {
      label: tabs.all?.label ?? "全部",
      value: allValue,
      count: rows.length,
      active: selectedTab === allValue,
    },
    ...orderedValues.map(value => ({
      label: tabs.labelMap?.[value] ?? value,
      value,
      count: rows.filter(row => getTabValue(row, tabs) === value).length,
      active: selectedTab === value,
    })),
  ]
}

function getTabValues<Row>(rows: Row[], tabs: Extract<ResourceTabsDefinition<Row>, { mode: "enum" }>) {
  return [...new Set(rows.map(row => getTabValue(row, tabs)).filter(Boolean))]
}

function getTabValue<Row>(row: Row, tabs: Extract<ResourceTabsDefinition<Row>, { mode: "enum" }>) {
  if (tabs.value) {
    return tabs.value(row)
  }

  if (tabs.field) {
    return stringifyValue(row[tabs.field])
  }

  return ""
}

function matchesTab<Row>(row: Row, tabs: ResourceTabsDefinition<Row>, selectedTab: string) {
  if (tabs.mode !== "enum") {
    return true
  }

  const allValue = tabs.all?.value ?? "all"
  return selectedTab === allValue || getTabValue(row, tabs) === selectedTab
}

function buildSearchText<Row>(row: Row, input: ResourceListSchema<Row> | ResourceListDefinition<Row>) {
  const columns = isResourceListDefinition(input) ? input.columns as Array<ResourceListColumn<Row>> : input.columns

  return columns
    .map((column) => {
      if (!column.searchable) {
        return ""
      }

      if (typeof column.searchable === "function") {
        return column.searchable(row)
      }

      return stringifyValue(row[column.key])
    })
    .filter(Boolean)
    .join(" ")
}

function compareByRule<Row>(field: string, left: Row, right: Row, sortFields: NormalizedSortField<Row>[]) {
  const fieldDefinition = sortFields.find(item => item.field === field)
  if (!fieldDefinition) {
    return 0
  }

  return compareValues(fieldDefinition.value(left), fieldDefinition.value(right))
}

function compareValues(left: unknown, right: unknown) {
  if (left === right) {
    return 0
  }

  const leftNumber = typeof left === "number" ? left : Number(left)
  const rightNumber = typeof right === "number" ? right : Number(right)
  const bothNumeric = !Number.isNaN(leftNumber) && !Number.isNaN(rightNumber) && `${left}`.trim() !== "" && `${right}`.trim() !== ""
  if (bothNumeric) {
    return leftNumber - rightNumber
  }

  return stringifyValue(left).localeCompare(stringifyValue(right), "zh-CN")
}

function normalizeSortValue(value: unknown): string | number | null | undefined {
  if (typeof value === "string" || typeof value === "number" || value === null || value === undefined) {
    return value
  }

  return stringifyValue(value)
}

function stringifyValue(value: unknown) {
  if (value === null || value === undefined) {
    return ""
  }

  return `${value}`
}

function getFilterIcon(filterType: ResourceFilterType) {
  if (filterType === "tag") return "ri-price-tag-3-line"
  if (filterType === "number") return "ri-hashtag"
  if (filterType === "date") return "ri-calendar-line"
  return "ri-text"
}

function getSortSummaryLabel(sortFields: SortFieldOption[], field?: string | null) {
  return sortFields.find(option => option.value === field)?.label ?? sortFields[0]?.label ?? "排序"
}

function getTextFilterSummary(key: string, filter?: TextFilterState) {
  if (!filter?.enabled) return key
  const operatorMap = {
    equals: "是",
    notEquals: "不是",
    contains: "包含",
    notContains: "不包含",
    startsWith: "开头是",
    endsWith: "结尾是",
    isEmpty: "为空白",
    isNotEmpty: "不为空白",
  } as const
  const operatorLabel = operatorMap[filter.operator] ?? "包含"
  return filter.operator === "isEmpty" || filter.operator === "isNotEmpty"
    ? `${key} ${operatorLabel}`
    : `${key} ${operatorLabel} ${filter.query || "…"}`
}

function getNumberFilterSummary(key: string, filter?: NumberFilterState) {
  if (!filter?.enabled) return key
  const operatorMap = {
    equals: "=",
    notEquals: "≠",
    gt: ">",
    lt: "<",
    gte: "≥",
    lte: "≤",
    isEmpty: "为空白",
    isNotEmpty: "不为空白",
  } as const
  const operatorLabel = operatorMap[filter.operator] ?? "="
  return filter.operator === "isEmpty" || filter.operator === "isNotEmpty"
    ? `${key} ${operatorLabel}`
    : `${key} ${operatorLabel} ${filter.query || "…"}`
}

function getTagFilterSummary(key: string, filter?: TagFilterState) {
  if (!filter?.enabled) return key
  if (filter.operator === "isEmpty") return `${key} 为空白`
  if (filter.operator === "isNotEmpty") return `${key} 不为空白`
  return `${key} ${filter.values.join("、") || "…"}`
}

function getDateFilterSummary(key: string, filter?: DateFilterState) {
  if (!filter?.enabled) return key
  if (filter.operator === "isEmpty") return `${key} 为空白`
  if (filter.operator === "isNotEmpty") return `${key} 不为空白`
  if (filter.operator === "between") {
    return `${key} ${filter.startDate || "…"} - ${filter.endDate || "…"}`
  }
  return `${key} ${filter.startDate || "…"}`
}

function resetTextFilter(filters: Record<string, TextFilterState>, key: string) {
  if (!filters[key]) {
    return
  }

  filters[key] = {
    ...filters[key],
    operator: "contains",
    query: "",
    enabled: false,
  }
}

function resetNumberFilter(filters: Record<string, NumberFilterState>, key: string) {
  if (!filters[key]) {
    return
  }

  filters[key] = {
    ...filters[key],
    operator: "equals",
    query: "",
    enabled: false,
  }
}

function resetTagFilter(filters: Record<string, TagFilterState>, key: string) {
  if (!filters[key]) {
    return
  }

  filters[key] = {
    ...filters[key],
    operator: "equals",
    values: [],
    enabled: false,
  }
}

function resetDateFilter(filters: Record<string, DateFilterState>, key: string) {
  if (!filters[key]) {
    return
  }

  filters[key] = {
    ...filters[key],
    operator: "equals",
    preset: "custom",
    startDate: "",
    endDate: "",
    enabled: false,
  }
}

function matchesTextFilter(source: string, filter?: TextFilterState) {
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

function matchesNumberFilter(source: string, filter?: NumberFilterState) {
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

function matchesTagFilter(source: string, filter?: TagFilterState) {
  if (!filter?.enabled) return true
  const normalizedSource = source.trim()
  if (filter.operator === "isEmpty") return normalizedSource.length === 0
  if (filter.operator === "isNotEmpty") return normalizedSource.length > 0
  if (!filter.values.length) return true
  const matched = filter.values.includes(source)
  return filter.operator === "notEquals" ? !matched : matched
}

function matchesDateFilter(source: string, filter?: DateFilterState) {
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

function normalizeDateInput(value: string) {
  return value.replace(/[./年]/g, "-").replace(/[月]/g, "-").replace(/[日]/g, "")
}

function createDateAtMidnight(year: number, month: number, day: number) {
  return new Date(year, month - 1, day)
}

function buildMonthRange(year: number, month: number) {
  const start = createDateAtMidnight(year, month, 1)
  const end = new Date(year, month, 0)
  end.setHours(0, 0, 0, 0)
  return { start, end }
}

function buildYearRange(year: number) {
  const start = createDateAtMidnight(year, 1, 1)
  const end = createDateAtMidnight(year, 12, 31)
  return { start, end }
}
