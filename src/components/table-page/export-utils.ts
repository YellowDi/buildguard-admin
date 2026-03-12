import type { TableColumn, TableStatusCellRenderer } from "@/components/table-page/types"

export type TableExportScope = "selected" | "page" | "filtered"
export type TableExportFormat = "csv" | "xlsx"

export const SUPPORTED_TABLE_EXPORT_FORMATS = ["csv"] as const satisfies TableExportFormat[]

export function exportTableData<Row extends Record<string, unknown>>(payload: {
  title: string
  columns: TableColumn[]
  rows: Row[]
  format: TableExportFormat
}) {
  if (payload.format !== "csv") {
    throw new Error("当前项目尚未接入 xlsx 导出能力。")
  }

  const exportRows = buildExportRows(payload.rows, payload.columns)
  const fileName = getExportFileName(payload.title, payload.format)
  const csvContent = serializeRowsToCsv(exportRows)

  downloadTextFile(fileName, csvContent, "text/csv;charset=utf-8;")
}

export function buildExportRows<Row extends Record<string, unknown>>(rows: Row[], columns: TableColumn[]) {
  return rows.map(row => Object.fromEntries(
    columns.map(column => [column.label, formatColumnExportValue(row, column)]),
  ))
}

export function getExportFileName(title: string, format: TableExportFormat) {
  const stamp = formatDateStamp(new Date())
  const safeTitle = sanitizeFileName(title)
  return `${safeTitle}-${stamp}.${format}`
}

function formatColumnExportValue(row: Record<string, unknown>, column: TableColumn) {
  const renderer = column.cellRenderer
  const rawValue = getColumnValue(row, column.key)

  if (!renderer || renderer.kind === "text" || renderer.kind === "note") {
    return stringifyValue(rawValue)
  }

  if (renderer.kind === "dual-inline" || renderer.kind === "dual-stack") {
    return [
      stringifyValue(getColumnValue(row, renderer.primaryKey)),
      stringifyValue(getColumnValue(row, renderer.secondaryKey)),
    ].filter(Boolean).join(" ")
  }

  if (renderer.kind === "array" || renderer.kind === "tags") {
    return toStringArray(rawValue).join("、")
  }

  if (renderer.kind === "progress") {
    return stringifyValue(getColumnValue(row, renderer.valueKey ?? column.key))
  }

  if (renderer.kind === "metric-unit") {
    const value = stringifyValue(getColumnValue(row, renderer.valueKey ?? column.key))
    return value ? `${value}${renderer.unit}` : ""
  }

  if (renderer.kind === "status") {
    return formatStatusExportValue(row, column.key, renderer)
  }

  return stringifyValue(rawValue)
}

function formatStatusExportValue(row: Record<string, unknown>, key: string, renderer: TableStatusCellRenderer) {
  const statusValue = stringifyValue(getColumnValue(row, renderer.valueKey ?? key))
  const option = renderer.map[statusValue] ?? renderer.fallback
  return option?.label ?? statusValue
}

function serializeRowsToCsv(rows: Array<Record<string, string>>) {
  const headers = rows[0] ? Object.keys(rows[0]) : []
  const lines = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map(row => headers.map(header => escapeCsvCell(row[header] ?? "")).join(",")),
  ]

  return `\uFEFF${lines.join("\r\n")}`
}

function escapeCsvCell(value: string) {
  const normalizedValue = value.replace(/\r\n/g, "\n").replace(/\r/g, "\n")

  if (/[",\n]/.test(normalizedValue)) {
    return `"${normalizedValue.replace(/"/g, "\"\"")}"`
  }

  return normalizedValue
}

function downloadTextFile(fileName: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")

  link.href = url
  link.download = fileName
  link.rel = "noopener"
  document.body.appendChild(link)
  link.click()
  link.remove()

  window.setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 0)
}

function getColumnValue(row: Record<string, unknown>, key: string) {
  return row[key]
}

function stringifyValue(value: unknown) {
  if (value === null || value === undefined) {
    return ""
  }

  return `${value}`
}

function toStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value.map(item => stringifyValue(item)).filter(Boolean)
  }

  const stringValue = stringifyValue(value)
  return stringValue ? [stringValue] : []
}

function sanitizeFileName(value: string) {
  const trimmedValue = value.trim()

  if (!trimmedValue) {
    return "table-export"
  }

  return trimmedValue.replace(/[\\/:*?"<>|]/g, "-")
}

function formatDateStamp(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")

  return `${year}${month}${day}-${hours}${minutes}`
}
