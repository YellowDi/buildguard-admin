<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue"

import {
  getColumnCellClass,
  getColumnHeaderClass,
  getTableClass,
  getTableWrapperClass,
  tableTheme,
} from "@/components/resource/tableTheme"
import type { TableColumn } from "@/components/resource/types"

const props = withDefaults(defineProps<{
  columns: TableColumn[]
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
  wrapperClass: "overflow-visible",
  tableClass: "",
})

const wrapperClassName = computed(() => getTableWrapperClass(props.wrapperClass))
const tableClassName = computed(() => getTableClass(props.tableClass))
const tableWrapperRef = ref<HTMLElement | null>(null)
const stickyHeaderActive = ref(false)

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

function updateStickyHeaderState() {
  if (!props.stickyHeader || !tableWrapperRef.value) {
    stickyHeaderActive.value = false
    return
  }

  const rect = tableWrapperRef.value.getBoundingClientRect()
  const headerHeight = 41
  stickyHeaderActive.value = rect.top <= 0 && rect.bottom > headerHeight
}

onMounted(() => {
  updateStickyHeaderState()
  window.addEventListener("scroll", updateStickyHeaderState, { passive: true })
  window.addEventListener("resize", updateStickyHeaderState, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener("scroll", updateStickyHeaderState)
  window.removeEventListener("resize", updateStickyHeaderState)
})
</script>

<template>
  <div ref="tableWrapperRef" :class="wrapperClassName">
    <table :class="tableClassName">
      <thead :class="tableTheme.head">
        <tr>
          <th
            v-if="showIndex"
            :class="[
              tableTheme.indexHeader.base,
              stickyHeader ? tableTheme.indexHeader.sticky : tableTheme.indexHeader.static,
              stickyHeader && stickyHeaderActive ? tableTheme.indexHeader.active : '',
            ]"
          />
          <th
            v-for="column in columns"
            :key="column.key"
            :class="[
              tableTheme.headerCell.base,
              stickyHeader ? tableTheme.headerCell.sticky : '',
              stickyHeader && stickyHeaderActive ? tableTheme.headerCell.active : '',
              getColumnHeaderClass(column),
            ]"
          >
            {{ column.label }}
          </th>
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
              getColumnCellClass(column),
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
                :class="tableTheme.renderers.note"
              >
                {{ getColumnValue(row, column.key) }}
              </div>

              <template v-else>
                {{ getColumnValue(row, column.key) }}
              </template>
            </slot>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-if="summary" :class="tableTheme.summary">
      {{ summary }}
    </div>
  </div>
</template>
