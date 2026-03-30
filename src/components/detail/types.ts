import type { TableStatusCellRenderer } from "@/components/table-page/types"

// 详情页 schema 类型。
// 约定页面层只负责把 JSON / 接口结果转成这些结构，组件层不直接感知数据来源。
export type DetailContactValue = {
  kind: "contact"
  name: string
  phone?: string | null
}

export type DetailStatusValue = {
  kind: "status"
  value: string
  renderer: TableStatusCellRenderer
}

export type DetailFieldValue = string | number | DetailContactValue | DetailStatusValue | null | undefined

export type DetailFieldAction = {
  label: string
  onClick: () => void
}

export type DetailFieldRow = {
  key: string
  label: string
  value: DetailFieldValue
  imageUrl?: string | null
  action?: DetailFieldAction
  truncate?: boolean
  valueClass?: string
}

export type DetailFieldSection = {
  key: string
  title: string
  rows: DetailFieldRow[]
}

// rowKey 同时支持字段名和函数，方便后续接口数据主键不统一时继续复用。
export type DetailRelationRowKey<Row> =
  | Extract<keyof Row, string>
  | ((row: Row, index: number) => string | number)

export type DetailRelationColumn<Row extends Record<string, unknown> = Record<string, unknown>> = {
  key: Extract<keyof Row, string> | string
  label: string
  value?: (row: Row) => string | number | null | undefined
  slot?: string
  headerClass?: string
  cellClass?: string
}

export type DetailRelationGroup<Row extends Record<string, unknown> = Record<string, unknown>> = {
  key: string | number
  title: string
  rows: Row[]
}

export type DetailRelationModuleSchema<Row extends Record<string, unknown> = Record<string, unknown>> = {
  key: string
  title: string
  count?: number
  emptyState?: {
    title: string
    description?: string
    icon?: string
  }
  columns: DetailRelationColumn<Row>[]
  groups: DetailRelationGroup<Row>[]
  rowKey: DetailRelationRowKey<Row>
  mobileMinWidth?: string
  columnTemplateMobile: string
  columnTemplateDesktop?: string
  columnGapMobile?: string
  columnGapDesktop?: string
}
