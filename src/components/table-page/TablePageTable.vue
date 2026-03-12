<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue"
import { useRoute } from "vue-router"
import { toast } from "vue-sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import StatusChip from "@/components/table-page/TableStatusChip.vue"
import {
  getColumnCellClass,
  getColumnHeaderClass,
  getTableClass,
  getTableScrollViewportClass,
  getTableWrapperClass,
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
import { cn } from "@/lib/utils"

type ScrollRoot = HTMLElement | Window
type RowSelectionKey = string | number
type CheckboxState = boolean | "indeterminate"
type ActionRowMetric = {
  rowKey: RowSelectionKey
  rowIndex: number
  top: number
  height: number
}
const HORIZONTAL_SCROLL_HINT_MESSAGE = "可按住 Shift + 鼠标滚轮进行横向移动。"
const selectionCheckboxClass = "border-[#B7C4E0] bg-white data-[state=checked]:border-[#2B67F6] data-[state=checked]:bg-[#2B67F6] data-[state=indeterminate]:border-[#2B67F6] data-[state=indeterminate]:bg-[#2B67F6] focus-visible:ring-[#2B67F6]/20"

const props = withDefaults(defineProps<{
  columns: TableColumn[]
  rowActions?: TableRowAction[]
  rows: Record<string, unknown>[]
  rowKey: string | ((row: Record<string, unknown>, index: number) => string | number)
  selectedRowKeys?: Array<RowSelectionKey>
  summary?: string
  showIndex?: boolean
  stickyHeader?: boolean
  wrapperClass?: string
  tableClass?: string
  emptyState?: TablePageEmptyState
}>(), {
  summary: "",
  showIndex: false,
  stickyHeader: false,
  wrapperClass: "",
  tableClass: "",
  emptyState: undefined,
})
const emit = defineEmits<{
  "update:selected-row-keys": [keys: RowSelectionKey[]]
}>()

const wrapperClassName = computed(() => getTableWrapperClass(props.wrapperClass))
const scrollViewportClassName = computed(() => getTableScrollViewportClass())
const tableClassName = computed(() => getTableClass(props.tableClass))
const hasRowActions = computed(() => (props.rowActions?.length ?? 0) > 0)
const emptyColSpan = computed(() => props.columns.length + (props.showIndex ? 1 : 0) + (hasRowActions.value ? 1 : 0) + 1)
const tableShellRef = ref<HTMLElement | null>(null)
const tableWrapperRef = ref<HTMLElement | null>(null)
const tableRef = ref<HTMLTableElement | null>(null)
const fillColumnActive = ref(false)
const horizontalOverflow = ref(false)
const stickyHeaderActive = ref(false)
const stickyHeaderLeft = ref(0)
const stickyHeaderTop = ref(0)
const stickyHeaderWidth = ref(0)
const stickyTableWidth = ref(0)
const stickyScrollLeft = ref(0)
const stickyColumnWidths = ref<number[]>([])
const actionColumnWidth = ref(0)
const actionHeaderHeight = ref(41)
const rowMetrics = ref<ActionRowMetric[]>([])
const hoveredRowKey = ref<RowSelectionKey | null>(null)
const focusedRowKey = ref<RowSelectionKey | null>(null)
const selectedRowKeySet = computed(() => new Set(props.selectedRowKeys ?? []))
const currentRowKeys = computed(() => props.rows.map((row, index) => getRowKey(row, index)))
const selectedCurrentRowCount = computed(() => (
  currentRowKeys.value.filter(rowKey => selectedRowKeySet.value.has(rowKey)).length
))
const shouldShowHeaderCheckbox = computed(() => selectedCurrentRowCount.value > 0)
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
  && stickyHeaderActive.value
  && stickyHeaderWidth.value > 0
  && stickyColumnWidths.value.length > 0
))
const actionRailVisible = computed(() => (
  hasRowActions.value
  && actionColumnWidth.value > 0
  && rowMetrics.value.length > 0
))
const actionHeaderRailVisible = computed(() => hasRowActions.value && actionColumnWidth.value > 0)
const isAtHorizontalEnd = computed(() => {
  if (!tableWrapperRef.value) {
    return false
  }

  const maxScrollLeft = tableWrapperRef.value.scrollWidth - tableWrapperRef.value.clientWidth
  return maxScrollLeft <= 0 || stickyScrollLeft.value >= maxScrollLeft - 1
})
const actionRailTrailingSpace = computed(() => {
  if (!horizontalOverflow.value) {
    return 32
  }

  if (!tableWrapperRef.value) {
    return 0
  }

  const releaseDistance = 64
  const maxScrollLeft = tableWrapperRef.value.scrollWidth - tableWrapperRef.value.clientWidth
  const remainingScroll = Math.max(0, maxScrollLeft - stickyScrollLeft.value)
  const progress = Math.max(0, Math.min(1, (releaseDistance - remainingScroll) / releaseDistance))

  return Math.round(progress * 32)
})
const actionRailWidth = computed(() => actionColumnWidth.value + actionRailTrailingSpace.value)
const actionRailHostStyle = computed(() => ({
  width: `${actionRailWidth.value}px`,
}))
const actionHeaderRailStyle = computed(() => ({
  width: `${actionRailWidth.value}px`,
  height: `${actionHeaderHeight.value}px`,
  top: "0px",
}))
const stickyViewportStyle = computed(() => ({
  left: `${stickyHeaderLeft.value}px`,
  top: `${stickyHeaderTop.value}px`,
  width: `${stickyHeaderWidth.value}px`,
}))
const stickyTableStyle = computed(() => ({
  minWidth: `${stickyTableWidth.value}px`,
  width: `${stickyTableWidth.value}px`,
  tableLayout: "fixed" as const,
  transform: `translateX(${-stickyScrollLeft.value}px)`,
}))
const route = useRoute()
const horizontalScrollHintId = computed(() => `table-page-horizontal-scroll-hint:${route.path}`)

let scrollRoot: ScrollRoot | null = null
let resizeObserver: ResizeObserver | null = null

function getRowKey(row: Record<string, unknown>, index: number) {
  if (typeof props.rowKey === "function") {
    return props.rowKey(row, index)
  }

  const value = row[props.rowKey]
  return typeof value === "string" || typeof value === "number" ? value : index
}

function maybeShowHorizontalScrollHint() {
  if (!horizontalOverflow.value) {
    return
  }

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
  return cn(
    tableTheme.row,
    isRowSelected(row, index) ? "bg-[#EBF1FF] hover:bg-[#EBF1FF]" : "",
  )
}

function getActionCellClass(row: Record<string, unknown>, index: number) {
  return cn(
    tableTheme.actionCell,
    "relative bg-background transition-colors group-hover:bg-surface-tertiary",
    isRowSelected(row, index) ? "!bg-[#EBF1FF] group-hover:!bg-[#EBF1FF]" : "",
  )
}

function getActionRailRowClass(rowKey: RowSelectionKey) {
  return cn(
    tableTheme.actionRailRow,
    isRowKeySelected(rowKey)
      ? "bg-[#EBF1FF]"
      : isRowKeyHighlighted(rowKey)
        ? "bg-surface-tertiary"
        : "bg-background",
  )
}

function getActionRailSurfaceClass(rowKey: RowSelectionKey) {
  return cn(
    tableTheme.actionRailSurface,
    horizontalOverflow.value ? tableTheme.actionRailSurfaceShadow : "",
    isRowKeySelected(rowKey)
      ? "bg-[#EBF1FF]"
      : isRowKeyHighlighted(rowKey)
        ? "bg-surface-tertiary"
        : "bg-background",
  )
}

function getActionRailSpacerClass(rowKey: RowSelectionKey) {
  return cn(
    tableTheme.actionRailSpacer,
    isRowKeySelected(rowKey)
      ? "bg-[#EBF1FF]"
      : isRowKeyHighlighted(rowKey)
        ? "bg-surface-tertiary"
        : "bg-background",
  )
}

function getEndSpacerCellClass(row: Record<string, unknown>, index: number) {
  return cn(
    tableTheme.endSpacerCell,
    isRowSelected(row, index) ? "bg-[#EBF1FF]" : "",
  )
}

function getIndexLabelClass(row: Record<string, unknown>, index: number) {
  return cn(
    "absolute inset-0 flex items-center justify-center transition-opacity duration-150",
    isRowSelected(row, index)
      ? "opacity-0"
      : "opacity-100 group-hover:opacity-0 group-focus-within:opacity-0",
  )
}

function getIndexCheckboxWrapperClass(row: Record<string, unknown>, index: number) {
  return cn(
    "absolute inset-0 flex items-center justify-center transition-opacity duration-150",
    isRowSelected(row, index)
      ? "opacity-100"
      : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100",
  )
}

function getHeaderCheckboxWrapperClass() {
  return cn(
    "ml-auto flex h-4 w-4 items-center justify-center transition-opacity duration-150",
    shouldShowHeaderCheckbox.value
      ? "opacity-100"
      : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100",
  )
}

function isRowKeySelected(rowKey: RowSelectionKey) {
  return selectedRowKeySet.value.has(rowKey)
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

function getActionRailRowStyle(metric: ActionRowMetric) {
  return {
    top: `${metric.top}px`,
    height: `${metric.height}px`,
    width: `${actionRailWidth.value}px`,
  }
}

function getActionRailSurfaceStyle() {
  return {
    width: `${actionColumnWidth.value}px`,
  }
}

function getActionRailSpacerStyle() {
  return {
    width: `${actionRailTrailingSpace.value}px`,
    minWidth: `${actionRailTrailingSpace.value}px`,
  }
}

function getActionHeaderRailSurfaceClass() {
  return cn(
    tableTheme.actionHeaderRailSurface,
    horizontalOverflow.value ? tableTheme.actionRailSurfaceShadow : "",
    "bg-background",
  )
}

function getActionHeaderRailSurfaceStyle() {
  return {
    width: `${actionColumnWidth.value}px`,
    height: `${actionHeaderHeight.value}px`,
  }
}

function getActionHeaderRailSpacerClass() {
  return cn(tableTheme.actionHeaderRailSpacer, "bg-background")
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

function getFillColumnIndex() {
  for (let index = props.columns.length - 1; index >= 0; index -= 1) {
    if (props.columns[index]?.width === "fill") {
      return index
    }
  }

  return -1
}

function isFillColumnActive(column: TableColumn, columnIndex: number) {
  return column.width === "fill"
    && columnIndex === getFillColumnIndex()
    && fillColumnActive.value
}

function getResolvedColumnHeaderClass(column: TableColumn, columnIndex: number) {
  const fillActive = isFillColumnActive(column, columnIndex)

  return [
    getColumnHeaderClass(column, fillActive),
    props.rows.length === 0 ? getEmptyColumnWidthClass(column) : "",
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
    props.rows.length === 0 ? getEmptyColumnWidthClass(column) : "",
    column.width === "fill" ? "" : "w-px",
    column.width === "fill"
      ? fillActive
        ? "max-w-none"
        : "max-w-none whitespace-nowrap"
      : "",
  ]
}

function getEmptyColumnWidthClass(column: TableColumn) {
  if (column.width === "fill" || column.variant === "note") {
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

function clearActionRailState() {
  actionColumnWidth.value = 0
  actionHeaderHeight.value = 41
  rowMetrics.value = []
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

  const fillColumnIndex = getFillColumnIndex()
  if (fillColumnIndex < 0) {
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

  const cellIndex = fillColumnIndex + (props.showIndex ? 1 : 0)
  for (const row of tableClone.querySelectorAll("tr")) {
    const cell = row.children.item(cellIndex)

    if (cell instanceof HTMLElement) {
      cell.style.width = "auto"
      cell.style.maxWidth = "none"
      cell.style.whiteSpace = "nowrap"

      const noteContent = cell.firstElementChild
      if (noteContent instanceof HTMLElement) {
        noteContent.style.width = "auto"
        noteContent.style.maxWidth = "none"
        noteContent.style.whiteSpace = "nowrap"
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
  const nextFillColumnActive = measureFillColumnState()

  if (fillColumnActive.value !== nextFillColumnActive) {
    fillColumnActive.value = nextFillColumnActive
    await nextTick()
  }

  syncHorizontalScrollState()
  syncStickyHeaderState()
  syncActionRailState()
}

function syncActionRailState() {
  if (!hasRowActions.value || !tableShellRef.value || !tableWrapperRef.value || !tableRef.value) {
    clearActionRailState()
    return
  }

  const headerCells = getHeaderCells()
  const actionCellIndex = props.columns.length + (props.showIndex ? 1 : 0)
  const actionHeaderCell = headerCells[actionCellIndex]

  if (!(actionHeaderCell instanceof HTMLElement)) {
    clearActionRailState()
    return
  }

  const bodyRows = Array.from(tableRef.value.querySelectorAll("tbody > tr"))
  actionHeaderHeight.value = Math.round(actionHeaderCell.getBoundingClientRect().height) || 41

  if (!bodyRows.length) {
    actionColumnWidth.value = Math.ceil(actionHeaderCell.getBoundingClientRect().width)
    rowMetrics.value = []
    return
  }

  const shellRect = tableShellRef.value.getBoundingClientRect()
  actionColumnWidth.value = Math.ceil(actionHeaderCell.getBoundingClientRect().width)
  rowMetrics.value = bodyRows.map((row, index) => {
    const rowElement = row as HTMLElement
    const rowRect = rowElement.getBoundingClientRect()

      return {
      rowKey: getRowKey(props.rows[index] ?? {}, index),
      rowIndex: index,
      top: Math.round(rowRect.top - shellRect.top),
      height: Math.round(rowRect.height),
    }
  })
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
watch(() => horizontalOverflow.value, overflow => {
  if (overflow) {
    maybeShowHorizontalScrollHint()
  }
})
watch(() => route.path, () => {
  maybeShowHorizontalScrollHint()
})

onMounted(() => {
  attachScrollRootListener()
  tableWrapperRef.value?.addEventListener("scroll", handleWrapperScroll, { passive: true })
  window.addEventListener("resize", scheduleStickySync, { passive: true })
  observeStickyLayout()
  scheduleStickySync()
  void nextTick(() => {
    maybeShowHorizontalScrollHint()
  })
})

onBeforeUnmount(() => {
  tableWrapperRef.value?.removeEventListener("scroll", handleWrapperScroll)
  window.removeEventListener("resize", scheduleStickySync)
  detachScrollRootListener()
  stopObservingStickyLayout()
})
</script>

<template>
  <div ref="tableShellRef" :class="wrapperClassName">
    <div
      v-if="actionHeaderRailVisible"
      :class="tableTheme.actionHeaderRailHost"
      :style="actionHeaderRailStyle"
    >
      <div :class="tableTheme.actionHeaderRail" :style="{ width: `${actionRailWidth}px`, height: `${actionHeaderHeight}px` }">
        <div
          :class="getActionHeaderRailSurfaceClass()"
          :style="getActionHeaderRailSurfaceStyle()"
        >
          操作
        </div>
        <div :class="getActionHeaderRailSpacerClass()" :style="getActionRailSpacerStyle()" />
      </div>
    </div>

    <div
      v-if="stickyHeaderVisible"
      aria-hidden="true"
      :class="tableTheme.stickyViewport"
      :style="stickyViewportStyle"
    >
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
              v-if="showIndex"
              :class="[tableTheme.indexHeader.base, tableTheme.indexHeader.sticky, 'group']"
              :style="getStickyCellStyle(0)"
            >
              <div :class="getHeaderCheckboxWrapperClass()">
                <Checkbox
                  :model-value="headerCheckboxState"
                  :disabled="rows.length === 0"
                  :class="selectionCheckboxClass"
                  @update:model-value="updateAllRowsSelection($event)"
                />
              </div>
            </th>
            <th
              v-for="(column, columnIndex) in columns"
              :key="`sticky-${column.key}`"
              :class="[
                tableTheme.headerCell.base,
                getStickyHeaderCellClass(column, columnIndex),
              ]"
              :style="getStickyCellStyle(columnIndex + (showIndex ? 1 : 0))"
            >
              {{ column.label }}
            </th>
            <th
              v-if="hasRowActions"
              :class="[tableTheme.actionHeader, tableTheme.actionHeaderSticky]"
              :style="getStickyCellStyle(stickyColumnWidths.length - 2)"
            />
            <th
              :class="tableTheme.endSpacerHeader"
              :style="getStickyCellStyle(stickyColumnWidths.length - 1)"
            />
          </tr>
        </thead>
      </table>

      <div
        v-if="actionHeaderRailVisible"
        :class="tableTheme.actionHeaderRailHost"
        :style="actionHeaderRailStyle"
      >
        <div :class="tableTheme.actionHeaderRail" :style="{ width: `${actionRailWidth}px`, height: `${actionHeaderHeight}px` }">
          <div
            :class="getActionHeaderRailSurfaceClass()"
            :style="getActionHeaderRailSurfaceStyle()"
          >
            操作
          </div>
          <div :class="getActionHeaderRailSpacerClass()" :style="getActionRailSpacerStyle()" />
        </div>
      </div>
    </div>

    <div ref="tableWrapperRef" :class="scrollViewportClassName">
      <table ref="tableRef" :class="tableClassName">
      <thead :class="tableTheme.head">
        <tr>
          <th
            v-if="showIndex"
            :class="[
              tableTheme.indexHeader.base,
              tableTheme.indexHeader.static,
              'group',
            ]"
          >
            <div :class="getHeaderCheckboxWrapperClass()">
              <Checkbox
                :model-value="headerCheckboxState"
                :disabled="rows.length === 0"
                :class="selectionCheckboxClass"
                @update:model-value="updateAllRowsSelection($event)"
              />
            </div>
          </th>
          <th
            v-for="(column, columnIndex) in columns"
            :key="column.key"
            :class="[
              tableTheme.headerCell.base,
              getResolvedColumnHeaderClass(column, columnIndex),
            ]"
          >
            {{ column.label }}
          </th>
          <th
            v-if="hasRowActions"
            :class="tableTheme.actionHeader"
          />
          <th :class="tableTheme.endSpacerHeader" />
        </tr>
      </thead>

      <tbody :class="tableTheme.body">
        <tr v-if="rows.length === 0">
          <td
            :colspan="emptyColSpan"
            class="p-0"
          >
            <div class="px-4 py-5 sm:px-6">
              <Empty class="min-h-[320px] w-full border border-dashed border-border/70 bg-background">
                <EmptyHeader>
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
          </td>
        </tr>
        <tr
          v-for="(row, index) in rows"
          :key="getRowKey(row, index)"
          :class="getRowClass(row, index)"
          @mouseenter="handleRowMouseEnter(getRowKey(row, index))"
          @mouseleave="handleRowMouseLeave(getRowKey(row, index))"
          @focusin="handleRowFocusIn(getRowKey(row, index))"
          @focusout="handleRowFocusOut(getRowKey(row, index), $event)"
        >
          <td
            v-if="showIndex"
            :class="tableTheme.indexCell"
          >
            <div class="relative ml-auto h-4 w-4">
              <span :class="getIndexLabelClass(row, index)">
                {{ index + 1 }}
              </span>
              <span :class="getIndexCheckboxWrapperClass(row, index)">
                <Checkbox
                  :model-value="isRowSelected(row, index)"
                  :class="selectionCheckboxClass"
                  @update:model-value="updateRowSelection(row, index, $event)"
                />
              </span>
            </div>
          </td>
          <td
            v-for="(column, columnIndex) in columns"
            :key="column.key"
            :class="[
              tableTheme.bodyCell.base,
              columnIndex > 0 ? tableTheme.bodyCell.split : '',
              isRightAlignedColumn(column) ? tableTheme.bodyCell.rightAligned : '',
              getResolvedColumnCellClass(column, columnIndex),
            ]"
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
                <span :class="['ml-1', column.cellRenderer.unitClass ?? tableTheme.renderers.metricUnit]">
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
          </td>
          <td
            v-if="hasRowActions"
            :class="getActionCellClass(row, index)"
          >
            <div aria-hidden="true" :class="tableTheme.actionSizer">
              <Button
                v-for="action in rowActions"
                :key="`sizer-${action.key}`"
                variant="outline"
                size="sm"
                class="border-border/80 bg-background/95 text-foreground shadow-sm"
                tabindex="-1"
              >
                {{ action.label }}
              </Button>
            </div>
          </td>
          <td :class="getEndSpacerCellClass(row, index)" />
        </tr>
      </tbody>
      </table>
    </div>

    <div
      v-if="actionRailVisible"
      :class="tableTheme.actionRailHost"
      :style="actionRailHostStyle"
    >
      <div :class="tableTheme.actionRail" :style="{ width: `${actionRailWidth}px` }">
        <div
          v-for="metric in rowMetrics"
          :key="`action-rail-${metric.rowKey}`"
          :class="getActionRailRowClass(metric.rowKey)"
          :style="getActionRailRowStyle(metric)"
        >
          <div
            :class="getActionRailSurfaceClass(metric.rowKey)"
            :style="getActionRailSurfaceStyle()"
            @mouseenter="handleRowMouseEnter(metric.rowKey)"
            @mouseleave="handleRowMouseLeave(metric.rowKey)"
            @focusin="handleRowFocusIn(metric.rowKey)"
            @focusout="handleRowFocusOut(metric.rowKey, $event)"
          >
            <Button
              v-for="action in rowActions"
              :key="`rail-${metric.rowKey}-${action.key}`"
              variant="outline"
              size="sm"
              :class="tableTheme.actionButton"
              @click="handleRowActionClick(action, rows[metric.rowIndex] ?? {}, metric.rowIndex)"
            >
              {{ action.label }}
            </Button>
          </div>
          <div :class="getActionRailSpacerClass(metric.rowKey)" :style="getActionRailSpacerStyle()" />
        </div>
      </div>
    </div>

    <div v-if="summary" :class="tableTheme.summary">
      {{ summary }}
    </div>
  </div>
</template>
