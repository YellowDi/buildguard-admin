export type HeaderTab = {
  label: string
  value?: string | number
  count?: number
  active: boolean
}

export type HeaderField = {
  key: string
  icon: string
  label: string
  accent?: boolean
  arrow?: boolean
  kind: "sort" | "text-filter" | "tag-filter" | "number-filter" | "date-filter"
}

export type TextFilterOperator =
  | "equals"
  | "notEquals"
  | "contains"
  | "notContains"
  | "startsWith"
  | "endsWith"
  | "isEmpty"
  | "isNotEmpty"

export type TextFilterState = {
  enabled: boolean
  operator: TextFilterOperator
  query: string
  placeholder?: string
}

export type NumberFilterOperator = "equals" | "notEquals" | "gt" | "lt" | "gte" | "lte" | "isEmpty" | "isNotEmpty"

export type NumberFilterState = {
  enabled: boolean
  operator: NumberFilterOperator
  query: string
  placeholder?: string
}

export type TagFilterOperator = "equals" | "notEquals" | "isEmpty" | "isNotEmpty"

export type TagFilterState = {
  enabled: boolean
  operator: TagFilterOperator
  values: string[]
}

export type DateFilterOperator =
  | "equals"
  | "before"
  | "after"
  | "onOrBefore"
  | "onOrAfter"
  | "between"
  | "relativeToToday"
  | "isEmpty"
  | "isNotEmpty"

export type DateFilterPreset =
  | "today"
  | "tomorrow"
  | "yesterday"
  | "oneWeekAgo"
  | "oneWeekAfter"
  | "oneMonthAgo"
  | "oneMonthAfter"
  | "custom"

export type DateFilterState = {
  enabled: boolean
  operator: DateFilterOperator
  preset: DateFilterPreset
  startDate: string
  endDate: string
}

export type FilterType = "text" | "tag" | "number" | "contact" | "time" | "none"

export type TableColumn = {
  key: string
  label: string
  filterType?: FilterType
  headerClass?: string
  cellClass?: string
  slot?: string
  cellRenderer?:
    | {
        kind: "text"
      }
    | {
        kind: "dual-inline" | "dual-stack"
        primaryKey: string
        secondaryKey: string
        primaryClass?: string
        secondaryClass?: string
      }
    | {
        kind: "array"
        itemClass?: string
        separator?: string
      }
    | {
        kind: "tags"
        itemClass?: string
      }
    | {
        kind: "progress"
        valueKey?: string
        max?: number
        trackClass?: string
        fillClass?: string
        labelClass?: string
      }
    | {
        kind: "metric-unit"
        valueKey?: string
        unit: string
        valueClass?: string
        unitClass?: string
      }
    | {
        kind: "note"
      }
}

export type TableSection = {
  key: string | number
  columns: TableColumn[]
  rows: Record<string, unknown>[]
  rowKey: string | ((row: Record<string, unknown>, index: number) => string | number)
  summary?: string
  showIndex?: boolean
  stickyHeader?: boolean
  wrapperClass?: string
  tableClass?: string
}

export type FilterStateMaps = {
  text: Record<string, TextFilterState>
  number: Record<string, NumberFilterState>
  tag: Record<string, TagFilterState>
  date: Record<string, DateFilterState>
}
