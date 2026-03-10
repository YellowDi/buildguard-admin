<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue"

import { Button } from "@/components/ui/button"
import {
  getColumnCellClass,
  getColumnHeaderClass,
  getTableClass,
  getTableWrapperClass,
  tableTheme,
} from "@/components/resource/tableTheme"
import type { TableColumn, TableRowAction } from "@/components/resource/types"

type ScrollRoot = HTMLElement | Window

const props = withDefaults(defineProps<{
  columns: TableColumn[]
  rowActions?: TableRowAction[]
  rows: Record<string, unknown>[]
  rowKey: string | ((row: Record<string, unknown>, index: number) => string | number)
  summary?: string
  showIndex?: boolean
  stickyHeader?: boolean
  wrapperClass?: string
  tableClass?: string
}>(), {
  summary: "",
  showIndex: false,
  stickyHeader: false,
  wrapperClass: "",
  tableClass: "",
})

const wrapperClassName = computed(() => getTableWrapperClass(props.wrapperClass))
const tableClassName = computed(() => getTableClass(props.tableClass))
const hasRowActions = computed(() => (props.rowActions?.length ?? 0) > 0)
const INLINE_END_SPACE = 32
const tableWrapperRef = ref<HTMLElement | null>(null)
const tableRef = ref<HTMLTableElement | null>(null)
const fillColumnActive = ref(false)
const horizontalOverflow = ref(false)
const scrolledToInlineEnd = ref(true)
const stickyHeaderActive = ref(false)
const stickyHeaderLeft = ref(0)
const stickyHeaderTop = ref(0)
const stickyHeaderWidth = ref(0)
const stickyTableWidth = ref(0)
const stickyScrollLeft = ref(0)
const stickyColumnWidths = ref<number[]>([])
const stickyHeaderVisible = computed(() => (
  props.stickyHeader
  && stickyHeaderActive.value
  && stickyHeaderWidth.value > 0
  && stickyColumnWidths.value.length > 0
))
const inlineEndSpaceVisible = computed(() => (
  !horizontalOverflow.value || scrolledToInlineEnd.value ? INLINE_END_SPACE : 0
))
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

let scrollRoot: ScrollRoot | null = null
let resizeObserver: ResizeObserver | null = null

function getRowKey(row: Record<string, unknown>, index: number) {
  if (typeof props.rowKey === "function") {
    return props.rowKey(row, index)
  }

  const value = row[props.rowKey]
  return typeof value === "string" || typeof value === "number" ? value : index
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
    column.width === "fill" ? "" : "w-px",
  ]
}

function getResolvedColumnCellClass(column: TableColumn, columnIndex: number) {
  const fillActive = isFillColumnActive(column, columnIndex)

  return [
    getColumnCellClass(column, fillActive),
    column.width === "fill" ? "" : "w-px",
    column.width === "fill"
      ? fillActive
        ? "max-w-none"
        : "max-w-none whitespace-nowrap"
      : "",
  ]
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
  const wrapperOffset = Number.parseFloat(wrapperStyles.getPropertyValue("--resource-table-sticky-top"))

  if (!Number.isNaN(wrapperOffset)) {
    return wrapperOffset
  }

  const rootOffset = Number.parseFloat(
    window.getComputedStyle(document.documentElement).getPropertyValue("--resource-table-sticky-top"),
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
    scrolledToInlineEnd.value = true
    return
  }

  const wrapper = tableWrapperRef.value
  const overflow = tableRef.value.scrollWidth > wrapper.clientWidth + 1

  horizontalOverflow.value = overflow
  scrolledToInlineEnd.value = !overflow || wrapper.scrollLeft + wrapper.clientWidth >= wrapper.scrollWidth - 1
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
})
</script>

<template>
  <div ref="tableWrapperRef" :class="wrapperClassName">
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
              :class="[tableTheme.indexHeader.base, tableTheme.indexHeader.static]"
              :style="getStickyCellStyle(0)"
            />
            <th
              v-for="(column, columnIndex) in columns"
              :key="`sticky-${column.key}`"
              :class="[
                tableTheme.headerCell.base,
                getResolvedColumnHeaderClass(column, columnIndex),
              ]"
              :style="getStickyCellStyle(columnIndex + (showIndex ? 1 : 0))"
            >
              {{ column.label }}
            </th>
            <th
              v-if="hasRowActions"
              :class="tableTheme.actionHeader"
              :style="getStickyCellStyle(stickyColumnWidths.length - 2)"
            />
            <th
              :class="tableTheme.endSpacerHeader"
              :style="getStickyCellStyle(stickyColumnWidths.length - 1)"
            />
          </tr>
        </thead>
      </table>
    </div>

    <table ref="tableRef" :class="tableClassName">
      <thead :class="tableTheme.head">
        <tr>
          <th
            v-if="showIndex"
            :class="[
              tableTheme.indexHeader.base,
              tableTheme.indexHeader.static,
            ]"
          />
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
        <tr
          v-for="(row, index) in rows"
          :key="getRowKey(row, index)"
          :class="tableTheme.row"
        >
          <td
            v-if="showIndex"
            :class="tableTheme.indexCell"
          >
            {{ index + 1 }}
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
            :class="[tableTheme.actionCell, 'relative']"
            :style="{ right: `${inlineEndSpaceVisible}px` }"
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
            <div :class="tableTheme.actionPanel" :style="{ right: '0px' }">
              <Button
                v-for="action in rowActions"
                :key="action.key"
                variant="outline"
                size="sm"
                class="border-border/80 bg-background/95 text-foreground shadow-sm"
                @click="handleRowActionClick(action, row, index)"
              >
                {{ action.label }}
              </Button>
            </div>
          </td>
          <td :class="tableTheme.endSpacerCell" />
        </tr>
      </tbody>
    </table>

    <div v-if="summary" :class="tableTheme.summary">
      {{ summary }}
    </div>
  </div>
</template>
