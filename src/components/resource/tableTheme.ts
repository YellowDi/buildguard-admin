import type {
  TableColumn,
  TableColumnEmphasis,
  TableColumnFormat,
  TableColumnTone,
  TableColumnWidth,
} from "@/components/resource/types"
import { cn } from "@/lib/utils"

export const tableTheme = {
  wrapper: "relative min-w-0 w-full max-w-full overflow-x-auto overflow-y-visible overscroll-x-contain",
  table: "min-w-full w-max table-auto border-separate border-spacing-0 bg-background text-[14px] text-foreground",
  head: "relative z-20 text-muted-foreground",
  headActive: "shadow-[inset_0_-1px_0_hsl(var(--border))]",
  stickyViewport: "pointer-events-none fixed z-30 overflow-hidden bg-background",
  body: "text-foreground",
  row: "group transition hover:bg-surface-tertiary",
  summary: "px-3 py-3 text-[13px] text-muted-foreground",
  indexHeader: {
    base: "w-8 min-w-8 py-2 pr-2 text-right font-normal",
    static: "border-b border-border",
    sticky: "sticky z-20 bg-background bg-clip-padding",
  },
  indexCell: "w-8 min-w-8 py-3 pr-2 text-right text-muted-foreground whitespace-nowrap",
  headerCell: {
    base: "border-b border-border px-3 py-2 text-left font-normal whitespace-nowrap",
    sticky: "sticky z-20 bg-background bg-clip-padding transition-colors hover:bg-surface-tertiary",
  },
  bodyCell: {
    base: "border-b border-border px-3 py-3 whitespace-nowrap",
    split: "border-l",
    rightAligned: "text-right",
  },
  actionHeader: "w-[148px] min-w-[148px] border-b border-border py-2 pl-0 pr-3",
  actionCell: "sticky right-0 z-10 w-[148px] min-w-[148px] border-b border-border p-0 align-middle",
  actionPanel: "absolute inset-y-0 right-0 flex items-center justify-end pr-3 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100",
  tones: {
    default: "text-foreground",
    primary: "text-foreground",
    muted: "text-muted-foreground",
    accent: "text-link",
    warning: "text-warning",
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
    contactPrimary: "text-foreground",
    contactSecondary: "text-muted-foreground",
    arrayItem: "text-foreground",
    tagItem: "inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[12px] text-muted-foreground",
    progressTrack: "h-2 flex-1 overflow-hidden rounded-full bg-muted",
    progressFill: "h-full rounded-full bg-link",
    progressLabel: "text-[12px] tabular-nums text-muted-foreground",
    metricValue: "tabular-nums text-link",
    metricUnit: "text-[12px] text-muted-foreground",
    note: "max-w-[320px] whitespace-normal leading-6 text-muted-foreground",
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
