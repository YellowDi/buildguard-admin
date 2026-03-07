<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue"

import type { ResourceTableColumn } from "@/components/resource/types"

const props = withDefaults(defineProps<{
  columns: ResourceTableColumn[]
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
              column.cellClass,
            ]"
          >
            <slot
              :name="column.slot ?? `cell-${column.key}`"
              :row="row"
              :value="getColumnValue(row, column.key)"
              :index="index"
            >
              {{ getColumnValue(row, column.key) }}
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
