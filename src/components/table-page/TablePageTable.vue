<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue"
import { useRoute } from "vue-router"
import { toast } from "vue-sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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

const HORIZONTAL_SCROLL_HINT_MESSAGE = "可按住 Shift + 鼠标滚轮进行横向移动。"
/** 同一路由在本次浏览器会话内只提示一次，避免布局抖动或重复挂载反复弹出 */
const HORIZONTAL_SCROLL_HINT_SESSION_PREFIX = "buildguard:table-hscroll-hint:"
const ROW_CLICK_DRAG_THRESHOLD = 5
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
const selectionCheckboxClass = "border-[#B7C4E0] bg-white data-[state=checked]:border-[#2B67F6] data-[state=checked]:bg-[#2B67F6] data-[state=indeterminate]:border-[#2B67F6] data-[state=indeterminate]:bg-[#2B67F6] focus-visible:ring-[#2B67F6]/20"

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
}>(), {
  summary: "",
  showIndex: false,
  stickyHeader: false,
  wrapperClass: "",
  tableClass: "",
  emptyState: undefined,
  listLevelTable: false,
  stickyThead: false,
  endSpacer: true,
  showIndexCheckbox: true,
  edgeGutter: true,
  showRowActionIcons: false,
})
const emit = defineEmits<{
  "update:selected-row-keys": [keys: RowSelectionKey[]]
}>()

const wrapperClassName = computed(() => getTableWrapperClass(props.wrapperClass))
const scrollViewportClassName = computed(() => getTableScrollViewportClass())
const tableClassName = computed(() => getTableClass(props.tableClass))
const hasRowActions = computed(() => (props.rowActions?.length ?? 0) > 0)
const tableWrapperRef = ref<HTMLElement | null>(null)
const tableRef = ref<HTMLTableElement | null>(null)
const fillColumnActive = ref(false)
const horizontalOverflow = ref(false)
const edgeGutterSize = ref(TABLE_EDGE_GUTTER_MOBILE)
const stickyHeaderActive = ref(false)
const stickyHeaderLeft = ref(0)
const stickyHeaderTop = ref(0)
const stickyHeaderWidth = ref(0)
const stickyTableWidth = ref(0)
const stickyScrollLeft = ref(0)
const stickyColumnWidths = ref<number[]>([])
const hoveredRowKey = ref<RowSelectionKey | null>(null)
const focusedRowKey = ref<RowSelectionKey | null>(null)
const rowPointerDown = ref<RowPointerDownState | null>(null)
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
  props.stickyHeader
  && !props.stickyThead
  && stickyHeaderActive.value
  && stickyHeaderWidth.value > 0
  && stickyColumnWidths.value.length > 0
))
const leadingEdgeGutter = computed(() => (props.edgeGutter ? edgeGutterSize.value : 0))
const trailingEdgeGutter = computed(() => (
  props.edgeGutter && horizontalOverflow.value ? edgeGutterSize.value : 0
))
const tableInlineMinWidth = computed(() => {
  const reservedSpace = leadingEdgeGutter.value + trailingEdgeGutter.value
  return `calc(100% - ${reservedSpace}px)`
})
const tableElementStyle = computed(() => ({
  width: "max-content",
  minWidth: tableInlineMinWidth.value,
  maxWidth: "none",
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

  edgeGutterSize.value = window.innerWidth >= 640
    ? TABLE_EDGE_GUTTER_DESKTOP
    : TABLE_EDGE_GUTTER_MOBILE
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
      ? "bg-[#EBF1FF] hover:bg-[#EBF1FF]"
      : isRowKeyHighlighted(rowKey)
        ? "bg-surface-tertiary"
        : "",
  )
}

function getActionCellClass(row: Record<string, unknown>, index: number) {
  const rowKey = getRowKey(row, index)
  return cn(
    tableTheme.actionCell,
    isRowSelected(row, index)
      ? "bg-[#EBF1FF]"
      : isRowKeyHighlighted(rowKey)
        ? "bg-surface-tertiary"
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

function handleInlineQuickAction(row: Record<string, unknown>, index: number, event?: MouseEvent) {
  hoveredRowKey.value = null
  focusedRowKey.value = null

  if (event?.currentTarget instanceof HTMLElement) {
    event.currentTarget.blur()
  }

  props.onQuickAction?.(row, index)
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

function getEdgeGutterStyle(size: number) {
  return {
    width: `${size}px`,
    minWidth: `${size}px`,
    maxWidth: `${size}px`,
  }
}

function getFillColumnIndexes() {
  return props.columns.reduce<number[]>((indexes, column, index) => {
    if (column.width === "fill") {
      indexes.push(index)
    }

    return indexes
  }, [])
}

function isFillColumnActive(column: TableColumn, columnIndex: number) {
  return column.width === "fill"
    && fillColumnActive.value
}

function isNoteLikeColumn(column: TableColumn) {
  return column.variant === "note" || column.cellRenderer?.kind === "note"
}

/**
 * table-auto 下可换行单元格的 min-content 宽度极窄，备注列会被压成「两字一行」。
 * 非 fill 的备注列需设下限；有数据时不再走 getEmptyColumnWidthClass，此处单独补全。
 */
function getNoteColumnMinWidthClass(column: TableColumn) {
  if (column.width === "fill" || !isNoteLikeColumn(column)) {
    return ""
  }

  return "min-w-[12rem]"
}

function getResolvedColumnHeaderClass(column: TableColumn, columnIndex: number) {
  const fillActive = isFillColumnActive(column, columnIndex)

  return [
    getColumnHeaderClass(column, fillActive),
    props.rows.length === 0 ? getEmptyColumnWidthClass(column) : getNoteColumnMinWidthClass(column),
    column.width === "fill" ? "" : "w-px",
  ]
}

function getStickyHeaderCellClass(column: TableColumn, columnIndex: number) {
  return [
    tableTheme.headerCell.sticky,
    getResolvedColumnHeaderClass(column, columnIndex),
  ]
}

function getResolvedColumnCellClass(column: TableColumn, columnIndex: number) {
  const fillActive = isFillColumnActive(column, columnIndex)

  return [
    getColumnCellClass(column, fillActive),
    props.rows.length === 0 ? getEmptyColumnWidthClass(column) : getNoteColumnMinWidthClass(column),
    column.width === "fill" ? "" : "w-px",
    column.width === "fill"
      ? fillActive
        ? "max-w-none"
        : "max-w-none whitespace-nowrap"
      : "",
  ]
}

function getEmptyColumnWidthClass(column: TableColumn) {
  if (column.width === "fill" || isNoteLikeColumn(column)) {
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
  const fillActive = isFillColumnActive(column, columnIndex)

  if (column.width === "fill") {
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

function syncHorizontalScrollState() {
  if (!tableWrapperRef.value || !tableRef.value) {
    horizontalOverflow.value = false
    return
  }

  const wrapper = tableWrapperRef.value
  const overflow = wrapper.scrollWidth > wrapper.clientWidth + 1
    || tableRef.value.scrollWidth > wrapper.clientWidth + 1
    || measureNaturalTableOverflow()

  horizontalOverflow.value = overflow
}

function measureNaturalTableOverflow() {
  if (!tableWrapperRef.value || !tableRef.value || typeof document === "undefined") {
    return false
  }

  const measurementHost = document.createElement("div")
  measurementHost.style.position = "absolute"
  measurementHost.style.left = "-99999px"
  measurementHost.style.top = "0"
  measurementHost.style.visibility = "hidden"
  measurementHost.style.pointerEvents = "none"
  measurementHost.style.width = "max-content"
  measurementHost.style.maxWidth = "none"
  measurementHost.style.overflow = "visible"

  const tableClone = tableRef.value.cloneNode(true) as HTMLTableElement
  tableClone.style.minWidth = "0"
  tableClone.style.width = "max-content"
  tableClone.style.maxWidth = "none"

  measurementHost.appendChild(tableClone)
  document.body.appendChild(measurementHost)

  const naturalWidth = Math.ceil(tableClone.getBoundingClientRect().width)
  measurementHost.remove()

  return naturalWidth > tableWrapperRef.value.clientWidth + 1
}

function measureFillColumnState() {
  if (!tableWrapperRef.value || !tableRef.value || typeof document === "undefined") {
    return false
  }

  const fillColumnIndexes = getFillColumnIndexes()
  if (fillColumnIndexes.length === 0) {
    return false
  }

  const measurementHost = document.createElement("div")
  measurementHost.style.position = "absolute"
  measurementHost.style.left = "-99999px"
  measurementHost.style.top = "0"
  measurementHost.style.visibility = "hidden"
  measurementHost.style.pointerEvents = "none"
  measurementHost.style.width = "max-content"
  measurementHost.style.maxWidth = "none"
  measurementHost.style.overflow = "visible"

  const tableClone = tableRef.value.cloneNode(true) as HTMLTableElement
  tableClone.style.minWidth = "0"
  tableClone.style.width = "max-content"
  tableClone.style.maxWidth = "none"

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

  measurementHost.appendChild(tableClone)
  document.body.appendChild(measurementHost)

  const naturalWidth = Math.ceil(tableClone.getBoundingClientRect().width)
  measurementHost.remove()

  return naturalWidth <= tableWrapperRef.value.clientWidth + 1
}

async function syncTableLayoutState() {
  updateEdgeGutterSize()

  const nextFillColumnActive = measureFillColumnState()

  if (fillColumnActive.value !== nextFillColumnActive) {
    fillColumnActive.value = nextFillColumnActive
    await nextTick()
  }

  syncHorizontalScrollState()
  syncStickyHeaderState()
}

function syncStickyHeaderState() {
  if (!props.stickyHeader || !tableWrapperRef.value || !tableRef.value) {
    clearStickyState()
    return
  }

  const headerCells = getHeaderCells()
  if (!headerCells.length) {
    clearStickyState()
    return
  }

  const wrapperRect = tableWrapperRef.value.getBoundingClientRect()
  const stickyLine = getScrollRootTop() + getStickyTopOffset()
  const headerHeight = headerCells[0]?.getBoundingClientRect().height ?? 41

  stickyHeaderLeft.value = wrapperRect.left
  stickyHeaderTop.value = stickyLine
  stickyHeaderWidth.value = wrapperRect.width
  stickyTableWidth.value = tableRef.value.scrollWidth
  stickyScrollLeft.value = tableWrapperRef.value.scrollLeft
  stickyColumnWidths.value = headerCells.map(cell => cell.getBoundingClientRect().width)
  stickyHeaderActive.value = wrapperRect.top <= stickyLine && wrapperRect.bottom > stickyLine + headerHeight
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
    window.removeEventListener("scroll", syncStickyHeaderState)
    return
  }

  scrollRoot.removeEventListener("scroll", syncStickyHeaderState)
}

function attachScrollRootListener() {
  if (!tableWrapperRef.value || typeof window === "undefined") {
    return
  }

  const nextScrollRoot = getScrollRoot(tableWrapperRef.value)
  detachScrollRootListener()
  scrollRoot = nextScrollRoot

  if (scrollRoot === window) {
    window.addEventListener("scroll", syncStickyHeaderState, { passive: true })
    return
  }

  scrollRoot.addEventListener("scroll", syncStickyHeaderState, { passive: true })
}

function scheduleStickySync() {
  void nextTick(() => {
    attachScrollRootListener()
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
watch(() => props.showIndex, scheduleStickySync)
watch(() => hasRowActions.value, scheduleStickySync)
watch(() => props.stickyHeader, scheduleStickySync)
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
  if (overflow && !wasOverflow) {
    maybeShowHorizontalScrollHint()
  }
})

onMounted(() => {
  attachScrollRootListener()
  tableWrapperRef.value?.addEventListener("scroll", handleWrapperScroll, { passive: true })
  window.addEventListener("resize", scheduleStickySync, { passive: true })
  observeStickyLayout()
  scheduleStickySync()
})

onBeforeUnmount(() => {
  tableWrapperRef.value?.removeEventListener("scroll", handleWrapperScroll)
  window.removeEventListener("resize", scheduleStickySync)
  detachScrollRootListener()
  stopObservingStickyLayout()
  clearRowPointerDown()
})
</script>

<template>
  <div :class="wrapperClassName">
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
                  :class="[tableTheme.actionHeader, tableTheme.actionHeaderSticky]"
                  :style="getStickyCellStyle(columns.length)"
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

    <div
      ref="tableWrapperRef"
      :class="cn(scrollViewportClassName, rows.length === 0 && 'overflow-x-hidden')"
    >
      <div
        v-if="rows.length === 0"
        class="flex min-h-[min(320px,50vh)] w-full min-w-0 flex-col items-center justify-center px-4 py-16"
      >
        <Empty
          class="w-full max-w-md flex-none border-0 bg-transparent shadow-none !p-6 md:!p-8"
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
      <div
        v-else
        :class="tableTheme.scrollContent"
      >
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
              props.stickyThead
                && 'sticky top-0 z-30 bg-background shadow-[inset_0_-1px_0_hsl(var(--border))]',
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
            <th v-if="hasRowActions" :class="tableTheme.actionHeader">
              操作
            </th>
          </tr>
        </thead>

        <tbody :class="tableTheme.body">
          <tr
            v-for="(row, index) in rows"
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
              :class="getActionCellClass(row, index)"
            >
              <div :class="tableTheme.actionCellContent">
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
            </td>
          </tr>
        </tbody>
        </table>
        <div :class="tableTheme.edgeGutter" :style="getEdgeGutterStyle(trailingEdgeGutter)" />
      </div>
    </div>

    <div v-if="summary" :class="tableTheme.summary">
      {{ summary }}
    </div>
  </div>
</template>
