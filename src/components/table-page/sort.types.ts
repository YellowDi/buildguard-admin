export type SortField = string

export type SortFieldOption = {
  value: SortField
  label: string
  kind?: "text" | "metric"
}

export type SortRule = {
  id: string
  field: SortField
  direction: "asc" | "desc"
}
