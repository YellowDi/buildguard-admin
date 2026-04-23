import type { StatusBadgeIcon, StatusBadgeTone } from "@/components/ui/status-badge"

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

export type TableColumnTone = "default" | "primary" | "muted" | "accent" | "warning"
export type TableColumnEmphasis = "default" | "strong"
export type TableColumnFormat = "default" | "numeric" | "note"
export type TableColumnWidth = "auto" | "fill"
export type TableColumnVariant = "default" | "contact" | "note" | "metric"
export type TableStatusOption = {
  tone: StatusBadgeTone
  label?: string
  icon?: StatusBadgeIcon
}
export type TableStatusCellRenderer = {
  kind: "status"
  valueKey?: string
  map: Record<string, TableStatusOption>
  fallback?: TableStatusOption
}
export type TableRowAction<Row = Record<string, unknown>> = {
  key: string
  label: string
  /** 未传时按 `label` 从 `remixIconForTableRowAction` 推断 */
  icon?: string
  onClick?: (row: Row, index: number) => void
}

export type TableColumn = {
  key: string
  label: string
  filterType?: FilterType
  tone?: TableColumnTone
  emphasis?: TableColumnEmphasis
  format?: TableColumnFormat
  width?: TableColumnWidth
  variant?: TableColumnVariant
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
    | TableStatusCellRenderer
    | {
        kind: "note"
      }
}

export type TableSection = {
  key: string | number
  columns: TableColumn[]
  rows: Record<string, unknown>[]
  rowKey: string | ((row: Record<string, unknown>, index: number) => string | number)
  rowActions?: TableRowAction[]
  pinRowActions?: boolean
  onRowClick?: (row: Record<string, unknown>, index: number) => void
  onQuickAction?: (row: Record<string, unknown>, index: number) => void
  summary?: string
  showIndex?: boolean
  stickyHeader?: boolean
  wrapperClass?: string
  tableClass?: string
}

export type TablePageEmptyState = {
  title?: string
  description?: string
  icon?: string
}

export type FilterStateMaps = {
  text: Record<string, TextFilterState>
  number: Record<string, NumberFilterState>
  tag: Record<string, TagFilterState>
  date: Record<string, DateFilterState>
}

export type TablePageRowKey<Row> = Extract<keyof Row, string> | ((row: Row, index: number) => string | number)

export type TablePageFilterType = "text" | "number" | "tag" | "date"

export type TablePageFilterDefinition<Row> = {
  key: string
  label: string
  type: TablePageFilterType
  placeholder?: string
  defaultVisible?: boolean
  fixed?: boolean
  options?: string[] | ((rows: Row[]) => string[])
  value?: (row: Row) => unknown
}

export type TablePageSortDefinition<Row> = {
  storageKey?: string
  initialField?: string
  initialDirection?: "asc" | "desc"
  fields?: Array<{
    field: string
    label: string
    kind?: "text" | "metric"
    value?: (row: Row) => string | number | null | undefined
  }>
}

export type TablePageTabsDefinition<Row> =
  | {
      mode?: "none"
    }
  | {
      mode: "enum"
      all?: {
        label: string
        value: string
      }
      field?: keyof Row & string
      value?: (row: Row) => string
      options?: string[]
      labelMap?: Record<string, string>
      order?: string[]
    }

export type TablePageColumn<Row> = TableColumn & {
  key: keyof Row & string
  filter?: Omit<TablePageFilterDefinition<Row>, "key" | "label"> & {
    label?: string
  }
  sort?: boolean | {
    label?: string
    kind?: "text" | "metric"
    value?: (row: Row) => string | number | null | undefined
  }
}

export type TablePageSchema<Row> = {
  title: string
  description?: string
  rowKey: TablePageRowKey<Row>
  data: Row[]
  columns: Array<TablePageColumn<Row>>
  rowActions?: Array<TableRowAction<Row>>
  onRowClick?: (row: Row, index: number) => void
  onQuickAction?: (row: Row, index: number) => void
  filters?: TablePageFilterDefinition<Row>[]
  sort?: TablePageSortDefinition<Row>
  tabs?: TablePageTabsDefinition<Row>
  primaryActionLabel?: string
  summary?: string
  showIndex?: boolean
  stickyHeader?: boolean
  wrapperClass?: string
  tableClass?: string
  emptyState?: TablePageEmptyState
}

export type TableQuerySelectOption = {
  value: string
  label: string
}

export type TableQuerySearchControl = {
  type: "search"
  key: string
  label: string
  icon: string
  placeholder?: string
  value?: string
  queryKey?: string
  debounceMs?: number
  expandedWidth?: number
  collapsedMinWidth?: number
  collapsedMaxWidth?: number
}

export type TableQuerySelectControl = {
  type: "select"
  key: string
  label: string
  icon: string
  multiple?: boolean
  options: TableQuerySelectOption[]
  value?: string | string[]
  loading?: boolean
  disabled?: boolean
  queryKey?: string
  expandedWidth?: number
  collapsedMinWidth?: number
  collapsedMaxWidth?: number
  placeholder?: string
}

export type TableQueryControl = TableQuerySearchControl | TableQuerySelectControl

export type TableQueryBarConfig = {
  controls: TableQueryControl[]
  values: Record<string, string | string[]>
  canClear: boolean
}
