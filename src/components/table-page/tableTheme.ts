import type {
  TableColumn,
  TableColumnEmphasis,
  TableColumnFormat,
  TableColumnTone,
  TableColumnWidth,
} from "@/components/table-page/types"
import { cn } from "@/lib/utils"

export const TABLE_EDGE_GUTTER_MOBILE = 16
export const TABLE_EDGE_GUTTER_DESKTOP = 32

export const tableTheme = {
  wrapper: "relative min-w-0 w-full max-w-full overflow-visible",
  scrollViewport: "min-w-0 w-full max-w-full overflow-x-auto overflow-y-visible overscroll-x-contain",
  scrollContent: "flex min-w-full items-stretch",
  edgeGutter: "shrink-0",
  table: "min-w-full w-full table-auto border-separate border-spacing-0 bg-background text-[14px] text-foreground",
  head: "relative z-20 text-muted-foreground",
  headActive: "shadow-[inset_0_-1px_0_hsl(var(--border))]",
  /** z 须高于根级 Dialog/Overlay（z-50），否则 Teleport 到 body 的吸顶表头会被设置弹窗挡住；设置内嵌套弹窗请用 DialogContent 的 stackAboveStickyHeader（z-[70]） */
  stickyViewport: "fixed z-[60] overflow-hidden bg-background",
  body: "text-foreground",
  row: "group transition hover:bg-surface-tertiary",
  summary: "px-3 py-3 text-[13px] text-muted-foreground",
  indexInline: {
    headerLayout: "flex min-w-0 items-center gap-2.5",
    cellLayout: "flex min-w-0 items-center gap-2.5",
    prefix: "relative flex h-4 w-8 shrink-0 items-center justify-center text-muted-foreground tabular-nums",
    content: "min-w-0 flex-1",
  },
  headerCell: {
    base: "h-[42px] border-b border-border px-3 py-0 text-left font-normal whitespace-nowrap align-middle transition-colors hover:bg-surface-tertiary",
    /** 序号/checkbox 列：去掉 px-3 左侧 12px，与滚动区左缘对齐（右侧仍保留 pr-3） */
    selectionFlush: "!pl-0",
    sticky: "sticky z-20 bg-background bg-clip-padding",
  },
  bodyCell: {
    base: "h-[42px] border-b border-border px-3 py-0 whitespace-nowrap align-middle",
    selectionFlush: "!pl-0",
    split: "border-l",
    rightAligned: "text-right",
  },
  actionHeader: "h-[42px] w-px whitespace-nowrap border-b border-l border-border px-3 py-0 text-left font-normal text-muted-foreground align-middle transition-colors hover:bg-surface-tertiary",
  actionHeaderSticky: "bg-background bg-clip-padding",
  actionCell: "h-[42px] border-b border-l border-border px-3 py-0 align-middle whitespace-nowrap",
  actionCellContent: "flex items-center justify-end gap-1.5",
  actionButton: "pointer-events-auto h-6 gap-1 px-2 text-[12px] border-border/80 bg-background/95 shadow-sm",
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
    note: "whitespace-normal leading-6",
  } satisfies Record<TableColumnFormat, string>,
  widths: {
    auto: "",
    fill: "",
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
    note: "whitespace-normal leading-6 text-muted-foreground",
  },
} as const

export function getTableWrapperClass(override?: string) {
  return cn(tableTheme.wrapper, override)
}

export function getTableScrollViewportClass() {
  return tableTheme.scrollViewport
}

export function getTableClass(override?: string) {
  return cn(tableTheme.table, override)
}

export function getColumnHeaderClass(column: TableColumn, applyFill = column.width === "fill") {
  return cn(
    applyFill ? tableTheme.widths.fill : "",
    column.headerClass,
  )
}

export function getColumnCellClass(column: TableColumn, applyFill = column.width === "fill") {
  const tone = column.tone ?? getDefaultTone(column)
  const emphasis = column.emphasis ?? "default"
  const format = column.format ?? getDefaultFormat(column)
  const width = applyFill ? "fill" : "auto"

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
