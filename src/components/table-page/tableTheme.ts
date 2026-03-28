import type {
  TableColumn,
  TableColumnEmphasis,
  TableColumnFormat,
  TableColumnTone,
  TableColumnWidth,
} from "@/components/table-page/types"
import { cn } from "@/lib/utils"

export const tableTheme = {
  wrapper: "relative min-w-0 w-full max-w-full overflow-visible",
  scrollViewport: "min-w-0 w-full max-w-full overflow-x-auto overflow-y-visible overscroll-x-contain",
  table: "min-w-full w-full table-auto border-separate border-spacing-0 bg-background text-[14px] text-foreground",
  head: "relative z-20 text-muted-foreground",
  headActive: "shadow-[inset_0_-1px_0_hsl(var(--border))]",
  /** z 须高于 Dialog/Overlay（z-50），否则 Teleport 到 body 的吸顶表头会被设置弹窗等挡住 */
  stickyViewport: "fixed z-[60] overflow-hidden bg-background",
  body: "text-foreground",
  row: "group transition hover:bg-surface-tertiary",
  summary: "px-3 py-3 text-[13px] text-muted-foreground",
  indexHeader: {
    base: "w-8 min-w-8 py-2 pr-2 text-right font-normal",
    static: "transition-colors hover:bg-surface-tertiary",
    sticky: "sticky z-20 bg-background bg-clip-padding",
  },
  indexCell: "w-8 min-w-8 py-3 pr-2 text-right text-muted-foreground whitespace-nowrap",
  headerCell: {
    base: "border-b border-border px-3 py-2 text-left font-normal whitespace-nowrap transition-colors hover:bg-surface-tertiary",
    sticky: "sticky z-20 bg-background bg-clip-padding",
  },
  bodyCell: {
    base: "border-b border-border px-3 py-3 whitespace-nowrap",
    split: "border-l",
    rightAligned: "text-right",
  },
  actionHeader: "w-px whitespace-nowrap border-b border-border px-3 py-2 text-left font-normal text-muted-foreground transition-colors hover:bg-surface-tertiary",
  /** 一级列表页：sm 及以上操作列右侧多留空白；移动端与默认一致保持 px-3 */
  actionHeaderList: "w-px whitespace-nowrap border-b border-border py-2 px-3 text-left font-normal text-muted-foreground transition-colors hover:bg-surface-tertiary sm:pr-8",
  actionHeaderSticky: "bg-background bg-clip-padding",
  actionCell: "relative border-b border-border p-0 align-middle whitespace-nowrap",
  actionSizer: "invisible ml-auto inline-flex h-0 w-max max-w-none overflow-hidden items-center justify-end gap-2 whitespace-nowrap px-3 py-0",
  actionSizerList: "invisible ml-auto inline-flex h-0 w-max max-w-none overflow-hidden items-center justify-end gap-2 whitespace-nowrap py-0 px-3 sm:pr-8",
  actionRailHost: "pointer-events-none absolute inset-y-0 right-0 z-[25] will-change-transform",
  actionRail: "sticky right-0 ml-auto h-full",
  actionRailRow: "absolute right-0 flex overflow-hidden transition-colors",
  actionRailSurface: "flex items-center justify-end gap-2 border-b border-l border-border px-3 transition-colors",
  actionRailSurfaceList: "flex items-center justify-end gap-2 border-b border-l border-border px-3 transition-colors sm:pr-8",
  actionRailSurfaceShadow: "shadow-[-10px_0_14px_-12px_rgba(15,23,42,0.28)]",
  actionRailSpacer: "transition-colors",
  actionButton: "pointer-events-auto border-border/80 bg-background/95 text-foreground shadow-sm",
  actionHeaderRailHost: "pointer-events-none absolute right-0 z-[26]",
  actionHeaderRail: "flex overflow-hidden",
  actionHeaderRailSurface: "flex items-center border-b border-l border-border px-3 text-left text-[14px] font-normal text-muted-foreground transition-colors",
  actionHeaderRailSurfaceList: "flex items-center border-b border-l border-border px-3 text-left text-[14px] font-normal text-muted-foreground transition-colors sm:pr-8",
  actionHeaderRailSpacer: "transition-colors",
  endSpacerHeader: "w-8 min-w-8 border-b border-border p-0",
  endSpacerCell: "w-8 min-w-8 border-b border-border p-0",
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
