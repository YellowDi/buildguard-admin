import type {
  TableColumn,
  TableColumnEmphasis,
  TableColumnFormat,
  TableColumnTone,
  TableColumnWidth,
} from "@/components/resource/types"
import { cn } from "@/lib/utils"

export const tableTheme = {
  wrapper: "overflow-visible",
  table: "min-w-full w-max table-auto border-collapse bg-white text-[14px]",
  head: "text-[#7A7A7A]",
  body: "text-[#2F2F2F]",
  row: "transition hover:bg-surface-tertiary",
  summary: "px-3 py-3 text-[13px] text-[#9B9B9B]",
  indexHeader: {
    base: "w-8 min-w-8 py-2 pr-2 text-right font-normal",
    static: "border-b border-[#ECECEC]",
    sticky: "sticky top-0 z-10 bg-white",
    active: "shadow-[inset_0_-1px_0_#ECECEC]",
  },
  indexCell: "w-8 min-w-8 py-3 pr-2 text-right text-[#A0A0A0] whitespace-nowrap",
  headerCell: {
    base: "border-b border-[#ECECEC] px-3 py-2 text-left font-normal whitespace-nowrap",
    sticky: "sticky top-0 z-10 bg-white transition-colors hover:bg-surface-tertiary",
    active: "shadow-[inset_0_-1px_0_#ECECEC]",
  },
  bodyCell: {
    base: "border-b border-[#F0F0F0] px-3 py-3 whitespace-nowrap",
    split: "border-l",
    rightAligned: "text-right",
  },
  tones: {
    default: "text-[#2F2F2F]",
    primary: "text-[#1F1F1F]",
    muted: "text-[#6E6E6E]",
    accent: "text-[#3559E0]",
    warning: "text-[#B65A2A]",
  } satisfies Record<TableColumnTone, string>,
  emphasis: {
    default: "",
    strong: "font-medium",
  } satisfies Record<TableColumnEmphasis, string>,
  formats: {
    default: "",
    numeric: "tabular-nums",
    note: "max-w-[320px] whitespace-normal leading-6",
  } satisfies Record<TableColumnFormat, string>,
  widths: {
    auto: "",
    fill: "w-full",
  } satisfies Record<TableColumnWidth, string>,
  renderers: {
    contactPrimary: "text-[#1F1F1F]",
    contactSecondary: "text-[#9A9A9A]",
    arrayItem: "text-[#3F3F3F]",
    tagItem: "inline-flex items-center rounded-md bg-[#F5F5F5] px-2 py-0.5 text-[12px] text-[#4B4B4B]",
    progressTrack: "h-2 flex-1 overflow-hidden rounded-full bg-[#E9EEF5]",
    progressFill: "h-full rounded-full bg-[#4A86E8]",
    progressLabel: "text-[12px] tabular-nums text-[#6B7280]",
    metricValue: "tabular-nums text-[#3559E0]",
    metricUnit: "text-[12px] text-[#9A9A9A]",
    note: "max-w-[320px] whitespace-normal leading-6 text-[#6E6E6E]",
  },
} as const

export function getTableWrapperClass(override?: string) {
  return cn(tableTheme.wrapper, override)
}

export function getTableClass(override?: string) {
  return cn(tableTheme.table, override)
}

export function getColumnHeaderClass(column: TableColumn) {
  return cn(
    column.width === "fill" ? tableTheme.widths.fill : "",
    column.headerClass,
  )
}

export function getColumnCellClass(column: TableColumn) {
  const tone = column.tone ?? getDefaultTone(column)
  const emphasis = column.emphasis ?? "default"
  const format = column.format ?? getDefaultFormat(column)
  const width = column.width ?? "auto"

  return cn(
    tableTheme.tones[tone],
    tableTheme.emphasis[emphasis],
    tableTheme.formats[format],
    tableTheme.widths[width],
    column.cellClass,
  )
}

function getDefaultTone(column: TableColumn): TableColumnTone {
  if (column.format === "note" || column.variant === "note") {
    return "muted"
  }

  return "default"
}

function getDefaultFormat(column: TableColumn): TableColumnFormat {
  if (column.variant === "note") {
    return "note"
  }

  return "default"
}
