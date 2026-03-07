<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue"

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

const wrapperClassName = computed(() => props.wrapperClass || "overflow-visible")
const tableClassName = computed(() => props.tableClass || "min-w-full border-collapse bg-white text-[14px]")
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
      <thead class="text-[#7A7A7A]">
        <tr>
          <th
            v-if="showIndex"
            :class="[
              'w-8 min-w-8 py-2 pr-2 text-right font-normal',
              stickyHeader ? 'sticky top-0 z-10 bg-white' : 'border-b border-[#ECECEC]',
              stickyHeader && stickyHeaderActive ? 'shadow-[inset_0_-1px_0_#ECECEC]' : '',
            ]"
          />
          <th
            v-for="column in columns"
            :key="column.key"
            :class="[
              'border-b border-[#ECECEC] px-3 py-2 text-left font-normal whitespace-nowrap',
              stickyHeader ? 'sticky top-0 z-10 bg-white transition-colors hover:bg-[#F7F7F7]' : '',
              stickyHeader && stickyHeaderActive ? 'shadow-[inset_0_-1px_0_#ECECEC]' : '',
              column.headerClass,
            ]"
          >
            {{ column.label }}
          </th>
        </tr>
      </thead>

      <tbody class="text-[#2F2F2F]">
        <tr
          v-for="(row, index) in rows"
          :key="getRowKey(row, index)"
          class="transition hover:bg-[#FBFBFB]"
        >
          <td
            v-if="showIndex"
            class="w-8 min-w-8 py-3 pr-2 text-right text-[#A0A0A0] whitespace-nowrap"
          >
            {{ index + 1 }}
          </td>
          <td
            v-for="(column, columnIndex) in columns"
            :key="column.key"
            :class="[
              'border-b border-[#F0F0F0] px-3 py-3 whitespace-nowrap',
              columnIndex > 0 ? 'border-l' : '',
              isRightAlignedColumn(column) ? 'text-right' : '',
              column.cellClass,
            ]"
          >
            <slot
              :name="column.slot ?? `cell-${column.key}`"
              :row="row"
              :value="getColumnValue(row, column.key)"
              :index="index"
            >
              <template v-if="column.cellRenderer?.kind === 'dual-inline'">
                <span :class="column.cellRenderer.primaryClass ?? 'text-[#1F1F1F]'">
                  {{ getRendererValue(row, column.cellRenderer.primaryKey) }}
                </span>
                <span
                  v-if="stringifyValue(getRendererValue(row, column.cellRenderer.secondaryKey))"
                  :class="['ml-1', column.cellRenderer.secondaryClass ?? 'text-[#9A9A9A]']"
                >
                  {{ getRendererValue(row, column.cellRenderer.secondaryKey) }}
                </span>
              </template>

              <div
                v-else-if="column.cellRenderer?.kind === 'dual-stack'"
                class="flex flex-col gap-0.5"
              >
                <span :class="column.cellRenderer.primaryClass ?? 'text-[#1F1F1F]'">
                  {{ getRendererValue(row, column.cellRenderer.primaryKey) }}
                </span>
                <span
                  v-if="stringifyValue(getRendererValue(row, column.cellRenderer.secondaryKey))"
                  :class="column.cellRenderer.secondaryClass ?? 'text-[#9A9A9A]'"
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
                  :class="column.cellRenderer.itemClass ?? 'text-[#3F3F3F]'"
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
                  :class="column.cellRenderer.itemClass ?? 'inline-flex items-center rounded-md bg-[#F5F5F5] px-2 py-0.5 text-[12px] text-[#4B4B4B]'"
                >
                  {{ item }}
                </span>
              </div>

              <div
                v-else-if="column.cellRenderer?.kind === 'progress'"
                class="flex min-w-[120px] items-center gap-2"
              >
                <div :class="column.cellRenderer.trackClass ?? 'h-2 flex-1 overflow-hidden rounded-full bg-[#E9EEF5]'">
                  <div
                    :class="column.cellRenderer.fillClass ?? 'h-full rounded-full bg-[#4A86E8]'"
                    :style="{ width: `${getProgressPercent(row, column)}%` }"
                  />
                </div>
                <span :class="column.cellRenderer.labelClass ?? 'text-[12px] tabular-nums text-[#6B7280]'">
                  {{ getColumnValue(row, column.key) }}
                </span>
              </div>

              <div
                v-else-if="column.cellRenderer?.kind === 'metric-unit'"
                class="inline-flex items-baseline justify-end"
              >
                <span :class="column.cellRenderer.valueClass ?? 'tabular-nums text-[#3559E0]'">
                  {{ getRendererValue(row, column.cellRenderer.valueKey ?? column.key) }}
                </span>
                <span :class="['ml-1', column.cellRenderer.unitClass ?? 'text-[12px] text-[#9A9A9A]']">
                  {{ column.cellRenderer.unit }}
                </span>
              </div>

              <div
                v-else-if="column.cellRenderer?.kind === 'note'"
                class="max-w-[320px] whitespace-normal leading-6 text-[#6E6E6E]"
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

    <div v-if="summary" class="px-3 py-3 text-[13px] text-[#9B9B9B]">
      {{ summary }}
    </div>
  </div>
</template>
