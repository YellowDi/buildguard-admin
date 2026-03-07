export type ResourceHeaderTab = {
  label: string
  value?: string | number
  count?: number
  active: boolean
}

export type ResourceHeaderField = {
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

export type ResourceTextFilterState = {
  enabled: boolean
  operator: TextFilterOperator
  query: string
  placeholder?: string
}

export type NumberFilterOperator = "equals" | "notEquals" | "gt" | "lt" | "gte" | "lte" | "isEmpty" | "isNotEmpty"

export type ResourceNumberFilterState = {
  enabled: boolean
  operator: NumberFilterOperator
  query: string
  placeholder?: string
}

export type TagFilterOperator = "equals" | "notEquals" | "isEmpty" | "isNotEmpty"

export type ResourceTagFilterState = {
  enabled: boolean
  operator: TagFilterOperator
  values: string[]
}

export type ResourceDateFilterOperator =
  | "equals"
  | "before"
  | "after"
  | "onOrBefore"
  | "onOrAfter"
  | "between"
  | "relativeToToday"
  | "isEmpty"
  | "isNotEmpty"

export type ResourceDateFilterPreset =
  | "today"
  | "tomorrow"
  | "yesterday"
  | "oneWeekAgo"
  | "oneWeekAfter"
  | "oneMonthAgo"
  | "oneMonthAfter"
  | "custom"

export type ResourceDateFilterState = {
  enabled: boolean
  operator: ResourceDateFilterOperator
  preset: ResourceDateFilterPreset
  startDate: string
  endDate: string
}

export type ResourceFilterType = "text" | "tag" | "number" | "contact" | "time" | "none"

export type ResourceTableColumn = {
  key: string
  label: string
  filterType?: ResourceFilterType
  headerClass?: string
  cellClass?: string
  slot?: string
}

export type ResourceFilterStateMaps = {
  text: Record<string, ResourceTextFilterState>
  number: Record<string, ResourceNumberFilterState>
  tag: Record<string, ResourceTagFilterState>
  date: Record<string, ResourceDateFilterState>
}
