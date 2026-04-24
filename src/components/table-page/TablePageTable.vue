<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue"
import { useRoute } from "vue-router"
import { toast } from "vue-sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { TooltipWrap } from "@/components/ui/tooltip"
import StatusChip from "@/components/table-page/TableStatusChip.vue"
import {
  getColumnCellClass,
  getColumnHeaderClass,
  getTableClass,
  getTableScrollViewportClass,
  getTableWrapperClass,
  TABLE_EDGE_GUTTER_DESKTOP,
  TABLE_EDGE_GUTTER_MOBILE,
  tableTheme,
} from "@/components/table-page/tableTheme"
import type { TableColumn, TablePageEmptyState, TableRowAction } from "@/components/table-page/types"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { remixIconForTableRowAction } from "@/lib/actionIcons"
import { cn } from "@/lib/utils"

type ScrollRoot = HTMLElement | Window
type RowSelectionKey = string | number
type CheckboxState = boolean | "indeterminate"
type RowPointerDownState = {
  rowKey: RowSelectionKey
  clientX: number
  clientY: number
}
type HorizontalScrollbarDragState = {
  startClientX: number
  startScrollLeft: number
}

const HORIZONTAL_SCROLL_HINT_MESSAGE = "可按住 Shift + 鼠标滚轮进行横向移动。"
/** 同一路由在本次浏览器会话内只提示一次，避免布局抖动或重复挂载反复弹出 */
const HORIZONTAL_SCROLL_HINT_SESSION_PREFIX = "buildguard:table-hscroll-hint:"
const ROW_CLICK_DRAG_THRESHOLD = 5
const ALIGN_TO_HEADER_WIDE_BREAKPOINT = 2000
const COMPACT_DETAIL_TABLE_WIDTH_THRESHOLD = 48
const HORIZONTAL_SCROLLBAR_MIN_THUMB_SIZE = 40
const NATIVE_HORIZONTAL_SCROLLBAR_MASK_SIZE = 18
const ROW_CLICK_IGNORE_SELECTOR = [
  "button",
  "a[href]",
  "input",
  "label",
  "select",
  "textarea",
  "summary",
  "[role='button']",
  "[role='link']",
  "[role='checkbox']",
  "[role='switch']",
  "[role='menuitem']",
  "[role='option']",
  "[data-row-click-ignore]",
  "[data-list-popover]",
  "[data-slot='button']",
].join(",")
const selectionCheckboxClass = "border-border bg-background data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary focus-visible:ring-primary/20"
const INLINE_PREVIEW_ACTION_LABELS = new Set(["查看详情", "查看", "查看归档"])

const props = withDefaults(defineProps<{
  columns: TableColumn[]
  rowActions?: TableRowAction[]
  onRowClick?: (row: Record<string, unknown>, index: number) => void
  onQuickAction?: (row: Record<string, unknown>, index: number) => void
  rows: Record<string, unknown>[]
  rowKey: string | ((row: Record<string, unknown>, index: number) => string | number)
  selectedRowKeys?: Array<RowSelectionKey>
  summary?: string
  showIndex?: boolean
  stickyHeader?: boolean
  wrapperClass?: string
  tableClass?: string
  emptyState?: TablePageEmptyState
  /** 兼容旧调用保留；左右外扩布局已移除，不再影响结构。 */
  listLevelTable?: boolean
  /**
   * 使用原生 `position:sticky` 固定表头（表格外层横向滚动时往往无法相对侧栏竖向滚动吸顶）。
   * 一般请用 `stickyHeader`（fixed 克隆，已 Teleport 到 body）；勿与 `stickyHeader` 同时开启。
   */
  stickyThead?: boolean
  /** 兼容旧调用保留；尾部占位列已移除，不再影响结构。 */
  endSpacer?: boolean
  /** 是否显示序号列中的 checkbox 选择交互。 */
  showIndexCheckbox?: boolean
  /** 是否启用滚动内容的动态边缘留白。 */
  edgeGutter?: boolean
  /** 右侧操作列按钮是否展示图标。设置浮窗内表格可显式开启。 */
  showRowActionIcons?: boolean
  /** 超宽窗口下让表格滚动视口与页面标题区宽度对齐。 */
  alignToHeaderAtWide?: boolean
  /** 横向溢出时将操作列固定到滚动视口右侧。 */
  pinRowActions?: boolean
  /** 让表格自身占满可用高度，并将滚动限制在表格内部。 */
  fillAvailableHeight?: boolean
  /** 首屏加载时保留真实表头，仅在 tbody 渲染占位行。 */
  loading?: boolean
  loadingRowCount?: number
}>(), {
  summary: "",
  showIndex: false,
  stickyHeader: false,
  wrapperClass: "",
  tableClass: "",
  emptyState: undefined,
  listLevelTable: true,
  stickyThead: false,
  endSpacer: true,
  showIndexCheckbox: true,
  edgeGutter: true,
  showRowActionIcons: false,
  alignToHeaderAtWide: false,
  pinRowActions: true,
  fillAvailableHeight: false,
  loading: false,
  loadingRowCount: 8,
})
const emit = defineEmits<{
  "update:selected-row-keys": [keys: RowSelectionKey[]]
}>()

const wrapperClassName = computed(() => getTableWrapperClass(props.wrapperClass))
const scrollViewportClassName = computed(() => cn(
  getTableScrollViewportClass(),
  props.alignToHeaderAtWide ? "min-[2000px]:mx-8 min-[2000px]:w-auto" : "",
  !props.listLevelTable ? "max-w-none" : "",
))
const tableClassName = computed(() => getTableClass(props.tableClass))
const hasRowActions = computed(() => (props.rowActions?.length ?? 0) > 0)
const tableOuterRef = ref<HTMLElement | null>(null)
const tableWrapperRef = ref<HTMLElement | null>(null)
const horizontalScrollbarTrackRef = ref<HTMLElement | null>(null)
const tableRef = ref<HTMLTableElement | null>(null)
const fillColumnActive = ref(false)
const compactTableActive = ref(false)
const horizontalOverflow = ref(false)
const edgeGutterSize = ref(TABLE_EDGE_GUTTER_MOBILE)
const embeddedViewportExpandLeft = ref(0)
const embeddedViewportExpandRight = ref(0)
const embeddedLeadingInset = ref(0)
const embeddedTrailingInset = ref(0)
const stickyHeaderActive = ref(false)
const stickyHeaderLeft = ref(0)
const stickyHeaderTop = ref(0)
const stickyHeaderWidth = ref(0)
const stickyTableWidth = ref(0)
const stickyScrollLeft = ref(0)
const stickyColumnWidths = ref<number[]>([])
const actionColumnWidth = ref(0)
const actionColumnFadeWidth = ref(0)
const horizontalScrollContentWidth = ref(0)
const horizontalScrollViewportWidth = ref(0)
const hoveredRowKey = ref<RowSelectionKey | null>(null)
const focusedRowKey = ref<RowSelectionKey | null>(null)
const rowPointerDown = ref<RowPointerDownState | null>(null)
const horizontalScrollbarDrag = ref<HorizontalScrollbarDragState | null>(null)
const selectedRowKeySet = computed(() => new Set(props.selectedRowKeys ?? []))
const currentRowKeys = computed(() => props.rows.map((row, index) => getRowKey(row, index)))
const selectedCurrentRowCount = computed(() => (
  currentRowKeys.value.filter(rowKey => selectedRowKeySet.value.has(rowKey)).length
))
const shouldShowHeaderCheckbox = computed(() => props.showIndexCheckbox && selectedCurrentRowCount.value > 0)
const rowClickEnabled = computed(() => typeof props.onRowClick === "function")
const inlineQuickActionEnabled = computed(() => (
  horizontalOverflow.value && typeof props.onQuickAction === "function"
))
const inlineSecondaryActions = computed(() => (
  (props.rowActions ?? []).filter(action => !isInlinePreviewAction(action))
))
const showLoadingRows = computed(() => props.loading && props.rows.length === 0)
const hasDataRows = computed(() => props.rows.length > 0)
const showEmptyState = computed(() => !props.loading && props.rows.length === 0)
const hasVisibleBodyRows = computed(() => hasDataRows.value || showLoadingRows.value)
const useInternalStickyThead = computed(() => (
  props.fillAvailableHeight && props.stickyHeader && !props.stickyThead
))
const headerCheckboxState = computed<CheckboxState>(() => {
  if (currentRowKeys.value.length === 0 || selectedCurrentRowCount.value === 0) {
    return false
  }

  if (selectedCurrentRowCount.value === currentRowKeys.value.length) {
    return true
  }

  return "indeterminate"
})
const stickyHeaderVisible = computed(() => (
  !showEmptyState.value
  && props.stickyHeader
  && !props.fillAvailableHeight
  && !props.stickyThead
  && stickyHeaderActive.value
  && stickyHeaderWidth.value > 0
  && stickyColumnWidths.value.length > 0
))
const pinRowActionsActive = computed(() => (
  props.pinRowActions
  && hasRowActions.value
  && horizontalOverflow.value
))
const showPinnedActionFade = computed(() => (
  pinRowActionsActive.value
  && stickyScrollLeft.value < horizontalScrollMax.value - 1
))
const shouldMaskNativeHorizontalScrollbar = computed(() => (
  props.fillAvailableHeight
  && !showEmptyState.value
  && horizontalOverflow.value
  && hasVisibleBodyRows.value
))
const tableViewportClassName = computed(() => cn(
  scrollViewportClassName.value,
  props.fillAvailableHeight ? "min-h-0 h-full overflow-y-auto" : "",
))
const scrollFrameClassName = computed(() => cn(
  "relative min-w-0",
  props.fillAvailableHeight ? "min-h-0 flex-1 overflow-hidden" : "",
))
const leadingEdgeGutter = computed(() => {
  if (!props.edgeGutter) {
    return 0
  }

  return props.listLevelTable ? edgeGutterSize.value : embeddedLeadingInset.value
})
const trailingEdgeGutter = computed(() => (
  props.edgeGutter && horizontalOverflow.value
    ? (props.listLevelTable ? edgeGutterSize.value : embeddedTrailingInset.value)
    : 0
))
const tableInlineTrailingInset = computed(() => {
  if (!props.listLevelTable && compactTableActive.value) {
    return embeddedTrailingInset.value
  }

  return trailingEdgeGutter.value
})
const tableInlineMinWidth = computed(() => {
  const reservedSpace = leadingEdgeGutter.value + tableInlineTrailingInset.value
  return `calc(100% - ${reservedSpace}px)`
})
const tableElementStyle = computed(() => ({
  width: "max-content",
  minWidth: tableInlineMinWidth.value,
  maxWidth: "none",
}))
const revealContainerStyle = computed(() => {
  const style: Record<string, string | undefined> = {}

  if (!props.listLevelTable && (embeddedViewportExpandLeft.value > 0 || embeddedViewportExpandRight.value > 0)) {
    style.marginLeft = `-${embeddedViewportExpandLeft.value}px`
    style.marginRight = `-${embeddedViewportExpandRight.value}px`
    style.width = `calc(100% + ${embeddedViewportExpandLeft.value + embeddedViewportExpandRight.value}px)`
  }

  return style
})
const scrollFrameStyle = computed(() => (
  props.fillAvailableHeight ? revealContainerStyle.value : undefined
))
const scrollViewportStyle = computed(() => {
  const style: Record<string, string | undefined> = {
    height: shouldMaskNativeHorizontalScrollbar.value
      ? `calc(100% + ${NATIVE_HORIZONTAL_SCROLLBAR_MASK_SIZE}px)`
      : undefined,
    paddingBottom: shouldMaskNativeHorizontalScrollbar.value
      ? `${NATIVE_HORIZONTAL_SCROLLBAR_MASK_SIZE}px`
      : undefined,
  }

  if (!props.fillAvailableHeight && !props.listLevelTable && (embeddedViewportExpandLeft.value > 0 || embeddedViewportExpandRight.value > 0)) {
    style.marginLeft = `-${embeddedViewportExpandLeft.value}px`
    style.marginRight = `-${embeddedViewportExpandRight.value}px`
    style.width = `calc(100% + ${embeddedViewportExpandLeft.value + embeddedViewportExpandRight.value}px)`
  }

  return style
})
const bottomDockStyle = computed(() => revealContainerStyle.value)
const bottomDockClassName = computed(() => cn(
  "relative z-[31] min-w-0 bg-background",
  props.fillAvailableHeight ? "shrink-0" : "",
))
const summaryClassName = computed(() => cn(
  tableTheme.summary,
  props.listLevelTable ? "px-4 sm:px-8" : "",
))
const summaryStyle = computed(() => (
  props.listLevelTable ? undefined : horizontalScrollbarTrackWrapperStyle.value
))
const horizontalScrollbarSectionClassName = computed(() => cn(
  "relative",
  props.listLevelTable ? "px-4 sm:px-8" : "",
))
const horizontalScrollbarSectionStyle = computed(() => (
  props.listLevelTable ? undefined : horizontalScrollbarTrackWrapperStyle.value
))
const bottomDockVisible = computed(() => (
  Boolean(props.summary) || (hasVisibleBodyRows.value && horizontalOverflow.value)
))
const horizontalScrollbarTrackWrapperStyle = computed(() => {
  if (props.listLevelTable) {
    return undefined
  }

  return {
    paddingLeft: embeddedLeadingInset.value > 0 ? `${embeddedLeadingInset.value}px` : undefined,
    paddingRight: embeddedTrailingInset.value > 0 ? `${embeddedTrailingInset.value}px` : undefined,
  }
})
const horizontalScrollMax = computed(() => (
  Math.max(0, horizontalScrollContentWidth.value - horizontalScrollViewportWidth.value)
))
const horizontalScrollbarTrackWidth = computed(() => (
  horizontalScrollbarTrackRef.value?.clientWidth ?? horizontalScrollViewportWidth.value
))
const horizontalScrollbarThumbWidth = computed(() => {
  const trackWidth = horizontalScrollbarTrackWidth.value
  if (!horizontalOverflow.value || trackWidth <= 0 || horizontalScrollContentWidth.value <= 0) {
    return 0
  }

  const ratio = horizontalScrollViewportWidth.value / horizontalScrollContentWidth.value
  return Math.min(
    trackWidth,
    Math.max(HORIZONTAL_SCROLLBAR_MIN_THUMB_SIZE, Math.round(trackWidth * ratio)),
  )
})
const horizontalScrollbarThumbOffset = computed(() => {
  const trackWidth = horizontalScrollbarTrackWidth.value
  const thumbWidth = horizontalScrollbarThumbWidth.value
  const maxThumbOffset = Math.max(0, trackWidth - thumbWidth)

  if (maxThumbOffset <= 0 || horizontalScrollMax.value <= 0) {
    return 0
  }

  return Math.round((stickyScrollLeft.value / horizontalScrollMax.value) * maxThumbOffset)
})
const horizontalScrollbarThumbStyle = computed(() => ({
  width: `${horizontalScrollbarThumbWidth.value}px`,
  transform: `translate(${horizontalScrollbarThumbOffset.value}px, -50%)`,
}))
const stickyContentWidth = computed(() => (
  stickyTableWidth.value + leadingEdgeGutter.value + trailingEdgeGutter.value
))
const stickyViewportStyle = computed(() => ({
  left: `${stickyHeaderLeft.value}px`,
  top: `${stickyHeaderTop.value}px`,
  width: `${stickyHeaderWidth.value}px`,
}))
const stickyContentStyle = computed(() => ({
  minWidth: `${stickyContentWidth.value}px`,
  width: `${stickyContentWidth.value}px`,
  transform: `translateX(${-stickyScrollLeft.value}px)`,
}))
const stickyTableStyle = computed(() => ({
  minWidth: `${stickyTableWidth.value}px`,
  width: `${stickyTableWidth.value}px`,
  maxWidth: `${stickyTableWidth.value}px`,
  tableLayout: "fixed" as const,
}))
const route = useRoute()
const horizontalScrollHintId = computed(() => `table-page-horizontal-scroll-hint:${route.path}`)
const prevHorizontalOverflow = ref(false)

let scrollRoot: ScrollRoot | null = null
let resizeObserver: ResizeObserver | null = null

function syncHorizontalScrollbarMetrics(contentWidth?: number) {
  if (!tableWrapperRef.value) {
    horizontalScrollViewportWidth.value = 0
    horizontalScrollContentWidth.value = 0
    return
  }

  horizontalScrollViewportWidth.value = tableWrapperRef.value.clientWidth
  horizontalScrollContentWidth.value = contentWidth ?? tableWrapperRef.value.scrollWidth
}

function scrollTableTo(left: number) {
  if (!tableWrapperRef.value) {
    return
  }

  const nextLeft = Math.max(0, Math.min(horizontalScrollMax.value, left))
  tableWrapperRef.value.scrollLeft = nextLeft
  stickyScrollLeft.value = nextLeft
}

function handleHorizontalScrollbarThumbPointerDown(event: PointerEvent) {
  if (!horizontalOverflow.value) {
    return
  }

  event.preventDefault()
  horizontalScrollbarDrag.value = {
    startClientX: event.clientX,
    startScrollLeft: tableWrapperRef.value?.scrollLeft ?? 0,
  }
}

function handleHorizontalScrollbarTrackPointerDown(event: PointerEvent) {
  if (
    !horizontalOverflow.value
    || !(event.currentTarget instanceof HTMLElement)
    || event.target instanceof HTMLElement && event.target.dataset.tableHscrollThumb === "true"
  ) {
    return
  }

  const rect = event.currentTarget.getBoundingClientRect()
  const clickX = event.clientX - rect.left
  const thumbCenter = horizontalScrollbarThumbWidth.value / 2
  const maxThumbOffset = Math.max(0, rect.width - horizontalScrollbarThumbWidth.value)
  const nextThumbOffset = Math.max(0, Math.min(maxThumbOffset, clickX - thumbCenter))

  if (maxThumbOffset <= 0 || horizontalScrollMax.value <= 0) {
    scrollTableTo(0)
    return
  }

  scrollTableTo((nextThumbOffset / maxThumbOffset) * horizontalScrollMax.value)
}

function handleWindowPointerMove(event: PointerEvent) {
  if (!horizontalScrollbarDrag.value) {
    return
  }

  const trackWidth = horizontalScrollbarTrackWidth.value
  const thumbWidth = horizontalScrollbarThumbWidth.value
  const maxThumbOffset = Math.max(0, trackWidth - thumbWidth)

  if (maxThumbOffset <= 0 || horizontalScrollMax.value <= 0) {
    scrollTableTo(0)
    return
  }

  const deltaX = event.clientX - horizontalScrollbarDrag.value.startClientX
  const scrollDelta = deltaX * (horizontalScrollMax.value / maxThumbOffset)
  scrollTableTo(horizontalScrollbarDrag.value.startScrollLeft + scrollDelta)
}

function clearHorizontalScrollbarDrag() {
  horizontalScrollbarDrag.value = null
}

function getRowKey(row: Record<string, unknown>, index: number) {
  if (typeof props.rowKey === "function") {
    return props.rowKey(row, index)
  }

  const value = row[props.rowKey]
  return typeof value === "string" || typeof value === "number" ? value : index
}

function hasSeenHorizontalScrollHintThisSession(path: string): boolean {
  if (typeof sessionStorage === "undefined") {
    return false
  }

  try {
    return sessionStorage.getItem(`${HORIZONTAL_SCROLL_HINT_SESSION_PREFIX}${path}`) === "1"
  } catch {
    return false
  }
}

function rememberHorizontalScrollHintThisSession(path: string) {
  if (typeof sessionStorage === "undefined") {
    return
  }

  try {
    sessionStorage.setItem(`${HORIZONTAL_SCROLL_HINT_SESSION_PREFIX}${path}`, "1")
  } catch {
    // 隐私模式或配额不足时忽略
  }
}

function updateEdgeGutterSize() {
  if (typeof window === "undefined") {
    edgeGutterSize.value = TABLE_EDGE_GUTTER_MOBILE
    return
  }

  if (!props.listLevelTable) {
    edgeGutterSize.value = TABLE_EDGE_GUTTER_MOBILE
    return
  }

  if (props.alignToHeaderAtWide && window.innerWidth >= ALIGN_TO_HEADER_WIDE_BREAKPOINT) {
    edgeGutterSize.value = 0
    return
  }

  edgeGutterSize.value = window.innerWidth >= 640
    ? TABLE_EDGE_GUTTER_DESKTOP
    : TABLE_EDGE_GUTTER_MOBILE
}

function resetEmbeddedViewportState() {
  embeddedViewportExpandLeft.value = 0
  embeddedViewportExpandRight.value = 0
  embeddedLeadingInset.value = 0
  embeddedTrailingInset.value = 0
}

function syncEmbeddedViewportState() {
  if (props.listLevelTable || !tableOuterRef.value || typeof window === "undefined") {
    resetEmbeddedViewportState()
    return
  }

  const outerRect = tableOuterRef.value.getBoundingClientRect()
  const detailLayout = tableOuterRef.value.closest(".detail-layout")
  const headerContent = detailLayout?.querySelector("[data-detail-layout-header-content]") as HTMLElement | null
  const mainElement = tableOuterRef.value.closest("main")

  if (!headerContent || !(mainElement instanceof HTMLElement)) {
    resetEmbeddedViewportState()
    return
  }

  const headerRect = headerContent.getBoundingClientRect()
  const mainRect = mainElement.getBoundingClientRect()
  const headerStyles = window.getComputedStyle(headerContent)
  const headerContentLeft = headerRect.left + Number.parseFloat(headerStyles.paddingLeft || "0")
  const headerContentRight = headerRect.right - Number.parseFloat(headerStyles.paddingRight || "0")

  embeddedViewportExpandLeft.value = Math.max(0, Math.round(outerRect.left - mainRect.left))
  embeddedViewportExpandRight.value = Math.max(0, Math.round(mainRect.right - outerRect.right))
  embeddedLeadingInset.value = Math.max(0, Math.round(headerContentLeft - mainRect.left))
  embeddedTrailingInset.value = Math.max(0, Math.round(mainRect.right - headerContentRight))
}

function maybeShowHorizontalScrollHint() {
  if (!horizontalOverflow.value) {
    return
  }

  if (hasSeenHorizontalScrollHintThisSession(route.path)) {
    return
  }

  rememberHorizontalScrollHintThisSession(route.path)

  toast.info(HORIZONTAL_SCROLL_HINT_MESSAGE, {
    id: horizontalScrollHintId.value,
    duration: 5200,
    position: "top-center",
  })
}

function getColumnValue(row: Record<string, unknown>, key: string) {
  return row[key]
}

function getRendererValue(row: Record<string, unknown>, key: string) {
  return row[key]
}

function hasDisplayValue(value: unknown) {
  if (value === null || value === undefined) {
    return false
  }

  return `${value}`.trim().length > 0
}

function stringifyValue(value: unknown) {
  if (value === null || value === undefined) {
    return ""
  }

  return `${value}`
}

function getArrayValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.map(item => stringifyValue(item)).filter(Boolean)
  }

  const stringValue = stringifyValue(value)
  return stringValue ? [stringValue] : []
}

function getProgressPercent(row: Record<string, unknown>, column: TableColumn) {
  if (column.cellRenderer?.kind !== "progress") {
    return 0
  }

  const rawValue = getRendererValue(row, column.cellRenderer.valueKey ?? column.key)
  const numericValue = Number(rawValue)
  const max = column.cellRenderer.max ?? 100

  if (Number.isNaN(numericValue) || max <= 0) {
    return 0
  }

  return Math.max(0, Math.min(100, (numericValue / max) * 100))
}

function isRightAlignedColumn(column: TableColumn) {
  return column.filterType === "number" || column.cellRenderer?.kind === "metric-unit"
}

function isSelectionColumn(columnIndex: number) {
  return props.showIndex && columnIndex === 0
}

function isPrimaryColumn(columnIndex: number) {
  return columnIndex === 0
}

function handleRowActionClick(action: TableRowAction, row: Record<string, unknown>, index: number) {
  action.onClick?.(row, index)
}

function isRowSelected(row: Record<string, unknown>, index: number) {
  return selectedRowKeySet.value.has(getRowKey(row, index))
}

function commitSelectedRowKeys(nextSelections: Set<RowSelectionKey>) {
  emit("update:selected-row-keys", Array.from(nextSelections))
}

function updateRowSelection(row: Record<string, unknown>, index: number, checked: unknown) {
  const nextSelections = new Set(selectedRowKeySet.value)
  const rowKey = getRowKey(row, index)

  if (checked === true) {
    nextSelections.add(rowKey)
  } else {
    nextSelections.delete(rowKey)
  }

  commitSelectedRowKeys(nextSelections)
}

function updateAllRowsSelection(checked: unknown) {
  const nextSelections = new Set(selectedRowKeySet.value)

  if (checked === true) {
    for (const rowKey of currentRowKeys.value) {
      nextSelections.add(rowKey)
    }

    commitSelectedRowKeys(nextSelections)
    return
  }

  for (const rowKey of currentRowKeys.value) {
    nextSelections.delete(rowKey)
  }

  commitSelectedRowKeys(nextSelections)
}

function getRowClass(row: Record<string, unknown>, index: number) {
  const rowKey = getRowKey(row, index)
  return cn(
    tableTheme.row,
    rowClickEnabled.value ? "cursor-pointer" : "",
    isRowSelected(row, index)
      ? "bg-selection hover:bg-selection"
      : isRowKeyHighlighted(rowKey)
        ? "bg-surface-hover-subtle"
        : "",
  )
}

function getIndexLabelClass(row: Record<string, unknown>, index: number) {
  if (!props.showIndexCheckbox) {
    return "absolute inset-0 flex items-center justify-center"
  }

  return cn(
    "absolute inset-0 flex items-center justify-center transition-opacity duration-150",
    isRowSelected(row, index)
      ? "opacity-0"
      : "opacity-100 group-hover:opacity-0 group-focus-within:opacity-0",
  )
}

function getIndexCheckboxWrapperClass(row: Record<string, unknown>, index: number) {
  if (!props.showIndexCheckbox) {
    return "hidden"
  }

  return cn(
    "absolute inset-0 flex items-center justify-center transition-opacity duration-150",
    isRowSelected(row, index)
      ? "opacity-100"
      : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100",
  )
}

function getHeaderCheckboxWrapperClass() {
  if (!props.showIndexCheckbox) {
    return "hidden"
  }

  return cn(
    "absolute inset-0 flex items-center justify-center transition-opacity duration-150",
    shouldShowHeaderCheckbox.value
      ? "opacity-100"
      : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100",
  )
}

function getInlineQuickActionWrapperClass(row: Record<string, unknown>, index: number) {
  if (!inlineQuickActionEnabled.value) {
    return "hidden"
  }

  return cn(
    tableTheme.quickAction.slot,
    isRowSelected(row, index) || isRowKeyHighlighted(getRowKey(row, index))
      ? "opacity-100"
      : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100",
  )
}

function normalizeActionLabel(label: string) {
  return label.replace(/\s+/g, "").trim()
}

function isInlinePreviewAction(action: TableRowAction) {
  const normalizedKey = action.key.trim().toLowerCase()
  const normalizedLabel = normalizeActionLabel(action.label)

  return (
    normalizedKey.includes("view")
    || normalizedKey.includes("detail")
    || normalizedKey.includes("archive")
    || INLINE_PREVIEW_ACTION_LABELS.has(normalizedLabel)
  )
}

function clearInlineActionState(event?: MouseEvent) {
  hoveredRowKey.value = null
  focusedRowKey.value = null

  if (event?.currentTarget instanceof HTMLElement) {
    event.currentTarget.blur()
  }
}

function handleInlineQuickAction(row: Record<string, unknown>, index: number, event?: MouseEvent) {
  clearInlineActionState(event)
  props.onQuickAction?.(row, index)
}

function handleInlineSecondaryAction(action: TableRowAction, row: Record<string, unknown>, index: number, event?: MouseEvent) {
  clearInlineActionState(event)
  action.onClick?.(row, index)
}

function hasActiveTextSelection() {
  if (typeof window === "undefined") {
    return false
  }

  const selection = window.getSelection()
  return Boolean(selection && selection.rangeCount > 0 && !selection.isCollapsed && selection.toString().trim())
}

function isIgnoredRowClickTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest(ROW_CLICK_IGNORE_SELECTOR))
}

function clearRowPointerDown() {
  rowPointerDown.value = null
}

function handleRowMouseDown(row: Record<string, unknown>, index: number, event: MouseEvent) {
  if (!rowClickEnabled.value || event.button !== 0 || event.defaultPrevented || isIgnoredRowClickTarget(event.target)) {
    clearRowPointerDown()
    return
  }

  rowPointerDown.value = {
    rowKey: getRowKey(row, index),
    clientX: event.clientX,
    clientY: event.clientY,
  }
}

function handleRowClick(row: Record<string, unknown>, index: number, event: MouseEvent) {
  const pointerDown = rowPointerDown.value
  clearRowPointerDown()

  if (
    !rowClickEnabled.value
    || event.defaultPrevented
    || event.button !== 0
    || event.metaKey
    || event.ctrlKey
    || event.shiftKey
    || event.altKey
    || isIgnoredRowClickTarget(event.target)
    || hasActiveTextSelection()
  ) {
    return
  }

  const rowKey = getRowKey(row, index)

  if (!pointerDown || pointerDown.rowKey !== rowKey) {
    return
  }

  const deltaX = event.clientX - pointerDown.clientX
  const deltaY = event.clientY - pointerDown.clientY

  if (Math.hypot(deltaX, deltaY) > ROW_CLICK_DRAG_THRESHOLD) {
    return
  }

  props.onRowClick?.(row, index)
}

function isRowKeyHighlighted(rowKey: RowSelectionKey) {
  return hoveredRowKey.value === rowKey || focusedRowKey.value === rowKey
}

function handleRowMouseEnter(rowKey: RowSelectionKey) {
  hoveredRowKey.value = rowKey
}

function handleRowMouseLeave(rowKey: RowSelectionKey) {
  if (hoveredRowKey.value === rowKey) {
    hoveredRowKey.value = null
  }
}

function handleRowFocusIn(rowKey: RowSelectionKey) {
  focusedRowKey.value = rowKey
}

function handleRowFocusOut(rowKey: RowSelectionKey, event: FocusEvent) {
  const currentTarget = event.currentTarget

  if (currentTarget instanceof HTMLElement && currentTarget.contains(event.relatedTarget as Node | null)) {
    return
  }

  if (focusedRowKey.value === rowKey) {
    focusedRowKey.value = null
  }
}

function getStickyCellStyle(columnIndex: number) {
  const width = stickyColumnWidths.value[columnIndex]

  if (!width) {
    return undefined
  }

  return {
    width: `${width}px`,
    minWidth: `${width}px`,
    maxWidth: `${width}px`,
  }
}

function getActionColumnStyle(fallbackWidth?: number) {
  const width = fallbackWidth ?? actionColumnWidth.value

  if (!width) {
    return undefined
  }

  return {
    width: `${width}px`,
    minWidth: `${width}px`,
    maxWidth: `${width}px`,
    "--table-pinned-action-fade-width": `${actionColumnFadeWidth.value}px`,
  }
}

function getActionHeaderClass(isStickyClone = false) {
  if (!pinRowActionsActive.value) {
    return []
  }

  return [
    tableTheme.pinnedAction.base,
    showPinnedActionFade.value ? tableTheme.pinnedAction.fade : "",
    tableTheme.pinnedAction.headerBorder,
    isStickyClone ? tableTheme.pinnedAction.headerClone : tableTheme.pinnedAction.header,
  ]
}

function getActionCellClass(options?: { selected?: boolean; loading?: boolean }) {
  if (!pinRowActionsActive.value) {
    return []
  }

  return [
    tableTheme.pinnedAction.base,
    showPinnedActionFade.value ? tableTheme.pinnedAction.fade : "",
    tableTheme.pinnedAction.bodyBorder,
    options?.selected
      ? tableTheme.pinnedAction.bodySelected
      : options?.loading
        ? tableTheme.pinnedAction.loading
        : tableTheme.pinnedAction.body,
  ]
}

function getEdgeGutterStyle(size: number) {
  return {
    width: `${size}px`,
    minWidth: `${size}px`,
    maxWidth: `${size}px`,
  }
}

function getLoadingCellWidthClass(column: TableColumn, columnIndex: number, rowIndex: number) {
  if (isSelectionColumn(columnIndex)) {
    return "h-4 w-4 rounded-sm"
  }

  if (isRightAlignedColumn(column) && !isSelectionColumn(columnIndex)) {
    return rowIndex % 2 === 0 ? "h-4 w-12" : "h-4 w-16"
  }

  if (column.cellRenderer?.kind === "status" || column.filterType === "tag") {
    return rowIndex % 2 === 0 ? "h-5 w-16 rounded-full" : "h-5 w-20 rounded-full"
  }

  if (column.variant === "note" || column.cellRenderer?.kind === "note" || isResolvedFillColumn(columnIndex)) {
    return rowIndex % 2 === 0 ? "h-4 w-full max-w-[14rem]" : "h-4 w-full max-w-[11rem]"
  }

  if (column.variant === "contact" || column.cellRenderer?.kind === "dual-stack") {
    return rowIndex % 2 === 0 ? "h-4 w-28" : "h-4 w-36"
  }

  return rowIndex % 3 === 0
    ? "h-4 w-24"
    : rowIndex % 3 === 1
      ? "h-4 w-32"
      : "h-4 w-20"
}

function getLoadingCellContentClass(column: TableColumn, columnIndex: number) {
  return cn(
    "flex items-center",
    isSelectionColumn(columnIndex) ? "justify-center" : "",
    isRightAlignedColumn(column) && !isSelectionColumn(columnIndex) ? "justify-end" : "",
  )
}

function getLoadingActionSkeletonClass(rowIndex: number) {
  return rowIndex % 2 === 0 ? "h-7 w-16 rounded-md" : "h-7 w-20 rounded-md"
}

function getLoadingPrimaryLineClass(rowIndex: number) {
  return rowIndex % 3 === 0
    ? "h-4 w-32"
    : rowIndex % 3 === 1
      ? "h-4 w-40"
      : "h-4 w-36"
}

function getFillColumnIndexes() {
  return props.columns.reduce<number[]>((indexes, _column, index) => {
    if (isResolvedFillColumn(index)) {
      indexes.push(index)
    }

    return indexes
  }, [])
}

function getAutoFillColumnIndex() {
  return props.columns.length > 0 ? props.columns.length - 1 : -1
}

function isResolvedFillColumn(columnIndex: number) {
  return columnIndex === getAutoFillColumnIndex()
}

function isFillColumnActive(columnIndex: number) {
  return isResolvedFillColumn(columnIndex) && fillColumnActive.value
}

function isNoteLikeColumn(column: TableColumn) {
  return column.variant === "note" || column.cellRenderer?.kind === "note"
}

/**
 * table-auto 下可换行单元格的 min-content 宽度极窄，备注列会被压成「两字一行」。
 * 非 fill 的备注列需设下限；有数据时不再走 getEmptyColumnWidthClass，此处单独补全。
 */
function getNoteColumnMinWidthClass(column: TableColumn) {
  if (!isNoteLikeColumn(column)) {
    return ""
  }

  return "min-w-[12rem]"
}

function getResolvedColumnHeaderClass(column: TableColumn, columnIndex: number) {
  const fillActive = isFillColumnActive(columnIndex)
  const resolvedFillColumn = isResolvedFillColumn(columnIndex)

  return [
    getColumnHeaderClass(column, fillActive),
    props.rows.length === 0
      ? getEmptyColumnWidthClass(column, columnIndex)
      : getNoteColumnMinWidthClass(column),
    resolvedFillColumn ? "" : "w-px",
  ]
}

function getStickyHeaderCellClass(column: TableColumn, columnIndex: number) {
  return [
    tableTheme.headerCell.sticky,
    getResolvedColumnHeaderClass(column, columnIndex),
  ]
}

function getResolvedColumnCellClass(column: TableColumn, columnIndex: number) {
  const fillActive = isFillColumnActive(columnIndex)
  const resolvedFillColumn = isResolvedFillColumn(columnIndex)

  return [
    getColumnCellClass(column, fillActive),
    props.rows.length === 0
      ? getEmptyColumnWidthClass(column, columnIndex)
      : getNoteColumnMinWidthClass(column),
    resolvedFillColumn ? "" : "w-px",
    resolvedFillColumn
      ? fillActive
        ? "max-w-none"
        : "max-w-none whitespace-nowrap"
      : "",
  ]
}

function getEmptyColumnWidthClass(column: TableColumn, columnIndex: number) {
  if (isResolvedFillColumn(columnIndex) || isNoteLikeColumn(column)) {
    return "min-w-[16rem]"
  }

  if (column.variant === "contact") {
    return "min-w-[12rem]"
  }

  if (column.variant === "metric" || column.cellRenderer?.kind === "metric-unit" || column.filterType === "number") {
    return "min-w-[7rem]"
  }

  if (column.filterType === "time") {
    return "min-w-[9rem]"
  }

  if (column.filterType === "tag") {
    return "min-w-[8rem]"
  }

  return "min-w-[10rem]"
}

function getNoteContentClass(column: TableColumn, columnIndex: number) {
  const fillActive = isFillColumnActive(columnIndex)

  if (isResolvedFillColumn(columnIndex)) {
    return fillActive
      ? "w-full max-w-none whitespace-normal leading-6 text-muted-foreground"
      : "max-w-none whitespace-nowrap text-muted-foreground"
  }

  return tableTheme.renderers.note
}

function getHeaderCells() {
  if (!tableRef.value) {
    return []
  }

  return Array.from(tableRef.value.querySelectorAll("thead > tr:first-child > th")) as HTMLElement[]
}

function getStickyTopOffset() {
  if (!tableWrapperRef.value || typeof window === "undefined") {
    return 0
  }

  const wrapperStyles = window.getComputedStyle(tableWrapperRef.value)
  const wrapperOffset = Number.parseFloat(wrapperStyles.getPropertyValue("--table-page-sticky-top"))

  if (!Number.isNaN(wrapperOffset)) {
    return wrapperOffset
  }

  const rootOffset = Number.parseFloat(
    window.getComputedStyle(document.documentElement).getPropertyValue("--table-page-sticky-top"),
  )

  return Number.isNaN(rootOffset) ? 0 : rootOffset
}

function getScrollRootTop() {
  if (scrollRoot === null || scrollRoot === window) {
    return 0
  }

  return (scrollRoot as HTMLElement).getBoundingClientRect().top
}

function clearStickyState() {
  stickyHeaderActive.value = false
  stickyHeaderWidth.value = 0
  stickyTableWidth.value = 0
  stickyScrollLeft.value = 0
  stickyColumnWidths.value = []
}

function syncActionColumnWidth(headerCells?: HTMLElement[]) {
  if (!hasRowActions.value) {
    actionColumnWidth.value = 0
    actionColumnFadeWidth.value = 0
    return
  }

  const targetCells = headerCells ?? getHeaderCells()
  const headerWidth = targetCells[props.columns.length]?.getBoundingClientRect().width ?? 0
  const contentElement = tableRef.value?.querySelector("[data-table-action-buttons]") as HTMLElement | null
  const actionCell = contentElement?.closest("[data-table-action-cell]") as HTMLElement | null

  if (!contentElement || !actionCell || typeof window === "undefined") {
    actionColumnWidth.value = Math.max(0, Math.ceil(headerWidth))
    actionColumnFadeWidth.value = 0
    return
  }

  const cellStyles = window.getComputedStyle(actionCell)
  const paddingLeft = Number.parseFloat(cellStyles.paddingLeft || "0")
  const paddingRight = Number.parseFloat(cellStyles.paddingRight || "0")
  const contentWidth = Math.ceil(contentElement.getBoundingClientRect().width)
  const measuredWidth = Math.max(headerWidth, contentWidth + paddingLeft + paddingRight)

  actionColumnWidth.value = Math.max(0, Math.ceil(measuredWidth))
  actionColumnFadeWidth.value = Math.max(0, Math.round(measuredWidth - contentWidth - paddingRight))
}

function syncHorizontalScrollState(measuredOverflow?: boolean) {
  if (!tableWrapperRef.value || !tableRef.value) {
    horizontalOverflow.value = false
    syncHorizontalScrollbarMetrics()
    return
  }

  const wrapper = tableWrapperRef.value
  const contentWidth = Math.max(wrapper.scrollWidth, tableRef.value.scrollWidth)
  const overflow = contentWidth > wrapper.clientWidth + 1
    || measuredOverflow === true

  horizontalOverflow.value = overflow
  stickyScrollLeft.value = wrapper.scrollLeft
  syncHorizontalScrollbarMetrics(contentWidth)
}

function createMeasurementHost() {
  const measurementHost = document.createElement("div")
  measurementHost.style.position = "absolute"
  measurementHost.style.left = "-99999px"
  measurementHost.style.top = "0"
  measurementHost.style.visibility = "hidden"
  measurementHost.style.pointerEvents = "none"
  measurementHost.style.width = "max-content"
  measurementHost.style.maxWidth = "none"
  measurementHost.style.overflow = "visible"
  return measurementHost
}

function measureTableLayout() {
  if (!tableWrapperRef.value || !tableRef.value || typeof document === "undefined") {
    return {
      overflow: false,
      fillColumnActive: false,
      compactTableActive: false,
    }
  }

  const wrapperClientWidth = tableWrapperRef.value.clientWidth
  const measurementHost = createMeasurementHost()
  const fillColumnIndexes = getFillColumnIndexes()

  const tableClone = tableRef.value.cloneNode(true) as HTMLTableElement
  tableClone.style.minWidth = "0"
  tableClone.style.width = "max-content"
  tableClone.style.maxWidth = "none"

  measurementHost.appendChild(tableClone)
  document.body.appendChild(measurementHost)

  let intrinsicWidth = Math.ceil(tableClone.getBoundingClientRect().width)
  let fillColumnActive = false

  if (fillColumnIndexes.length > 0) {
    for (const row of tableClone.querySelectorAll("tr")) {
      for (const fillColumnIndex of fillColumnIndexes) {
        const cell = row.children.item(fillColumnIndex)

        if (cell instanceof HTMLElement) {
          cell.style.width = "auto"
          cell.style.maxWidth = "none"
          cell.style.whiteSpace = "normal"

          const noteContent = cell.firstElementChild
          if (noteContent instanceof HTMLElement) {
            noteContent.style.width = "auto"
            noteContent.style.maxWidth = "none"
            noteContent.style.whiteSpace = "normal"
          }
        }
      }
    }

    intrinsicWidth = Math.ceil(tableClone.getBoundingClientRect().width)
  }

  measurementHost.remove()

  const compactTableActive = !props.listLevelTable
    && wrapperClientWidth - intrinsicWidth >= COMPACT_DETAIL_TABLE_WIDTH_THRESHOLD

  if (!compactTableActive) {
    fillColumnActive = intrinsicWidth <= wrapperClientWidth + 1
  }

  return {
    overflow: intrinsicWidth > wrapperClientWidth + 1,
    fillColumnActive,
    compactTableActive,
  }
}

async function syncTableLayoutState() {
  updateEdgeGutterSize()
  syncEmbeddedViewportState()

  const {
    fillColumnActive: nextFillColumnActive,
    overflow: measuredOverflow,
    compactTableActive: nextCompactTableActive,
  } = measureTableLayout()

  const compactChanged = compactTableActive.value !== nextCompactTableActive
  const fillChanged = fillColumnActive.value !== nextFillColumnActive

  if (compactChanged) {
    compactTableActive.value = nextCompactTableActive
  }

  if (fillChanged) {
    fillColumnActive.value = nextFillColumnActive
  }

  if (compactChanged || fillChanged) {
    await nextTick()
  }

  const headerCells = getHeaderCells()
  syncActionColumnWidth(headerCells)
  syncHorizontalScrollState(measuredOverflow)
  syncStickyHeaderState(headerCells)
}

function syncStickyHeaderState(headerCells?: HTMLElement[]) {
  if (useInternalStickyThead.value) {
    clearStickyState()
    return
  }

  if (!props.stickyHeader || !tableWrapperRef.value || !tableRef.value) {
    clearStickyState()
    return
  }

  const resolvedHeaderCells = headerCells ?? getHeaderCells()
  if (!resolvedHeaderCells.length) {
    clearStickyState()
    return
  }

  const wrapperRect = tableWrapperRef.value.getBoundingClientRect()
  const stickyLine = getScrollRootTop() + getStickyTopOffset()
  const headerHeight = resolvedHeaderCells[0]?.getBoundingClientRect().height ?? 41

  stickyHeaderLeft.value = props.listLevelTable
    ? wrapperRect.left
    : wrapperRect.left - embeddedViewportExpandLeft.value
  stickyHeaderTop.value = stickyLine
  stickyTableWidth.value = tableRef.value.scrollWidth
  stickyScrollLeft.value = tableWrapperRef.value.scrollLeft
  stickyColumnWidths.value = resolvedHeaderCells.map(cell => cell.getBoundingClientRect().width)
  const wrapperWidth = props.listLevelTable
    ? wrapperRect.width
    : wrapperRect.width + embeddedViewportExpandLeft.value + embeddedViewportExpandRight.value
  stickyHeaderWidth.value = wrapperWidth
  stickyHeaderActive.value = wrapperRect.top <= stickyLine && wrapperRect.bottom > stickyLine + headerHeight
}

function handleStickyScroll() {
  syncStickyHeaderState()
}

function handleWrapperScroll() {
  stickyScrollLeft.value = tableWrapperRef.value?.scrollLeft ?? 0
  syncHorizontalScrollState()
}

function isScrollableAncestor(element: HTMLElement) {
  const styles = window.getComputedStyle(element)
  const overflowY = styles.overflowY
  return /(auto|scroll|overlay)/.test(overflowY) && element.scrollHeight > element.clientHeight
}

function getScrollRoot(element: HTMLElement): ScrollRoot {
  let current: HTMLElement | null = element.parentElement

  while (current) {
    if (isScrollableAncestor(current)) {
      return current
    }

    current = current.parentElement
  }

  return window
}

function detachScrollRootListener() {
  if (scrollRoot === null) {
    return
  }

  if (scrollRoot === window) {
    window.removeEventListener("scroll", handleStickyScroll)
    return
  }

  scrollRoot.removeEventListener("scroll", handleStickyScroll)
}

function attachScrollRootListener() {
  if (useInternalStickyThead.value) {
    detachScrollRootListener()
    scrollRoot = null
    return
  }

  if (!tableWrapperRef.value || typeof window === "undefined") {
    detachScrollRootListener()
    scrollRoot = null
    return
  }

  const nextScrollRoot = getScrollRoot(tableWrapperRef.value)
  detachScrollRootListener()
  scrollRoot = nextScrollRoot

  if (scrollRoot === window) {
    window.addEventListener("scroll", handleStickyScroll, { passive: true })
    return
  }

  scrollRoot.addEventListener("scroll", handleStickyScroll, { passive: true })
}

function scheduleStickySync() {
  void nextTick(() => {
    attachScrollRootListener()
    stopObservingStickyLayout()
    observeStickyLayout()
    void syncTableLayoutState()
  })
}

function observeStickyLayout() {
  if (typeof ResizeObserver === "undefined") {
    return
  }

  resizeObserver = new ResizeObserver(() => {
    void syncTableLayoutState()
  })

  if (tableWrapperRef.value) {
    resizeObserver.observe(tableWrapperRef.value)
  }

  if (tableRef.value) {
    resizeObserver.observe(tableRef.value)
  }
}

function stopObservingStickyLayout() {
  resizeObserver?.disconnect()
  resizeObserver = null
}

watch(() => props.columns, scheduleStickySync, { deep: true })
watch(() => props.rows, scheduleStickySync, { deep: true })
watch(() => props.rowActions, scheduleStickySync, { deep: true })
watch(() => props.showIndex, scheduleStickySync)
watch(() => props.showRowActionIcons, scheduleStickySync)
watch(() => hasRowActions.value, scheduleStickySync)
watch(() => props.stickyHeader, scheduleStickySync)
watch(() => props.fillAvailableHeight, scheduleStickySync)
watch(() => props.loading, scheduleStickySync)
watch(() => props.loadingRowCount, scheduleStickySync)
watch(() => [props.rows, props.selectedRowKeys] as const, ([rows, selectedKeys]) => {
  const availableRowKeys = new Set(rows.map((row, index) => getRowKey(row, index)))
  const nextSelections = new Set(
    (selectedKeys ?? []).filter(rowKey => availableRowKeys.has(rowKey)),
  )
  const currentSelections = selectedKeys ?? []
  const selectionChanged = nextSelections.size !== currentSelections.length
    || currentSelections.some(rowKey => !nextSelections.has(rowKey))

  if (selectionChanged) {
    commitSelectedRowKeys(nextSelections)
  }

  if (hoveredRowKey.value !== null && !availableRowKeys.has(hoveredRowKey.value)) {
    hoveredRowKey.value = null
  }

  if (focusedRowKey.value !== null && !availableRowKeys.has(focusedRowKey.value)) {
    focusedRowKey.value = null
  }
}, { deep: true })
watch(() => horizontalOverflow.value, (overflow) => {
  const wasOverflow = prevHorizontalOverflow.value
  prevHorizontalOverflow.value = overflow
  if (!overflow) {
    clearHorizontalScrollbarDrag()
  }
  if (overflow && !wasOverflow) {
    maybeShowHorizontalScrollHint()
  }
})

onMounted(() => {
  attachScrollRootListener()
  tableWrapperRef.value?.addEventListener("scroll", handleWrapperScroll, { passive: true })
  window.addEventListener("resize", scheduleStickySync, { passive: true })
  window.addEventListener("pointermove", handleWindowPointerMove, { passive: true })
  window.addEventListener("pointerup", clearHorizontalScrollbarDrag, { passive: true })
  window.addEventListener("pointercancel", clearHorizontalScrollbarDrag, { passive: true })
  observeStickyLayout()
  scheduleStickySync()
})

onBeforeUnmount(() => {
  tableWrapperRef.value?.removeEventListener("scroll", handleWrapperScroll)
  window.removeEventListener("resize", scheduleStickySync)
  window.removeEventListener("pointermove", handleWindowPointerMove)
  window.removeEventListener("pointerup", clearHorizontalScrollbarDrag)
  window.removeEventListener("pointercancel", clearHorizontalScrollbarDrag)
  detachScrollRootListener()
  stopObservingStickyLayout()
  clearHorizontalScrollbarDrag()
  clearRowPointerDown()
})
</script>

<template>
  <div
    ref="tableOuterRef"
    data-table-outer
    :class="cn(wrapperClassName, props.fillAvailableHeight ? 'h-full min-h-0 flex flex-col' : '')"
  >
    <!-- fixed 克隆挂到 body，与 getBoundingClientRect 视口坐标一致；避免嵌套 overflow/transform 导致吸顶错位 -->
    <Teleport v-if="stickyHeaderVisible" to="body">
      <div
        aria-hidden="true"
        :class="tableTheme.stickyViewport"
        :style="stickyViewportStyle"
      >
        <div :class="tableTheme.scrollContent" :style="stickyContentStyle">
          <div :class="tableTheme.edgeGutter" :style="getEdgeGutterStyle(leadingEdgeGutter)" />
          <table :class="tableClassName" :style="stickyTableStyle">
            <colgroup>
              <col
                v-for="(width, columnIndex) in stickyColumnWidths"
                :key="`sticky-col-${columnIndex}`"
                :style="{ width: `${width}px` }"
              >
            </colgroup>
            <thead :class="[tableTheme.head, tableTheme.headActive]">
              <tr>
                <th
                  v-for="(column, columnIndex) in columns"
                  :key="`sticky-${column.key}`"
                  :class="[
                    tableTheme.headerCell.base,
                    getStickyHeaderCellClass(column, columnIndex),
                    isSelectionColumn(columnIndex) ? ['group', tableTheme.headerCell.selectionFlush] : '',
                  ]"
                  :style="getStickyCellStyle(columnIndex)"
                >
                  <div :class="isSelectionColumn(columnIndex) ? tableTheme.indexInline.headerLayout : ''">
                    <div
                      v-if="isSelectionColumn(columnIndex)"
                      :class="tableTheme.indexInline.prefix"
                    >
                      <div :class="getHeaderCheckboxWrapperClass()">
                        <Checkbox
                          :model-value="headerCheckboxState"
                          :disabled="rows.length === 0"
                          :class="selectionCheckboxClass"
                          @update:model-value="updateAllRowsSelection($event)"
                        />
                      </div>
                    </div>
                    <span :class="isSelectionColumn(columnIndex) ? tableTheme.indexInline.content : ''">
                      {{ column.label }}
                    </span>
                  </div>
                </th>
                <th
                  v-if="hasRowActions"
                  :class="[tableTheme.actionHeader, tableTheme.actionHeaderSticky, getActionHeaderClass(true)]"
                  :style="getActionColumnStyle(stickyColumnWidths[columns.length])"
                >
                  操作
                </th>
              </tr>
            </thead>
          </table>
          <div :class="tableTheme.edgeGutter" :style="getEdgeGutterStyle(trailingEdgeGutter)" />
        </div>
      </div>
    </Teleport>

    <div :class="scrollFrameClassName" :style="scrollFrameStyle">
      <div
        ref="tableWrapperRef"
        data-table-scroll-viewport
        :class="tableViewportClassName"
        :style="scrollViewportStyle"
      >
        <div
          v-if="showEmptyState"
          :class="cn('flex w-full min-w-0 flex-col items-center justify-center px-4 py-16', props.fillAvailableHeight ? 'min-h-full' : 'min-h-[min(320px,50vh)]')"
        >
          <Empty
            class="w-full max-w-md flex-none border-0 bg-transparent p-6! shadow-none md:p-8!"
          >
            <EmptyHeader class="max-w-md">
              <EmptyMedia variant="icon">
                <i :class="[props.emptyState?.icon ?? 'ri-inbox-line', 'text-[18px]']" />
              </EmptyMedia>
              <EmptyTitle>{{ props.emptyState?.title ?? "暂无数据" }}</EmptyTitle>
              <EmptyDescription>
                {{ props.emptyState?.description ?? "当前列表还没有可展示的数据。" }}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent v-if="$slots['empty-action']">
              <slot name="empty-action" />
            </EmptyContent>
          </Empty>
        </div>

        <div v-else data-table-scroll-content :class="tableTheme.scrollContent">
          <div :class="tableTheme.edgeGutter" :style="getEdgeGutterStyle(leadingEdgeGutter)" />
          <table
            ref="tableRef"
            :class="tableClassName"
            :style="tableElementStyle"
          >
            <thead
              :class="
                cn(
                  tableTheme.head,
                  tableTheme.headActive,
                  (props.stickyThead || useInternalStickyThead)
                    && 'sticky top-0 z-30 bg-background shadow-[inset_0_-1px_0_var(--border)]',
                )
              "
            >
              <tr>
                <th
                  v-for="(column, columnIndex) in columns"
                  :key="column.key"
                  :class="[
                    tableTheme.headerCell.base,
                    getResolvedColumnHeaderClass(column, columnIndex),
                    isSelectionColumn(columnIndex) ? ['group', tableTheme.headerCell.selectionFlush] : '',
                  ]"
                >
                  <div :class="isSelectionColumn(columnIndex) ? tableTheme.indexInline.headerLayout : ''">
                    <div
                      v-if="isSelectionColumn(columnIndex)"
                      :class="tableTheme.indexInline.prefix"
                    >
                      <div :class="getHeaderCheckboxWrapperClass()">
                        <Checkbox
                          :model-value="headerCheckboxState"
                          :disabled="rows.length === 0"
                          :class="selectionCheckboxClass"
                          @update:model-value="updateAllRowsSelection($event)"
                        />
                      </div>
                    </div>
                    <span :class="isSelectionColumn(columnIndex) ? tableTheme.indexInline.content : ''">
                      {{ column.label }}
                    </span>
                  </div>
                </th>
                <th
                  v-if="hasRowActions"
                  :class="[tableTheme.actionHeader, getActionHeaderClass()]"
                  :style="getActionColumnStyle()"
                >
                  操作
                </th>
              </tr>
            </thead>

            <tbody :class="tableTheme.body">
              <template v-if="showLoadingRows">
                <tr
                  v-for="rowIndex in props.loadingRowCount"
                  :key="`loading-row-${rowIndex}`"
                  :class="tableTheme.row"
                  aria-hidden="true"
                >
                  <td
                    v-for="(column, columnIndex) in columns"
                    :key="`loading-row-${rowIndex}-cell-${column.key}`"
                    :class="[
                      tableTheme.bodyCell.base,
                      isSelectionColumn(columnIndex) ? tableTheme.bodyCell.selectionFlush : '',
                      columnIndex > 0 ? tableTheme.bodyCell.split : '',
                      isRightAlignedColumn(column) && !isSelectionColumn(columnIndex) ? tableTheme.bodyCell.rightAligned : '',
                      getResolvedColumnCellClass(column, columnIndex),
                    ]"
                  >
                    <div
                      v-if="isPrimaryColumn(columnIndex)"
                      :class="isSelectionColumn(columnIndex) ? tableTheme.indexInline.cellLayout : 'flex min-w-0 items-center'"
                    >
                      <div
                        v-if="isSelectionColumn(columnIndex)"
                        :class="tableTheme.indexInline.prefix"
                      >
                        <Skeleton class="h-4 w-4 rounded-sm" />
                      </div>
                      <div :class="cn(isSelectionColumn(columnIndex) ? tableTheme.indexInline.content : 'min-w-0', 'flex min-w-0 items-center')">
                        <Skeleton :class="getLoadingPrimaryLineClass(rowIndex)" />
                      </div>
                    </div>
                    <div v-else :class="getLoadingCellContentClass(column, columnIndex)">
                      <Skeleton :class="getLoadingCellWidthClass(column, columnIndex, rowIndex)" />
                    </div>
                  </td>
                  <td
                    v-if="hasRowActions"
                    :class="[tableTheme.actionCell, getActionCellClass({ loading: true })]"
                    :style="getActionColumnStyle()"
                    data-table-action-cell
                  >
                    <div :class="tableTheme.actionCellContent">
                      <div :class="tableTheme.actionCellButtons" data-table-action-buttons>
                        <Skeleton :class="getLoadingActionSkeletonClass(rowIndex)" />
                      </div>
                    </div>
                  </td>
                </tr>
              </template>

              <tr
                v-for="(row, index) in rows"
                v-else-if="hasDataRows"
                :key="getRowKey(row, index)"
                :class="getRowClass(row, index)"
                @mousedown="handleRowMouseDown(row, index, $event)"
                @click="handleRowClick(row, index, $event)"
                @mouseenter="handleRowMouseEnter(getRowKey(row, index))"
                @mouseleave="handleRowMouseLeave(getRowKey(row, index))"
                @focusin="handleRowFocusIn(getRowKey(row, index))"
                @focusout="handleRowFocusOut(getRowKey(row, index), $event)"
              >
                <td
                  v-for="(column, columnIndex) in columns"
                  :key="column.key"
                  :class="[
                    tableTheme.bodyCell.base,
                    isSelectionColumn(columnIndex) ? tableTheme.bodyCell.selectionFlush : '',
                    columnIndex > 0 ? tableTheme.bodyCell.split : '',
                    isRightAlignedColumn(column) && !isSelectionColumn(columnIndex) ? tableTheme.bodyCell.rightAligned : '',
                    getResolvedColumnCellClass(column, columnIndex),
                  ]"
                >
                  <div :class="isSelectionColumn(columnIndex) ? tableTheme.indexInline.cellLayout : ''">
                    <div
                      v-if="isSelectionColumn(columnIndex)"
                      :class="tableTheme.indexInline.prefix"
                    >
                      <span :class="getIndexLabelClass(row, index)">
                        {{ index + 1 }}
                      </span>
                      <span :class="getIndexCheckboxWrapperClass(row, index)">
                        <Checkbox
                          :model-value="isRowSelected(row, index)"
                          :class="selectionCheckboxClass"
                          @click.stop
                          @update:model-value="updateRowSelection(row, index, $event)"
                        />
                      </span>
                    </div>
                    <div
                      :class="[
                        isSelectionColumn(columnIndex) ? tableTheme.indexInline.content : '',
                        isPrimaryColumn(columnIndex) && inlineQuickActionEnabled ? tableTheme.quickAction.layout : '',
                      ]"
                    >
                      <div
                        :class="isPrimaryColumn(columnIndex) && inlineQuickActionEnabled ? tableTheme.quickAction.content : ''"
                      >
                        <slot
                          :name="column.slot ?? `cell-${column.key}`"
                          :row="row"
                          :value="getColumnValue(row, column.key)"
                          :index="index"
                        >
                          <template v-if="column.cellRenderer?.kind === 'dual-inline'">
                            <span :class="column.cellRenderer.primaryClass ?? tableTheme.renderers.contactPrimary">
                              {{ getRendererValue(row, column.cellRenderer.primaryKey) }}
                            </span>
                            <span
                              v-if="stringifyValue(getRendererValue(row, column.cellRenderer.secondaryKey))"
                              :class="['ml-1', column.cellRenderer.secondaryClass ?? tableTheme.renderers.contactSecondary]"
                            >
                              {{ getRendererValue(row, column.cellRenderer.secondaryKey) }}
                            </span>
                          </template>

                          <div
                            v-else-if="column.cellRenderer?.kind === 'dual-stack'"
                            class="flex flex-col gap-0.5"
                          >
                            <span :class="column.cellRenderer.primaryClass ?? tableTheme.renderers.contactPrimary">
                              {{ getRendererValue(row, column.cellRenderer.primaryKey) }}
                            </span>
                            <span
                              v-if="stringifyValue(getRendererValue(row, column.cellRenderer.secondaryKey))"
                              :class="column.cellRenderer.secondaryClass ?? tableTheme.renderers.contactSecondary"
                            >
                              {{ getRendererValue(row, column.cellRenderer.secondaryKey) }}
                            </span>
                          </div>

                          <div
                            v-else-if="column.cellRenderer?.kind === 'array'"
                            class="flex flex-wrap items-center gap-1"
                          >
                            <span
                              v-for="(item, itemIndex) in getArrayValue(getColumnValue(row, column.key))"
                              :key="`${column.key}-${index}-${itemIndex}`"
                              :class="column.cellRenderer.itemClass ?? tableTheme.renderers.arrayItem"
                            >
                              {{ item }}<template v-if="itemIndex < getArrayValue(getColumnValue(row, column.key)).length - 1">{{ column.cellRenderer.separator ?? "、" }}</template>
                            </span>
                          </div>

                          <div
                            v-else-if="column.cellRenderer?.kind === 'tags'"
                            class="flex flex-wrap items-center gap-1.5"
                          >
                            <span
                              v-for="(item, itemIndex) in getArrayValue(getColumnValue(row, column.key))"
                              :key="`${column.key}-${index}-tag-${itemIndex}`"
                              :class="column.cellRenderer.itemClass ?? tableTheme.renderers.tagItem"
                            >
                              {{ item }}
                            </span>
                          </div>

                          <div
                            v-else-if="column.cellRenderer?.kind === 'progress'"
                            class="flex min-w-[120px] items-center gap-2"
                          >
                            <div :class="column.cellRenderer.trackClass ?? tableTheme.renderers.progressTrack">
                              <div
                                :class="column.cellRenderer.fillClass ?? tableTheme.renderers.progressFill"
                                :style="{ width: `${getProgressPercent(row, column)}%` }"
                              />
                            </div>
                            <span :class="column.cellRenderer.labelClass ?? tableTheme.renderers.progressLabel">
                              {{ getColumnValue(row, column.key) }}
                            </span>
                          </div>

                          <div
                            v-else-if="column.cellRenderer?.kind === 'metric-unit'"
                            class="inline-flex items-baseline justify-end"
                          >
                            <span :class="column.cellRenderer.valueClass ?? tableTheme.renderers.metricValue">
                              {{ getRendererValue(row, column.cellRenderer.valueKey ?? column.key) }}
                            </span>
                            <span
                              v-if="hasDisplayValue(getRendererValue(row, column.cellRenderer.valueKey ?? column.key))"
                              :class="['ml-1', column.cellRenderer.unitClass ?? tableTheme.renderers.metricUnit]"
                            >
                              {{ column.cellRenderer.unit }}
                            </span>
                          </div>

                          <StatusChip
                            v-else-if="column.cellRenderer?.kind === 'status'"
                            :value="getRendererValue(row, column.cellRenderer.valueKey ?? column.key)"
                            :renderer="column.cellRenderer"
                          />

                          <div
                            v-else-if="column.cellRenderer?.kind === 'note'"
                            :class="getNoteContentClass(column, columnIndex)"
                          >
                            {{ getColumnValue(row, column.key) }}
                          </div>

                          <template v-else>
                            {{ getColumnValue(row, column.key) }}
                          </template>
                        </slot>
                      </div>

                      <div
                        v-if="isPrimaryColumn(columnIndex) && inlineQuickActionEnabled"
                        :class="getInlineQuickActionWrapperClass(row, index)"
                      >
                        <TooltipWrap
                          v-for="action in inlineSecondaryActions"
                          :key="`${getRowKey(row, index)}-${action.key}-inline`"
                          :content="action.label"
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            :class="tableTheme.quickAction.button"
                            :aria-label="action.label"
                            :title="action.label"
                            data-row-click-ignore
                            @mousedown.stop.prevent
                            @click.stop="handleInlineSecondaryAction(action, row, index, $event)"
                          >
                            <i :class="[remixIconForTableRowAction(action.label, action.icon), 'text-[14px] leading-none']" />
                          </Button>
                        </TooltipWrap>

                        <TooltipWrap content="在侧边预览中打开">
                          <Button
                            variant="ghost"
                            size="sm"
                            :class="tableTheme.quickAction.button"
                            aria-label="在侧边预览中打开"
                            title="在侧边预览中打开"
                            data-row-click-ignore
                            @mousedown.stop.prevent
                            @click.stop="handleInlineQuickAction(row, index, $event)"
                          >
                            <i class="ri-layout-right-2-line text-[14px] leading-none" />
                          </Button>
                        </TooltipWrap>
                      </div>
                    </div>
                  </div>
                </td>
                <td
                  v-if="hasRowActions"
                  :class="[
                    tableTheme.actionCell,
                    getActionCellClass({ selected: isRowSelected(row, index) }),
                  ]"
                  :style="getActionColumnStyle()"
                  data-table-action-cell
                >
                  <div :class="tableTheme.actionCellContent">
                    <div :class="tableTheme.actionCellButtons" data-table-action-buttons>
                      <Button
                        v-for="action in rowActions"
                        :key="`${getRowKey(row, index)}-${action.key}`"
                        variant="outline"
                        size="sm"
                        :class="tableTheme.actionButton"
                        @click.stop="handleRowActionClick(action, row, index)"
                      >
                        <i v-if="props.showRowActionIcons" :class="remixIconForTableRowAction(action.label, action.icon)" />
                        {{ action.label }}
                      </Button>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <div :class="tableTheme.edgeGutter" :style="getEdgeGutterStyle(trailingEdgeGutter)" />
        </div>
      </div>
    </div>

    <div
      v-if="bottomDockVisible"
      :class="bottomDockClassName"
      :style="bottomDockStyle"
    >
      <div v-if="summary" :class="summaryClassName" :style="summaryStyle">
        {{ summary }}
      </div>

        <div
          v-if="hasVisibleBodyRows && horizontalOverflow"
          :class="horizontalScrollbarSectionClassName"
          :style="horizontalScrollbarSectionStyle"
        >
          <div
            class="relative h-px w-full overflow-visible"
          >
            <div
              ref="horizontalScrollbarTrackRef"
              class="group absolute inset-x-0 top-1/2 h-4 -translate-y-1/2 touch-none select-none"
            @pointerdown="handleHorizontalScrollbarTrackPointerDown"
          >
            <div class="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />
            <div
              data-table-hscroll-thumb="true"
              :class="[
                'absolute top-1/2 -translate-y-1/2 rounded-full bg-border-hover transition-[height,background-color] duration-150 ease-out',
                horizontalScrollbarDrag
                  ? 'h-1.5 cursor-grabbing bg-border-hover'
                  : 'h-px cursor-grab group-hover:h-1.5 group-hover:bg-border-hover active:cursor-grabbing active:h-1.5',
              ]"
              :style="horizontalScrollbarThumbStyle"
              @pointerdown.stop="handleHorizontalScrollbarThumbPointerDown"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
[data-table-scroll-viewport] {
  scrollbar-width: auto;
  scrollbar-color: color-mix(in srgb, var(--foreground) 18%, transparent) transparent;
}

[data-table-scroll-viewport]::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

[data-table-scroll-viewport]::-webkit-scrollbar-thumb {
  border-radius: 9999px;
  background: color-mix(in srgb, var(--foreground) 18%, transparent);
}

[data-table-scroll-viewport]::-webkit-scrollbar-track {
  background: transparent;
}

[data-table-scroll-viewport]::-webkit-scrollbar:horizontal {
  height: 0 !important;
  max-height: 0 !important;
  display: none;
  -webkit-appearance: none;
}

[data-table-scroll-viewport]::-webkit-scrollbar-track:horizontal,
[data-table-scroll-viewport]::-webkit-scrollbar-thumb:horizontal,
[data-table-scroll-viewport]::-webkit-scrollbar-corner {
  background: transparent;
  border: 0;
  box-shadow: none;
}

[data-settings-auto-width] [data-table-outer] {
  width: max-content;
  min-width: 100%;
  max-width: none;
}

[data-settings-auto-width] [data-table-scroll-viewport] {
  width: max-content;
  min-width: 100%;
  max-width: none;
}

[data-settings-auto-width] [data-table-scroll-content] {
  min-width: max-content;
}
</style>
